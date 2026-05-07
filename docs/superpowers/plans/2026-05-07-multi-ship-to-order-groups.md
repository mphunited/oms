# Multi-Ship-To Order Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multi-ship-to grouping mechanism that links 2–4 orders from the same vendor into a shared PO number, combined PDF, and combined vendor email.

**Architecture:** A new `order_groups` table holds the shared `group_po_number` and vendor reference; `orders.group_id` is a nullable FK to it. The PO PDF route detects `group_id` and renders a combined multi-ship-to PDF. Email helpers detect `group_id` and build a combined vendor email. UI adds a toolbar group button, a group badge on the Customer column, and a read-only group section on the order edit page.

**Tech Stack:** Next.js 16 API routes, Drizzle ORM, @react-pdf/renderer, lucide-react, sonner toasts, Microsoft Graph API email.

---

## File Map

**New files:**
- `drizzle/0021_order_groups.sql` — migration: create table, add column, index, RLS
- `src/app/api/order-groups/route.ts` — POST create group (validate + mint group PO)
- `src/app/api/order-groups/[id]/route.ts` — GET group info + order list, DELETE ungroup
- `src/lib/orders/build-multi-ship-to-pdf.tsx` — `MultiShipToPDF` React-PDF component
- `src/lib/email/build-multi-ship-to-email.ts` — `buildMultiShipToEmail` pure function

**Modified files:**
- `src/lib/db/schema.ts` — add `order_groups` table, `group_id` FK on `orders`, export types
- `src/app/api/orders/route.ts` — left-join `order_groups`, add `group_id` + `group_po_number` to list select
- `src/app/api/orders/[orderId]/route.ts` — fetch group when `group_id` set, add `group_po_number` to response
- `src/components/orders/edit-order-types.ts` — add `group_id`, `group_po_number` to `OrderDetail`
- `src/components/orders/order-row.tsx` — add `group_id`/`group_po_number` to `OrderRow` type, render group badge on Customer cell
- `src/components/orders/orders-table.tsx` — add `grouping` state, "Group as Multi-Ship-To" toolbar button, `handleGroupClick`
- `src/app/api/orders/[orderId]/po-pdf/route.ts` — detect `group_id`, fetch siblings, render `MultiShipToPDF`
- `src/lib/orders/email-draft-helpers.ts` — add `group_id` to `OrderSnap`, group detection in `sendPoEmail`
- `src/components/orders/use-order-email-actions.ts` — group detection in `handleEmailPosClick`
- `src/components/orders/use-edit-order-form.ts` — add `groupData` state, patch `handleEmailPoClick`
- `src/app/(dashboard)/orders/[orderId]/page.tsx` — render `OrderGroupSection` when `group_id` is set

---

## Task 1: SQL Migration File

**Files:**
- Create: `drizzle/0021_order_groups.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- drizzle/0021_order_groups.sql
CREATE TABLE IF NOT EXISTS "order_groups" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "group_po_number"  text UNIQUE NOT NULL,
  "vendor_id"        uuid REFERENCES vendors(id),
  "notes"            text,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "group_id" uuid REFERENCES order_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "orders_group_id_idx" ON "orders"("group_id");

-- Enable RLS
ALTER TABLE "order_groups" ENABLE ROW LEVEL SECURITY;

-- Service-role-only access policy
CREATE POLICY "Service role full access" ON "order_groups"
  TO service_role USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Apply migration**

Run in PowerShell:
```powershell
npm run db:migrate
```

If it hangs after 30 seconds, apply manually: paste the SQL into the Supabase SQL Editor and run it. Verify by running:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'group_id';
SELECT table_name FROM information_schema.tables WHERE table_name = 'order_groups';
```

Both queries should return one row.

---

## Task 2: Update schema.ts

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Add `order_groups` table definition after `credit_memo_line_items`**

Append to the bottom of `src/lib/db/schema.ts` (before the last line):

```typescript
// ─── order_groups ─────────────────────────────────────────────────────────────
// Groups 2-4 orders from the same vendor into a single combined PO.

export const order_groups = pgTable("order_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  group_po_number: text("group_po_number").notNull().unique(),
  vendor_id: uuid("vendor_id").references(() => vendors.id),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OrderGroup = typeof order_groups.$inferSelect;
export type NewOrderGroup = typeof order_groups.$inferInsert;
```

- [ ] **Step 2: Add `group_id` FK column to the `orders` table definition**

In the `orders` table in `schema.ts`, add `group_id` after the `checklist` field (before `created_at`):

```typescript
    group_id: uuid("group_id").references(() => order_groups.id),
    // Multi-ship-to group — null for standalone orders
```

The `orders` table `pgTable` call will now reference `order_groups`. Move the `order_groups` table definition **above** the `orders` table definition in the file so the forward reference resolves. Place it after the `vendors` table and before the `orders` table.

- [ ] **Step 3: Verify the schema compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors. If you see "order_groups is used before its declaration," ensure the `order_groups` table is defined before `orders` in the file.

---

## Task 3: POST /api/order-groups

**Files:**
- Create: `src/app/api/order-groups/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_groups, users } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq, inArray, sql } from 'drizzle-orm'
import { deriveInitials } from '@/lib/orders/commission-eligibility'

const EARLY_STATUSES = new Set([
  'Pending',
  'Waiting On Vendor To Confirm',
  'Acknowledged Order',
  'PO Request To Accounting',
  'PO Revision To Accounting',
  'PO Moving',
])

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { orderIds?: unknown }
    const orderIds = body.orderIds

    if (!Array.isArray(orderIds) || orderIds.length < 2 || orderIds.length > 4) {
      return NextResponse.json(
        { error: 'Select 2–4 orders to create a group' },
        { status: 400 },
      )
    }

    const fetchedOrders = await db
      .select({
        id: orders.id,
        vendor_id: orders.vendor_id,
        status: orders.status,
        group_id: orders.group_id,
      })
      .from(orders)
      .where(inArray(orders.id, orderIds as string[]))

    if (fetchedOrders.length !== orderIds.length) {
      return NextResponse.json({ error: 'One or more orders not found' }, { status: 400 })
    }

    const vendorIds = [...new Set(fetchedOrders.map(o => o.vendor_id).filter(Boolean))]
    if (vendorIds.length > 1) {
      return NextResponse.json(
        { error: 'All orders in a group must share the same vendor' },
        { status: 400 },
      )
    }

    const alreadyGrouped = fetchedOrders.find(o => o.group_id)
    if (alreadyGrouped) {
      return NextResponse.json(
        { error: 'One or more orders are already in a group' },
        { status: 400 },
      )
    }

    const tooFarAlong = fetchedOrders.find(o => !EARLY_STATUSES.has(o.status))
    if (tooFarAlong) {
      return NextResponse.json(
        { error: 'Cannot group orders after vendor communication has begun' },
        { status: 400 },
      )
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) })
    const initials = deriveInitials(user?.name)

    const seqResult = await db.execute(sql`SELECT nextval('order_number_seq') AS num`)
    const num = (seqResult as unknown as Array<{ num: string | number }>)[0].num
    const group_po_number = `${initials}-MPH${num}`

    const [newGroup] = await db
      .insert(order_groups)
      .values({
        group_po_number,
        vendor_id: vendorIds[0] ?? null,
      })
      .returning()

    await db
      .update(orders)
      .set({ group_id: newGroup.id })
      .where(inArray(orders.id, orderIds as string[]))

    return NextResponse.json(newGroup, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/order-groups]', message)
    return NextResponse.json({ error: 'Failed to create group', detail: message }, { status: 500 })
  }
}
```

