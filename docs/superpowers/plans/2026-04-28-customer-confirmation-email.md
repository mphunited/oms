# Customer Confirmation Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Email Customer Confirmation" workflow — a Graph API Outlook draft with a styled HTML table summarizing order details — triggerable from the Edit Order page and the Orders list bulk toolbar.

**Architecture:** The feature has three layers: (1) a shape change to `customer_contacts` JSONB adding `is_primary: boolean`, (2) a new API route `POST /api/orders/confirmation-email` that builds the HTML body and opens a Graph API draft, and (3) UI wiring on the edit page and orders table. No DB migration required — the JSONB shape change is handled entirely in form state and API logic, with backward-compat fallback.

**Tech Stack:** Next.js 16 API routes, Drizzle ORM, Microsoft Graph API (`createDraft`/`openDraft` from `src/lib/email/graph-mail.ts`), shadcn/ui, Tailwind CSS, TypeScript.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/components/orders/edit-order-addresses.tsx` | Modify | `CustomerContact` type gains `is_primary?: boolean`; contact rows get To/Cc toggle; `onContactsChange` callback works the same |
| `src/lib/orders/order-form-schema.ts` | Modify | `contactSchema` gains `is_primary: z.boolean().optional()` |
| `src/components/orders/order-contact-fields.tsx` | Modify | New order form contact rows get To/Cc toggle (mirrors edit-order-addresses) |
| `src/app/(dashboard)/orders/[orderId]/page.tsx` | Modify | Remove Ship Date + Wanted Date from Freight section; Remove Customer PO from CSR section; move CSR 2 into same row as Salesperson + CSR; add "Email Customer Confirmation" button |
| `src/components/orders/use-edit-order-form.ts` | Modify | Add `emailingConfirmation` state + `handleEmailConfirmationClick` |
| `src/app/api/orders/confirmation-email/route.ts` | Create | `POST` handler — fetches orders, guards multi-customer, builds HTML, calls createDraft/openDraft via Graph API |
| `src/lib/orders/build-confirmation-email.ts` | Create | Pure function: takes order data array → returns `{ subject, bodyHtml, to, cc, greeting }` |
| `src/components/orders/orders-table.tsx` | Modify | Add "Email Customer Confirmation" button to bulk toolbar |

---

## Task 1: Extend CustomerContact type with `is_primary`

**Files:**
- Modify: `src/components/orders/edit-order-addresses.tsx`
- Modify: `src/lib/orders/order-form-schema.ts`

- [ ] **Step 1: Update `CustomerContact` type in `edit-order-addresses.tsx`**

Change line 24:
```ts
export type CustomerContact = { id?: string; name: string; email: string }
```
to:
```ts
export type CustomerContact = { id?: string; name: string; email: string; is_primary?: boolean }
```

- [ ] **Step 2: Add `is_primary` to `contactSchema` in `order-form-schema.ts`**

Change lines 53–56:
```ts
const contactSchema = z.object({
  name:  z.string().optional(),
  email: z.string().optional(),
})
```
to:
```ts
const contactSchema = z.object({
  name:       z.string().optional(),
  email:      z.string().optional(),
  is_primary: z.boolean().optional(),
})
```

- [ ] **Step 3: Commit**
```bash
git add src/components/orders/edit-order-addresses.tsx src/lib/orders/order-form-schema.ts
git commit -m "feat: add is_primary field to CustomerContact type and contactSchema"
```

---

## Task 2: Add To/Cc toggle to Customer Contacts in `edit-order-addresses.tsx`

**Files:**
- Modify: `src/components/orders/edit-order-addresses.tsx`

The goal: each contact row shows a small "To / Cc" toggle. When `is_primary` is `true` (or missing/undefined — backward compat), show "To" highlighted. When `false`, show "Cc" highlighted. Clicking flips it. New contacts appended via "Add Contact" button default `is_primary: true` for the first contact, `false` for all subsequent.

- [ ] **Step 1: Update "Add Contact" button handler to set `is_primary`**

In `EditOrderAddresses`, change the `Add Contact` button `onClick`:
```tsx
onClick={() => {
  const isPrimary = customerContacts.length === 0
  onContactsChange([...customerContacts, { id: crypto.randomUUID(), name: '', email: '', is_primary: isPrimary }])
}}
```

- [ ] **Step 2: Replace the contact row grid with a To/Cc toggle**

Replace the existing `customerContacts.map(...)` block (lines 145–167) with:
```tsx
{customerContacts.map((contact, index) => {
  const isPrimary = contact.is_primary !== false  // backward compat: treat undefined as true
  return (
    <div key={contact.id ?? `contact-${index}`} className="grid grid-cols-6 gap-2 rounded-md border p-3">
      <div className="col-span-2 space-y-1">
        <Label className="text-xs text-muted-foreground">Name</Label>
        <Input value={contact.name}
          onChange={e => onContactsChange(customerContacts.map((c, i) => i === index ? { ...c, name: e.target.value } : c))}
          placeholder="Full name" />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs text-muted-foreground">Email</Label>
        <Input type="email" value={contact.email}
          onChange={e => onContactsChange(customerContacts.map((c, i) => i === index ? { ...c, email: e.target.value } : c))}
          placeholder="email@company.com" />
      </div>
      <div className="col-span-1 flex flex-col justify-end gap-1">
        <Label className="text-xs text-muted-foreground">Role</Label>
        <div className="flex rounded-md border overflow-hidden h-9 text-xs">
          <button
            type="button"
            className={`flex-1 px-2 transition-colors ${isPrimary ? 'bg-[#00205B] text-white' : 'bg-background text-muted-foreground hover:bg-accent'}`}
            onClick={() => onContactsChange(customerContacts.map((c, i) => i === index ? { ...c, is_primary: true } : c))}
          >To</button>
          <button
            type="button"
            className={`flex-1 px-2 transition-colors ${!isPrimary ? 'bg-[#00205B] text-white' : 'bg-background text-muted-foreground hover:bg-accent'}`}
            onClick={() => onContactsChange(customerContacts.map((c, i) => i === index ? { ...c, is_primary: false } : c))}
          >Cc</button>
        </div>
      </div>
      <div className="flex items-end">
        <Button type="button" variant="ghost" size="icon"
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onContactsChange(customerContacts.filter((_, i) => i !== index))}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
})}
```

- [ ] **Step 3: Commit**
```bash
git add src/components/orders/edit-order-addresses.tsx
git commit -m "feat: add To/Cc toggle to Customer Contacts in edit order addresses"
```

---

## Task 3: Add To/Cc toggle to Customer Contacts in `order-contact-fields.tsx` (New Order form)

**Files:**
- Modify: `src/components/orders/order-contact-fields.tsx`

The new order form uses `react-hook-form` field arrays. The toggle sets `is_primary` via `setValue`.

- [ ] **Step 1: Replace `OrderContactFields` component**

Replace the entire file content with:
```tsx
'use client'

