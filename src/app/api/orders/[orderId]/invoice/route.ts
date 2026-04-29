import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, order_type_configs, users } from '@/lib/db/schema'
import { eq, and, ne, inArray } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'ACCOUNTING')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orderId } = await params
    const body = await req.json() as {
      qb_invoice_number?: string | null
      invoice_payment_status?: string
      invoice_paid_date?: string | null
    }

    const { qb_invoice_number, invoice_payment_status, invoice_paid_date } = body

    if (invoice_payment_status === 'Paid' && !invoice_paid_date) {
      return NextResponse.json(
        { error: 'invoice_paid_date is required when status is Paid' },
        { status: 400 }
      )
    }

    // Fetch current order to detect status transition
    const [currentOrder] = await db
      .select({ invoice_payment_status: orders.invoice_payment_status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const wasAlreadyPaid = currentOrder.invoice_payment_status === 'Paid'
    const isNowPaid      = invoice_payment_status === 'Paid'
    const isDemoting     = wasAlreadyPaid && !isNowPaid

    // Build update fields
    const updateFields: Record<string, unknown> = {
      updated_at: new Date(),
    }
    if (qb_invoice_number !== undefined)    updateFields.qb_invoice_number = qb_invoice_number
    if (invoice_payment_status !== undefined) updateFields.invoice_payment_status = invoice_payment_status
    if (invoice_paid_date !== undefined)    updateFields.invoice_paid_date = invoice_paid_date
    if (isDemoting) {
      updateFields.invoice_paid_date = null
    }

    await db.update(orders).set(updateFields).where(eq(orders.id, orderId))

    // Commission side-effects when marking as Paid
    if (isNowPaid && !wasAlreadyPaid) {
      const loads = await db
        .select({ id: order_split_loads.id, order_type: order_split_loads.order_type })
        .from(order_split_loads)
        .where(eq(order_split_loads.order_id, orderId))

      if (loads.length > 0) {
        const orderTypes = [...new Set(loads.map(l => l.order_type).filter(Boolean))] as string[]
        const configs = orderTypes.length > 0
          ? await db
              .select({ order_type: order_type_configs.order_type, is_commission_eligible: order_type_configs.is_commission_eligible })
              .from(order_type_configs)
              .where(inArray(order_type_configs.order_type, orderTypes))
          : []

        const eligibleTypes = new Set(
          configs.filter(c => c.is_commission_eligible).map(c => c.order_type)
        )

        const eligibleLoadIds = loads
          .filter(l => l.order_type && eligibleTypes.has(l.order_type))
          .map(l => l.id)

        if (eligibleLoadIds.length > 0) {
          await db
            .update(order_split_loads)
            .set({ commission_status: 'Eligible' })
            .where(
              and(
                inArray(order_split_loads.id, eligibleLoadIds),
                ne(order_split_loads.commission_status, 'Commission Paid'),
              )
            )
        }
      }
    }

    // Commission side-effects when demoting from Paid
    if (isDemoting) {
      await db
        .update(order_split_loads)
        .set({ commission_status: 'Not Eligible' })
        .where(
          and(
            eq(order_split_loads.order_id, orderId),
            ne(order_split_loads.commission_status, 'Commission Paid'),
          )
        )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/orders/[orderId]/invoice]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
