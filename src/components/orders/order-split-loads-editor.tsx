'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type SplitLoadValue = {
  id?: string
  description: string
  part_number: string
  qty: string
  buy: string
  sell: string
  bottle_cost: string
  bottle_qty: string
  mph_freight_bottles: string
  order_number_override: string
}

function emptyLoad(): SplitLoadValue {
  return {
    description: '', part_number: '', qty: '', buy: '', sell: '',
    bottle_cost: '', bottle_qty: '', mph_freight_bottles: '', order_number_override: '',
  }
}

const BOTTLE_KEYWORDS = ['Bottle', 'Rebottle', 'Washout', 'Wash & Return']

export function OrderSplitLoadsEditor({
  loads,
  orderType,
  onChange,
}: {
  loads: SplitLoadValue[]
  orderType: string
  onChange: (loads: SplitLoadValue[]) => void
}) {
  const showBottleFields = BOTTLE_KEYWORDS.some(kw => orderType.includes(kw))

  function update(index: number, field: keyof SplitLoadValue, value: string) {
    onChange(loads.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  function add() {
    onChange([...loads, emptyLoad()])
  }

  function remove(index: number) {
    if (loads.length === 1) return // always keep at least one
    onChange(loads.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Line Items</h3>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Split Load
        </button>
      </div>

      {loads.map((load, index) => (
        <div key={index} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {index === 0 ? 'Load 1 (Primary)' : `Load ${index + 1}`}
            </span>
            {index > 0 && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-4 space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input value={load.description} onChange={e => update(index, 'description', e.target.value)} placeholder="Product description" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Part #</Label>
              <Input value={load.part_number} onChange={e => update(index, 'part_number', e.target.value)} placeholder="Optional" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Qty</Label>
              <Input type="number" min="0" step="1" value={load.qty} onChange={e => update(index, 'qty', e.target.value)} placeholder="0" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Buy</Label>
              <Input type="number" min="0" step="0.01" value={load.buy} onChange={e => update(index, 'buy', e.target.value)} placeholder="0.00" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Sell</Label>
              <Input type="number" min="0" step="0.01" value={load.sell} onChange={e => update(index, 'sell', e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {showBottleFields && (
            <div className="grid grid-cols-3 gap-3 pt-2 border-t">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Bottle Cost</Label>
                <Input type="number" min="0" step="0.01" value={load.bottle_cost} onChange={e => update(index, 'bottle_cost', e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Bottle Qty</Label>
                <Input type="number" min="0" step="1" value={load.bottle_qty} onChange={e => update(index, 'bottle_qty', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">MPH Freight Bottles</Label>
                <Input type="number" min="0" step="1" value={load.mph_freight_bottles} onChange={e => update(index, 'mph_freight_bottles', e.target.value)} placeholder="0" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}