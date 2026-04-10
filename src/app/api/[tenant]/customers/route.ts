import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companies, customers, orders } from "@/lib/db/schema";
import { eq, and, asc, count } from "drizzle-orm";

interface RouteContext {
  params: Promise<{ tenant: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { tenant: companyId } = await params;

  const company = await db.query.companies.findFirst({ where: eq(companies.id, companyId) });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const rows = await db
    .select({
      id: customers.id,
      company_id: customers.company_id,
      name: customers.name,
      contacts: customers.contacts,
      ship_to: customers.ship_to,
      bill_to: customers.bill_to,
      payment_terms: customers.payment_terms,
      is_active: customers.is_active,
      created_at: customers.created_at,
      orderCount: count(orders.id),
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customer_id, customers.id))
    .where(and(eq(customers.company_id, company.id), eq(customers.is_active, true)))
    .groupBy(customers.id)
    .orderBy(asc(customers.name));

  return NextResponse.json(rows);
}
