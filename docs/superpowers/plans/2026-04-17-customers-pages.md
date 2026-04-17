# Customers Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/customers` list page and `/customers/[customerId]` detail page with contacts editor.

**Architecture:** Server-side API routes (Drizzle + auth) feed client components. List page is a thin server page that renders a client `CustomerList` component. Detail page is a server component that fetches the customer, then hands off to a client `CustomerDetail` component for interactive editing. Contacts are stored as a jsonb array on the `customers` table and edited via PATCH to the API.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Supabase Auth, shadcn/ui, react-hook-form, Zod, Lucide icons, Sonner toasts.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/app/api/customers/route.ts` | GET (all fields, all statuses), POST new customer |
| Create | `src/app/api/customers/[customerId]/route.ts` | GET single, PATCH update |
| Modify | `src/app/(dashboard)/customers/page.tsx` | Server page → renders CustomerList |
| Create | `src/components/customers/customer-list.tsx` | Client: searchable table + add-customer dialog |
| Modify | `src/app/(dashboard)/customers/[customerId]/page.tsx` | Server page → fetches customer → renders CustomerDetail |
| Create | `src/components/customers/customer-detail.tsx` | Client: profile editor + contacts CRUD |

---

## Task 1: API — GET list and POST create

**Files:**
- Modify: `src/app/api/customers/route.ts`

- [ ] **Step 1: Replace the GET handler and add POST**

Replace the entire file with:

```ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { asc } from 'drizzle-orm'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select()
    .from(customers)
    .orderBy(asc(customers.name))
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, payment_terms } = body
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    const [row] = await db
      .insert(customers)
      .values({ name: name.trim(), payment_terms: payment_terms ?? null })
      .returning()
    return NextResponse.json(row, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/customers]', message)
    return NextResponse.json({ error: 'Failed to create customer', detail: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify the new-order-form still works**

The existing `new-order-form.tsx` fetches `/api/customers` and uses `{ id, name }` from each row. Returning all fields is backward-compatible — the form only destructures what it needs.

---

## Task 2: API — GET single customer and PATCH update

**Files:**
- Create: `src/app/api/customers/[customerId]/route.ts`

- [ ] **Step 1: Create the file**

```ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { customerId } = await params
  const row = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { customerId } = await params
  try {
    const body = await req.json()
    // Allow updating: name, payment_terms, is_active, contacts, ship_to, bill_to
    const { name, payment_terms, is_active, contacts, ship_to, bill_to } = body
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (payment_terms !== undefined) updateData.payment_terms = payment_terms
    if (is_active !== undefined) updateData.is_active = is_active
    if (contacts !== undefined) updateData.contacts = contacts
    if (ship_to !== undefined) updateData.ship_to = ship_to
    if (bill_to !== undefined) updateData.bill_to = bill_to

    const [updated] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, customerId))
      .returning()
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[PATCH /api/customers/:id]', message)
    return NextResponse.json({ error: 'Failed to update customer', detail: message }, { status: 500 })
  }
}
```

---

## Task 3: CustomerList client component

**Files:**
- Create: `src/components/customers/customer-list.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Contact {
  name?: string
  email?: string
  is_primary?: boolean
}

interface Customer {
  id: string
  name: string
  payment_terms: string | null
  is_active: boolean
  contacts: Contact[] | null
}

interface CustomerListProps {
  initialCustomers: Customer[]
}

export function CustomerList({ initialCustomers }: CustomerListProps) {
  const router = useRouter()
  const [customers, setCustomers] = useState(initialCustomers)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTerms, setNewTerms] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), payment_terms: newTerms || null }),
      })
      if (!res.ok) throw new Error(await res.text())
      const created: Customer = await res.json()
      setCustomers(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setAddOpen(false)
      setNewName('')
      setNewTerms('')
      toast.success('Customer added')
      router.push(`/customers/${created.id}`)
    } catch (err) {
      toast.error('Failed to add customer')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search customers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4 mr-1.5" />
          Add Customer
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Terms</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {search ? 'No customers match your search.' : 'No customers yet.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(customer => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/customers/${customer.id}`)}
                >
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.payment_terms ?? '—'}</TableCell>
                  <TableCell>{customer.contacts?.length ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                      {customer.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Name *</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Acme Corp"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-terms">Payment Terms</Label>
              <Select value={newTerms} onValueChange={setNewTerms}>
                <SelectTrigger id="new-terms">
                  <SelectValue placeholder="Select terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PPD">PPD</SelectItem>
                  <SelectItem value="PPA">PPA</SelectItem>
                  <SelectItem value="FOB">FOB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newName.trim() || saving}>
              {saving ? 'Adding…' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

## Task 4: Customers list page

**Files:**
- Modify: `src/app/(dashboard)/customers/page.tsx`

- [ ] **Step 1: Replace the placeholder page**

```tsx
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'
import { CustomerList } from '@/components/customers/customer-list'

export default async function CustomersPage() {
  const rows = await db
    .select()
    .from(customers)
    .orderBy(asc(customers.name))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {rows.length} customer{rows.length !== 1 ? 's' : ''}
        </p>
      </div>
      <CustomerList initialCustomers={rows} />
    </div>
  )
}
```

---

## Task 5: CustomerDetail client component

**Files:**
- Create: `src/components/customers/customer-detail.tsx`

This is the largest component. It handles:
- Profile section: name, payment_terms, is_active, ship_to address, bill_to address
- Contacts section: CRUD table with a dialog editor per contact

Contact shape (per PRD Section 5):
```ts
{ name, email, phone_office, phone_cell, role, is_primary, notes }
```

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface Contact {
  name: string
  email: string
  phone_office: string
  phone_cell: string
  role: string
  is_primary: boolean
  notes: string
}

interface Address {
  street?: string
  city?: string
  state?: string
  zip?: string
}

export interface CustomerData {
  id: string
  name: string
  payment_terms: string | null
  is_active: boolean
  contacts: Contact[] | null
  ship_to: Address | null
  bill_to: Address | null
}

const EMPTY_CONTACT: Contact = {
  name: '', email: '', phone_office: '', phone_cell: '',
  role: '', is_primary: false, notes: '',
}

const EMPTY_ADDRESS: Address = { street: '', city: '', state: '', zip: '' }

interface CustomerDetailProps {
  customer: CustomerData
}

export function CustomerDetail({ customer: initial }: CustomerDetailProps) {
  const router = useRouter()
  const [data, setData] = useState<CustomerData>({
    ...initial,
    contacts: initial.contacts ?? [],
    ship_to: initial.ship_to ?? EMPTY_ADDRESS,
    bill_to: initial.bill_to ?? EMPTY_ADDRESS,
  })
  const [profileDirty, setProfileDirty] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  // Contact dialog state
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [contactForm, setContactForm] = useState<Contact>(EMPTY_CONTACT)
  const [savingContact, setSavingContact] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  // ── Profile helpers ──────────────────────────────────────────────────────────

  function setProfile<K extends keyof CustomerData>(key: K, value: CustomerData[K]) {
    setData(prev => ({ ...prev, [key]: value }))
    setProfileDirty(true)
  }

  function setAddress(field: 'ship_to' | 'bill_to', key: keyof Address, value: string) {
    setData(prev => ({
      ...prev,
      [field]: { ...(prev[field] ?? EMPTY_ADDRESS), [key]: value },
    }))
    setProfileDirty(true)
  }

  async function saveProfile() {
    setSavingProfile(true)
    try {
      const res = await fetch(`/api/customers/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          payment_terms: data.payment_terms,
          is_active: data.is_active,
          ship_to: data.ship_to,
          bill_to: data.bill_to,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setProfileDirty(false)
      toast.success('Customer saved')
      router.refresh()
    } catch (err) {
      toast.error('Failed to save customer')
      console.error(err)
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Contact helpers ──────────────────────────────────────────────────────────

  function openAddContact() {
    setEditingIndex(null)
    setContactForm(EMPTY_CONTACT)
    setContactDialogOpen(true)
  }

  function openEditContact(idx: number) {
    setEditingIndex(idx)
    setContactForm({ ...data.contacts![idx] })
    setContactDialogOpen(true)
  }

  async function saveContact() {
    setSavingContact(true)
    try {
      const contacts = [...(data.contacts ?? [])]
      if (contactForm.is_primary) {
        // Clear primary on all others
        contacts.forEach(c => { c.is_primary = false })
      }
      if (editingIndex !== null) {
        contacts[editingIndex] = contactForm
      } else {
        contacts.push(contactForm)
      }
      const res = await fetch(`/api/customers/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json()
      setData(prev => ({ ...prev, contacts: updated.contacts ?? [] }))
      setContactDialogOpen(false)
      toast.success(editingIndex !== null ? 'Contact updated' : 'Contact added')
    } catch (err) {
      toast.error('Failed to save contact')
      console.error(err)
    } finally {
      setSavingContact(false)
    }
  }

  async function deleteContact(idx: number) {
    const contacts = (data.contacts ?? []).filter((_, i) => i !== idx)
    try {
      const res = await fetch(`/api/customers/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json()
      setData(prev => ({ ...prev, contacts: updated.contacts ?? [] }))
      setDeleteIndex(null)
      toast.success('Contact removed')
    } catch (err) {
      toast.error('Failed to remove contact')
      console.error(err)
    }
  }

  async function togglePrimary(idx: number) {
    const contacts = (data.contacts ?? []).map((c, i) => ({
      ...c,
      is_primary: i === idx ? !c.is_primary : false,
    }))
    try {
      const res = await fetch(`/api/customers/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json()
      setData(prev => ({ ...prev, contacts: updated.contacts ?? [] }))
    } catch (err) {
      toast.error('Failed to update contact')
      console.error(err)
    }
  }

  const contacts = data.contacts ?? []

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Profile ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name">Name *</Label>
              <Input
                id="cust-name"
                value={data.name}
                onChange={e => setProfile('name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-terms">Payment Terms</Label>
              <Select
                value={data.payment_terms ?? ''}
                onValueChange={v => setProfile('payment_terms', v || null)}
              >
                <SelectTrigger id="cust-terms">
                  <SelectValue placeholder="Select terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PPD">PPD</SelectItem>
                  <SelectItem value="PPA">PPA</SelectItem>
                  <SelectItem value="FOB">FOB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="cust-active"
              checked={data.is_active}
              onCheckedChange={v => setProfile('is_active', v)}
            />
            <Label htmlFor="cust-active">Active</Label>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {(['ship_to', 'bill_to'] as const).map(field => (
              <div key={field} className="space-y-3">
                <p className="text-sm font-medium">
                  {field === 'ship_to' ? 'Default Ship To' : 'Default Bill To'}
                </p>
                {(['street', 'city', 'state', 'zip'] as const).map(key => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs capitalize">{key}</Label>
                    <Input
                      value={(data[field] as Address)?.[key] ?? ''}
                      onChange={e => setAddress(field, key, e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveProfile} disabled={!profileDirty || savingProfile}>
              {savingProfile ? 'Saving…' : 'Save Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Contacts ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contacts</CardTitle>
          <Button size="sm" onClick={openAddContact}>
            <Plus className="size-4 mr-1.5" />
            Add Contact
          </Button>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No contacts yet. Add one above.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((c, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <span className="font-medium">{c.name || '—'}</span>
                        {c.is_primary && (
                          <Badge variant="outline" className="ml-2 text-xs">Primary</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.role || '—'}</TableCell>
                      <TableCell>{c.email || '—'}</TableCell>
                      <TableCell className="text-sm">
                        {c.phone_office || c.phone_cell || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            title={c.is_primary ? 'Remove primary' : 'Set as primary'}
                            onClick={() => togglePrimary(idx)}
                          >
                            <Star className={`size-3.5 ${c.is_primary ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => openEditContact(idx)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteIndex(idx)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Contact edit dialog ──────────────────────────────────────────────── */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {[
              { id: 'cf-name',   label: 'Name',         key: 'name'         as keyof Contact },
              { id: 'cf-role',   label: 'Role',         key: 'role'         as keyof Contact },
              { id: 'cf-email',  label: 'Email',        key: 'email'        as keyof Contact },
              { id: 'cf-po',     label: 'Phone (Office)',key: 'phone_office' as keyof Contact },
              { id: 'cf-pc',     label: 'Phone (Cell)', key: 'phone_cell'   as keyof Contact },
            ].map(({ id, label, key }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  value={contactForm[key] as string}
                  onChange={e => setContactForm(prev => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cf-notes">Notes</Label>
              <Textarea
                id="cf-notes"
                value={contactForm.notes}
                onChange={e => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                id="cf-primary"
                checked={contactForm.is_primary}
                onCheckedChange={v => setContactForm(prev => ({ ...prev, is_primary: v }))}
              />
              <Label htmlFor="cf-primary">Primary contact</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveContact} disabled={savingContact}>
              {savingContact ? 'Saving…' : 'Save Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ───────────────────────────────────────────────────── */}
      <AlertDialog open={deleteIndex !== null} onOpenChange={open => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{' '}
              {deleteIndex !== null ? contacts[deleteIndex]?.name || 'this contact' : 'this contact'} from the customer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteIndex !== null && deleteContact(deleteIndex)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

---

## Task 6: Customer detail page

**Files:**
- Modify: `src/app/(dashboard)/customers/[customerId]/page.tsx`

- [ ] **Step 1: Replace placeholder with server page**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { CustomerDetail } from '@/components/customers/customer-detail'

interface Props {
  params: Promise<{ customerId: string }>
}

export default async function CustomerDetailPage({ params }: Props) {
  const { customerId } = await params
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  })
  if (!customer) notFound()

  return (
    <div className="space-y-4">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Customers
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{customer.name}</h1>
      </div>
      <CustomerDetail customer={customer as Parameters<typeof CustomerDetail>[0]['customer']} />
    </div>
  )
}
```

---

## Task 7: Check for missing shadcn/ui components and install if needed

**Files:** none (installs only)

- [ ] **Step 1: Check if AlertDialog component exists**

```bash
ls src/components/ui/ | grep alert-dialog
```

If not found, install:
```bash
npx shadcn@latest add alert-dialog --yes
```

---

## Task 8: TypeScript check and commit

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors before committing.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/customers/ src/app/\(dashboard\)/customers/ src/components/customers/ docs/superpowers/plans/
git commit -m "feat: customers list and detail pages with contacts editor"
```

- [ ] **Step 3: Merge to main and push**

```bash
git checkout main
git merge --no-ff claude/mystifying-payne-f9b65e -m "feat: customers list and detail pages with contacts editor"
git push origin main
git checkout claude/mystifying-payne-f9b65e
```

- [ ] **Step 4: Verify**

```bash
git log --oneline -5
```

Confirm the commit appears on main.
