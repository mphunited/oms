'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { VendorContactEditor, type VendorContact } from '@/components/vendors/vendor-contact-editor'

function normalizeContacts(raw: unknown[]): VendorContact[] {
  return raw.map((c: unknown) => {
    const contact = c as Record<string, unknown>
    const role: 'to' | 'cc' =
      contact.role === 'to' || contact.role === 'cc'
        ? contact.role
        : contact.is_primary === true ? 'to' : 'cc'
    return {
      name: String(contact.name ?? ''),
      email: String(contact.email ?? ''),
      phone: String(contact.phone ?? ''),
      role,
    }
  })
}

type AddressValue = {
  street: string
  city: string
  state: string
  zip: string
}

type ChecklistItem = {
  label: string
  done: boolean
}

type Vendor = {
  id: string
  name: string
  is_active: boolean
  is_blind_shipment_default: boolean
  lead_contact: string | null
  dock_info: string | null
  notes: string | null
  address: AddressValue | null
  contacts: VendorContact[] | null
  po_contacts: VendorContact[] | null
  bol_contacts: VendorContact[] | null
  checklist_template: ChecklistItem[] | null
  default_load1_qty: string | null
  default_load1_buy: string | null
  default_bottle_cost: string | null
  default_bottle_qty: string | null
  default_mph_freight_bottles: string | null
}

function emptyAddress(): AddressValue {
  return { street: '', city: '', state: '', zip: '' }
}

function AddressFields({
  label,
  value,
  onChange,
}: {
  label: string
  value: AddressValue | null | undefined
  onChange: (v: AddressValue) => void
}) {
  const addr = value ?? emptyAddress()
  function update(field: keyof AddressValue, val: string) {
    onChange({ ...addr, [field]: val })
  }
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-6 space-y-1.5">
          <Label className="text-xs">Street</Label>
          <Input value={addr.street} onChange={e => update('street', e.target.value)} placeholder="Street address" />
        </div>
        <div className="col-span-3 space-y-1.5">
          <Label className="text-xs">City</Label>
          <Input value={addr.city} onChange={e => update('city', e.target.value)} placeholder="City" />
        </div>
        <div className="col-span-1 space-y-1.5">
          <Label className="text-xs">State</Label>
          <Input value={addr.state} onChange={e => update('state', e.target.value)} placeholder="ST" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">ZIP</Label>
          <Input value={addr.zip} onChange={e => update('zip', e.target.value)} placeholder="00000" />
        </div>
      </div>
    </div>
  )
}

