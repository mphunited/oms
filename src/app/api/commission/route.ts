import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, ilike, lte, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, customers, vendors, users } from '@/lib/db/schema'
import { deriveFirstName } from '@/lib/orders/commission-eligibility'

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
  const commissionStatus = searchParams.get('commissionStatus') ?? ''
  const customerId = searchParams.get('customerId')
  const vendorId = searchParams.get('vendorId')
  const search = searchParams.get('search')
  const invoiceStatus = searchParams.get('invoiceStatus')

  const salespersonAlias = alias(users, 'salesperson')
  const csrAlias = alias(users, 'csr')

  const conditions = [
    eq(salespersonAlias.is_commission_eligible, true),
  ]

  if (commissionStatus && commissionStatus !== 'all') {
    conditions.push(eq(order_split_loads.commission_status, commissionStatus))
  }

  if (dbUser.role === 'SALES') {
    conditions.push(eq(orders.salesperson_id, dbUser.id))
  } else if ((dbUser.role === 'ADMIN' || dbUser.role === 'ACCOUNTING') && salespersonIdParam) {
    conditions.push(eq(orders.salesperson_id, salespersonIdParam))
  }

  if (startDate) conditions.push(gte(order_split_loads.ship_date, startDate))
  if (endDate) conditions.push(lte(order_split_loads.ship_date, endDate))
  if (customerId) conditions.push(eq(orders.customer_id, customerId))
  if (vendorId) conditions.push(eq(orders.vendor_id, vendorId))
  if (invoiceStatus) conditions.push(eq(orders.invoice_payment_status, invoiceStatus))

  const commissionPaidDateFrom = searchParams.get('commissionPaidDateFrom')
  const commissionPaidDateTo = searchParams.get('commissionPaidDateTo')

  if (commissionPaidDateFrom) conditions.push(
    gte(order_split_loads.commission_paid_date, commissionPaidDateFrom)
  )
  if (commissionPaidDateTo) conditions.push(
    lte(order_split_loads.commission_paid_date, commissionPaidDateTo)
  )

  if (search) {
    const searchCond = or(
      ilike(orders.order_number, `%${search}%`),
      ilike(orders.customer_po, `%${search}%`),
      ilike(customers.name, `%${search}%`),
      ilike(vendors.name, `%${search}%`),
    )
    if (searchCond) conditions.push(searchCond)
  }

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
    salespersonFirst: deriveFirstName(r.salespersonName),
    csrFirst: deriveFirstName(r.csrName),
  }))

  return NextResponse.json(result)
}
