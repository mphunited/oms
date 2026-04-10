// Vendors API — replaces the old products route
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companies, vendors } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

interface RouteContext {
  params: Promise<{ tenant: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { tenant: companyId } = await params;

  const company = await db.query.companies.findFirst({ where: eq(companies.id, companyId) });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const rows = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.company_id, company.id), eq(vendors.is_active, true)))
    .orderBy(asc(vendors.name));

  return NextResponse.json(rows);
}