export default function VendorDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>()

  const [vendor, setVendor]   = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [poContactError, setPoContactError]   = useState<string | undefined>()
  const [bolContactError, setBolContactError] = useState<string | undefined>()

  const [name, setName]               = useState('')
  const [isActive, setIsActive]       = useState(true)
  const [isBlindShipmentDefault, setIsBlindShipmentDefault] = useState(false)
  const [leadContact, setLeadContact] = useState('')
  const [dockInfo, setDockInfo]       = useState('')
  const [notes, setNotes]             = useState('')
  const [address, setAddress]         = useState<AddressValue | null>(null)
  const [contacts, setContacts]       = useState<VendorContact[]>([])
  const [poContacts, setPoContacts]   = useState<VendorContact[]>([])
  const [bolContacts, setBolContacts] = useState<VendorContact[]>([])
  const [checklistTemplate, setChecklistTemplate] = useState<ChecklistItem[]>([])
  const [defaultLoad1Qty, setDefaultLoad1Qty]                   = useState('')
  const [defaultLoad1Buy, setDefaultLoad1Buy]                   = useState('')
  const [defaultBottleCost, setDefaultBottleCost]               = useState('')
  const [defaultBottleQty, setDefaultBottleQty]                 = useState('')
  const [defaultMphFreightBottles, setDefaultMphFreightBottles] = useState('')

  useEffect(() => {
    fetch(`/api/vendors/${vendorId}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<Vendor> })
      .then(data => {
        setVendor(data)
        setName(data.name)
        setIsActive(data.is_active)
        setIsBlindShipmentDefault(data.is_blind_shipment_default)
        setLeadContact(data.lead_contact ?? '')
        setDockInfo(data.dock_info ?? '')
        setNotes(data.notes ?? '')
        setAddress(data.address)
        setContacts(normalizeContacts((data.contacts as unknown[]) ?? []))
        setPoContacts(normalizeContacts((data.po_contacts as unknown[]) ?? []))
        setBolContacts(normalizeContacts((data.bol_contacts as unknown[]) ?? []))
        setChecklistTemplate((data.checklist_template as ChecklistItem[]) ?? [])
        setDefaultLoad1Qty(data.default_load1_qty ?? '')
        setDefaultLoad1Buy(data.default_load1_buy ?? '')
        setDefaultBottleCost(data.default_bottle_cost ?? '')
        setDefaultBottleQty(data.default_bottle_qty ?? '')
        setDefaultMphFreightBottles(data.default_mph_freight_bottles ?? '')
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [vendorId])

  async function handleSave() {
    setPoContactError(undefined)
    setBolContactError(undefined)
    let hasError = false
    if (poContacts.length > 0 && !poContacts.some(c => c.role === 'to')) {
      setPoContactError('At least one PO contact must be set to "To".')
      hasError = true
    }
    if (bolContacts.length > 0 && !bolContacts.some(c => c.role === 'to')) {
      setBolContactError('At least one BOL contact must be set to "To".')
      hasError = true
    }
    if (hasError) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          is_active: isActive,
          is_blind_shipment_default: isBlindShipmentDefault,
          lead_contact: leadContact || null,
          dock_info: dockInfo || null,
          notes: notes || null,
          address,
          contacts,
          po_contacts: poContacts,
          bol_contacts: bolContacts,
          checklist_template: checklistTemplate,
          default_load1_qty: defaultLoad1Qty || null,
          default_load1_buy: defaultLoad1Buy || null,
          default_bottle_cost: defaultBottleCost || null,
          default_bottle_qty: defaultBottleQty || null,
          default_mph_freight_bottles: defaultMphFreightBottles || null,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      alert('Save failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  function addChecklistItem() {
    setChecklistTemplate(prev => [...prev, { label: '', done: false }])
  }

  function updateChecklistItem(index: number, label: string) {
    setChecklistTemplate(prev => prev.map((item, i) => i === index ? { ...item, label } : item))
  }

  function removeChecklistItem(index: number) {
    setChecklistTemplate(prev => prev.filter((_, i) => i !== index))
  }

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>
  if (error)   return <p className="p-6 text-sm text-destructive">Error: {error}</p>
  if (!vendor) return null

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vendors" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold">{vendor.name}</h1>
      </div>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">General</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Lead Contact</Label>
            <Input value={leadContact} onChange={e => setLeadContact(e.target.value)} placeholder="Primary contact name" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Dock Info / Carrier Instructions</Label>
          <Textarea value={dockInfo} onChange={e => setDockInfo(e.target.value)} placeholder="Dock hours, carrier contact instructions…" rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes" rows={2} />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="is_blind_shipment_default" checked={isBlindShipmentDefault} onCheckedChange={setIsBlindShipmentDefault} />
          <Label htmlFor="is_blind_shipment_default" className="cursor-pointer">Blind Shipment by Default</Label>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Address</h2>
        <AddressFields label="Vendor Address" value={address} onChange={setAddress} />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Load 1 Defaults</h2>
        <p className="text-xs text-muted-foreground">These autofill Load 1 qty and buy price on new orders for this vendor.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Default Load 1 Qty</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={defaultLoad1Qty}
              onChange={e => setDefaultLoad1Qty(e.target.value ? String(Math.round(Number(e.target.value))) : '')}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Default Load 1 Buy</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={defaultLoad1Buy}
              onChange={e => setDefaultLoad1Buy(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bottle Defaults</h2>
        <p className="text-xs text-muted-foreground">These autofill bottle fields on new order line items for this vendor.</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Default Bottle Cost</Label>
            <Input type="number" min="0" step="0.01" value={defaultBottleCost} onChange={e => setDefaultBottleCost(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label>Default Bottle Qty</Label>
            <Input type="number" min="0" step="1" value={defaultBottleQty} onChange={e => setDefaultBottleQty(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Default MPH Freight Bottles</Label>
            <Input type="number" min="0" step="1" value={defaultMphFreightBottles} onChange={e => setDefaultMphFreightBottles(e.target.value)} placeholder="0" />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contacts</h2>
        <VendorContactEditor title="General Contacts" contacts={contacts} onChange={setContacts} />
        <VendorContactEditor title="PO Contacts" contacts={poContacts} onChange={setPoContacts} error={poContactError} />
        <VendorContactEditor title="BOL Contacts" contacts={bolContacts} onChange={setBolContacts} error={bolContactError} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Default Checklist Template</h2>
        <p className="text-xs text-muted-foreground">These steps are copied to new orders created for this vendor.</p>
        {checklistTemplate.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={item.label}
              onChange={e => updateChecklistItem(index, e.target.value)}
              placeholder="Step description"
            />
            <button
              type="button"
              onClick={() => removeChecklistItem(index)}
              className="inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addChecklistItem}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          + Add Step
        </button>
      </section>

      <Separator />

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved.</span>}
      </div>
    </div>
  )
}