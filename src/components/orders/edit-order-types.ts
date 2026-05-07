import type { ChecklistItem } from '@/components/orders/order-checklist'
import type { SplitLoadValue } from '@/lib/orders/order-form-schema'
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
  bill_to_contacts: CustomerContact[] | null
  checklist: ChecklistItem[] | null
  split_loads: SplitLoadValue[]
  sales_order_number: string | null
  customer_name: string | null
  vendor_name: string | null
  salesperson_name: string | null
  csr_name: string | null
  csr2_name: string | null
  group_id: string | null
  group_po_number: string | null
}