---

## Task 4: GET + DELETE /api/order-groups/[id]

**Files:**
- Create: `src/app/api/order-groups/[id]/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_groups, customers, users } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const group = await db.query.order_groups.findFirst({
    where: eq(order_groups.id, id),
  })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const groupOrders = await db
    .select({
      id: orders.id,
      order_number: orders.order_number,
      customer_name: customers.name,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customer_id, customers.id))
    .where(eq(orders.group_id, id))
    .orderBy(orders.created_at)

  return NextResponse.json({
    ...group,
    orders: groupOrders,
    order_ids: groupOrders.map(o => o.id),
  })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })
    if (dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    await db.update(orders).set({ group_id: null }).where(eq(orders.group_id, id))
    await db.delete(order_groups).where(eq(order_groups.id, id))

    return new Response(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[DELETE /api/order-groups/:id]', message)
    return NextResponse.json({ error: 'Failed to delete group', detail: message }, { status: 500 })
  }
}
```

---

## Task 5: Orders List API — Add group fields

**Files:**
- Modify: `src/app/api/orders/route.ts`

- [ ] **Step 1: Import `order_groups` from schema**

In the imports at the top of `src/app/api/orders/route.ts`, add `order_groups`:

```typescript
import { orders, order_split_loads, users, vendors, customers, order_type_configs, order_groups, type NewOrderSplitLoad } from '@/lib/db/schema'
```

- [ ] **Step 2: Add left join on `order_groups` to the main list query**

In the main list `rows` query (around line 193), add a left join after the `csr2User` join:

```typescript
    const rows = await db
      .select({
        id:                     orders.id,
        order_number:           orders.order_number,
        order_date:             orders.order_date,
        order_type:             orders.order_type,
        status:                 orders.status,
        customer_po:            orders.customer_po,
        freight_carrier:        orders.freight_carrier,
        ship_date:              orders.ship_date,
        wanted_date:            orders.wanted_date,
        freight_cost:           orders.freight_cost,
        freight_to_customer:    orders.freight_to_customer,
        additional_costs:       orders.additional_costs,
        flag:                   orders.flag,
        is_revised:             orders.is_revised,
        invoice_payment_status: orders.invoice_payment_status,
        commission_status:      orders.commission_status,
        ship_to:                orders.ship_to,
        group_id:               orders.group_id,           // NEW
        group_po_number:        order_groups.group_po_number, // NEW
        customer_name:          customers.name,
        vendor_name:            vendors.name,
        salesperson_name:       users.name,
        csr_name:               csrUser.name,
        csr2_name:              csr2User.name,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customer_id, customers.id))
      .leftJoin(vendors,   eq(orders.vendor_id,   vendors.id))
      .leftJoin(users,     eq(orders.salesperson_id, users.id))
      .leftJoin(csrUser,   eq(orders.csr_id, csrUser.id))
      .leftJoin(csr2User,  eq(orders.csr2_id, csr2User.id))
      .leftJoin(order_groups, eq(orders.group_id, order_groups.id))  // NEW
      .where(where)
      .orderBy(orderByClause)
      .limit(limit)
      .offset((page - 1) * limit)
```

