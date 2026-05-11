import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_groups, customers, users } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const group = await db.query.order_groups.findFirst({
    where: eq(order_groups.id, id),
  })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const groupOrders = await db
    .select({
      id: orders.id,
      order_number: orders.order_number,
      customer_name: customers.name,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customer_id, customers.id))
    .where(eq(orders.group_id, id))
    .orderBy(orders.created_at)

  return NextResponse.json({
    ...group,
    orders: groupOrders,
    order_ids: groupOrders.map(o => o.id),
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    })
    if (dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    await db.update(orders).set({ group_id: null }).where(eq(orders.group_id, id))
    await db.delete(order_groups).where(eq(order_groups.id, id))

    return new Response(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[DELETE /api/order-groups/:id]', message)
    return NextResponse.json({ error: 'Failed to delete group', detail: message }, { status: 500 })
  }
}
