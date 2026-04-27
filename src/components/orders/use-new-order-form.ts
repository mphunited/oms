'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver, SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'
import { orderFormSchema, emptyLoad, type OrderFormValues, type SplitLoadValue } from '@/lib/orders/order-form-schema'
import { deriveInitials } from '@/lib/orders/commission-eligibility'

type UserOption = { id: string; name: string | null; role: string }
type Option = { id: string; name: string }
type VendorOption = { id: string; name: string; is_blind_shipment_default: boolean }

export function useNewOrderForm() {
  const [customers,        setCustomers]        = useState<Option[]>([])
  const [vendors,          setVendors]          = useState<VendorOption[]>([])
  const [salespersonUsers, setSalespersonUsers] = useState<UserOption[]>([])
  const [csrUsers,         setCsrUsers]         = useState<UserOption[]>([])
  const [carriers,         setCarriers]         = useState<string[]>([])
  const [statusOptions,    setStatusOptions]    = useState<string[]>([])
  const [loads,            setLoads]            = useState<SplitLoadValue[]>([emptyLoad()])
  const [savedOrder,       setSavedOrder]       = useState<{ id: string; order_number: string } | null>(null)
  const [isSubmitting,     setIsSubmitting]     = useState(false)
  const [submitError,      setSubmitError]      = useState<string | null>(null)
  const [isAdmin,          setIsAdmin]          = useState(false)
  const [canUseManualPO,   setCanUseManualPO]   = useState(false)
  const [csrInitials,      setCsrInitials]      = useState('XX')

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/vendors').then(r => r.json()),
      fetch('/api/users?permission=SALES').then(r => r.json()),
      fetch('/api/users?permission=CSR').then(r => r.json()),
      fetch('/api/dropdown-configs?type=CARRIER').then(r => r.json()),
      fetch('/api/dropdown-configs?type=ORDER_STATUS').then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
    ]).then(([c, v, sp, csr, car, statuses, me]) => {
      setCustomers(c)
      setVendors(v)
      setSalespersonUsers(sp)
      setCsrUsers(csr)
      setCarriers(Array.isArray(car?.values) ? car.values : [])
      setStatusOptions(Array.isArray(statuses?.values) ? statuses.values : [])
      setIsAdmin(me?.role === 'ADMIN')
      setCanUseManualPO(me?.role === 'ADMIN' || me?.role === 'CSR')
      setCsrInitials(deriveInitials(me?.name))
    })
  }, [])

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema) as Resolver<OrderFormValues>,
    defaultValues: {
      order_date:        new Date().toISOString().slice(0, 10),
      status:            'Pending',
      flag:              false,
      is_blind_shipment: false,
      is_revised:        false,
      additional_costs:  0,
      customer_contacts: [],
      bill_to_contacts:  [],
      split_loads:       [{ qty: undefined, buy: undefined, sell: undefined,
                            bottle_cost: undefined, bottle_qty: undefined,
                            mph_freight_bottles: undefined }],
    },
  })

  const salespersonOptions: Option[] = salespersonUsers.map(u => ({ id: u.id, name: u.name ?? u.id }))
  const csrOptions: Option[] = csrUsers.map(u => ({ id: u.id, name: u.name ?? u.id }))

  useEffect(() => {
    const sub = form.watch((values, { name }) => {
      if (name !== 'vendor_id') return
      const vendor = vendors.find(v => v.id === values.vendor_id)
      form.setValue('is_blind_shipment', vendor?.is_blind_shipment_default ?? false)
      if (vendor?.name !== 'MPH United / Alliance Container -- Hillsboro, TX') {
        form.setValue('sales_order_number', '')
      }
    })
    return () => sub.unsubscribe()
  }, [vendors, form])

  const onSubmit: SubmitHandler<OrderFormValues> = async (data) => {
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const loadsPayload = loads.map((l) => ({
        id: l.id,
        description: l.description || null,
        part_number: l.part_number || null,
        qty: l.qty || null,
        buy: l.buy || null,
        sell: l.sell || null,
        bottle_cost: l.bottle_cost || null,
        bottle_qty: l.bottle_qty || null,
        mph_freight_bottles: l.mph_freight_bottles || null,
        order_number_override: l.order_number_override || null,
        customer_po: l.customer_po || null,
        order_type: l.order_type || null,
        ship_date: l.ship_date || null,
        wanted_date: l.wanted_date || null,
        separate_po: l.separate_po,
      }))

      // Order-level dates come from Load 1
      const orderShipDate = loads[0]?.ship_date || data.ship_date || null
      const orderWantedDate = loads[0]?.wanted_date || data.wanted_date || null

      const body = {
        ...data,
        ship_date: orderShipDate,
        wanted_date: orderWantedDate,
        split_loads: loadsPayload,
      }

      const res = await fetch('/api/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (res.status === 409) {
        toast.error('PO number already exists')
        return
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(errBody.detail ?? errBody.error ?? 'Failed to save order')
      }
      const order = await res.json() as { id: string; order_number: string }
      setSavedOrder(order)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    form,
    loads,
    setLoads,
    savedOrder,
    setSavedOrder,
    isSubmitting,
    submitError,
    isAdmin,
    canUseManualPO,
    csrInitials,
    customers,
    vendors,
    salespersonOptions,
    csrOptions,
    carriers,
    statusOptions,
    onSubmit,
  }
}
