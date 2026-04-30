import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { global_email_contacts, users } from '@/lib/db/schema'
import { eq, asc, or } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const type = req.nextUrl.searchParams.get('type')

    let rows
    if (type && ['CONFIRMATION', 'BILL_TO', 'BOTH'].includes(type)) {
      rows = await db
        .select()
        .from(global_email_contacts)
        .where(
          or(
            eq(global_email_contacts.type, type as 'CONFIRMATION' | 'BILL_TO' | 'BOTH'),
            eq(global_email_contacts.type, 'BOTH'),
          )
        )
        .orderBy(asc(global_email_contacts.name))
    } else {
      rows = await db
        .select()
        .from(global_email_contacts)
        .orderBy(asc(global_email_contacts.name))
    }

    return NextResponse.json(rows)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch global email contacts', detail: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, email, company, type } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'email is not valid' }, { status: 400 })
    }
    if (type && !['CONFIRMATION', 'BILL_TO', 'BOTH'].includes(type)) {
      return NextResponse.json({ error: 'type must be CONFIRMATION, BILL_TO, or BOTH' }, { status: 400 })
    }

    const [row] = await db
      .insert(global_email_contacts)
      .values({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: (typeof company === 'string' && company.trim()) ? company.trim() : null,
        type: (type as 'CONFIRMATION' | 'BILL_TO' | 'BOTH') ?? 'BOTH',
      })
      .returning()

    return NextResponse.json(row, { status: 201 })
  } catch (e: unknown) {
    const detail = String(e)
    if (detail.includes('unique') || detail.includes('duplicate') || detail.includes('global_email_contacts_email_unique')) {
      return NextResponse.json({ error: 'A contact with this email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create contact', detail }, { status: 500 })
  }
}
