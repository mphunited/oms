'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { InvoiceFilters, DEFAULT_INVOICE_FILTERS, type InvoiceFilters as FilterState } from './invoice-filters'
import { InvoiceRow, type InvoiceQueueRow } from './invoice-row'
import { OrderSummaryDrawer } from '@/components/orders/order-summary-drawer'

export function InvoiceQueueTab() {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const [rows, setRows]           = useState<InvoiceQueueRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const filters: FilterState = {
    customerId:    searchParams.get('customerId') ?? '',
    invoiceStatus: searchParams.get('invoiceStatus')?.split(',').filter(Boolean) ?? ['Not Invoiced'],
    shipDateFrom:  searchParams.get('shipDateFrom') ?? '',
    shipDateTo:    searchParams.get('shipDateTo') ?? '',
  }

  function updateFilters(update: Partial<FilterState>) {
    const next = { ...filters, ...update }
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'queue')
    if (next.customerId) { params.set('customerId', next.customerId) } else { params.delete('customerId') }
    if (next.invoiceStatus.length) { params.set('invoiceStatus', next.invoiceStatus.join(',')) } else { params.delete('invoiceStatus') }
    if (next.shipDateFrom) { params.set('shipDateFrom', next.shipDateFrom) } else { params.delete('shipDateFrom') }
    if (next.shipDateTo) { params.set('shipDateTo', next.shipDateTo) } else { params.delete('shipDateTo') }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const fetchRows = useCallback(() => {
    setLoading(true)
    fetch('/api/orders?view=invoicing')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((data: InvoiceQueueRow[]) => { setRows(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { toast.error('Failed to load invoice queue'); setLoading(false) })
  }, [])

  useEffect(() => { fetchRows() }, [fetchRows, refreshKey])

  const filtered = rows.filter(row => {
    if (filters.customerId && row.customer_id !== filters.customerId) return false
    if (filters.invoiceStatus.length && !filters.invoiceStatus.includes(row.invoice_payment_status)) return false
    if (filters.shipDateFrom && row.ship_date && row.ship_date < filters.shipDateFrom) return false
    if (filters.shipDateTo   && row.ship_date && row.ship_date > filters.shipDateTo)   return false
    return true
  })

  const readyToInvoice = filtered.filter(r => r.status === 'Ready To Invoice')
  const pastShipDate   = filtered.filter(r => r.status !== 'Ready To Invoice')

  const COL_HEADERS = ['MPH PO', 'Customer', 'Customer PO', 'Order Type', 'Ship Date', 'Invoice #', 'SP / CSR', 'Invoice Status', 'Date Paid', 'Save']

  function renderSection(title: string, sectionRows: InvoiceQueueRow[]) {
    if (!sectionRows.length) return null
    return (
      <>
        <tr>
          <td colSpan={10} className="bg-muted/50 px-3 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
          </td>
        </tr>
        {sectionRows.map(row => (
          <InvoiceRow
            key={row.id}
            row={row}
            onOpenDrawer={setDrawerOrderId}
            onSaved={() => setRefreshKey(k => k + 1)}
          />
        ))}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <InvoiceFilters filters={filters} onChange={updateFilters} />

      {loading ? (
        <p className="py-6 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {COL_HEADERS.map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No orders in the invoice queue.
                  </td>
                </tr>
              ) : (
                <>
                  {renderSection('Ready to Invoice', readyToInvoice)}
                  {renderSection('Past Ship Date', pastShipDate)}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      <OrderSummaryDrawer
        orderId={drawerOrderId}
        onClose={() => setDrawerOrderId(null)}
      />
    </div>
  )
}
