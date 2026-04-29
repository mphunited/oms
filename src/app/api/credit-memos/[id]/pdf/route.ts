export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { db } from '@/lib/db'
import { credit_memos, credit_memo_line_items, customers, company_settings, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { CreditMemoPdf } from '@/lib/invoicing/build-credit-memo-pdf'
import React from 'react'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'ACCOUNTING')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const [memo] = await db
      .select()
      .from(credit_memos)
      .where(eq(credit_memos.id, id))
      .limit(1)

    if (!memo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [lineItems, [customer], [companySetting]] = await Promise.all([
      db.select().from(credit_memo_line_items)
        .where(eq(credit_memo_line_items.credit_memo_id, id))
        .orderBy(credit_memo_line_items.sort_order),
      db.select().from(customers).where(eq(customers.id, memo.customer_id)).limit(1),
      db.select().from(company_settings).limit(1),
    ])

    const buf = await renderToBuffer(
      React.createElement(CreditMemoPdf, {
        memo,
        lineItems,
        customer: customer ?? null,
        companySetting: companySetting ?? null,
      }) as any
    )

    const creditLabel = memo.credit_number ? `-${memo.credit_number}` : ''
    const filename = `credit-memo${creditLabel}.pdf`

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[GET /api/credit-memos/[id]/pdf]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
