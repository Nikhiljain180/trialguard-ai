import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { makeCall } from "@/lib/bolna";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { patientId } = body;

  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { calls: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const lastCall = patient.calls[0];
  const lastSymptoms = lastCall
    ? [
        lastCall.nausea && lastCall.nausea !== "none" ? `Nausea: ${lastCall.nausea}` : null,
        lastCall.headache && lastCall.headache !== "none" ? `Headache: ${lastCall.headache}` : null,
        lastCall.energyLevel ? `Energy: ${lastCall.energyLevel}` : null,
      ]
        .filter(Boolean)
        .join(", ") || "None reported"
    : "First call";

  const call = await prisma.call.create({
    data: {
      patientId: patient.id,
      status: "in_progress",
      trialDay: patient.trialDay,
      calledAt: new Date(),
    },
  });

  try {
    const bolnaResponse = await makeCall({
      recipientPhone: patient.phone,
      patientName: patient.name,
      trialDay: patient.trialDay,
      lastSymptoms,
    });

    const bolnaCallId = (bolnaResponse as { call_id?: string; id?: string }).call_id || (bolnaResponse as { call_id?: string; id?: string }).id || null;
    console.log("[Calls] Bolna response - call_id:", (bolnaResponse as { call_id?: string }).call_id, "id:", (bolnaResponse as { id?: string }).id, "storing:", bolnaCallId);

    await prisma.call.update({
      where: { id: call.id },
      data: {
        bolnaCallId,
        status: "in_progress",
      },
    });

    return NextResponse.json({
      success: true,
      callId: call.id,
      bolnaCallId,
      message: `Call initiated to ${patient.name}`,
    });
  } catch (error) {
    await prisma.call.update({
      where: { id: call.id },
      data: { status: "failed", outcome: "failed" },
    });

    return NextResponse.json(
      {
        success: false,
        callId: call.id,
        error: error instanceof Error ? error.message : "Failed to initiate call",
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  const calls = await prisma.call.findMany({
    include: { patient: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(calls);
}
