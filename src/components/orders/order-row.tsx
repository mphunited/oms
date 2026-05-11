'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, ClipboardList, Copy, Flag, NotebookText, Pencil, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FullSplitLoad } from './split-load-sub-row'
import { formatDate } from '@/lib/utils/format-date'
import { formatCurrency, firstDescription, firstQty } from '@/lib/utils/order-table-utils'
import { formatVendorName } from '@/lib/utils/format-vendor-name'
import { getBadgeColor, getBadgeTextColor } from '@/lib/orders/badge-colors'

function firstName(full: string | null | undefined): string {
  if (!full) return '—'
  return full.trim().split(' ')[0]
}

type BadgeMeta = Record<string, { color: string }> | null

type ChecklistItem = { label: string; done: boolean }

type OrderNotes = {
  po_notes: string | null
  freight_invoice_notes: string | null
  misc_notes: string | null
}

export type OrderRow = {
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
  customer_name: string | null
  vendor_name: string | null
  salesperson_name: string | null
  csr_name: string | null
  csr2_name: string | null
  ship_to: { name?: string | null; city?: string | null; state?: string | null } | null
  split_loads: FullSplitLoad[]
  group_id: string | null
  group_po_number: string | null
  misc_notes: string | null
  po_notes: string | null
  freight_invoice_notes: string | null
  checklist: { label: string; done: boolean }[] | null
}

type Props = {
  order: OrderRow
  rowIndex: number
  expanded: boolean
  selected: boolean
  role: string | null
  statusOptions: string[]
  statusMeta: BadgeMeta
  carrierMeta: BadgeMeta
  onToggleExpand: () => void
  onToggleSelect: () => void
  onToggleFlag: () => void
  onPatchStatus: (status: string) => void
  onOpenSummary?: (id: string) => void
}

// ─── Checklist Popup ──────────────────────────────────────────────────────────

