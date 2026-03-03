import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const alert = await prisma.alert.update({
    where: { id },
    data: {
      resolved: body.resolved ?? true,
      resolvedAt: body.resolved !== false ? new Date() : null,
    },
  });

  return NextResponse.json(alert);
}
