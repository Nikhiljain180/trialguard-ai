import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseWebhook } from "@/lib/bolna";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const parsed = parseWebhook(payload);

  let call = parsed.bolnaCallId
    ? await prisma.call.findFirst({ where: { bolnaCallId: parsed.bolnaCallId } })
    : null;

  if (!call) {
    call = await prisma.call.findFirst({
      where: { status: "in_progress" },
      orderBy: { createdAt: "desc" },
    });
  }

  // Fallback: match by recipient phone from Bolna payload
  if (!call) {
    const recipientPhone = (payload as { context_details?: { recipient_phone_number?: string } }).context_details?.recipient_phone_number;
    if (recipientPhone) {
      const patient = await prisma.patient.findFirst({
        where: { phone: recipientPhone },
        include: { calls: { where: { status: "in_progress" }, orderBy: { createdAt: "desc" }, take: 1 } },
      });
      call = patient?.calls[0] ?? null;
    }
  }

  if (!call) {
    return NextResponse.json({ error: "No matching call found" }, { status: 404 });
  }

  const updatedCall = await prisma.call.update({
    where: { id: call.id },
    data: {
      status: "completed",
      ...(parsed.bolnaCallId && !call.bolnaCallId && { bolnaCallId: parsed.bolnaCallId }),
      nausea: parsed.nausea,
      headache: parsed.headache,
      energyLevel: parsed.energyLevel,
      otherSymptoms: parsed.otherSymptoms,
      morningDose: parsed.morningDose,
      eveningDose: parsed.eveningDose,
      adverseEvent: parsed.adverseEvent,
      adverseSeverity: parsed.adverseSeverity,
      motivation: parsed.motivation,
      transcript: parsed.transcript,
      summary: parsed.summary,
      recordingUrl: parsed.recordingUrl,
      duration: parsed.duration,
      outcome: parsed.outcome,
      completedAt: new Date(),
    },
  });

  const alerts: Array<{ type: string; severity: string; message: string }> = [];

  if (parsed.adverseSeverity && parsed.adverseSeverity >= 7) {
    alerts.push({
      type: "adverse_event",
      severity: "critical",
      message: `Adverse event reported (severity ${parsed.adverseSeverity}/10): ${parsed.adverseEvent || "Details pending"}`,
    });
  }

  if (parsed.motivation !== null && parsed.motivation <= 2) {
    alerts.push({
      type: "dropout_risk",
      severity: "high",
      message: `Low motivation score (${parsed.motivation}/5). Patient may be considering withdrawal.`,
    });
  }

  if (parsed.morningDose === false && parsed.eveningDose === false) {
    alerts.push({
      type: "missed_dose",
      severity: "medium",
      message: `Both morning and evening doses missed on trial day ${call.trialDay}.`,
    });
  }

  for (const alert of alerts) {
    await prisma.alert.create({
      data: {
        patientId: call.patientId,
        callId: updatedCall.id,
        ...alert,
      },
    });
  }

  if (alerts.some((a) => a.severity === "critical")) {
    await prisma.patient.update({
      where: { id: call.patientId },
      data: { dropoutRisk: "high", status: "flagged" },
    });
  } else if (alerts.some((a) => a.type === "dropout_risk")) {
    await prisma.patient.update({
      where: { id: call.patientId },
      data: { dropoutRisk: "high" },
    });
  }

  return NextResponse.json({
    success: true,
    callId: updatedCall.id,
    alertsCreated: alerts.length,
  });
}
