import { z } from 'zod'

export type SplitLoadValue = {
  id?: string
  description: string
  part_number: string
  qty: string
  buy: string
  sell: string
  bottle_cost: string
  bottle_qty: string
  mph_freight_bottles: string
  order_number_override: string
  // New per-load fields:
  customer_po: string
  order_type: string
  ship_date: string
  wanted_date: string
  // UI-only (not columns in DB — stripped server-side):
  separate_po: boolean
  preview_po: string
}

export function emptyLoad(): SplitLoadValue {
  return {
    description: '', part_number: '', qty: '', buy: '', sell: '',
    bottle_cost: '', bottle_qty: '', mph_freight_bottles: '', order_number_override: '',
    customer_po: '', order_type: '', ship_date: '', wanted_date: '',
    separate_po: false, preview_po: '',
  }
}

const addressSchema = z.object({
  name:           z.string().optional(),
  street:         z.string().optional(),
  street2:        z.string().optional(),
  city:           z.string().optional(),
  state:          z.string().optional(),
  zip:            z.string().optional(),
  phone_office:   z.string().optional(),
  phone_ext:      z.string().optional(),
  phone_cell:     z.string().optional(),
  phone:          z.string().optional(),
  email:          z.string().optional(),
  email2:         z.string().optional(),
  shipping_notes: z.string().optional(),
})

const numericField = z
  .union([z.nan().transform(() => undefined), z.number().min(0)])
  .optional()

const contactSchema = z.object({
  name:  z.string().optional(),
  email: z.string().optional(),
})

const splitLoadSchema = z.object({
  description:           z.string().optional(),
  part_number:           z.string().optional(),
  qty:                   numericField,
  buy:                   numericField,
  sell:                  numericField,
  bottle_cost:           numericField,
  bottle_qty:            numericField,
  mph_freight_bottles:   numericField,
  order_number_override: z.string().optional(),
  customer_po:           z.string().optional(),
  order_type:            z.string().optional(),
  ship_date:             z.string().optional(),
  wanted_date:           z.string().optional(),
})

export const orderFormSchema = z.object({
  order_date:     z.string().min(1, 'Required'),
  salesperson_id: z.string().min(1, 'Required'),
  csr_id:         z.string().min(1, 'Required'),
  csr2_id:        z.string().nullable().optional(),
  status:         z.string().min(1, 'Required'),
  order_type:     z.string().min(1, 'Required'),

  customer_id:     z.string().min(1, 'Required'),
  vendor_id:       z.string().optional(),
  customer_po:     z.string().min(1, 'Required'),
  freight_carrier: z.string().optional(),

  ship_date:   z.string().optional(),
  wanted_date: z.string().optional(),

  freight_cost:        numericField,
  freight_to_customer: numericField,
  terms:               z.string().optional(),
  additional_costs:    z
    .union([z.nan().transform(() => 0), z.number().min(0)])
    .default(0),

  appointment_time:  z.string().optional(),
  appointment_notes: z.string().optional(),

  ship_to: addressSchema.optional(),
  bill_to: addressSchema.optional(),

  customer_contacts: z.array(contactSchema).default([]),
  bill_to_contacts: z.array(contactSchema).default([]),

  po_notes:              z.string().optional(),
  freight_invoice_notes: z.string().optional(),
  shipper_notes:         z.string().optional(),
  misc_notes:            z.string().optional(),

  flag:              z.boolean().default(false),
  is_blind_shipment: z.boolean().default(false),
  is_revised:        z.boolean().default(false),

  invoice_payment_status: z.string().optional(),
  qb_invoice_number:      z.string().optional(),
  invoice_paid_date:      z.string().optional(),

  manual_order_number: z.string().optional(),
  sales_order_number:  z.string().optional(),

  split_loads: z.array(splitLoadSchema).min(1),
})

export type OrderFormValues = z.infer<typeof orderFormSchema>
