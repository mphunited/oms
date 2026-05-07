'use client'

import { formatDate } from '@/lib/utils/format-date'

type PoContact = { name: string; email: string; role?: 'to' | 'cc'; is_primary?: boolean }

function isToRecipient(c: PoContact): boolean {
  if (c.role === 'to' || c.role === 'cc') return c.role === 'to'
  return c.is_primary === true
}

type VendorForEmail = {
  name: string
  address: { city?: string; state?: string } | null
  po_contacts: PoContact[] | null
}

export type MultiShipToOrderForEmail = {
  order_number: string
  customer_name: string | null
  customer_po: string | null
  ship_date: string | null
  ship_to: { city?: string; state?: string } | null
  po_notes: string | null
  split_loads: Array<{
  description: string | null
  part_number: string | null
  qty: string | null
  buy: string | null
  sell: string | null
  order_number_override: string | null
}>
}

function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function fmtUnitPrice(n: number): string {
  const s = n.toFixed(3)
  return `$${s.endsWith('0') ? n.toFixed(2) : s}`
}

function td(content: string, align: 'left' | 'right' = 'left'): string {
  return `<td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top;text-align:${align};">${content}</td>`
}

function th(label: string, align: 'left' | 'right' = 'left'): string {
  return `<th style="padding:9px 10px;background-color:#00205B;color:#ffffff;font-weight:600;text-align:${align};white-space:nowrap;">${label}</th>`
}

export function buildMultiShipToEmail(
  groupPoNumber: string,
  vendor: VendorForEmail,
  orders: MultiShipToOrderForEmail[],
): { subject: string; bodyHtml: string; to: string[]; cc: string[] } {
  if (orders.length === 0) throw new Error('buildMultiShipToEmail: orders array is empty')

  const contacts = (vendor.po_contacts ?? []) as PoContact[]
  const primary = contacts.find(c => isToRecipient(c)) ?? contacts[0] ?? null
  const others = contacts.filter(c => c !== primary)
  const to = primary?.email ? [primary.email] : []
  const cc = [
    ...others.map(c => c.email).filter((e): e is string => Boolean(e) && e.toLowerCase() !== 'orders@mphunited.com'),
    'orders@mphunited.com',
  ]

  const first = orders[0]
  const shipFormatted = formatDate(first.ship_date)
  const subject = `MPH United PO ${groupPoNumber} -- Multi Ship-To | Ship ${shipFormatted}`

  const vendorLoc = [vendor.address?.city, vendor.address?.state].filter(Boolean).join(', ')
  const drops = orders
    .map(o => {
      const loc = [o.ship_to?.city, o.ship_to?.state].filter(Boolean).join(', ')
      return `${o.customer_name ?? 'Unknown'}${loc ? ` - ${loc}` : ''}`
    })
    .join(', ')
  const intro = `Please find the Multi Ship-To PO below for ${vendor.name}${vendorLoc ? ` -- ${vendorLoc}` : ''} to ${drops}.`

  const headerRow = `<tr>
    ${th('Split Load')}${th('Customer PO')}${th('Description')}${th('Qty', 'right')}${th('Unit Price', 'right')}${th('Total', 'right')}
  </tr>`

  const dataRows = orders.flatMap((order, dropIndex) => {
    const splitLabel = `SPLIT LOAD ${dropIndex + 1}`
    return order.split_loads.map((load, loadIndex) => {
      const qty = load.qty != null ? parseFloat(load.qty) : null
      const price = load.buy != null ? parseFloat(load.buy) : null
      const total = qty != null && price != null ? fmtCurrency(qty * price) : '--'
      const pnLine = load.part_number
        ? `<br/><span style="color:#B88A44;font-size:11pt;">P/N: ${load.part_number}</span>`
        : ''
      const desc = `${load.description ?? ''}${pnLine}`
      return `<tr>
        ${td(loadIndex === 0 ? `<strong>${splitLabel}</strong>` : '')}
        ${td(loadIndex === 0 ? (order.customer_po ?? '') : '')}
        ${td(desc)}
        ${td(qty != null ? String(qty) : '--', 'right')}
        ${td(price != null ? fmtUnitPrice(price) : '--', 'right')}
        ${td(total, 'right')}
      </tr>`
    })
  })

  let grandTotal = 0
  for (const order of orders) {
    for (const load of order.split_loads) {
      const q = load.qty ? parseFloat(load.qty) : null
      const s = load.buy ? parseFloat(load.buy) : null
      if (q != null && s != null) grandTotal += q * s
    }
  }

  const notesHtml = orders
    .map((o, i) => o.po_notes?.trim()
      ? `<p style="margin:6px 0;font-size:12pt;"><strong>Split Load ${i + 1} PO Notes:</strong> ${o.po_notes}</p>`
      : ''
    )
    .filter(Boolean)
    .join('')

  const bodyHtml = `<div style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;color:#1f2937;max-width:800px;line-height:1.5;">
  <p style="margin:0 0 16px;">Hello ${vendor.name},</p>
  <p style="margin:0 0 8px;">${intro}</p>
  <p style="margin:0 0 4px;font-size:11pt;"><strong>MPH PO #: ${groupPoNumber}</strong></p>
  <p style="margin:0 0 20px;font-size:12pt;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#374151;">PRODUCTS ORDERED</p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11pt;">
    <thead>${headerRow}</thead>
    <tbody>${dataRows.join('')}</tbody>
  </table>
  <p style="margin:0 0 8px;font-size:12pt;"><strong>ORDER TOTAL: ${fmtCurrency(grandTotal)}</strong></p>
  ${notesHtml ? `<div style="margin-bottom:16px;">${notesHtml}</div>` : ''}
  <p style="margin:0 0 24px;">Please confirm receipt of this PO and provide the expected ship date at your earliest convenience. Please reference MPH PO # on all correspondence and shipping documents.</p>
</div>`

  return { subject, bodyHtml, to, cc }
}
