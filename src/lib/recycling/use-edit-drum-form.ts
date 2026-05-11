'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

const COASTAL_VENDOR_ID = '8ae0764b-c98d-4b4f-a71f-1e0111225a94'
const COASTAL_DEFAULT_SELL = '12.00'

type Contact = { name: string; email: string; role: 'to' | 'cc' }
type CustomerContact = { name: string; email: string }
type Address  = { name: string; street: string; city: string; state: string; zip: string }

export type EditDrumFormState = {
  order_number:            string
  order_date:              string
  status:                  string
  customer_id:             string
  vendor_id:               string
  is_blind_shipment:       boolean
  salesperson_id:          string
  csr_id:                  string
  customer_po:             string
  description:             string
  qty:                     string
  buy:                     string
  sell:                    string
  pick_up_date:            string
  freight_carrier:         string
  ship_from:               Address
  bill_to:                 Address
  customer_contacts:       CustomerContact[]
  invoice_payment_status:  string
  po_contacts:             Contact[]
  po_notes:                string
  misc_notes:              string
  bol_number:              string
  flag:                    boolean
  qb_invoice_number:       string
}

function emptyAddress(): Address {
  return { name: '', street: '', city: '', state: '', zip: '' }
}

function coerceAddr(v: unknown): Address {
  if (!v || typeof v !== 'object') return emptyAddress()
  const a = v as Record<string, unknown>
  return { name: String(a.name??''), street: String(a.street??''), city: String(a.city??''), state: String(a.state??''), zip: String(a.zip??'') }
}

export function useEditDrumForm(id: string) {
  const [saving, setSaving]     = useState(false)
  const [loading, setLoading]   = useState(true)
  const [isDirty, setIsDirty]   = useState(false)
  const [carriers, setCarriers] = useState<string[]>([])
  const [salespeople, setSales] = useState<{ id: string; name: string }[]>([])
  const [csrList, setCsrs]      = useState<{ id: string; name: string }[]>([])
  const [customers, setCusts]   = useState<{ id: string; name: string }[]>([])
  const [vendorList, setVends]  = useState<{ id: string; name: string }[]>([])

  const [form, setForm] = useState<EditDrumFormState>({
    order_number: '', order_date: '', status: 'Acknowledged Order',
    customer_id: '', vendor_id: '', is_blind_shipment: false,
    salesperson_id: '', csr_id: '', customer_po: '',
    description: '', qty: '', buy: '', sell: '', pick_up_date: '',
    freight_carrier: '', ship_from: emptyAddress(), bill_to: emptyAddress(),
    customer_contacts: [], invoice_payment_status: 'Not Invoiced',
    po_contacts: [], po_notes: '', misc_notes: '', bol_number: '',
    flag: false, qb_invoice_number: '',
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/recycling-orders/${id}`).then(r => r.json()),
      fetch('/api/dropdown-configs?type=CARRIER').then(r => r.json()),
      fetch('/api/users?permission=SALES').then(r => r.json()),
      fetch('/api/users?permission=CSR').then(r => r.json()),
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/vendors').then(r => r.json()),
    ]).then(([order, carriers, sales, csrs, custs, vends]) => {
      setCarriers(carriers.values ?? [])
      setSales(sales ?? [])
      setCsrs(csrs ?? [])
      setCusts(custs ?? [])
      setVends(vends ?? [])
      const mattCozik = (csrs as { id: string; name: string }[]).find(u => u.name === 'Matt Cozik')
      const defaultCsrId = order.csr_id ?? (mattCozik?.id ?? '')
      const loadedSell = order.sell ?? ''
      const isCoastal = (order.vendor_id ?? '') === COASTAL_VENDOR_ID
      const defaultSell = (!loadedSell && isCoastal) ? COASTAL_DEFAULT_SELL : loadedSell
      setForm({
        order_number:            order.order_number ?? '',
        order_date:              order.order_date ?? '',
        status:                  order.status ?? 'Acknowledged Order',
        customer_id:             order.customer_id ?? '',
        vendor_id:               order.vendor_id ?? '',
        is_blind_shipment:       order.is_blind_shipment ?? false,
        salesperson_id:          order.salesperson_id ?? '',
        csr_id:                  defaultCsrId,
        customer_po:             order.customer_po ?? '',
        description:             order.description ?? '',
        qty:                     order.qty ?? '',
        buy:                     order.buy ?? '',
        sell:                    defaultSell,
        pick_up_date:            order.pick_up_date ?? '',
        freight_carrier:         order.freight_carrier ?? '',
        ship_from:               coerceAddr(order.ship_from),
        bill_to:                 coerceAddr(order.bill_to),
        customer_contacts:       (order.customer_contacts ?? []) as CustomerContact[],
        invoice_payment_status:  order.invoice_payment_status ?? 'Not Invoiced',
        po_contacts:             (order.po_contacts ?? []) as Contact[],
        po_notes:                order.po_notes ?? '',
        misc_notes:              order.misc_notes ?? '',
        bol_number:              order.bol_number ?? '',
        flag:                    order.flag ?? false,
        qb_invoice_number:       order.qb_invoice_number ?? '',
      })
      setIsDirty(false)
    }).finally(() => setLoading(false))
  }, [id])

  function set<K extends keyof EditDrumFormState>(key: K, value: EditDrumFormState[K]) {
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

  function addCustContact() {
    set('customer_contacts', [...form.customer_contacts, { name: '', email: '' }])
  }

  function updateCustContact(i: number, patch: Partial<CustomerContact>) {
    set('customer_contacts', form.customer_contacts.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }

  function removeCustContact(i: number) {
    set('customer_contacts', form.customer_contacts.filter((_, idx) => idx !== i))
  }

  async function save() {
    if (form.po_contacts.length > 0 && !form.po_contacts.some(c => c.role === 'to')) {
      toast.error('At least one PO contact must have role "to"'); return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/recycling-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          invoice_status: 'Invoice',
          invoice_customer_amount: null,
          qty: form.qty || null, buy: form.buy || null, sell: form.sell || null,
          pick_up_date: form.pick_up_date || null,
          salesperson_id: form.salesperson_id || null,
          csr_id: form.csr_id || null,
          ship_from: form.ship_from.name || form.ship_from.street ? form.ship_from : null,
          bill_to: form.bill_to.name || form.bill_to.street ? form.bill_to : null,
          customer_contacts: form.customer_contacts.length ? form.customer_contacts : null,
          qb_invoice_number: form.qb_invoice_number || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed') }
      toast.success('Order saved')
      setIsDirty(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return { form, set, setShipFrom, setBillTo,
    addContact, updateContact, removeContact,
    addCustContact, updateCustContact, removeCustContact,
    save, saving, loading, carriers, salespeople, csrList, customers, vendorList,
    isDirty, markDirty: () => setIsDirty(true) }
}
