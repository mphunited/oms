import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return new NextResponse('Unauthorized', { status: 401 })

  const number = req.nextUrl.searchParams.get('number')?.trim()
  if (!number) return NextResponse.json({ error: 'number is required' }, { status: 400 })

  const row = await db.query.orders.findFirst({
    where: eq(orders.order_number, number),
    columns: { id: true },
  })

  return NextResponse.json({ exists: !!row })
}
