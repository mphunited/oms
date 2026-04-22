import { formatDate } from '@/lib/utils/format-date'

export type PoContact = { name: string; email: string; is_primary?: boolean }

export type OrderForPoEmail = {
  order_number: string
  is_blind_shipment: boolean
  customer_name: string | null
  customer_po: string | null
  sales_order_number: string | null
  freight_carrier: string | null
  ship_date: string | null
  ship_to: { name?: string; street?: string; city?: string; state?: string; zip?: string } | null
  po_notes: string | null
  vendor_name: string | null
  vendor_address: { city?: string; state?: string } | null
  vendor_po_contacts: PoContact[]
  split_loads: Array<{
    description: string | null
    part_number: string | null
    qty: string | null
    sell: string | null
    order_number_override: string | null
  }>
}

export function buildPoEmail(
  orders: OrderForPoEmail[],
  greetingName: string
): { subject: string; bodyHtml: string; to: string[]; cc: string[] } {
  const first = orders[0]
  const isBlind = orders.every(o => o.is_blind_shipment)
  const count = orders.length

  // Recipients from first order's vendor
  const contacts = first.vendor_po_contacts ?? []
  const primary = contacts.find(c => c.is_primary) ?? contacts[0] ?? null
  const others = contacts.filter(c => c !== primary)
  const to = primary?.email ? [primary.email] : []
  const cc = [
    ...others.map(c => c.email).filter((e): e is string => Boolean(e)),
    'orders@mphunited.com',
  ]

  // Subject
  const shipFormatted = formatDate(first.ship_date)
  let subject: string
  if (count === 1) {
    subject = isBlind
      ? `MPH United PO ${first.order_number} | Ship ${shipFormatted}`
      : `MPH United PO ${first.order_number} -- ${first.customer_name ?? ''} | Ship ${shipFormatted}`
  } else {
    const nums = orders.map(o => o.order_number).join(', ')
    subject = `${count} MPH United POs ${nums} | Multiple Orders`
  }

  // Intro paragraph
  const vendorName = first.vendor_name ?? ''
  const vendorLoc = [first.vendor_address?.city, first.vendor_address?.state].filter(Boolean).join(', ')
  const orderWord = count === 1 ? '1 order' : `${count} orders`
  let intro: string
  if (isBlind) {
    intro = `Please find ${orderWord} below for MPH United / ${vendorName}${vendorLoc ? ` -- ${vendorLoc}` : ''}.`
  } else {
    const shipToLoc = [first.ship_to?.city, first.ship_to?.state].filter(Boolean).join(', ')
    const customerNames =
      count === 1
        ? (first.customer_name ?? '')
        : [...new Set(orders.map(o => o.customer_name).filter(Boolean))].join(', ')
    intro = `Please find ${orderWord} below for MPH United / ${vendorName}${vendorLoc ? ` -- ${vendorLoc}` : ''}${shipToLoc ? ` -- ${shipToLoc}` : ''} to ${customerNames}.`
  }

  // Table
  const headers = isBlind
    ? ['MPH PO', 'Product/Description', 'Ship Date', 'Qty', 'Unit Price', 'Total']
    : ['MPH PO', 'Customer PO', 'Product/Description', 'Ship Date', 'Qty', 'Unit Price', 'Total']

  const headerRow = `<tr style="background-color:#00205B;color:#ffffff;">${headers
    .map(
      (h, i) =>
        `<th style="padding:8px 10px;text-align:${i === headers.length - 1 ? 'right' : 'left'};font-weight:600;white-space:nowrap;">${h}</th>`
    )
    .join('')}</tr>`

  const dataRows = orders.flatMap(order =>
    order.split_loads.map(load => {
      const mpoPo = load.order_number_override || order.order_number
      const qty = load.qty != null ? parseFloat(load.qty) : null
      const sell = load.sell != null ? parseFloat(load.sell) : null
      const total = qty != null && sell != null ? (qty * sell).toFixed(2) : null
      const partHtml = load.part_number
        ? `<br/><span style="color:#B88A44;font-size:11px;">${load.part_number}</span>`
        : ''
      const desc = `${load.description ?? ''}${partHtml}`
      const cells = isBlind
        ? [
            mpoPo,
            desc,
            formatDate(order.ship_date),
            qty != null ? String(qty) : '--',
            sell != null ? `$${sell.toFixed(2)}` : '--',
            total != null ? `$${total}` : '--',
          ]
        : [
            mpoPo,
            order.customer_po ?? '',
            desc,
            formatDate(order.ship_date),
            qty != null ? String(qty) : '--',
            sell != null ? `$${sell.toFixed(2)}` : '--',
            total != null ? `$${total}` : '--',
          ]
      return `<tr>${cells
        .map(
          (c, i) =>
            `<td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top;${i === cells.length - 1 ? 'text-align:right;' : ''}">${c}</td>`
        )
        .join('')}</tr>`
    })
  )

  // Below-table fields
  const below: string[] = []
  if (!isBlind) {
    if (first.sales_order_number) {
      below.push(
        `<p style="margin:4px 0;font-size:13px;"><strong>Sales Order #:</strong> ${first.sales_order_number}</p>`
      )
    }
    below.push(
      `<p style="margin:4px 0;font-size:13px;"><strong>Ship Via:</strong> ${first.freight_carrier ?? '—'}</p>`
    )
    const addr = first.ship_to
    if (addr) {
      const addrLines = [
        addr.name,
        addr.street,
        [addr.city, addr.state, addr.zip].filter(Boolean).join(', '),
      ]
        .filter(Boolean)
        .join('<br/>')
      below.push(
        `<p style="margin:4px 0;font-size:13px;"><strong>Ship To:</strong><br/>${addrLines}</p>`
      )
    }
    if (first.po_notes) {
      below.push(
        `<p style="margin:4px 0;font-size:13px;"><strong>PO Notes:</strong> ${first.po_notes}</p>`
      )
    }
  } else if (first.po_notes) {
    below.push(
      `<p style="margin:4px 0;font-size:13px;"><strong>PO Notes:</strong> ${first.po_notes}</p>`
    )
  }

  // Closing
  const closing =
    count === 1
      ? 'Please confirm receipt of this PO and provide expected ship date at your earliest convenience. Please reference MPH PO # on all correspondence and shipping documents.'
      : 'Please confirm receipt of these POs and provide expected ship dates at your earliest convenience. Please reference MPH PO # on all correspondence and shipping documents.'

  const bodyHtml = [
    `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;max-width:700px;">`,
    `<p style="margin:0 0 12px;">Hi ${greetingName},</p>`,
    `<p style="margin:0 0 16px;">${intro}</p>`,
    `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">`,
    `<thead>${headerRow}</thead>`,
    `<tbody>${dataRows.join('')}</tbody>`,
    `</table>`,
    below.length ? `<div style="margin-bottom:16px;">${below.join('')}</div>` : '',
    `<p style="margin:0;">${closing}</p>`,
    `<p style="margin:24px 0 0;">Thank you,<br/>MPH United</p>`,
    `</div>`,
  ].join('')

  return { subject, bodyHtml, to, cc }
}
