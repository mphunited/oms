'use client'

import { toast } from 'sonner'
import { getMailToken } from '@/lib/email/msal-client'
import { createDraft, attachFileToDraft, openDraft } from '@/lib/email/graph-mail'
import { buildPoEmail, type OrderWithRelations } from '@/lib/email/build-po-email'
import { buildMultiShipToEmail, type MultiShipToOrderForEmail } from '@/lib/email/build-multi-ship-to-email'
import { getUserSignature } from '@/lib/email/get-user-signature'
import { formatDate } from '@/lib/utils/format-date'
import type { SplitLoadValue } from '@/lib/orders/order-form-schema'

type VendorRow = {
  name: string
  po_contacts: unknown
  bol_contacts: unknown
  address: unknown
}

type OrderSnap = {
  id: string
  order_number: string
  vendor_id: string | null
  vendor_name: string | null
  customer_name: string | null
  customer_po: string | null
  sales_order_number: string | null
  freight_carrier: string | null
  ship_date: string | null
  is_blind_shipment: boolean
  is_revised?: boolean
  group_id?: string | null
}

type AddressSnap = {
  name: string; street: string; city: string; state: string
  zip: string; phone: string; shipping_notes: string
} | null

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function sendPoEmail(
  order: OrderSnap,
  loads: SplitLoadValue[],
  shipDate: string,
  shipTo: AddressSnap,
  poNotes: string,
  setEmailing: (v: boolean) => void,
) {
  setEmailing(true)
  const toastId = toast.loading('Creating draft…')
  try {
    // ── Group path ─────────────────────────────────────────────────────────────
    if (order.group_id) {
      const groupRes = await fetch(`/api/order-groups/${order.group_id}`)
      if (!groupRes.ok) throw new Error('Failed to fetch group')
      const group = await groupRes.json() as {
        group_po_number: string
        order_ids: string[]
        orders: Array<{ id: string; order_number: string; customer_name: string | null }>
      }

      let vendor: VendorRow | null = null
      if (order.vendor_id) {
        const res = await fetch(`/api/vendors/${order.vendor_id}`)
        if (res.ok) vendor = await res.json() as VendorRow
      }

      const siblingDetails = await Promise.all(
        group.order_ids.map(id =>
          fetch(`/api/orders/${id}`).then(r => r.ok ? r.json() : null)
        )
      )
      const validSiblings = siblingDetails.filter(Boolean) as Array<{
        order_number: string; customer_name: string | null; customer_po: string | null
        ship_date: string | null; ship_to: { city?: string; state?: string } | null
        po_notes: string | null
        split_loads: Array<{
          description: string | null; part_number: string | null
          qty: string | null; sell: string | null; order_number_override: string | null
        }>
      }>

      const ordersForEmail: MultiShipToOrderForEmail[] = validSiblings.map(o => ({
        order_number: o.order_number,
        customer_name: o.customer_name,
        customer_po: o.customer_po ?? null,
        ship_date: o.ship_date ?? null,
        ship_to: o.ship_to ?? null,
        po_notes: o.po_notes ?? null,
        split_loads: (o.split_loads ?? []).map(l => ({
          description: l.description ?? null,
          part_number: l.part_number ?? null,
          qty: l.qty ?? null,
          sell: l.sell ?? null,
          order_number_override: l.order_number_override ?? null,
        })),
      }))

      const vendorForEmail = {
        name: vendor?.name ?? order.vendor_name ?? '',
        address: vendor?.address as { city?: string; state?: string } | null ?? null,
        po_contacts: (vendor?.po_contacts ?? []) as Array<{ name: string; email: string; role?: 'to' | 'cc'; is_primary?: boolean }>,
      }

      const { subject, bodyHtml, to, cc } = buildMultiShipToEmail(group.group_po_number, vendorForEmail, ordersForEmail)
      const [token, signature] = await Promise.all([getMailToken(), getUserSignature()])
      const pdfRes = await fetch(`/api/orders/${order.id}/po-pdf`)
      if (!pdfRes.ok) throw new Error('Failed to fetch combined PO PDF')
      const base64 = await blobToBase64(await pdfRes.blob())
      const { id: messageId, webLink } = await createDraft(token, { to, cc, subject, bodyHtml, signature })
      await attachFileToDraft(token, messageId, `MPH PO ${group.group_po_number} Multi-Ship-To.pdf`, base64)
      toast.success('Draft created — opening Outlook', { id: toastId })
      openDraft(webLink)
      return
    }
    // ── End group path ─────────────────────────────────────────────────────────

    let vendor: VendorRow | null = null
    if (order.vendor_id) {
      const res = await fetch(`/api/vendors/${order.vendor_id}`)
      if (res.ok) vendor = await res.json() as VendorRow
    }
    const poContacts = (vendor?.po_contacts ?? []) as Array<{ name: string; email: string; role?: 'to' | 'cc'; is_primary?: boolean }>
    const primary = poContacts.find(c => (c.role === 'to' || c.role === 'cc') ? c.role === 'to' : c.is_primary === true) ?? poContacts[0] ?? null
    const greetingName = primary ? (primary.name.split(' ')[0] ?? primary.name) : (vendor?.name ?? '')
    const vendorAddress = vendor?.address as { city?: string; state?: string } | null
    const orderData: OrderWithRelations = {
      order_number: order.order_number,
      is_blind_shipment: order.is_blind_shipment,
      is_revised: order.is_revised ?? false,
      customer_po: order.customer_po,
      sales_order_number: order.sales_order_number,
      freight_carrier: order.freight_carrier,
      ship_date: shipDate || order.ship_date,
      ship_to: shipTo,
      po_notes: poNotes || null,
      vendor: { name: order.vendor_name ?? '', address: vendorAddress, po_contacts: poContacts },
      customer: { name: order.customer_name ?? '' },
      order_split_loads: loads.map(l => ({
        description: l.description || null,
        part_number: l.part_number || null,
        qty: l.qty || null,
        sell: l.sell || null,
        order_number_override: l.order_number_override || null,
      })),
    }
    const { subject, bodyHtml, to, cc } = buildPoEmail([orderData], greetingName)
    const [token, signature] = await Promise.all([getMailToken(), getUserSignature()])
    const pdfRes = await fetch(`/api/orders/${order.id}/po-pdf`)
    if (!pdfRes.ok) throw new Error('Failed to fetch PO PDF')
    const base64 = await blobToBase64(await pdfRes.blob())
    const { id: messageId, webLink } = await createDraft(token, { to, cc, subject, bodyHtml, signature })
    await attachFileToDraft(token, messageId, `MPH PO ${order.order_number}.pdf`, base64)
    toast.success('Draft created — opening Outlook', { id: toastId })
    openDraft(webLink)
  } catch (err) {
    toast.error('Failed to create draft: ' + (err instanceof Error ? err.message : String(err)), { id: toastId })
  } finally {
    setEmailing(false)
  }
}

