import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { dropdown_configs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')

  if (!type) return NextResponse.json({ error: 'type is required' }, { status: 400 })

  const row = await db.query.dropdown_configs.findFirst({
    where: eq(dropdown_configs.type, type),
  })

  const values: string[] = Array.isArray(row?.values) ? (row!.values as string[]) : []
  return NextResponse.json(values)
}
