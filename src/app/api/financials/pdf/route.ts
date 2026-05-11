import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, customers, vendors, recycling_orders, users } from '@/lib/db/schema'
import { FinancialsPdf } from '@/lib/financials/build-financials-pdf'

export const runtime = 'nodejs'

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
  const startDate = searchParams.get('startDate') ?? ''
  const endDate = searchParams.get('endDate') ?? ''
  const customerId = searchParams.get('customerId')

  // Product totals
  const slConditions = []
  if (startDate) slConditions.push(gte(order_split_loads.ship_date, startDate))
  if (endDate) slConditions.push(lte(order_split_loads.ship_date, endDate))
  const slWhere = slConditions.length ? and(...slConditions) : undefined

  const [productRows, vendorRows] = await Promise.all([
    db.select({
      orderType: sql<string>`COALESCE(${order_split_loads.order_type}, 'Other — Parts & Supplies')`,
      totalQty: sql<string>`SUM(${order_split_loads.qty})`,
      totalShipments: sql<number>`COUNT(DISTINCT ${order_split_loads.order_id})::int`,
    })
    .from(order_split_loads)
    .innerJoin(orders, eq(order_split_loads.order_id, orders.id))
    .where(slWhere)
    .groupBy(sql`COALESCE(${order_split_loads.order_type}, 'Other — Parts & Supplies')`)
    .orderBy(sql`COALESCE(${order_split_loads.order_type}, 'Other — Parts & Supplies') ASC NULLS LAST`),

    db.select({
      vendorName: vendors.name,
      orderType: sql<string>`COALESCE(${order_split_loads.order_type}, 'Other — Parts & Supplies')`,
      totalQty: sql<string>`SUM(${order_split_loads.qty})`,
      totalShipments: sql<number>`COUNT(DISTINCT ${order_split_loads.order_id})::int`,
    })
    .from(order_split_loads)
    .innerJoin(orders, eq(order_split_loads.order_id, orders.id))
    .leftJoin(vendors, eq(orders.vendor_id, vendors.id))
    .where(slWhere)
    .groupBy(orders.vendor_id, vendors.name, sql`COALESCE(${order_split_loads.order_type}, 'Other — Parts & Supplies')`)
    .orderBy(vendors.name, sql`COALESCE(${order_split_loads.order_type}, 'Other — Parts & Supplies') ASC`),
  ])

  // Customer orders (all customers or specific customer)
  const custConditions = [...slConditions]
  if (customerId) custConditions.push(eq(orders.customer_id, customerId))

  const customerRows = await db
    .select({
      customerName: customers.name,
      period: sql<string>`DATE_TRUNC('month', ${order_split_loads.ship_date}::date)::text`,
      orderCount: sql<number>`COUNT(DISTINCT ${orders.id})::int`,
    })
    .from(order_split_loads)
    .innerJoin(orders, eq(order_split_loads.order_id, orders.id))
    .innerJoin(customers, eq(orders.customer_id, customers.id))
    .where(custConditions.length ? and(...custConditions) : undefined)
    .groupBy(customers.name, sql`DATE_TRUNC('month', ${order_split_loads.ship_date}::date)`)
    .orderBy(customers.name, sql`DATE_TRUNC('month', ${order_split_loads.ship_date}::date) ASC`)

  // Recycling totals
  const rcConditions = []
  if (startDate) rcConditions.push(gte(recycling_orders.pick_up_date, startDate))
  if (endDate) rcConditions.push(lte(recycling_orders.pick_up_date, endDate))

  const recyclingRows = await db
    .select({
      recyclingType: recycling_orders.recycling_type,
      vendorName: vendors.name,
      totalQty: sql<string>`SUM(${recycling_orders.qty})`,
      totalOrders: sql<number>`COUNT(${recycling_orders.id})::int`,
    })
    .from(recycling_orders)
    .leftJoin(vendors, eq(recycling_orders.vendor_id, vendors.id))
    .where(rcConditions.length ? and(...rcConditions) : undefined)
    .groupBy(recycling_orders.recycling_type, recycling_orders.vendor_id, vendors.name)
    .orderBy(vendors.name)

  const buf = await renderToBuffer(
    FinancialsPdf({
      startDate,
      endDate,
      productTotals: productRows.map(r => ({
        orderType: r.orderType,
        totalQty: r.totalQty ? parseFloat(r.totalQty) : 0,
        totalShipments: r.totalShipments ?? 0,
      })),
      vendorTotals: vendorRows.map(r => ({
        vendorName: r.vendorName ?? '(No vendor)',
        orderType: r.orderType,
        totalQty: r.totalQty ? parseFloat(r.totalQty) : 0,
        totalShipments: r.totalShipments ?? 0,
      })),
      customerRows: customerRows.map(r => ({
        customerName: r.customerName ?? '(Unknown)',
        period: r.period ?? '',
        orderCount: r.orderCount ?? 0,
      })),
      ibcTotals: recyclingRows
        .filter(r => r.recyclingType === 'IBC')
        .map(r => ({ vendorName: r.vendorName ?? '(No vendor)', totalQty: r.totalQty ? parseFloat(r.totalQty) : 0, totalOrders: r.totalOrders ?? 0 })),
      drumTotals: recyclingRows
        .filter(r => r.recyclingType === 'Drum')
        .map(r => ({ vendorName: r.vendorName ?? '(No vendor)', totalQty: r.totalQty ? parseFloat(r.totalQty) : 0, totalOrders: r.totalOrders ?? 0 })),
    })
  )

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="financials-${startDate}-${endDate}.pdf"`,
    },
  })
}
