import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { dropdown_configs, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')

  if (!type) return NextResponse.json({ error: 'type is required' }, { status: 400 })

  const row = await db.query.dropdown_configs.findFirst({
    where: eq(dropdown_configs.type, type),
  })

  const values: string[] = Array.isArray(row?.values) ? (row!.values as string[]) : []
  const meta = (row?.meta ?? null) as Record<string, { color: string }> | null
  return NextResponse.json({ type, values, meta })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!dbUser || dbUser.role !== 'ADMIN') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body.type !== 'string' || !Array.isArray(body.values)) {
    return NextResponse.json({ error: 'type (string) and values (array) are required' }, { status: 400 })
  }

  const { type, values, meta } = body as { type: string; values: string[]; meta?: Record<string, { color: string }> }
  const sortedValues = [...values].sort((a, b) => a.localeCompare(b))

  // Fetch existing meta so we only overwrite when meta is explicitly provided
  const existing = await db.query.dropdown_configs.findFirst({
    where: eq(dropdown_configs.type, type),
  })
  const existingMeta = (existing?.meta ?? null) as Record<string, { color: string }> | null
  const updatedMeta = meta !== undefined ? meta : existingMeta

  await db
    .insert(dropdown_configs)
    .values({ type, values: sortedValues as unknown as string[], meta: updatedMeta as unknown as Record<string, { color: string }> })
    .onConflictDoUpdate({
      target: dropdown_configs.type,
      set: {
        values: sortedValues as unknown as string[],
        meta: updatedMeta as unknown as Record<string, { color: string }>,
        updated_at: new Date(),
      },
    })

  return NextResponse.json({ ok: true })
}
