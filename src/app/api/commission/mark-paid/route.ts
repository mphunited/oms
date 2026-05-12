import { NextRequest, NextResponse } from 'next/server'
import { eq, inArray } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, users } from '@/lib/db/schema'
import { deriveOrderCommissionStatus } from '@/lib/orders/commission-eligibility'

export async function POST(req: NextRequest) {
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

  const body = await req.json()
  const { splitLoadIds, commissionPaidDate } = body as {
    splitLoadIds: string[]
    commissionPaidDate: string
  }

  if (!splitLoadIds?.length) return new NextResponse('splitLoadIds is required', { status: 400 })
  if (!commissionPaidDate) return new NextResponse('commissionPaidDate is required', { status: 400 })

  await db.transaction(async (tx) => {
    // Stamp commission_paid_date on the selected split loads
    await tx.update(order_split_loads)
      .set({ commission_paid_date: commissionPaidDate, commission_status: 'Paid' })
      .where(inArray(order_split_loads.id, splitLoadIds))

    // Get affected order IDs from those split loads
    const affectedLoads = await tx
      .select({ order_id: order_split_loads.order_id })
      .from(order_split_loads)
      .where(inArray(order_split_loads.id, splitLoadIds))

    const affectedOrderIds = [...new Set(affectedLoads.map(l => l.order_id))]

    // Recompute order-level commission_status for each affected order
    for (const orderId of affectedOrderIds) {
      const allLoads = await tx
        .select({
          commission_status: order_split_loads.commission_status,
          commission_paid_date: order_split_loads.commission_paid_date,
        })
        .from(order_split_loads)
        .where(eq(order_split_loads.order_id, orderId))

      const orderStatus = deriveOrderCommissionStatus(
        allLoads as Array<{ commission_status: string; commission_paid_date: string | null }>
      )

      await tx.update(orders)
        .set({
          commission_status: orderStatus,
          commission_paid_date: orderStatus === 'Commission Paid' ? commissionPaidDate : null,
          updated_at: new Date(),
        })
        .where(eq(orders.id, orderId))
    }
  })

  return NextResponse.json({ updated: splitLoadIds.length })
}
