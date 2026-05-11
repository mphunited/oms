import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { credit_memos, credit_memo_line_items, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

async function requireAccountingOrAdmin(user: { id: string } | null) {
  if (!user) return null
  const [dbUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)
  if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'ACCOUNTING')) return null
  return dbUser
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const dbUser = await requireAccountingOrAdmin(user)
    if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const [memo] = await db
      .select()
      .from(credit_memos)
      .where(eq(credit_memos.id, id))
      .limit(1)

    if (!memo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const lineItems = await db
      .select()
      .from(credit_memo_line_items)
      .where(eq(credit_memo_line_items.credit_memo_id, id))
      .orderBy(credit_memo_line_items.sort_order)

    return NextResponse.json({ ...memo, line_items: lineItems })
  } catch (err) {
    console.error('[GET /api/credit-memos/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const dbUser = await requireAccountingOrAdmin(user)
    if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const [existing] = await db
      .select({ status: credit_memos.status })
      .from(credit_memos)
      .where(eq(credit_memos.id, id))
      .limit(1)

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status === 'Final') {
      return NextResponse.json({ error: 'Cannot edit a finalized credit memo' }, { status: 403 })
    }

    const body = await req.json() as {
      credit_number?: string | null
      credit_date?: string
      customer_id?: string
      notes?: string | null
      line_items?: Array<{
        activity_type?: string | null
        description?: string | null
        qty?: number | null
        rate?: number | null
        amount?: number | null
        sort_order?: number
      }>
    }

    await db
      .update(credit_memos)
      .set({
        credit_number: body.credit_number ?? null,
        credit_date:   body.credit_date,
        customer_id:   body.customer_id,
        notes:         body.notes ?? null,
        updated_at:    new Date(),
      })
      .where(eq(credit_memos.id, id))

    // Full replace of line items
    await db.delete(credit_memo_line_items).where(eq(credit_memo_line_items.credit_memo_id, id))

    if (body.line_items?.length) {
      await db.insert(credit_memo_line_items).values(
        body.line_items.map((item, i) => ({
          credit_memo_id: id,
          activity_type:  item.activity_type ?? null,
          description:    item.description ?? null,
          qty:            item.qty != null ? String(item.qty) : null,
          rate:           item.rate != null ? String(item.rate) : null,
          amount:         item.amount != null ? String(item.amount) : null,
          sort_order:     item.sort_order ?? i,
        }))
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/credit-memos/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const dbUser = await requireAccountingOrAdmin(user)
    if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const [existing] = await db
      .select({ status: credit_memos.status, created_at: credit_memos.created_at })
      .from(credit_memos)
      .where(eq(credit_memos.id, id))
      .limit(1)

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status !== 'Draft') {
      return NextResponse.json({ error: 'Only Draft credit memos can be deleted' }, { status: 403 })
    }
    const today = new Date().toISOString().slice(0, 10)
    const createdDay = existing.created_at.toISOString().slice(0, 10)
    if (createdDay !== today) {
      return NextResponse.json({ error: 'Can only delete credit memos created today' }, { status: 403 })
    }

    await db.delete(credit_memos).where(eq(credit_memos.id, id))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/credit-memos/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