Also update the `count` base query to add the same `order_groups` join (so the count stays correct — though a left join without filter won't change the count, it keeps queries consistent):

```typescript
    const baseQuery = () =>
      db.select({ count: count() })
        .from(orders)
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .leftJoin(vendors,   eq(orders.vendor_id,   vendors.id))
        .leftJoin(users,     eq(orders.salesperson_id, users.id))
        .leftJoin(csrUser,   eq(orders.csr_id, csrUser.id))
        .where(where)
```

(The count query does NOT need the `order_groups` join since it doesn't filter on it.)

---

## Task 6: Single Order GET — Add group_po_number

**Files:**
- Modify: `src/app/api/orders/[orderId]/route.ts`

- [ ] **Step 1: Import `order_groups`**

```typescript
import { orders, order_split_loads, customers, vendors, users, order_groups, order_type_configs, type NewOrderSplitLoad } from '@/lib/db/schema'
```

- [ ] **Step 2: Fetch group when `group_id` is set**

After fetching `order` and before the `return NextResponse.json(...)`, add:

```typescript
  const group = order.group_id
    ? await db.query.order_groups.findFirst({ where: eq(order_groups.id, order.group_id) })
    : null
```

- [ ] **Step 3: Add `group_po_number` to the response**

```typescript
  return NextResponse.json({
    ...order,
    split_loads: loads,
    customer_name: customer?.name ?? null,
    vendor_name: vendor?.name ?? null,
    salesperson_name: salesperson?.name ?? null,
    csr_name: csr?.name ?? null,
    csr2_name: csr2?.name ?? null,
    group_po_number: group?.group_po_number ?? null,  // NEW
  })
```

---

## Task 7: Update OrderDetail type + OrderRow type

**Files:**
- Modify: `src/components/orders/edit-order-types.ts`
- Modify: `src/components/orders/order-row.tsx`

- [ ] **Step 1: Add `group_id` and `group_po_number` to `OrderDetail`**

In `src/components/orders/edit-order-types.ts`, add two fields after `csr2_name`:

```typescript
  csr2_name: string | null
  group_id: string | null           // NEW
  group_po_number: string | null    // NEW
```

- [ ] **Step 2: Find the `OrderRow` type in `order-row.tsx`**

In `src/components/orders/order-row.tsx`, find the exported `OrderRow` type definition. It has fields like `id`, `order_number`, `status`, etc. Add at the end of the type:

```typescript
  group_id: string | null
  group_po_number: string | null
```

- [ ] **Step 3: Add the group badge to the Customer cell**

In `order-row.tsx`, find the JSX that renders the customer cell. It currently shows `customer_name` and possibly an existing "Wash & Return" badge. After the existing badges, add:

```tsx
{order.group_id && order.group_po_number && (
  <span
    className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium"
    style={{ backgroundColor: '#E6F1FB', color: '#0C447C' }}
  >
    <Link className="h-3 w-3" />
    {order.group_po_number}
  </span>
)}
```

Import `Link` from `lucide-react` at the top of the file if not already imported.

---

## Task 8: Orders Table Toolbar — Group Button

**Files:**
- Modify: `src/components/orders/orders-table.tsx`

- [ ] **Step 1: Add `grouping` state and `refreshTick` state**

In `OrdersTable()` component, add after the existing state declarations:

```typescript
  const [grouping, setGrouping] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
```

- [ ] **Step 2: Add `refreshTick` to the orders fetch useEffect dependency array**

Find the `useEffect` that calls `fetch('/api/orders?...')`. Add `refreshTick` to its dependency array:

```typescript
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.lifecycle, filters.statuses, filters.flagOnly,
      filters.vendorIds, filters.customerIds, filters.shipDateFrom, filters.shipDateTo,
      filters.salespersonIds, filters.csrIds, page, sortBy, sortDir, refreshTick])
```

- [ ] **Step 3: Add `handleGroupClick` function**

After `handleEmailConfirmationClick`, add:

```typescript
  async function handleGroupClick() {
    const ids = Array.from(selectedIds)
    setGrouping(true)
    try {
      const res = await fetch('/api/order-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids }),
      })
      const data = await res.json() as { group_po_number?: string; error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create group')
        return
      }
      toast.success(`Group created — PO ${data.group_po_number}`)
      setSelectedIds(new Set())
      setRefreshTick(t => t + 1)
    } catch (err) {
      toast.error('Failed to create group: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setGrouping(false)
    }
  }
```

- [ ] **Step 4: Add the Group button to the selection toolbar**

In the `selectedIds.size > 0` toolbar div, after the "Email Confirmation" button, add:

```tsx
{selectedIds.size >= 2 && selectedIds.size <= 4 && (
  <button
    onClick={handleGroupClick}
    disabled={grouping || emailingPos || emailingBols}
    className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
  >
    <Link className="h-3.5 w-3.5" />
    {grouping ? 'Grouping…' : 'Group as Multi-Ship-To'}
  </button>
)}
```

Import `Link` from `lucide-react` at the top if not already imported.

---

## Task 9: MultiShipToPDF Component

**Files:**
- Create: `src/lib/orders/build-multi-ship-to-pdf.tsx`

- [ ] **Step 1: Create the component**

```tsx
import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { CompanySettings } from '@/lib/db/schema'

const NAVY = '#00205B'
const GOLD = '#B88A44'
const WHITE = '#FFFFFF'
const RED = '#CC0000'

type Address = {
  name?: string; street?: string; city?: string; state?: string
  zip?: string; phone?: string; shipping_notes?: string
}

type SplitLoad = {
  id: string
  description: string | null
  part_number: string | null
  qty: string | null
  buy: string | null
}

export type MultiShipToOrder = {
  id: string
  order_number: string
  customer_name: string | null
  customer_po: string | null
  ship_date: string | null
  appointment_time: string | null
  appointment_notes: string | null
  po_notes: string | null
  freight_carrier: string | null
  ship_to: Address | null
  split_loads: SplitLoad[]
}

export type MultiShipToGroup = {
  group_po_number: string
}

type VendorAddress = {
  street?: string; city?: string; state?: string; zip?: string
}

export type MultiShipToVendor = {
  name: string
  address: VendorAddress | null
  lead_contact: string | null
}

type Props = {
  group: MultiShipToGroup
  orders: MultiShipToOrder[]
  vendor: MultiShipToVendor | null
  companySetting: CompanySettings | null
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '--'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
  })
}

function fmtDateLong(d: string | null | undefined): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function fmtCurrency(v: string | null | undefined): string {
  if (!v) return '--'
  const n = parseFloat(v)
  return isNaN(n) ? '--' : `$${n.toFixed(2)}`
}

function calcTotal(qty: string | null, buy: string | null): string {
  if (!qty || !buy) return '--'
  const q = parseFloat(qty), b = parseFloat(buy)
  return isNaN(q) || isNaN(b) ? '--' : `$${(q * b).toFixed(2)}`
}

function calcGrandTotal(allOrders: MultiShipToOrder[]): string {
  let total = 0
  for (const o of allOrders) {
    for (const l of o.split_loads) {
      if (l.qty && l.buy) {
        const q = parseFloat(l.qty), b = parseFloat(l.buy)
        if (!isNaN(q) && !isNaN(b)) total += q * b
      }
    }
  }
  return `$${total.toFixed(2)}`
}

const S = StyleSheet.create({
  page:        { backgroundColor: '#ffffff', padding: 40, fontFamily: 'Helvetica' },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo:        { width: 160, height: 'auto' },
  headerRight: { alignItems: 'flex-end' },
  poTitle:     { fontSize: 22, fontFamily: 'Helvetica-Bold', color: NAVY },
  poSubtitle:  { fontSize: 10, color: GOLD, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  orderNum:    { fontSize: 11, color: NAVY, marginTop: 2 },
  orderDate:   { fontSize: 10, color: NAVY, marginTop: 2 },
  hr:          { backgroundColor: GOLD, height: 1.5, marginVertical: 10 },

  infoGrid:    { borderWidth: 1, borderColor: '#CCCCCC', borderStyle: 'solid', marginBottom: 14 },
  row:         { flexDirection: 'row' },
  rowBorder:   { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#CCCCCC', borderTopStyle: 'solid' },
  cell:        { padding: 8, flex: 1 },
  cellR:       { padding: 8, flex: 1, borderLeftWidth: 1, borderLeftColor: '#CCCCCC', borderLeftStyle: 'solid' },
  lbl:         { fontSize: 7.5, color: GOLD, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, marginBottom: 3 },
  val:         { fontSize: 9.5, color: NAVY },
  valBold:     { fontSize: 9.5, color: NAVY, fontFamily: 'Helvetica-Bold' },
  valRed:      { fontSize: 9.5, color: RED, fontFamily: 'Helvetica-Bold' },

  dropHeader:  { backgroundColor: NAVY, padding: 8, flexDirection: 'row', alignItems: 'center' },
  dropLabel:   { color: WHITE, fontSize: 9.5, fontFamily: 'Helvetica-Bold', flex: 1 },
  dropSection: { borderWidth: 1, borderColor: '#CCCCCC', borderStyle: 'solid', marginBottom: 10 },

  dropInfoRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#CCCCCC', borderTopStyle: 'solid' },
  dropCell:    { padding: 8, flex: 1 },
  dropCellR:   { padding: 8, flex: 1, borderLeftWidth: 1, borderLeftColor: '#CCCCCC', borderLeftStyle: 'solid' },

  thead:       { flexDirection: 'row', backgroundColor: '#E8EFF8', padding: 5 },
  th:          { color: NAVY, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  trow:        { flexDirection: 'row', padding: 5, borderTopWidth: 0.5, borderTopColor: '#DDDDDD', borderTopStyle: 'solid' },
  td:          { color: NAVY, fontSize: 8.5 },
  tdBold:      { color: NAVY, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  pn:          { color: GOLD, fontSize: 7.5, marginTop: 1 },
  colDesc:     { flex: 5 },
  colQty:      { flex: 1 },
  colPrice:    { flex: 1.5 },
  colTotal:    { flex: 1.5, textAlign: 'right' },

  notesBox:    { borderWidth: 1, borderColor: '#CCCCCC', borderStyle: 'solid', padding: 8, marginTop: 6 },
  notesLbl:    { fontSize: 7.5, color: GOLD, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8 },
  notesText:   { fontSize: 8.5, color: NAVY, marginTop: 3 },

  footer:      { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLbl:   { fontSize: 9, color: NAVY },
  totalBox:    { backgroundColor: '#F0EBE0', padding: 8, flexDirection: 'row', gap: 16 },
  totalLbl:    { fontSize: 9.5, color: NAVY, fontFamily: 'Helvetica-Bold' },
  totalVal:    { fontSize: 9.5, color: NAVY, fontFamily: 'Helvetica-Bold' },
})

export function MultiShipToPDF({ group, orders, vendor, companySetting }: Props) {
  const va = (vendor?.address ?? {}) as VendorAddress
  const firstOrder = orders[0]

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* Header */}
        <View style={S.headerRow}>
          <View>
            {companySetting?.logo_url
              ? <Image src={companySetting.logo_url} style={S.logo} />
              : <Text style={S.valBold}>{companySetting?.name ?? 'MPH United'}</Text>}
          </View>
          <View style={S.headerRight}>
            <Text style={S.poTitle}>Purchase Order</Text>
            <Text style={S.poSubtitle}>MULTI SHIP-TO SPLIT LOAD</Text>
            <Text style={S.orderNum}>{group.group_po_number}</Text>
            <Text style={S.orderDate}>{fmtDateLong(firstOrder?.ship_date)}</Text>
          </View>
        </View>

        <View style={S.hr} />

        {/* Info grid: Vendor | Ship Via | Required Ship Date */}
        <View style={S.infoGrid}>
          <View style={S.row}>
            <View style={S.cell}>
              <Text style={S.lbl}>VENDOR</Text>
              <Text style={S.valBold}>MPH United{vendor?.name ? ` / ${vendor.name}` : ''}</Text>
              {!!va.street && <Text style={S.val}>{va.street}</Text>}
              {!!(va.city || va.state || va.zip) && (
                <Text style={S.val}>{[va.city, va.state, va.zip].filter(Boolean).join(', ')}</Text>
              )}
              {!!vendor?.lead_contact && <Text style={S.val}>{vendor.lead_contact}</Text>}
            </View>
            <View style={S.cellR}>
              <Text style={S.lbl}>SHIP VIA</Text>
              <Text style={S.val}>{firstOrder?.freight_carrier ?? '--'}</Text>
            </View>
            <View style={S.cellR}>
              <Text style={S.lbl}>REQUIRED SHIP DATE</Text>
              <Text style={S.valRed}>{fmtDate(firstOrder?.ship_date)}</Text>
            </View>
          </View>
        </View>

        {/* One section per order */}
        {orders.map((order, dropIndex) => {
          const st = (order.ship_to ?? {}) as Address
          const dropNum = dropIndex + 1
          return (
            <View key={order.id} style={S.dropSection}>
              {/* Drop header */}
              <View style={S.dropHeader}>
                <Text style={S.dropLabel}>
                  SPLIT LOAD {dropNum} — DROP {dropNum}{order.customer_name ? ` — ${order.customer_name.toUpperCase()}` : ''}
                </Text>
              </View>

              {/* Customer PO | Ship Date | Appt */}
              <View style={S.dropInfoRow}>
                <View style={S.dropCell}>
                  <Text style={S.lbl}>CUSTOMER PO #</Text>
                  <Text style={S.val}>{order.split_loads[0]?.customer_po ?? order.customer_po ?? '--'}</Text>
                </View>
                <View style={S.dropCellR}>
                  <Text style={S.lbl}>SHIP DATE</Text>
                  <Text style={S.valRed}>{fmtDate(order.ship_date)}</Text>
                </View>
                <View style={S.dropCellR}>
                  <Text style={S.lbl}>APPT. TIME</Text>
                  <Text style={S.val}>
                    {order.appointment_time
                      ? new Date(order.appointment_time).toLocaleString('en-US')
                      : order.appointment_notes ?? '--'}
                  </Text>
                </View>
              </View>

              {/* Product table */}
              <View style={{ padding: 8 }}>
                <View style={S.thead}>
                  <Text style={[S.th, S.colDesc]}>DESCRIPTION</Text>
                  <Text style={[S.th, S.colQty]}>QTY</Text>
                  <Text style={[S.th, S.colPrice]}>UNIT PRICE</Text>
                  <Text style={[S.th, S.colTotal]}>TOTAL</Text>
                </View>
                {order.split_loads.map((load, i) => (
                  <View key={load.id} style={[S.trow, { backgroundColor: i % 2 === 0 ? WHITE : '#FAF5E8' }]}>
                    <View style={S.colDesc}>
                      <Text style={S.td}>{load.description ?? ''}</Text>
                      {!!load.part_number && <Text style={S.pn}>P/N: {load.part_number}</Text>}
                    </View>
                    <Text style={[S.td, S.colQty]}>{load.qty ?? '--'}</Text>
                    <Text style={[S.td, S.colPrice]}>{fmtCurrency(load.buy)}</Text>
                    <Text style={[S.td, S.colTotal]}>{calcTotal(load.qty, load.buy)}</Text>
                  </View>
                ))}
              </View>

              {/* Ship To + PO Notes */}
              <View style={[S.dropInfoRow, { borderTopWidth: 1, borderTopColor: '#CCCCCC', borderTopStyle: 'solid' }]}>
                <View style={S.dropCell}>
                  <Text style={S.lbl}>SHIP TO</Text>
                  {!!st.name && <Text style={S.valBold}>{st.name}</Text>}
                  {!!st.street && <Text style={S.val}>{st.street}</Text>}
                  {!!(st.city || st.state || st.zip) && (
                    <Text style={S.val}>{[st.city, st.state, st.zip].filter(Boolean).join(', ')}</Text>
                  )}
                  {!!st.phone && <Text style={S.val}>{st.phone}</Text>}
                </View>
                {!!(order.po_notes && order.po_notes.trim()) && (
                  <View style={S.dropCellR}>
                    <Text style={S.lbl}>PO NOTES</Text>
                    <Text style={S.val}>{order.po_notes}</Text>
                  </View>
                )}
              </View>
            </View>
          )
        })}

        {/* Footer */}
        <View style={S.totalBox}>
          <Text style={S.totalLbl}>{orders.length} DESTINATIONS</Text>
          <Text style={S.totalLbl}>ORDER TOTAL: {calcGrandTotal(orders)}</Text>
        </View>

      </Page>
    </Document>
  )
}
```

---

## Task 10: PO PDF Route — Detect Group

**Files:**
- Modify: `src/app/api/orders/[orderId]/po-pdf/route.ts`

- [ ] **Step 1: Import new types and component**

```typescript
import { orders, order_split_loads, vendors, company_settings, order_groups } from '@/lib/db/schema'
import { eq, asc, inArray } from 'drizzle-orm'
import { PurchaseOrderPDF } from '@/lib/orders/build-po-pdf'
import { MultiShipToPDF, type MultiShipToOrder } from '@/lib/orders/build-multi-ship-to-pdf'
```

- [ ] **Step 2: After fetching the order, add group detection branch**

Replace the entire handler body with this (keep `export const runtime = 'nodejs'`):

```typescript
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId } = await params

    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const vendor = order.vendor_id
      ? await db.query.vendors.findFirst({ where: eq(vendors.id, order.vendor_id) })
      : null

    const companySetting = await db.query.company_settings.findFirst()

    // ── Multi-ship-to group path ──────────────────────────────────────────────
    if (order.group_id) {
      const group = await db.query.order_groups.findFirst({
        where: eq(order_groups.id, order.group_id),
      })
      if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

      const siblingOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.group_id, order.group_id))
        .orderBy(asc(orders.created_at))

      const siblingIds = siblingOrders.map(o => o.id)
      const allLoads = siblingIds.length > 0
        ? await db
            .select()
            .from(order_split_loads)
            .where(inArray(order_split_loads.order_id, siblingIds))
            .orderBy(asc(order_split_loads.created_at))
        : []

      const { default: customersTable } = await import('@/lib/db/schema').then(
        m => ({ default: m.customers })
      )
      const customerRows = await db
        .select({ id: customersTable.id, name: customersTable.name })
        .from(customersTable)
        .where(inArray(customersTable.id, siblingOrders.map(o => o.customer_id).filter(Boolean) as string[]))
      const customerMap = new Map(customerRows.map(c => [c.id, c.name]))

      const multiOrders: MultiShipToOrder[] = siblingOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: customerMap.get(o.customer_id) ?? null,
        customer_po: o.customer_po ?? null,
        ship_date: o.ship_date ?? null,
        appointment_time: o.appointment_time ? o.appointment_time.toISOString() : null,
        appointment_notes: o.appointment_notes ?? null,
        po_notes: o.po_notes ?? null,
        freight_carrier: o.freight_carrier ?? null,
        ship_to: o.ship_to as MultiShipToOrder['ship_to'],
        split_loads: allLoads.filter(l => l.order_id === o.id),
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdf = await renderToBuffer(
        React.createElement(MultiShipToPDF, {
          group: { group_po_number: group.group_po_number },
          orders: multiOrders,
          vendor: vendor ? { name: vendor.name, address: vendor.address as any, lead_contact: vendor.lead_contact ?? null } : null,
          companySetting: companySetting ?? null,
        }) as any
      )

      return new Response(new Uint8Array(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="MPH PO ${group.group_po_number} Multi-Ship-To.pdf"`,
          'X-Group-Po-Number': group.group_po_number,
        },
      })
    }

    // ── Single-order path (unchanged) ─────────────────────────────────────────
    const splitLoads = await db
      .select()
      .from(order_split_loads)
      .where(eq(order_split_loads.order_id, orderId))
      .orderBy(asc(order_split_loads.created_at))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = await renderToBuffer(
      React.createElement(PurchaseOrderPDF, {
        order,
        splitLoads,
        vendor: vendor ?? null,
        companySetting: companySetting ?? null,
      }) as any
    )

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PO-${order.order_number}.pdf"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/orders/:id/po-pdf]', message)
    return NextResponse.json({ error: 'Failed to generate PDF', detail: message }, { status: 500 })
  }
}
```

**Note on the `customers` import:** Instead of the dynamic import trick, simply add `customers` to the existing import at the top of the file:

```typescript
import { orders, order_split_loads, vendors, company_settings, order_groups, customers } from '@/lib/db/schema'
```

Remove the dynamic import block and replace `customersTable` with `customers` throughout.

---

## Task 11: buildMultiShipToEmail

**Files:**
- Create: `src/lib/email/build-multi-ship-to-email.ts`

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { formatDate } from '@/lib/utils/format-date'

type PoContact = { name: string; email: string; role?: 'to' | 'cc'; is_primary?: boolean }

function isToRecipient(c: PoContact): boolean {
  if (c.role === 'to' || c.role === 'cc') return c.role === 'to'
  return c.is_primary === true
}

type VendorForEmail = {
  name: string
  address: { city?: string; state?: string } | null
  po_contacts: PoContact[] | null
}

export type MultiShipToOrderForEmail = {
  order_number: string
  customer_name: string | null
  customer_po: string | null
  ship_date: string | null
  ship_to: { city?: string; state?: string } | null
  po_notes: string | null
  split_loads: Array<{
    description: string | null
    part_number: string | null
    qty: string | null
    sell: string | null
    order_number_override: string | null
  }>
}

function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function td(content: string, align: 'left' | 'right' = 'left'): string {
  return `<td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top;text-align:${align};">${content}</td>`
}

