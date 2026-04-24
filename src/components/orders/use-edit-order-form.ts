'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ChecklistItem } from '@/components/orders/order-checklist'
import type { SplitLoadValue } from '@/lib/orders/order-form-schema'
import { deriveInitials } from '@/lib/orders/commission-eligibility'
import { sendPoEmail, sendBolEmail } from '@/lib/orders/email-draft-helpers'
import type { AddressValue, CustomerContact } from '@/components/orders/edit-order-addresses'

export type { AddressValue, CustomerContact }

export type OrderDetail = {
  id: string
  order_number: string
  order_date: string | null
  order_type: string | null
  status: string
  customer_id: string
  vendor_id: string | null
  salesperson_id: string | null
  csr_id: string | null
  csr2_id: string | null
  customer_po: string | null
  freight_carrier: string | null
  ship_date: string | null
  wanted_date: string | null
  freight_cost: string | null
  freight_to_customer: string | null
  additional_costs: string
  terms: string | null
  appointment_time: string | null
  appointment_notes: string | null
  po_notes: string | null
  freight_invoice_notes: string | null
  misc_notes: string | null
  flag: boolean
  is_blind_shipment: boolean
  is_revised: boolean
  invoice_payment_status: string
  commission_status: string
  qb_invoice_number: string | null
  ship_to: AddressValue | null
  bill_to: AddressValue | null
  customer_contacts: CustomerContact[] | null
  checklist: ChecklistItem[] | null
  split_loads: SplitLoadValue[]
  sales_order_number: string | null
  customer_name: string | null
  vendor_name: string | null
  salesperson_name: string | null
  csr_name: string | null
  csr2_name: string | null
}

