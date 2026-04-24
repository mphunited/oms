'use client'

import Link from 'next/link'
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
  vendorName: string
  customerName: string
  salespersonInitials: string
  csrInitials: string
  invoice_payment_status: string | null
  invoice_paid_date: string | null
  commission_paid_date: string | null
}

type Props = {
  rows: CommissionRow[]
  selectedIds: Set<string>
  onToggle: (loadId: string) => void
  onToggleAll: () => void
  role: string | null
}

export function CommissionTable({ rows, selectedIds, onToggle, onToggleAll, role }: Props) {
  const canSelect = role === 'ADMIN' || role === 'ACCOUNTING'
  const allSelected = rows.length > 0 && rows.every(r => selectedIds.has(r.load_id))

  const selectedRows = rows.filter(r => selectedIds.has(r.load_id))
  const totalQty = selectedRows.reduce((acc, r) => acc + (parseFloat(r.qty ?? '0') || 0), 0)
  const totalCommission = totalQty * COMMISSION_RATE_PER_UNIT

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
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Invoice Status</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Invoice Paid Date</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Comm Paid Date</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={canSelect ? 12 : 11}
                className="px-3 py-8 text-center text-sm text-muted-foreground"
              >
                No eligible commissions found.
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
              <td className="px-3 py-2 text-right tabular-nums">{row.qty ?? '—'}</td>
              <td className="px-3 py-2">
                <span className={
                  row.invoice_payment_status === 'Paid'
                    ? 'text-xs font-medium text-green-700 dark:text-green-400'
                    : row.invoice_payment_status === 'Partial'
                    ? 'text-xs font-medium text-yellow-700 dark:text-yellow-500'
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
                colSpan={canSelect ? 11 : 10}
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
