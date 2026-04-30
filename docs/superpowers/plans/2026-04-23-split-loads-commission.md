# Split Loads Commission & Per-Load Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move commission eligibility to the split-load level, add per-load PO/dates/type fields to both order forms, add expand-rows to the orders table, and rebuild the commission report around split loads.

**Architecture:** Commission eligibility is computed per split load from `order_type`; order-level `commission_status` is derived from loads for backward compat. A shared lib (`commission-eligibility.ts`) centralises the three helper functions used across API routes. The new-order-form and edit-order page both use a rewritten `OrderSplitLoadsEditor` → `SplitLoadRow` component hierarchy. The orders table gains expand/collapse rows. The commission report queries `order_split_loads` directly and marks individual loads paid.

**Tech Stack:** Next.js 16 API routes, Drizzle ORM, react-hook-form + Zod v4, shadcn/ui + Tailwind, lucide-react icons, sonner toasts.

---

## File Map

| Status | Path | Purpose |
|--------|------|---------|
| **Create** | `src/lib/orders/commission-eligibility.ts` | `deriveLoadCommissionStatus`, `deriveOrderCommissionStatus`, `deriveInitials` helpers |
| **Create** | `src/app/api/orders/next-po-preview/route.ts` | GET — peek next sequence value without consuming |
| **Create** | `src/components/orders/split-load-row.tsx` | Single split load row with new 3-row layout |
| **Create** | `src/components/orders/order-row.tsx` | Single order table row with expand/collapse chevron |
| **Create** | `src/components/orders/split-load-sub-row.tsx` | Expanded split load data row inside orders table |
| **Create** | `src/components/commission/commission-filters.tsx` | Filter bar extracted from commission-client |
| **Create** | `src/components/commission/commission-table.tsx` | Commission data table with per-load rows |
| **Create** | `src/lib/orders/order-form-schema.ts` | Zod schema + SplitLoadValue type + defaults (extracted from new-order-form) |
| **Create** | `src/components/orders/use-new-order-form.ts` | Form state hook + submit handler (extracted from new-order-form) |
| **Create** | `src/components/orders/use-edit-order-form.ts` | Edit page state hook + save/duplicate/email handlers |
| **Create** | `src/components/orders/edit-order-sidebar.tsx` | Save button, status card, margin, invoice panel |
| **Create** | `src/components/orders/edit-order-addresses.tsx` | Ship-to, Bill-to, customer contacts editor |
| **Modify** | `src/app/api/orders/route.ts` | POST: per-load commission; GET: expanded split load fields + search fix |
| **Modify** | `src/app/api/orders/[orderId]/route.ts` | PATCH: per-load commission |
| **Modify** | `src/app/api/commission/route.ts` | Rebuild query around `order_split_loads` |
| **Modify** | `src/app/api/commission/mark-paid/route.ts` | Accept split load IDs, stamp loads + update order-level |
| **Modify** | `src/components/orders/order-split-loads-editor.tsx` | Rewrite: updated type, delegates each row to SplitLoadRow |
| **Modify** | `src/components/orders/orders-table.tsx` | Add expand state, use OrderRow + SplitLoadSubRow |
| **Modify** | `src/components/commission/commission-client.tsx` | Thin orchestrator using new sub-components |
| **Modify** | `src/components/orders/new-order-form.tsx` | Use extracted hook + schema; layout changes (blind shipment, remove flag/revised, move save button) |
| **Modify** | `src/app/(dashboard)/orders/[orderId]/page.tsx` | Use extracted hook + components; apply new split load fields |

---

## Task 1: Commission eligibility helpers + API updates

**Files:**
- Create: `src/lib/orders/commission-eligibility.ts`
- Modify: `src/app/api/orders/route.ts`
- Modify: `src/app/api/orders/[orderId]/route.ts`
- Modify: `src/app/api/commission/mark-paid/route.ts`

- [ ] **Step 1: Create the shared commission-eligibility lib**

Create `src/lib/orders/commission-eligibility.ts`:

```typescript
const COMMISSION_KEYWORDS = ['New IBC', 'Bottle', 'Rebottle', 'Washout', 'Wash & Return']

export function deriveLoadCommissionStatus(orderType: string | null | undefined): string {
  if (!orderType) return 'Not Eligible'
  return COMMISSION_KEYWORDS.some(kw => orderType.includes(kw)) ? 'Eligible' : 'Not Eligible'
}

export function deriveOrderCommissionStatus(
  loads: Array<{ commission_status: string; commission_paid_date: string | null }>
): string {
  const eligible = loads.filter(l => l.commission_status === 'Eligible')
  if (eligible.length === 0) return 'Not Eligible'
  if (eligible.every(l => l.commission_paid_date !== null)) return 'Commission Paid'
  return 'Eligible'
}

export function deriveInitials(name: string | null | undefined): string {
  if (!name?.trim()) return 'XX'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0][0] ?? 'X').toUpperCase() + 'X'
  return ((parts[0][0] ?? 'X') + (parts[parts.length - 1][0] ?? 'X')).toUpperCase()
}
```

- [ ] **Step 2: Update POST /api/orders to compute per-load commission_status**

In `src/app/api/orders/route.ts`:

