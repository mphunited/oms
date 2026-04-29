import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { product_weights, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, session.user.id)).limit(1)
    if (!dbUser || dbUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const updates: { product_name?: string; weight_lbs?: string } = {}
    if (body.product_name !== undefined) updates.product_name = String(body.product_name).trim()
    if (body.weight_lbs !== undefined) updates.weight_lbs = String(body.weight_lbs)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const [row] = await db.update(product_weights).set(updates).where(eq(product_weights.id, id)).returning()
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update product weight', detail: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, session.user.id)).limit(1)
    if (!dbUser || dbUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    await db.delete(product_weights).where(eq(product_weights.id, id))
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete product weight', detail: String(e) }, { status: 500 })
  }
}