function th(label: string, align: 'left' | 'right' = 'left'): string {
  return `<th style="padding:9px 10px;background-color:#00205B;color:#ffffff;font-weight:600;text-align:${align};white-space:nowrap;">${label}</th>`
}

export function buildMultiShipToEmail(
  groupPoNumber: string,
  vendor: VendorForEmail,
  orders: MultiShipToOrderForEmail[],
): { subject: string; bodyHtml: string; to: string[]; cc: string[] } {
  if (orders.length === 0) throw new Error('buildMultiShipToEmail: orders array is empty')

  const contacts = (vendor.po_contacts ?? []) as PoContact[]
  const primary = contacts.find(c => isToRecipient(c)) ?? contacts[0] ?? null
  const others = contacts.filter(c => c !== primary)
  const to = primary?.email ? [primary.email] : []
  const cc = [
    ...others.map(c => c.email).filter((e): e is string => Boolean(e) && e.toLowerCase() !== 'orders@mphunited.com'),
    'orders@mphunited.com',
  ]

  const first = orders[0]
  const shipFormatted = formatDate(first.ship_date)
  const subject = `MPH United PO ${groupPoNumber} -- Multi Ship-To | Ship ${shipFormatted}`

  const vendorLoc = [vendor.address?.city, vendor.address?.state].filter(Boolean).join(', ')
  const drops = orders
    .map(o => {
      const loc = [o.ship_to?.city, o.ship_to?.state].filter(Boolean).join(', ')
      return `${o.customer_name ?? 'Unknown'}${loc ? ` - ${loc}` : ''}`
    })
    .join(', ')
  const intro = `Please find the Multi Ship-To PO below for ${vendor.name}${vendorLoc ? ` -- ${vendorLoc}` : ''} to ${drops}.`

  const headerRow = `<tr>
    ${th('Split Load')}${th('MPH PO')}${th('Customer PO')}${th('Description')}${th('Qty', 'right')}${th('Unit Price', 'right')}${th('Total', 'right')}
  </tr>`

  const dataRows = orders.flatMap((order, dropIndex) => {
    const splitLabel = `SPLIT LOAD ${dropIndex + 1}`
    return order.split_loads.map((load, loadIndex) => {
      const qty = load.qty != null ? parseFloat(load.qty) : null
      const sell = load.sell != null ? parseFloat(load.sell) : null
      const total = qty != null && sell != null ? fmtCurrency(qty * sell) : '--'
      const mpoPo = load.order_number_override ?? order.order_number
      const pnLine = load.part_number
        ? `<br/><span style="color:#B88A44;font-size:11pt;">P/N: ${load.part_number}</span>`
        : ''
      const desc = `${load.description ?? ''}${pnLine}`
      return `<tr>
        ${td(loadIndex === 0 ? `<strong>${splitLabel}</strong>` : '')}
        ${td(loadIndex === 0 ? mpoPo : '')}
        ${td(loadIndex === 0 ? (order.customer_po ?? '') : '')}
        ${td(desc)}
        ${td(qty != null ? String(qty) : '--', 'right')}
        ${td(sell != null ? fmtCurrency(sell) : '--', 'right')}
        ${td(total, 'right')}
      </tr>`
    })
  })

  let grandTotal = 0
  for (const order of orders) {
    for (const load of order.split_loads) {
      const q = load.qty ? parseFloat(load.qty) : null
      const s = load.sell ? parseFloat(load.sell) : null
      if (q != null && s != null) grandTotal += q * s
    }
  }

  const notesOrders = orders.filter(o => o.po_notes)
  const notesHtml = notesOrders.length === 1
    ? `<p style="margin:6px 0;font-size:12pt;"><strong>PO Notes:</strong> ${notesOrders[0].po_notes}</p>`
    : notesOrders.map(o => `<p style="margin:6px 0;font-size:12pt;"><strong>PO Notes (${o.order_number}):</strong> ${o.po_notes}</p>`).join('')

  const bodyHtml = `<div style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;color:#1f2937;max-width:800px;line-height:1.5;">
  <p style="margin:0 0 16px;">Hello ${vendor.name},</p>
  <p style="margin:0 0 8px;">${intro}</p>
  <p style="margin:0 0 4px;font-size:11pt;"><strong>MPH PO #: ${groupPoNumber}</strong></p>
  <p style="margin:0 0 20px;font-size:12pt;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#374151;">PRODUCTS ORDERED</p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11pt;">
    <thead>${headerRow}</thead>
    <tbody>${dataRows.join('')}</tbody>
  </table>
  <p style="margin:0 0 8px;font-size:12pt;"><strong>ORDER TOTAL: ${fmtCurrency(grandTotal)}</strong></p>
  ${notesHtml ? `<div style="margin-bottom:16px;">${notesHtml}</div>` : ''}
  <p style="margin:0 0 24px;">Please confirm receipt of this PO and provide the expected ship date at your earliest convenience. Please reference MPH PO # on all correspondence and shipping documents.</p>
</div>`

  return { subject, bodyHtml, to, cc }
}
```

---

## Task 12: Update sendPoEmail + handleEmailPosClick for Group Detection

**Files:**
- Modify: `src/lib/orders/email-draft-helpers.ts`
- Modify: `src/components/orders/use-order-email-actions.ts`

### Part A — email-draft-helpers.ts

- [ ] **Step 1: Add `group_id` to `OrderSnap`**

In `src/lib/orders/email-draft-helpers.ts`, find the `OrderSnap` type and add `group_id`:

```typescript
type OrderSnap = {
  id: string
  order_number: string
  vendor_id: string | null
  vendor_name: string | null
  customer_name: string | null
  customer_po: string | null
  sales_order_number: string | null
  freight_carrier: string | null
  ship_date: string | null
  is_blind_shipment: boolean
  is_revised?: boolean
  group_id?: string | null   // NEW
}
```

- [ ] **Step 2: Add group imports**

At the top of the file, add:

```typescript
import { buildMultiShipToEmail, type MultiShipToOrderForEmail } from '@/lib/email/build-multi-ship-to-email'
```

- [ ] **Step 3: Add group detection branch to `sendPoEmail`**

At the very start of the `try` block in `sendPoEmail`, before the existing vendor fetch, insert:

```typescript
    // ── Group path ───────────────────────────────────────────────────────────
    if (order.group_id) {
      const groupRes = await fetch(`/api/order-groups/${order.group_id}`)
      if (!groupRes.ok) throw new Error('Failed to fetch group')
      const group = await groupRes.json() as {
        group_po_number: string
        order_ids: string[]
        orders: Array<{ id: string; order_number: string; customer_name: string | null }>
      }

      let vendor: VendorRow | null = null
      if (order.vendor_id) {
        const res = await fetch(`/api/vendors/${order.vendor_id}`)
        if (res.ok) vendor = await res.json() as VendorRow
      }

      const siblingDetails = await Promise.all(
        group.order_ids.map(id =>
          fetch(`/api/orders/${id}`).then(r => r.ok ? r.json() : null)
        )
      )
      const validSiblings = siblingDetails.filter(Boolean) as Array<{
        order_number: string
        customer_name: string | null
        customer_po: string | null
        ship_date: string | null
        ship_to: { city?: string; state?: string } | null
        po_notes: string | null
        split_loads: Array<{
          description: string | null
          part_number: string | null
          qty: string | null
          sell: string | null
          order_number_override: string | null
        }>
      }>

      const ordersForEmail: MultiShipToOrderForEmail[] = validSiblings.map(o => ({
        order_number: o.order_number,
        customer_name: o.customer_name,
        customer_po: o.customer_po ?? null,
        ship_date: o.ship_date ?? null,
        ship_to: o.ship_to ?? null,
        po_notes: o.po_notes ?? null,
        split_loads: (o.split_loads ?? []).map((l: { description: string | null; part_number: string | null; qty: string | null; sell: string | null; order_number_override: string | null }) => ({
          description: l.description ?? null,
          part_number: l.part_number ?? null,
          qty: l.qty ?? null,
          sell: l.sell ?? null,
          order_number_override: l.order_number_override ?? null,
        })),
      }))

      const vendorForEmail = {
        name: vendor?.name ?? order.vendor_name ?? '',
        address: vendor?.address as { city?: string; state?: string } | null ?? null,
        po_contacts: (vendor?.po_contacts ?? []) as Array<{ name: string; email: string; role?: 'to' | 'cc'; is_primary?: boolean }>,
      }

      const { subject, bodyHtml, to, cc } = buildMultiShipToEmail(
        group.group_po_number,
        vendorForEmail,
        ordersForEmail,
      )
      const [token, signature] = await Promise.all([getMailToken(), getUserSignature()])
      const pdfRes = await fetch(`/api/orders/${order.id}/po-pdf`)
      if (!pdfRes.ok) throw new Error('Failed to fetch combined PO PDF')
      const base64 = await blobToBase64(await pdfRes.blob())
      const { id: messageId, webLink } = await createDraft(token, { to, cc, subject, bodyHtml, signature })
      await attachFileToDraft(token, messageId, `MPH PO ${group.group_po_number} Multi-Ship-To.pdf`, base64)
      toast.success('Draft created — opening Outlook', { id: toastId })
      openDraft(webLink)
      return
    }
    // ── End group path ────────────────────────────────────────────────────────