1. Delete the existing `deriveCommissionStatus` and `deriveInitials` functions (top of file).
2. Add import: `import { deriveLoadCommissionStatus, deriveOrderCommissionStatus, deriveInitials } from '@/lib/orders/commission-eligibility'`
3. Replace the `const commission_status = deriveCommissionStatus(...)` line with nothing (we'll derive from loads now).
4. Replace the transaction block so it computes per-load status:

```typescript
const result = await db.transaction(async (tx) => {
  // Insert order without commission_status first (will update after loads)
  const [newOrder] = await tx
    .insert(orders)
    .values({ ...orderFields, order_number, checklist })
    .returning({ id: orders.id, order_number: orders.order_number })

  let orderCommissionStatus = 'Not Eligible'

  if (split_loads?.length) {
    const loadValues = split_loads.map((load: Record<string, unknown>) => ({
      ...load,
      order_id: newOrder.id,
      commission_status: deriveLoadCommissionStatus(load.order_type as string),
      // strip UI-only fields
      separate_po: undefined,
      preview_po: undefined,
    }))

    // For loads with separate_po = true, consume nextval and set order_number_override
    for (const lv of loadValues) {
      if ((lv as Record<string, unknown>).separate_po) {
        const seqRes = await tx.execute(sql`SELECT nextval('order_number_seq') AS num`)
        const num = (seqRes as unknown as Array<{ num: string | number }>)[0].num
        ;(lv as Record<string, unknown>).order_number_override = `${initials}-MPH${num}`
      }
      delete (lv as Record<string, unknown>).separate_po
    }

    await tx.insert(order_split_loads).values(loadValues)

    orderCommissionStatus = deriveOrderCommissionStatus(
      loadValues.map((l: Record<string, unknown>) => ({
        commission_status: l.commission_status as string,
        commission_paid_date: null,
      }))
    )
  }

  await tx.update(orders)
    .set({ commission_status: orderCommissionStatus })
    .where(eq(orders.id, newOrder.id))

  return newOrder
})
```

- [ ] **Step 3: Update PATCH /api/orders/[orderId] to compute per-load commission_status**

In `src/app/api/orders/[orderId]/route.ts`:

1. Add import: `import { deriveLoadCommissionStatus, deriveOrderCommissionStatus } from '@/lib/orders/commission-eligibility'`
2. Strip `commission_status` from `orderFields` before the orders update (prevent client from overriding computed value).
3. Replace the split_loads block inside the transaction:

```typescript
import { deriveLoadCommissionStatus, deriveOrderCommissionStatus } from '@/lib/orders/commission-eligibility'

// Inside PATCH handler, before the transaction:
const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) })
const initials = deriveInitials(user?.name) // need deriveInitials import too

// Strip client-supplied commission_status — always recompute
delete orderFields.commission_status

// Inside the transaction, replace split_loads block:
if (Array.isArray(split_loads)) {
  await tx.delete(order_split_loads).where(eq(order_split_loads.order_id, orderId))

  if (split_loads.length > 0) {
    const NUMERIC_FIELDS = ['qty', 'buy', 'sell', 'bottle_cost', 'bottle_qty', 'mph_freight_bottles']
    const loadValues = await Promise.all(
      split_loads.map(async (load: Record<string, unknown>) => {
        const clean: Record<string, unknown> = { ...load, order_id: orderId }
        for (const field of NUMERIC_FIELDS) {
          if (clean[field] === '' || clean[field] === undefined) clean[field] = null
        }
        clean.commission_status = deriveLoadCommissionStatus(clean.order_type as string)
        if (clean.separate_po) {
          const seqRes = await tx.execute(sql`SELECT nextval('order_number_seq') AS num`)
          const num = (seqRes as unknown as Array<{ num: string | number }>)[0].num
          clean.order_number_override = `${initials}-MPH${num}`
        }
        delete clean.separate_po
        delete clean.preview_po
        return clean
      })
    )

    await tx.insert(order_split_loads).values(loadValues)

    const orderCommissionStatus = deriveOrderCommissionStatus(
      loadValues.map(l => ({
        commission_status: l.commission_status as string,
        commission_paid_date: (l.commission_paid_date as string) ?? null,
      }))
    )
    orderFields.commission_status = orderCommissionStatus
  }
}

await tx.update(orders).set(orderFields).where(eq(orders.id, orderId))
```

Note: `deriveInitials` also needs to be imported from the shared lib. Add it to the import. Remove any local copy.

- [ ] **Step 4: Update POST /api/commission/mark-paid to stamp split loads**

Rewrite `src/app/api/commission/mark-paid/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { eq, inArray } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, users } from '@/lib/db/schema'
import { deriveOrderCommissionStatus } from '@/lib/orders/commission-eligibility'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'ACCOUNTING')) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const body = await req.json()
  const { splitLoadIds, commissionPaidDate } = body as {
    splitLoadIds: string[]
    commissionPaidDate: string
  }

  if (!splitLoadIds?.length) return new NextResponse('splitLoadIds is required', { status: 400 })
  if (!commissionPaidDate) return new NextResponse('commissionPaidDate is required', { status: 400 })

  // Stamp commission_paid_date on the selected split loads
  await db.update(order_split_loads)
    .set({ commission_paid_date: commissionPaidDate })
    .where(inArray(order_split_loads.id, splitLoadIds))

  // Get affected order IDs
  const affectedLoads = await db
    .select({ order_id: order_split_loads.order_id })
    .from(order_split_loads)
    .where(inArray(order_split_loads.id, splitLoadIds))

  const affectedOrderIds = [...new Set(affectedLoads.map(l => l.order_id))]

  // Recompute order-level commission_status for each affected order
  for (const orderId of affectedOrderIds) {
    const allLoads = await db
      .select({
        commission_status: order_split_loads.commission_status,
        commission_paid_date: order_split_loads.commission_paid_date,
      })
      .from(order_split_loads)
      .where(eq(order_split_loads.order_id, orderId))

    const orderStatus = deriveOrderCommissionStatus(allLoads as Array<{ commission_status: string; commission_paid_date: string | null }>)

    await db.update(orders)
      .set({
        commission_status: orderStatus,
        commission_paid_date: commissionPaidDate,
        updated_at: new Date(),
      })
      .where(eq(orders.id, orderId))
  }

  return NextResponse.json({ updated: splitLoadIds.length })
}
```

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/orders/commission-eligibility.ts \
        src/app/api/orders/route.ts \
        src/app/api/orders/[orderId]/route.ts \
        src/app/api/commission/mark-paid/route.ts
git commit -m "feat: move commission eligibility to split load level in API"
```

---

## Task 2: New Order form — per-load fields

**Files:**
- Create: `src/lib/orders/order-form-schema.ts`
- Create: `src/components/orders/use-new-order-form.ts`
- Create: `src/app/api/orders/next-po-preview/route.ts`
- Create: `src/components/orders/split-load-row.tsx`
- Modify: `src/components/orders/order-split-loads-editor.tsx`
- Modify: `src/components/orders/new-order-form.tsx`

- [ ] **Step 1: Extract schema and types to order-form-schema.ts**

Create `src/lib/orders/order-form-schema.ts`. Move the Zod schema, `SplitLoadValue` type, and `emptyLoad()` function out of `new-order-form.tsx`. Add the new per-load fields to `SplitLoadValue`:

```typescript
import { z } from 'zod'

export const TERMS_VALUES = ['PPD', 'PPA', 'FOB'] as const

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
  // Per-load fields (new)
  customer_po: string
  order_type: string
  ship_date: string
  wanted_date: string
  // UI-only (not stored in DB directly)
  separate_po: boolean   // true when user clicked "Assign Separate PO"
  preview_po: string     // preview PO displayed before save
}

export function emptyLoad(): SplitLoadValue {
  return {
    description: '', part_number: '', qty: '', buy: '', sell: '',
    bottle_cost: '', bottle_qty: '', mph_freight_bottles: '', order_number_override: '',
    customer_po: '', order_type: '', ship_date: '', wanted_date: '',
    separate_po: false, preview_po: '',
  }
}

