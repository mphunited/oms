import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, vendors, users } from '@/lib/db/schema'

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

  const conditions = []
  if (startDate) conditions.push(gte(order_split_loads.ship_date, startDate))
  if (endDate) conditions.push(lte(order_split_loads.ship_date, endDate))

  const whereClause = conditions.length ? and(...conditions) : undefined

  const productRows = await db
    .select({
      orderType: sql<string>`COALESCE(${order_split_loads.order_type}, 'Other — Parts & Supplies')`,
      totalQty: sql<string>`SUM(${order_split_loads.qty})`,
      totalShipments: sql<number>`COUNT(DISTINCT ${order_split_loads.order_id})::int`,
    })
    .from(order_split_loads)
    .innerJoin(orders, eq(order_split_loads.order_id, orders.id))
    .where(whereClause)
    .groupBy(sql`COALESCE(${order_split_loads.order_type}, 'Other — Parts & Supplies')`)
    .orderBy(sql`COALESCE(${order_split_loads.order_type}, 'Other — Parts & Supplies') ASC NULLS LAST`)

  const vendorRows = await db
    .select({
      vendorId: orders.vendor_id,
      vendorName: vendors.name,
      orderType: sql<string>`COALESCE(${order_split_loads.order_type}, 'Other — Parts & Supplies')`,
      totalQty: sql<string>`SUM(${order_split_loads.qty})`,
      totalShipments: sql<number>`COUNT(DISTINCT ${order_split_loads.order_id})::int`,
    })
    .from(order_split_loads)
    .innerJoin(orders, eq(order_split_loads.order_id, orders.id))
    .leftJoin(vendors, eq(orders.vendor_id, vendors.id))
    .where(whereClause)
    .groupBy(
      orders.vendor_id,
      vendors.name,
      sql`COALESCE(${order_split_loads.order_type}, 'Other — Parts & Supplies')`,
    )
    .orderBy(
      vendors.name,
      sql`COALESCE(${order_split_loads.order_type}, 'Other — Parts & Supplies') ASC`,
    )

  return NextResponse.json({
    productTotals: productRows.map(r => ({
      orderType: r.orderType,
      totalQty: r.totalQty ? parseFloat(r.totalQty) : 0,
      totalShipments: r.totalShipments ?? 0,
    })),
    vendorTotals: vendorRows.map(r => ({
      vendorId: r.vendorId ?? null,
      vendorName: r.vendorName ?? '(No vendor)',
      orderType: r.orderType,
      totalQty: r.totalQty ? parseFloat(r.totalQty) : 0,
      totalShipments: r.totalShipments ?? 0,
    })),
  })
}
