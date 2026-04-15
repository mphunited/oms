import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const rows = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(eq(customers.is_active, true))
    .orderBy(customers.name)
  return NextResponse.json(rows)
}
