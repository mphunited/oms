'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { INVOICE_PAYMENT_STATUSES, COMMISSION_STATUSES } from '@/lib/db/schema'
import type { SplitLoadValue } from '@/lib/orders/order-form-schema'

function computeMargin(
  loads: SplitLoadValue[],
  freightCost: string,
  freightToCustomer: string,
  additionalCosts: string,
  commissionStatus: string,
) {
  let revenue = 0, grossProfit = 0, totalQty = 0
  for (const l of loads) {
    const qty = parseFloat(l.qty) || 0
    const sell = parseFloat(l.sell) || 0
    const buy = parseFloat(l.buy) || 0
    const bc = parseFloat(l.bottle_cost) || 0
    const bq = parseFloat(l.bottle_qty) || 0
    const mf = parseFloat(l.mph_freight_bottles) || 0
    revenue += sell * qty
    grossProfit += (sell - buy) * qty - bc * bq - (mf / 90) * bq
    totalQty += qty
  }
  const ftc = parseFloat(freightToCustomer) || 0
  const fc = parseFloat(freightCost) || 0
  const ac = parseFloat(additionalCosts) || 0
  const commDeduction = commissionStatus === 'Eligible' ? totalQty * 3 : 0
  const totalRevenue = revenue + ftc
  const profit = grossProfit + ftc - fc - ac - commDeduction
  const pct = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
  return { profit, totalRevenue, pct }
}

type EditOrderSidebarProps = {
  loads: SplitLoadValue[]
  freightCost: string
  freightToCustomer: string
  additionalCosts: string
  saving: boolean
  saved: boolean
  flag: boolean
  isBlind: boolean
  isRevised: boolean
  invoicePaymentStatus: string
  commissionStatus: string
  qbInvoiceNumber: string
  onFlagChange: (v: boolean) => void
  onIsBlindChange: (v: boolean) => void
  onIsRevisedChange: (v: boolean) => void
  onInvoiceStatusChange: (v: string) => void
  onCommissionStatusChange: (v: string) => void
  onQbInvoiceNumberChange: (v: string) => void
  onSave: () => void
}

export function EditOrderSidebar({
  loads, freightCost, freightToCustomer, additionalCosts,
  saving, saved, flag, isBlind, isRevised,
  invoicePaymentStatus, commissionStatus, qbInvoiceNumber,
  onFlagChange, onIsBlindChange, onIsRevisedChange,
  onInvoiceStatusChange, onCommissionStatusChange, onQbInvoiceNumberChange,
  onSave,
}: EditOrderSidebarProps) {
  const margin = computeMargin(loads, freightCost, freightToCustomer, additionalCosts, commissionStatus)

  return (
    <aside className="w-64 shrink-0 sticky top-6 space-y-4">

      {/* Save */}
      <div className="space-y-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && <p className="text-center text-sm text-green-600 dark:text-green-400">Saved.</p>}
      </div>

      {/* Status & Invoicing */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status & Invoicing</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">Invoice Payment Status</Label>
          <Select value={invoicePaymentStatus} onValueChange={v => { if (v) onInvoiceStatusChange(v) }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {INVOICE_PAYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Commission Status</Label>
          <Select value={commissionStatus} onValueChange={v => { if (v) onCommissionStatusChange(v) }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COMMISSION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">QB Invoice Number</Label>
          <Input
            className="h-8 text-xs"
            value={qbInvoiceNumber}
            onChange={e => onQbInvoiceNumberChange(e.target.value)}
            placeholder="QuickBooks invoice #"
          />
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch id="flag" checked={flag} onCheckedChange={onFlagChange} />
            <Label htmlFor="flag" className="cursor-pointer text-sm">Flagged</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="is_blind" checked={isBlind} onCheckedChange={onIsBlindChange} />
            <Label htmlFor="is_blind" className="cursor-pointer text-sm">Blind Shipment</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="is_revised" checked={isRevised} onCheckedChange={onIsRevisedChange} />
            <Label htmlFor="is_revised" className="cursor-pointer text-sm">Revised PO</Label>
          </div>
        </div>
      </div>

      {/* Live Margin */}
      <div className={`rounded-lg border p-4 space-y-2 ${margin.pct < 8 && margin.totalRevenue > 0 ? 'border-destructive bg-destructive/5' : 'border-border bg-card'}`}>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Live Margin</h3>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Revenue</span>
          <span className="font-medium">${margin.totalRevenue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Profit</span>
          <span className={`font-medium ${margin.profit < 0 ? 'text-destructive' : ''}`}>${margin.profit.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span>Margin</span>
          <span className={margin.pct < 8 && margin.totalRevenue > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}>
            {margin.totalRevenue > 0 ? `${margin.pct.toFixed(1)}%` : '—'}
          </span>
        </div>
        {margin.pct < 8 && margin.totalRevenue > 0 && (
          <p className="text-xs text-destructive">Below 8% threshold</p>
        )}
      </div>

    </aside>
  )
}
