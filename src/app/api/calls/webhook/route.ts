import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseWebhook } from "@/lib/bolna";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // Debug logging - visible in Vercel Function logs
  console.log("[Webhook] Received request");
  console.log("[Webhook] Payload keys:", Object.keys(payload));
  console.log("[Webhook] call_id/id:", payload.call_id ?? payload.id);
  console.log("[Webhook] extracted_data:", payload.extracted_data ? "present" : "MISSING");

  const parsed = parseWebhook(payload);

  let call = parsed.bolnaCallId
    ? await prisma.call.findFirst({ where: { bolnaCallId: parsed.bolnaCallId } })
    : null;
  if (call) console.log("[Webhook] Matched by bolnaCallId:", parsed.bolnaCallId);

  if (!call) {
    call = await prisma.call.findFirst({
      where: { status: "in_progress" },
      orderBy: { createdAt: "desc" },
    });
    if (call) console.log("[Webhook] Matched by most recent in_progress:", call.id);
  }

  // Fallback: match by recipient phone from Bolna payload (normalize formats: +91, 91, etc.)
  if (!call) {
    const recipientPhone = (payload as { context_details?: { recipient_phone_number?: string }; user_number?: string }).context_details?.recipient_phone_number
      || (payload as { context_details?: { recipient_phone_number?: string }; user_number?: string }).user_number;
    if (recipientPhone) {
      const normalize = (p: string) => p.replace(/\D/g, "").slice(-10);
      const normalized = normalize(recipientPhone);
      const patients = await prisma.patient.findMany({
        include: { calls: { where: { status: "in_progress" }, orderBy: { createdAt: "desc" }, take: 1 } },
      });
      const patient = patients.find((p) => normalize(p.phone) === normalized || p.phone === recipientPhone);
      call = patient?.calls[0] ?? null;
      console.log("[Webhook] Phone fallback:", recipientPhone, "normalized:", normalized, "patient found:", !!patient, "in_progress call:", !!call);
    }
  }

  // Fallback for web-call / no context: extract patient name from transcript and find match
  if (!call && payload.transcript) {
    const match = (payload.transcript as string).match(/(?:Thank you|Hi),?\s+(\w+)[.!?\s]/i);
    const firstName = match?.[1]?.trim();
    if (firstName) {
      const patients = await prisma.patient.findMany({
        where: { name: { contains: firstName, mode: "insensitive" } },
        include: { calls: { orderBy: { createdAt: "desc" }, take: 1 } },
      });
      if (patients.length === 1) {
        const patient = patients[0];
        call = await prisma.call.create({
          data: {
            patientId: patient.id,
            bolnaCallId: parsed.bolnaCallId || null,
            status: "in_progress",
            trialDay: patient.trialDay,
            calledAt: new Date(),
          },
        });
        console.log("[Webhook] Created new call from transcript name:", firstName, "patient:", patient.name, "callId:", call.id);
      }
    }
  }

  if (!call) {
    console.log("[Webhook] ERROR: No matching call found");
    return NextResponse.json({ error: "No matching call found" }, { status: 404 });
  }

  console.log("[Webhook] Matched call:", call.id, "for patient:", call.patientId);

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

  console.log("[Webhook] Success - updated call:", updatedCall.id, "alerts:", alerts.length);

  return NextResponse.json({
    success: true,
    callId: updatedCall.id,
    alertsCreated: alerts.length,
  });
}
