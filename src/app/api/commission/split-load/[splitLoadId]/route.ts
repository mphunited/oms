import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, order_split_loads, order_type_configs } from '@/lib/db/schema'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ splitLoadId: string }> }
) {
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

  const { splitLoadId } = await params
  const body = await req.json()
  const { order_type } = body as { order_type: unknown }

  if (!order_type || typeof order_type !== 'string' || !order_type.trim()) {
    return NextResponse.json({ error: 'order_type is required' }, { status: 400 })
  }

  const [currentLoad] = await db
    .select({ commission_status: order_split_loads.commission_status })
    .from(order_split_loads)
    .where(eq(order_split_loads.id, splitLoadId))
    .limit(1)

  if (!currentLoad) return new NextResponse('Not found', { status: 404 })

  const [config] = await db
    .select({ is_commission_eligible: order_type_configs.is_commission_eligible })
    .from(order_type_configs)
    .where(eq(order_type_configs.order_type, order_type.trim()))
    .limit(1)

  const isEligible = config?.is_commission_eligible ?? false

  let newStatus: string
  if (isEligible) {
    const current = currentLoad.commission_status ?? 'Not Eligible'
    newStatus = (current === 'Eligible' || current === 'Paid') ? current : 'Eligible'
  } else {
    newStatus = 'Not Eligible'
  }

  const [updated] = await db
    .update(order_split_loads)
    .set({ order_type: order_type.trim(), commission_status: newStatus, updated_at: new Date() })
    .where(eq(order_split_loads.id, splitLoadId))
    .returning()

  return NextResponse.json(updated)
}
