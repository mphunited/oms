'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Contact = { name: string; email: string; role: 'to' | 'cc' }
type Address  = { name: string; street: string; city: string; state: string; zip: string }

export type NewIbcFormState = {
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
  delivery_date: string
  appointment_notes: string
  freight_carrier: string
  ship_to: Address
  freight_credit_amount: string
  invoice_status: string
  invoice_customer_amount: string
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

export function useNewIbcForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [carriers, setCarriers]     = useState<string[]>([])
  const [salespeople, setSalespeople] = useState<{ id: string; name: string }[]>([])
  const [csrList, setCsrList]       = useState<{ id: string; name: string }[]>([])
  const [customers, setCustomers]   = useState<{ id: string; name: string; contacts: unknown }[]>([])
  const [vendorList, setVendorList] = useState<{ id: string; name: string }[]>([])

  const [form, setForm] = useState<NewIbcFormState>({
    order_date:              today(),
    status:                  'Acknowledged Order',
    customer_id:             '',
    vendor_id:               '',
    is_blind_shipment:       false,
    salesperson_id:          '',
    csr_id:                  '',
    customer_po:             '',
    description:             '',
    qty:                     '',
    buy:                     '',
    sell:                    '',
    pick_up_date:            '',
    delivery_date:           '',
    appointment_notes:       '',
    freight_carrier:         '',
    ship_to:                 emptyAddress(),
    freight_credit_amount:   '',
    invoice_status:          'No Charge',
    invoice_customer_amount: '',
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

  function set<K extends keyof NewIbcFormState>(key: K, value: NewIbcFormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function setAddress(key: keyof Address, value: string) {
    setForm(f => ({ ...f, ship_to: { ...f.ship_to, [key]: value } }))
  }

  function addContact() {
    set('po_contacts', [...form.po_contacts, { name: '', email: '', role: 'to' }])
  }

  function updateContact(i: number, patch: Partial<Contact>) {
    const updated = form.po_contacts.map((c, idx) => idx === i ? { ...c, ...patch } : c)
    set('po_contacts', updated)
  }

  function removeContact(i: number) {
    set('po_contacts', form.po_contacts.filter((_, idx) => idx !== i))
  }

  async function submit() {
    if (!form.customer_id) { toast.error('IBC Source is required'); return }
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
          recycling_type: 'IBC',
          part_number: null,
          qty: form.qty || null,
          buy: form.buy || null,
          sell: form.sell || null,
          freight_credit_amount: form.freight_credit_amount || null,
          invoice_customer_amount: form.invoice_customer_amount || null,
          pick_up_date: form.pick_up_date || null,
          delivery_date: form.delivery_date || null,
          salesperson_id: form.salesperson_id || null,
          csr_id: form.csr_id || null,
          vendor_id: form.vendor_id || null,
          ship_to: form.ship_to.name || form.ship_to.street ? form.ship_to : null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed') }
      const created = await res.json()
      toast.success('IBC order created')
      router.push(`/recycling/ibcs/${created.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  return { form, set, setAddress, addContact, updateContact, removeContact,
    submit, submitting, carriers, salespeople, csrList, customers, vendorList }
}