import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import type { Control, UseFormSetValue } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { OrderFormValues } from '@/lib/orders/order-form-schema'

type RegisterFn = ReturnType<typeof useForm<OrderFormValues>>['register']

export function OrderContactFields({ control, register, setValue }: {
  control: Control<OrderFormValues>
  register: RegisterFn
  setValue: UseFormSetValue<OrderFormValues>
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'customer_contacts' })
  const watched = useWatch({ control, name: 'customer_contacts' })

  return (
    <div className="col-span-2 space-y-3">
      <div className="flex items-center justify-between">
        <Label>Customer Contacts For Order Confirmations</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', email: '', is_primary: fields.length === 0 })}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />Add Contact
        </Button>
      </div>
      {fields.length === 0 && <p className="text-xs text-muted-foreground">No contacts added. Add a contact with an email to generate an Outlook link after saving.</p>}
      {fields.map((field, idx) => {
        const isPrimary = (watched?.[idx]?.is_primary) !== false
        return (
          <div key={field.id} className="grid grid-cols-6 gap-2 rounded-md border p-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input placeholder="Full name" {...register(`customer_contacts.${idx}.name`)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input type="email" placeholder="email@company.com" {...register(`customer_contacts.${idx}.email`)} />
            </div>
            <div className="col-span-1 flex flex-col justify-end gap-1">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <div className="flex rounded-md border overflow-hidden h-9 text-xs">
                <button type="button"
                  className={`flex-1 px-2 transition-colors ${isPrimary ? 'bg-[#00205B] text-white' : 'bg-background text-muted-foreground hover:bg-accent'}`}
                  onClick={() => setValue(`customer_contacts.${idx}.is_primary`, true)}>To</button>
                <button type="button"
                  className={`flex-1 px-2 transition-colors ${!isPrimary ? 'bg-[#00205B] text-white' : 'bg-background text-muted-foreground hover:bg-accent'}`}
                  onClick={() => setValue(`customer_contacts.${idx}.is_primary`, false)}>Cc</button>
              </div>
            </div>
            <div className="flex items-end">
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(idx)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Pass `setValue` to `OrderContactFields` in `new-order-form.tsx`**

Find the line in `new-order-form.tsx` (around line 268) that renders `<OrderContactFields control={form.control} register={form.register} />` and add `setValue={form.setValue}`:
```tsx
<OrderContactFields control={form.control} register={form.register} setValue={form.setValue} />
```

- [ ] **Step 3: Commit**
```bash
git add src/components/orders/order-contact-fields.tsx src/components/orders/new-order-form.tsx
git commit -m "feat: add To/Cc toggle to Customer Contacts in new order form"
```

---

## Task 4: Edit Order form — field removals and CSR row layout

**Files:**
- Modify: `src/app/(dashboard)/orders/[orderId]/page.tsx`

Changes:
1. Remove **Ship Date** and **Wanted Date** from Freight & Logistics section (they live per-load on split loads)
2. Remove **Customer PO** from the CSR / Order Identity section (it exists per-load on Load 1)
3. Move **CSR 2 (optional)** onto the same row as Salesperson and CSR — making a 3-column row

- [ ] **Step 1: Convert the CSR section to a 3-col grid and remove Customer PO**

In the "Order Identity" section of `page.tsx` (lines ~134–185), the current grid is `grid-cols-2`. Change the Salesperson/CSR/CSR2/CustomerPO block to:
```tsx
<div className="grid grid-cols-3 gap-4">
  <div className="space-y-1.5">
    <Label>Salesperson</Label>
    <OrderCombobox
      options={salespersonOptions}
      value={salespersonId}
      onChange={v => setSalespersonId(v)}
      placeholder="Choose salesperson"
    />
  </div>
  <div className="space-y-1.5">
    <Label>CSR</Label>
    <Select value={csrId} onValueChange={v => setCsrId(v ?? '')}>
      <SelectTrigger><SelectValue placeholder="Select CSR">
        {csrId ? (csrUserOptions.find(u => u.id === csrId)?.name ?? csrId) : 'Select CSR'}
      </SelectValue></SelectTrigger>
      <SelectContent>{csrUserOptions.map(u => <SelectItem key={u.id} value={u.id}>{u.name ?? u.id}</SelectItem>)}</SelectContent>
    </Select>
  </div>
  <div className="space-y-1.5">
    <Label>CSR 2 (optional)</Label>
    <Select value={csr2Id ?? 'none'} onValueChange={v => setCsr2Id(v === 'none' ? null : (v ?? null))}>
      <SelectTrigger><SelectValue placeholder="None">
        {csr2Id && csr2Id !== 'none' ? (csrUserOptions.find(u => u.id === csr2Id)?.name ?? csr2Id) : 'None'}
      </SelectValue></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {csrUserOptions.map(u => <SelectItem key={u.id} value={u.id}>{u.name ?? u.id}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
</div>
```

Note: The entire `<div className="space-y-1.5"><Label>Customer PO</Label>...` block is removed. The `customerPo` state and `setCustomerPo` remain in the hook (they are still sent in PATCH) — only the UI input field is removed from this section.

- [ ] **Step 2: Remove Ship Date and Wanted Date from Freight & Logistics section**

In the Freight & Logistics section (lines ~267–285), remove the entire `grid grid-cols-2` sub-block that contains Ship Date and Wanted Date fields:
```tsx
{/* REMOVE THIS BLOCK */}
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-1.5">
    <Label>Ship Date</Label>
    <Input type="date" value={shipDate} onChange={e => setShipDate(e.target.value)} />
  </div>
  <div className="space-y-1.5">
    <Label>Wanted Date</Label>
    <Input type="date" value={wantedDate} onChange={e => setWantedDate(e.target.value)} />
  </div>
  ...
</div>
```

Keep the Appointment Time and Appointment Notes fields, and move them into the existing `grid-cols-4` row so Freight section becomes just one row:
```tsx
<div className="grid grid-cols-4 gap-4">
  <div className="space-y-1.5">
    <Label>Freight Carrier</Label>
    <Select value={freightCarrier} onValueChange={v => { if (v) setFreightCarrier(v) }}>
      <SelectTrigger className="h-9"><SelectValue placeholder="Select carrier" /></SelectTrigger>
      <SelectContent>{carriers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
    </Select>
  </div>
  <div className="space-y-1.5">
    <Label>MPH Freight Cost</Label>
    <Input type="number" min="0" step="0.01" value={freightCost} onChange={e => setFreightCost(e.target.value)} placeholder="0.00" />
  </div>
  <div className="space-y-1.5">
    <Label>Customer Freight Cost</Label>
    <Input type="number" min="0" step="0.01" value={freightToCustomer} onChange={e => setFreightToCustomer(e.target.value)} placeholder="0.00" />
  </div>
  <div className="space-y-1.5">
    <Label>Additional Costs</Label>
    <Input type="number" min="0" step="0.01" value={additionalCosts} onChange={e => setAdditionalCosts(e.target.value)} placeholder="0.00" />
  </div>
</div>
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-1.5">
    <Label>Appointment Time</Label>
    <Input value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)} placeholder="e.g. 9:00 AM – 10:00 AM" />
  </div>
  <div className="space-y-1.5">
    <Label>Appointment Notes</Label>
    <Input value={appointmentNotes} onChange={e => setAppointmentNotes(e.target.value)} placeholder="Optional" />
  </div>
</div>
```

- [ ] **Step 3: Commit**
```bash
git add src/app/(dashboard)/orders/[orderId]/page.tsx
git commit -m "feat: edit order form — remove Ship Date, Wanted Date, Customer PO; merge CSR row to 3-col"
```

---

## Task 5: Create `build-confirmation-email.ts` — pure email builder

**Files:**
- Create: `src/lib/orders/build-confirmation-email.ts`

This is a pure function — no fetching, no side effects. It takes the assembled order data and returns the email parts.

- [ ] **Step 1: Create the file**

```ts
// src/lib/orders/build-confirmation-email.ts

export type ConfirmationLoad = {
  order_number_override: string | null
  customer_po: string | null
  description: string | null
  qty: string | null
  sell: string | null
  ship_date: string | null
}

export type ConfirmationOrder = {
  id: string
  order_number: string
  customer_name: string
  customer_po: string | null
  freight_carrier: string | null
  wanted_date: string | null
  ship_to: {
    name?: string
    street?: string
    street2?: string
    city?: string
    state?: string
    zip?: string
  } | null
  payment_terms: string | null
  vendor_name: string | null
  vendor_address: {
    street?: string
    city?: string
    state?: string
    zip?: string
  } | null
  vendor_dock_info: string | null
  split_loads: ConfirmationLoad[]
  customer_contacts: Array<{ name?: string; email?: string; is_primary?: boolean }> | null
}

function isCpu(carrier: string | null): boolean {
  return !!carrier && carrier.toLowerCase().includes('cpu')
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

function firstNames(contacts: Array<{ name?: string }>): string {
  const names = contacts
    .map(c => (c.name ?? '').trim().split(' ')[0])
    .filter(Boolean)
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return names.join(', ')
}

function buildTable(loads: ConfirmationLoad[], orderNumber: string, orderCustomerPo: string | null): string {
  const rows = loads.map(l => {
    const mphPo = l.order_number_override ?? orderNumber
    const custPo = l.customer_po ?? orderCustomerPo ?? '—'
    const desc = l.description ?? '—'
    const qty = l.qty ?? '—'
    const price = l.sell ? `$${Number(l.sell).toFixed(2)}` : '—'
    const shipDate = formatDate(l.ship_date)
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:14px;">${mphPo}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:14px;">${custPo}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:14px;">${desc}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:14px;text-align:right;">${qty}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:14px;text-align:right;">${price}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:14px;">${shipDate}</td>
      </tr>`
  }).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="background-color:#00205B;">
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;">MPH PO</th>
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;">Customer PO</th>
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;">Description</th>
          <th style="padding:10px 12px;text-align:right;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;">Qty</th>
          <th style="padding:10px 12px;text-align:right;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;">Price</th>
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;">Ship Date</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

export function buildConfirmationEmail(orders: ConfirmationOrder[]): {
  subject: string
  bodyHtml: string
  to: string[]
  cc: string[]
} {
  const first = orders[0]
  const contacts = first.customer_contacts ?? []

  const toContacts = contacts.filter(c => c.is_primary !== false)
  const ccContacts = contacts.filter(c => c.is_primary === false)

  const toEmails = (toContacts.length > 0 ? toContacts : contacts)
    .map(c => c.email?.trim())
    .filter((e): e is string => !!e)

  const ccEmails = (toContacts.length > 0 ? ccContacts : [])
    .map(c => c.email?.trim())
    .filter((e): e is string => !!e)

  const greetingContacts = toContacts.length > 0 ? toContacts : contacts
  const greeting = firstNames(greetingContacts)

  const allMphPos = orders.flatMap(o =>
    o.split_loads.map(l => l.order_number_override ?? o.order_number)
  )
  const uniqueMphPos = [...new Set(allMphPos)]

  const custPo = first.customer_po
  const subject = custPo && orders.length === 1
    ? `Order Confirmation — ${first.customer_name} | PO: ${custPo} | MPH: ${uniqueMphPos.join(', ')}`
    : `Order Confirmation — ${first.customer_name} | MPH: ${uniqueMphPos.join(', ')}`

  const tablesHtml = orders.map(o => buildTable(o.split_loads, o.order_number, o.customer_po)).join('')

  const firstLoad = orders[0].split_loads[0]
  const shipDateDisplay = formatDate(firstLoad?.ship_date)
  const etaDisplay = formatDate(orders[0].wanted_date)
  const shipVia = orders[0].freight_carrier ?? '—'
  const paymentTerms = orders[0].payment_terms ?? '—'

  const shipTo = orders[0].ship_to
  const shipToLines = shipTo
    ? [
        shipTo.name,
        shipTo.street,
        shipTo.street2,
        [shipTo.city, shipTo.state, shipTo.zip].filter(Boolean).join(', '),
      ].filter(Boolean).join('<br>')
    : '—'

  const cpuOrder = orders.find(o => isCpu(o.freight_carrier))
  const vendorBlock = cpuOrder
    ? `
      <p style="font-family:Arial,sans-serif;font-size:14px;margin:20px 0 8px;">For picking up, please contact the shipping area at the following plant below to schedule your appointment prior to going on for it. Though it's not common, we may have unforeseen issues that happen overnight that could negatively impact the timely shipment of your load. We ask that you have the carrier contact the plant the morning of the scheduled pick up to make sure it is still ready to go to avoid TONU charges.</p>
      <p style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;margin:8px 0;">***HAVE MPH PO # FOR PICK UP REFERENCE***</p>
      <p style="font-family:Arial,sans-serif;font-size:14px;margin:8px 0;">
        ${cpuOrder.vendor_name ?? ''}<br>
        ${cpuOrder.vendor_address?.street ?? ''}<br>
        ${[cpuOrder.vendor_address?.city, cpuOrder.vendor_address?.state, cpuOrder.vendor_address?.zip].filter(Boolean).join(', ')}<br>
        ${cpuOrder.vendor_dock_info ?? ''}
      </p>`
    : `<p style="font-family:Arial,sans-serif;font-size:14px;margin:20px 0 0;">Please do not hesitate to reach out with any questions.</p>`

  const greetingLine = greeting ? `Hello ${greeting},` : 'Hello,'

  const bodyHtml = `
    <div style="max-width:700px;margin:0 auto;font-family:Arial,sans-serif;color:#1f2937;">
      <p style="font-size:14px;margin:0 0 16px;">${greetingLine}</p>
      <p style="font-size:14px;margin:0 0 16px;">Please see your order confirmation below.</p>

      ${tablesHtml}

      <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;padding:2px 12px 2px 0;color:#00205B;">Ship Date:</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;padding:2px 0;">${shipDateDisplay}</td>
        </tr>
        <tr>
          <td style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;padding:2px 12px 2px 0;color:#00205B;">ETA Delivery Date:</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;padding:2px 0;">${etaDisplay}</td>
        </tr>
        <tr>
          <td style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;padding:2px 12px 2px 0;color:#00205B;">Ship Via:</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;padding:2px 0;">${shipVia}</td>
        </tr>
        <tr>
          <td style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;padding:2px 12px 2px 0;color:#00205B;">Payment Terms:</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;padding:2px 0;">${paymentTerms}</td>
        </tr>
      </table>

      <p style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;margin:0 0 4px;color:#00205B;">Ship To:</p>
      <p style="font-family:Arial,sans-serif;font-size:14px;margin:0 0 16px;">${shipToLines}</p>

      ${vendorBlock}
    </div>`

  return { subject, bodyHtml, to: toEmails, cc: ccEmails }
}
```

- [ ] **Step 2: Commit**
```bash
git add src/lib/orders/build-confirmation-email.ts
git commit -m "feat: add buildConfirmationEmail pure function"
```

---

## Task 6: Create API route `POST /api/orders/confirmation-email`

**Files:**
- Create: `src/app/api/orders/confirmation-email/route.ts`

This route:
1. Reads `{ orderIds: string[] }` from the request body
2. Fetches all orders + split loads + vendor + customer from the DB
3. Guards against multi-customer selection (400)
4. Calls `buildConfirmationEmail` to get `{ subject, bodyHtml, to, cc }`
5. Gets MSAL token and user signature server-side (no — MSAL is client-side only; the token is passed from the browser)

**IMPORTANT ARCHITECTURE NOTE:** `getMailToken()` from `msal-client.ts` is a **client-side** function that uses `@azure/msal-browser`. It cannot be called from a server-side API route. The pattern used in the rest of the app (see `src/lib/orders/email-draft-helpers.ts`) is: the browser acquires the token via `getMailToken()`, then calls `createDraft()` directly with the token. 

Therefore, this API route does NOT call the Graph API. Instead, it:
1. Fetches all required order data from the DB
2. Calls `buildConfirmationEmail` 
3. Returns `{ subject, bodyHtml, to, cc }` to the client
4. The client calls `createDraft` / `openDraft` directly using the MSAL token

This matches how `email-draft-helpers.ts` works.

- [ ] **Step 1: Create the route**

```ts
// src/app/api/orders/confirmation-email/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, vendors, customers } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { buildConfirmationEmail } from '@/lib/orders/build-confirmation-email'
import type { ConfirmationOrder } from '@/lib/orders/build-confirmation-email'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { orderIds?: string[] }
  const orderIds = body.orderIds
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ error: 'orderIds required' }, { status: 400 })
  }

  const rows = await db
    .select({
      order: orders,
      vendor: vendors,
      customer: customers,
    })
    .from(orders)
    .leftJoin(vendors, eq(orders.vendor_id, vendors.id))
    .leftJoin(customers, eq(orders.customer_id, customers.id))
    .where(inArray(orders.id, orderIds))

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Orders not found' }, { status: 404 })
  }

  const uniqueCustomers = new Set(rows.map(r => r.order.customer_id))
  if (uniqueCustomers.size > 1) {
    return NextResponse.json(
      { error: 'Selected orders belong to multiple customers. Please select orders for one customer only.' },
      { status: 400 }
    )
  }

  const loads = await db
    .select()
    .from(order_split_loads)
    .where(inArray(order_split_loads.order_id, orderIds))

  const loadsByOrder = new Map<string, typeof loads>()
  for (const load of loads) {
    const existing = loadsByOrder.get(load.order_id) ?? []
    existing.push(load)
    loadsByOrder.set(load.order_id, existing)
  }

  const confirmationOrders: ConfirmationOrder[] = rows.map(r => {
    const addr = r.vendor?.address as { street?: string; city?: string; state?: string; zip?: string } | null
    const contacts = r.order.customer_contacts as Array<{ name?: string; email?: string; is_primary?: boolean }> | null
    const shipTo = r.order.ship_to as { name?: string; street?: string; street2?: string; city?: string; state?: string; zip?: string } | null
    const orderLoads = (loadsByOrder.get(r.order.id) ?? []).map(l => ({
      order_number_override: l.order_number_override,
      customer_po: l.customer_po,
      description: l.description,
      qty: l.qty,
      sell: l.sell,
      ship_date: l.ship_date,
    }))

    return {
      id: r.order.id,
      order_number: r.order.order_number,
      customer_name: r.customer?.name ?? '',
      customer_po: r.order.customer_po,
      freight_carrier: r.order.freight_carrier,
      wanted_date: r.order.wanted_date,
      ship_to: shipTo,
      payment_terms: r.order.terms,
      vendor_name: r.vendor?.name ?? null,
      vendor_address: addr,
      vendor_dock_info: r.vendor?.dock_info ?? null,
      split_loads: orderLoads,
      customer_contacts: contacts,
    }
  })

  const emailData = buildConfirmationEmail(confirmationOrders)
  return NextResponse.json(emailData)
}
```

- [ ] **Step 2: Check Supabase server client import path**

Look at another API route (e.g., `src/app/api/orders/route.ts`) to confirm the correct import for `createClient`. The pattern in this codebase is typically:
```ts
import { createClient } from '@/lib/supabase/server'
```
Verify this path exists before committing.

- [ ] **Step 3: Commit**
```bash
git add src/app/api/orders/confirmation-email/route.ts
git commit -m "feat: add POST /api/orders/confirmation-email API route"
```

---

## Task 7: Add `handleEmailConfirmationClick` to `use-edit-order-form.ts`

**Files:**
- Modify: `src/components/orders/use-edit-order-form.ts`

The hook needs to expose a handler and loading state for the confirmation email button. The handler calls the API route, gets `{ subject, bodyHtml, to, cc }`, acquires the MSAL token, creates the draft, and opens it.

- [ ] **Step 1: Add `emailingConfirmation` state**

After the existing `const [emailingBol, setEmailingBol] = useState(false)` line (line 32), add:
```ts
const [emailingConfirmation, setEmailingConfirmation] = useState(false)
```

- [ ] **Step 2: Add handler function**

Add after `handleEmailBolClick` (around line 245):
```ts
async function handleEmailConfirmationClick() {
  setEmailingConfirmation(true)
  try {
    const res = await fetch('/api/orders/confirmation-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: [orderId] }),
    })
    if (!res.ok) {
      const data = await res.json() as { error?: string }
      throw new Error(data.error ?? `${res.status}`)
    }
    const emailData = await res.json() as { subject: string; bodyHtml: string; to: string[]; cc: string[] }
    const { getMailToken } = await import('@/lib/email/msal-client')
    const { createDraft, openDraft } = await import('@/lib/email/graph-mail')
    const { getUserSignature } = await import('@/lib/email/get-user-signature')
    const [token, signature] = await Promise.all([getMailToken(), getUserSignature()])
    const draft = await createDraft(token, {
      to: emailData.to,
      cc: emailData.cc,
      subject: emailData.subject,
      bodyHtml: emailData.bodyHtml,
      signature,
    })
    openDraft(draft.webLink)
    toast.success('Draft email opened in Outlook')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to create email draft')
  } finally {
    setEmailingConfirmation(false)
  }
}
```

- [ ] **Step 3: Add to return object**

Add to the return object at the bottom of the hook:
```ts
emailingConfirmation,
handleEmailConfirmationClick,
```

- [ ] **Step 4: Check `getUserSignature` import**

Look at `src/lib/email/get-user-signature.ts` to confirm the export name is `getUserSignature`. If it's different, adjust the import.

- [ ] **Step 5: Commit**
```bash
git add src/components/orders/use-edit-order-form.ts
git commit -m "feat: add handleEmailConfirmationClick to useEditOrderForm hook"
```

---

## Task 8: Add "Email Customer Confirmation" button to Edit Order page

**Files:**
- Modify: `src/app/(dashboard)/orders/[orderId]/page.tsx`

- [ ] **Step 1: Destructure new hook values**

In the `useEditOrderForm` destructure (around line 27), add:
```ts
emailingConfirmation,
handleEmailConfirmationClick,
```

- [ ] **Step 2: Add button to the action buttons row**

In the header button row (around lines 113–128), add after the "Email BOL" button:
```tsx
<button onClick={handleEmailConfirmationClick} disabled={emailingConfirmation} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50">
  <Mail className="h-3.5 w-3.5" /> {emailingConfirmation ? 'Creating…' : 'Email Confirmation'}
