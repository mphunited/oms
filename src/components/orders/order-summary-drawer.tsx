'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { OrderStatusBadge } from './order-status-badge'
import { formatDate } from '@/lib/utils/format-date'
import { formatCurrency } from '@/lib/utils/order-table-utils'
import { getBadgeColor } from '@/lib/orders/badge-colors'

// ── Types ──────────────────────────────────────────────────────────────────────

type DrawerAddress = {
  name?: string
  street?: string
  street2?: string
  city?: string
  state?: string
  zip?: string
  phone_office?: string
  phone_ext?: string
  phone_cell?: string
  phone?: string
  email?: string
  email2?: string
  shipping_notes?: string
}

type DrawerSplitLoad = {
  id: string
  order_number_override: string | null
  order_type: string | null
  description: string | null
  part_number: string | null
  qty: string | null
  buy: string | null
  sell: string | null
  ship_date: string | null
  wanted_date: string | null
  commission_status: string | null
  bottle_cost: string | null
  bottle_qty: string | null
  mph_freight_bottles: string | null
}

type DrawerOrder = {
  id: string
  order_number: string
  order_date: string | null
  status: string
  customer_po: string | null
  freight_carrier: string | null
  ship_date: string | null
  wanted_date: string | null
  freight_cost: string | null
  freight_to_customer: string | null
  additional_costs: string | null
  flag: boolean
  is_blind_shipment: boolean
  invoice_payment_status: string
  qb_invoice_number: string | null
  terms: string | null
  ship_to: DrawerAddress | null
  bill_to: DrawerAddress | null
  customer_contacts: { name: string; email: string }[] | null
  customer_name: string | null
  vendor_name: string | null
  salesperson_name: string | null
  csr_name: string | null
  csr2_name: string | null
  po_notes: string | null
  misc_notes: string | null
  split_loads: DrawerSplitLoad[]
}

type BadgeMeta = Record<string, { color: string }> | null

export interface OrderSummaryDrawerProps {
  orderId: string | null
  statusMeta?: BadgeMeta
  onClose: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 mt-5 first:mt-0">
      {children}
    </p>
  )
}

