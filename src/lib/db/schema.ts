import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// ─── SINGLE TENANT — NO company_id ANYWHERE ───────────────────────────────────
// MPH United only. No companies table. No company_members table.
// salesperson_id and csr_id are UUID FKs to users — NOT text dropdowns.

// ─── users ────────────────────────────────────────────────────────────────────
// id mirrors Supabase auth.users UUID — no defaultRandom()

export const users = pgTable('users', {
  id:          uuid('id').primaryKey(),
  email:       text('email').notNull(),
  name:        text('name'),
  avatar_url:  text('avatar_url'),
  entra_id:    text('entra_id'),
  role:        text('role').notNull().default('CSR'),
  // role values: 'ADMIN' | 'CSR' | 'SALESPERSON' | 'ACCOUNTING' | 'WAREHOUSE'
  is_active:   boolean('is_active').notNull().default(true),
  created_at:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User    = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// ─── customers ────────────────────────────────────────────────────────────────

export const customers = pgTable('customers', {
  id:            uuid('id').primaryKey().defaultRandom(),
  name:          text('name').notNull(),
  contacts:      jsonb('contacts'),      // [{ name, email, phone, title }]
  ship_to:       jsonb('ship_to'),       // { address, city, state, zip }
  bill_to:       jsonb('bill_to'),       // { address, city, state, zip }
  payment_terms: text('payment_terms'),
  is_active:     boolean('is_active').notNull().default(true),
  created_at:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Customer    = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert

// ─── vendors ──────────────────────────────────────────────────────────────────

export const vendors = pgTable('vendors', {
  id:         uuid('id').primaryKey().defaultRandom(),
  name:       text('name').notNull(),
  address:    jsonb('address'),    // { address, city, state, zip }
  notes:      text('notes'),
  is_active:  boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Vendor    = typeof vendors.$inferSelect
export type NewVendor = typeof vendors.$inferInsert

// ─── orders ───────────────────────────────────────────────────────────────────
// All pricing fields live directly on orders (not on line items).
// order_split_loads is a child table for split-load line items only.

export const orders = pgTable('orders', {
  id:           uuid('id').primaryKey().defaultRandom(),
  order_number: text('order_number').notNull().unique(),
  order_date:   date('order_date'),
  order_type:   text('order_type'),
  // order_type values: 'Bottle' | 'Rebottle IBC' | 'Washout IBC' | 'Drums' | 'Parts'

  customer_id:    uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
  vendor_id:      uuid('vendor_id').references(() => vendors.id),
  salesperson_id: uuid('salesperson_id').references(() => users.id),
  csr_id:         uuid('csr_id').references(() => users.id),

  status: text('status').notNull().default('PENDING'),
  // status values: 'Pending' | 'Waiting On Vendor To Confirm' | 'Waiting To Confirm To Customer' |
  //   'Confirmed To Customer' | 'Rinse And Return Stage' | 'Sent Order To Carrier' |
  //   'Ready To Ship' | 'Ready To Invoice' | 'Complete' | 'Cancelled'

  customer_po:  text('customer_po'),
  description:  text('description'),
  part_number:  text('part_number'),

  qty:                numeric('qty',                { precision: 10, scale: 2 }),
  buy_price:          numeric('buy_price',          { precision: 10, scale: 2 }),
  sell_price:         numeric('sell_price',         { precision: 10, scale: 2 }),
  freight_cost:       numeric('freight_cost',       { precision: 10, scale: 2 }),
  freight_to_customer:numeric('freight_to_customer',{ precision: 10, scale: 2 }),
  additional_costs:   numeric('additional_costs',   { precision: 10, scale: 2 }).notNull().default('0'),
  bottle_cost:        numeric('bottle_cost',        { precision: 10, scale: 2 }),
  bottle_qty:         numeric('bottle_qty',         { precision: 10, scale: 2 }),
  mph_freight_bottles:numeric('mph_freight_bottles',{ precision: 10, scale: 2 }),

  freight_carrier:  text('freight_carrier'),
  ship_date:        date('ship_date'),
  wanted_date:      date('wanted_date'),

  ship_to:           jsonb('ship_to'),           // { address, city, state, zip }
  bill_to:           jsonb('bill_to'),           // { address, city, state, zip }
  customer_contacts: jsonb('customer_contacts'), // [{ name, email, phone }]

  terms: text('terms'),
  // terms values: 'PPD' | 'PPA' | 'FOB'

  appointment_time:  timestamp('appointment_time', { withTimezone: true }),
  appointment_notes: text('appointment_notes'),
  po_notes:          text('po_notes'),
  freight_invoice_notes: text('freight_invoice_notes'),
  shipper_notes:     text('shipper_notes'),
  misc_notes:        text('misc_notes'),

  flag: boolean('flag').notNull().default(false),

  invoice_payment_status: text('invoice_payment_status').notNull().default('Not Invoiced'),
  // values: 'Not Invoiced' | 'Invoiced' | 'Paid'

  commission_status: text('commission_status').notNull().default('Not Eligible'),
  // values: 'Not Eligible' | 'Eligible' | 'Commission Paid'

  qb_invoice_number: text('qb_invoice_number'),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('orders_customer_id_idx').on(t.customer_id),
  index('orders_status_idx').on(t.status),
  index('orders_ship_date_idx').on(t.ship_date),
  index('orders_invoice_payment_status_idx').on(t.invoice_payment_status),
])

export type Order    = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert

// ─── order_split_loads ────────────────────────────────────────────────────────
// Child table for split-load line items. One order can have multiple split loads.
// For non-split orders, all pricing is on the orders table directly.

export const order_split_loads = pgTable('order_split_loads', {
  id:           uuid('id').primaryKey().defaultRandom(),
  order_id:     uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  vendor_id:    uuid('vendor_id').references(() => vendors.id),
  description:  text('description'),
  qty:          numeric('qty',          { precision: 10, scale: 2 }),
  buy_each:     numeric('buy_each',     { precision: 10, scale: 2 }),
  sell_each:    numeric('sell_each',    { precision: 10, scale: 2 }),
  freight_cost: numeric('freight_cost', { precision: 10, scale: 2 }),
  part_number:  text('part_number'),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('order_split_loads_order_id_idx').on(t.order_id),
])

export type OrderSplitLoad    = typeof order_split_loads.$inferSelect
export type NewOrderSplitLoad = typeof order_split_loads.$inferInsert

// ─── bills_of_lading ──────────────────────────────────────────────────────────

export const bills_of_lading = pgTable('bills_of_lading', {
  id:          uuid('id').primaryKey().defaultRandom(),
  order_id:    uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  bol_number:  text('bol_number'),
  carrier:     text('carrier'),
  ship_from:   jsonb('ship_from'), // { name, address, city, state, zip }
  ship_to:     jsonb('ship_to'),   // { name, address, city, state, zip }
  pickup_date: date('pickup_date'),
  notes:       text('notes'),
  created_at:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('bills_of_lading_order_id_idx').on(t.order_id),
])

export type BillOfLading    = typeof bills_of_lading.$inferSelect
export type NewBillOfLading = typeof bills_of_lading.$inferInsert

// ─── company_settings ─────────────────────────────────────────────────────────
// Singleton row — MPH United company profile.

export const company_settings = pgTable('company_settings', {
  id:           uuid('id').primaryKey().defaultRandom(),
  name:         text('name').notNull(),
  legal_name:   text('legal_name'),
  address:      jsonb('address'),
  email:        text('email'),
  phone:        text('phone'),
  logo_url:     text('logo_url'),
  qbo_realm_id: text('qbo_realm_id'),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type CompanySettings    = typeof company_settings.$inferSelect
export type NewCompanySettings = typeof company_settings.$inferInsert

// ─── dropdown_configs ─────────────────────────────────────────────────────────

export const dropdown_configs = pgTable('dropdown_configs', {
  id:         uuid('id').primaryKey().defaultRandom(),
  type:       text('type').notNull().unique(),
  // type values: 'STATUS' | 'CARRIER' | 'PAYMENT_TERMS' | 'ORDER_TYPE'
  values:     jsonb('values').notNull().default([]), // string[]
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DropdownConfig    = typeof dropdown_configs.$inferSelect
export type NewDropdownConfig = typeof dropdown_configs.$inferInsert

// ─── audit_logs ───────────────────────────────────────────────────────────────

export const audit_logs = pgTable('audit_logs', {
  id:         uuid('id').primaryKey().defaultRandom(),
  user_id:    uuid('user_id').references(() => users.id),
  table_name: text('table_name').notNull(),
  record_id:  uuid('record_id').notNull(),
  action:     text('action').notNull(), // 'INSERT' | 'UPDATE' | 'DELETE'
  old_value:  jsonb('old_value'),
  new_value:  jsonb('new_value'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('audit_logs_table_record_idx').on(t.table_name, t.record_id),
  index('audit_logs_user_id_idx').on(t.user_id),
])

export type AuditLog    = typeof audit_logs.$inferSelect
export type NewAuditLog = typeof audit_logs.$inferInsert
