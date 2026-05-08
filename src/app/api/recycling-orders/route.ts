import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recycling_orders, users, vendors, customers } from '@/lib/db/schema'
import { eq, and, or, ilike, inArray, notInArray, gte, lte, asc, count, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { createClient } from '@/lib/supabase/server'
import { deriveInitials } from '@/lib/orders/commission-eligibility'

function parseList(p: string | null): string[] {
  if (!p) return []
  return p.split(',').map(s => s.trim()).filter(Boolean)
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    if (!type) return NextResponse.json({ error: 'type param required' }, { status: 400 })

    const search     = searchParams.get('search') ?? ''
    const status     = parseList(searchParams.get('status'))
    const lifecycle  = searchParams.get('lifecycle') ?? 'Active'
    const customerIds = parseList(searchParams.get('customerId'))
    const vendorIds  = parseList(searchParams.get('vendorId'))
    const csrIds     = parseList(searchParams.get('csrId'))
    const spIds      = parseList(searchParams.get('salespersonId'))
    const dateFrom   = searchParams.get('dateFrom')
    const dateTo     = searchParams.get('dateTo')
    const flag       = searchParams.get('flag')
    const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit      = parseInt(searchParams.get('limit') ?? '50')
    const offset     = (page - 1) * limit

    const salesUser = alias(users, 'sales_user')
    const csrAlias  = alias(users, 'csr_alias')

    const conditions = [eq(recycling_orders.recycling_type, type)]

    // SALES: enforce own orders unconditionally
    if (dbUser.role === 'SALES') {
      conditions.push(eq(recycling_orders.salesperson_id, dbUser.id))
    } else if (spIds.length > 0) {
      conditions.push(inArray(recycling_orders.salesperson_id, spIds))
    }

    // Lifecycle
    if (lifecycle === 'Active') {
      conditions.push(notInArray(recycling_orders.status, ['Complete', 'Canceled']))
    } else if (lifecycle === 'Complete') {
      conditions.push(eq(recycling_orders.status, 'Complete'))
    }

    if (status.length > 0) conditions.push(inArray(recycling_orders.status, status))
    if (customerIds.length > 0) conditions.push(inArray(recycling_orders.customer_id, customerIds))
    if (vendorIds.length > 0) {
      conditions.push(inArray(recycling_orders.vendor_id, vendorIds))
    }
    if (csrIds.length > 0) conditions.push(inArray(recycling_orders.csr_id, csrIds))
    if (dateFrom) conditions.push(gte(recycling_orders.pick_up_date, dateFrom))
    if (dateTo)   conditions.push(lte(recycling_orders.pick_up_date, dateTo))
    if (flag === 'true') conditions.push(eq(recycling_orders.flag, true))

    if (search) {
      conditions.push(
        or(
          ilike(recycling_orders.order_number, `%${search}%`),
          ilike(recycling_orders.customer_po, `%${search}%`),
          ilike(recycling_orders.description, `%${search}%`),
          ilike(customers.name, `%${search}%`),
          ilike(vendors.name, `%${search}%`),
        )!
      )
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions)

    const rows = await db
      .select({
        id:                    recycling_orders.id,
        order_number:          recycling_orders.order_number,
        order_date:            recycling_orders.order_date,
        recycling_type:        recycling_orders.recycling_type,
        status:                recycling_orders.status,
        customer_id:           recycling_orders.customer_id,
        customer_name:         customers.name,
        vendor_id:             recycling_orders.vendor_id,
        vendor_name:           vendors.name,
        salesperson_id:        recycling_orders.salesperson_id,
        salesperson_name:      salesUser.name,
        csr_id:                recycling_orders.csr_id,
        csr_name:              csrAlias.name,
        customer_po:           recycling_orders.customer_po,
        description:           recycling_orders.description,
        part_number:           recycling_orders.part_number,
        qty:                   recycling_orders.qty,
        buy:                   recycling_orders.buy,
        sell:                  recycling_orders.sell,
        pick_up_date:          recycling_orders.pick_up_date,
        delivery_date:         recycling_orders.delivery_date,
        freight_carrier:       recycling_orders.freight_carrier,
        freight_credit_amount: recycling_orders.freight_credit_amount,
        ship_from:             recycling_orders.ship_from,
        ship_to:               recycling_orders.ship_to,
        invoice_status:        recycling_orders.invoice_status,
        invoice_payment_status: recycling_orders.invoice_payment_status,
        bol_number:            recycling_orders.bol_number,
        flag:                  recycling_orders.flag,
        is_blind_shipment:     recycling_orders.is_blind_shipment,
        created_at:            recycling_orders.created_at,
        updated_at:            recycling_orders.updated_at,
      })
      .from(recycling_orders)
      .leftJoin(customers, eq(recycling_orders.customer_id, customers.id))
      .leftJoin(vendors,   eq(recycling_orders.vendor_id,   vendors.id))
      .leftJoin(salesUser, eq(recycling_orders.salesperson_id, salesUser.id))
      .leftJoin(csrAlias,  eq(recycling_orders.csr_id,        csrAlias.id))
      .where(where)
      .orderBy(asc(sql`${recycling_orders.pick_up_date} NULLS LAST`))
      .limit(limit)
      .offset(offset)

    const [{ total }] = await db
      .select({ total: count() })
      .from(recycling_orders)
      .leftJoin(customers, eq(recycling_orders.customer_id, customers.id))
      .leftJoin(vendors,   eq(recycling_orders.vendor_id,   vendors.id))
      .where(where)

    return NextResponse.json({ data: rows, total, page, limit })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/recycling-orders]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db
      .select({ id: users.id, role: users.role, name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 403 })
    if (dbUser.role === 'SALES') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()

    const initials = deriveInitials(dbUser.name)
    const [{ nextval }] = await db.execute(sql`SELECT nextval('order_number_seq') AS nextval`)
    const order_number = `${initials}-MPH${nextval}`

    const [created] = await db.insert(recycling_orders).values({
      order_number,
      recycling_type: body.recycling_type ?? 'IBC',
      order_date:     body.order_date   ?? null,
      status:         body.status       ?? 'Acknowledged Order',
      customer_id:    body.customer_id,
      vendor_id:      body.vendor_id    ?? null,
      salesperson_id: body.salesperson_id ?? null,
      csr_id:         body.csr_id       ?? null,
      customer_po:    body.customer_po  ?? null,
      description:    body.description  ?? null,
      part_number:    body.part_number  ?? null,
      qty:            body.qty          ?? null,
      buy:            body.buy          ?? null,
      sell:           body.sell         ?? null,
      pick_up_date:   body.pick_up_date ?? null,
      delivery_date:  body.delivery_date ?? null,
      appointment_notes: body.appointment_notes ?? null,
      freight_carrier:   body.freight_carrier   ?? null,
      freight_credit_amount: body.freight_credit_amount ?? null,
      ship_to:        body.ship_to      ?? null,
      ship_from:      body.ship_from    ?? null,
      bill_to:        body.bill_to      ?? null,
      customer_contacts: body.customer_contacts ?? null,
      invoice_status:    body.invoice_status    ?? 'No Charge',
      invoice_customer_amount: body.invoice_customer_amount ?? null,
      invoice_payment_status:  body.invoice_payment_status  ?? 'Not Invoiced',
      po_contacts:    body.po_contacts  ?? null,
      po_notes:       body.po_notes     ?? null,
      misc_notes:     body.misc_notes   ?? null,
      bol_number:     body.bol_number   ?? null,
      is_blind_shipment: body.is_blind_shipment ?? false,
    }).returning()

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/recycling-orders]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