export function useEditOrderForm(orderId: string) {
  const router = useRouter()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [csrUserOptions, setCsrUserOptions] = useState<Array<{ id: string; name: string | null; role: string }>>([])
  const [carriers, setCarriers] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [csrId, setCsrId] = useState('')
  const [csr2Id, setCsr2Id] = useState<string | null>(null)
  const [emailingPo, setEmailingPo] = useState(false)
  const [emailingBol, setEmailingBol] = useState(false)
  const [orderDate, setOrderDate] = useState('')
  const [orderType, setOrderType] = useState('')
  const [status, setStatus] = useState('')
  const [customerPo, setCustomerPo] = useState('')
  const [freightCarrier, setFreightCarrier] = useState('')
  const [shipDate, setShipDate] = useState('')
  const [wantedDate, setWantedDate] = useState('')
  const [freightCost, setFreightCost] = useState('')
  const [freightToCustomer, setFreightToCustomer] = useState('')
  const [additionalCosts, setAdditionalCosts] = useState('0')
  const [terms, setTerms] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [appointmentNotes, setAppointmentNotes] = useState('')
  const [poNotes, setPoNotes] = useState('')
  const [freightInvoiceNotes, setFreightInvoiceNotes] = useState('')
  const [miscNotes, setMiscNotes] = useState('')
  const [flag, setFlag] = useState(false)
  const [isBlind, setIsBlind] = useState(false)
  const [isRevised, setIsRevised] = useState(false)
  const [invoicePaymentStatus, setInvoicePaymentStatus] = useState('Not Invoiced')
  const [commissionStatus, setCommissionStatus] = useState('Not Eligible')
  const [qbInvoiceNumber, setQbInvoiceNumber] = useState('')
  const [shipTo, setShipTo] = useState<AddressValue | null>(null)
  const [billTo, setBillTo] = useState<AddressValue | null>(null)
  const [customerContacts, setCustomerContacts] = useState<CustomerContact[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [splitLoads, setSplitLoads] = useState<SplitLoadValue[]>([])

  useEffect(() => {
    fetch('/api/users?permission=CSR').then(r => r.json()).then(setCsrUserOptions).catch(() => {})
    fetch('/api/dropdown-configs?type=CARRIER').then(r => r.json()).then(v => setCarriers(Array.isArray(v) ? v : [])).catch(() => {})
    fetch('/api/dropdown-configs?type=ORDER_STATUS').then(r => r.json()).then(v => setStatusOptions(Array.isArray(v) ? v : [])).catch(() => {})
    fetch(`/api/orders/${orderId}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<OrderDetail> })
      .then(data => {
        setOrder(data)
        setCsrId(data.csr_id ?? '')
        setCsr2Id(data.csr2_id)
        setOrderDate(data.order_date ?? '')
        setOrderType(data.order_type ?? '')
        setStatus(data.status)
        setCustomerPo(data.customer_po ?? '')
        setFreightCarrier(data.freight_carrier ?? '')
        setShipDate(data.ship_date ?? '')
        setWantedDate(data.wanted_date ?? '')
        setFreightCost(data.freight_cost ?? '')
        setFreightToCustomer(data.freight_to_customer ?? '')
        setAdditionalCosts(data.additional_costs ?? '0')
        setTerms(data.terms ?? '')
        setAppointmentTime(data.appointment_time ?? '')
        setAppointmentNotes(data.appointment_notes ?? '')
        setPoNotes(data.po_notes ?? '')
        setFreightInvoiceNotes(data.freight_invoice_notes ?? '')
        setMiscNotes(data.misc_notes ?? '')
        setFlag(data.flag)
        setIsBlind(data.is_blind_shipment)
        setIsRevised(data.is_revised)
        setInvoicePaymentStatus(data.invoice_payment_status)
        setCommissionStatus(data.commission_status)
        setQbInvoiceNumber(data.qb_invoice_number ?? '')
        setShipTo(data.ship_to)
        setBillTo(data.bill_to)
        setCustomerContacts((data.customer_contacts as CustomerContact[]) ?? [])
        setChecklist((data.checklist as ChecklistItem[]) ?? [])
        setSplitLoads(data.split_loads.map(l => ({
          id: l.id,
          description: l.description ?? '',
          part_number: l.part_number ?? '',
          qty: l.qty ?? '',
          buy: l.buy ?? '',
          sell: l.sell ?? '',
          bottle_cost: l.bottle_cost ?? '',
          bottle_qty: l.bottle_qty ?? '',
          mph_freight_bottles: l.mph_freight_bottles ?? '',
          order_number_override: l.order_number_override ?? '',
          customer_po: l.customer_po ?? '',
          order_type: l.order_type ?? '',
          ship_date: l.ship_date ?? '',
          wanted_date: l.wanted_date ?? '',
          separate_po: false,
          preview_po: '',
        })))
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [orderId])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const loadsToSend = splitLoads.map(({ separate_po: _s, preview_po: _p, ...rest }) => rest)
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_date: orderDate || null,
          order_type: orderType || null,
          status,
          csr_id: csrId || null,
          csr2_id: csr2Id || null,
          customer_po: customerPo || null,
          freight_carrier: freightCarrier || null,
          ship_date: shipDate || null,
          wanted_date: wantedDate || null,
          freight_cost: freightCost || null,
          freight_to_customer: freightToCustomer || null,
          additional_costs: additionalCosts || '0',
          terms: terms || null,
          appointment_time: appointmentTime || null,
          appointment_notes: appointmentNotes || null,
          po_notes: poNotes || null,
          freight_invoice_notes: freightInvoiceNotes || null,
          misc_notes: miscNotes || null,
          flag,
          is_blind_shipment: isBlind,
          is_revised: isRevised,
          invoice_payment_status: invoicePaymentStatus,
          commission_status: commissionStatus,
          qb_invoice_number: qbInvoiceNumber || null,
          ship_to: shipTo,
          bill_to: billTo,
          customer_contacts: customerContacts,
          checklist,
          split_loads: loadsToSend,
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

  async function handleDuplicate() {
    if (!order) return
    try {
      const res = await fetch(`/api/orders/duplicate/${orderId}`, { method: 'POST' })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json() as { id: string }
      toast.success('Order duplicated successfully')
      router.push(`/orders/${data.id}`)
    } catch (err) {
      toast.error('Failed to duplicate order: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  function handleEmailPoClick() {
    if (!order) return
    void sendPoEmail(
      { id: orderId, order_number: order.order_number, vendor_id: order.vendor_id,
        vendor_name: order.vendor_name, customer_name: order.customer_name,
        customer_po: order.customer_po, sales_order_number: order.sales_order_number,
        freight_carrier: order.freight_carrier, ship_date: order.ship_date,
        is_blind_shipment: order.is_blind_shipment },
      splitLoads, shipDate, shipTo, poNotes, setEmailingPo,
    )
  }

  function handleEmailBolClick() {
    if (!order) return
    void sendBolEmail(
      { id: orderId, order_number: order.order_number, vendor_id: order.vendor_id,
        vendor_name: order.vendor_name, customer_name: order.customer_name,
        customer_po: order.customer_po, sales_order_number: order.sales_order_number,
        freight_carrier: order.freight_carrier, ship_date: order.ship_date,
        is_blind_shipment: order.is_blind_shipment },
      shipDate, shipTo, setEmailingBol,
    )
  }

  const csrInitials = deriveInitials(order?.csr_name)

  return {
    order, setOrder,
    loading, error,
    saving, saved,
    loads: splitLoads, setLoads: setSplitLoads,
    csrUserOptions, carriers, statusOptions,
    csrId, setCsrId,
    csr2Id, setCsr2Id,
    emailingPo, emailingBol,
    orderDate, setOrderDate,
    orderType, setOrderType,
    status, setStatus,
    customerPo, setCustomerPo,
    freightCarrier, setFreightCarrier,
    shipDate, setShipDate,
    wantedDate, setWantedDate,
    freightCost, setFreightCost,
    freightToCustomer, setFreightToCustomer,
    additionalCosts, setAdditionalCosts,
    terms, setTerms,
    appointmentTime, setAppointmentTime,
    appointmentNotes, setAppointmentNotes,
    poNotes, setPoNotes,
    freightInvoiceNotes, setFreightInvoiceNotes,
    miscNotes, setMiscNotes,
    flag, setFlag,
    isBlind, setIsBlind,
    isRevised, setIsRevised,
    invoicePaymentStatus, setInvoicePaymentStatus,
    commissionStatus, setCommissionStatus,
    qbInvoiceNumber, setQbInvoiceNumber,
    shipTo, setShipTo,
    billTo, setBillTo,
    customerContacts, setCustomerContacts,
    checklist, setChecklist,
    handleSave,
    handleDuplicate,
    handleEmailPoClick,
    handleEmailBolClick,
    csrInitials,
  }
}
