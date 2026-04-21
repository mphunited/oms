# MPH United OMS — Product Requirements Document

**Read this file at the start of every Claude Code session, after AGENTS.md.**
This document is the authoritative source for what to build, why, and what not to build.
When this file conflicts with any other file except AGENTS.md, this file wins.

---

## 1. What This Product Is

A custom Order Management System (OMS) for MPH United — a single-company internal tool
replacing a shared Excel workbook. MPH United is an IBC (Intermediate Bulk Container)
brokerage based in Fairhope, Alabama. They source IBCs from vendor plants and arrange
direct shipment to customers, managing all coordination, documentation, pricing, and
invoicing. They do not manufacture or warehouse product.

**~10 remote users. 150–500 orders/month. Single tenant. MPH United only.**

---

## 2. The Team

| Person | Role in App | Notes |
|--------|-------------|-------|
| Jack Schlaack | Admin / IT Lead | Builds the app using Claude Code. Not a professional developer. |
| Keith Ferrell | CSR & Admin | Will use the app. Will eventually contribute to building it. Currently unavailable. |
| Christina Bayne | CSR / General Manager | Primary CSR user. Early tester target. |
| Jordan Mannering | CSR | CSR user. |
| Gracie Medley | Accounting & CSR | Accounting & CSR user. |
| Renee Sauvageau | Salesperson | Commission report user. Sees only her own orders. |
| Jennifer Wilkes | Salesperson | Sees only her own orders. |
| Larry Mitchum | Salesperson | Sees only his own orders. |
| Mike Harding | Salesperson / Owner | Sees everything. |
| David Harding | CFO / Owner | Sees everything |
| Peter Mannering | Accounting / Controller | Accounting user.| 
| Matt Cozik | CSR | CSR for Recycling Orders | 
| Suzanne Ridenour | CSR | CSR for Empties | 

---

## 3. Technology Stack (All Decisions Final)

