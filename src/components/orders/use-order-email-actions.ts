'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { getMailToken } from '@/lib/email/msal-client'
import { createDraft, attachFileToDraft, openDraft } from '@/lib/email/graph-mail'
import { buildPoEmail, type OrderWithRelations } from '@/lib/email/build-po-email'
import { buildMultiShipToEmail, type MultiShipToOrderForEmail } from '@/lib/email/build-multi-ship-to-email'
import { getUserSignature } from '@/lib/email/get-user-signature'
import { formatDate } from '@/lib/utils/format-date'

type FullOrderForEmail = OrderWithRelations & { id: string }

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function fetchOrdersAndVendor(ids: string[]) {
  const fullOrders = await Promise.all(
    ids.map(id =>
      fetch(`/api/orders/${id}`).then(async r => {
        if (!r.ok) throw new Error(`Failed to fetch order ${id}`)
        const data = await r.json()
        console.log(`[Email Debug] fetched order ${id}:`, JSON.stringify(data, null, 2))
        return data
      })
    )
  )
  const vendorIds = [...new Set((fullOrders as any[]).map(o => o.vendor_id).filter(Boolean))]
  if (vendorIds.length > 1) throw new Error('__SAME_VENDOR__')
  if (vendorIds.length === 0) throw new Error('__NO_VENDOR__')
  const vendorRes = await fetch(`/api/vendors/${vendorIds[0]}`)
  if (!vendorRes.ok) throw new Error('Failed to fetch vendor details')
  const vendor = await vendorRes.json()
  return { fullOrders: fullOrders as any[], vendor }
}