function AddressBlock({ label, address }: { label: string; address: DrawerAddress | null }) {
  if (!address) return null
  const { name, street, street2, city, state, zip, phone_office, phone, phone_ext, phone_cell, email, email2, shipping_notes } = address
  if (!name && !street && !city && !state && !zip) return null

  const primaryPhone = phone_office || phone
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">{label}</p>
      <div className="text-sm space-y-0.5">
        {name && <p>{name}</p>}
        {street && <p>{street}</p>}
        {street2 && <p>{street2}</p>}
        {(city || state || zip) && <p>{[city, state, zip].filter(Boolean).join(', ')}</p>}
        {primaryPhone && <p>{primaryPhone}{phone_ext ? ` x${phone_ext}` : ''}</p>}
        {phone_cell && <p>{phone_cell}</p>}
        {email && <p>{email}</p>}
        {email2 && <p>{email2}</p>}
        {shipping_notes && <p className="text-muted-foreground">{shipping_notes}</p>}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function OrderSummaryDrawer({ orderId, statusMeta, onClose }: OrderSummaryDrawerProps) {
  const [data, setData] = useState<DrawerOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function fetchOrder(id: string) {
    setData(null)
    setLoading(true)
    setError(null)
    fetch(`/api/orders/${id}`)
      .then(r => { if (!r.ok) throw new Error('Failed to load order'); return r.json() })
      .then((d: DrawerOrder) => { setData(d); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }

  useEffect(() => {
    if (!orderId) return
    fetchOrder(orderId)
  }, [orderId])

  return (
    <Sheet open={!!orderId} onOpenChange={(open: boolean) => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-[520px] sm:max-w-[520px] overflow-y-auto">

        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-sm text-destructive">Failed to load order.</p>
            <button
              type="button"
              onClick={() => orderId && fetchOrder(orderId)}
              className="text-sm text-primary underline"
            >
              Retry
            </button>
          </div>
        )}

        {data && !loading && (
          <div className="pb-6">
            {/* ── Header ── */}
            <SheetHeader>
              <div className="flex items-start justify-between pr-8">
                <div>
                  <SheetTitle className="text-xl font-bold text-[#00205B] font-mono">
                    {data.order_number}
                  </SheetTitle>
                  <div className="mt-1.5">
                    <OrderStatusBadge status={data.status} color={getBadgeColor(statusMeta ?? null, data.status)} />
                  </div>
                </div>
                <Link
                  href={`/orders/${data.id}`}
                  className="shrink-0 inline-flex items-center rounded-md bg-[#00205B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#00205B]/90 transition-colors"
                >
                  Edit Order
                </Link>
              </div>
            </SheetHeader>

            <div className="px-4 space-y-0">
              {/* ── Order Info ── */}
              <SectionLabel>Order Info</SectionLabel>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span>{data.customer_name ?? '—'}</span>

                <span className="text-muted-foreground">Customer PO</span>
                <span>{data.customer_po ?? '—'}</span>

                <span className="text-muted-foreground">Vendor</span>
                <span>{data.vendor_name ?? '—'}</span>

                <span className="text-muted-foreground">Salesperson</span>
                <span>{data.salesperson_name ?? '—'}</span>

                <span className="text-muted-foreground">CSR</span>
                <span>
                  {data.csr_name
                    ? data.csr2_name
                      ? `${data.csr_name.split(' ')[0]} / ${data.csr2_name.split(' ')[0]}`
                      : data.csr_name
                    : '—'}
                </span>

                <span className="text-muted-foreground">Order Date</span>
                <span>{formatDate(data.order_date)}</span>

                <span className="text-muted-foreground">Ship Date</span>
                <span>{formatDate(data.ship_date)}</span>

                <span className="text-muted-foreground">Wanted Date</span>
                <span>{formatDate(data.wanted_date)}</span>

                <span className="text-muted-foreground">Carrier</span>
                <span>{data.freight_carrier ?? '—'}</span>

                <span className="text-muted-foreground">Invoice Status</span>
                <span>{data.invoice_payment_status}</span>

                <span className="text-muted-foreground">Terms</span>
                <span>{data.terms ?? '—'}</span>

                <span className="text-muted-foreground">Blind Shipment</span>
                <span>{data.is_blind_shipment ? 'Yes' : 'No'}</span>

                {data.qb_invoice_number && (
                  <>
                    <span className="text-muted-foreground">QB Invoice #</span>
                    <span>{data.qb_invoice_number}</span>
                  </>
                )}

                {data.flag && (
                  <>
                    <span className="text-muted-foreground">Flag</span>
                    <span className="text-[#B88A44] font-medium">⚑ Flagged</span>
                  </>
                )}
              </div>

              {/* ── Addresses ── */}
              {(data.ship_to || data.bill_to) && (
                <>
                  <SectionLabel>Addresses</SectionLabel>
                  <div className="space-y-4">
                    <AddressBlock label="Ship To" address={data.ship_to} />
                    <AddressBlock label="Bill To" address={data.bill_to} />
                  </div>
                </>
              )}

              {/* ── Order Contacts ── */}
              {Array.isArray(data.customer_contacts) && data.customer_contacts.length > 0 && (
                <>
                  <SectionLabel>Order Contacts</SectionLabel>
                  <div className="space-y-1 text-sm">
                    {data.customer_contacts.map((c, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="font-medium">{c.name}</span>
                        {c.email && <span className="text-muted-foreground">{c.email}</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Split Loads ── */}
              <SectionLabel>Split Loads</SectionLabel>
              {data.split_loads.map((load, index) => {
                const hasBottle = load.bottle_cost && parseFloat(load.bottle_cost) > 0
                return (
                  <div
                    key={load.id}
                    className="border rounded-md p-3 mb-3 border-l-4 border-[#B88A44]"
                  >
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Load {index + 1}</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <span className="text-muted-foreground">Load PO</span>
                      <span className="font-mono">{load.order_number_override ?? data.order_number}</span>

                      <span className="text-muted-foreground">Order Type</span>
                      <span>{load.order_type ?? '—'}</span>

                      <span className="col-span-2 text-muted-foreground text-xs font-medium">Description</span>
                      <span className="col-span-2 whitespace-pre-wrap">{load.description ?? '—'}</span>

                      {load.part_number && (
                        <>
                          <span className="text-muted-foreground">Part Number</span>
                          <span>{load.part_number}</span>
                        </>
                      )}

                      <span className="text-muted-foreground">Qty</span>
                      <span>{load.qty != null ? parseFloat(load.qty).toString() : '—'}</span>

                      <span className="text-muted-foreground">Buy</span>
                      <span>{formatCurrency(load.buy)}</span>

                      <span className="text-muted-foreground">Sell</span>
                      <span>{formatCurrency(load.sell)}</span>

                      <span className="text-muted-foreground">Ship Date</span>
                      <span>{formatDate(load.ship_date)}</span>

                      <span className="text-muted-foreground">Wanted Date</span>
                      <span>{formatDate(load.wanted_date)}</span>

                      <span className="text-muted-foreground">Commission</span>
                      <span>{load.commission_status ?? '—'}</span>

                      {hasBottle && (
                        <>
                          <span className="text-muted-foreground">Bottle Cost</span>
                          <span>{formatCurrency(load.bottle_cost)}</span>

                          <span className="text-muted-foreground">Bottle Qty</span>
                          <span>{load.bottle_qty ?? '—'}</span>

                          <span className="text-muted-foreground">MPH Freight Bottles</span>
                          <span>{load.mph_freight_bottles ?? '—'}</span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* ── Freight & Costs ── */}
              {(() => {
                const fc  = parseFloat(data.freight_cost ?? '')
                const ftc = parseFloat(data.freight_to_customer ?? '')
                const ac  = parseFloat(data.additional_costs ?? '')
                if (!isNaN(fc) && fc !== 0 || !isNaN(ftc) && ftc !== 0 || !isNaN(ac) && ac !== 0) {
                  return (
                    <>
                      <SectionLabel>Freight & Costs</SectionLabel>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        {!isNaN(fc) && fc !== 0 && (
                          <>
                            <span className="text-muted-foreground">Freight Cost</span>
                            <span>{formatCurrency(data.freight_cost)}</span>
                          </>
                        )}
                        {!isNaN(ftc) && ftc !== 0 && (
                          <>
                            <span className="text-muted-foreground">Freight to Customer</span>
                            <span>{formatCurrency(data.freight_to_customer)}</span>
                          </>
                        )}
                        {!isNaN(ac) && ac !== 0 && (
                          <>
                            <span className="text-muted-foreground">Additional Costs</span>
                            <span>{formatCurrency(data.additional_costs)}</span>
                          </>
                        )}
                      </div>
                    </>
                  )
                }
                return null
              })()}

              {/* ── Notes ── */}
              {(data.po_notes || data.misc_notes) && (
                <>
                  <SectionLabel>Notes</SectionLabel>
                  <div className="space-y-3 text-sm">
                    {data.po_notes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">PO Notes</p>
                        <p className="whitespace-pre-wrap">{data.po_notes}</p>
                      </div>
                    )}
                    {data.misc_notes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Misc Notes</p>
                        <p className="whitespace-pre-wrap">{data.misc_notes}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </SheetContent>
    </Sheet>
  )
}
