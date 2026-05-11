'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format-date'

const COMMISSION_RATE_PER_UNIT = 3

export type CommissionRow = {
  load_id: string
  order_id: string
  mphPo: string
  customerPo: string | null
  description: string | null
  qty: string | null
  ship_date: string | null
  order_type: string | null
  commission_status: string | null
  vendorName: string
  customerName: string
  salespersonInitials: string
  csrInitials: string
  invoice_payment_status: string | null
  invoice_paid_date: string | null
  commission_paid_date: string | null
}

type OrderTypeConfig = { id: string; order_type: string; is_commission_eligible: boolean }

type Props = {
  rows: CommissionRow[]
  selectedIds: Set<string>
  onToggle: (loadId: string) => void
  onToggleAll: () => void
  role: string | null
  orderTypeConfigs: OrderTypeConfig[]
  onRowUpdate: (loadId: string, updates: Pick<CommissionRow, 'order_type' | 'commission_status'>) => void
}

function commissionStatusClass(status: string | null) {
  if (status === 'Paid' || status === 'Commission Paid') return 'text-xs font-medium text-green-700 dark:text-green-400'
  if (status === 'Pending' || status === 'Eligible') return 'text-xs font-medium text-amber-700 dark:text-amber-400'
  return 'text-xs text-muted-foreground'
}

export function CommissionTable({ rows, selectedIds, onToggle, onToggleAll, role, orderTypeConfigs, onRowUpdate }: Props) {
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null)
  const [savingLoadId, setSavingLoadId] = useState<string | null>(null)

  const canSelect = role === 'ADMIN' || role === 'ACCOUNTING'
  const canEdit = role === 'ADMIN' || role === 'ACCOUNTING'
  const allSelected = rows.length > 0 && rows.every(r => selectedIds.has(r.load_id))

  const selectedRows = rows.filter(r => selectedIds.has(r.load_id))
  const totalQty = selectedRows.reduce((acc, r) => acc + (parseFloat(r.qty ?? '0') || 0), 0)
  const totalCommission = totalQty * COMMISSION_RATE_PER_UNIT

  const TOTAL_COLS = 13 + (canSelect ? 1 : 0)

  async function handleOrderTypeChange(loadId: string, prevType: string | null, newType: string) {
    if (newType === (prevType ?? '')) { setEditingLoadId(null); return }
    setSavingLoadId(loadId)
    try {
      const res = await fetch(`/api/commission/split-load/${loadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_type: newType }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const updated = await res.json()
      onRowUpdate(loadId, { order_type: updated.order_type, commission_status: updated.commission_status })
    } catch {
      toast.error('Failed to update order type')
    } finally {
      setSavingLoadId(null)
      setEditingLoadId(null)
    }
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            {canSelect && (
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  className="h-4 w-4 rounded border-border accent-[#00205B] cursor-pointer"
                  aria-label="Select all"
                />
              </th>
            )}
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vendor</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Customer</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Sales/CSR</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">MPH PO</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Cust PO</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ship Date</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Order Type</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Comm Status</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Invoice Status</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Invoice Paid Date</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Comm Paid Date</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={TOTAL_COLS}
                className="px-3 py-8 text-center text-sm text-muted-foreground"
              >
                No commissions found.
              </td>
            </tr>
          ) : rows.map(row => (
            <tr
              key={row.load_id}
              className={`hover:bg-muted/30 transition-colors${selectedIds.has(row.load_id) ? ' bg-muted/20' : ''}`}
            >
              {canSelect && (
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.load_id)}
                    onChange={() => onToggle(row.load_id)}
                    className="h-4 w-4 rounded border-border accent-[#00205B] cursor-pointer"
                    aria-label={`Select load ${row.mphPo}`}
                  />
                </td>
              )}
              <td className="px-3 py-2">{row.vendorName}</td>
              <td className="px-3 py-2">{row.customerName}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {row.salespersonInitials}/{row.csrInitials}
              </td>
              <td className="px-3 py-2 font-mono">
                <Link
                  href={`/orders/${row.order_id}`}
                  target="_blank"
                  className="hover:underline text-primary"
                >
                  {row.mphPo}
                </Link>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{row.customerPo ?? '—'}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.description ?? '—'}</td>
              <td className="px-3 py-2 text-muted-foreground">{formatDate(row.ship_date)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.qty != null ? parseFloat(row.qty).toString() : '—'}</td>
              <td className="px-3 py-2 min-w-[160px]">
                {canEdit && editingLoadId === row.load_id ? (
                  <select
                    autoFocus
                    disabled={savingLoadId === row.load_id}
                    defaultValue={row.order_type ?? ''}
                    onChange={e => handleOrderTypeChange(row.load_id, row.order_type, e.target.value)}
                    onBlur={e => handleOrderTypeChange(row.load_id, row.order_type, e.target.value)}
                    className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#00205B]"
                  >
                    <option value="">— none —</option>
                    {orderTypeConfigs.map(c => (
                      <option key={c.id} value={c.order_type}>{c.order_type}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => canEdit && setEditingLoadId(row.load_id)}
                    className={`text-left text-xs ${canEdit ? 'cursor-pointer hover:underline' : 'cursor-default'} text-muted-foreground`}
                    title={canEdit ? 'Click to edit order type' : undefined}
                  >
                    {row.order_type ?? '—'}
                  </button>
                )}
              </td>
              <td className="px-3 py-2">
                <span className={commissionStatusClass(row.commission_status)}>
                  {row.commission_status ?? '—'}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className={
                  row.invoice_payment_status === 'Paid'
                    ? 'text-xs font-medium text-green-700 dark:text-green-400'
                    : row.invoice_payment_status === 'Invoiced'
                    ? 'text-xs font-medium text-amber-700 dark:text-amber-500'
                    : 'text-xs text-muted-foreground'
                }>
                  {row.invoice_payment_status ?? '—'}
                </span>
              </td>
              <td className="px-3 py-2 text-sm">{row.invoice_paid_date ? formatDate(row.invoice_paid_date) : '—'}</td>
              <td className="px-3 py-2 text-sm">{row.commission_paid_date ? formatDate(row.commission_paid_date) : '—'}</td>
            </tr>
          ))}
        </tbody>
        {selectedIds.size > 0 && (
          <tfoot className="border-t bg-muted/30 text-sm font-medium">
            <tr>
              <td
                colSpan={TOTAL_COLS - 1}
                className="px-3 py-2 text-right text-muted-foreground"
              >
                Selected ({selectedIds.size} loads):
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {totalQty} units · ${totalCommission.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
