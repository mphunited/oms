'use client'

import { Trash2, Hash } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ORDER_TYPES } from '@/lib/db/schema'
import type { SplitLoadValue } from '@/lib/orders/order-form-schema'
import { BOTTLE_KEYWORDS } from '@/lib/orders/commission-eligibility'

const TERMS_VALUES = ['PPD', 'PPA', 'FOB'] as const

type SplitLoadRowProps = {
  load: SplitLoadValue
  index: number
  orderPo: string
  orderCustomerPo: string
  orderShipDate: string
  orderWantedDate: string
  terms: string
  onTermsChange: (v: string) => void
  onChange: (load: SplitLoadValue) => void
  onRemove: () => void
  onAssignPo: () => Promise<void>
  assigningPo: boolean
  isManualMode?: boolean
}

export function SplitLoadRow({
  load, index, orderPo, orderCustomerPo, orderShipDate, orderWantedDate,
  terms, onTermsChange, onChange, onRemove, onAssignPo, assigningPo,
  isManualMode = false,
}: SplitLoadRowProps) {
  const set = (field: keyof SplitLoadValue, value: string | boolean) =>
    onChange({ ...load, [field]: value })

  const showBottleFields = BOTTLE_KEYWORDS.some(kw => load.order_type.includes(kw))

  const mphPoDisplay = index === 0
    ? (orderPo || '(auto-generated on save)')
    : load.order_number_override
      ? load.order_number_override
      : load.separate_po
        ? (load.preview_po || 'Previewing…')
        : null

  return (
    <div className="rounded-lg border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {index === 0 ? 'Load 1 (Primary)' : `Load ${index + 1}`}
        </span>
        {index > 0 && (
          <button type="button" onClick={onRemove}
            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* MPH PO display */}
      <div className="flex items-center gap-2 text-xs">
        <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {index === 0 ? (
          <span className="text-muted-foreground font-mono">MPH PO: {mphPoDisplay}</span>
        ) : isManualMode ? (
          <div className="flex items-center gap-2 flex-1">
            <Label className="text-xs shrink-0">MPH PO Number</Label>
            <Input
              value={load.order_number_override}
              onChange={e => set('order_number_override', e.target.value)}
              placeholder="Optional — leave blank to inherit order PO"
              className="h-7 text-xs"
            />
          </div>
        ) : mphPoDisplay ? (
          <span className="font-mono text-foreground">{mphPoDisplay}</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Will auto-generate on save</span>
            <Button type="button" variant="outline" size="sm" className="h-6 text-xs px-2"
              onClick={onAssignPo} disabled={assigningPo}>
              {assigningPo ? 'Previewing…' : 'Assign Separate PO'}
            </Button>
          </div>
        )}
      </div>

      {/* Customer PO */}
      <div className="space-y-1.5">
        <Label className="text-xs">Customer PO</Label>
        <Input value={load.customer_po}
          onChange={e => set('customer_po', e.target.value)}
          placeholder={index === 0 ? (orderCustomerPo || 'Customer PO…') : 'Optional'} />
      </div>

      {/* Row 1: Description & Part # */}
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-4 space-y-1.5">
          <Label className="text-xs">Description</Label>
          <Input value={load.description} onChange={e => set('description', e.target.value)}
            placeholder="Product description" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Part #</Label>
          <Input value={load.part_number} onChange={e => set('part_number', e.target.value)}
            placeholder="Optional" />
        </div>
      </div>

      {/* Row 2: Qty & Ship Date & Wanted Date & Order Type */}
      <div className={`grid gap-3 ${index === 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <div className="space-y-1.5">
          <Label className="text-xs">Qty</Label>
          <Input type="number" min="0" step="1" value={load.qty}
            onChange={e => set('qty', e.target.value)} placeholder="0" />
        </div>
        {index === 0 && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Ship Date</Label>
              <Input type="date"
                value={load.ship_date || orderShipDate}
                onChange={e => set('ship_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Wanted Date</Label>
              <Input type="date"
                value={load.wanted_date || orderWantedDate}
                onChange={e => set('wanted_date', e.target.value)} />
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs">Order Type</Label>
          <Select value={load.order_type} onValueChange={v => { if (v !== null) set('order_type', v) }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {ORDER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 3: Buy & Sell & Terms */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Buy</Label>
          <Input type="number" min="0" step="0.01" value={load.buy}
            onChange={e => set('buy', e.target.value)} placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Sell</Label>
          <Input type="number" min="0" step="0.01" value={load.sell}
            onChange={e => set('sell', e.target.value)} placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Terms</Label>
          <Select value={terms} onValueChange={v => { if (v !== null) onTermsChange(v) }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Terms…" /></SelectTrigger>
            <SelectContent>
              {TERMS_VALUES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conditional bottle fields */}
      {showBottleFields && (
        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Bottle Cost</Label>
            <Input type="number" min="0" step="0.01" value={load.bottle_cost}
              onChange={e => set('bottle_cost', e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Bottle Qty</Label>
            <Input type="number" min="0" step="1" value={load.bottle_qty}
              onChange={e => set('bottle_qty', e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">MPH Freight Bottles</Label>
            <Input type="number" min="0" step="1" value={load.mph_freight_bottles}
              onChange={e => set('mph_freight_bottles', e.target.value)} placeholder="0" />
          </div>
        </div>
      )}
    </div>
  )
}
