import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
  index,
  integer,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "CSR",
  "ACCOUNTING",
  "SALES",
]);

export const globalEmailContactTypeEnum = pgEnum("global_email_contact_type", [
  "CONFIRMATION",
  "BILL_TO",
  "BOTH",
]);

// ─── SINGLE TENANT — NO company_id ANYWHERE ───────────────────────────────────
// MPH United only. No companies table. No company_members table.
// salesperson_id and csr_id are UUID FKs to users — NOT text dropdowns.

// ─── Type constants ───────────────────────────────────────────────────────────
// Use these everywhere instead of raw strings — forms, API routes, filters, queries.

export const ORDER_STATUSES = [
  "Pending",
  "Acknowledged Order",
  "PO Request To Accounting",
  "PO Revision To Accounting",
  "PO Moving",
  "Waiting On Vendor To Confirm",
  "Waiting To Confirm To Customer",
  "Waiting For Customer To Confirm",
  "Confirmed To Customer",
  "Rinse And Return Stage",
  "Rinse & Return Stage",
  "Sent Order To Carrier",
  "Ready To Ship",
  "Ready To Invoice",
  "Complete",
  "Cancelled",
  "Canceled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const RECYCLING_STATUSES = [
  "Acknowledged Order",
  "PO Request To Accounting",
  "Waiting On Vendor To Confirm",
  "Credit Sent In",
  "Confirmed To Customer",
  "Waiting For Customer To Confirm",
  "Ready To Pickup",
  "Picked Up",
  "Sent Order To Carrier",
  "Ready To Ship",
  "Ready To Invoice",
  "Complete",
  "Canceled",
] as const;
export type RecyclingStatus = (typeof RECYCLING_STATUSES)[number];

export const ORDER_TYPES = [
  "135 Gal New IBC",
  "275 Gal New IBC",
  "330 Gal New IBC",
  "135 Gal Rebottle IBC",
  "275 Gal Rebottle IBC",
  "330 Gal Rebottle IBC",
  "275 Gal Bottle",
  "330 Gal Bottle",
  "135 Gal Washout IBC",
  "275 Gal Washout IBC",
  "330 Gal Washout IBC",
  "275 Gal IBC Wash & Return Program",
  "330 Gal IBC Wash & Return Program",
  "275 Gal Empty Washable Bottle",
  "55 Gal New OH Poly Drum",
  "55 Gal New TH Poly Drum",
  "55 Gal Washout OH Poly Drum",
  "55 Gal Washout TH Poly Drum",
  "55 Gal New OH Steel Drum",
  "55 Gal New TH Steel Drum",
  "20 Liters (5 gal) Jerrycans/Carboys",
  "Other — Parts & Supplies",
] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const INVOICE_PAYMENT_STATUSES = [
  "Not Invoiced",
  "Invoiced",
  "Paid",
] as const;
export type InvoicePaymentStatus = (typeof INVOICE_PAYMENT_STATUSES)[number];

export const COMMISSION_STATUSES = [
  "Not Eligible",
  "Eligible",
  "Commission Paid",
] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const TERMS_VALUES = ["PPD", "PPA", "FOB"] as const;
export type TermsValue = (typeof TERMS_VALUES)[number];

export const RECYCLING_INVOICE_STATUSES = [
  "Credit",
  "Invoice",
  "No Charge",
] as const;
export type RecyclingInvoiceStatus =
  (typeof RECYCLING_INVOICE_STATUSES)[number];

