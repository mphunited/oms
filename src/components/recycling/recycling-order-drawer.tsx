'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Loader2, Pencil } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format-date'

type DrawerOrder = {
  id: string
  order_number: string
  order_date: string | null
  status: string
  recycling_type: string
  customer_name: string | null
  vendor_name: string | null
  customer_bill_to: unknown
  vendor_address: unknown
  salesperson_name: string | null
  csr_name: string | null
  customer_po: string | null
  description: string | null
  qty: string | null
  buy: string | null
  sell: string | null
  freight_credit_amount: string | null
  freight_carrier: string | null
  pick_up_date: string | null
  delivery_date: string | null
  po_contacts: unknown
  po_notes: string | null
  misc_notes: string | null
  bol_number: string | null
}

type Props = {
  orderId: string | null
  editHref: string
  onClose: () => void
}

export function RecyclingOrderDrawer({ orderId, editHref, onClose }: Props) {
  const [order, setOrder]     = useState<DrawerOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) { setOrder(null); return }
    setLoading(true); setError(null); setOrder(null)
    fetch(`/api/recycling-orders/${orderId}`)
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(data => setOrder(data))
      .catch(() => setError('Failed to load order'))
      .finally(() => setLoading(false))
  }, [orderId])

  return (
    <Sheet open={!!orderId} onOpenChange={open => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-[520px] overflow-y-auto">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && <p className="p-6 text-sm text-destructive">{error}</p>}
        {order && (
          <>
            <SheetHeader className="pb-4 border-b">
              <div className="flex items-center justify-between gap-2">
                <SheetTitle className="text-[#00205B]">{order.order_number}</SheetTitle>
                <Button asChild size="sm" variant="outline">
                  <Link href={editHref}><Pencil className="h-3.5 w-3.5 mr-1" />Edit Order</Link>
                </Button>
              </div>
            </SheetHeader>

            <div className="py-4 space-y-5 text-sm">
              {/* Order Info */}
              <section>
                <h3 className="font-semibold text-[#00205B] mb-2">Order Info</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <Field label="Status"        value={order.status} />
                  <Field label="Order Date"    value={formatDate(order.order_date)} />
                  <Field label="Sales/CSR"     value={[order.salesperson_name, order.csr_name].filter(Boolean).map(n => n!.split(' ')[0]).join(' / ')} />
                  <Field label="Customer PO"   value={order.customer_po} />
                  <Field label="Ship Date"     value={formatDate(order.pick_up_date)} />
                  <Field label="Delivery Date" value={formatDate(order.delivery_date)} />
                </div>
              </section>

              {/* Parties */}
              <section>
                <h3 className="font-semibold text-[#00205B] mb-2">
                  {order.recycling_type === 'IBC' ? 'IBC Source / Processing Facility' : 'Customer / Vendor'}
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <Field label={order.recycling_type === 'IBC' ? 'IBC Source' : 'Customer'} value={order.customer_name} />
                  <Field label={order.recycling_type === 'IBC' ? 'Processing Facility' : 'Vendor'} value={order.vendor_name} />
                </div>
              </section>

              {/* Financials */}
              <section>
                <h3 className="font-semibold text-[#00205B] mb-2">Financials</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <Field label="Description" value={order.description} />
                  <Field label="Qty"         value={order.qty} />
                  <Field label="Buy"         value={order.buy ? `$${parseFloat(order.buy).toFixed(2)}` : null} />
                  <Field label="Sell"        value={order.sell ? `$${parseFloat(order.sell).toFixed(2)}` : null} />
                  <Field label="Freight Credit" value={order.freight_credit_amount ? `$${parseFloat(order.freight_credit_amount).toFixed(2)}` : null} />
                  <Field label="Carrier"     value={order.freight_carrier} />
                  <Field label="BOL #"       value={order.bol_number} />
                </div>
              </section>

              {/* Notes */}
              {(order.po_notes || order.misc_notes) && (
                <section>
                  <h3 className="font-semibold text-[#00205B] mb-2">Notes</h3>
                  {order.po_notes  && <p className="text-xs text-muted-foreground mb-1">{order.po_notes}</p>}
                  {order.misc_notes && <p className="text-xs text-muted-foreground">{order.misc_notes}</p>}
                </section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  )
}