| Layer | Technology |
|-------|------------|
| Language | TypeScript (full stack) |
| Framework | Next.js 16 |
| Database | Supabase (managed PostgreSQL + auth + storage) |
| ORM | Drizzle ORM — Prisma was removed, do not re-add it |
| Hosting | Vercel Pro (Jack's seat) |
| UI | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| PDFs | @react-pdf/renderer |
| Auth | Supabase Auth + Microsoft Entra SSO |
| Theme | next-themes (light/dark toggle) |
| Repository | github.com/mphunited/oms |
| Editor | VS Code + Claude Code |

**Do NOT introduce new dependencies without a clear reason. Do NOT add Prisma.**

---

## 4. Architecture Rules (Non-Negotiable)

1. **No company_id columns anywhere.** Single tenant. No companies table. No company_members table.
2. **No RLS policies.** All DB access through server-side API routes using service role key.
3. **Supabase anon key is used only for auth** (sign-in and session validation). All business data queries use Drizzle via DATABASE_URL (server-only). Never expose DATABASE_URL to the browser.
4. **salesperson_id and csr_id are UUID FKs to the users table.** They are NOT text dropdowns.
5. **order_split_loads is the universal line items table.** Every order has at least one row. Pricing lives here, not on orders.
6. **Pricing fields (buy, sell, qty, description, part_number, bottle_cost, bottle_qty, mph_freight_bottles) live on order_split_loads — NOT on orders.**
7. **Do NOT reference a table called order_line_items.** It does not exist.
8. **invoice_payment_status lives on orders.** Not derived from a separate invoices table.
9. **Transaction Pooler only** — port 6543. No DIRECT_URL. No Session Pooler.
10. **Next.js 16 runtime declaration required** for any API route using @react-pdf/renderer: `export const runtime = 'nodejs'`

---

## 5. Database Schema

Schema file: `src/lib/db/schema.ts` — always read before writing queries.
All tables are in Supabase. Migrations managed via Drizzle in `drizzle/`.

### Tables

| Table | Purpose |
|-------|---------|
| users | Employee accounts synced from Entra SSO |
| customers | Customer profiles |
| vendors | Vendor profiles |
| orders | Order header records — NO pricing fields |
| order_split_loads | Line items — ALL pricing lives here |
| recycling_orders | Separate table for recycling orders (different schema) |
| bills_of_lading | BOL records linked to orders |
| company_settings | MPH United singleton row |
| dropdown_configs | Configurable dropdown lists |
| audit_logs | Immutable change log |

### orders table — key fields
id, order_number (text, unique), order_date, order_type, customer_id, vendor_id,
salesperson_id, csr_id, status, customer_po, freight_cost, freight_to_customer,
additional_costs, freight_carrier, ship_date, wanted_date, ship_to (jsonb), bill_to (jsonb),
customer_contacts (jsonb — [{name, email}], extract emails directly for Outlook deeplinks), terms, appointment_time, appointment_notes,
po_notes, freight_invoice_notes, shipper_notes, misc_notes, flag, is_blind_shipment,
is_revised, invoice_payment_status, commission_status, qb_invoice_number,
checklist (jsonb), created_at, updated_at

### order_split_loads — key fields
id, order_id (FK→orders), description, part_number, qty, buy, sell,
bottle_cost, bottle_qty, mph_freight_bottles, order_number_override, created_at

### vendors table — key fields
id, name, is_active, address (jsonb: {street, city, state, zip}), notes, lead_contact,
dock_info (text — dock hours, carrier contact instructions),
contacts (jsonb array — general contacts),
po_contacts (jsonb array — PO email recipients),
bol_contacts (jsonb array — BOL email recipients, different from PO),
invoice_contacts (jsonb array — invoice recipients, Phase 2 but schema now),
checklist_template (jsonb array — default action items copied to new orders),
created_at

### customers table — key fields
id, name, payment_terms, is_active,
ship_to (jsonb: {street, city, state, zip} — default, overridden per order),
bill_to (jsonb),
contacts (jsonb array — {name, email, phone_office, phone_cell, role, is_primary, notes}),
created_at

### Contact object shape

**Customer contacts** (full shape):
```json
{ "name": "Isabel Martinez", "email": "isabel@acme.com", "phone_office": "832-721-3423", "phone_cell": "832-555-0101", "role": "Purchasing", "is_primary": true, "notes": "" }
```

**Vendor contacts** (simplified shape — po_contacts, bol_contacts, invoice_contacts, general contacts):
```json
{ "name": "Isabel Martinez", "email": "isabel@vendor.com", "phone": "832-721-3423", "is_primary": true }
```

### Address JSONB shape (ship_to, bill_to on orders)
```json
{ "name": "", "street": "", "city": "", "state": "", "zip": "", "phone": "", "shipping_notes": "" }
```
shipping_notes is free text for dock hours, contact titles, extra phones, appointment instructions.

--- 

## 6. Order Number Format

**Format: `[Initials]-MPH[Number]`** — e.g., `CB-MPH15001`

- Initials = the authenticated user's initials at time of order creation
- Number = auto-incrementing integer from a Postgres sequence, starting at ~12127
- Stored as text in order_number column
- The sequence is managed via: `SELECT nextval('order_number_seq')`
- **Do NOT use `MAX(order_number) + 1`** — race condition risk

Sequence setup SQL (already applied to Supabase):
```sql
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 12127;
```

---

## 7. Margin Formula

Calculate across ALL order_split_loads rows for the order:

```
Profit =
  SUM per line: (sell - buy) × qty
  + freight_to_customer                    [order level]
  - freight_cost                           [order level]
  - SUM per line: bottle_cost × bottle_qty
  - SUM per line: (mph_freight_bottles / 90) × bottle_qty
  - SUM commission-eligible units × $3
  - additional_costs                       [order level]

Margin % = Profit ÷ (SUM(sell × qty) + freight_to_customer)
Red threshold: Margin % < 8%
```

Commission deduction applies to order types whose name contains any of these keywords:
`New IBC`, `Bottle`, `Rebottle`, `Washout`, `Wash & Return`.
Match is keyword-based (substring), not an exact type list.

---

## 8. Standard Order Statuses

Pending | Waiting On Vendor To Confirm | Waiting To Confirm To Customer |
Confirmed To Customer | Rinse And Return Stage | Sent Order To Carrier |
Ready To Ship | Ready To Invoice | Complete | Cancelled

---

## 9. Order Types

135 Gal New IBC | 275 Gal Bottle | 275 Gal New IBC | 275 Gal Rebottle IBC |
275 Gal Washout IBC | 275 Gal Wash & Return Program | 330 Gal Bottle |
330 Gal New IBC | 330 Gal Rebottle IBC | 330 Gal Wash & Return Program |
330 Gal Washout IBC | 55 Gal Drums | Other — Parts & Supplies

Commission eligibility is keyword-based: any type containing `New IBC`, `Bottle`,
`Rebottle`, `Washout`, or `Wash & Return` is eligible.

---

## 10. User Roles

ADMIN | CSR | SALES | ACCOUNTING | 

Role-based access rules:
- SALES: sees only their own orders and their personal commission/dashboard
- CSR: full order CRUD, POs, BOLs, schedules, customers, vendors
- ADMIN: everything including financial snapshots and user management
- ACCOUNTING: invoice management, payment tracking, commission reports
- Role is enforced as a PostgreSQL enum (user_role) in the database.
- Default role for new users: CSR
- Note: SALESPERSON and WAREHOUSE were considered but not implemented.

---

## 11. Email Pattern

**All email in Phase 1 uses Outlook Web deeplinks — NOT mailto: links.**
Reason: mailto: breaks on Mac. Deeplinks work on both Mac and PC.

```
https://outlook.office.com/mail/deeplink/compose?to=...&cc=...&subject=...&body=...
```

- **PO emails to vendors:** To = vendor's po_contacts (primary first), CC = remaining po_contacts + orders@mphunited.com
- **BOL emails to vendors:** To = vendor's bol_contacts (primary first), CC = remaining bol_contacts. orders@mphunited.com is NOT CC'd on BOLs.
- **Customer confirmations:** To = order's customer_contacts field (jsonb [{name, email}], extract emails directly from array)
- **Invoice emails:** To = customer invoice contacts. orders@mphunited.com CC'd on invoices (Phase 2).
- **Weekly schedules:** Open in Outlook Web button on the schedule generation screen.

---

## 12. Document Generation

### Purchase Order (PO)
- Generated on demand from order + split_loads data. No separate DB record.
- API route: `GET /api/orders/[orderId]/po-pdf`
- Must declare: `export const runtime = 'nodejs'`
- The PO shows: MPH header, order number, date, REVISED badge (when is_revised=true),
  vendor name/address, ship-to + customer name (hidden when is_blind_shipment=true),
  customer PO, required ship date (in red), freight carrier, appointment time,
  line items (description, P/N, qty, unit price, total), order total, PO notes, signature lines.
- **Buy price IS shown on the PO.** Vendors see the price MPH is paying them.
- Blind shipment: hides customer identity and ship-to from the PO document entirely.
- Revised PO: displays a "REVISED" indicator prominently at the top.

### Bill of Lading (BOL)
- BOL records stored in bills_of_lading table, linked to order.
- Whether MPH creates the BOL is determined per vendor (some vendors create their own).
- BOL email contacts are separate from PO contacts (configured on vendor record).

### Weekly Schedules
Two types, both generated as PDFs from the schedules page:

**Admin/Owner Schedule (internal):**
Columns: Vendor, Salesperson/CSR, MPH PO, Customer PO, Description, Qty, Ship Date,
Appt. Time, P/N, Customer, Freight, Ship To, Buy, PO Notes.
Grouped by vendor. All active orders for the week. Includes financial data.

**Vendor/Frontline Schedule (external):**
Columns: Vendor, Salesperson/CSR, MPH PO, Customer PO, Description, Qty, Ship Date,
Appt. Time, Customer, Freight, Ship To, PO Notes. NO pricing.
One schedule per vendor showing only their orders.
Frontline (carrier) gets a schedule showing ALL orders they are hauling across all vendors.

Schedule distribution logic:
- Each vendor receives orders shipping FROM their plant only.
- Frontline receives all orders where freight carrier = "Frontline" across all vendors.
- RRG receives their orders plus inbound stock orders destined for their plant.
- Both schedule types have: date range selector (default Mon–Fri current week), total shipment count, Open in Outlook Web button.

---

## 13. CSR Order Checklists

Each order can have a checklist of action items the CSR must complete.

**How it works:**
- Vendors have a `checklist_template` jsonb array defining their default steps.
- When a new order is created for a vendor, the template is copied to the order's `checklist` column.
- Each checklist item: `{ "label": "Send order to carrier", "done": false }`
- CSRs can mark steps done, add custom steps, or remove steps per order.
- Not all vendors have a checklist template — template may be empty.

**Known vendor checklists:**
- Alliance Hillsboro: 6 fixed steps (Create SO in QB, Add to Alliance Sheet, Add PO to QB, Kanban to Alliance, Add to MPH Stock if stock order, BOL to vendor)
- United Container: 1–3 steps depending on order (BOL to vendor, optionally stock sheet updates)
- Most other vendors: 1–3 steps (Send confirmation, Send order to carrier, BOL to vendor)

---

## 14. Recycling Orders

Recycling orders are a **separate section** of the app (`/recycling`). They share
customers, vendors, and users tables but have their own schema, routes, and status workflow.

### Why separate
Different financial structure (credits from vendors, not just costs), different date fields
(Pick Up Date, Delivery Date vs Ship Date/Wanted Date), different statuses, different
document requirements.

### Recycling Order Types
- **IBC Recycling:** Empty IBCs picked up from customer, delivered to vendor for processing.
  Financial flow may include a freight credit back from vendor (e.g., RRG credits MPH freight).
- **Drum Recycling:** Drums picked up from customer, delivered to Coastal Container Services.
  MPH receives payment from customer to take drums, then pays vendor to recycle.
  Requires a Ship From field (pickup location) not present on regular orders.

### Recycling Vendors
RRG (Rural Recycling Grinding) — Stanwood, IA
STS Superior Tote Solutions — Greenwood/Summitville, IN
GPC Great Plains Container — Garden City, KS
SEC SouthEast Container — Cleveland, MS
UCG United Container Group — Hillsboro, TX
Coastal Container Services — drums only

### Recycling Order Statuses
Acknowledged Order | PO Request To Accounting | Waiting On Vendor To Confirm |
Credit Sent In | Confirmed To Customer | Waiting For Customer To Confirm |
Ready To Pickup | Picked Up | Sent Order To Carrier | Ready To Ship |
Ready To Invoice | Complete | Canceled

### Additional Recycling Fields (beyond standard)
- pick_up_date, delivery_date
- ship_from (jsonb — customer pickup location, drum orders)
- invoice_status: 'Credit' | 'Invoice' | 'No Charge'
- invoice_customer_amount (numeric)
- freight_credit_amount (numeric — credit received from vendor)
- bol_number (text — tracked directly on recycling order)

---

## 15. Ongoing Orders Table — Column Specification

Default visible columns (in order):
Flag | MPH PO | Status | Customer | Customer PO | Description | Qty | Ship Date |
Wanted Date | Vendor | Buy | Sell | Ship To | Freight | Actions

Rules:
- Description has compact/full toggle
- Flag column shows flag icon; clickable to toggle; Flag column: lucide Flag icon, gold filled when true, gray outline when false.
- Actions column: Edit, Duplicate, View PO, View BOL (when applicable)
- Status is inline-editable
- Table supports multi-select for bulk actions (bulk status update, bulk flag)

Filters available:
- Search: order number, customer, vendor, customer PO, description (full text)
- Status: single or multi-select
- Lifecycle: Active (not Complete/Cancelled) | Complete | Cancelled | All
- Customer: multi-select
- Vendor: multi-select
- CSR: multi-select
- Salesperson: multi-select
- Ship date: range
- Invoice payment status
- Commission status
- Flag: flagged only toggle

---

## 16. Repeat Orders / Order Duplication

A "Duplicate Order" button on the order detail page and orders table (per-row action).

**What carries over:**
Customer, vendor, ship-to, bill-to, customer_contacts, freight_carrier, terms,
additional_costs, order_type, salesperson_id, csr_id, all split_loads (description,
part_number, bottle_cost, bottle_qty, mph_freight_bottles — but NOT buy/sell prices
since pricing may have changed), po_notes, freight_invoice_notes, shipper_notes,
misc_notes, is_blind_shipment.

**What resets:**
order_date (today), order_number (new auto-generated), status (Pending), ship_date,
wanted_date, appointment_time, appointment_notes, customer_po, flag (false),
is_revised (false), invoice_payment_status (Not Invoiced), commission_status (auto),
qb_invoice_number, checklist (fresh copy from vendor template), buy/sell prices on lines.

This is the primary mechanism for repeat customer orders where most info stays the same.

---

## 17. Application Routes

| Route | Page | Phase |
|-------|------|-------|
| /auth/callback | OAuth callback handler | Microsoft Entra SSO sign in | 1 — Done |
| /dashboard | Hero stats, status distribution, weekly chart | 1 |
| /orders | Ongoing orders table | 1 — Done |
| /orders/new | New order form | 1 — Built, needs testing |
| /orders/[orderId] | Order detail, edit, PO, BOL, checklist | 1 |
| /recycling | Recycling orders table | 1 |
| /recycling/new | New recycling order form | 1 |
| /recycling/[id] | Recycling order detail and edit | 1 |
| /customers | Customer list | 1 |
| /customers/[customerId] | Customer detail and contacts editor | 1 |
| /vendors | Vendor list | 1 |
| /vendors/[vendorId] | Vendor detail, contacts, checklist template | 1 |
| /schedules | Weekly schedule generation | 1 |
| /commission | Commission report (Renee) | 1 |
| /invoicing | Invoice queue | 1 |
| /financials | Financial reports | 1 (admin only) |
| /settings | Admin settings | 1 |
| /team | User management | 1 |
| /api/orders | POST new order | 1 — Built |
| /api/orders/[orderId]/po-pdf | GET PO PDF | 1 |
| /api/orders/[orderId]/bol-pdf | GET BOL PDF | 1 |
| /api/customers | GET customer list | 1 |
| /api/vendors | GET vendor list | 1 |
| /api/users | GET users list | 1 |
| /api/schedules/admin-pdf | POST admin schedule PDF | 1 |
| /api/schedules/vendor-pdf | POST vendor/Frontline schedule PDF | 1 |

---

## 18. Phase 1 Build Order (Priority Sequence)

### Immediate (unblock the order form)
1. Schema migration — add is_blind_shipment, is_revised to orders (if not present); add po_contacts, bol_contacts, invoice_contacts, dock_info, lead_contact, checklist_template, default_bottle_cost, default_bottle_qty, default_mph_freight_bottles to vendors
2. Fix new-order-form.tsx — add error state on submit failure, add is_blind_shipment field, add is_revised field, add CC to Outlook deeplink where appropriate, default notes section to open
3. ✅ COMPLETE — Test form end-to-end — submit one real order, verify in Supabase. First real order: JS-MPH12129 (275 Gal Bottle, commission_status=Eligible). order_number_seq set to start at 12127.
4. ✅ COMPLETE — Verify /api/customers, /api/vendors, /api/users return real data. All three confirmed returning correct data with auth protection working.

### Core pages
5. ✅ COMPLETE — Customers page — list + detail with contacts editor
6. ✅ COMPLETE — Vendors page — list + detail with PO/BOL contacts sections + checklist template editor
7. ✅ COMPLETE — Order detail/edit page — full edit form + checklist UI + PO PDF button (stubbed) + BOL button (stubbed) + Duplicate button (stubs to /orders/new, no pre-fill yet)

### Documents and schedules
8.  ✅ COMPLETE — PO PDF route — /api/orders/[orderId]/po-pdf
9.  ✅ COMPLETE — BOL PDF route — /api/orders/[orderId]/bol-pdf
10. ✅ COMPLETE — Duplicate order button — /api/orders/duplicate/[orderId]
11. Schedules page — admin schedule PDF + vendor/Frontline schedule PDF

### Recycling
12. Recycling orders table + new recycling order form + detail page

### Reports and admin
13. Commission report page
14. Invoicing queue
15. Admin/settings page (company settings, dropdown config, order number sequence)
16. Dashboard (hero stats, status distribution, weekly chart)
17. Financial snapshot (admin only)

### Data migration
18. Import last 12 months from Excel
19. Team/user management page

---

## 20. Phase 2 Features (Do NOT Build in Phase 1)

- QuickBooks Online integration (OAuth, push invoices/bills, payment sync, commission auto-trigger)
- Invoice PDF generation and emailing
- Direct email via Resend (one-click send, no Outlook)
- Email notifications (order created, status changed, ready to invoice, past due reminders)
- Vendor stock sheet tracking in-app (currently shared Excel files — leave them there for now)
- Alliance Hillsboro collaborative schedule (vendor fills in SO and invoice numbers)
- Financials tab with charts, customer/vendor breakdown, trend analysis
- Audit log UI
- Salesperson margin calculator, quote forms, performance dashboard
- Mobile-responsive optimization
- Forum (internal discussion threads)
- Resources tab (shared links and documents)
- IBC and parts catalog with pictures
- CRM for sales team
- Nightly automated database backup to S3
- App-wide undo/redo

**If anyone asks Claude Code to build any of the above during Phase 1, refuse and explain it is Phase 2.**

---

## 21. Known Issues and Decisions Already Made

| Issue | Decision |
|-------|----------|
| customer_contacts on orders | jsonb [{name, email}]. Extract emails directly from array for Outlook deeplinks. NOT free text. |
| Order number format | [Initials]-MPH[Number]. Uses Postgres sequence, not MAX()+1. |
| Vendor email contacts | Three separate jsonb arrays: po_contacts, bol_contacts, invoice_contacts. |
| BOL CC rule | orders@mphunited.com is NOT CC'd on BOLs. Only on PO and invoice emails. |
| Blind shipment | is_blind_shipment boolean on orders. Hides ship-to and customer from PO document. |
| Revised PO | is_revised boolean on orders. Shows REVISED badge on PO document. |
| Multiple ship-to locations | Not stored separately. Ship-to is per-order. Duplicate order is the repeat-order workflow. |
| Vendor products catalog | Not in Phase 1. CSRs type descriptions manually. |
| Stock sheets | Stay in Excel for Phase 1. Phase 2 or permanent Excel. |
| RLS | No RLS policies anywhere. Single tenant, trusted users. |
| Supabase client | Anon key only used for Supabase Auth (sign-in, session check). All DB queries use Drizzle via server-only DATABASE_URL. |
| Prototype in /reference/ | HTML prototype is UI reference only. It predates the current schema. This PRD and AGENTS.md are authoritative. |
| Recycling orders | Separate section of app, separate DB table, separate routes. Shares customers/vendors/users. |
| CSR checklist | Template on vendor record, copied to order on creation. Each item: {label, done}. CSR can add/remove per order. |
| Bottle fields (bottle_cost, bottle_qty, mph_freight_bottles) on order_split_loads autofill from vendor defaults when the CSR expands the bottle section on a line item. Fields remain editable for exceptions. Vendor record stores three new fields: default_bottle_cost, default_bottle_qty, default_mph_freight_bottles. These are set and updated on the vendor detail page. The margin calculation in the OMS is a secondary accountability check — primary pricing is handled in the quote tool. |
| order_number_seq | Sequence set to 12127 per PRD. First test order was JS-MPH12129 due to two failed attempts during initial testing consuming 12127 and 12128. Sequence is working correctly. |
| .env vs .env.local | drizzle.config.ts loads .env.local explicitly via dotenv. Never put real credentials in .env — it is a blank template only. Real values go in .env.local which is gitignored. |
| Duplicate order button | Redirects to /orders/new without pre-fill. Full duplicate logic per Section 16 is a follow-up task. |
| LF/CRLF line endings | Git warns on src/app/api/orders/route.ts. Harmless on Windows. Do not run git config --global core.autocrlf to fix — leave as is. |
| BOL ship-from | Always vendor → customer (standard). Reverse BOLs (customer → vendor) 
  are rare and handled by manually editing the downloaded PDF. No toggle built. |
| BOL description extraction | bolDescription() helper strips "SPLIT LOAD n — " prefix 
  and takes everything before first "|". CSRs must use "|" to separate product specs 
  in description field. Weights looked up from product_weights table by matching 
  extracted name. Silent fallback to full description if no pipe present. |
| BOL description alternative | bol_description dropdown on order_split_loads is the 
  controlled alternative. Not built in Phase 1. If pipe convention proves unreliable, 
  migrate to this approach. |
| Sales order number | sales_order_number text column added to orders. Shown on PO as 
  "SALES ORDER #". Required by at least one vendor. |
| Product weights | product_weights table seeded with 17 canonical BOL product names 
  and weights. Editable via future admin UI. |
| BOL DB record | No bills_of_lading record created on BOL generation. Generated on 
  demand only, same pattern as PO. bills_of_lading table remains in schema for 
  future use. |
| PO logo | mph-logo.png committed to /public. logo_url in company_settings set to 
  https://oms-jade.vercel.app/mph-logo.png. SVG cannot be used — @react-pdf/renderer 
  requires PNG or JPG. |
| Outlook schedule email attachment | Outlook Web deeplinks cannot attach files 
  programmatically. The Open in Outlook button pre-populates recipients, subject, 
  and a text body including the schedule summary. The PDF must be attached manually. |
| commission_paid_date | Set in bulk from /commission page by ADMIN or ACCOUNTING. 
  Not editable on the order form. Represents the Friday payroll date. |
| invoice_paid_date | Set on the order edit form by Accounting. Date the customer 
  paid the invoice. Triggers commission payout eligibility. |
| Date display format | MM/DD/YYYY throughout the UI. Database stores YYYY-MM-DD. 
  Display formatting only — never change the stored value. |
| /register route | Public register route exists and should be removed — 
  single-tenant app, user management is admin-only via /team. Phase 1 cleanup item. |
| schedule_contacts on vendors | jsonb array [{name, email, is_primary}]. Must be 
  seeded per vendor in Supabase Studio before schedule emails pre-populate correctly. |
| frontline_schedule_contacts and admin_schedule_recipients | jsonb arrays on 
  company_settings. Must be seeded in Supabase Studio before use. |
---

## 22. What the Current Prototype Is NOT

The HTML prototype in `reference/` was built before the current schema. It uses different
field names, different data structures, and different logic. Specifically:

- It does NOT have the correct order_split_loads structure
- It uses flat order records without line items
- It generates order numbers in a different format
- Its vendor data is hardcoded, not from the database
- Its customer data is hardcoded, not from the database

Use it only as a visual reference for layout and UI patterns. Never use it as a
data model reference or a logic reference.

---

## 23. Development Workflow

- Jack builds alone currently. Keith will return to the project eventually.
- Claude Code creates git worktrees under `.claude/worktrees/` for each task.
- **After every task Claude Code must:** commit all changes, merge branch to main, push to origin.
- **Never leave work on a claude/ branch without merging.**
- Verify with `git log --oneline -5` after every task. If the commit is not on main, it was not merged.
- `.gitignore` must exclude worktree `package-lock.json` files.

When Keith eventually resumes:
- He must read AGENTS.md and PRD.md before starting any session.
- He should pull from main before starting work to get Jack's latest changes.
- Feature work should be split by route/feature to avoid merge conflicts.
- Context7 MCP should be used for looking up current Next.js, Drizzle, and shadcn/ui docs.

---

## 24. File Structure Reference

```
src/lib/db/schema.ts          — Drizzle schema, always read before writing queries
src/lib/db/index.ts           — Drizzle client
src/app/(dashboard)/          — all authenticated pages
src/app/(auth)/login/         — login page
src/proxy.ts                  — session handler (Next.js 16 middleware equivalent) 
src/app/api/                  — all API routes
src/components/layout/        — sidebar, header, nav
src/components/orders/        — order components including new-order-form.tsx
src/components/recycling/     — recycling order components
src/config/nav.ts             — navigation items
reference/                    — HTML prototype (UI reference only, not a spec)
AGENTS.md                     — technical conventions, read at every session
PRD.md                        — this file, product requirements, read at every session
drizzle/                      — migration SQL files and snapshots
```

---

## 25. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          (auth only, never for DB queries)
SUPABASE_SERVICE_ROLE_KEY=eyJ...              (admin operations if needed)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

DATABASE_URL must NOT be prefixed with NEXT_PUBLIC_. It is server-only.

---

*Last updated: April 2026 — customer_contacts confirmed jsonb; customers.contacts shape updated to full shape; vendor bottle default fields added to schema; Phase 1 migration list updated.*
*This document should be updated whenever significant decisions are made or scope changes.*
*Retire: New_MPH_Order_Management_App.docx and MPH-OMS-HANDOFF.md once this file is committed to the repo.*
