'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CreditMemoLineItems, type LineItemDraft } from './credit-memo-line-items'
import { buildCreditMemoPayload } from '@/lib/invoicing/build-credit-memo-payload'

type CustomerOption = { id: string; name: string }

type CreditMemoData = {
  id?: string
  credit_number: string
  credit_date: string
  customer_id: string
  notes: string
  status?: string
  line_items: LineItemDraft[]
}

type Props = {
  open: boolean
  editId: string | null
  onClose: () => void
  onSaved: () => void
}

export function CreditMemoForm({ open, editId, onClose, onSaved }: Props) {
  const isEdit = !!editId

  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState<CreditMemoData>({
    credit_number: '',
    credit_date: today,
    customer_id: '',
    notes: '',
    line_items: [],
  })
  const [customers, setCustomers]   = useState<CustomerOption[]>([])
  const [saving, setSaving]         = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [finalizeError, setFinalizeError] = useState('')
  const [loadingEdit, setLoadingEdit] = useState(false)

  useEffect(() => {
    fetch('/api/customers?limit=500')
      .then(r => r.json())
      .then((data: { customers?: CustomerOption[] }) => {
        setCustomers(data.customers ?? [])
      })
      .catch(() => toast.error('Failed to load customers'))
  }, [])

  useEffect(() => {
    if (!open) return
    if (!editId) {
      setForm({ credit_number: '', credit_date: today, customer_id: '', notes: '', line_items: [] })
      return
    }
    setLoadingEdit(true)
    fetch(`/api/credit-memos/${editId}`)
      .then(r => r.json())
      .then((data: {
        credit_number?: string | null
        credit_date?: string
        customer_id?: string
        notes?: string | null
        status?: string
        line_items?: Array<{
          id?: string
          activity_type?: string | null
          description?: string | null
          qty?: string | null
          rate?: string | null
          amount?: string | null
          sort_order?: number
        }>
      }) => {
        setForm({
          credit_number: data.credit_number ?? '',
          credit_date:   data.credit_date ?? today,
          customer_id:   data.customer_id ?? '',
          notes:         data.notes ?? '',
          status:        data.status,
          line_items: (data.line_items ?? []).map((li, i) => ({
            id:            li.id,
            activity_type: li.activity_type ?? '',
            description:   li.description ?? '',
            qty:           li.qty ?? '',
            rate:          li.rate ?? '',
            amount:        li.amount ?? '',
            sort_order:    li.sort_order ?? i,
          })),
        })
      })
      .catch(() => toast.error('Failed to load credit memo'))
      .finally(() => setLoadingEdit(false))
  }, [open, editId])

  function field(key: keyof CreditMemoData, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.customer_id || !form.credit_date) {
      toast.error('Customer and Credit Date are required')
      return
    }
    setSaving(true)
    try {
      const url    = isEdit ? `/api/credit-memos/${editId}` : '/api/credit-memos'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCreditMemoPayload(form)),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Save failed')
      }
      toast.success('Credit memo saved as Draft')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleFinalize() {
    if (!editId) return
    if (!form.credit_number.trim()) {
      setFinalizeError('QBO Credit # is required to finalize')
      return
    }
    setFinalizeError('')
    setFinalizing(true)
    try {
      if (isEdit) {
        const saveRes = await fetch(`/api/credit-memos/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildCreditMemoPayload(form)),
        })
        if (!saveRes.ok) throw new Error('Save before finalize failed')
      }
      const memoId = editId ?? ''
      const res = await fetch(`/api/credit-memos/${memoId}/finalize`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Finalize failed')
      }
      toast.success('Credit memo finalized')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Finalize failed')
    } finally {
      setFinalizing(false)
    }
  }

  const isFinal = form.status === 'Final'

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-[680px] max-w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Credit Memo' : 'New Credit Memo'}</SheetTitle>
        </SheetHeader>

        {loadingEdit ? (
          <p className="py-8 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Customer *</label>
              <select
                value={form.customer_id}
                onChange={e => field('customer_id', e.target.value)}
                disabled={isFinal}
                className="h-9 rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B] disabled:opacity-60"
              >
                <option value="">Select customer…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Credit Date *</label>
                <input
                  type="date"
                  value={form.credit_date}
                  onChange={e => field('credit_date', e.target.value)}
                  disabled={isFinal}
                  className="h-9 rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B] disabled:opacity-60"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  QBO Credit # <span className="font-normal text-muted-foreground">(enter after creating in QBO)</span>
                </label>
                <input
                  type="text"
                  value={form.credit_number}
                  onChange={e => { field('credit_number', e.target.value); setFinalizeError('') }}
                  disabled={isFinal}
                  placeholder="e.g. 1045"
                  className="h-9 rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B] disabled:opacity-60"
                />
                {finalizeError && <p className="text-xs text-red-500">{finalizeError}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => field('notes', e.target.value)}
                disabled={isFinal}
                rows={2}
                className="resize-none rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B] disabled:opacity-60"
              />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Line Items</h3>
              {isFinal ? (
                <p className="text-xs text-muted-foreground">This credit memo is finalized and cannot be edited.</p>
              ) : (
                <CreditMemoLineItems
                  items={form.line_items}
                  onChange={items => setForm(f => ({ ...f, line_items: items }))}
                />
              )}
            </div>

            {!isFinal && (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || finalizing}
                  className="rounded-md bg-[#00205B] px-4 py-2 text-sm font-medium text-white hover:bg-[#001845] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
                {isEdit && (
                  <button
                    type="button"
                    onClick={handleFinalize}
                    disabled={saving || finalizing}
                    className="rounded-md border border-[#B88A44] bg-[#B88A44]/10 px-4 py-2 text-sm font-medium text-[#B88A44] hover:bg-[#B88A44]/20 transition-colors disabled:opacity-50"
                  >
                    {finalizing ? 'Finalizing…' : 'Finalize'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            )}
            {isFinal && (
              <div className="flex gap-2 pt-2">
                <a
                  href={`/api/credit-memos/${editId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-[#00205B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B88A44] transition-colors"
                >
                  View PDF
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