function ChecklistPopup({
  orderId,
  orderNumber,
  onClose,
}: {
  orderId: string
  orderNumber: string
  onClose: () => void
}) {
  const [items, setItems] = useState<ChecklistItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch checklist on mount
  const fetchChecklist = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setItems(
        Array.isArray(data.checklist) && data.checklist.length > 0
          ? data.checklist
          : []
      )
    } catch {
      setError('Could not load checklist.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  // Run fetch once on mount
  useEffect(() => { fetchChecklist() }, [fetchChecklist])

  async function toggleItem(index: number) {
    if (!items) return
    const updated = items.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    )
    setItems(updated)
    setSaving(index)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist: updated }),
      })
      if (!res.ok) throw new Error('Failed')
    } catch {
      // Revert on failure
      setItems(items)
    } finally {
      setSaving(null)
    }
  }

  const doneCount = items?.filter(i => i.done).length ?? 0
  const totalCount = items?.length ?? 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-lg border bg-background shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-semibold text-sm">{orderNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">CSR Checklist</p>
          </div>
          <div className="flex items-center gap-3">
            {totalCount > 0 && (
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {doneCount}/{totalCount}
              </span>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors text-muted-foreground"
              aria-label="Close checklist"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive py-4 text-center">{error}</p>
          ) : totalCount === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No checklist items for this order.
            </p>
          ) : (
            <ul className="space-y-1">
              {items!.map((item, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => toggleItem(i)}
                    disabled={saving === i}
                    className="w-full flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted/50 transition-colors disabled:opacity-60"
                  >
                    {/* Checkbox */}
                    <span
                      className={`flex-shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                        item.done
                          ? 'bg-[#00205B] border-[#00205B]'
                          : 'border-border bg-background'
                      }`}
                    >
                      {item.done && (
                        <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span
                      className={`text-sm flex-1 ${item.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                    >
                      {item.label}
                    </span>
                    {saving === i && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="px-4 pb-3">
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-[#00205B] transition-all duration-300"
                style={{ width: `${(doneCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Notes Popup ──────────────────────────────────────────────────────────────

function NotesPopup({
  orderId,
  orderNumber,
  onClose,
}: {
  orderId: string
  orderNumber: string
  onClose: () => void
}) {
  const [notes, setNotes] = useState<OrderNotes | null>(null)
  const [draft, setDraft] = useState<OrderNotes | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      const initial: OrderNotes = {
        po_notes: data.po_notes ?? '',
        freight_invoice_notes: data.freight_invoice_notes ?? '',
        misc_notes: data.misc_notes ?? '',
      }
      setNotes(initial)
      setDraft(initial)
    } catch {
      setError('Could not load notes.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const isDirty =
    draft !== null &&
    notes !== null &&
    (draft.po_notes !== notes.po_notes ||
      draft.freight_invoice_notes !== notes.freight_invoice_notes ||
      draft.misc_notes !== notes.misc_notes)

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_notes: draft.po_notes || null,
          freight_invoice_notes: draft.freight_invoice_notes || null,
          misc_notes: draft.misc_notes || null,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      setNotes(draft)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative z-10 w-full max-w-md mx-4 rounded-lg border bg-background shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-semibold text-sm">{orderNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Order Notes</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors text-muted-foreground"
            aria-label="Close notes"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive text-center py-4">{error}</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  PO Notes
                </label>
                <textarea
                  value={draft?.po_notes ?? ''}
                  onChange={e => setDraft(d => d ? { ...d, po_notes: e.target.value } : d)}
                  rows={3}
                  placeholder="No PO notes…"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#00205B] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Freight / Invoice Notes
                </label>
                <textarea
                  value={draft?.freight_invoice_notes ?? ''}
                  onChange={e => setDraft(d => d ? { ...d, freight_invoice_notes: e.target.value } : d)}
                  rows={3}
                  placeholder="No freight or invoice notes…"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#00205B] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Misc Notes
                </label>
                <textarea
                  value={draft?.misc_notes ?? ''}
                  onChange={e => setDraft(d => d ? { ...d, misc_notes: e.target.value } : d)}
                  rows={3}
                  placeholder="No misc notes…"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#00205B] resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className={`text-xs transition-opacity duration-300 ${saved ? 'text-green-600 opacity-100' : 'opacity-0'}`}>
              Saved
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="inline-flex items-center gap-2 rounded-md bg-[#00205B] px-3 py-1.5 text-sm text-white hover:bg-[#00205B]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                {saving ? 'Saving…' : 'Save Notes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Row ─────────────────────────────────────────────────────────────────

export function OrderTableRow({
  order, rowIndex, expanded, selected, role, statusOptions, statusMeta, carrierMeta,
  onToggleExpand, onToggleSelect, onToggleFlag, onPatchStatus, onOpenSummary,
}: Props) {
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const router = useRouter()

  async function handleDuplicate() {
    setDuplicating(true)
    try {
      const res = await fetch(`/api/orders/duplicate/${order.id}`, { method: 'POST' })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json() as { id: string }
      router.push(`/orders/${data.id}`)
    } catch {
      alert('Failed to duplicate order')
      setDuplicating(false)
    }
  }

  const showLoadLabels = order.split_loads.length > 1
  const statusColor = getBadgeColor(statusMeta, order.status)
  const statusTextColor = getBadgeTextColor(statusColor)
  const hasNotes = !!(
    (order.misc_notes && order.misc_notes.trim()) ||
    (order.po_notes && order.po_notes.trim()) ||
    (order.freight_invoice_notes && order.freight_invoice_notes.trim())
  )
  const hasIncompleteChecklist = !!(
    order.checklist &&
    order.checklist.length > 0 &&
    order.checklist.some(item => !item.done)
  )

  return (
    <>
      <tr className={cn(
        'group h-[52px] hover:bg-muted/30 transition-colors',
        order.flag ? '!bg-[#fef2f2]' : rowIndex % 2 === 0 ? 'bg-[#f3f4f6]' : 'bg-white',
      )}>
        {/* Expand */}
        <td className="px-2 py-2">
          <button type="button" onClick={onToggleExpand}
            className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
            aria-label={expanded ? `Collapse loads for ${order.order_number}` : `Expand loads for ${order.order_number}`}>
            {expanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
        </td>

        {/* Checkbox */}
        <td className="px-2 py-2">
          <input type="checkbox" checked={selected} onChange={onToggleSelect}
            className="h-4 w-4 rounded border-border accent-[#00205B] cursor-pointer"
            aria-label={`Select order ${order.order_number}`} />
        </td>

        {/* Flag */}
        <td className="px-2 py-2">
          <button type="button" onClick={onToggleFlag}
            className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
            aria-label={order.flag ? 'Remove flag' : 'Flag order'}>
            <Flag className={`h-4 w-4 ${order.flag ? 'text-red-500 fill-red-500' : 'text-slate-300 hover:text-slate-400'}`} />
          </button>
        </td>

        {/* MPH PO — order number + CSR List + Notes buttons */}
        <td className="px-3 py-2">
          <div className="flex flex-col gap-0.5">
            {/* First row: PO number + icon buttons inline */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-medium">
                {onOpenSummary ? (
                  <button
                    type="button"
                    onClick={() => onOpenSummary(order.id)}
                    className="hover:underline cursor-pointer text-primary"
                  >
                    {order.order_number}
                  </button>
                ) : (
                  <Link href={`/orders/${order.id}`} className="hover:underline text-primary">
                    {order.order_number}
                  </Link>
                )}
              </span>

              <button
                type="button"
                onClick={() => setChecklistOpen(true)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-[6px] bg-white transition-colors",
                  hasIncompleteChecklist ? "text-[#f59e0b]" : "text-[#9ca3af] hover:text-[#374151]"
                )}
                style={{ boxShadow: hasIncompleteChecklist
                  ? '0px 0px 0px 1px rgba(245,158,11,0.4), 0px 1px 2px rgba(0,0,0,0.04)'
                  : '0px 0px 0px 1px rgba(0,0,0,0.08), 0px 1px 2px rgba(0,0,0,0.04)'
                }}
                title="CSR List"
                aria-label="Open CSR checklist"
              >
                <ClipboardList size={12} />
                <span className="text-[9px] font-medium leading-none">CSR List</span>
              </button>
              <button
                type="button"
                onClick={() => setNotesOpen(true)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-[6px] bg-white transition-colors",
                  hasNotes ? "text-[#f59e0b]" : "text-[#9ca3af] hover:text-[#374151]"
                )}
                style={{ boxShadow: hasNotes
                  ? '0px 0px 0px 1px rgba(245,158,11,0.4), 0px 1px 2px rgba(0,0,0,0.04)'
                  : '0px 0px 0px 1px rgba(0,0,0,0.08), 0px 1px 2px rgba(0,0,0,0.04)'
                }}
                title="Notes"
                aria-label="Open notes"
              >
                <NotebookText size={12} />
                <span className="text-[9px] font-medium leading-none">Notes</span>
              </button>
            </div>

            {/* Group PO number below */}
            {order.group_po_number && (
              <span className="text-xs text-muted-foreground font-mono">
                Group: {order.group_po_number}
              </span>
            )}
          </div>
        </td>

        {/* Status — colored select for non-SALES, colored badge for SALES */}
        <td className="w-[148px] min-w-[148px] max-w-[148px] px-3 py-2 align-top">
          {role === 'SALES' ? (
            <div
              className="w-full rounded-md px-2.5 py-1 text-[11px] font-medium text-center whitespace-normal break-words leading-snug"
              style={{ backgroundColor: statusColor, color: statusTextColor }}
            >
              {order.status}
            </div>
          ) : (
            <Select value={order.status} onValueChange={v => { if (v) onPatchStatus(v) }}>
              <SelectTrigger
                className="!h-auto min-h-[32px] w-full whitespace-normal text-xs font-medium cursor-pointer px-1.5 py-1 rounded focus:ring-1 focus:ring-[#00205B] focus:ring-offset-0"
                style={{ backgroundColor: statusColor, color: statusTextColor, borderColor: statusColor }}
              >
                <SelectValue className="!line-clamp-none whitespace-normal break-words leading-snug" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </td>

        {/* Sales / CSR */}
        <td className="px-3 py-2 text-muted-foreground text-xs">
          {firstName(order.salesperson_name)} / {
            order.csr2_name
              ? `${firstName(order.csr_name)} / ${firstName(order.csr2_name)}`
              : firstName(order.csr_name)
          }
        </td>

        <td className="px-3 py-2">
          <div className="flex flex-col">
            <span>{order.customer_name ?? '—'}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-muted-foreground">
          <div className="flex flex-col">
            <span>{order.split_loads[0]?.customer_po ?? order.customer_po ?? ''}</span>
            {(() => {
              const loads = order.split_loads
              const hasWashReturn = loads.some(l => l.order_type?.includes('Wash & Return'))
              if (hasWashReturn) {
                return (
                  <span className="text-xs rounded px-1.5 py-0.5 font-medium mt-0.5 inline-block bg-[#B88A44]/15 text-[#B88A44]">
                    Wash &amp; Return
                  </span>
                )
              }
              if (loads.length > 1) {
                return (
                  <span className="text-xs rounded px-1.5 py-0.5 font-medium mt-0.5 inline-block bg-muted text-muted-foreground">
                    Split Load
                  </span>
                )
              }
              return null
            })()}
          </div>
        </td>
        <td className="px-3 py-2 text-muted-foreground whitespace-normal break-words">
          {firstDescription(order.split_loads)}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">{firstQty(order.split_loads)}</td>
        <td className="px-3 py-2 text-muted-foreground">{formatDate(order.ship_date)}</td>
        <td className="px-3 py-2 text-muted-foreground">{order.vendor_name ? formatVendorName(order.vendor_name) : '—'}</td>
        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(order.split_loads[0]?.buy, true)}</td>
        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(order.split_loads[0]?.sell, true)}</td>

        {/* Ship To */}
        <td className="px-3 py-2">
          {order.ship_to ? (
            <div className="flex flex-col">
              <span>{order.ship_to.name ?? '—'}</span>
              {(order.ship_to.city || order.ship_to.state) && (
                <span className="text-xs text-muted-foreground">
                  {[order.ship_to.city, order.ship_to.state].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          ) : <span className="text-muted-foreground">—</span>}
        </td>

        {/* Carrier badge */}
        <td className="px-3 py-2">
          {order.freight_carrier ? (() => {
            const color = getBadgeColor(carrierMeta, order.freight_carrier)
            const textColor = getBadgeTextColor(color)
            return (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: color, color: textColor }}
              >
                {order.freight_carrier}
              </span>
            )
          })() : <span className="text-muted-foreground">—</span>}
        </td>

        {/* Actions */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => router.push(`/orders/${order.id}`)}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Edit order"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={duplicating}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              aria-label="Duplicate order"
            >
              {duplicating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded split loads */}
      {expanded && (
        <tr>
          <td colSpan={18} className="px-6 py-3 bg-muted/20">
            {order.split_loads.map((load, index) => (
              <div
                key={load.id}
                className="bg-muted/40 rounded-md p-3 mb-2 last:mb-0 border-l-4 border-[#B88A44]"
              >
                {showLoadLabels && (
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Load {index + 1}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span><span className="text-xs text-muted-foreground mr-1">Load PO</span><span className="text-sm font-medium font-mono">{load.order_number_override ?? order.order_number}</span></span>
                  <span><span className="text-xs text-muted-foreground mr-1">Customer PO</span><span className="text-sm font-medium">{load.customer_po ?? order.customer_po ?? '—'}</span></span>
                  <span><span className="text-xs text-muted-foreground mr-1">Qty</span><span className="text-sm font-medium">{load.qty != null ? parseFloat(load.qty).toString() : '—'}</span></span>
                  <span><span className="text-xs text-muted-foreground mr-1">Buy</span><span className="text-sm font-medium">{formatCurrency(load.buy, true)}</span></span>
                  <span><span className="text-xs text-muted-foreground mr-1">Sell</span><span className="text-sm font-medium">{formatCurrency(load.sell, true)}</span></span>
                  <span><span className="text-xs text-muted-foreground mr-1">Description</span><span className="text-sm font-medium">{load.description ?? '—'}</span></span>
                </div>
              </div>
            ))}
          </td>
        </tr>
      )}

      {/* Checklist popup */}
      {checklistOpen && (
        <ChecklistPopup
          orderId={order.id}
          orderNumber={order.order_number}
          onClose={() => setChecklistOpen(false)}
        />
      )}

      {/* Notes popup */}
      {notesOpen && (
        <NotesPopup
          orderId={order.id}
          orderNumber={order.order_number}
          onClose={() => setNotesOpen(false)}
        />
      )}
    </>
  )
}