```

- [ ] **Step 4: Pass `group_id` from `handleEmailPoClick` in use-edit-order-form.ts**

In `src/components/orders/use-edit-order-form.ts`, find `handleEmailPoClick` and add `group_id`:

```typescript
  function handleEmailPoClick() {
    if (!order) return
    void sendPoEmail(
      { id: orderId, order_number: order.order_number, vendor_id: order.vendor_id,
        vendor_name: order.vendor_name, customer_name: order.customer_name,
        customer_po: order.customer_po, sales_order_number: order.sales_order_number,
        freight_carrier: freightCarrier || order.freight_carrier, ship_date: order.ship_date,
        is_blind_shipment: order.is_blind_shipment, is_revised: order.is_revised,
        group_id: order.group_id ?? null },   // NEW
      splitLoads, shipDate, shipTo, poNotes, setEmailingPo,
    )
  }
```

### Part B — use-order-email-actions.ts

- [ ] **Step 5: Add group detection to `handleEmailPosClick`**

In `src/components/orders/use-order-email-actions.ts`, add imports:

```typescript
import { buildMultiShipToEmail, type MultiShipToOrderForEmail } from '@/lib/email/build-multi-ship-to-email'
```

After fetching `fullOrders` and `vendor` in `handleEmailPosClick`, add a group detection branch BEFORE the existing `buildPoEmail` call:

```typescript
      // ── Group detection ───────────────────────────────────────────────────
      const firstOrder = fullOrders[0] as { group_id?: string | null } & typeof fullOrders[0]
      if (firstOrder.group_id) {
        const groupRes = await fetch(`/api/order-groups/${firstOrder.group_id}`)
        if (!groupRes.ok) throw new Error('Failed to fetch group')
        const group = await groupRes.json() as {
          group_po_number: string
          order_ids: string[]
        }

        toast.loading(`Creating Multi-Ship-To draft…`, { id: toastId })

        const siblingDetails = await Promise.all(
          group.order_ids.map(id =>
            fetch(`/api/orders/${id}`).then(r => r.ok ? r.json() : null)
          )
        )
        const validSiblings = siblingDetails.filter(Boolean) as any[]

        const ordersForEmail: MultiShipToOrderForEmail[] = validSiblings.map((o: any) => ({
          order_number: o.order_number,
          customer_name: o.customer_name ?? null,
          customer_po: o.customer_po ?? null,
          ship_date: o.ship_date ?? null,
          ship_to: o.ship_to ?? null,
          po_notes: o.po_notes ?? null,
          split_loads: (o.split_loads ?? []).map((l: any) => ({
            description: l.description ?? null,
            part_number: l.part_number ?? null,
            qty: l.qty ?? null,
            sell: l.sell ?? null,
            order_number_override: l.order_number_override ?? null,
          })),
        }))

        const vendorForEmail = {
          name: vendor.name ?? '',
          address: vendor.address as { city?: string; state?: string } | null ?? null,
          po_contacts: (vendor.po_contacts ?? []) as Array<{ name: string; email: string; role?: 'to' | 'cc'; is_primary?: boolean }>,
        }

        const { subject, bodyHtml, to, cc } = buildMultiShipToEmail(
          group.group_po_number,
          vendorForEmail,
          ordersForEmail,
        )
        const [token, signature] = await Promise.all([getMailToken(), getUserSignature()])
        const pdfRes = await fetch(`/api/orders/${firstOrder.id}/po-pdf`)
        if (!pdfRes.ok) throw new Error('Failed to fetch combined PO PDF')
        const base64 = await blobToBase64(await pdfRes.blob())
        const { id: messageId, webLink } = await createDraft(token, { to, cc, subject, bodyHtml, signature })
        await attachFileToDraft(token, messageId, `MPH PO ${group.group_po_number} Multi-Ship-To.pdf`, base64)
        toast.success('Draft created — opening Outlook', { id: toastId })
        openDraft(webLink)
        onClearSelection()
        return
      }
      // ── End group detection ───────────────────────────────────────────────
