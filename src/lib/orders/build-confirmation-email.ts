// src/lib/orders/build-confirmation-email.ts
// Pure function — no imports from Next.js, no fetches, no side effects.

export type ConfirmationLoad = {
  order_number_override: string | null
  customer_po: string | null
  description: string | null
  qty: string | null
  sell: string | null
  ship_date: string | null
}

export type ConfirmationOrder = {
  id: string
  order_number: string
  customer_name: string
  customer_po: string | null
  freight_carrier: string | null
  wanted_date: string | null
  ship_to: {
    name?: string
    street?: string
    street2?: string
    city?: string
    state?: string
    zip?: string
  } | null
  payment_terms: string | null
  vendor_name: string | null
  vendor_address: {
    street?: string
    city?: string
    state?: string
    zip?: string
  } | null
  vendor_dock_info: string | null
  split_loads: ConfirmationLoad[]
  customer_contacts: Array<{ name?: string; email?: string; is_primary?: boolean }> | null
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isCpu(carrier: string | null): boolean {
  return !!carrier && carrier.toLowerCase().includes('cpu')
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

function firstNames(contacts: Array<{ name?: string }>): string {
  const names = contacts
    .map(c => (c.name ?? '').trim().split(' ')[0])
    .filter(Boolean)
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return names.join(', ')
}

function buildTable(loads: ConfirmationLoad[], orderNumber: string, orderCustomerPo: string | null): string {
  const rows = loads.map(l => {
    const mphPo = escapeHtml(l.order_number_override ?? orderNumber)
    const custPo = escapeHtml(l.customer_po ?? orderCustomerPo ?? '—')
    const desc = escapeHtml(l.description ?? '—')
    const qty = escapeHtml(l.qty ?? '—')
    const price = l.sell ? `$${Number(l.sell).toFixed(2)}` : '—'
    const shipDate = formatDate(l.ship_date)
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:14px;">${mphPo}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:14px;">${custPo}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:14px;">${desc}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:14px;text-align:right;">${qty}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:14px;text-align:right;">${price}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:14px;">${shipDate}</td>
      </tr>`
  }).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="background-color:#00205B;">
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;">MPH PO</th>
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;">Customer PO</th>
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;">Description</th>
          <th style="padding:10px 12px;text-align:right;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;">Qty</th>
          <th style="padding:10px 12px;text-align:right;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;">Price</th>
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;">Ship Date</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

export function buildConfirmationEmail(orders: ConfirmationOrder[]): {
  subject: string
  bodyHtml: string
  to: string[]
  cc: string[]
} {
  if (orders.length === 0) {
    return { subject: '', bodyHtml: '', to: [], cc: [] }
  }

  const first = orders[0]
  const contacts = first.customer_contacts ?? []

  const toContacts = contacts.filter(c => c.is_primary !== false)
  const ccContacts = contacts.filter(c => c.is_primary === false)

  const toEmails = (toContacts.length > 0 ? toContacts : contacts)
    .map(c => c.email?.trim())
    .filter((e): e is string => !!e)

  const ccEmails = (toContacts.length > 0 ? ccContacts : [])
    .map(c => c.email?.trim())
    .filter((e): e is string => !!e)

  const greetingContacts = toContacts.length > 0 ? toContacts : contacts
  const greeting = firstNames(greetingContacts)

  const allMphPos = orders.flatMap(o =>
    o.split_loads.map(l => l.order_number_override ?? o.order_number)
  )
  const uniqueMphPos = [...new Set(allMphPos)]

  const custPo = first.customer_po
  const subject = custPo && orders.length === 1
    ? `Order Confirmation — ${first.customer_name} | PO: ${custPo} | MPH: ${uniqueMphPos.join(', ')}`
    : `Order Confirmation — ${first.customer_name} | MPH: ${uniqueMphPos.join(', ')}`

  const tablesHtml = orders.map(o => buildTable(o.split_loads, o.order_number, o.customer_po)).join('')

  const firstLoad = orders[0].split_loads[0]
  const shipDateDisplay = formatDate(firstLoad?.ship_date)
  const etaDisplay = formatDate(orders[0].wanted_date)
  const shipVia = escapeHtml(orders[0].freight_carrier ?? '—')
  const paymentTerms = escapeHtml(orders[0].payment_terms ?? '—')

  const shipTo = orders[0].ship_to
  const shipToLines = shipTo
    ? [
        escapeHtml(shipTo.name),
        escapeHtml(shipTo.street),
        escapeHtml(shipTo.street2),
        [escapeHtml(shipTo.city), escapeHtml(shipTo.state), escapeHtml(shipTo.zip)].filter(Boolean).join(', '),
      ].filter(Boolean).join('<br>')
    : '—'

  const cpuOrder = orders.find(o => isCpu(o.freight_carrier))
  const vendorBlock = cpuOrder
    ? `
      <p style="font-family:Arial,sans-serif;font-size:14px;margin:20px 0 8px;">For picking up, please contact the shipping area at the following plant below to schedule your appointment prior to going on for it. Though it's not common, we may have unforeseen issues that happen overnight that could negatively impact the timely shipment of your load. We ask that you have the carrier contact the plant the morning of the scheduled pick up to make sure it is still ready to go to avoid TONU charges.</p>
      <p style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;margin:8px 0;">***HAVE MPH PO # FOR PICK UP REFERENCE***</p>
      <p style="font-family:Arial,sans-serif;font-size:14px;margin:8px 0;">
        ${escapeHtml(cpuOrder.vendor_name ?? '')}<br>
        ${escapeHtml(cpuOrder.vendor_address?.street ?? '')}<br>
        ${[escapeHtml(cpuOrder.vendor_address?.city), escapeHtml(cpuOrder.vendor_address?.state), escapeHtml(cpuOrder.vendor_address?.zip)].filter(Boolean).join(', ')}<br>
        ${escapeHtml(cpuOrder.vendor_dock_info ?? '')}
      </p>`
    : `<p style="font-family:Arial,sans-serif;font-size:14px;margin:20px 0 0;">Please do not hesitate to reach out with any questions.</p>`

  const greetingLine = greeting ? `Hello ${greeting},` : 'Hello,'

  const bodyHtml = `
    <div style="max-width:700px;margin:0 auto;font-family:Arial,sans-serif;color:#1f2937;">
      <p style="font-size:14px;margin:0 0 16px;">${escapeHtml(greetingLine)}</p>
      <p style="font-size:14px;margin:0 0 16px;">Please see your order confirmation below.</p>

      ${tablesHtml}

      <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;padding:2px 12px 2px 0;color:#00205B;">Ship Date:</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;padding:2px 0;">${shipDateDisplay}</td>
        </tr>
        <tr>
          <td style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;padding:2px 12px 2px 0;color:#00205B;">ETA Delivery Date:</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;padding:2px 0;">${etaDisplay}</td>
        </tr>
        <tr>
          <td style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;padding:2px 12px 2px 0;color:#00205B;">Ship Via:</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;padding:2px 0;">${shipVia}</td>
        </tr>
        <tr>
          <td style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;padding:2px 12px 2px 0;color:#00205B;">Payment Terms:</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;padding:2px 0;">${paymentTerms}</td>
        </tr>
      </table>

      <p style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;margin:0 0 4px;color:#00205B;">Ship To:</p>
      <p style="font-family:Arial,sans-serif;font-size:14px;margin:0 0 16px;">${shipToLines}</p>

      ${vendorBlock}
    </div>`

  return { subject, bodyHtml, to: toEmails, cc: ccEmails }
}
