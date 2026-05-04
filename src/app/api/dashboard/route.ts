import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, customers, users } from '@/lib/db/schema'
import { eq, not, inArray, and, gte, lte, desc, count, sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

const INACTIVE_STATUSES = ['Complete', 'Canceled']

function getWeekBounds() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  }
}

function getMonthBounds() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { start, end }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const week = getWeekBounds()
    const month = getMonthBounds()

    const [
      activeResult,
      invoiceResult,
      weekResult,
      monthResult,
      statusRows,
      recentOrders,
    ] = await Promise.all([
      db.select({ count: count() }).from(orders)
        .where(not(inArray(orders.status, INACTIVE_STATUSES))),

      db.select({ count: count() }).from(orders)
        .where(eq(orders.status, 'Ready To Invoice')),

      db.select({ count: count() }).from(orders)
        .where(and(
          gte(orders.ship_date, week.start),
          lte(orders.ship_date, week.end),
        )),

      db.select({ count: count() }).from(orders)
        .where(and(
          gte(orders.order_date, month.start),
          lte(orders.order_date, month.end),
        )),

      db.select({ status: orders.status, count: count() }).from(orders)
        .where(not(inArray(orders.status, INACTIVE_STATUSES)))
        .groupBy(orders.status)
        .orderBy(sql`count(*) desc`),

      db.select({
        id: orders.id,
        order_number: orders.order_number,
        status: orders.status,
        ship_date: orders.ship_date,
        customer_name: customers.name,
        salesperson_name: users.name,
      })
        .from(orders)
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .leftJoin(users, eq(orders.salesperson_id, users.id))
        .orderBy(desc(orders.created_at))
        .limit(10),
    ])

    return NextResponse.json({
      activeOrders: Number(activeResult[0]?.count ?? 0),
      readyToInvoice: Number(invoiceResult[0]?.count ?? 0),
      shippedThisWeek: Number(weekResult[0]?.count ?? 0),
      ordersThisMonth: Number(monthResult[0]?.count ?? 0),
      statusDistribution: statusRows.map(r => ({
        status: r.status,
        count: Number(r.count),
      })),
      recentOrders,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/dashboard]', message)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
