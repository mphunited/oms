'use client'

import { Plus, Trash2 } from 'lucide-react'

export type LineItemDraft = {
  id?: string
  activity_type: string
  description: string
  qty: string
  rate: string
  amount: string
  sort_order: number
}

type Props = {
  items: LineItemDraft[]
  onChange: (items: LineItemDraft[]) => void
}

function calcAmount(qty: string, rate: string): string {
  const q = parseFloat(qty), r = parseFloat(rate)
  if (isNaN(q) || isNaN(r)) return ''
  return (q * r).toFixed(2)
}

export function CreditMemoLineItems({ items, onChange }: Props) {
  function add() {
    onChange([...items, { activity_type: '', description: '', qty: '', rate: '', amount: '', sort_order: items.length }])
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i).map((item, idx) => ({ ...item, sort_order: idx })))
  }

  function update(i: number, field: keyof LineItemDraft, value: string) {
    const updated = items.map((item, idx) => {
      if (idx !== i) return item
      const next = { ...item, [field]: value }
      if (field === 'qty' || field === 'rate') {
        next.amount = calcAmount(
          field === 'qty' ? value : item.qty,
          field === 'rate' ? value : item.rate,
        )
      }
      return next
    })
    onChange(updated)
  }

  const total = items.reduce((sum, item) => {
    const v = parseFloat(item.amount)
    return sum + (isNaN(v) ? 0 : v)
  }, 0)

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground w-[22%]">Activity Type</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground w-[32%]">Description</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground w-[10%]">Qty</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground w-[13%]">Rate</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground w-[13%]">Amount</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No line items yet. Click Add Line to get started.
                </td>
              </tr>
            )}
            {items.map((item, i) => (
              <tr key={i}>
                <td className="px-2 py-1.5">
                  <input
                    value={item.activity_type}
                    onChange={e => update(i, 'activity_type', e.target.value)}
                    placeholder="IBC, Sales, COGS…"
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#00205B]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <textarea
                    value={item.description}
                    onChange={e => update(i, 'description', e.target.value)}
                    placeholder="PO reference, reason…"
                    rows={1}
                    className="w-full resize-none rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#00205B]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    value={item.qty}
                    onChange={e => update(i, 'qty', e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#00205B]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    step="0.01"
                    value={item.rate}
                    onChange={e => update(i, 'rate', e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#00205B]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    step="0.01"
                    value={item.amount}
                    onChange={e => update(i, 'amount', e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#00205B]"
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 text-xs text-[#00205B] hover:text-[#B88A44] font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Line
        </button>
        <span className="text-sm font-semibold text-[#00205B]">
          Total: ${total.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
