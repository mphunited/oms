'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Coastal Container Services vendor ID — hardcoded for drum orders default
const COASTAL_VENDOR_ID = '8ae0764b-c98d-4b4f-a71f-1e0111225a94'; // MPH United / Coastal Container Services -- Alvin, TX
const COASTAL_DEFAULT_SELL = '12.00';

type Contact = { name: string; email: string; role: 'to' | 'cc' }
type CustomerContact = { name: string; email: string }
type Address  = { name: string; street: string; city: string; state: string; zip: string }

export type NewDrumFormState = {
  order_date: string
  status: string
  customer_id: string
  vendor_id: string
  is_blind_shipment: boolean
  salesperson_id: string
  csr_id: string
  customer_po: string
  description: string
  qty: string
  buy: string
  sell: string
  pick_up_date: string
  freight_carrier: string
  ship_from: Address
  bill_to: Address
  customer_contacts: CustomerContact[]
  invoice_payment_status: string
  po_contacts: Contact[]
  po_notes: string
  misc_notes: string
  bol_number: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function emptyAddress(): Address {
  return { name: '', street: '', city: '', state: '', zip: '' }
}

export function useNewDrumForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [isDirty, setIsDirty]       = useState(false)
  const [carriers, setCarriers]     = useState<string[]>([])
  const [salespeople, setSalespeople] = useState<{ id: string; name: string }[]>([])
  const [csrList, setCsrList]       = useState<{ id: string; name: string }[]>([])
  const [customers, setCustomers]   = useState<{ id: string; name: string }[]>([])
  const [vendorList, setVendorList] = useState<{ id: string; name: string }[]>([])

  const [form, setForm] = useState<NewDrumFormState>({
    order_date:              today(),
    status:                  'Acknowledged Order',
    customer_id:             '',
    vendor_id:               COASTAL_VENDOR_ID,
    is_blind_shipment:       false,
    salesperson_id:          '',
    csr_id:                  '',
    customer_po:             '',
    description:             '',
    qty:                     '',
    buy:                     '',
    sell:                    COASTAL_DEFAULT_SELL,
    pick_up_date:            '',
    freight_carrier:         '',
    ship_from:               emptyAddress(),
    bill_to:                 emptyAddress(),
    customer_contacts:       [],
    invoice_payment_status:  'Not Invoiced',
    po_contacts:             [],
    po_notes:                '',
    misc_notes:              '',
    bol_number:              '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/dropdown-configs?type=CARRIER').then(r => r.json()),
      fetch('/api/users?permission=SALES').then(r => r.json()),
      fetch('/api/users?permission=CSR').then(r => r.json()),
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/vendors').then(r => r.json()),
    ]).then(([carriers, sales, csrs, custs, vends]) => {
      setCarriers(carriers.values ?? [])
      setSalespeople(sales ?? [])
      setCsrList(csrs ?? [])
      setCustomers(custs ?? [])
      setVendorList(vends ?? [])
      const mattCozik = (csrs as { id: string; name: string }[]).find(u => u.name === 'Matt Cozik')
      if (mattCozik) {
        setForm(f => f.csr_id ? f : { ...f, csr_id: mattCozik.id })
      }
    })
  }, [])

  // Auto-populate sell with Coastal default when vendor changes to Coastal and sell is empty
  useEffect(() => {
    if (form.vendor_id === COASTAL_VENDOR_ID && !form.sell) {
      setForm(f => ({ ...f, sell: COASTAL_DEFAULT_SELL }))
    }
  }, [form.vendor_id]) // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof NewDrumFormState>(key: K, value: NewDrumFormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function setShipFrom(key: keyof Address, value: string) {
    setForm(f => ({ ...f, ship_from: { ...f.ship_from, [key]: value } }))
  }

  function setBillTo(key: keyof Address, value: string) {
    setForm(f => ({ ...f, bill_to: { ...f.bill_to, [key]: value } }))
  }

  function addContact() {
    set('po_contacts', [...form.po_contacts, { name: '', email: '', role: 'to' }])
  }

  function updateContact(i: number, patch: Partial<Contact>) {
    set('po_contacts', form.po_contacts.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }

  function removeContact(i: number) {
    set('po_contacts', form.po_contacts.filter((_, idx) => idx !== i))
  }

  function addCustomerContact() {
    set('customer_contacts', [...form.customer_contacts, { name: '', email: '' }])
  }

  function updateCustomerContact(i: number, patch: Partial<CustomerContact>) {
    set('customer_contacts', form.customer_contacts.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }

  function removeCustomerContact(i: number) {
    set('customer_contacts', form.customer_contacts.filter((_, idx) => idx !== i))
  }

  async function submit() {
    if (!form.customer_id) { toast.error('Customer is required'); return }
    if (form.po_contacts.length > 0 && !form.po_contacts.some(c => c.role === 'to')) {
      toast.error('At least one PO contact must have role "to"'); return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/recycling-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          recycling_type: 'Drum',
          part_number: null,
          invoice_status: 'Invoice',
          invoice_customer_amount: null,
          qty: form.qty || null,
          buy: form.buy || null,
          sell: form.sell || null,
          pick_up_date: form.pick_up_date || null,
          salesperson_id: form.salesperson_id || null,
          csr_id: form.csr_id || null,
          ship_from: form.ship_from.name || form.ship_from.street ? form.ship_from : null,
          bill_to: form.bill_to.name || form.bill_to.street ? form.bill_to : null,
          customer_contacts: form.customer_contacts.length ? form.customer_contacts : null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed') }
      const created = await res.json()
      toast.success('Drum order created')
      router.push(`/recycling/drums/${created.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    form, set, setShipFrom, setBillTo,
    addContact, updateContact, removeContact,
    addCustomerContact, updateCustomerContact, removeCustomerContact,
    submit, submitting, carriers, salespeople, csrList, customers, vendorList,
    COASTAL_VENDOR_ID,
    isDirty, markDirty: () => setIsDirty(true),
  }
}
