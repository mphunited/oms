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
  ship_date: string | null
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

function buildTable(loads: ConfirmationLoad[], orderNumber: string, orderCustomerPo: string | null, orderShipDate: string | null, wantedDate: string | null): string {
  const rows = loads.map(l => {
    const mphPo = escapeHtml(l.order_number_override || orderNumber)
    const custPo = escapeHtml(l.customer_po ?? orderCustomerPo ?? '—')
    const desc = escapeHtml(l.description ?? '—')
    const qty = escapeHtml(l.qty ?? '—')
    const price = l.sell ? `$${Number(l.sell).toFixed(2)}` : '—'
    const shipDate = formatDate(l.ship_date || orderShipDate)
    const eta = formatDate(wantedDate)
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;">${mphPo}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;">${custPo}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;">${desc}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;text-align:right;">${qty}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;text-align:right;">${price}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;">${shipDate}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;">${eta}</td>
      </tr>`
  }).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="background-color:#00205B;">
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;">MPH PO</th>
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;">Customer PO</th>
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;">Description</th>
          <th style="padding:10px 12px;text-align:right;color:#ffffff;font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;">Qty</th>
          <th style="padding:10px 12px;text-align:right;color:#ffffff;font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;">Price</th>
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;">Ship Date</th>
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;">ETA Delivery Date</th>
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

  const primaryContacts = contacts.filter(c => c.is_primary === true)
  const greetingContacts = primaryContacts.length > 0 ? primaryContacts : toContacts.length > 0 ? toContacts : contacts
  const greeting = firstNames(greetingContacts)

  const custPo = first.customer_po
  const mphPoList = orders.map(o => o.order_number).join(', ')
  const subject = custPo && orders.length === 1
    ? `Order Confirmation — ${first.customer_name} | PO: ${custPo} | MPH: ${first.order_number}`
    : `Order Confirmation — ${first.customer_name} | MPH: ${mphPoList}`

  const tablesHtml = orders.map(o => buildTable(o.split_loads, o.order_number, o.customer_po, o.ship_date, o.wanted_date)).join('')

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
      <p style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;margin:20px 0 8px;">For picking up, please contact the shipping area at the following plant below to schedule your appointment prior to going on for it. Though it's not common, we may have unforeseen issues that happen overnight that could negatively impact the timely shipment of your load. We ask that you have the carrier contact the plant the morning of the scheduled pick up to make sure it is still ready to go to avoid TONU charges.</p>
      <p style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;font-weight:bold;margin:8px 0;">***HAVE MPH PO # FOR PICK UP REFERENCE***</p>
      <br>
      <p style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;margin:8px 0;">
        ${escapeHtml(cpuOrder.vendor_name ?? '')}<br>
        ${escapeHtml(cpuOrder.vendor_address?.street ?? '')}<br>
        ${[escapeHtml(cpuOrder.vendor_address?.city), escapeHtml(cpuOrder.vendor_address?.state), escapeHtml(cpuOrder.vendor_address?.zip)].filter(Boolean).join(', ')}<br>
        ${escapeHtml(cpuOrder.vendor_dock_info ?? '')}
      </p>`
    : `<p style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;margin:20px 0 0;">Please do not hesitate to reach out with any questions.</p>`

  const greetingLine = greeting ? `Hello ${greeting},` : 'Hello,'

  const bodyHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="left" valign="top">
          <table width="700" cellpadding="0" cellspacing="0" border="0" style="font-family:'Aptos','Calibri','Arial',sans-serif;color:#1f2937;text-align:left;">
            <tr>
              <td style="padding:0;">
                <p style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;margin:0 0 16px;">${escapeHtml(greetingLine)}</p>
                <p style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;margin:0 0 16px;">Please see your order confirmation below.</p>

                ${tablesHtml}

                <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                  <tr>
                    <td style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;font-weight:bold;padding:2px 12px 2px 0;color:#00205B;">Ship Via:</td>
                    <td style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;padding:2px 0;">${shipVia}</td>
                  </tr>
                  <tr>
                    <td style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;font-weight:bold;padding:2px 12px 2px 0;color:#00205B;">Payment Terms:</td>
                    <td style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;padding:2px 0;">${paymentTerms}</td>
                  </tr>
                </table>

                <p style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;font-weight:bold;margin:0 0 4px;color:#00205B;">Ship To:</p>
                <p style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;margin:0 0 16px;">${shipToLines}</p>

                ${vendorBlock}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`

  return { subject, bodyHtml, to: toEmails, cc: ccEmails }
}
