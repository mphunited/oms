import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, customers, users } from '@/lib/db/schema'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'ACCOUNTING')) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const customerId = searchParams.get('customerId')
  const granularity = searchParams.get('granularity') === 'quarterly' ? 'quarterly' : 'monthly'

  const truncExpr = granularity === 'quarterly'
    ? sql<string>`DATE_TRUNC('quarter', ${order_split_loads.ship_date}::date)::text`
    : sql<string>`DATE_TRUNC('month', ${order_split_loads.ship_date}::date)::text`

  const conditions = []
  if (startDate) conditions.push(gte(order_split_loads.ship_date, startDate))
  if (endDate) conditions.push(lte(order_split_loads.ship_date, endDate))

  if (customerId) {
    conditions.push(eq(orders.customer_id, customerId))

    const rows = await db
      .select({
        period: truncExpr,
        orderCount: sql<number>`COUNT(DISTINCT ${orders.id})::int`,
      })
      .from(order_split_loads)
      .innerJoin(orders, eq(order_split_loads.order_id, orders.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(truncExpr)
      .orderBy(truncExpr)

    const periods = rows.map(r => r.period).filter(Boolean) as string[]
    return NextResponse.json({
      mode: 'single',
      periods,
      data: rows.map(r => ({ period: r.period ?? '', count: r.orderCount ?? 0 })),
    })
  }

  // All customers mode
  const rows = await db
    .select({
      customerId: orders.customer_id,
      customerName: customers.name,
      period: truncExpr,
      orderCount: sql<number>`COUNT(DISTINCT ${orders.id})::int`,
    })
    .from(order_split_loads)
    .innerJoin(orders, eq(order_split_loads.order_id, orders.id))
    .innerJoin(customers, eq(orders.customer_id, customers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(orders.customer_id, customers.name, truncExpr)
    .orderBy(customers.name, truncExpr)

  // Collect all unique periods
  const periodSet = new Set<string>()
  for (const r of rows) if (r.period) periodSet.add(r.period)
  const periods = Array.from(periodSet).sort()

  // Pivot into per-customer rows
  type CustomerRow = {
    customerId: string
    customerName: string
    total: number
    periodCounts: Record<string, number>
  }
  const customerMap = new Map<string, CustomerRow>()

  for (const r of rows) {
    if (!r.customerId || !r.period) continue
    if (!customerMap.has(r.customerId)) {
      customerMap.set(r.customerId, {
        customerId: r.customerId,
        customerName: r.customerName ?? '(Unknown)',
        total: 0,
        periodCounts: {},
      })
    }
    const entry = customerMap.get(r.customerId)!
    entry.periodCounts[r.period] = (entry.periodCounts[r.period] ?? 0) + (r.orderCount ?? 0)
    entry.total += r.orderCount ?? 0
  }

  return NextResponse.json({
    mode: 'all',
    periods,
    customers: Array.from(customerMap.values()),
  })
}
