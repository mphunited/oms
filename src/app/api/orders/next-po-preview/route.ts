import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const initials = (searchParams.get('initials') ?? 'XX').toUpperCase()

  const result = await db.execute(
    sql`SELECT COALESCE(pg_sequence_last_value('order_number_seq'), 0) + 1 AS next_num`
  )
  const nextNum = (result as unknown as Array<{ next_num: number }>)[0].next_num

  return NextResponse.json({ preview: `${initials}-MPH${nextNum}` })
}
