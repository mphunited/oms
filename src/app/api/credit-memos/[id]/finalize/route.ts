import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { credit_memos, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params

    const [existing] = await db
      .select({ status: credit_memos.status, credit_number: credit_memos.credit_number })
      .from(credit_memos)
      .where(eq(credit_memos.id, id))
      .limit(1)

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!existing.credit_number?.trim()) {
      return NextResponse.json(
        { error: 'QBO Credit # is required before finalizing' },
        { status: 400 }
      )
    }

    await db
      .update(credit_memos)
      .set({ status: 'Final', updated_at: new Date() })
      .where(eq(credit_memos.id, id))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/credit-memos/[id]/finalize]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
