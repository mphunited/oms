import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { order_type_configs, users } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rows = await db
      .select({ id: order_type_configs.id, order_type: order_type_configs.order_type, is_commission_eligible: order_type_configs.is_commission_eligible, sort_order: order_type_configs.sort_order })
      .from(order_type_configs)
      .orderBy(asc(order_type_configs.sort_order))

    return NextResponse.json(rows)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch order type configs', detail: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, user.id)).limit(1)
    if (!dbUser || dbUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { order_type, is_commission_eligible, sort_order } = body
    if (!order_type || typeof order_type !== 'string' || !order_type.trim()) {
      return NextResponse.json({ error: 'order_type is required' }, { status: 400 })
    }

    const [row] = await db.insert(order_type_configs).values({
      order_type: order_type.trim(),
      is_commission_eligible: Boolean(is_commission_eligible),
      sort_order: Number(sort_order ?? 0),
    }).returning()

    return NextResponse.json(row, { status: 201 })
  } catch (e: unknown) {
    const detail = String(e)
    if (detail.includes('unique') || detail.includes('duplicate')) {
      return NextResponse.json({ error: 'An order type with that name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create order type config', detail }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, user.id)).limit(1)
    if (!dbUser || dbUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { configs } = body as { configs: { id?: string; order_type: string; is_commission_eligible: boolean; sort_order: number }[] }
    if (!Array.isArray(configs)) return NextResponse.json({ error: 'configs array is required' }, { status: 400 })

    const rows = await db.transaction(async (tx) => {
      await tx.delete(order_type_configs)
      if (configs.length === 0) return []
      return tx.insert(order_type_configs).values(
        configs.map((c) => ({
          order_type: c.order_type.trim(),
          is_commission_eligible: Boolean(c.is_commission_eligible),
          sort_order: Number(c.sort_order ?? 0),
        }))
      ).returning()
    })

    return NextResponse.json(rows)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to replace order type configs', detail: String(e) }, { status: 500 })
  }
}
