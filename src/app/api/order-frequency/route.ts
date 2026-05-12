import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne, sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, customers, users } from '@/lib/db/schema'

function generateMonths(start: string, end: string): string[] {
  const months: string[] = []
  const d = new Date(start + 'T00:00:00')
  d.setDate(1)
  const endDate = new Date(end + 'T00:00:00')
  endDate.setDate(1)
  while (d <= endDate) {
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    )
    d.setMonth(d.getMonth() + 1)
  }
  return months
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
  const shipToKey = searchParams.get('shipToKey')

  if (!startDate || !endDate || !customerId) {
    return NextResponse.json(
      { error: 'startDate, endDate, and customerId are required' },
      { status: 400 }
    )
  }

  // Fetch customer name
  const [customerRow] = await db
    .select({ name: customers.name })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1)

  const customerName = customerRow?.name ?? ''

  // Build base conditions shared by both queries
  const baseConditions = [
    eq(orders.customer_id, customerId),
    ne(orders.status, 'Canceled'),
    ...(shipToKey
      ? [sql`CONCAT(${orders.ship_to}->>'name','|',${orders.ship_to}->>'city','|',${orders.ship_to}->>'state') = ${shipToKey}`]
      : []),
  ]

  // ── Order Date series ──────────────────────────────────────────────────────
  const orderDateRows = await db
    .select({
      month: sql<string>`DATE_TRUNC('month', ${orders.order_date}::date)::date::text`,
      count: sql<number>`COUNT(DISTINCT ${orders.id})::int`,
    })
    .from(orders)
    .where(
      and(
        ...baseConditions,
        sql`${orders.order_date} >= ${startDate}`,
        sql`${orders.order_date} <= ${endDate}`,
      )
    )
    .groupBy(sql`DATE_TRUNC('month', ${orders.order_date}::date)`)
    .orderBy(sql`DATE_TRUNC('month', ${orders.order_date}::date)`)

  // ── Ship Date series ───────────────────────────────────────────────────────
  // Compute effective ship date = COALESCE(MIN(split.ship_date), orders.ship_date)
  // per order, then group by month.
  const effDates = db
    .select({
      orderId: orders.id,
      effShipDate: sql<string>`COALESCE(MIN(${order_split_loads.ship_date}), ${orders.ship_date})`.as('eff_ship_date'),
    })
    .from(orders)
    .leftJoin(order_split_loads, eq(order_split_loads.order_id, orders.id))
    .where(and(...baseConditions))
    .groupBy(orders.id, orders.ship_date)
    .as('eff_dates')

  const shipDateRows = await db
    .select({
      month: sql<string>`DATE_TRUNC('month', ${effDates.effShipDate}::date)::date::text`,
      count: sql<number>`COUNT(DISTINCT ${effDates.orderId})::int`,
    })
    .from(effDates)
    .where(
      and(
        sql`${effDates.effShipDate} >= ${startDate}`,
        sql`${effDates.effShipDate} <= ${endDate}`,
      )
    )
    .groupBy(sql`DATE_TRUNC('month', ${effDates.effShipDate}::date)`)
    .orderBy(sql`DATE_TRUNC('month', ${effDates.effShipDate}::date)`)

  // ── Gap fill ───────────────────────────────────────────────────────────────
  const allMonths = generateMonths(startDate, endDate)

  const orderDateMap = new Map(orderDateRows.map(r => [r.month, r.count]))
  const shipDateMap = new Map(shipDateRows.map(r => [r.month, r.count]))

  const orderDateSeries = allMonths.map(m => ({
    month: m,
    count: orderDateMap.get(m) ?? 0,
  }))
  const shipDateSeries = allMonths.map(m => ({
    month: m,
    count: shipDateMap.get(m) ?? 0,
  }))

  return NextResponse.json({ orderDateSeries, shipDateSeries, customerName })
}
