import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { global_email_contacts, users } from '@/lib/db/schema'
import { eq, and, ne } from 'drizzle-orm'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const updates: { name?: string; email?: string; company?: string | null; type?: 'CONFIRMATION' | 'BILL_TO' | 'BOTH'; updated_at?: Date } = {}
    if (body.name !== undefined) updates.name = String(body.name).trim()
    if (body.company !== undefined) {
      updates.company = (typeof body.company === 'string' && body.company.trim()) ? body.company.trim() : null
    }
    if (body.email !== undefined) {
      const trimmed = String(body.email).trim().toLowerCase()
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmed)) {
        return NextResponse.json({ error: 'email is not valid' }, { status: 400 })
      }
      // Check uniqueness excluding self
      const [existing] = await db
        .select({ id: global_email_contacts.id })
        .from(global_email_contacts)
        .where(and(eq(global_email_contacts.email, trimmed), ne(global_email_contacts.id, id)))
        .limit(1)
      if (existing) {
        return NextResponse.json({ error: 'A contact with this email already exists' }, { status: 409 })
      }
      updates.email = trimmed
    }
    if (body.type !== undefined) {
      if (!['CONFIRMATION', 'BILL_TO', 'BOTH'].includes(body.type)) {
        return NextResponse.json({ error: 'type must be CONFIRMATION, BILL_TO, or BOTH' }, { status: 400 })
      }
      updates.type = body.type as 'CONFIRMATION' | 'BILL_TO' | 'BOTH'
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.updated_at = new Date()

    const [row] = await db
      .update(global_email_contacts)
      .set(updates)
      .where(eq(global_email_contacts.id, id))
      .returning()

    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update contact', detail: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    await db.delete(global_email_contacts).where(eq(global_email_contacts.id, id))
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete contact', detail: String(e) }, { status: 500 })
  }
}
