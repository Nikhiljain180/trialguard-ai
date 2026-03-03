import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [
    totalPatients,
    activePatients,
    totalCalls,
    completedCalls,
    activeAlerts,
    patients,
    recentCalls,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.patient.count({ where: { status: "active" } }),
    prisma.call.count(),
    prisma.call.count({ where: { status: "completed" } }),
    prisma.alert.count({ where: { resolved: false } }),
    prisma.patient.findMany({
      select: { dropoutRisk: true },
    }),
    prisma.call.findMany({
      include: { patient: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const allCalls = await prisma.call.findMany({
    where: { status: "completed" },
    select: { morningDose: true, eveningDose: true },
  });

  const dosesTaken = allCalls.reduce(
    (acc, c) => acc + (c.morningDose ? 1 : 0) + (c.eveningDose ? 1 : 0),
    0
  );
  const totalDoses = allCalls.length * 2;
  const adherenceRate = totalDoses > 0 ? Math.round((dosesTaken / totalDoses) * 100) : 0;

  const riskDistribution = {
    low: patients.filter((p) => p.dropoutRisk === "low").length,
    medium: patients.filter((p) => p.dropoutRisk === "medium").length,
    high: patients.filter((p) => p.dropoutRisk === "high").length,
  };

  return NextResponse.json({
    totalPatients,
    activePatients,
    totalCalls,
    completedCalls,
    activeAlerts,
    adherenceRate,
    riskDistribution,
    recentCalls,
  });
}
