'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format-date'

export type InvoiceQueueRow = {
  id: string
  order_number: string
  status: string
  customer_po: string | null
  customer_id: string
  ship_date: string | null
  invoice_payment_status: string
  qb_invoice_number: string | null
  invoice_paid_date: string | null
  customer_name: string | null
  salesperson_name: string | null
  salesperson_commission_eligible: boolean | null
  csr_name: string | null
  csr2_name: string | null
  split_loads: Array<{ order_type: string | null; customer_po: string | null; order_number_override: string | null }>
}

type Props = {
  row: InvoiceQueueRow
  onOpenDrawer: (orderId: string) => void
  onSaved: () => void
}

const STATUS_OPTIONS = ['Not Invoiced', 'Invoiced', 'Paid'] as const

export function InvoiceRow({ row, onOpenDrawer, onSaved }: Props) {
  const hasRSuffix = !!row.salesperson_commission_eligible

  const storedNum = row.qb_invoice_number ?? ''
  const displayNum = hasRSuffix && storedNum.endsWith('R')
    ? storedNum.slice(0, -1)
    : storedNum

  const [invoiceNum, setInvoiceNum]   = useState(displayNum)
  const [status, setStatus]           = useState(row.invoice_payment_status)
  const [paidDate, setPaidDate]       = useState(row.invoice_paid_date ?? '')
  const [saving, setSaving]           = useState(false)
  const [dateError, setDateError]     = useState(false)
  const [confirmDemote, setConfirmDemote] = useState(false)

  const wasOriginallyPaid = row.invoice_payment_status === 'Paid'
  const isDemoting = wasOriginallyPaid && status !== 'Paid'

  const today = new Date().toISOString().slice(0, 10)
  const isPastShipDate = !!row.ship_date && row.ship_date < today

  function buildStoredInvoiceNum(): string | null {
    if (!invoiceNum.trim()) return null
    return hasRSuffix ? `${invoiceNum.trim()}R` : invoiceNum.trim()
  }

  async function doSave() {
    if (status === 'Paid' && !paidDate) {
      setDateError(true)
      return
    }
    setDateError(false)
    setSaving(true)
    try {
      const res = await fetch(`/api/orders/${row.id}/invoice`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qb_invoice_number:      buildStoredInvoiceNum(),
          invoice_payment_status: status,
          invoice_paid_date:      status === 'Paid' ? paidDate : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Save failed')
      }
      toast.success(`Invoice updated for ${row.order_number}`)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  function handleSave() {
    if (isDemoting) {
      setConfirmDemote(true)
    } else {
      void doSave()
    }
  }

  const firstLoad = row.split_loads[0]
  const displayCustPo = firstLoad?.customer_po || row.customer_po
  const orderType = firstLoad?.order_type ?? '—'

  const spParts = [row.salesperson_name, row.csr_name]
  if (row.csr2_name) spParts.push(row.csr2_name)
  const spCsr = spParts.filter(Boolean).join(' / ')

  return (
    <>
      <tr className={`group border-b hover:bg-muted/20 transition-colors${isPastShipDate && row.status !== 'Ready To Invoice' ? ' bg-amber-50/60 dark:bg-amber-950/30' : ''}`}>
        <td className="px-3 py-2">
          <button
            onClick={() => onOpenDrawer(row.id)}
            className="font-mono text-sm font-medium text-[#00205B] hover:underline dark:text-[#E5C678]"
          >
            {row.order_number}
          </button>
        </td>
        <td className="px-3 py-2 text-sm">{row.customer_name ?? '—'}</td>
        <td className="px-3 py-2 text-sm text-muted-foreground">{displayCustPo ?? '—'}</td>
        <td className="px-3 py-2 text-sm text-muted-foreground">{orderType}</td>
        <td className={`px-3 py-2 text-sm whitespace-nowrap${isPastShipDate ? ' font-medium text-amber-700 dark:text-amber-400' : ' text-muted-foreground'}`}>
          {formatDate(row.ship_date)}
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={invoiceNum}
              onChange={e => setInvoiceNum(e.target.value)}
              placeholder="—"
              className="h-7 w-24 rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B]"
            />
            {hasRSuffix && (
              <span className="text-sm font-medium text-muted-foreground select-none">R</span>
            )}
          </div>
        </td>
        <td className="px-3 py-2 text-sm text-muted-foreground">{spCsr || '—'}</td>
        <td className="px-3 py-2">
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="h-7 rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B]"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <div className="flex flex-col gap-0.5">
            <input
              type="date"
              value={paidDate}
              onChange={e => { setPaidDate(e.target.value); setDateError(false) }}
              disabled={status !== 'Paid'}
              className={`h-7 rounded border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B] disabled:opacity-40 ${dateError ? 'border-red-500' : 'border-border bg-background'}`}
            />
            {dateError && <span className="text-xs text-red-500">Required</span>}
          </div>
        </td>
        <td className="px-3 py-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-[#00205B] px-3 py-1 text-xs font-medium text-white hover:bg-[#B88A44] transition-colors disabled:opacity-50"
          >
            {saving ? '…' : 'Save'}
          </button>
        </td>
      </tr>

      {confirmDemote && (
        <tr>
          <td colSpan={10}>
            <div className="mx-3 my-1 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-3 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                This will reset commission eligibility for this order. Are you sure?
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => { setConfirmDemote(false); void doSave() }}
                  className="rounded-md bg-amber-700 px-3 py-1 text-xs font-medium text-white hover:bg-amber-800"
                >
                  Yes, reset commission
                </button>
                <button
                  onClick={() => setConfirmDemote(false)}
                  className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
