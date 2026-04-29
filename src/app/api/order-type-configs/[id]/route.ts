import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { order_type_configs, order_split_loads, users } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, session.user.id)).limit(1)
    if (!dbUser || dbUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const [config] = await db.select({ order_type: order_type_configs.order_type }).from(order_type_configs).where(eq(order_type_configs.id, id)).limit(1)
    if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [{ value }] = await db.select({ value: count() }).from(order_split_loads).where(eq(order_split_loads.order_type, config.order_type))
    if (value > 0) {
      return NextResponse.json({ error: `Cannot delete: ${value} split load(s) currently use this order type` }, { status: 409 })
    }

    await db.delete(order_type_configs).where(eq(order_type_configs.id, id))
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete order type config', detail: String(e) }, { status: 500 })
  }
}
