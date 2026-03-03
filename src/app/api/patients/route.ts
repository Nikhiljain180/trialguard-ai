import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const risk = searchParams.get("risk");

  const where: Record<string, string> = {};
  if (status) where.status = status;
  if (risk) where.dropoutRisk = risk;

  const patients = await prisma.patient.findMany({
    where,
    include: {
      calls: { orderBy: { createdAt: "desc" }, take: 1 },
      alerts: { where: { resolved: false } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = patients.map((p) => {
    const lastCall = p.calls[0] || null;
    const totalCalls = p.calls.length;
    return {
      ...p,
      lastCall,
      activeAlerts: p.alerts.length,
      totalCalls,
    };
  });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const patient = await prisma.patient.create({
    data: {
      name: body.name,
      phone: body.phone,
      email: body.email || null,
      trialArm: body.trialArm || "treatment",
      enrollmentDate: new Date(body.enrollmentDate || Date.now()),
      trialDay: body.trialDay || 1,
      status: "active",
      dropoutRisk: "low",
    },
  });

  return NextResponse.json(patient, { status: 201 });
}