// ─── users ────────────────────────────────────────────────────────────────────
// id mirrors Supabase auth.users UUID — no defaultRandom()

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  avatar_url: text("avatar_url"),
  entra_id: text("entra_id"),
  title: text("title"),
  phone: text("phone"),
  email_signature: text("email_signature"),
  role: userRoleEnum("role").notNull().default("CSR"),
  permissions: jsonb("permissions").notNull().default([]), // ["SALES"] | ["CSR"] | [] — controls order form dropdown appearance, independent of app access role
  can_view_commission: boolean("can_view_commission").notNull().default(false),
  is_commission_eligible: boolean("is_commission_eligible").notNull().default(false), // true = appears in commission report dropdown; Renee only currently
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ─── customers ────────────────────────────────────────────────────────────────

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contacts: jsonb("contacts"),
  // [{ name, email, phone_office, phone_cell, role, is_primary, notes }]
  ship_to: jsonb("ship_to"),
  // { street, city, state, zip }
  bill_to: jsonb("bill_to"),
  // { street, city, state, zip }
  payment_terms: text("payment_terms"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

// ─── vendors ──────────────────────────────────────────────────────────────────

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: jsonb("address"),
  // { street, city, state, zip }
  notes: text("notes"),
  contacts: jsonb("contacts"),
  // [{ name, email, phone, is_primary }]
  lead_contact: text("lead_contact"),
  dock_info: text("dock_info"),
  po_contacts: jsonb("po_contacts"),
  // [{ name, email, phone, role: "to"|"cc" }] — role replaces is_primary; fallback: is_primary===true → "to"
  bol_contacts: jsonb("bol_contacts"),
  // [{ name, email, phone, role: "to"|"cc" }] — role replaces is_primary; fallback: is_primary===true → "to"
  invoice_contacts: jsonb("invoice_contacts"),
  // [{ name, email, phone, role: "to"|"cc" }] — Phase 2 usage, schema added now
  schedule_contacts: jsonb("schedule_contacts"),
  // [{ name, email, phone, role: "to"|"cc" }] — recipients for vendor schedule email
  checklist_template: jsonb("checklist_template"),
  // [{ label, done }]
  default_bottle_cost: numeric("default_bottle_cost", {
    precision: 10,
    scale: 2,
  }),
  default_bottle_qty: numeric("default_bottle_qty", {
    precision: 10,
    scale: 2,
  }),
  default_mph_freight_bottles: numeric("default_mph_freight_bottles", {
    precision: 10,
    scale: 2,
  }),
  is_active: boolean("is_active").notNull().default(true),
  is_blind_shipment_default: boolean("is_blind_shipment_default").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;

// ─── orders ───────────────────────────────────────────────────────────────────
// Pricing fields (qty, buy, sell, description, part_number, bottle_*) live on
// order_split_loads — every order has at least one split load row.

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_number: text("order_number").notNull().unique(),
    order_date: date("order_date"),
    order_type: text("order_type"),
    // See ORDER_TYPES constant above. Commission eligibility determined by order_type_configs.is_commission_eligible — NOT keyword-based.

    customer_id: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    vendor_id: uuid("vendor_id").references(() => vendors.id),
    salesperson_id: uuid("salesperson_id").references(() => users.id),
    csr_id: uuid("csr_id").references(() => users.id),
    csr2_id: uuid("csr2_id").references(() => users.id),

    status: text("status").notNull().default("Pending"),
    // See ORDER_STATUSES constant above.

    customer_po: text("customer_po"),

    freight_cost: numeric("freight_cost", { precision: 10, scale: 2 }),
    freight_to_customer: numeric("freight_to_customer", {
      precision: 10,
      scale: 2,
    }),
    additional_costs: numeric("additional_costs", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),

    freight_carrier: text("freight_carrier"),
    ship_date: date("ship_date"),
    wanted_date: date("wanted_date"),

    ship_to: jsonb("ship_to"),
    // { name, street, street2, city, state, zip, phone_office, phone_ext, phone_cell, email, email2, shipping_notes }
    // legacy: phone key present on old rows — fall back to phone when phone_office/phone_cell absent
    // legacy: phone_office, phone_ext, phone_cell, email, email2 — no longer rendered on order form; retained for historical data only
    bill_to: jsonb("bill_to"),
    // { name, street, street2, city, state, zip, phone_office, phone_ext, phone_cell, email, email2, shipping_notes }
    // active on form: phone_office, phone_ext, phone_cell (still rendered on Bill To section)
    // legacy: email, email2 — no longer rendered on order form; retained for historical data only
    customer_contacts: jsonb("customer_contacts"),
    // [{ name, email, is_primary }] — is_primary=true → To, false → Cc for Graph API drafts
    bill_to_contacts: jsonb("bill_to_contacts"),
    // [{ name, email }] — bill to contacts, mirrors customer_contacts shape

    terms: text("terms"),
    // See TERMS_VALUES constant above.

    appointment_time: timestamp("appointment_time", { withTimezone: true }),
    appointment_notes: text("appointment_notes"),
    po_notes: text("po_notes"),
    freight_invoice_notes: text("freight_invoice_notes"),
    shipper_notes: text("shipper_notes"),
    misc_notes: text("misc_notes"),

    flag: boolean("flag").notNull().default(false),

    invoice_payment_status: text("invoice_payment_status")
      .notNull()
      .default("Not Invoiced"),
    // See INVOICE_PAYMENT_STATUSES constant above.

    // ── Invoice / QB fields ───────────────────────────────────────────────────
    qb_invoice_number: text("qb_invoice_number"),
    // QB invoice number — entered manually until Phase 2 QB integration
    invoice_paid_date: date("invoice_paid_date"),
    // Date customer paid the invoice — set by Accounting, triggers commission payout
    commission_paid_date: date("commission_paid_date"),
    // Friday payroll date when commission was paid to salesperson — set from /commission page
    qb_synced_at: timestamp("qb_synced_at", { withTimezone: true }),
    // Stamped by QB integration (Phase 2) after successful push/pull — null until then

    commission_status: text("commission_status")
      .notNull()
      .default("Not Eligible"),
    // See COMMISSION_STATUSES constant above.

    sales_order_number: text("sales_order_number"),

    is_blind_shipment: boolean("is_blind_shipment").notNull().default(false),
    is_revised: boolean("is_revised").notNull().default(false),
    checklist: jsonb("checklist"),
    // [{ label, done }] — copied from vendor checklist_template on order creation

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("orders_customer_id_idx").on(t.customer_id),
    index("orders_status_idx").on(t.status),
    index("orders_ship_date_idx").on(t.ship_date),
    index("orders_invoice_payment_status_idx").on(t.invoice_payment_status),
  ],
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