```

---

## Task 13: Order Detail Page — Group Section

**Files:**
- Modify: `src/components/orders/use-edit-order-form.ts`
- Modify: `src/app/(dashboard)/orders/[orderId]/page.tsx`

### Part A — use-edit-order-form.ts

- [ ] **Step 1: Add `groupData` state**

In `use-edit-order-form.ts`, add a state for group data after existing state declarations:

```typescript
  const [groupData, setGroupData] = useState<{
    id: string
    group_po_number: string
    orders: Array<{ id: string; order_number: string; customer_name: string | null }>
  } | null>(null)
```

- [ ] **Step 2: Fetch group data when order has `group_id`**

In the `useEffect` that loads the order (the one that calls `fetch('/api/orders/${orderId}')`), after setting order state and when `group_id` is present, add:

```typescript
        if (data.group_id) {
          fetch(`/api/order-groups/${data.group_id}`)
            .then(r => r.ok ? r.json() : null)
            .then(g => { if (g) setGroupData(g) })
            .catch(() => {})
        }
```

- [ ] **Step 3: Expose `groupData` and `isAdmin` from the hook return**

In the hook's return object, add:

```typescript
    groupData,
    isAdmin,
```

(Check if `isAdmin` is already returned — if so, only add `groupData`.)

### Part B — page.tsx

- [ ] **Step 4: Destructure `groupData` from `useEditOrderForm`**

In `OrderDetailPage`, add `groupData` to the destructure from `useEditOrderForm(orderId)`.

- [ ] **Step 5: Add the group section**

After the Checklist section and before the isAdmin delete section, add:

```tsx
      {order.group_id && groupData && (
        <>
          <Separator className="bg-[#B88A44]" />
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Multi-Ship-To Group</h2>
            <div className="rounded-md border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Link className="h-4 w-4 text-[#0C447C]" />
                <span className="text-sm font-medium">Group PO: <span className="font-mono">{groupData.group_po_number}</span></span>
              </div>
              <ul className="space-y-1">
                {groupData.orders.map(o => (
                  <li key={o.id} className="text-sm">
                    <a
                      href={`/orders/${o.id}`}
                      className="text-[#00205B] hover:underline font-mono"
                    >
                      {o.order_number}
                    </a>
                    {o.customer_name && (
                      <span className="text-muted-foreground ml-2">— {o.customer_name}</span>
                    )}
                  </li>
                ))}
              </ul>
              {isAdmin && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('Remove this group? All orders will revert to standalone POs.')) return
                    const res = await fetch(`/api/order-groups/${groupData.id}`, { method: 'DELETE' })
                    if (res.ok) {
                      toast.success('Group removed')
                      window.location.reload()
                    } else {
                      toast.error('Failed to remove group')
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-destructive px-3 py-1.5 text-sm text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  Ungroup
                </button>
              )}
            </div>
          </section>
        </>
      )}
