import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { vendors } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { vendorId } = await params
  const row = await db.query.vendors.findFirst({
    where: eq(vendors.id, vendorId),
  })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { vendorId } = await params
  try {
    const body = await req.json()
    const allowed = [
      'name', 'is_active', 'notes', 'lead_contact', 'dock_info',
      'address', 'contacts', 'po_contacts', 'bol_contacts',
      'checklist_template', 'default_bottle_cost',
      'default_bottle_qty', 'default_mph_freight_bottles',
    ]
    const updateData: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) updateData[key] = body[key]
    }

    const [updated] = await db
      .update(vendors)
      .set(updateData)
      .where(eq(vendors.id, vendorId))
      .returning()
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[PATCH /api/vendors/:id]', message)
    return NextResponse.json({ error: 'Failed to update vendor', detail: message }, { status: 500 })
  }
}