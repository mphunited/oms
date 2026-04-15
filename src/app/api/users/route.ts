import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const rows = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.is_active, true))
    .orderBy(users.name)
  return NextResponse.json(rows)
}
