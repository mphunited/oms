// src/app/api/commission/mark-paid/route.ts
// POST /api/commission/mark-paid
// Marks a batch of orders as Commission Paid with a payroll date.
// ADMIN and ACCOUNTING only.
//
// Body: { orderIds: string[], commissionPaidDate: string (YYYY-MM-DD) }

import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // Role check — ADMIN and ACCOUNTING only
  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "ACCOUNTING")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const { orderIds, commissionPaidDate } = body as {
    orderIds: string[];
    commissionPaidDate: string;
  };

  if (!orderIds || orderIds.length === 0) {
    return new NextResponse("orderIds is required", { status: 400 });
  }
  if (!commissionPaidDate) {
    return new NextResponse("commissionPaidDate is required", { status: 400 });
  }

  await db
    .update(orders)
    .set({
      commission_status: "Commission Paid",
      commission_paid_date: commissionPaidDate,
      updated_at: new Date(),
    })
    .where(inArray(orders.id, orderIds));

  return NextResponse.json({ updated: orderIds.length });
}
