import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_groups, users } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq, inArray, sql } from 'drizzle-orm'
import { deriveInitials } from '@/lib/orders/commission-eligibility'

const EARLY_STATUSES = new Set([
  'Pending',
  'Waiting On Vendor To Confirm',
  'Acknowledged Order',
  'PO Request To Accounting',
  'PO Revision To Accounting',
  'PO Moving',
])

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { orderIds?: unknown }
    const orderIds = body.orderIds

    if (!Array.isArray(orderIds) || orderIds.length < 2 || orderIds.length > 4) {
      return NextResponse.json(
        { error: 'Select 2–4 orders to create a group' },
        { status: 400 },
      )
    }

    const fetchedOrders = await db
      .select({
        id: orders.id,
        vendor_id: orders.vendor_id,
        status: orders.status,
        group_id: orders.group_id,
      })
      .from(orders)
      .where(inArray(orders.id, orderIds as string[]))

    if (fetchedOrders.length !== orderIds.length) {
      return NextResponse.json({ error: 'One or more orders not found' }, { status: 400 })
    }

    const vendorIds = [...new Set(fetchedOrders.map(o => o.vendor_id).filter(Boolean))]
    if (vendorIds.length > 1) {
      return NextResponse.json(
        { error: 'All orders in a group must share the same vendor' },
        { status: 400 },
      )
    }

    const alreadyGrouped = fetchedOrders.find(o => o.group_id)
    if (alreadyGrouped) {
      return NextResponse.json(
        { error: 'One or more orders are already in a group' },
        { status: 400 },
      )
    }

    const tooFarAlong = fetchedOrders.find(o => !EARLY_STATUSES.has(o.status))
    if (tooFarAlong) {
      return NextResponse.json(
        { error: 'Cannot group orders after vendor communication has begun' },
        { status: 400 },
      )
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) })
    const initials = deriveInitials(user?.name)

    const seqResult = await db.execute(sql`SELECT nextval('order_number_seq') AS num`)
    const num = (seqResult as unknown as Array<{ num: string | number }>)[0].num
    const group_po_number = `${initials}-MPH${num}`

    const [newGroup] = await db
      .insert(order_groups)
      .values({
        group_po_number,
        vendor_id: vendorIds[0] ?? null,
      })
      .returning()

    await db
      .update(orders)
      .set({ group_id: newGroup.id })
      .where(inArray(orders.id, orderIds as string[]))

    return NextResponse.json(newGroup, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/order-groups]', message)
    return NextResponse.json({ error: 'Failed to create group', detail: message }, { status: 500 })
  }
}
