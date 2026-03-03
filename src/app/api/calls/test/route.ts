import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Test endpoint: creates an in_progress call for webhook E2E testing.
 * Use only in development. POST to /api/calls/webhook with the returned callId.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const patient = await prisma.patient.findFirst();
  if (!patient) return NextResponse.json({ error: "No patients" }, { status: 400 });

  const call = await prisma.call.create({
    data: {
      patientId: patient.id,
      status: "in_progress",
      trialDay: patient.trialDay,
      calledAt: new Date(),
    },
  });

  return NextResponse.json({
    callId: call.id,
    bolnaCallId: `test-${call.id}`,
    patientId: patient.id,
    patientName: patient.name,
    message: "In-progress call created. POST to /api/calls/webhook to simulate completion.",
  });
}
