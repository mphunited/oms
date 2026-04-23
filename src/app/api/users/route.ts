import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const permission = searchParams.get('permission')

  const commissionEligible = searchParams.get('commission_eligible')

  const conditions = [eq(users.is_active, true)]
  if (permission) {
    conditions.push(
      sql`${users.permissions} @> ${JSON.stringify([permission])}::jsonb`
    )
  }
  if (commissionEligible === 'true') {
    conditions.push(eq(users.is_commission_eligible, true))
  }

  const rows = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(...conditions))
    .orderBy(users.name)

  return NextResponse.json(rows)
}
