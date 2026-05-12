import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { credit_memos, credit_memo_line_items, customers, users } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
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

export async function GET(_req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const dbUser = await requireAccountingOrAdmin(user)
    if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const rows = await db
      .select({
        id:             credit_memos.id,
        credit_number:  credit_memos.credit_number,
        credit_date:    credit_memos.credit_date,
        customer_id:    credit_memos.customer_id,
        customer_name:  customers.name,
        notes:          credit_memos.notes,
        status:         credit_memos.status,
        created_by:     credit_memos.created_by,
        created_by_name: users.name,
        created_at:     credit_memos.created_at,
        updated_at:     credit_memos.updated_at,
        line_item_count: sql<number>`(SELECT COUNT(*) FROM credit_memo_line_items WHERE credit_memo_id = ${credit_memos.id})`.mapWith(Number),
        total_amount:    sql<string>`(SELECT COALESCE(SUM(amount), 0) FROM credit_memo_line_items WHERE credit_memo_id = ${credit_memos.id})`,
      })
      .from(credit_memos)
      .leftJoin(customers, eq(credit_memos.customer_id, customers.id))
      .leftJoin(users, eq(credit_memos.created_by, users.id))
      .orderBy(desc(credit_memos.created_at))

    return NextResponse.json(rows)
  } catch (err) {
    console.error('[GET /api/credit-memos]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const dbUser = await requireAccountingOrAdmin(user)
    if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json() as {
      credit_number?: string | null
      credit_date: string
      customer_id: string
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

    const [memo] = await db
      .insert(credit_memos)
      .values({
        credit_number: body.credit_number || null,
        credit_date:   body.credit_date,
        customer_id:   body.customer_id,
        notes:         body.notes || null,
        status:        'Draft',
        created_by:    dbUser.id,
      })
      .returning()

    if (body.line_items?.length) {
      await db.insert(credit_memo_line_items).values(
        body.line_items.map((item, i) => ({
          credit_memo_id: memo.id,
          activity_type:  item.activity_type ?? null,
          description:    item.description ?? null,
          qty:            item.qty != null ? String(item.qty) : null,
          rate:           item.rate != null ? String(item.rate) : null,
          amount:         item.amount != null ? String(item.amount) : null,
          sort_order:     item.sort_order ?? i,
        }))
      )
    }

    return NextResponse.json({ id: memo.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/credit-memos]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
