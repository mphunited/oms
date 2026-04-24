'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type AddressValue = {
  name: string; street: string; city: string; state: string
  zip: string; phone: string; shipping_notes: string
}

export type CustomerContact = { id?: string; name: string; email: string }

function emptyAddress(): AddressValue {
  return { name: '', street: '', city: '', state: '', zip: '', phone: '', shipping_notes: '' }
}

function AddressBlock({
  label, value, onChange,
}: {
  label: string
  value: AddressValue | null | undefined
  onChange: (v: AddressValue) => void
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
          <Label className="text-xs">Phone</Label>
          <Input value={addr.phone} onChange={e => u('phone', e.target.value)} placeholder="Phone" />
        </div>
        <div className="col-span-6 space-y-1.5">
          <Label className="text-xs">Notes</Label>
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
      {/* Addresses */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Addresses</h2>
        <div className="grid grid-cols-2 gap-6">
          <AddressBlock label="Ship To" value={shipTo} onChange={onShipToChange} />
          <AddressBlock label="Bill To" value={billTo} onChange={onBillToChange} />
        </div>
      </section>

      {/* Customer Contacts */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Customer Contacts</h2>
        {customerContacts.map((contact, index) => (
          <div key={contact.id ?? `contact-${index}`} className="grid grid-cols-5 gap-2 rounded-md border p-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={contact.name}
                onChange={e => onContactsChange(customerContacts.map((c, i) => i === index ? { ...c, name: e.target.value } : c))}
                placeholder="Full name"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={contact.email}
                onChange={e => onContactsChange(customerContacts.map((c, i) => i === index ? { ...c, email: e.target.value } : c))}
                placeholder="email@company.com"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => onContactsChange(customerContacts.filter((_, i) => i !== index))}
                className="inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onContactsChange([...customerContacts, { id: crypto.randomUUID(), name: '', email: '' }])}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          + Add Contact
        </button>
      </section>
    </>
  )
}
