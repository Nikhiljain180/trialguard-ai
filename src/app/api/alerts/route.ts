import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const resolved = searchParams.get("resolved");

  const where: Record<string, boolean> = {};
  if (resolved === "true") where.resolved = true;
  else if (resolved === "false") where.resolved = false;

  const alerts = await prisma.alert.findMany({
    where,
    include: { patient: true },
    orderBy: [
      { resolved: "asc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json(alerts);
}
