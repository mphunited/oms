import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { product_weights, users } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rows = await db
      .select({ id: product_weights.id, product_name: product_weights.product_name, weight_lbs: product_weights.weight_lbs })
      .from(product_weights)
      .orderBy(asc(product_weights.product_name))

    return NextResponse.json(rows)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch product weights', detail: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, session.user.id)).limit(1)
    if (!dbUser || dbUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { product_name, weight_lbs } = body
    if (!product_name || typeof product_name !== 'string' || !product_name.trim()) {
      return NextResponse.json({ error: 'product_name is required' }, { status: 400 })
    }
    if (weight_lbs === undefined || weight_lbs === null) {
      return NextResponse.json({ error: 'weight_lbs is required' }, { status: 400 })
    }

    const [row] = await db.insert(product_weights).values({
      product_name: product_name.trim(),
      weight_lbs: String(weight_lbs),
    }).returning()

    return NextResponse.json(row, { status: 201 })
  } catch (e: unknown) {
    const detail = String(e)
    if (detail.includes('unique') || detail.includes('duplicate')) {
      return NextResponse.json({ error: 'A product with that name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create product weight', detail }, { status: 500 })
  }
}
