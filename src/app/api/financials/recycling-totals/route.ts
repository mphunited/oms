import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { recycling_orders, vendors, users } from '@/lib/db/schema'

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
  if (startDate) conditions.push(gte(recycling_orders.pick_up_date, startDate))
  if (endDate) conditions.push(lte(recycling_orders.pick_up_date, endDate))

  const whereClause = conditions.length ? and(...conditions) : undefined

  const rows = await db
    .select({
      recyclingType: recycling_orders.recycling_type,
      vendorId: recycling_orders.vendor_id,
      vendorName: vendors.name,
      totalQty: sql<string>`SUM(${recycling_orders.qty})`,
      totalOrders: sql<number>`COUNT(${recycling_orders.id})::int`,
    })
    .from(recycling_orders)
    .leftJoin(vendors, eq(recycling_orders.vendor_id, vendors.id))
    .where(whereClause)
    .groupBy(recycling_orders.recycling_type, recycling_orders.vendor_id, vendors.name)
    .orderBy(vendors.name)

  const ibcTotals = rows
    .filter(r => r.recyclingType === 'IBC')
    .map(r => ({
      vendorId: r.vendorId ?? null,
      vendorName: r.vendorName ?? '(No vendor)',
      totalQty: r.totalQty ? parseFloat(r.totalQty) : 0,
      totalOrders: r.totalOrders ?? 0,
    }))

  const drumTotals = rows
    .filter(r => r.recyclingType === 'Drum')
    .map(r => ({
      vendorId: r.vendorId ?? null,
      vendorName: r.vendorName ?? '(No vendor)',
      totalQty: r.totalQty ? parseFloat(r.totalQty) : 0,
      totalOrders: r.totalOrders ?? 0,
    }))

  return NextResponse.json({ ibcTotals, drumTotals })
}
