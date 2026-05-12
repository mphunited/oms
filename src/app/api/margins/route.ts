import { NextRequest, NextResponse } from 'next/server'
import { and, asc, eq, ilike, ne, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, customers, vendors, users, order_type_configs } from '@/lib/db/schema'

function n(v: string | null | undefined): number {
  return v ? parseFloat(v) : 0
}

function fmt(v: number): string {
  return v.toFixed(2)
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'ACCOUNTING')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const customerId = searchParams.get('customerId')
  const vendorId = searchParams.get('vendorId')
  const salespersonId = searchParams.get('salespersonId')
  const shipToKey = searchParams.get('shipToKey')
  const search = searchParams.get('search')

  const salespersonAlias = alias(users, 'salesperson')

  const conditions = [
    ne(orders.status, 'Canceled'),
    // Exactly one split load
    sql`(SELECT COUNT(*) FROM order_split_loads osl2 WHERE osl2.order_id = ${orders.id}) = 1`,
    // Exclude Wash & Return on either field
    sql`(${order_split_loads.order_type} IS NULL OR (${order_split_loads.order_type} != '275 Gal IBC Wash & Return Program' AND ${order_split_loads.order_type} != '330 Gal IBC Wash & Return Program'))`,
    sql`(${orders.order_type} IS NULL OR (${orders.order_type} != '275 Gal IBC Wash & Return Program' AND ${orders.order_type} != '330 Gal IBC Wash & Return Program'))`,
  ]

  if (startDate) {
    conditions.push(sql`COALESCE(${order_split_loads.ship_date}, ${orders.ship_date}) >= ${startDate}`)
  }
  if (endDate) {
    conditions.push(sql`COALESCE(${order_split_loads.ship_date}, ${orders.ship_date}) <= ${endDate}`)
  }
  if (customerId) conditions.push(eq(orders.customer_id, customerId))
  if (vendorId) conditions.push(eq(orders.vendor_id, vendorId))
  if (salespersonId) conditions.push(eq(orders.salesperson_id, salespersonId))
  if (shipToKey) {
    conditions.push(
      sql`CONCAT(${orders.ship_to}->>'name','|',${orders.ship_to}->>'city','|',${orders.ship_to}->>'state') = ${shipToKey}`
    )
  }
  if (search) {
    const searchCond = or(
      ilike(customers.name, `%${search}%`),
      ilike(orders.order_number, `%${search}%`),
      ilike(vendors.name, `%${search}%`),
    )
    if (searchCond) conditions.push(searchCond)
  }

  const rows = await db
    .select({
      orderId:              orders.id,
      orderNumber:          orders.order_number,
      salesperson:          salespersonAlias.name,
      customerName:         customers.name,
      vendorName:           vendors.name,
      shipTo:               orders.ship_to,
      description:          order_split_loads.description,
      shipDate:             sql<string | null>`COALESCE(${order_split_loads.ship_date}, ${orders.ship_date})`,
      buy:                  order_split_loads.buy,
      sell:                 order_split_loads.sell,
      qty:                  order_split_loads.qty,
      freightCost:          orders.freight_cost,
      freightToCustomer:    orders.freight_to_customer,
      additionalCosts:      orders.additional_costs,
      bottleCost:           order_split_loads.bottle_cost,
      bottleQty:            order_split_loads.bottle_qty,
      mphFreightBottles:    order_split_loads.mph_freight_bottles,
      isCommissionEligible: order_type_configs.is_commission_eligible,
    })
    .from(orders)
    .innerJoin(order_split_loads, eq(order_split_loads.order_id, orders.id))
    .innerJoin(customers, eq(orders.customer_id, customers.id))
    .leftJoin(vendors, eq(orders.vendor_id, vendors.id))
    .leftJoin(salespersonAlias, eq(orders.salesperson_id, salespersonAlias.id))
    .leftJoin(order_type_configs, eq(order_split_loads.order_type, order_type_configs.order_type))
    .where(and(...conditions))
    .orderBy(
      sql`COALESCE(${order_split_loads.ship_date}, ${orders.ship_date}) DESC NULLS LAST`,
      asc(orders.order_number),
    )

  const result = rows.map(r => {
    const sell = n(r.sell)
    const buy = n(r.buy)
    const qty = n(r.qty)
    const freightToCustomer = n(r.freightToCustomer)
    const freightCost = n(r.freightCost)
    const bottleCost = n(r.bottleCost)
    const bottleQty = n(r.bottleQty)
    const mphFreightBottles = n(r.mphFreightBottles)
    const additionalCosts = n(r.additionalCosts)
    const commissionAmount = r.isCommissionEligible ? Math.round(qty * 3 * 100) / 100 : 0

    const ibcTotalCost = (bottleCost * bottleQty) + mphFreightBottles + additionalCosts
    const ibcTotalSellPrice = (sell * qty) + freightToCustomer

    const profit =
      (sell - buy) * qty
      + freightToCustomer
      - freightCost
      - (bottleCost * bottleQty)
      - (mphFreightBottles / 90) * bottleQty
      - commissionAmount
      - additionalCosts

    const denominator = sell * qty + freightToCustomer
    const profitPct = denominator !== 0 ? profit / denominator : null

    const shipToObj = r.shipTo as Record<string, string> | null
    const shipToLabel = shipToObj?.name
      ? [shipToObj.name, shipToObj.city, shipToObj.state].filter(Boolean).join(', ')
      : null

    return {
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      salesperson: r.salesperson ?? null,
      customerName: r.customerName,
      vendorName: r.vendorName ?? null,
      shipToLabel,
      description: r.description ?? null,
      shipDate: r.shipDate ?? null,
      buy: r.buy ?? null,
      sell: r.sell ?? null,
      qty: r.qty ?? null,
      freightCost: r.freightCost ?? null,
      customerFreightCost: r.freightToCustomer ?? null,
      additionalCosts: r.additionalCosts ?? null,
      bottleCost: r.bottleCost ?? null,
      bottleQty: r.bottleQty ?? null,
      mphFreightBottles: r.mphFreightBottles ?? null,
      commissionAmount: fmt(commissionAmount),
      ibcTotalCost: fmt(ibcTotalCost),
      ibcTotalSellPrice: fmt(ibcTotalSellPrice),
      profit: fmt(profit),
      profitPct: profitPct !== null ? fmt(profitPct * 100) : null,
    }
  })

  return NextResponse.json(result)
}
