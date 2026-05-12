'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { CustomerContactEditor, type CustomerContact } from '@/components/customers/customer-contact-editor'
import { CustomerAddressFields, type AddressValue } from '@/components/customers/customer-address-fields'

type Customer = {
  id: string
  name: string
  payment_terms: string | null
  is_active: boolean
  contacts: CustomerContact[] | null
  ship_to: AddressValue | null
  bill_to: AddressValue | null
}

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  // Form state
  const [name, setName]               = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [isActive, setIsActive]       = useState(true)
  const [contacts, setContacts]       = useState<CustomerContact[]>([])
  const [shipTo, setShipTo]           = useState<AddressValue | null>(null)
  const [billTo, setBillTo]           = useState<AddressValue | null>(null)

  useEffect(() => {
    fetch(`/api/customers/${customerId}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<Customer> })
      .then(data => {
        setCustomer(data)
        setName(data.name)
        setPaymentTerms(data.payment_terms ?? '')
        setIsActive(data.is_active)
        setContacts((data.contacts as CustomerContact[]) ?? [])
        setShipTo(data.ship_to)
        setBillTo(data.bill_to)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [customerId])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, payment_terms: paymentTerms || null, is_active: isActive, contacts, ship_to: shipTo, bill_to: billTo }),
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

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>
  if (error)   return <p className="p-6 text-sm text-destructive">Error: {error}</p>
  if (!customer) return null

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold">{customer.name}</h1>
      </div>

      {/* Basic info */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">General</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Terms</Label>
            <Input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
        </div>
      </section>

      <Separator />

      {/* Addresses */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Addresses</h2>
        <div className="grid grid-cols-2 gap-6">
          <CustomerAddressFields label="Default Ship To" value={shipTo} onChange={setShipTo} />
          <CustomerAddressFields label="Default Bill To" value={billTo} onChange={setBillTo} />
        </div>
      </section>

      <Separator />

      {/* Contacts */}
      <section>
        <CustomerContactEditor contacts={contacts} onChange={setContacts} />
      </section>

      <Separator />

      {/* Save */}
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