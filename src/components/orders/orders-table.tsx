'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flag, Pencil, Copy, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import type { OrderStatus } from '@/types/order'
import { formatDate } from '@/lib/utils/format-date'
import { getMailToken } from '@/lib/email/msal-client'
import { createDraft, attachFileToDraft, openDraft } from '@/lib/email/graph-mail'
import { buildPoEmail, type OrderWithRelations } from '@/lib/email/build-po-email'
import { getUserSignature } from '@/lib/email/get-user-signature'

type SplitLoad = {
  description: string | null
  qty: string | null
  buy: string | null
  sell: string | null
}

type OrderRow = {
  id: string
  order_number: string
  order_date: string | null
  order_type: string | null
  status: string
  customer_po: string | null
  freight_carrier: string | null
  ship_date: string | null
  wanted_date: string | null
  freight_cost: string | null
  freight_to_customer: string | null
  additional_costs: string | null
  flag: boolean
  invoice_payment_status: string
  commission_status: string
  ship_to: { city?: string; state?: string } | null
  customer_name: string | null
  vendor_name: string | null
  salesperson_name: string | null
  split_loads: SplitLoad[]
}

type FullOrderForEmail = OrderWithRelations & { id: string }

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function formatCurrency(val: string | null | undefined): string {
  const n = parseFloat(val ?? '')
  return isNaN(n) ? '—' : `$${n.toFixed(2)}`
}

function firstDescription(loads: SplitLoad[]): string {
  const desc = loads[0]?.description ?? '—'
  return desc.length > 40 ? desc.slice(0, 40) + '…' : desc
}

function firstQty(loads: SplitLoad[]): string {
  const val = loads[0]?.qty
  if (!val) return '—'
  const n = parseFloat(val)
  return isNaN(n) ? '—' : String(n)
}

function formatShipTo(shipTo: unknown): string {
  if (!shipTo || typeof shipTo !== 'object') return '—'
  const s = shipTo as { city?: string; state?: string }
  if (!s.city && !s.state) return '—'
  return [s.city, s.state].filter(Boolean).join(', ')
}

export function OrdersTable() {
  const [orderRows, setOrderRows] = useState<OrderRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [emailingPos, setEmailingPos] = useState(false)
  const [emailingBols, setEmailingBols] = useState(false)

  useEffect(() => {
    fetch('/api/orders')
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json() as Promise<OrderRow[]>
      })
      .then(data => { setOrderRows(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  async function toggleFlag(id: string, current: boolean) {
    setOrderRows(rows => rows.map(r => r.id === id ? { ...r, flag: !current } : r))
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: !current }),
      })
      if (!res.ok) throw new Error('Failed')
    } catch {
      setOrderRows(rows => rows.map(r => r.id === id ? { ...r, flag: current } : r))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSelected = orderRows.length > 0 && orderRows.every(r => selectedIds.has(r.id))

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(orderRows.map(r => r.id)))
  }

  async function fetchOrdersAndVendor(ids: string[]) {
    const fullOrders = await Promise.all(
      ids.map(id =>
        fetch(`/api/orders/${id}`).then(r => {
          if (!r.ok) throw new Error(`Failed to fetch order ${id}`)
          return r.json()
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

  async function handleEmailPosClick() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setEmailingPos(true)
    const toastId = toast.loading('Creating draft…')
    try {
      const { fullOrders, vendor } = await fetchOrdersAndVendor(ids)

      const ordersForEmail: FullOrderForEmail[] = fullOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        is_blind_shipment: o.is_blind_shipment,
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
      setSelectedIds(new Set())
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

      const bolContacts = (vendor.bol_contacts ?? []) as Array<{ name: string; email: string; is_primary?: boolean }>
      const primary = bolContacts.find(c => c.is_primary) ?? bolContacts[0] ?? null
      if (!primary?.email) throw new Error('No BOL contact email found for this vendor')
      const to = [primary.email]
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
  <p style="margin:16px 0 0;">Thank you,<br/>MPH United</p>
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
      setSelectedIds(new Set())
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === '__SAME_VENDOR__') toast.error('All selected orders must be from the same vendor', { id: toastId })
      else if (msg === '__NO_VENDOR__') toast.error('Selected orders have no vendor assigned', { id: toastId })
      else toast.error('Failed to create draft: ' + msg, { id: toastId })
    } finally {
      setEmailingBols(false)
    }
  }

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading orders…</p>
  if (error)   return <p className="p-6 text-sm text-destructive">Error: {error}</p>
  if (!orderRows.length) return <p className="p-6 text-sm text-muted-foreground">No orders found.</p>

  return (
    <div className="space-y-2">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
          <button
            onClick={handleEmailPosClick}
            disabled={emailingPos || emailingBols}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Mail className="h-3.5 w-3.5" />
            {emailingPos ? 'Creating…' : 'Email POs'}
          </button>
          <button
            onClick={handleEmailBolsClick}
            disabled={emailingPos || emailingBols}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Mail className="h-3.5 w-3.5" />
            {emailingBols ? 'Creating…' : 'Email BOLs'}
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-border accent-[#00205B] cursor-pointer"
                  aria-label="Select all orders"
                />
              </th>
              <th className="w-8 px-2 py-2" aria-label="Flag"></th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">MPH PO</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Customer</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Customer PO</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ship Date</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Wanted Date</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vendor</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Buy</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Sell</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ship To</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Freight</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orderRows.map(order => (
              <tr key={order.id} className={`hover:bg-muted/30 transition-colors${selectedIds.has(order.id) ? ' bg-muted/20' : ''}`}>
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(order.id)}
                    onChange={() => toggleSelect(order.id)}
                    className="h-4 w-4 rounded border-border accent-[#00205B] cursor-pointer"
                    aria-label={`Select order ${order.order_number}`}
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={() => toggleFlag(order.id, order.flag)}
                    className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                    aria-label={order.flag ? 'Remove flag' : 'Flag order'}
                  >
                    <Flag className={`h-4 w-4 ${order.flag ? 'text-[#B88A44] fill-[#B88A44]' : 'text-slate-300 hover:text-slate-400'}`} />
                  </button>
                </td>
                <td className="px-3 py-2 font-mono font-medium">
                  <Link href={`/orders/${order.id}`} className="hover:underline text-primary">
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <OrderStatusBadge status={order.status as OrderStatus} />
                </td>
                <td className="px-3 py-2">{order.customer_name ?? '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{order.customer_po ?? ''}</td>
                <td className="px-3 py-2 text-muted-foreground" title={order.split_loads[0]?.description ?? ''}>
                  {firstDescription(order.split_loads)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{firstQty(order.split_loads)}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatDate(order.ship_date)}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatDate(order.wanted_date)}</td>
                <td className="px-3 py-2 text-muted-foreground">{order.vendor_name ?? '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(order.split_loads[0]?.buy)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(order.split_loads[0]?.sell)}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatShipTo(order.ship_to)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(order.freight_cost)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Link href={`/orders/${order.id}`} className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <Link href={`/orders/${order.id}?duplicate=1`} className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                      <Copy className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
