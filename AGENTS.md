# MPH United OMS — Agent Conventions

Read this file completely at the start of every session before writing any code.

---

## NEXT.JS VERSION WARNING

This project uses Next.js 16. This version has breaking changes — APIs, conventions, and
file structure differ from training data. Before writing any Next.js-specific code, check
`node_modules/next/dist/docs/` for the relevant guide. Heed all deprecation notices.
Use Context7 MCP to look up current Next.js, Drizzle, shadcn/ui, and Supabase API docs
before implementing anything non-trivial.

---

## WHAT THIS PROJECT IS

A custom Order Management System (OMS) for MPH United — a single-company internal tool
replacing a shared Excel workbook. ~10 remote users. 150–500 orders/month.

**This is single-tenant. MPH United only. No multi-tenant architecture.**

---

## CRITICAL ARCHITECTURE RULES

1. **NO company_id columns anywhere.** No companies table. No company_members table.
   If you are about to add company_id to anything, stop and re-read this file.

2. **NO RLS policies.** Single company, trusted internal employees.

3. **salesperson_id and csr_id are UUID FKs to the users table.** They are NOT text
   dropdowns. Always join to users to get names.

4. **order_split_loads is the universal line items table.** Every order has at least one
   row in order_split_loads. Single-product orders have exactly one row. Split loads have
   2–4 rows. Freight lives on the orders header, not on lines.

5. **Pricing fields (buy, sell, qty, description, part_number, bottle_cost, bottle_qty,
   mph_freight_bottles) live on order_split_loads — NOT on the orders table.**
   The orders table holds header data only: customer, vendor, dates, freight, addresses,
   status, notes, flags.

6. **Do NOT reference a table called order_line_items.** It does not exist.

7. **invoice_payment_status lives on the orders table.** It is NOT derived from a
   separate invoices table. Values: 'Not Invoiced' | 'Invoiced' | 'Paid'

---

## TECHNOLOGY STACK

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Language     | TypeScript (full stack)                         |
| Framework    | Next.js 16 (React frontend + API routes)        |
| Database     | Supabase (managed PostgreSQL)                   |
| ORM          | Drizzle ORM — Prisma was removed, do not add it |
| Hosting      | Vercel                                          |
| UI           | shadcn/ui + Tailwind CSS                        |
| Charts       | Recharts                                        |
| PDFs         | @react-pdf/renderer                             |
| Auth         | Supabase Auth + Microsoft Entra SSO             |
| Repository   | github.com/mphunited/oms                        |

---

## DATABASE CONNECTION

Use Transaction Pooler only — port 6543.
No DIRECT_URL needed. No Session Pooler.

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

---

## SCHEMA OVERVIEW

Tables: users, customers, vendors, orders, order_split_loads, bills_of_lading,
        company_settings, dropdown_configs, audit_logs

Schema file: src/lib/db/schema.ts — this is the source of truth. Always read it before
writing queries or API routes.

### order_split_loads columns
id, order_id (FK→orders), description, part_number, qty, buy, sell,
bottle_cost, bottle_qty, mph_freight_bottles, order_number_override, created_at

order_number_override is nullable — used only when a line has a different MPH PO
than the parent order.

### orders table — header fields only
id, order_number, order_date, order_type, customer_id, vendor_id, salesperson_id,
csr_id, status, customer_po, freight_cost, freight_to_customer, additional_costs,
freight_carrier, ship_date, wanted_date, ship_to (jsonb), bill_to (jsonb),
customer_contacts (jsonb), terms, appointment_time, appointment_notes, po_notes,
freight_invoice_notes, shipper_notes, misc_notes, flag, invoice_payment_status,
commission_status, qb_invoice_number, created_at, updated_at

### Address JSONB shape (ship_to, bill_to)
{ name, street, city, state, zip, phone, shipping_notes }
shipping_notes is a free-text field for docking hours, contact titles, extra phones, etc.

---

## MARGIN FORMULA

Calculate across all order_split_loads rows for the order:

```
Profit =
  SUM per line: (sell - buy) × qty
  + freight_to_customer                          [order level]
  - freight_cost                                 [order level]
  - SUM per line: bottle_cost × bottle_qty
  - SUM per line: (mph_freight_bottles / 90) × bottle_qty
  - SUM commission-eligible units × $3
  - additional_costs                             [order level]

Profit % = Profit ÷ ( SUM(sell × qty) + freight_to_customer )

Red threshold: Profit % < 8%
```

Commission-eligible order types: Bottle, Rebottle IBC, Washout IBC
NOT eligible: Drums, Parts

---

## ORDER STATUS VALUES

Pending | Waiting On Vendor To Confirm | Waiting To Confirm To Customer |
Confirmed To Customer | Rinse And Return Stage | Sent Order To Carrier |
Ready To Ship | Ready To Invoice | Complete | Cancelled

---

## ORDER TYPE VALUES

Bottle | Rebottle IBC | Washout IBC | Drums | Parts

---

## USER ROLES

ADMIN | CSR | SALESPERSON | ACCOUNTING | WAREHOUSE

---

## EMAIL PATTERN

All email actions use Outlook Web deeplinks — NOT mailto: links (fixes Mac compatibility).

```
https://outlook.office.com/mail/deeplink/compose?to=...&cc=orders@mphunited.com&subject=...&body=...
```

orders@mphunited.com is always CC'd on POs and invoices.

---

## DOCUMENT GENERATION

- Purchase Order (PO): PDF generated from order + lines data. No separate DB table.
- Bill of Lading (BOL): PDF stored in bills_of_lading table.
- Invoice: Phase 2.
- Weekly Schedule (admin): all orders grouped by vendor, includes financial data.
- Frontline Schedule (vendors): no buy price, no freight cost, filterable by vendor.

---

## APPLICATION ROUTES

/login — Entra SSO sign in
/dashboard — redirects to /orders
/orders — ongoing orders table
/orders/new — add new order
/orders/[orderId] — order detail and edit
/customers — customer list
/customers/[customerId] — customer detail
/vendors — vendor list
/vendors/[vendorId] — vendor detail
/financials — financial reports
/invoicing — invoice queue
/settings — admin settings
/team — user management

---

## PHASE BOUNDARIES

Phase 1 (now): All routes above, PO PDF, BOL PDF, Weekly Schedule PDFs, commission
               report, data import from Excel.

Phase 2 (after launch): QuickBooks Online integration, Invoice PDF, Resend email,
                        Forum tab, Resources tab, audit log UI, mobile optimization,
                        salesperson online forms.

Do NOT build Phase 2 features during Phase 1.

---

## FILE STRUCTURE

src/lib/db/schema.ts      — Drizzle schema, source of truth
src/lib/db/index.ts       — Drizzle client
src/app/(dashboard)/      — all authenticated pages
src/app/login/            — login page
src/components/layout/    — sidebar, header, nav
src/config/nav.ts         — navigation items
reference/                — HTML prototype, UI reference only (not a spec)

---

## PROTOTYPE NOTE

The HTML prototype in /reference/ is a UI reference only. It is incomplete and predates
the current schema. This AGENTS.md and MPH-OMS-HANDOFF.md are the authoritative specs.
When the prototype conflicts with this file, follow this file.

---

## COLLABORATION

Jack (IT lead) and Keith (coworker) both use Claude Code on this repo. Work is split by
feature to avoid merge conflicts. Both push/pull from github.com/mphunited/oms.
