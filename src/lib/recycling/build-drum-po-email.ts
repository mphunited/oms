import { formatDate } from '@/lib/utils/format-date'
import { stripMphPrefix } from '@/lib/utils/strip-mph-prefix'

type ShipFrom = { name: string; street: string; city: string; state: string; zip: string }

export type DrumOrderForEmail = {
  order_number: string
  customer_po: string | null
  description: string | null
  pick_up_date: string | null
  qty: string | null
  buy: string | null
  freight_carrier: string | null
  ship_from: ShipFrom | null
}

export type VendorForDrumEmail = {
  name: string
}

function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function td(content: string, align: 'left' | 'right' = 'left'): string {
  return `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;text-align:${align};">${content}</td>`
}

function th(label: string, align: 'left' | 'right' = 'left'): string {
  return `<th style="padding:10px 12px;background-color:#00205B;color:#ffffff;font-weight:600;text-align:${align};white-space:nowrap;">${label}</th>`
}

export function buildDrumPoEmail(
  order: DrumOrderForEmail,
  vendor: VendorForDrumEmail
): { bodyHtml: string } {
  const vendorGreeting = stripMphPrefix(vendor.name)
  const qty = order.qty != null ? parseFloat(order.qty) : null
  const buy = order.buy != null ? parseFloat(order.buy) : null
  const total = qty != null && buy != null ? fmtCurrency(qty * buy) : '--'

  const headers = ['MPH PO', 'CUSTOMER PO', 'PRODUCT / DESCRIPTION', 'SHIP DATE', 'QTY', 'UNIT PRICE', 'TOTAL']
  const lastIdx = headers.length - 1
  const headerRow = `<tr>${headers.map((h, i) => th(h, i === lastIdx ? 'right' : 'left')).join('')}</tr>`

  const dataRow = `<tr>
    ${td(order.order_number)}
    ${td(order.customer_po ?? '')}
    ${td(order.description ?? '')}
    ${td(formatDate(order.pick_up_date))}
    ${td(qty != null ? String(qty) : '--', 'right')}
    ${td(buy != null ? fmtCurrency(buy) : '--', 'right')}
    ${td(total, 'right')}
  </tr>`

  const totalRow = `<tr>
    <td colspan="6" style="padding:8px 12px;text-align:right;font-weight:700;border-top:2px solid #00205B;">ORDER TOTAL</td>
    ${td(total, 'right')}
  </tr>`

  const sections: string[] = []
  sections.push(
    `<p style="margin:6px 0;font-size:12pt;"><strong>Ship Via</strong>&nbsp;&nbsp;&nbsp;${order.freight_carrier || '--'}</p>`
  )

  const sf = order.ship_from
  if (sf && (sf.name || sf.street)) {
    const cityLine = [sf.city, [sf.state, sf.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    const addrLines = [sf.name, sf.street, cityLine].filter(Boolean).join('<br/>')
    sections.push(
      `<p style="margin:12px 0 4px;font-size:12pt;"><strong>Ship From:</strong></p>` +
      `<p style="margin:0 0 6px;font-size:12pt;">${addrLines}</p>`
    )
  }

  const bodyHtml =
    `<div style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;color:#1f2937;max-width:760px;line-height:1.5;">` +
    `<p style="margin:0 0 16px;">Hello ${vendorGreeting},</p>` +
    `<p style="margin:0 0 20px;">Please find orders below for ${vendor.name}.</p>` +
    `<p style="margin:0 0 8px;font-size:12pt;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#374151;">PRODUCTS ORDERED</p>` +
    `<table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12pt;">` +
    `<thead>${headerRow}</thead>` +
    `<tbody>${dataRow}${totalRow}</tbody>` +
    `</table>` +
    `<div style="margin-bottom:20px;">${sections.join('')}</div>` +
    `<p style="margin:0 0 12px;">Please confirm receipt of this PO. Please reference PO # ${order.order_number} on all correspondence and shipping documents.</p>` +
    `<p style="margin:0 0 12px;">BOL is attached to this email.</p>` +
    `<p style="margin:0 0 24px;">The carrier will contact you to arrange freight.</p>` +
    `</div>`

  return { bodyHtml }
}