</button>
```

- [ ] **Step 3: Commit**
```bash
git add src/app/(dashboard)/orders/[orderId]/page.tsx
git commit -m "feat: add Email Customer Confirmation button to edit order page"
```

---

## Task 9: Add "Email Customer Confirmation" button to Orders table bulk toolbar

**Files:**
- Modify: `src/components/orders/orders-table.tsx`

- [ ] **Step 1: Add `emailingConfirmation` state**

After the existing state declarations (after line 32), add:
```ts
const [emailingConfirmation, setEmailingConfirmation] = useState(false)
```

- [ ] **Step 2: Add handler function**

Add after `toggleSelectAll` (around line 150):
```ts
async function handleEmailConfirmationClick() {
  setEmailingConfirmation(true)
  try {
    const res = await fetch('/api/orders/confirmation-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: [...selectedIds] }),
    })
    if (!res.ok) {
      const data = await res.json() as { error?: string }
      throw new Error(data.error ?? `${res.status}`)
    }
    const emailData = await res.json() as { subject: string; bodyHtml: string; to: string[]; cc: string[] }
    const { getMailToken } = await import('@/lib/email/msal-client')
    const { createDraft, openDraft } = await import('@/lib/email/graph-mail')
    const { getUserSignature } = await import('@/lib/email/get-user-signature')
    const [token, signature] = await Promise.all([getMailToken(), getUserSignature()])
    const draft = await createDraft(token, {
      to: emailData.to,
      cc: emailData.cc,
      subject: emailData.subject,
      bodyHtml: emailData.bodyHtml,
      signature,
    })
    openDraft(draft.webLink)
    toast.success('Draft email opened in Outlook')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create email draft'
    if (msg.includes('multiple customers')) {
      toast.error('Selected orders belong to multiple customers. Please select orders for one customer only.')
    } else {
      toast.error(msg)
    }
  } finally {
    setEmailingConfirmation(false)
  }
}
```

- [ ] **Step 3: Add button to bulk toolbar**

In the bulk action toolbar block (lines 156–170), add after the "Email BOLs" button:
```tsx
<button onClick={handleEmailConfirmationClick} disabled={emailingPos || emailingBols || emailingConfirmation}
  className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50">
  <Mail className="h-3.5 w-3.5" />
  {emailingConfirmation ? 'Creating…' : 'Email Confirmation'}