```

Import `Link` from `lucide-react` at the top of `page.tsx` if not already there.

---

## Task 14: TypeScript Check + Commit

- [ ] **Step 1: Run TypeScript check**

```powershell
npx tsc --noEmit
```

Fix any type errors before committing. Common issues:
- `group_id` not in `OrderRow` → add to type (Task 7)
- `order_groups` not imported in a route → add to import
- `group_po_number` missing from `OrderDetail` → add to edit-order-types.ts (Task 7)

- [ ] **Step 2: Start dev server and verify basic functionality**

```powershell
npm run dev
```

Navigate to `/orders`. Verify:
1. No console errors
2. Orders load normally
3. Select 2 orders — "Group as Multi-Ship-To" button appears
4. Select 1 order — button does NOT appear

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat: multi-ship-to order groups"
```

- [ ] **Step 4: Merge to main and push**

From this worktree (do NOT checkout main):

```powershell
git push origin HEAD:main
```

- [ ] **Step 5: Verify commit on main**

```powershell
git pull origin main
git log --oneline -3
```

Expected: top commit is "feat: multi-ship-to order groups".

---

## Self-Review Checklist

Spec coverage:

| Spec requirement | Covered by task |
|---|---|
| `order_groups` table | Task 1 + 2 |
| `group_id` FK on `orders` | Task 1 + 2 |
| RLS on `order_groups` | Task 1 |
| `POST /api/order-groups` — 5 validations | Task 3 |
| `DELETE /api/order-groups/[id]` | Task 4 |
| Group badge on Customer column | Task 7 |
| "Group as Multi-Ship-To" toolbar button (2-4 only) | Task 8 |
| Toast on success with group_po_number | Task 8 |
| Toast on error with API message | Task 8 |
| `MultiShipToPDF` combined PDF component | Task 9 |
| PO PDF route detects group_id | Task 10 |
| Combined PO email `buildMultiShipToEmail` | Task 11 |
| PO email detects group from order detail page | Task 12A |
| PO email detects group from orders list toolbar | Task 12B |
| Order detail page group section | Task 13 |
| Ungroup button (ADMIN only) | Task 13 |
| Links to sibling orders | Task 13 |
| group_po_number from `nextval` | Task 3 |
| Customer confirmation emails unchanged | ✓ not touched |
| Single-order PO PDF path unchanged | Task 10 (preserved) |
| Recycling orders untouched | ✓ not touched |
| `order_split_loads` unchanged | ✓ not touched |
| `order_number` individual sequence unchanged | ✓ group uses same seq, separate number |