export function useOrderEmailActions(
  selectedIds: Set<string>,
  onClearSelection: () => void,
) {
  const [emailingPos, setEmailingPos] = useState(false)
  const [emailingBols, setEmailingBols] = useState(false)

  async function handleEmailPosClick() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setEmailingPos(true)
    const toastId = toast.loading('Creating draft…')
    try {
      const { fullOrders, vendor } = await fetchOrdersAndVendor(ids)

      // ── Group detection ──────────────────────────────────────────────────────
      const firstOrder = fullOrders[0] as { group_id?: string | null } & typeof fullOrders[0]
      if (firstOrder.group_id) {
        const groupRes = await fetch(`/api/order-groups/${firstOrder.group_id}`)
        if (!groupRes.ok) throw new Error('Failed to fetch group')
        const group = await groupRes.json() as { group_po_number: string; order_ids: string[] }

        toast.loading('Creating Multi-Ship-To draft…', { id: toastId })

        const siblingDetails = await Promise.all(
          group.order_ids.map(id =>
            fetch(`/api/orders/${id}`).then(r => r.ok ? r.json() : null)
          )
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validSiblings = siblingDetails.filter(Boolean) as any[]

        const ordersForGroupEmail: MultiShipToOrderForEmail[] = validSiblings.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (o: any) => ({
            order_number: o.order_number,
            customer_name: o.customer_name ?? null,
            customer_po: o.customer_po ?? null,
            ship_date: o.ship_date ?? null,
            ship_to: o.ship_to ?? null,
            po_notes: o.po_notes ?? null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            split_loads: (o.split_loads ?? []).map((l: any) => ({
              description: l.description ?? null,
              part_number: l.part_number ?? null,
              qty: l.qty ?? null,
              sell: l.sell ?? null,
              order_number_override: l.order_number_override || null, // was ?? null
            })),
          })
        )

        const vendorForEmail = {
          name: vendor.name ?? '',
          address: vendor.address as { city?: string; state?: string } | null ?? null,
          po_contacts: (vendor.po_contacts ?? []) as Array<{ name: string; email: string; role?: 'to' | 'cc'; is_primary?: boolean }>,
        }

        const { subject, bodyHtml, to, cc } = buildMultiShipToEmail(group.group_po_number, vendorForEmail, ordersForGroupEmail)
        const [token, signature] = await Promise.all([getMailToken(), getUserSignature()])
        const pdfRes = await fetch(`/api/orders/${firstOrder.id}/po-pdf`)
        if (!pdfRes.ok) throw new Error('Failed to fetch combined PO PDF')
        const base64 = await blobToBase64(await pdfRes.blob())
        const { id: messageId, webLink } = await createDraft(token, { to, cc, subject, bodyHtml, signature })
        await attachFileToDraft(token, messageId, `MPH PO ${group.group_po_number} Multi-Ship-To.pdf`, base64)
        toast.success('Draft created — opening Outlook', { id: toastId })
        openDraft(webLink)
        onClearSelection()
        return
      }
      // ── End group detection ──────────────────────────────────────────────────

      const ordersForEmail: FullOrderForEmail[] = fullOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        is_blind_shipment: o.is_blind_shipment,
        is_revised: o.is_revised ?? false,
        customer_po: o.customer_po ?? null,
        sales_order_number: o.sales_order_number ?? null,
        freight_carrier: o.freight_carrier ?? null,
        ship_date: o.ship_date ?? null,
        ship_to: o.ship_to ?? null,
        po_notes: o.po_notes ?? null,
        vendor: { name: vendor.name, address: vendor.address ?? null, po_contacts: vendor.po_contacts ?? null },
        customer: o.customer_name ? { name: o.customer_name } : null,
        order_split_loads: (o.split_loads ?? []).map((l: any) => ({
          description: l.description ?? null,
          part_number: l.part_number ?? null,
          qty: l.qty ?? null,
          sell: l.sell ?? null,
          order_number_override: l.order_number_override ?? null,
        })),
      }))
      const count = ordersForEmail.length
      toast.loading(`Creating draft with ${count} PDF${count > 1 ? 's' : ''}…`, { id: toastId })
      const { subject, bodyHtml, to, cc } = buildPoEmail(ordersForEmail, vendor.name ?? '')
      const [token, signature] = await Promise.all([getMailToken(), getUserSignature()])
      const pdfResults = await Promise.all(
        ordersForEmail.map(o =>
          fetch(`/api/orders/${o.id}/po-pdf`).then(async r => {
            if (!r.ok) throw new Error(`Failed to fetch PDF for ${o.order_number}`)
            return { filename: `MPH PO ${o.order_number}.pdf`, base64: await blobToBase64(await r.blob()) }
          })
        )
      )
      const { id: messageId, webLink } = await createDraft(token, { to, cc, subject, bodyHtml, signature })
      for (const { filename, base64 } of pdfResults) {
        await attachFileToDraft(token, messageId, filename, base64)
      }
      toast.success('Draft created — opening Outlook', { id: toastId })
      openDraft(webLink)
      onClearSelection()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === '__SAME_VENDOR__') toast.error('All selected orders must be from the same vendor', { id: toastId })
      else if (msg === '__NO_VENDOR__') toast.error('Selected orders have no vendor assigned', { id: toastId })
      else toast.error('Failed: ' + msg, { id: toastId })
    } finally {
      setEmailingPos(false)
    }
  }

  async function handleEmailBolsClick() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setEmailingBols(true)
    const toastId = toast.loading('Creating draft…')
    try {
      const { fullOrders, vendor } = await fetchOrdersAndVendor(ids)
      const bolContacts = (vendor.bol_contacts ?? []) as Array<{ name: string; email: string; role?: 'to' | 'cc'; is_primary?: boolean }>
      const primary = bolContacts.find(c => (c.role === 'to' || c.role === 'cc') ? c.role === 'to' : c.is_primary === true) ?? bolContacts[0] ?? null
      const to = primary?.email ? [primary.email] : []
      const cc = bolContacts.filter(c => c !== primary).map(c => c.email).filter((e): e is string => Boolean(e))
      const vendorName = vendor.name ?? ''
      const count = fullOrders.length
      const subject = count === 1
        ? `MPH United BOL ${fullOrders[0].order_number} -- ${vendorName} | Ship ${formatDate(fullOrders[0].ship_date)}`
        : `MPH United BOLs -- ${vendorName} | ${count} Shipments`
      const orderLines = fullOrders
        .map(o => `<p style="margin:4px 0;">Order ${o.order_number} — Ship ${formatDate(o.ship_date)}</p>`)
        .join('')
      const bodyHtml = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;max-width:700px;line-height:1.6;">
  <p style="margin:0 0 16px;">Hello ${vendorName},</p>
  <p style="margin:0 0 12px;">Please find attached the Bill${count > 1 ? 's' : ''} of Lading for the following MPH United order${count > 1 ? 's' : ''}:</p>
  ${orderLines}
  <p style="margin:16px 0 0;">Please confirm receipt at your earliest convenience.</p>
</div>`
      const [token, signature] = await Promise.all([getMailToken(), getUserSignature()])
      const pdfResults = await Promise.all(
        fullOrders.map(o =>
          fetch(`/api/orders/${o.id}/bol-pdf`).then(async r => {
            if (!r.ok) throw new Error(`Failed to fetch BOL PDF for ${o.order_number}`)
            return { filename: `MPH BOL ${o.order_number}.pdf`, base64: await blobToBase64(await r.blob()) }
          })
        )
      )
      const { id: messageId, webLink } = await createDraft(token, { to, cc, subject, bodyHtml, signature })
      for (const { filename, base64 } of pdfResults) {
        await attachFileToDraft(token, messageId, filename, base64)
      }
      toast.success('Draft created — opening Outlook', { id: toastId })
      openDraft(webLink)
      onClearSelection()
    } catch (err) {
      console.error('[BOL Email] error message:', err instanceof Error ? err.message : String(err))
      console.error('[BOL Email] error stack:', err instanceof Error ? err.stack : 'no stack available')
      console.error('[BOL Email] full error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === '__SAME_VENDOR__') toast.error('All selected orders must be from the same vendor', { id: toastId })
      else if (msg === '__NO_VENDOR__') toast.error('Selected orders have no vendor assigned', { id: toastId })
      else toast.error('Failed to create draft: ' + msg, { id: toastId })
    } finally {
      setEmailingBols(false)
    }
  }

  return { emailingPos, emailingBols, handleEmailPosClick, handleEmailBolsClick }
}
