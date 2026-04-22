"use client"

import { formatDate } from '@/lib/utils/format-date'

// ─── Types ────────────────────────────────────────────────────────────────────

type PoContact = { name: string; email: string; is_primary?: boolean }

type VendorForEmail = {
  name: string
  address: { street?: string; city?: string; state?: string; zip?: string } | null
  po_contacts: PoContact[] | null
}

type CustomerForEmail = {
  name: string
}

type ShipTo = {
  name?: string
  street?: string
  city?: string
  state?: string
  zip?: string
}

type SplitLoad = {
  description: string | null
  part_number: string | null
  qty: string | null
  sell: string | null
  order_number_override: string | null
}

export type OrderWithRelations = {
  order_number: string
  is_blind_shipment: boolean
  customer_po: string | null
  sales_order_number: string | null
  freight_carrier: string | null
  ship_date: string | null
  ship_to: ShipTo | null
  po_notes: string | null
  vendor: VendorForEmail | null
  customer: CustomerForEmail | null
  order_split_loads: SplitLoad[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function td(content: string, align: 'left' | 'right' = 'left'): string {
  return `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;text-align:${align};">${content}</td>`
}

function th(label: string, align: 'left' | 'right' = 'left'): string {
  return `<th style="padding:10px 12px;background-color:#00205B;color:#ffffff;font-weight:600;text-align:${align};white-space:nowrap;">${label}</th>`
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildPoEmail(
  orders: OrderWithRelations[],
  greetingName: string
): { subject: string; bodyHtml: string; to: string[]; cc: string[] } {
  if (orders.length === 0) throw new Error('buildPoEmail: orders array is empty')

  const first = orders[0]
  const isBlind = orders.every(o => o.is_blind_shipment)
  const count = orders.length
  const vendor = first.vendor

  // ── Recipients ───────────────────────────────────────────────────────────────
  const contacts: PoContact[] = (vendor?.po_contacts ?? []) as PoContact[]
  const primary = contacts.find(c => c.is_primary) ?? contacts[0] ?? null
  const others = contacts.filter(c => c !== primary)
  const to: string[] = primary?.email ? [primary.email] : []
  const cc: string[] = [
    ...others.map(c => c.email).filter((e): e is string => Boolean(e)),
    'orders@mphunited.com',
  ]

  // ── Subject ──────────────────────────────────────────────────────────────────
  const shipFormatted = formatDate(first.ship_date)
  let subject: string
  if (count === 1) {
    subject = isBlind
      ? `MPH United PO ${first.order_number} | Ship ${shipFormatted}`
      : `MPH United PO ${first.order_number} -- ${first.customer?.name ?? ''} | Ship ${shipFormatted}`
  } else {
    const nums = orders.map(o => o.order_number).join(', ')
    subject = `${count} MPH United POs ${nums} | Multiple Orders`
  }

  // ── Intro paragraph ──────────────────────────────────────────────────────────
  const vendorName = vendor?.name ?? ''
  const vendorLoc = [vendor?.address?.city, vendor?.address?.state].filter(Boolean).join(', ')
  const orderWord = count === 1 ? '1 order' : `${count} orders`
  let intro: string
  if (isBlind) {
    intro = `Please find ${orderWord} below for MPH United / ${vendorName}${vendorLoc ? ` -- ${vendorLoc}` : ''}.`
  } else {
    const shipToLoc = [first.ship_to?.city, first.ship_to?.state].filter(Boolean).join(', ')
    const customerNames =
      count === 1
        ? (first.customer?.name ?? '')
        : [...new Set(orders.map(o => o.customer?.name).filter(Boolean))].join(', ')
    intro = `Please find ${orderWord} below for MPH United / ${vendorName}${vendorLoc ? ` -- ${vendorLoc}` : ''}${shipToLoc ? ` -- ${shipToLoc}` : ''} to ${customerNames}.`
  }

  // ── Table ────────────────────────────────────────────────────────────────────
  const headers = isBlind
    ? ['MPH PO', 'Product / Description', 'Ship Date', 'Qty', 'Unit Price', 'Total']
    : ['MPH PO', 'Customer PO', 'Product / Description', 'Ship Date', 'Qty', 'Unit Price', 'Total']

  const lastIdx = headers.length - 1
  const headerRow = `<tr>${headers.map((h, i) => th(h, i === lastIdx ? 'right' : 'left')).join('')}</tr>`

  const dataRows = orders.flatMap(order =>
    order.order_split_loads.map(load => {
      const mpoPo = load.order_number_override || order.order_number
      const qty = load.qty != null ? parseFloat(load.qty) : null
      const sell = load.sell != null ? parseFloat(load.sell) : null
      const total = qty != null && sell != null ? fmtCurrency(qty * sell) : '--'
      const pnLine = load.part_number
        ? `<br/><span style="color:#B88A44;font-size:12px;">P/N: ${load.part_number}</span>`
        : ''
      const desc = `${load.description ?? ''}${pnLine}`
      const cells = isBlind
        ? [
            td(mpoPo),
            td(desc),
            td(formatDate(order.ship_date)),
            td(qty != null ? String(qty) : '--', 'right'),
            td(sell != null ? fmtCurrency(sell) : '--', 'right'),
            td(total, 'right'),
          ]
        : [
            td(mpoPo),
            td(order.customer_po ?? ''),
            td(desc),
            td(formatDate(order.ship_date)),
            td(qty != null ? String(qty) : '--', 'right'),
            td(sell != null ? fmtCurrency(sell) : '--', 'right'),
            td(total, 'right'),
          ]
      return `<tr>${cells.join('')}</tr>`
    })
  )

  // ── Below-table ──────────────────────────────────────────────────────────────
  const below: string[] = []

  if (!isBlind) {
    const salesNums = orders.map(o => o.sales_order_number).filter(Boolean)
    if (salesNums.length > 0) {
      below.push(`<p style="margin:6px 0;font-size:13px;"><strong>Sales Order #:</strong> ${salesNums.join(', ')}</p>`)
    }

    const carriers = [...new Set(orders.map(o => o.freight_carrier).filter(Boolean))]
    below.push(`<p style="margin:6px 0;font-size:13px;"><strong>Ship Via:</strong> ${carriers.length > 0 ? carriers.join(', ') : '—'}</p>`)

    const addr = first.ship_to
    if (addr) {
      const addrLines = [
        addr.name,
        addr.street,
        [addr.city, addr.state, addr.zip].filter(Boolean).join(', '),
      ]
        .filter(Boolean)
        .join('<br/>')
      below.push(`<p style="margin:6px 0;font-size:13px;"><strong>Ship To:</strong><br/>${addrLines}</p>`)
    }

    const notesOrders = orders.filter(o => o.po_notes)
    if (notesOrders.length === 1) {
      below.push(`<p style="margin:6px 0;font-size:13px;"><strong>PO Notes:</strong> ${notesOrders[0].po_notes}</p>`)
    } else if (notesOrders.length > 1) {
      below.push(
        notesOrders
          .map(o => `<p style="margin:6px 0;font-size:13px;"><strong>PO Notes (${o.order_number}):</strong> ${o.po_notes}</p>`)
          .join('')
      )
    }
  } else {
    const notesOrders = orders.filter(o => o.po_notes)
    if (notesOrders.length === 1) {
      below.push(`<p style="margin:6px 0;font-size:13px;"><strong>PO Notes:</strong> ${notesOrders[0].po_notes}</p>`)
    } else if (notesOrders.length > 1) {
      below.push(
        notesOrders
          .map(o => `<p style="margin:6px 0;font-size:13px;"><strong>PO Notes (${o.order_number}):</strong> ${o.po_notes}</p>`)
          .join('')
      )
    }
  }

  // ── Closing ──────────────────────────────────────────────────────────────────
  const closing =
    count === 1
      ? 'Please confirm receipt of this PO and provide expected ship date at your earliest convenience. Please reference MPH PO # on all correspondence and shipping documents.'
      : 'Please confirm receipt of these POs and provide expected ship dates at your earliest convenience. Please reference MPH PO # on all correspondence and shipping documents.'

  // ── Assemble ─────────────────────────────────────────────────────────────────
  const bodyHtml = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;max-width:760px;line-height:1.5;">
  <p style="margin:0 0 16px;">Hello ${greetingName},</p>
  <p style="margin:0 0 20px;">${intro}</p>
  <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#374151;">PRODUCTS ORDERED</p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
    <thead>${headerRow}</thead>
    <tbody>${dataRows.join('')}</tbody>
  </table>
  ${below.length ? `<div style="margin-bottom:20px;">${below.join('')}</div>` : ''}
  <p style="margin:0 0 24px;">${closing}</p>
</div>`

  return { subject, bodyHtml, to, cc }
}