export async function sendBolEmail(
  order: OrderSnap,
  shipDate: string,
  shipTo: AddressSnap,
  setEmailing: (v: boolean) => void,
) {
  setEmailing(true)
  const toastId = toast.loading('Creating draft…')
  try {
    let vendor: VendorRow | null = null
    if (order.vendor_id) {
      const res = await fetch(`/api/vendors/${order.vendor_id}`)
      if (res.ok) vendor = await res.json() as VendorRow
    }
    const contacts = (vendor?.bol_contacts ?? []) as Array<{ name: string; email: string; role?: 'to' | 'cc'; is_primary?: boolean }>
    const primary = contacts.find(c => (c.role === 'to' || c.role === 'cc') ? c.role === 'to' : c.is_primary === true) ?? contacts[0] ?? null
    const others = contacts.filter(c => c !== primary)
    const to = primary?.email ? [primary.email] : []
    const cc = others.map(c => c.email).filter((e): e is string => Boolean(e))
    const vendorName = vendor?.name ?? order.vendor_name ?? ''
    const shipToLine = shipTo
      ? [shipTo.name, [shipTo.city, shipTo.state].filter(Boolean).join(', ')].filter(Boolean).join(', ')
      : '—'
    const shipDateFmt = formatDate(shipDate || order.ship_date)
    const subject = `MPH United BOL ${order.order_number} -- ${vendorName} | Ship ${shipDateFmt}`
    const bodyHtml = `<div style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;color:#1f2937;max-width:700px;line-height:1.6;">
  <p style="margin:0 0 16px;">Hello ${vendorName},</p>
  <p style="margin:0 0 16px;">Please find attached the Bill of Lading for MPH United order ${order.order_number}, shipping to ${shipToLine} on ${shipDateFmt}.</p>
  <p style="margin:0 0 24px;">Please confirm receipt at your earliest convenience.</p>
</div>`
    const [token, signature] = await Promise.all([getMailToken(), getUserSignature()])
    const pdfRes = await fetch(`/api/orders/${order.id}/bol-pdf`)
    if (!pdfRes.ok) throw new Error('Failed to fetch BOL PDF')
    const base64 = await blobToBase64(await pdfRes.blob())
    const { id: messageId, webLink } = await createDraft(token, { to, cc, subject, bodyHtml, signature })
    await attachFileToDraft(token, messageId, `MPH BOL ${order.order_number}.pdf`, base64)
    toast.success('Draft created — opening Outlook', { id: toastId })
    openDraft(webLink)
  } catch (err) {
    toast.error('Failed to create draft: ' + (err instanceof Error ? err.message : String(err)), { id: toastId })
  } finally {
    setEmailing(false)
  }
}

export async function sendConfirmationEmail(
  orderIds: string[],
  setEmailing: (v: boolean) => void,
) {
  setEmailing(true)
  const toastId = toast.loading('Creating draft…')
  try {
    const res = await fetch('/api/orders/confirmation-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds }),
    })
    if (!res.ok) {
      const data = await res.json() as { error?: string }
      throw new Error(data.error ?? `${res.status}`)
    }
    const emailData = await res.json() as { subject: string; bodyHtml: string; to: string[]; cc: string[] }
    const [token, signature] = await Promise.all([getMailToken(), getUserSignature()])
    const draft = await createDraft(token, {
      to: emailData.to,
      cc: emailData.cc,
      subject: emailData.subject,
      bodyHtml: emailData.bodyHtml,
      signature,
    })
    openDraft(draft.webLink)
    toast.success('Draft created — opening Outlook', { id: toastId })
  } catch (err) {
    toast.error('Failed to create draft: ' + (err instanceof Error ? err.message : String(err)), { id: toastId })
  } finally {
    setEmailing(false)
  }
}
