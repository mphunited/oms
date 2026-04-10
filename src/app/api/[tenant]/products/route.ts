// Vendors API — replaces the old products route
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ tenant: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { tenant: companyId } = await params;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const vendors = await prisma.vendor.findMany({
    where: { companyId: company.id, isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(vendors);
}
