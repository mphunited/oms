import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, users, vendors, customers, type NewOrderSplitLoad } from '@/lib/db/schema'
import { eq, sql, desc, and, or, ilike, inArray, notInArray, gte, lte, count } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { createClient } from '@/lib/supabase/server'
import { deriveLoadCommissionStatus, deriveOrderCommissionStatus, deriveInitials } from '@/lib/orders/commission-eligibility'

function parseList(param: string | null): string[] {
  if (!param) return []
  return param.split(',').map(s => s.trim()).filter(Boolean)
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [dbUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    const { searchParams } = new URL(req.url)

    const search          = searchParams.get('search')?.trim() || null
    const lifecycle       = searchParams.get('lifecycle') || 'all'
    const flagParam       = searchParams.get('flag')
    const shipDateFrom    = searchParams.get('ship_date_from')
    const shipDateTo      = searchParams.get('ship_date_to')
    const page            = Math.max(1, parseInt(searchParams.get('page')  || '1',  10))
    const limit           = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    const statusList             = parseList(searchParams.get('status'))
    const customerIds            = parseList(searchParams.get('customer_id'))
    const vendorIds              = parseList(searchParams.get('vendor_id'))
    const salespersonIds         = parseList(searchParams.get('salesperson_id'))
    const csrIds                 = parseList(searchParams.get('csr_id'))
    const invoicePaymentStatuses = parseList(searchParams.get('invoice_payment_status'))
    const commissionStatuses     = parseList(searchParams.get('commission_status'))

    const csrUser  = alias(users, 'csr_user')
    const csr2User = alias(users, 'csr2_user')

    const conditions = []

    // SALES users may only see their own orders — not overridable by query params
    if (dbUser?.role === 'SALES') {
      conditions.push(eq(orders.salesperson_id, dbUser.id))
    }

    if (search) {
      const descSubquery = db
        .select({ id: order_split_loads.order_id })
        .from(order_split_loads)
        .where(or(
          ilike(order_split_loads.description, `%${search}%`),
          ilike(order_split_loads.order_number_override, `%${search}%`),
        ))

      conditions.push(or(
        ilike(orders.order_number,  `%${search}%`),
        ilike(orders.customer_po,   `%${search}%`),
        ilike(customers.name,       `%${search}%`),
        ilike(vendors.name,         `%${search}%`),
        inArray(orders.id, descSubquery),
      ))
    }

    if (statusList.length > 0)             conditions.push(inArray(orders.status, statusList))
    if (customerIds.length > 0)            conditions.push(inArray(orders.customer_id, customerIds))
    if (vendorIds.length > 0)              conditions.push(inArray(orders.vendor_id, vendorIds))
    if (salespersonIds.length > 0)         conditions.push(inArray(orders.salesperson_id, salespersonIds))
    if (csrIds.length > 0)                 conditions.push(inArray(orders.csr_id, csrIds))
    if (invoicePaymentStatuses.length > 0) conditions.push(inArray(orders.invoice_payment_status, invoicePaymentStatuses))
    if (commissionStatuses.length > 0)     conditions.push(inArray(orders.commission_status, commissionStatuses))

    if (lifecycle === 'active') {
      conditions.push(notInArray(orders.status, ['Complete', 'Cancelled']))
    } else if (lifecycle === 'complete') {
      conditions.push(eq(orders.status, 'Complete'))
    } else if (lifecycle === 'cancelled') {
      conditions.push(eq(orders.status, 'Cancelled'))
    }

    if (shipDateFrom) conditions.push(gte(orders.ship_date, shipDateFrom))
    if (shipDateTo)   conditions.push(lte(orders.ship_date, shipDateTo))
    if (flagParam === 'true') conditions.push(eq(orders.flag, true))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const baseQuery = () =>
      db.select({ count: count() })
        .from(orders)
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .leftJoin(vendors,   eq(orders.vendor_id,   vendors.id))
        .leftJoin(users,     eq(orders.salesperson_id, users.id))
        .leftJoin(csrUser,   eq(orders.csr_id, csrUser.id))
        .where(where)

    const [{ count: total }] = await baseQuery()

    const rows = await db
      .select({
        id:                     orders.id,
        order_number:           orders.order_number,
        order_date:             orders.order_date,
        order_type:             orders.order_type,
        status:                 orders.status,
        customer_po:            orders.customer_po,
        freight_carrier:        orders.freight_carrier,
        ship_date:              orders.ship_date,
        wanted_date:            orders.wanted_date,
        freight_cost:           orders.freight_cost,
        freight_to_customer:    orders.freight_to_customer,
        additional_costs:       orders.additional_costs,
        flag:                   orders.flag,
        invoice_payment_status: orders.invoice_payment_status,
        commission_status:      orders.commission_status,
        ship_to:                orders.ship_to,
        customer_name:          customers.name,
        vendor_name:            vendors.name,
        salesperson_name:       users.name,
        csr_name:               csrUser.name,
        csr2_name:              csr2User.name,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customer_id, customers.id))
      .leftJoin(vendors,   eq(orders.vendor_id,   vendors.id))
      .leftJoin(users,     eq(orders.salesperson_id, users.id))
      .leftJoin(csrUser,   eq(orders.csr_id, csrUser.id))
      .leftJoin(csr2User,  eq(orders.csr2_id, csr2User.id))
      .where(where)
      .orderBy(desc(orders.created_at))
      .limit(limit)
      .offset((page - 1) * limit)

    const orderIds = rows.map(r => r.id)

    type SplitLoadRow = {
      order_id: string
      id: string
      description: string | null
      qty: string | null
      buy: string | null
      sell: string | null
      order_number_override: string | null
      customer_po: string | null
      order_type: string | null
      ship_date: string | null
      wanted_date: string | null
    }

    const splitMap: Record<string, SplitLoadRow[]> = {}

    if (orderIds.length > 0) {
      const loads = await db
        .select({
          order_id:              order_split_loads.order_id,
          id:                    order_split_loads.id,
          description:           order_split_loads.description,
          qty:                   order_split_loads.qty,
          buy:                   order_split_loads.buy,
          sell:                  order_split_loads.sell,
          order_number_override: order_split_loads.order_number_override,
          customer_po:           order_split_loads.customer_po,
          order_type:            order_split_loads.order_type,
          ship_date:             order_split_loads.ship_date,
          wanted_date:           order_split_loads.wanted_date,
        })
        .from(order_split_loads)
        .where(inArray(order_split_loads.order_id, orderIds))

      for (const load of loads) {
        if (!splitMap[load.order_id]) splitMap[load.order_id] = []
        splitMap[load.order_id].push(load)
      }
    }

    const result = rows.map(row => ({
      ...row,
      split_loads: splitMap[row.id] ?? [],
    }))

    return NextResponse.json({
      orders: result,
      total:  Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/orders]', message)
    return NextResponse.json({ error: 'Failed to fetch orders', detail: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) })
    const initials = deriveInitials(user?.name)

    const body = await req.json()
    const { split_loads, manual_order_number, ...orderFields } = body

    for (const key of ['order_date', 'ship_date', 'wanted_date', 'appointment_time']) {
      if (orderFields[key] === '') orderFields[key] = null
    }

    let order_number: string
    let checklist: unknown = null

    if (manual_order_number) {
      if (user?.role !== 'ADMIN' && user?.role !== 'CSR') {
        return new NextResponse('Forbidden', { status: 403 })
      }
      const trimmed = String(manual_order_number).trim()
      if (!trimmed || /\s/.test(trimmed)) {
        return NextResponse.json({ error: 'Invalid order number' }, { status: 400 })
      }
      order_number = trimmed
      // Historical import: skip checklist population
    } else {
      const seqResult = await db.execute(sql`SELECT nextval('order_number_seq') AS num`)
      const num = (seqResult as unknown as Array<{ num: string | number }>)[0].num
      order_number = `${initials}-MPH${num}`

      if (orderFields.vendor_id) {
        const vendor = await db.query.vendors.findFirst({
          where: eq(vendors.id, orderFields.vendor_id),
        })
        checklist = vendor?.checklist_template ?? null
      }
    }

    const result = await db.transaction(async (tx) => {
      // Insert order without commission_status first
      const [newOrder] = await tx
        .insert(orders)
        .values({ ...orderFields, order_number, checklist })
        .returning({ id: orders.id, order_number: orders.order_number })

      let orderCommissionStatus = 'Not Eligible'

      if (split_loads?.length) {
        const loadValues: Record<string, unknown>[] = split_loads.map((load: Record<string, unknown>) => ({
          ...load,
          order_id: newOrder.id,
          commission_status: deriveLoadCommissionStatus(load.order_type as string),
        }))

        // For loads with separate_po = true, consume nextval and set order_number_override
        for (const lv of loadValues) {
          if (lv.separate_po) {
            const seqRes = await tx.execute(sql`SELECT nextval('order_number_seq') AS num`)
            const num = (seqRes as unknown as Array<{ num: string | number }>)[0].num
            lv.order_number_override = `${initials}-MPH${num}`
          }
          delete lv.separate_po
          delete lv.preview_po
        }

        await tx.insert(order_split_loads).values(loadValues as NewOrderSplitLoad[])

        orderCommissionStatus = deriveOrderCommissionStatus(
          loadValues.map(l => ({
            commission_status: l.commission_status as string,
            commission_paid_date: null,
          }))
        )
      }

      await tx.update(orders)
        .set({ commission_status: orderCommissionStatus })
        .where(eq(orders.id, newOrder.id))

      return newOrder
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/orders]', message)
    if (message.includes('23505') || (message.includes('unique') && message.includes('order_number'))) {
      return NextResponse.json({ error: 'PO number already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create order', detail: message }, { status: 500 })
  }
}