</button>
```

- [ ] **Step 4: Commit**
```bash
git add src/components/orders/orders-table.tsx
git commit -m "feat: add Email Customer Confirmation button to orders table bulk toolbar"
```

---

## Task 10: Update AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Append to AGENTS.md**

Add the following as a new numbered entry (item 49) in AGENTS.md:

```markdown
49. **customer_contacts JSONB shape on orders** | `[{name, email, is_primary: boolean}]` — `is_primary=true` → To recipient, `false` → Cc recipient for confirmation emails. Default first contact to `true`, rest to `false`. Treat missing `is_primary` as `true` for backward compatibility.

    **Email Customer Confirmation** | `POST /api/orders/confirmation-email`. Accepts `orderIds[]`. Returns `{ subject, bodyHtml, to, cc }` — does NOT call Graph API server-side (MSAL is client-only). Client acquires MSAL token, calls `createDraft`/`openDraft` from `graph-mail.ts`. Guards against multi-customer selection (400). CPU detection: `freight_carrier` contains "CPU" (case-insensitive). HTML email styled with `#00205B` header, `#B88A44` accent. CPU orders include vendor address, dock_info, and TONU verbiage. Non-CPU orders include closing line only.
```

- [ ] **Step 2: Commit**
```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md with customer_contacts is_primary and confirmation email"
```

---

## Self-Review

### Spec Coverage

| Spec requirement | Task |
|---|---|
| Remove Ship Date + Wanted Date from Freight section | Task 4 |
| Remove Customer PO from CSR section | Task 4 |
| CSR row → Salesperson \| CSR \| CSR 2 on one row | Task 4 |
| `is_primary` field on `customer_contacts` | Tasks 1, 2, 3 |
| To/Cc toggle on edit order contacts | Task 2 |
| To/Cc toggle on new order contacts | Task 3 |
| `POST /api/orders/confirmation-email` API route | Task 6 |
| Multi-customer guard (400) | Task 6 |
| CPU detection | Task 5 (`buildConfirmationEmail`) |
| `to` / `cc` from `is_primary` | Task 5 |
| Hello greeting from To recipients first names | Task 5 |
| Subject format | Task 5 |
| HTML table: MPH PO, Customer PO, Description, Qty, Price, Ship Date | Task 5 |
| Ship Date / ETA / Ship Via / Payment Terms block | Task 5 |
| Ship To block | Task 5 |
| CPU vendor block + TONU verbiage | Task 5 |
| Non-CPU closing line | Task 5 |
| Graph API draft (not auto-send) | Tasks 7, 9 |
| Spinner + disabled during in-flight | Tasks 8, 9 |
| Toast on success/error | Tasks 7, 9 |
| Button on Edit Order page | Task 8 |
| Button on Orders list bulk toolbar | Task 9 |
| AGENTS.md update | Task 10 |

### Notes

- Ship To Email 1/Email 2 removal: The spec says to remove "Email 1 and Email 2 from the Ship To section". Looking at `edit-order-addresses.tsx`, the Ship To `AddressBlock` is rendered without `hideEmailFields` — it shows both email fields. The Bill To already uses `hideEmailFields`. Task 4 as written does not explicitly address this. **Add:** In `EditOrderAddresses`, pass `hideEmailFields` to the Ship To `AddressBlock` too: change `<AddressBlock label="Ship To" value={shipTo} onChange={onShipToChange} notesLabel="Ship To Notes" />` to `<AddressBlock label="Ship To" value={shipTo} onChange={onShipToChange} notesLabel="Ship To Notes" hideEmailFields />`. This should be included in Task 4's commit.

- The `getUserSignature` function: verify in Task 7 Step 4 before committing. Looking at existing code in `use-order-email-actions.ts` or `email-draft-helpers.ts` for the exact usage pattern.

- The `payment_terms` field: in the `orders` table schema, the column is named `terms` (not `payment_terms`). The `ConfirmationOrder` type uses `payment_terms` as a label field name for clarity, and the API route maps `r.order.terms` to `payment_terms`. This is intentional and correct.
