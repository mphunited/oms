// src/app/api/commission/route.ts
// GET /api/commission
// Returns split loads where commission_status = 'Eligible' AND commission_paid_date IS NULL.
// SALES role: automatically filtered to their own orders only.
// ADMIN / ACCOUNTING: can see all, filter by salesperson.
//
// Query params:
//   salespersonId — filter by salesperson UUID (ADMIN/ACCOUNTING only)
//   startDate     — YYYY-MM-DD ship date range start (on split load)
//   endDate       — YYYY-MM-DD ship date range end (on split load)

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, isNull, lte } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, customers, vendors, users } from '@/lib/db/schema'
import { deriveInitials } from '@/lib/orders/commission-eligibility'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const [dbUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!dbUser) return new NextResponse('User not found', { status: 403 })

  const { searchParams } = new URL(req.url)
  const salespersonIdParam = searchParams.get('salespersonId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const salespersonAlias = alias(users, 'salesperson')
  const csrAlias = alias(users, 'csr')

  const conditions = [
    eq(order_split_loads.commission_status, 'Eligible'),
    eq(salespersonAlias.is_commission_eligible, true),
    isNull(order_split_loads.commission_paid_date),
  ]

  if (dbUser.role === 'SALES') {
    conditions.push(eq(orders.salesperson_id, dbUser.id))
  } else if ((dbUser.role === 'ADMIN' || dbUser.role === 'ACCOUNTING') && salespersonIdParam) {
    conditions.push(eq(orders.salesperson_id, salespersonIdParam))
  }

  if (startDate) conditions.push(gte(order_split_loads.ship_date, startDate))
  if (endDate) conditions.push(lte(order_split_loads.ship_date, endDate))

  const rows = await db
    .select({
      load_id:               order_split_loads.id,
      order_id:              orders.id,
      order_number:          orders.order_number,
      order_number_override: order_split_loads.order_number_override,
      customer_po_load:      order_split_loads.customer_po,
      customer_po_order:     orders.customer_po,
      description:           order_split_loads.description,
      qty:                   order_split_loads.qty,
      ship_date:             order_split_loads.ship_date,
      order_type:            order_split_loads.order_type,
      commission_status:     order_split_loads.commission_status,
      commission_paid_date:  order_split_loads.commission_paid_date,
      invoice_payment_status: orders.invoice_payment_status,
      invoice_paid_date:     orders.invoice_paid_date,
      customerName:          customers.name,
      vendorName:            vendors.name,
      salespersonName:       salespersonAlias.name,
      csrName:               csrAlias.name,
    })
    .from(order_split_loads)
    .innerJoin(orders, eq(order_split_loads.order_id, orders.id))
    .innerJoin(customers, eq(orders.customer_id, customers.id))
    .leftJoin(vendors, eq(orders.vendor_id, vendors.id))
    .innerJoin(salespersonAlias, eq(orders.salesperson_id, salespersonAlias.id))
    .leftJoin(csrAlias, eq(orders.csr_id, csrAlias.id))
    .where(and(...conditions))
    .orderBy(order_split_loads.ship_date)

  const result = rows.map(r => ({
    ...r,
    mphPo: r.order_number_override ?? r.order_number,
    customerPo: r.customer_po_load ?? r.customer_po_order ?? null,
    vendorName: r.vendorName ?? '—',
    salespersonInitials: deriveInitials(r.salespersonName),
    csrInitials: deriveInitials(r.csrName),
  }))

  return NextResponse.json(result)
}
