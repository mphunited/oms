import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { vendors } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const rows = await db
    .select({ id: vendors.id, name: vendors.name })
    .from(vendors)
    .where(eq(vendors.is_active, true))
    .orderBy(vendors.name)
  return NextResponse.json(rows)
}
