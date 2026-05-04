'use client'

import { useEffect, useState } from 'react'
import { matchOrderType } from '@/lib/orders/description-type-map'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deriveInitials } from '@/lib/orders/commission-eligibility'
import { sendPoEmail, sendBolEmail, sendConfirmationEmail } from '@/lib/orders/email-draft-helpers'
import type { AddressValue, CustomerContact } from '@/components/orders/edit-order-addresses'
import type { OrderDetail } from '@/components/orders/edit-order-types'
import type { ChecklistItem } from '@/components/orders/order-checklist'
import type { SplitLoadValue } from '@/lib/orders/order-form-schema'

export type { AddressValue, CustomerContact, OrderDetail }

export function useEditOrderForm(orderId: string) {
  const router = useRouter()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [csrUserOptions, setCsrUserOptions] = useState<Array<{ id: string; name: string | null; role: string }>>([])
  const [salespersonOptions, setSalespersonOptions] = useState<Array<{ id: string; name: string }>>([])
  const [carriers, setCarriers] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [csrId, setCsrId] = useState('')
  const [csr2Id, setCsr2Id] = useState<string | null>(null)
  const [salespersonId, setSalespersonId] = useState('')
  const [emailingPo, setEmailingPo] = useState(false)
  const [emailingBol, setEmailingBol] = useState(false)
  const [emailingConfirmation, setEmailingConfirmation] = useState(false)
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
  const [billToContacts, setBillToContacts] = useState<CustomerContact[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [splitLoads, setSplitLoads] = useState<SplitLoadValue[]>([])
  const [customerId, setCustomerId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [salesOrderNumber, setSalesOrderNumber] = useState('')
  const [customerOptions, setCustomerOptions] = useState<Array<{ id: string; name: string }>>([])
  const [vendorOptions, setVendorOptions] = useState<Array<{ id: string; name: string }>>([])
  const [orderTypeManuallySet, setOrderTypeManuallySet] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/me').then(r => r.json())
      .then(me => setIsAdmin(me?.role === 'ADMIN'))
      .catch(() => {})
    fetch('/api/users?permission=CSR').then(r => r.json()).then(setCsrUserOptions).catch(() => {})
    fetch('/api/users?permission=SALES').then(r => r.json())
      .then(v => setSalespersonOptions(
        Array.isArray(v) ? v.map((u: { id: string; name: string | null }) =>
          ({ id: u.id, name: u.name ?? u.id })) : []
      ))
      .catch(() => {})
    fetch('/api/customers').then(r => r.json())
      .then(v => setCustomerOptions(Array.isArray(v) ? v : []))
      .catch(() => {})
    fetch('/api/vendors').then(r => r.json())
      .then(v => setVendorOptions(Array.isArray(v) ?
        v.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })) : []))
      .catch(() => {})
    fetch('/api/dropdown-configs?type=CARRIER').then(r => r.json()).then(v => setCarriers(Array.isArray(v?.values) ? v.values : [])).catch(() => {})
    fetch('/api/dropdown-configs?type=ORDER_STATUS').then(r => r.json()).then(v => setStatusOptions(Array.isArray(v?.values) ? v.values : [])).catch(() => {})
    fetch(`/api/orders/${orderId}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<OrderDetail> })
      .then(data => {
        setOrder(data)
        setCsrId(data.csr_id ?? '')
        setCsr2Id(data.csr2_id)
        setSalespersonId(data.salesperson_id ?? '')
        setCustomerId(data.customer_id ?? '')
        setVendorId(data.vendor_id ?? '')
        setSalesOrderNumber(data.sales_order_number ?? '')
        setOrderDate(data.order_date ?? '')
        setOrderType(data.order_type ?? '')
        setStatus(data.status)
        setCustomerPo(data.customer_po ?? '')
        setFreightCarrier(data.freight_carrier ?? '')
        setShipDate(data.ship_date ?? data.split_loads?.[0]?.ship_date ?? '')
        setWantedDate(data.wanted_date ?? data.split_loads?.[0]?.wanted_date ?? '')
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
        setBillToContacts((data.bill_to_contacts as CustomerContact[]) ?? [])
        setChecklist((data.checklist as ChecklistItem[]) ?? [])
        setSplitLoads(data.split_loads.map(l => ({
          id: l.id,
          description: l.description ?? '',
          part_number: l.part_number ?? '',
          qty: l.qty != null ? parseFloat(l.qty).toString() : '',
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

  useEffect(() => {
    if (orderTypeManuallySet) return
    const firstDesc = splitLoads[0]?.description ?? ''
    const matched = matchOrderType(firstDesc)
    if (matched) setOrderType(matched)
  }, [splitLoads, orderTypeManuallySet])

  async function handleSave(): Promise<boolean> {
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
          customer_id: customerId || null,
          vendor_id: vendorId || null,
          sales_order_number: salesOrderNumber || null,
          salesperson_id: salespersonId || null,
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
          bill_to_contacts: billToContacts,
          split_loads: loadsToSend,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      return true
    } catch (err) {
      alert('Save failed: ' + (err instanceof Error ? err.message : String(err)))
      return false
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
        freight_carrier: freightCarrier || order.freight_carrier, ship_date: order.ship_date,
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

  function handleEmailConfirmationClick() {
    void sendConfirmationEmail([orderId], setEmailingConfirmation)
  }

  const csrInitials = deriveInitials(order?.csr_name)

  return {
    order, setOrder,
    loading, error,
    saving, saved,
    loads: splitLoads, setLoads: setSplitLoads,
    csrUserOptions, salespersonOptions, carriers, statusOptions,
    csrId, setCsrId,
    csr2Id, setCsr2Id,
    salespersonId, setSalespersonId,
    customerId, setCustomerId,
    vendorId, setVendorId,
    salesOrderNumber, setSalesOrderNumber,
    customerOptions, vendorOptions,
    setOrderTypeManuallySet,
    emailingPo, emailingBol, emailingConfirmation,
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
    billToContacts, setBillToContacts,
    checklist, setChecklist,
    isAdmin,
    handleSave,
    handleDuplicate,
    handleEmailPoClick,
    handleEmailBolClick,
    handleEmailConfirmationClick,
    csrInitials,
  }
}