// The main form Zod schema (copy the existing schema from new-order-form.tsx here)
// Keep all existing fields. The split_loads array items include the new fields.
export const orderFormSchema = z.object({
  // ... (move the entire existing schema here verbatim from new-order-form.tsx lines ~18-60)
  // split_loads items should include: customer_po, order_type, ship_date, wanted_date
  // separate_po and preview_po are UI-only and not in the Zod schema (handled outside form)
})

export type OrderFormValues = z.infer<typeof orderFormSchema>
```

**Important:** Copy the schema exactly from the existing file. Do NOT rewrite it from scratch — move it verbatim.

- [ ] **Step 2: Create next-po-preview route**

Create `src/app/api/orders/next-po-preview/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const initials = (searchParams.get('initials') ?? 'XX').toUpperCase()

  // Peek at sequence last value without consuming it
  const result = await db.execute(
    sql`SELECT COALESCE(pg_sequence_last_value('order_number_seq'), 0) + 1 AS next_num`
  )
  const nextNum = (result as unknown as Array<{ next_num: number }>)[0].next_num

  return NextResponse.json({ preview: `${initials}-MPH${nextNum}` })
}
```

- [ ] **Step 3: Create split-load-row.tsx**

Create `src/components/orders/split-load-row.tsx`. This renders a single split load with the new 3-row layout:

```typescript
'use client'

import { Trash2, Hash } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ORDER_TYPES, TERMS_VALUES } from '@/lib/db/schema'
import type { SplitLoadValue } from '@/lib/orders/order-form-schema'

const BOTTLE_KEYWORDS = ['Bottle', 'Rebottle', 'Washout', 'Wash & Return']

type SplitLoadRowProps = {
  load: SplitLoadValue
  index: number
  orderPo: string          // order-level PO number (Load 1 display)
  orderCustomerPo: string  // default customer_po for Load 1
  orderShipDate: string    // default ship_date for Load 1
  orderWantedDate: string  // default wanted_date for Load 1
  terms: string            // order-level terms shown in row 3
  onTermsChange: (v: string) => void
  onChange: (load: SplitLoadValue) => void
  onRemove: () => void
  onAssignPo: () => Promise<void>
  assigningPo: boolean
}

