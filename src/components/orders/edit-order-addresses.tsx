'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type AddressValue = {
  name: string
  street: string
  street2: string
  city: string
  state: string
  zip: string
  phone_office: string
  phone_ext: string
  phone_cell: string
  phone: string        // legacy fallback — read only, do not write on save
  email: string
  email2: string
  shipping_notes: string
}

export type CustomerContact = { id?: string; name: string; email: string }

function emptyAddress(): AddressValue {
  return {
    name: '', street: '', street2: '', city: '', state: '', zip: '',
    phone_office: '', phone_ext: '', phone_cell: '', phone: '',
    email: '', email2: '', shipping_notes: '',
  }
}

function AddressBlock({
  label, value, onChange, notesLabel,
}: {
  label: string
  value: AddressValue | null | undefined
  onChange: (v: AddressValue) => void
  notesLabel: string
}) {
  const addr = value ?? emptyAddress()
  const u = (field: keyof AddressValue, val: string) => onChange({ ...addr, [field]: val })
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-6 space-y-1.5">
          <Label className="text-xs">Name / Company</Label>
          <Input value={addr.name} onChange={e => u('name', e.target.value)} placeholder="Name or company" />
        </div>
        <div className="col-span-6 space-y-1.5">
          <Label className="text-xs">Street</Label>
          <Input value={addr.street} onChange={e => u('street', e.target.value)} placeholder="Street address" />
        </div>
        <div className="col-span-6 space-y-1.5">
          <Label className="text-xs">Street 2</Label>
          <Input value={addr.street2} onChange={e => u('street2', e.target.value)} placeholder="Suite, unit, PO Box (optional)" />
        </div>
        <div className="col-span-3 space-y-1.5">
          <Label className="text-xs">City</Label>
          <Input value={addr.city} onChange={e => u('city', e.target.value)} placeholder="City" />
        </div>
        <div className="col-span-1 space-y-1.5">
          <Label className="text-xs">State</Label>
          <Input value={addr.state} onChange={e => u('state', e.target.value)} placeholder="ST" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">ZIP</Label>
          <Input value={addr.zip} onChange={e => u('zip', e.target.value)} placeholder="00000" />
        </div>
        <div className="col-span-3 space-y-1.5">
          <Label className="text-xs">Office Phone</Label>
          <Input value={addr.phone_office} onChange={e => u('phone_office', e.target.value)} placeholder="Office phone" />
        </div>
        <div className="col-span-1 space-y-1.5">
          <Label className="text-xs">Ext</Label>
          <Input value={addr.phone_ext} onChange={e => u('phone_ext', e.target.value)} placeholder="Ext" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Cell</Label>
          <Input value={addr.phone_cell} onChange={e => u('phone_cell', e.target.value)} placeholder="Cell phone" />
        </div>
        <div className="col-span-3 space-y-1.5">
          <Label className="text-xs">Email 1</Label>
          <Input type="email" value={addr.email} onChange={e => u('email', e.target.value)} placeholder="email@company.com" />
        </div>
        <div className="col-span-3 space-y-1.5">
          <Label className="text-xs">Email 2</Label>
          <Input type="email" value={addr.email2} onChange={e => u('email2', e.target.value)} placeholder="email@company.com" />
        </div>
        <div className="col-span-6 space-y-1.5">
          <Label className="text-xs">{notesLabel}</Label>
          <Input value={addr.shipping_notes} onChange={e => u('shipping_notes', e.target.value)} placeholder="Dock hours, special instructions…" />
        </div>
      </div>
    </div>
  )
}

type EditOrderAddressesProps = {
  shipTo: AddressValue | null
  billTo: AddressValue | null
  customerContacts: CustomerContact[]
  onShipToChange: (v: AddressValue) => void
  onBillToChange: (v: AddressValue) => void
  onContactsChange: (v: CustomerContact[]) => void
}

export function EditOrderAddresses({
  shipTo, billTo, customerContacts,
  onShipToChange, onBillToChange, onContactsChange,
}: EditOrderAddressesProps) {
  return (
    <>
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Addresses & Contacts</h2>
        <div className="grid grid-cols-2 gap-6">
          <AddressBlock label="Ship To" value={shipTo} onChange={onShipToChange} notesLabel="Ship To Notes" />
          <AddressBlock label="Bill To" value={billTo} onChange={onBillToChange} notesLabel="Bill To Notes" />
        </div>
      </section>

      <section className="space-y-3 mt-4">
        <div className="flex items-center justify-between">
          <Label>Customer Contacts For Order Confirmations</Label>
          <Button type="button" variant="outline" size="sm"
            onClick={() => onContactsChange([...customerContacts, { id: crypto.randomUUID(), name: '', email: '' }])}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />Add Contact
          </Button>
        </div>
        {customerContacts.length === 0 && (
          <p className="text-xs text-muted-foreground">No contacts added.</p>
        )}
        {customerContacts.map((contact, index) => (
          <div key={contact.id ?? `contact-${index}`} className="grid grid-cols-5 gap-2 rounded-md border p-3">
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
            <div className="flex items-end">
              <Button type="button" variant="ghost" size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onContactsChange(customerContacts.filter((_, i) => i !== index))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </section>
    </>
  )
}
