import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_split_loads } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

export async function POST(req: Request) {
  const body = await req.json()
  const { split_loads, ...orderFields } = body

  // Generate next order number by finding the current max and incrementing
  const rows = await db.execute(
    sql`SELECT MAX(order_number) as max FROM orders`
  ) as unknown as [{ max: string | null }]
  const { max } = rows[0]

  const nextNum = max ? parseInt(max, 10) + 1 : 1000
  const order_number = String(nextNum)

  const result = await db.transaction(async (tx) => {
    const [newOrder] = await tx
      .insert(orders)
      .values({ ...orderFields, order_number })
      .returning()

    if (split_loads?.length) {
      await tx.insert(order_split_loads).values(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        split_loads.map((load: any) => ({ ...load, order_id: newOrder.id }))
      )
    }

    return newOrder
  })

  return NextResponse.json(result, { status: 201 })
}