// ─── product_weights ──────────────────────────────────────────────────────────

export const product_weights = pgTable("product_weights", {
  id: uuid("id").primaryKey().defaultRandom(),
  product_name: text("product_name").notNull().unique(),
  weight_lbs: numeric("weight_lbs", { precision: 6, scale: 1 }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProductWeight = typeof product_weights.$inferSelect;
export type NewProductWeight = typeof product_weights.$inferInsert;

// ─── order_type_configs ───────────────────────────────────────────────────────
// Configurable list of order types with commission eligibility settings.
// Runtime source of truth for order type dropdowns — ORDER_TYPES constant is
// TypeScript type-safety only.

export const order_type_configs = pgTable("order_type_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  order_type: text("order_type").notNull().unique(),
  is_commission_eligible: boolean("is_commission_eligible").notNull().default(false),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OrderTypeConfig = typeof order_type_configs.$inferSelect;
export type NewOrderTypeConfig = typeof order_type_configs.$inferInsert;

// ─── order_split_loads ────────────────────────────────────────────────────────
// Every order has at least one split load row. Use multiple rows for split-load
// scenarios (multiple vendors/loads on one order).

export const order_split_loads = pgTable(
  "order_split_loads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    description: text("description"),
    // CSR convention: use "|" to separate product specs. BOL uses text before first "|".
    // Example: "275 Gal Washout IBC | Valve-ANY QD | Lid-ANY NON-VENTED"
    part_number: text("part_number"),
    qty: numeric("qty", { precision: 10, scale: 2 }),
    buy: numeric("buy", { precision: 10, scale: 2 }),
    sell: numeric("sell", { precision: 10, scale: 2 }),
    bottle_cost: numeric("bottle_cost", { precision: 10, scale: 2 }),
    bottle_qty: numeric("bottle_qty", { precision: 10, scale: 2 }),
    mph_freight_bottles: numeric("mph_freight_bottles", {
      precision: 10,
      scale: 2,
    }),
    order_number_override: text("order_number_override"),

    customer_po: text("customer_po"),
    // Per-load Customer PO — overrides order-level customer_po when set
    order_type: text("order_type"),
    // Per-load Order Type — commission eligibility determined by order_type_configs.is_commission_eligible lookup, not keyword matching
    ship_date: date("ship_date"),
    wanted_date: date("wanted_date"),
    commission_status: text("commission_status").default("Not Eligible"),
    // Per-load commission status — see COMMISSION_STATUSES
    commission_paid_date: date("commission_paid_date"),
    // Stamped per load when commission is marked paid

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("order_split_loads_order_id_idx").on(t.order_id)],
);

export type OrderSplitLoad = typeof order_split_loads.$inferSelect;
export type NewOrderSplitLoad = typeof order_split_loads.$inferInsert;

// ─── bills_of_lading ──────────────────────────────────────────────────────────

export const bills_of_lading = pgTable(
  "bills_of_lading",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    bol_number: text("bol_number"),
    carrier: text("carrier"),
    ship_from: jsonb("ship_from"),
    // { name, street, city, state, zip }
    ship_to: jsonb("ship_to"),
    // { name, street, city, state, zip }
    pickup_date: date("pickup_date"),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("bills_of_lading_order_id_idx").on(t.order_id)],
);

export type BillOfLading = typeof bills_of_lading.$inferSelect;
export type NewBillOfLading = typeof bills_of_lading.$inferInsert;

// ─── company_settings ─────────────────────────────────────────────────────────
// Singleton row — MPH United company profile.

export const company_settings = pgTable("company_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  legal_name: text("legal_name"),
  address: jsonb("address"),
  email: text("email"),
  phone: text("phone"),
  logo_url: text("logo_url"),
  // ── Schedule email distribution ───────────────────────────────────────────
  admin_schedule_recipients: jsonb("admin_schedule_recipients"),
  // [{ name, email }] — internal CSRs/owners who receive the admin schedule
  frontline_schedule_contacts: jsonb("frontline_schedule_contacts"),
  // [{ name, email }] — Frontline carrier contacts who receive the Frontline schedule
  // ── Phase 2 (QuickBooks) ──────────────────────────────────────────────────
  qbo_realm_id: text("qbo_realm_id"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CompanySettings = typeof company_settings.$inferSelect;
export type NewCompanySettings = typeof company_settings.$inferInsert;

// ─── global_email_contacts ─────────────────────────────────────────────────────
// Global directory of email contacts. Used for autocomplete on order form
// customer_contacts (CONFIRMATION) and bill_to_contacts (BILL_TO) fields.
// email is unique — one record per address. type controls which fields it surfaces in.

export const global_email_contacts = pgTable("global_email_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  company: text("company"),
  type: globalEmailContactTypeEnum("type").notNull().default("BOTH"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GlobalEmailContact = typeof global_email_contacts.$inferSelect;
export type NewGlobalEmailContact = typeof global_email_contacts.$inferInsert;

// ─── dropdown_configs ─────────────────────────────────────────────────────────

export const dropdown_configs = pgTable("dropdown_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull().unique(),
  // type values: 'STATUS' | 'CARRIER' | 'PAYMENT_TERMS' | 'ORDER_TYPE'
  values: jsonb("values").notNull().default([]),
  // string[]
  meta: jsonb("meta"),
  // nullable — { [label: string]: { color: string } } — per-label badge colors (ORDER_STATUS and CARRIER seeded with defaults)
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type DropdownConfig = typeof dropdown_configs.$inferSelect;
export type NewDropdownConfig = typeof dropdown_configs.$inferInsert;

// ─── recycling_orders ─────────────────────────────────────────────────────────

export const recycling_orders = pgTable(
  "recycling_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_number: text("order_number").notNull().unique(),
    order_date: date("order_date"),
    order_type: text("order_type"),

    customer_id: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    vendor_id: uuid("vendor_id").references(() => vendors.id),
    salesperson_id: uuid("salesperson_id").references(() => users.id),
    csr_id: uuid("csr_id").references(() => users.id),

    status: text("status").notNull().default("Acknowledged Order"),
    // See RECYCLING_STATUSES constant above.

    customer_po: text("customer_po"),

    pick_up_date: date("pick_up_date"),
    delivery_date: date("delivery_date"),

    ship_from: jsonb("ship_from"),
    // { name, street, city, state, zip } — drum orders (customer pickup location)
    ship_to: jsonb("ship_to"),
    // { name, street, city, state, zip }
    bill_to: jsonb("bill_to"),
    // { name, street, city, state, zip }
    customer_contacts: jsonb("customer_contacts"),
    // [{ name, email }]

    freight_carrier: text("freight_carrier"),
    freight_cost: numeric("freight_cost", { precision: 10, scale: 2 }),
    freight_to_customer: numeric("freight_to_customer", {
      precision: 10,
      scale: 2,
    }),
    freight_credit_amount: numeric("freight_credit_amount", {
      precision: 10,
      scale: 2,
    }),
    additional_costs: numeric("additional_costs", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),

    invoice_status: text("invoice_status").default("No Charge"),
    // See RECYCLING_INVOICE_STATUSES constant above.
    invoice_customer_amount: numeric("invoice_customer_amount", {
      precision: 10,
      scale: 2,
    }),
    invoice_payment_status: text("invoice_payment_status")
      .notNull()
      .default("Not Invoiced"),
    // See INVOICE_PAYMENT_STATUSES constant above.

    terms: text("terms"),
    // See TERMS_VALUES constant above.
    bol_number: text("bol_number"),
    po_notes: text("po_notes"),
    misc_notes: text("misc_notes"),

    flag: boolean("flag").notNull().default(false),
    checklist: jsonb("checklist"),
    // [{ label, done }]
    commission_status: text("commission_status")
      .notNull()
      .default("Not Eligible"),
    // See COMMISSION_STATUSES constant above.

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("recycling_orders_customer_id_idx").on(t.customer_id),
    index("recycling_orders_status_idx").on(t.status),
    index("recycling_orders_pick_up_date_idx").on(t.pick_up_date),
  ],
);

export type RecyclingOrder = typeof recycling_orders.$inferSelect;
export type NewRecyclingOrder = typeof recycling_orders.$inferInsert;

// ─── audit_logs ───────────────────────────────────────────────────────────────

export const audit_logs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").references(() => users.id),
    table_name: text("table_name").notNull(),
    record_id: uuid("record_id").notNull(),
    action: text("action").notNull(),
    // 'INSERT' | 'UPDATE' | 'DELETE'
    old_value: jsonb("old_value"),
    new_value: jsonb("new_value"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_table_record_idx").on(t.table_name, t.record_id),
    index("audit_logs_user_id_idx").on(t.user_id),
  ],
);

export type AuditLog = typeof audit_logs.$inferSelect;
export type NewAuditLog = typeof audit_logs.$inferInsert;

// ─── credit_memos ─────────────────────────────────────────────────────────────

export const credit_memos = pgTable("credit_memos", {
  id: uuid("id").primaryKey().defaultRandom(),
  credit_number: text("credit_number"),
  credit_date: date("credit_date").notNull(),
  customer_id: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  notes: text("notes"),
  status: text("status").notNull().default("Draft"),
  // 'Draft' | 'Final'
  created_by: uuid("created_by").references(() => users.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CreditMemo = typeof credit_memos.$inferSelect;
export type NewCreditMemo = typeof credit_memos.$inferInsert;

// ─── credit_memo_line_items ───────────────────────────────────────────────────

export const credit_memo_line_items = pgTable("credit_memo_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  credit_memo_id: uuid("credit_memo_id")
    .notNull()
    .references(() => credit_memos.id, { onDelete: "cascade" }),
  activity_type: text("activity_type"),
  description: text("description"),
  qty: numeric("qty", { precision: 10, scale: 2 }),
  rate: numeric("rate", { precision: 10, scale: 2 }),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CreditMemoLineItem = typeof credit_memo_line_items.$inferSelect;
export type NewCreditMemoLineItem = typeof credit_memo_line_items.$inferInsert;
