import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
} from 'drizzle-orm/pg-core'

// ─── companies ───────────────────────────────────────────────────────────────

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  legal_name: text('legal_name'),
  address: jsonb('address'),
  email: text('email'),
  phone: text('phone'),
  logo_url: text('logo_url'),
  qbo_realm_id: text('qbo_realm_id'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert

// ─── users ────────────────────────────────────────────────────────────────────
// id mirrors the Supabase auth.users UUID — no defaultRandom() so it matches auth

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  avatar_url: text('avatar_url'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// ─── company_members ──────────────────────────────────────────────────────────

export const company_members = pgTable('company_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'CSR' | 'ACCOUNTING' | 'WAREHOUSE' | 'ADMIN'
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type CompanyMember = typeof company_members.$inferSelect
export type NewCompanyMember = typeof company_members.$inferInsert

// ─── customers ────────────────────────────────────────────────────────────────

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  contacts: jsonb('contacts'),   // array of { name, email, phone, title }
  ship_to: jsonb('ship_to'),    // { address, city, state, zip }
  bill_to: jsonb('bill_to'),    // { address, city, state, zip }
  payment_terms: text('payment_terms'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert

// ─── vendors ──────────────────────────────────────────────────────────────────

export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: jsonb('address'),    // { address, city, state, zip }
  notes: text('notes'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Vendor = typeof vendors.$inferSelect
export type NewVendor = typeof vendors.$inferInsert

// ─── orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  order_number: text('order_number').notNull(),
  customer_id: uuid('customer_id').notNull().references(() => customers.id),
  status: text('status').notNull().default('PENDING'),
  // status values: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  salesperson: text('salesperson'),
  csr: text('csr'),
  ship_date: date('ship_date'),
  delivery_date: date('delivery_date'),
  customer_po: text('customer_po'),
  freight_carrier: text('freight_carrier'),
  appointment_time: timestamp('appointment_time', { withTimezone: true }),
  appointment_notes: text('appointment_notes'),
  po_notes: text('po_notes'),
  freight_notes: text('freight_notes'),
  shipper_notes: text('shipper_notes'),
  misc_notes: text('misc_notes'),
  terms: text('terms'),
  notes: text('notes'),
  flag: boolean('flag').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert

// ─── order_line_items ─────────────────────────────────────────────────────────

export const order_line_items = pgTable('order_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  vendor_id: uuid('vendor_id').references(() => vendors.id),
  description: text('description'),
  qty: numeric('qty', { precision: 10, scale: 2 }),
  buy_each: numeric('buy_each', { precision: 10, scale: 2 }),
  sell_each: numeric('sell_each', { precision: 10, scale: 2 }),
  freight_cost: numeric('freight_cost', { precision: 10, scale: 2 }),
  split_load: boolean('split_load').default(false),
  part_number: text('part_number'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type OrderLineItem = typeof order_line_items.$inferSelect
export type NewOrderLineItem = typeof order_line_items.$inferInsert

// ─── invoices ─────────────────────────────────────────────────────────────────

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: uuid('order_id').notNull().references(() => orders.id),
  invoice_number: text('invoice_number').notNull(),
  total: numeric('total', { precision: 10, scale: 2 }),
  status: text('status').notNull().default('DRAFT'),
  // status values: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'VOID'
  qbo_invoice_id: text('qbo_invoice_id'),
  issued_at: timestamp('issued_at', { withTimezone: true }),
  due_at: timestamp('due_at', { withTimezone: true }),
  paid_at: timestamp('paid_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert

// ─── bills_of_lading ──────────────────────────────────────────────────────────

export const bills_of_lading = pgTable('bills_of_lading', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  bol_number: text('bol_number'),
  carrier: text('carrier'),
  ship_from: jsonb('ship_from'),  // { name, address, city, state, zip }
  ship_to: jsonb('ship_to'),     // { name, address, city, state, zip }
  pickup_date: date('pickup_date'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type BillOfLading = typeof bills_of_lading.$inferSelect
export type NewBillOfLading = typeof bills_of_lading.$inferInsert

// ─── dropdown_configs ─────────────────────────────────────────────────────────

export const dropdown_configs = pgTable('dropdown_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  // type values: 'SALESPERSON' | 'CSR' | 'STATUS' | 'CARRIER' | 'PAYMENT_TERMS'
  values: jsonb('values').notNull().default([]),  // string[]
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DropdownConfig = typeof dropdown_configs.$inferSelect
export type NewDropdownConfig = typeof dropdown_configs.$inferInsert

// ─── forum_posts ──────────────────────────────────────────────────────────────

export const forum_posts = pgTable('forum_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  author_id: uuid('author_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  tag: text('tag'),
  status: text('status').notNull().default('OPEN'),  // 'OPEN' | 'RESOLVED' | 'CLOSED'
  is_pinned: boolean('is_pinned').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ForumPost = typeof forum_posts.$inferSelect
export type NewForumPost = typeof forum_posts.$inferInsert

// ─── forum_replies ────────────────────────────────────────────────────────────

export const forum_replies = pgTable('forum_replies', {
  id: uuid('id').primaryKey().defaultRandom(),
  post_id: uuid('post_id').notNull().references(() => forum_posts.id, { onDelete: 'cascade' }),
  author_id: uuid('author_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ForumReply = typeof forum_replies.$inferSelect
export type NewForumReply = typeof forum_replies.$inferInsert

// ─── resources ────────────────────────────────────────────────────────────────

export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  url: text('url').notNull(),
  kind: text('kind'),  // e.g. 'link' | 'document' | 'video'
  pinned: boolean('pinned').notNull().default(false),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Resource = typeof resources.$inferSelect
export type NewResource = typeof resources.$inferInsert

// ─── audit_logs ───────────────────────────────────────────────────────────────

export const audit_logs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id),
  table_name: text('table_name').notNull(),
  record_id: uuid('record_id').notNull(),
  action: text('action').notNull(),  // 'INSERT' | 'UPDATE' | 'DELETE'
  old_value: jsonb('old_value'),
  new_value: jsonb('new_value'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AuditLog = typeof audit_logs.$inferSelect
export type NewAuditLog = typeof audit_logs.$inferInsert