export function SplitLoadRow({
  load, index, orderPo, orderCustomerPo, orderShipDate, orderWantedDate,
  terms, onTermsChange, onChange, onRemove, onAssignPo, assigningPo,
}: SplitLoadRowProps) {
  const set = (field: keyof SplitLoadValue, value: string | boolean) =>
    onChange({ ...load, [field]: value })

  const showBottleFields = BOTTLE_KEYWORDS.some(kw => load.order_type.includes(kw))

  // MPH PO display
  const mphPoDisplay = index === 0
    ? orderPo || '(auto-generated)'
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
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* MPH PO display */}
      <div className="flex items-center gap-2">
        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
        {index === 0 ? (
          <span className="text-xs text-muted-foreground font-mono">
            MPH PO: {mphPoDisplay}
          </span>
        ) : mphPoDisplay ? (
          <span className="text-xs font-mono text-foreground">{mphPoDisplay}</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Will auto-generate on save</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={onAssignPo}
              disabled={assigningPo}
            >
              {assigningPo ? 'Previewing…' : 'Assign Separate PO'}
            </Button>
          </div>
        )}
      </div>

      {/* Customer PO */}
      <div className="space-y-1.5">
        <Label className="text-xs">Customer PO</Label>
        <Input
          value={load.customer_po}
          onChange={e => set('customer_po', e.target.value)}
          placeholder={index === 0 ? orderCustomerPo || 'Customer PO…' : 'Optional'}
        />
      </div>

      {/* Row 1: Description & Part # */}
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-4 space-y-1.5">
          <Label className="text-xs">Description</Label>
          <Input
            value={load.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Product description"
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Part #</Label>
          <Input
            value={load.part_number}
            onChange={e => set('part_number', e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      {/* Row 2: Qty & Ship Date & Wanted Date & Order Type */}
      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Qty</Label>
          <Input
            type="number" min="0" step="1"
            value={load.qty}
            onChange={e => set('qty', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Ship Date</Label>
          <Input
            type="date"
            value={load.ship_date || (index === 0 ? orderShipDate : '')}
            onChange={e => set('ship_date', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Wanted Date</Label>
          <Input
            type="date"
            value={load.wanted_date || (index === 0 ? orderWantedDate : '')}
            onChange={e => set('wanted_date', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Order Type</Label>
          <Select value={load.order_type} onValueChange={v => set('order_type', v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select type…" />
            </SelectTrigger>
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
          <Input
            type="number" min="0" step="0.01"
            value={load.buy}
            onChange={e => set('buy', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Sell</Label>
          <Input
            type="number" min="0" step="0.01"
            value={load.sell}
            onChange={e => set('sell', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Terms</Label>
          <Select value={terms} onValueChange={onTermsChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Terms…" />
            </SelectTrigger>
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
```

- [ ] **Step 4: Rewrite order-split-loads-editor.tsx**

Rewrite `src/components/orders/order-split-loads-editor.tsx` to be a thin orchestrator using `SplitLoadRow`. The file must stay under 100 lines:

```typescript
'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { SplitLoadRow } from './split-load-row'
import { emptyLoad } from '@/lib/orders/order-form-schema'
import type { SplitLoadValue } from '@/lib/orders/order-form-schema'

export type { SplitLoadValue }
export { emptyLoad }

type Props = {
  loads: SplitLoadValue[]
  orderPo: string
  orderCustomerPo: string
  orderShipDate: string
  orderWantedDate: string
  terms: string
  csrInitials: string
  onTermsChange: (v: string) => void
  onChange: (loads: SplitLoadValue[]) => void
}

export function OrderSplitLoadsEditor({
  loads, orderPo, orderCustomerPo, orderShipDate, orderWantedDate,
  terms, csrInitials, onTermsChange, onChange,
}: Props) {
  const [assigningPoIndex, setAssigningPoIndex] = useState<number | null>(null)

  function update(index: number, load: SplitLoadValue) {
    onChange(loads.map((l, i) => i === index ? load : l))
  }

  function add() { onChange([...loads, emptyLoad()]) }

  function remove(index: number) {
    if (loads.length === 1) return
    onChange(loads.filter((_, i) => i !== index))
  }

  async function handleAssignPo(index: number) {
    setAssigningPoIndex(index)
    try {
      const res = await fetch(`/api/orders/next-po-preview?initials=${encodeURIComponent(csrInitials)}`)
      const { preview } = await res.json()
      onChange(loads.map((l, i) => i === index ? { ...l, separate_po: true, preview_po: preview } : l))
    } finally {
      setAssigningPoIndex(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Line Items</h3>
        <button type="button" onClick={add}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add Split Load
        </button>
      </div>
      {loads.map((load, index) => (
        <SplitLoadRow
          key={index}
          load={load}
          index={index}
          orderPo={orderPo}
          orderCustomerPo={orderCustomerPo}
          orderShipDate={orderShipDate}
          orderWantedDate={orderWantedDate}
          terms={terms}
          onTermsChange={onTermsChange}
          onChange={updated => update(index, updated)}
          onRemove={() => remove(index)}
          onAssignPo={() => handleAssignPo(index)}
          assigningPo={assigningPoIndex === index}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Extract use-new-order-form.ts from new-order-form.tsx**

Create `src/components/orders/use-new-order-form.ts`. Move the form setup, submission handler, and state into this hook. The hook returns:
- `form` — the react-hook-form instance
- `loads` / `setLoads` — split load array state
- `savedOrder` / `setSavedOrder`
- `submitting`
- `onSubmit` — the form submit handler
- `checkPoUnique`

The hook imports `orderFormSchema`, `OrderFormValues`, `emptyLoad` from `@/lib/orders/order-form-schema`.

Key submit logic (what goes in the hook — copy from new-order-form.tsx submit handler):

```typescript
// In the onSubmit handler, construct the split_loads payload:
const loadsPayload = loads.map((l, i) => ({
  id: l.id,
  description: l.description || null,
  part_number: l.part_number || null,
  qty: l.qty || null,
  buy: l.buy || null,
  sell: l.sell || null,
  bottle_cost: l.bottle_cost || null,
  bottle_qty: l.bottle_qty || null,
  mph_freight_bottles: l.mph_freight_bottles || null,
  order_number_override: l.order_number_override || null,
  customer_po: l.customer_po || null,
  order_type: l.order_type || null,
  ship_date: l.ship_date || null,
  wanted_date: l.wanted_date || null,
  separate_po: l.separate_po,
  // commission_status derived server-side
}))

// order-level ship_date and wanted_date come from Load 1 values
const ship_date = loads[0]?.ship_date || values.ship_date || null
const wanted_date = loads[0]?.wanted_date || values.wanted_date || null
```

**Note on order-level ship_date / wanted_date:** Per Task 2 spec point 2, Load 1 values are the authoritative source for the order-level ship_date and wanted_date. The form still has order-level ship_date / wanted_date fields but they are seeded from Load 1 as the user types. Pass ship_date = loads[0].ship_date (falling back to form field) in the POST body.

- [ ] **Step 6: Restructure new-order-form.tsx to under 300 lines**

The main `new-order-form.tsx` becomes an orchestrator. It:
- Imports the hook from `use-new-order-form.ts`
- Imports `OrderSplitLoadsEditor` from `./order-split-loads-editor`
- Renders form sections as inline JSX (no separate section components needed if the file stays under 300 lines)

Key layout changes required by Task 2 spec:
- **Blind Shipment toggle** → move from sidebar to Customer & Vendor section (second row under Vendor)
- **Remove** Flag This Order toggle
- **Remove** Revised PO toggle
- **Remove** Invoice & Payment section from right panel
- **Move Save button** to below Misc Notes at bottom of form; remove from right panel
- **Freight section layout:**
  - Row 1: Freight Carrier | MPH Freight Cost | Customer Freight Cost | Additional Costs
  - Row 2: Appointment Time | Appointment Notes
- **Load 1 Ship Date / Wanted Date** default from order-level values as the CSR types them. Keep order-level ship_date and wanted_date as hidden or read-only fields that sync from Load 1.

The `new-order-form.tsx` JSX structure (after refactoring):

```tsx
// Imports (~20 lines)
// One exported component: NewOrderForm
// Inside the component:
//   const { form, loads, setLoads, savedOrder, submitting, onSubmit } = useNewOrderForm()
//   const terms = form.watch('terms')
//   const orderPo = '' // empty until saved
//   ...
// JSX renders sections inline using form.register(), form.watch(), etc.
// Target: under 280 lines total
```

The sidebar (right panel) should now contain ONLY:
- Live Margin card (read-only display)
- Status dropdown
- Salesperson / CSR dropdowns (or keep in main form — check current layout)

No save button in sidebar. No Invoice & Payment section.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/lib/orders/order-form-schema.ts \
        src/components/orders/use-new-order-form.ts \
        src/app/api/orders/next-po-preview/route.ts \
        src/components/orders/split-load-row.tsx \
        src/components/orders/order-split-loads-editor.tsx \
        src/components/orders/new-order-form.tsx
git commit -m "feat: new order form — per-load fields, separate PO, layout changes"
```

---

## Task 3: Orders table expand/collapse + search fix

**Files:**
- Create: `src/components/orders/split-load-sub-row.tsx`
- Create: `src/components/orders/order-row.tsx`
- Modify: `src/components/orders/orders-table.tsx`
- Modify: `src/app/api/orders/route.ts` (GET handler)

- [ ] **Step 1: Update GET /api/orders to return full split load fields + search fix**

In `src/app/api/orders/route.ts`, update the split loads query to include the new fields:

```typescript
// In the search subquery, add order_number_override search:
const descSubquery = db
  .select({ id: order_split_loads.order_id })
  .from(order_split_loads)
  .where(or(
    ilike(order_split_loads.description, `%${search}%`),
    ilike(order_split_loads.order_number_override, `%${search}%`),
  ))

// Update the SplitLoad fetch after rows query:
const loads = await db
  .select({
    order_id:             order_split_loads.order_id,
    id:                   order_split_loads.id,
    description:          order_split_loads.description,
    qty:                  order_split_loads.qty,
    buy:                  order_split_loads.buy,
    sell:                 order_split_loads.sell,
    order_number_override: order_split_loads.order_number_override,
    customer_po:          order_split_loads.customer_po,
    order_type:           order_split_loads.order_type,
    ship_date:            order_split_loads.ship_date,
    wanted_date:          order_split_loads.wanted_date,
  })
  .from(order_split_loads)
  .where(inArray(order_split_loads.order_id, orderIds))
```

Update `splitMap` type and the map population to store full arrays (not just one entry per order):

```typescript
// Replace the splitMap Record with:
const splitMap: Record<string, FullSplitLoad[]> = {}
for (const load of loads) {
  if (!splitMap[load.order_id]) splitMap[load.order_id] = []
  splitMap[load.order_id].push(load)
}
```

- [ ] **Step 2: Create split-load-sub-row.tsx**

Create `src/components/orders/split-load-sub-row.tsx`:

```typescript
import { formatDate } from '@/lib/utils/format-date'
import { formatCurrency } from '@/lib/utils/order-table-utils'

type FullSplitLoad = {
  id: string
  order_number_override: string | null
  customer_po: string | null
  description: string | null
  order_type: string | null
  qty: string | null
  ship_date: string | null
  wanted_date: string | null
  buy: string | null
  sell: string | null
}

type Props = {
  load: FullSplitLoad
  orderNumber: string        // parent order number
  orderCustomerPo: string | null
  colCount: number           // total number of columns in table for indent colspan
}

export function SplitLoadSubRow({ load, orderNumber, orderCustomerPo, colCount }: Props) {
  const mphPo = load.order_number_override ?? orderNumber
  const custPo = load.customer_po ?? orderCustomerPo ?? '—'

  return (
    <tr className="bg-muted/20 text-xs text-muted-foreground border-t border-dashed">
      <td /> {/* chevron col */}
      <td /> {/* checkbox col */}
      <td /> {/* flag col */}
      <td className="px-3 py-1.5 font-mono">{mphPo}</td>
      <td /> {/* status col */}
      <td /> {/* customer col */}
      <td className="px-3 py-1.5">{custPo}</td>
      <td className="px-3 py-1.5 text-muted-foreground" title={load.description ?? ''}>{load.description ?? '—'}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{load.qty ?? '—'}</td>
      <td className="px-3 py-1.5">{formatDate(load.ship_date)}</td>
      <td className="px-3 py-1.5">{formatDate(load.wanted_date)}</td>
      <td /> {/* vendor col */}
      <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(load.buy)}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(load.sell)}</td>
      <td /> {/* ship to col */}
      <td /> {/* freight col */}
      <td /> {/* actions col */}
    </tr>
  )
}
```

- [ ] **Step 3: Create order-row.tsx**

Create `src/components/orders/order-row.tsx`. This renders a single order row with the chevron expand toggle. Extract the row `<tr>` from `orders-table.tsx`:

```typescript
'use client'

import { ChevronDown, ChevronRight, Flag, Copy, Pencil, Mail } from 'lucide-react'
import Link from 'next/link'
import { OrderStatusBadge } from './order-status-badge'
import { SplitLoadSubRow } from './split-load-sub-row'
import { formatDate } from '@/lib/utils/format-date'
import { formatCurrency, firstDescription, firstQty, formatShipTo } from '@/lib/utils/order-table-utils'
import type { OrderStatus } from '@/types/order'

// FullSplitLoad type must match what GET /api/orders returns
export type FullSplitLoad = {
  id: string
  order_number_override: string | null
  customer_po: string | null
  description: string | null
  order_type: string | null
  qty: string | null
  ship_date: string | null
  wanted_date: string | null
  buy: string | null
  sell: string | null
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
  ship_to: { city?: string; state?: string } | null
  customer_name: string | null
  vendor_name: string | null
  salesperson_name: string | null
  split_loads: FullSplitLoad[]
}

type Props = {
  order: OrderRow
  expanded: boolean
  selected: boolean
  role: string | null
  statusOptions: string[]
  onToggleExpand: () => void
  onToggleSelect: () => void
  onToggleFlag: () => void
  onPatchStatus: (status: string) => void
}

export function OrderTableRow({
  order, expanded, selected, role, statusOptions,
  onToggleExpand, onToggleSelect, onToggleFlag, onPatchStatus,
}: Props) {
  return (
    <>
      <tr className={`hover:bg-muted/30 transition-colors${selected ? ' bg-muted/20' : ''}`}>
        {/* Chevron */}
        <td className="px-2 py-2">
          <button type="button" onClick={onToggleExpand}
            className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors">
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
            <Flag className={`h-4 w-4 ${order.flag ? 'text-[#B88A44] fill-[#B88A44]' : 'text-slate-300 hover:text-slate-400'}`} />
          </button>
        </td>
        {/* MPH PO */}
        <td className="px-3 py-2 font-mono font-medium">
          <Link href={`/orders/${order.id}`} className="hover:underline text-primary">
            {order.order_number}
          </Link>
        </td>
        {/* Status */}
        <td className="px-3 py-2">
          {role === 'SALES' ? (
            <OrderStatusBadge status={order.status as OrderStatus} />
          ) : (
            <select value={order.status} onChange={e => onPatchStatus(e.target.value)}
              className="text-xs rounded border border-border bg-background px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#00205B] max-w-[180px]">
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </td>
        <td className="px-3 py-2">{order.customer_name ?? '—'}</td>
        <td className="px-3 py-2 text-muted-foreground">{order.customer_po ?? ''}</td>
        <td className="px-3 py-2 text-muted-foreground" title={order.split_loads[0]?.description ?? ''}>
          {firstDescription(order.split_loads)}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">{firstQty(order.split_loads)}</td>
        <td className="px-3 py-2 text-muted-foreground">{formatDate(order.ship_date)}</td>
        <td className="px-3 py-2 text-muted-foreground">{formatDate(order.wanted_date)}</td>
        <td className="px-3 py-2 text-muted-foreground">{order.vendor_name ?? '—'}</td>
        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(order.split_loads[0]?.buy)}</td>
        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(order.split_loads[0]?.sell)}</td>
        <td className="px-3 py-2 text-muted-foreground">{formatShipTo(order.ship_to)}</td>
        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(order.freight_cost)}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <Link href={`/orders/${order.id}`}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </Link>
            <Link href={`/orders/${order.id}?duplicate=1`}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </Link>
          </div>
        </td>
      </tr>
      {/* Expanded split load sub-rows */}
      {expanded && order.split_loads.map((load, i) => (
        <SplitLoadSubRow
          key={load.id ?? i}
          load={load}
          orderNumber={order.order_number}
          orderCustomerPo={order.customer_po}
          colCount={17}
        />
      ))}
    </>
  )
}
```

- [ ] **Step 4: Update orders-table.tsx to use OrderTableRow**

In `src/components/orders/orders-table.tsx`:

1. Import `OrderTableRow` and `OrderRow` type from `./order-row`
2. Remove the inline `OrderRow` type and `SplitLoad` type (now in `order-row.tsx`)
3. Add `expandedIds: Set<string>` state
4. Add `toggleExpand(id: string)` handler
5. Update the table header to add a chevron column as col 1 (before checkbox)
6. Replace the `{orderRows.map(order => (<tr>...</tr>))}` block with:

```tsx
{orderRows.map(order => (
  <OrderTableRow
    key={order.id}
    order={order}
    expanded={expandedIds.has(order.id)}
    selected={selectedIds.has(order.id)}
    role={role}
    statusOptions={statusOptions}
    onToggleExpand={() => toggleExpand(order.id)}
    onToggleSelect={() => toggleSelect(order.id)}
    onToggleFlag={() => toggleFlag(order.id, order.flag)}
    onPatchStatus={status => patchStatus(order.id, status)}
  />
))}
```

The `orders-table.tsx` should now be well under 200 lines since the row rendering is extracted.

Table header additions (insert as first `<th>` before the checkbox column):
```tsx
<th className="w-8 px-2 py-2" aria-label="Expand" />
```

- [ ] **Step 5: Commit Task 3**

```bash
git add src/components/orders/split-load-sub-row.tsx \
        src/components/orders/order-row.tsx \
        src/components/orders/orders-table.tsx \
        src/app/api/orders/route.ts
git commit -m "feat: orders table expand/collapse split loads, search fix for order_number_override"
```

---

## Task 4: Commission report rebuild around split loads

**Files:**
- Modify: `src/app/api/commission/route.ts`
- Create: `src/components/commission/commission-filters.tsx`
- Create: `src/components/commission/commission-table.tsx`
- Modify: `src/components/commission/commission-client.tsx`

- [ ] **Step 1: Rewrite GET /api/commission to query split loads**

Rewrite `src/app/api/commission/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, isNull, lte } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, customers, vendors, users } from '@/lib/db/schema'
import { deriveInitials } from '@/lib/orders/commission-eligibility'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const [dbUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!dbUser) return new NextResponse('User not found', { status: 403 })

  const { searchParams } = new URL(req.url)
  const salespersonIdParam = searchParams.get('salespersonId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const salespersonAlias = alias(users, 'salesperson')
  const csrAlias = alias(users, 'csr')

  const conditions = [
    eq(order_split_loads.commission_status, 'Eligible'),
    eq(salespersonAlias.is_commission_eligible, true),
    isNull(order_split_loads.commission_paid_date),
  ]

  if (dbUser.role === 'SALES') {
    conditions.push(eq(orders.salesperson_id, dbUser.id))
  } else if ((dbUser.role === 'ADMIN' || dbUser.role === 'ACCOUNTING') && salespersonIdParam) {
    conditions.push(eq(orders.salesperson_id, salespersonIdParam))
  }

  if (startDate) conditions.push(gte(order_split_loads.ship_date, startDate))
  if (endDate) conditions.push(lte(order_split_loads.ship_date, endDate))

  const rows = await db
    .select({
      load_id:              order_split_loads.id,
      order_id:             orders.id,
      order_number:         orders.order_number,
      order_number_override: order_split_loads.order_number_override,
      customer_po_load:     order_split_loads.customer_po,
      customer_po_order:    orders.customer_po,
      description:          order_split_loads.description,
      qty:                  order_split_loads.qty,
      ship_date:            order_split_loads.ship_date,
      order_type:           order_split_loads.order_type,
      commission_status:    order_split_loads.commission_status,
      commission_paid_date: order_split_loads.commission_paid_date,
      invoice_payment_status: orders.invoice_payment_status,
      invoice_paid_date:    orders.invoice_paid_date,
      customerName:         customers.name,
      vendorName:           vendors.name,
      salespersonName:      salespersonAlias.name,
      csrName:              csrAlias.name,
    })
    .from(order_split_loads)
    .innerJoin(orders, eq(order_split_loads.order_id, orders.id))
    .innerJoin(customers, eq(orders.customer_id, customers.id))
    .leftJoin(vendors, eq(orders.vendor_id, vendors.id))
    .innerJoin(salespersonAlias, eq(orders.salesperson_id, salespersonAlias.id))
    .leftJoin(csrAlias, eq(orders.csr_id, csrAlias.id))
    .where(and(...conditions))
    .orderBy(order_split_loads.ship_date)

  const result = rows.map(r => ({
    ...r,
    mphPo: r.order_number_override ?? r.order_number,
    customerPo: r.customer_po_load ?? r.customer_po_order ?? null,
    vendorName: r.vendorName ?? '—',
    salespersonInitials: deriveInitials(r.salespersonName),
    csrInitials: deriveInitials(r.csrName),
  }))

  return NextResponse.json(result)
}
```

- [ ] **Step 2: Create commission-filters.tsx**

Create `src/components/commission/commission-filters.tsx`. This contains the filter controls extracted from `commission-client.tsx`:

```typescript
'use client'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type CommissionFilters = {
  salespersonId: string
  startDate: string
  endDate: string
}

type Salesperson = { id: string; name: string | null }

type Props = {
  filters: CommissionFilters
  salespersons: Salesperson[]
  role: string | null
  onChange: (f: Partial<CommissionFilters>) => void
}

export function CommissionFilters({ filters, salespersons, role, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {(role === 'ADMIN' || role === 'ACCOUNTING') && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Salesperson</label>
          <Select value={filters.salespersonId} onValueChange={v => onChange({ salespersonId: v })}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue placeholder="All salespersons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {salespersons.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name ?? s.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Ship Date From</label>
        <Input type="date" className="h-8 w-36 text-sm"
          value={filters.startDate} onChange={e => onChange({ startDate: e.target.value })} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">To</label>
        <Input type="date" className="h-8 w-36 text-sm"
          value={filters.endDate} onChange={e => onChange({ endDate: e.target.value })} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create commission-table.tsx**

Create `src/components/commission/commission-table.tsx`. Renders the table of eligible split loads with totals:

```typescript
'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/utils/format-date'

export type CommissionRow = {
  load_id: string
  order_id: string
  mphPo: string
  customerPo: string | null
  description: string | null
  qty: string | null
  ship_date: string | null
  order_type: string | null
  invoice_payment_status: string
  vendorName: string
  customerName: string
  salespersonInitials: string
  csrInitials: string
}

type Props = {
  rows: CommissionRow[]
  selectedIds: Set<string>
  onToggle: (loadId: string) => void
  onToggleAll: () => void
  onMarkPaid: () => void
  markingPaid: boolean
  role: string | null
}

export function CommissionTable({
  rows, selectedIds, onToggle, onToggleAll, onMarkPaid, markingPaid, role,
}: Props) {
  const allSelected = rows.length > 0 && rows.every(r => selectedIds.has(r.load_id))

  const totalQty = rows
    .filter(r => selectedIds.has(r.load_id))
    .reduce((acc, r) => acc + (parseFloat(r.qty ?? '0') || 0), 0)

  const totalCommission = totalQty * 3

  return (
    <div className="space-y-3">
      {selectedIds.size > 0 && (role === 'ADMIN' || role === 'ACCOUNTING') && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={onMarkPaid}
            disabled={markingPaid}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            {markingPaid ? 'Marking…' : 'Mark Commission Paid'}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              {(role === 'ADMIN' || role === 'ACCOUNTING') && (
                <th className="w-8 px-2 py-2">
                  <input type="checkbox" checked={allSelected} onChange={onToggleAll}
                    className="h-4 w-4 rounded border-border accent-[#00205B] cursor-pointer" />
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
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No eligible commissions.
                </td>
              </tr>
            ) : rows.map(row => (
              <tr key={row.load_id} className={`hover:bg-muted/30 transition-colors${selectedIds.has(row.load_id) ? ' bg-muted/20' : ''}`}>
                {(role === 'ADMIN' || role === 'ACCOUNTING') && (
                  <td className="px-2 py-2">
                    <input type="checkbox" checked={selectedIds.has(row.load_id)}
                      onChange={() => onToggle(row.load_id)}
                      className="h-4 w-4 rounded border-border accent-[#00205B] cursor-pointer" />
                  </td>
                )}
                <td className="px-3 py-2">{row.vendorName}</td>
                <td className="px-3 py-2">{row.customerName}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.salespersonInitials}/{row.csrInitials}</td>
                <td className="px-3 py-2 font-mono">
                  <Link href={`/orders/${row.order_id}`} target="_blank"
                    className="hover:underline text-primary">{row.mphPo}</Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{row.customerPo ?? '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.description ?? '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatDate(row.ship_date)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.qty ?? '—'}</td>
              </tr>
            ))}
          </tbody>
          {selectedIds.size > 0 && (
            <tfoot className="border-t bg-muted/30 font-medium text-sm">
              <tr>
                <td colSpan={(role === 'ADMIN' || role === 'ACCOUNTING') ? 8 : 7}
                  className="px-3 py-2 text-right text-muted-foreground">
                  Total ({selectedIds.size} loads):
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {totalQty} units · ${totalCommission.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rewrite commission-client.tsx as thin orchestrator**

Rewrite `src/components/commission/commission-client.tsx` to under 150 lines. It manages fetch state, filter state, mark-paid modal, and renders `CommissionFilters` + `CommissionTable`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CommissionFilters, type CommissionFilters as FilterState } from './commission-filters'
import { CommissionTable, type CommissionRow } from './commission-table'

const DEFAULT_FILTERS: FilterState = { salespersonId: '', startDate: '', endDate: '' }

export function CommissionClient() {
  const [rows, setRows] = useState<CommissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [markingPaid, setMarkingPaid] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [salespersons, setSalespersons] = useState<{ id: string; name: string | null }[]>([])
  const [paidDate, setPaidDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    Promise.all([
      fetch('/api/me').then(r => r.json()),
      fetch('/api/users?permission=SALES').then(r => r.json()),
    ]).then(([me, sps]) => {
      setRole(me?.role ?? null)
      setSalespersons(Array.isArray(sps) ? sps : [])
    })
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.salespersonId) params.set('salespersonId', filters.salespersonId)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    setLoading(true)
    fetch(`/api/commission?${params}`)
      .then(r => r.json())
      .then(data => { setRows(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filters])

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function toggleAll() {
    setSelectedIds(selectedIds.size === rows.length ? new Set() : new Set(rows.map(r => r.load_id)))
  }

  async function handleMarkPaid() {
    if (!selectedIds.size) return
    setMarkingPaid(true)
    try {
      const res = await fetch('/api/commission/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ splitLoadIds: [...selectedIds], commissionPaidDate: paidDate }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`Marked ${selectedIds.size} load(s) paid`)
      setSelectedIds(new Set())
      setFilters(f => ({ ...f })) // trigger refetch
    } catch {
      toast.error('Failed to mark commission paid')
    } finally {
      setMarkingPaid(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Commission Report</h1>
        {(role === 'ADMIN' || role === 'ACCOUNTING') && selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Payroll date:</label>
            <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)}
              className="h-8 rounded border border-border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B]" />
          </div>
        )}
      </div>

      <CommissionFilters
        filters={filters}
        salespersons={salespersons}
        role={role}
        onChange={update => setFilters(f => ({ ...f, ...update }))}
      />

      {loading ? (
        <p className="py-6 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <CommissionTable
          rows={rows}
          selectedIds={selectedIds}
          onToggle={toggleSelect}
          onToggleAll={toggleAll}
          onMarkPaid={handleMarkPaid}
          markingPaid={markingPaid}
          role={role}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit Task 4**

```bash
git add src/app/api/commission/route.ts \
        src/components/commission/commission-filters.tsx \
        src/components/commission/commission-table.tsx \
        src/components/commission/commission-client.tsx
git commit -m "feat: rebuild commission report around split loads"
```

---

## Task 5: Edit Order page — per-load fields + file split

**Files:**
- Create: `src/components/orders/use-edit-order-form.ts`
- Create: `src/components/orders/edit-order-sidebar.tsx`
- Create: `src/components/orders/edit-order-addresses.tsx`
- Modify: `src/app/(dashboard)/orders/[orderId]/page.tsx`

- [ ] **Step 1: Create use-edit-order-form.ts**

Create `src/components/orders/use-edit-order-form.ts`. Move all `useState`, `useEffect` (data loading), and the `handleSave`/`handleDuplicate`/email handlers out of `page.tsx` into this hook. The hook accepts `orderId: string` and returns all state and handlers.

Key additions vs current page:
- `loads` state includes new `SplitLoadValue` fields (`customer_po`, `order_type`, `ship_date`, `wanted_date`, `separate_po`, `preview_po`)
- When loading existing order data from GET `/api/orders/[orderId]`, map split loads to `SplitLoadValue`:

```typescript
const mapped = loads.map(l => ({
  id: l.id,
  description: l.description ?? '',
  part_number: l.part_number ?? '',
  qty: l.qty ?? '',
  buy: l.buy ?? '',
  sell: l.sell ?? '',
  bottle_cost: l.bottle_cost ?? '',
  bottle_qty: l.bottle_qty ?? '',
  mph_freight_bottles: l.mph_freight_bottles ?? '',
  order_number_override: l.order_number_override ?? '',
  customer_po: l.customer_po ?? '',
  order_type: l.order_type ?? '',
  ship_date: l.ship_date ?? '',
  wanted_date: l.wanted_date ?? '',
  separate_po: false,
  preview_po: '',
}))
```

The `handleSave` function sends split_loads exactly as in Task 2 step 5 (include `separate_po`, let server handle sequence generation for loads where `separate_po: true` and `order_number_override` is empty).

Hook return shape:
```typescript
return {
  order, setOrder,           // order detail object
  loads, setLoads,           // SplitLoadValue[]
  saving, setSaving,
  terms, setTerms,
  shipTo, setShipTo, billTo, setBillTo,
  customerContacts, setCustomerContacts,
  handleSave,
  handleDuplicate,
  handleEmailPo,
  handleEmailBol,
  role,
  csrInitials,
}
```

The hook must stay under 250 lines. If it approaches the limit, move the email draft logic to a separate helper `src/lib/orders/email-draft-helpers.ts`.

- [ ] **Step 2: Create edit-order-sidebar.tsx**

Create `src/components/orders/edit-order-sidebar.tsx`. Extracts the right sidebar from the edit page:

Props:
```typescript
type EditOrderSidebarProps = {
  order: OrderDetail | null
  loads: SplitLoadValue[]
  terms: string
  saving: boolean
  role: string | null
  onStatusChange: (v: string) => void
  onSave: () => void
}
```

Contains: status card, live margin display (import the margin computation function from `src/lib/orders/compute-margin.ts` if it exists, otherwise compute inline), invoice panel, save button.

**No flag toggle or revised PO toggle** — per Task 2 spec, these are removed from the new form. If they exist on the edit page sidebar, KEEP them on the edit page (the spec only removes them from new order form).

- [ ] **Step 3: Create edit-order-addresses.tsx**

Create `src/components/orders/edit-order-addresses.tsx`. Extracts the ship-to, bill-to, and customer contacts section:

Props:
```typescript
type EditOrderAddressesProps = {
  shipTo: AddressValue
  billTo: AddressValue
  customerContacts: CustomerContact[]
  onShipToChange: (v: AddressValue) => void
  onBillToChange: (v: AddressValue) => void
  onContactsChange: (v: CustomerContact[]) => void
}
```

Contains the address editor fields and customer contacts array editor. Import `AddressValue` and `CustomerContact` types — define them in a shared `src/types/order.ts` file if not already there, or keep them in the edit page's type block and re-export.

- [ ] **Step 4: Update [orderId]/page.tsx to under 300 lines**

The page component:
1. Calls `useEditOrderForm(orderId)`
2. Renders the form with `OrderSplitLoadsEditor` (same component as new-order-form)
3. Renders `EditOrderSidebar`
4. Renders `EditOrderAddresses`
5. Applies same split load layout — the `OrderSplitLoadsEditor` component handles all the per-load fields

Pass to `OrderSplitLoadsEditor`:
```tsx
<OrderSplitLoadsEditor
  loads={loads}
  orderPo={order?.order_number ?? ''}
  orderCustomerPo={order?.customer_po ?? ''}
  orderShipDate={order?.ship_date ?? ''}
  orderWantedDate={order?.wanted_date ?? ''}
  terms={terms}
  csrInitials={csrInitials}
  onTermsChange={setTerms}
  onChange={setLoads}
/>
```

The page should import `OrderDetail` type from `src/types/order.ts` (create this shared types file if not already present).

- [ ] **Step 5: Commit Task 5**

```bash
git add src/components/orders/use-edit-order-form.ts \
        src/components/orders/edit-order-sidebar.tsx \
        src/components/orders/edit-order-addresses.tsx \
        "src/app/(dashboard)/orders/[orderId]/page.tsx"
git commit -m "feat: edit order page — per-load fields, same split load layout"
```

---

## Final: Merge to main

```bash
git checkout main
git pull origin main
git merge claude/<worktree-branch>
git push origin main
git log --oneline -6
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Task 1: Per-load commission_status computed from `order_type` on POST/PATCH
- [x] Task 1: Order-level commission_status derived from loads for backward compat
- [x] Task 1: mark-paid stamps `commission_paid_date` on split loads + updates order-level
- [x] Task 2: Row layout (Description/Part#, Qty/Ship/Wanted/OrderType, Buy/Sell/Terms)
- [x] Task 2: Per-load Customer PO field
- [x] Task 2: Load 1 defaults from order-level values
- [x] Task 2: MPH PO display (Load 1 shows order number, Load 2+ shows "Will auto-generate" with Assign Separate PO button)
- [x] Task 2: "Assign Separate PO" calls next-po-preview (no sequence consumed), saves sequence on actual save
- [x] Task 2: Freight section layout (Carrier/MPH Freight/Customer Freight/Additional Costs + Appointment)
- [x] Task 2: Blind Shipment moved to Customer & Vendor section
- [x] Task 2: Flag and Revised PO removed from new order form
- [x] Task 2: Save button moved to below Misc Notes, removed from right panel
- [x] Task 2: Invoice & Payment section removed from right panel
- [x] Task 3: Expand/collapse per order row with chevron in first column
- [x] Task 3: Expanded sub-rows show: MPH PO, Cust PO, Description, Order Type, Qty, Ship Date, Wanted Date, Buy, Sell
- [x] Task 3: Search now includes `order_split_loads.order_number_override`
- [x] Task 3: Status inline edit remains working
- [x] Task 4: Commission API queries `order_split_loads` with `commission_status = 'Eligible'` and `commission_paid_date IS NULL`
- [x] Task 4: Salesperson `is_commission_eligible = true` filter
- [x] Task 4: SALES role sees own orders only
- [x] Task 4: Row columns: Vendor, Customer, Sales/CSR initials, MPH PO, Cust PO, Description, Ship Date, Qty
- [x] Task 4: Totals row: total qty × $3 commission
- [x] Task 4: Mark Commission Paid uses split load IDs
- [x] Task 4: MPH PO links to /orders/[orderId] in new tab
- [x] Task 5: Edit page uses same OrderSplitLoadsEditor with same per-load fields
- [x] Task 5: File split to comply with 300-line limit

**300-line file rule compliance:**
- `commission-eligibility.ts` ≈ 25 lines ✓
- `next-po-preview/route.ts` ≈ 20 lines ✓
- `split-load-row.tsx` ≈ 160 lines ✓
- `order-split-loads-editor.tsx` ≈ 80 lines ✓
- `order-form-schema.ts` ≈ 80 lines ✓
- `use-new-order-form.ts` ≈ 200 lines ✓
- `new-order-form.tsx` target ≈ 280 lines ✓ (after extraction)
- `order-row.tsx` ≈ 130 lines ✓
- `split-load-sub-row.tsx` ≈ 45 lines ✓
- `orders-table.tsx` ≈ 180 lines ✓ (after row extraction)
- `commission/route.ts` ≈ 80 lines ✓
- `commission-filters.tsx` ≈ 60 lines ✓
- `commission-table.tsx` ≈ 120 lines ✓
- `commission-client.tsx` ≈ 120 lines ✓
- `use-edit-order-form.ts` ≈ 240 lines ✓
- `edit-order-sidebar.tsx` ≈ 100 lines ✓
- `edit-order-addresses.tsx` ≈ 100 lines ✓
- `[orderId]/page.tsx` target ≈ 250 lines ✓ (after extraction)

**Type consistency:**
- `SplitLoadValue` defined in `src/lib/orders/order-form-schema.ts` — imported by editor, row, both forms
- `emptyLoad()` defined in same file
- `deriveLoadCommissionStatus`, `deriveOrderCommissionStatus`, `deriveInitials` all in `commission-eligibility.ts`
- `CommissionRow` defined in `commission-table.tsx`, used by `commission-client.tsx`
- `OrderRow` and `FullSplitLoad` defined in `order-row.tsx`, used by `orders-table.tsx`
