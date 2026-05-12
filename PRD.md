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

| Person | Role in App | Permissions (order dropdowns) | Notes |
|--------|-------------|-------------------------------|-------|
| Jack Schlaack | Admin / IT Lead | (none) | Builds and maintains the app using Claude Code and Claude Chat. Not a professional developer. |
| Keith Ferrell | CSR & Admin | CSR | Builds and maintains the app with Jack using Claude Code and Claude Chat. Not a professional developer. Built the initial prototype. |
| Christina Bayne | CSR / General Manager | CSR | Primary CSR user. Early tester target. |
| Jordan Mannering | CSR | CSR | CSR user. |
| Gracie Medley | Accounting & CSR | CSR | Accounting & CSR user. |
| Renee Sauvageau | Salesperson | SALES | Only salesperson that receives commission. Sees only her own orders and can't edit orders. |
| Jennifer Wilkes | Salesperson | SALES | Sees only her own orders and can't edit orders. |
| Larry Mitchum | Salesperson | SALES | Sees only his own orders and can't edit orders. |
| Mike Harding | Salesperson / Owner | SALES | Sees everything. |
| David Harding | CFO / Owner | (none) | Sees everything. |
| Peter Mannering | Accounting / Controller | (none) | Accounting user. |
| Matt Cozik | CSR | CSR | CSR for Recycling Orders. |
| Suzanne Ridenour | CSR | CSR | CSR for Empties. |
| Jack2 (test) | Admin | (none) | Test/dev account (jack2@mphunited.com). |
| Service Account | — | (none) | System service account, no UI access. |

**Commission eligibility note:** `is_commission_eligible = true` for Renee Sauvageau only.
All other users default false. Controls commission report salesperson dropdown and
GET /api/commission API filtering. Distinct from `can_view_commission` (sidebar visibility).
Managed on /team page by ADMIN.

**Permissions field note:** The `permissions` jsonb column on users (default `[]`) controls
which order-form role dropdowns a user appears in, independently of their app access `role`.
Valid values: `"SALES"` | `"CSR"`. A user with `role=ADMIN` may have either or both permissions
to appear in salesperson or CSR dropdowns on the order form.

Current assignments (as of April 23, 2026):
- **SALES permissions:** Mike Harding, Renee Sauvageau, Jennifer Wilkes, Larry Mitchum
- **CSR permissions:** Christina Bayne, Keith Ferrell, Jordan Mannering, Matt Cozik, Suzanne Ridenour, Gracie Medley
- **No permissions:** Jack Schlaack, David Harding, Peter Mannering, Jack2, Service Account

**User onboarding:** New users sign in directly at oms-jade.vercel.app using
their MPH United Microsoft account. No invite flow. The auth trigger creates
their public.users row on first login with role=CSR. Admin configures role
and permissions afterward via /team page.

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
| Charts | Recharts (listed but NOT YET INSTALLED — run `npm install recharts` before use) |
| PDFs | @react-pdf/renderer |
| Auth | Supabase Auth + Microsoft Entra SSO |
| Theme | next-themes (light/dark toggle) |
| Repository | github.com/mphunited/oms |
| Editor | VS Code + Claude Code |

**Do NOT introduce new dependencies without a clear reason. Do NOT add Prisma.**

**DESIGN.md** in the project root defines the full visual design system (Vercel-based with MPH United adaptations). Section 10 contains all OMS-specific token overrides. All UI work must follow DESIGN.md. For OMS-specific patterns, Section 10 takes precedence over the base Vercel spec.

---

## 4. Architecture Rules (Non-Negotiable)

1. **No company_id columns anywhere.** Single tenant. No companies table. No company_members table.
2. **RLS is enabled on all tables with service_role-only policies.** All DB access runs server-side through API routes. Direct public/anon access is blocked at the database level. See Section 19 for full security posture. When new tables are created via migration, RLS must be manually enabled — run `ALTER TABLE public.[table] ENABLE ROW LEVEL SECURITY` and add a service_role policy immediately after any DDL migration.
3. **Supabase anon key is used only for auth** (sign-in and session validation). All business data queries use Drizzle via DATABASE_URL (server-only). Never expose DATABASE_URL to the browser.
4. **salesperson_id and csr_id are UUID FKs to the users table.** They are NOT text dropdowns.
5. **order_split_loads is the universal line items table for regular orders.** Every regular order has at least one row. Pricing lives here, not on orders. Exception: recycling_orders has its own qty, buy, sell, description, part_number columns directly on the table — recycling orders do NOT use order_split_loads.
6. **Pricing fields (buy, sell, qty, description, part_number, bottle_cost, bottle_qty, mph_freight_bottles) live on order_split_loads — NOT on orders.** For recycling orders, these fields live directly on recycling_orders.
7. **Do NOT reference a table called order_line_items.** It does not exist.
8. **invoice_payment_status lives on orders and recycling_orders.** Not derived from a separate invoices table.
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
| order_groups | Multi-ship-to order groups (2–4 orders, same vendor, single combined PO) |
| orders | Order header records — NO pricing fields |
| order_split_loads | Line items for regular orders — ALL pricing lives here |
| order_type_configs | Configurable order type list with commission eligibility per type |
| recycling_orders | Recycling orders (IBC and Drum) — pricing fields live directly on this table |
| bills_of_lading | BOL records linked to orders |
| company_settings | MPH United singleton row |
| dropdown_configs | Configurable dropdown lists (one row per type; values is a jsonb string[]) |
| product_weights | Canonical BOL product names and weights for BOL PDF generation |
| global_email_contacts | Global directory of email contacts for order form autocomplete |
| audit_logs | Immutable change log |
| credit_memos | Customer credit memo headers — Draft and Final states |
| credit_memo_line_items | Line items for credit memos — activity type, description, qty, rate, amount |

### users table — key fields
id (UUID, mirrors auth.users), email, name, avatar_url, entra_id, title, phone,
email_signature, role (user_role enum: ADMIN|CSR|ACCOUNTING|SALES), permissions (jsonb,
default [] — array of "SALES"|"CSR" controlling order form dropdown appearance independently
of app role), can_view_commission (boolean), is_commission_eligible (boolean, default false —
controls commission report filtering; currently true for Renee Sauvageau only),
is_active (boolean), created_at

### orders table — key fields
id, order_number (text, unique), order_date, order_type, customer_id, vendor_id,
salesperson_id, csr_id, csr2_id, group_id (nullable FK→order_groups — null on standard orders),
status, customer_po, freight_cost, freight_to_customer, additional_costs,
freight_carrier (text — populated from dropdown_configs CARRIER type),
ship_date, wanted_date, ship_to (jsonb), bill_to (jsonb),
customer_contacts (jsonb — [{name, email, is_primary}], extract emails directly for Graph API drafts),
bill_to_contacts (jsonb — [{name, email}], addable list of billing contacts on the order form),
terms, appointment_time, appointment_notes, po_notes, freight_invoice_notes, shipper_notes,
misc_notes, flag, is_blind_shipment, is_revised, invoice_payment_status, commission_status,
qb_invoice_number, invoice_paid_date (date), commission_paid_date (date),
checklist (jsonb), sales_order_number, created_at, updated_at

### order_groups table — key fields
id, group_po_number (text, unique — minted from nextval('order_number_seq')),
vendor_id (FK→vendors — all orders in group must share this vendor),
notes, created_at, updated_at

### order_split_loads — key fields
id, order_id (FK→orders), description, part_number,
qty (numeric(12,3)), buy (numeric(12,3)), sell (numeric(10,2)),
bottle_cost, bottle_qty, mph_freight_bottles,
order_number_override (text, nullable — per-load MPH PO; auto-generated via nextval() on save),
customer_po (text, nullable — per-load Customer PO, overrides order-level when set),
order_type (text, nullable — per-load Order Type, drives commission eligibility for this load),
ship_date (date, nullable), wanted_date (date, nullable),
commission_status (text, default 'Not Eligible') — values: 'Not Eligible' | 'Eligible' | 'Paid',
commission_paid_date (date, nullable — stamped when commission paid for this load),
created_at, updated_at

### recycling_orders table — key fields
id, order_number (text, unique — same [Initials]-MPH[seq] format as regular orders),
order_date, recycling_type (text, default 'IBC' — 'IBC' | 'Drum'),
customer_id (FK→customers — the IBC/drum SOURCE company; PO recipient),
vendor_id (FK→vendors — the processing/recycling facility; PO destination),
salesperson_id (FK→users), csr_id (FK→users),
status (text, default 'Acknowledged Order' — see RECYCLING_STATUSES),
customer_po, is_blind_shipment (boolean, default false),
freight_carrier, pick_up_date (date — labeled "Ship Date" in UI),
delivery_date (date — IBC only), appointment_notes (text — IBC only, NOT a timestamp),
ship_to (jsonb — IBC pickup/drop-off location), ship_from (jsonb — Drum pickup location),
bill_to (jsonb — Drum billing), customer_contacts (jsonb — Drum confirmation contacts),
freight_cost, freight_to_customer, freight_credit_amount (numeric — IBC only),
additional_costs, invoice_status (text, default 'No Charge'),
invoice_customer_amount, invoice_payment_status (text, default 'Not Invoiced'),
po_contacts (jsonb — [{name, email, role: "to"|"cc"}] — PO email recipients, stored
on the ORDER not on vendor), po_notes, misc_notes, bol_number, flag (boolean),
checklist (jsonb), commission_status, terms,
qty (numeric(10,2)), buy (numeric(10,2)), sell (numeric(10,2)),
description (text), part_number (text),
created_at, updated_at

recycling_orders has qb_invoice_number (text, nullable) — added via migration May 2026.

### vendors table — key fields
id, name, is_active, is_blind_shipment_default (boolean, default false),
address (jsonb: {street, city, state, zip}), notes, lead_contact,
dock_info (text), contacts (jsonb array), po_contacts (jsonb array),
bol_contacts (jsonb array), invoice_contacts (jsonb array), schedule_contacts (jsonb array),
checklist_template (jsonb array — [{label, done}]),
default_load1_qty (numeric(10,2)), default_load1_buy (numeric(12,3)),
default_bottle_cost (numeric(12,3)), default_bottle_qty (numeric(10,2)),
default_mph_freight_bottles (numeric(10,2)),
created_at

### customers table — key fields
id, name, payment_terms, is_active,
ship_to (jsonb: {street, city, state, zip}),
bill_to (jsonb: {street, city, state, zip}),
contacts (jsonb array — {name, email, phone_office, phone_cell, role, is_primary, notes}),
created_at

**Recycling PO address fallback:** When generating a recycling PO PDF, the Vendor block
address uses customer.bill_to; if bill_to is null or empty, falls back to customer.ship_to.

### dropdown_configs — active types
| type | purpose |
|------|---------|
| CARRIER | Freight carrier names. Seeded with 34 carriers. Fetched via GET /api/dropdown-configs?type=CARRIER (returns { type, values, meta }). Used on both regular and recycling order forms. Managed via /settings Carriers section (ADMIN only). |
| ORDER_STATUS | Order status values for inline editing on the orders table. Managed via /settings General section (ADMIN only). ORDER_STATUSES const in schema.ts kept for TypeScript type safety but runtime status values come from DB. |

**RECYCLING_STATUSES are NOT in dropdown_configs.** They are hardcoded in the
RECYCLING_STATUSES constant in schema.ts. Do not add a RECYCLING_STATUS type to dropdown_configs.

**dropdown_configs.meta** — nullable JSONB column on every row.
Shape: `{ [label: string]: { color: string } }`. Stores per-label badge colors.
GET /api/dropdown-configs returns `{ type, values, meta }`. PUT merges meta — never nulls it.

### Contact object shape

**Customer contacts** (full shape):
```json
{ "name": "Isabel Martinez", "email": "isabel@acme.com", "phone_office": "832-721-3423", "phone_cell": "832-555-0101", "role": "Purchasing", "is_primary": true, "notes": "" }
```

**Vendor contacts** (po_contacts, bol_contacts, invoice_contacts, schedule_contacts):
```json
{ "name": "Isabel Martinez", "email": "isabel@vendor.com", "phone": "832-721-3423", "role": "to" }
```
`role: "to"` = primary/To recipient; `role: "cc"` = CC recipient.
Backward-compat: normalizeContacts() treats `is_primary=true` as `role="to"`.
Validation: save blocked if po_contacts or bol_contacts have entries but none with `role="to"`.

**Recycling po_contacts** (on recycling_orders, not on vendor):
```json
{ "name": "Isabel Martinez", "email": "isabel@source-company.com", "role": "to" }
```
Same shape as vendor contacts. Stored on the order. Not synced to vendor.po_contacts.

### Address JSONB shape (ship_to, bill_to on orders)
```json
{ "name": "", "street": "", "street2": "", "city": "", "state": "", "zip": "", "phone_office": "", "phone_ext": "", "phone_cell": "", "email": "", "email2": "", "shipping_notes": "" }
```

---

## 6. Order Number Format

**Format: `[Initials]-MPH[Number]`** — e.g., `CB-MPH15001`

- Initials = the authenticated user's initials at time of order creation
- Number = auto-incrementing integer from a Postgres sequence
- Stored as text in order_number column
- The sequence is shared by regular orders, recycling orders, and order_groups.group_po_number
- The sequence is managed via: `SELECT nextval('order_number_seq')`
- **Do NOT use `MAX(order_number) + 1`** — race condition risk

Sequence setup SQL (already applied to Supabase):
```sql
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 12127;
```

---

## 7. Margin Formula

Applies to regular orders only. Recycling orders have no margin calculation in Phase 1.
Profit =
SUM per line: (sell - buy) × qty

freight_to_customer                    [order level]


freight_cost                           [order level]
SUM per line: bottle_cost × bottle_qty
SUM per line: (mph_freight_bottles / 90) × bottle_qty
SUM commission-eligible units × $3
additional_costs                       [order level]

Margin % = Profit ÷ (SUM(sell × qty) + freight_to_customer)
Red threshold: Margin % < 8%

Commission eligibility is determined by looking up order_split_loads.order_type against
order_type_configs.is_commission_eligible. Do NOT use keyword matching.

---

## 8. Standard Order Statuses

Pending | Waiting On Vendor To Confirm | Waiting To Confirm To Customer |
Confirmed To Customer | Wash & Return Stage | Sent Order To Carrier |
Ready To Ship | Ready To Invoice | Complete | Canceled

---

## 9. Order Types

135 Gal New IBC | 275 Gal New IBC | 330 Gal New IBC |
135 Gal Rebottle IBC | 275 Gal Rebottle IBC | 330 Gal Rebottle IBC |
275 Gal Bottle | 330 Gal Bottle |
135 Gal Washout IBC | 275 Gal Washout IBC | 330 Gal Washout IBC |
275 Gal IBC Wash & Return Program | 330 Gal IBC Wash & Return Program |
275 Gal Empty Washable Bottle |
55 Gal New OH Poly Drum | 55 Gal New TH Poly Drum |
55 Gal Washout OH Poly Drum | 55 Gal Washout TH Poly Drum |
55 Gal New OH Steel Drum | 55 Gal New TH Steel Drum |
20 Liters (5 gal) Jerrycans/Carboys |
Other — Parts & Supplies

Canonical list managed in order_type_configs table. ORDER_TYPES constant in schema.ts
is TypeScript type safety only. Runtime dropdown values fetched from GET /api/order-type-configs.

Commission eligibility is determined per split load by looking up order_split_loads.order_type
against order_type_configs.is_commission_eligible. Do NOT use keyword matching.

---

## 10. User Roles

ADMIN | CSR | SALES | ACCOUNTING

Role-based access rules:
- SALES: sees only their own orders (regular and recycling) and their personal commission/dashboard
- CSR: full order CRUD, POs, BOLs, schedules, customers, vendors, recycling orders
- ADMIN: everything including financial snapshots and user management
- ACCOUNTING: invoice management, payment tracking, commission reports
- Role is enforced as a PostgreSQL enum (user_role) in the database.
- Default role for new users: CSR

---

## 11. Email Pattern

**All email uses Microsoft Graph API to create Outlook drafts with PDF attachments.**
Outlook Web deeplinks are no longer used.

### Infrastructure
- MSAL client: `src/lib/email/msal-client.ts` — singleton `PublicClientApplication`
  - `getMailToken()` acquires token with scopes `Mail.ReadWrite`, `Mail.Send`
  - Silent acquisition first, popup fallback on `InteractionRequiredAuthError`
  - Azure App Registration: clientId `2785bb21-50cc-4e45-a996-c0aec39b13bd`,
    tenantId `3abf2937-e518-43e5-b2a4-456eecfa8b00`
- Graph helpers: `src/lib/email/graph-mail.ts`
  - `createDraft(token, { to, cc, subject, bodyHtml, signature })` → `{ id, webLink }`
  - `attachFileToDraft(token, messageId, filename, base64Content)` → void
  - `openDraft(webLink)` → opens draft in new tab

### Greeting Modal
No greeting modal is shown. Greeting name is derived automatically from vendor.name.
User email signature is fetched from /api/me and appended to every draft via
createDraft() signature parameter.

### Recipient Rules
- **Regular order PO emails:** To = vendor's po_contacts (role="to"), CC = remaining po_contacts + orders@mphunited.com
- **Recycling order PO emails:** To = recycling_orders.po_contacts (role="to"), CC = remaining po_contacts + orders@mphunited.com. Uses order-level po_contacts NOT vendor.po_contacts.
- **BOL emails:** To = vendor's bol_contacts (role="to"), CC = remaining bol_contacts. orders@mphunited.com is NOT CC'd on BOLs.
- **Customer confirmations:** To = order's customer_contacts where is_primary=true, CC = others.
- **Weekly schedules:** Graph API draft with PDF auto-attached. Recipients from company_settings.admin_schedule_recipients (admin), vendors.schedule_contacts (vendor), company_settings.frontline_schedule_contacts (Frontline).
- **Bulk PO email:** All selected orders must be from the same vendor — show error toast if not.
- **If po_contacts/bol_contacts is empty:** open draft with empty To field, do not throw.

### Regular Order PO Email Body Spec
Built by `src/lib/email/build-po-email.ts` — pure function, returns `{ subject, bodyHtml, to, cc }`.

**Subject line:**
| Scenario | Format |
|----------|--------|
| Single order, non-blind | `MPH United PO [order_number] -- [customer_name] \| Ship [MM/DD/YYYY]` |
| Single order, blind | `MPH United PO [order_number] \| Ship [MM/DD/YYYY]` |
| Multiple orders, non-blind | `[count] MPH United POs [order_numbers] \| Multiple Orders` |
| Revised single order, non-blind | `REVISED: MPH United PO [order_number] -- [customer_name] \| Ship [MM/DD/YYYY]` |
| Revised single order, blind | `REVISED: MPH United PO [order_number] \| Ship [MM/DD/YYYY]` |

### Recycling Order PO Email Subject
`MPH United PO [order_number] -- [customer_name] | Ship [MM/DD/YYYY]`
Blind: `MPH United PO [order_number] | Ship [MM/DD/YYYY]`
Date uses pick_up_date. Built from x-email-subject header set by /api/recycling-orders/[id]/po-pdf.

### Email Resilience Layer (shipped May 2026)

All email action hooks now use resilient modules instead of raw Graph API calls:
- getMailTokenResilient() replaces getMailToken() — popup retry, 30s timeout, structured errors
- createDraftResilient() replaces createDraft() — 3-attempt retry, exponential backoff
- attachFileToDraftResilient() replaces attachFileToDraft() — same retry wrapper
- tokenCache prevents concurrent auth popups (55-min cache)
- logEmailError() logs all failures to email_errors table (Supabase)
- EmailStatusIndicator component shows operation progress in the orders list toolbar
  (acquiring_token → building_email → creating_draft → attaching_pdf → success/error)
  Status persists 3s on success, 5s on error before resetting to idle.

Do NOT use the raw getMailToken / createDraft / attachFileToDraft functions in new code.

### Unsaved Changes Protection (shipped May 2026)

useUnsavedChanges(isDirty) is active on:
- Edit order page (orders/[orderId]) — chevron back guarded, sidebar guarded
- New order form (orders/new) — tab close and refresh guarded
- Edit IBC recycling page — back button and sidebar guarded
- Edit drum recycling page — back button and sidebar guarded
- New IBC recycling page — tab close and refresh guarded
- New drum recycling page — tab close and refresh guarded

Browser back button cannot be reliably intercepted in Next.js App Router.
The sidebar guardedNavigate() and in-page back buttons are the reliable guard points.

---

## 12. Document Generation

### Regular Order Purchase Order (PO)
- Generated on demand. No separate DB record.
- API route: `GET /api/orders/[orderId]/po-pdf` — `export const runtime = 'nodejs'`
- When orders.group_id is set, generates a combined multi-ship-to PDF using
  group_po_number as the PO number (see Section 23).
- Builder: `src/lib/orders/build-po-pdf.tsx`
- Multi-ship-to builder: `src/lib/orders/build-multi-ship-to-pdf.tsx`
- The PO shows: MPH header, order number, REVISED badge, vendor name/address,
  ship-to + customer name (hidden when blind), customer PO, required ship date,
  freight carrier, line items, order total, PO notes. Buy price IS shown.
- Blind shipment: hides customer identity and ship-to from PO document.
- PO PDF has no signature lines.

### Recycling Order Purchase Order (PO)
- Generated on demand. No separate DB record.
- API route: `GET /api/recycling-orders/[id]/po-pdf` — `export const runtime = 'nodejs'`
- Builder: `src/lib/recycling/build-recycling-po-pdf.tsx`
- **Inverted layout** (customer/vendor roles are swapped vs regular POs):
  - "Vendor" block (left): customer.name + customer.bill_to address (fall back to ship_to)
  - "Ship to" block (right): vendor.name + vendor.address
  - Blind shipment: Ship to shows "CPU" only
- Single line item: part_number (gold if present) + description + qty + buy + total
- Buy price IS shown. po_notes rendered if present.
- Route sets response headers: x-email-to, x-email-cc, x-email-subject (for email hook)
- No BOL PDF for recycling — bol_number is recorded as text only.

### Bill of Lading (BOL)
- BOL records stored in bills_of_lading table. No BOL DB record created on generation.
- API route: `GET /api/orders/[orderId]/bol-pdf` — `export const runtime = 'nodejs'`
- Builder: `src/lib/orders/build-bol-pdf.tsx`
- Ship To box: name and address only. Contact Information & Delivery Notes section
  below renders ship_to.shipping_notes if present.
- BOL return email: bol@mphunited.com. Hardcoded in build-bol-pdf.tsx.

### Credit Memo PDF
- API route: `GET /api/credit-memos/[id]/pdf` — `export const runtime = 'nodejs'`
- Builder: `src/lib/invoicing/build-credit-memo-pdf.tsx`
- Must match QBO-generated format: MPH header, logo, Credit To block, Credit # and Date,
  line items table (Activity, QTY, Rate, Amount), Total Credit footer.

### Weekly Schedules
Two types from the schedules page:
- **Admin/Owner (internal):** includes financial data (Buy column)
- **Vendor/Frontline (external):** no pricing
- Both: date range selector (default Mon–Fri current week), total count, Email Schedule button.
- Email Schedule is always visible, single-click, self-contained (fetches PDF, creates
  Graph API draft with PDF attached, opens Outlook — no prior Download PDF required).

---

## 13. CSR Order Checklists

Each order can have a checklist of action items the CSR must complete.
- Vendors have a `checklist_template` jsonb array.
- When a new order is created for a vendor, template is copied to orders.checklist.
- Each item: `{ "label": "Send order to carrier", "done": false }`
- ChecklistPopup in order-row.tsx is the ONLY component that saves checklist via PATCH.
  The PATCH body contains `{ checklist: updated }` as the sole field.

---

## 14. Recycling Orders

Recycling orders are at `/recycling/ibcs` and `/recycling/drums`. They share the
recycling_orders table, distinguished by `recycling_type = 'IBC' | 'Drum'`.
They share customers, vendors, and users tables with regular orders.

### CRITICAL: Inverted Customer/Vendor Relationship

Unlike regular orders, the PO goes TO the customer (the source company), not the vendor.

| Field | Regular orders | Recycling orders |
|-------|---------------|-----------------|
| customer_id | buyer of IBCs from MPH | company providing empties for recycling (PO recipient) |
| vendor_id | supplier/vendor plant | recycling/processing facility (PO destination) |
| PO goes to | vendor.po_contacts | recycling_orders.po_contacts (order-level) |
| PO "Vendor" block | vendor record | customer record (bill_to, fall back to ship_to) |
| PO "Ship to" block | orders.ship_to | vendor.address (or "CPU" if blind) |

This inverted pattern applies to both IBC and Drum recycling types.

### IBC Recycling (`recycling_type = 'IBC'`)
Empty IBCs picked up from the source company (customer_id), delivered to processing
facility (vendor_id). Financial flow: buy = MPH pays source company per IBC. sell = what
MPH charges (often zero — free service). freight_credit_amount = credit from processing
vendor to MPH.

**IBC-only fields** (not shown on drum form):
`delivery_date`, `appointment_notes` (plain text — NOT a timestamp), `ship_to`
(pickup/drop-off location), `freight_credit_amount`, `po_notes` (labeled
"Credit/Freight Notes" in UI — rendered inside the Financial section)

### Drum Recycling (`recycling_type = 'Drum'`)
Drums collected from customer, delivered to Coastal Container Services for processing.
MPH receives payment from customer (sell) and pays vendor to recycle (buy).
Default vendor: Coastal Container Services (id: `8ae0764b-c98d-4b4f-a71f-1e0111225a94`).
Pre-filled in new drum form; field remains a dropdown.

### Recycling Form Defaults
- **Default CSR:** Matt Cozik on all new IBC and Drum recycling order forms. Resolved
  by finding the user with `name = "Matt Cozik"` in the CSR users list fetched for the
  dropdown. Applied only when `csr_id` is null. Edit forms: only applied if the loaded
  order's `csr_id` is null — never overwrites an existing assignment.
- **part_number:** Not rendered on any recycling form (IBC or Drum). Always `null` on
  POST for new recycling orders.

**Invoice behavior (Drum only):** `invoice_status` is never shown in the drum UI and
always saves as `'Invoice'`. `invoice_customer_amount` is never shown and always saves
as `null`. Neither field is user-editable on drum forms.

**Coastal default sell:** `COASTAL_DEFAULT_SELL = "12.00"` constant in
`use-new-drum-form.ts`. Pre-fills `sell` when vendor = Coastal and `sell` is currently
empty. CSR can edit freely. Edit form applies only when `sell` is null on load.

**Drum-only fields** (not shown on IBC form):
`ship_from` (customer pickup location), `bill_to`, `customer_contacts` (confirmation emails)

**Drum-only fields** (not shown on IBC form):
`ship_from` (customer pickup location), `bill_to`, `customer_contacts` (confirmation emails)

### Recycling Order Statuses (RECYCLING_STATUSES — hardcoded in schema.ts, NOT in dropdown_configs)
Acknowledged Order | PO Request To Accounting | Waiting On Vendor To Confirm |
Credit Sent In | Confirmed To Customer | Waiting For Customer To Confirm |
Ready To Pickup | Picked Up | Sent Order To Carrier | Ready To Ship |
Ready To Invoice | Complete | Canceled

### Recycling List Page Filter Bar
Both `/recycling/ibcs` and `/recycling/drums` use a two-row filter bar:
- Row 1: Search | lifecycle pills (Active / Complete / All) | Status single-select
         dropdown (RECYCLING_STATUSES) | Clear Filters
- Row 2: Customer | Vendor | CSR | Salesperson (all single-select, matching Orders page
         dropdown pattern)
No Flagged pill. No multi-select status. Status is single-select only.
Clear Filters resets all five filters simultaneously.
API params: `customer_id`, `vendor_id`, `csr_id`, `salesperson_id`, `status`.

### Recycling Invoice Statuses
No Charge | Credit | Invoice (default: No Charge)

### Recycling Vendors
RRG (Rural Recycling Grinding) — Stanwood, IA
STS Superior Tote Solutions — Greenwood/Summitville, IN
GPC Great Plains Container — Garden City, KS
SEC SouthEast Container — Cleveland, MS
UCG United Container Group — Hillsboro, TX
5 Star Industrial Containers — Bristow, OK
Responsible Container — St. Louis, MO
Coastal Container Services — Alvin, TX (drum orders default)

### PO Email
Hook: `src/lib/recycling/use-recycling-po-email.ts`
Reads x-email-to/cc/subject from po-pdf route response headers.
Creates Graph API draft with PDF attached, opens Outlook.
po_contacts on the ORDER drives recipients (not vendor.po_contacts).
If po_contacts empty: opens draft with empty To field — does not throw.

### Invoice Number
`qb_invoice_number` (text, nullable) is on recycling_orders. Surfaced on IBC and Drum edit forms in the Financial section.

---

## 15. Ongoing Orders Table — Column Specification

Default visible columns (in order):
Flag | MPH PO | Status | Sales/CSR | Customer | Customer PO | Description | Qty |
Ship Date | Vendor | Buy | Sell | Ship To | Carrier | Actions

Note: Wanted Date column was removed from the list table to give more space to Description.
The wanted_date field is still fetched and available on the order detail/edit page.

Row spec:
- Row height: 52px minimum.
- Zebra striping: odd rows #f3f4f6, even rows white. Implemented via rowIndex prop passed from orders-table.tsx (index-based, NOT CSS odd: selector). Any new row-level background logic must use cn() with rowIndex.
- Flagged rows: !bg-[#fef2f2] overrides the stripe when order.flag is true (using ! important prefix).

Rules:
- Flag: red filled (text-red-500 fill-red-500) when true, outline when false. Flagged rows: !bg-[#fef2f2] (overrides zebra stripe).
- MPH PO cell contains: (1) the PO number as a clickable link that opens the Order Summary Drawer, (2) a CSR List icon button (clipboard-list icon, 24×24px), (3) a Notes icon button (notes icon, 24×24px). All three elements are inline in a flex-row. Each button has a text label below the icon ("CSR List", "Notes"). The cell opens the Order Summary Drawer (Sheet, right side). Does NOT navigate. Edit link is inside drawer header. Never use Button asChild here — use styled native Link.
  - CSR List amber indicator: amber ring + amber icon when order.checklist has any item where done === false.
  - Notes amber indicator: amber ring + amber icon when any of misc_notes, po_notes, or freight_invoice_notes is non-empty.
- Actions cell: Pencil icon on hover (group-hover, navigates to /orders/[orderId]). Duplicate copy icon always visible.
- Status: colored pill badge. Non-SALES: inline-editable Select. SALES: read-only badge. Status column is constrained to 148px (min-w, max-w, and w all set). Status badge text wraps to multiple lines within this width. The shadcn Select for non-SALES users uses !h-auto and !line-clamp-none on SelectValue to allow text wrapping. Row vertical alignment is align-top when status wraps to two lines.
- Carrier: colored pill badge. Dash if null.
- Sales/CSR: "FirstName / FirstName" format. Two CSRs: "First / First2".
- Customer PO cell: "Wash & Return" badge (gold) when any split load has W&R type; "Split Load" (muted) for 2+ loads with no W&R; nothing otherwise.
- Ship To cell: ship_to.name line 1, city/state line 2 in text-xs text-muted-foreground.
- Grouped orders (group_id set): group_po_number displays stacked below the individual order_number in the MPH PO cell in small muted text. Not shown in the Customer    column.
- Table supports multi-select for bulk Email POs / Email BOLs actions.
- Expandable rows: chevron click → card per split load. Fields: Load PO, Customer PO, Description, Qty, Buy, Sell.
- Order Summary Drawer: Sheet, side="right", w-[520px]. Fetches GET /api/orders/[orderId] on open.

### Live Margin Panel
Component: `order-margin-card.tsx`. Renders a sticky dark navy card on the new/edit order form.
- Background: #1a2744, rounded-lg, p-4, sticky top-4.
- Labels: text-white/60, 11px, font-weight 500.
- Values: text-white/90, 15px, font-weight 500.
- Net margin value: 22px, font-weight 600.
  - Green (#10b981) when margin % >= 8%.
  - Red (#ef4444) when margin % < 8%.
  - Neutral text-white/90 when revenue is zero.

### Form Section Headers
All form section headers use a flex-row container with:
- A 2px wide × 20px tall #1a2744 left-bar accent (rounded-full).
- 13px semibold #171717 label text in sentence case.
- No all-caps labels anywhere in the application.
This pattern applies across all 13 section headers in 7 form files.

Filter bar — two always-visible rows:
- Row 1: Search | lifecycle pills (Active / Complete / Flagged / All) | Status multi-select | Clear Filters
- Row 2: Customer | Vendor | CSR | Salesperson | Ship Date range
Default sort: Ship Date ASC, nulls last.

Lifecycle pill visual spec (Vercel pill pattern):
- Shape: 9999px border-radius, px-3.5 py-[5px], 13px font-size, font-weight 500.
- Active state: #1a2744 background, white text.
- Inactive state: white background, #374151 text, shadow-border (box-shadow border).
- Flagged inactive: #fee2e2 background, #991b1b text.
- Gap between pills: 4px.

---

## 16. Repeat Orders / Order Duplication

Duplicate button on order detail page and orders table (per-row). Calls POST /api/orders/duplicate/[orderId].

**What carries over:** Customer, vendor, ship-to, bill-to, customer_contacts, freight_carrier,
terms, additional_costs, order_type, salesperson_id, csr_id, csr2_id, all split_loads
(description, part_number, order_type per load, bottle_cost, bottle_qty, mph_freight_bottles
— but NOT buy/sell prices), po_notes, freight_invoice_notes, shipper_notes, misc_notes,
is_blind_shipment.

**What resets:** order_date (today), order_number (new), status (Pending), ship_date,
wanted_date, appointment_time, appointment_notes, customer_po, flag (false),
is_revised (false), invoice_payment_status (Not Invoiced), commission_status (derived),
qb_invoice_number, checklist (fresh from vendor template), buy/sell, group_id (null).

---

## 17. Application Routes

| Route | Page | Phase |
|-------|------|-------|
| /auth/callback | OAuth callback handler | 1 — Done |
| /dashboard | Hero stats, stat cards, bar chart, recent orders | 1 — Done |
| /orders | Ongoing orders table with filtering + pagination | 1 — Done |
| /orders/new | New order form | 1 — Done |
| /orders/[orderId] | Order detail, edit, PO, BOL, checklist, duplicate, group/ungroup | 1 — Done |
| /recycling | Redirects to /recycling/ibcs | 1 — Done |
| /recycling/ibcs | IBC recycling list — flag, inline status, filter bar, summary drawer | 1 — Done |
| /recycling/ibcs/new | New IBC recycling order form | 1 — Done |
| /recycling/ibcs/[id] | IBC order detail/edit — Save, Email PO, Download PDF | 1 — Done |
| /recycling/drums | Drum recycling list | 1 — Done |
| /recycling/drums/new | New drum recycling order form (Coastal pre-filled) | 1 — Done |
| /recycling/drums/[id] | Drum order detail/edit | 1 — Done |
| /customers | Customer list | 1 — Done |
| /customers/[customerId] | Customer detail and contacts editor | 1 — Done |
| /vendors | Vendor list | 1 — Done |
| /vendors/[vendorId] | Vendor detail, contacts, checklist template | 1 — Done |
| /schedules | Weekly schedule generation | 1 — Done |
| /commission | Commission report. Shows ALL split loads for commission-eligible salespersons (regardless of order type eligibility). Filters: Search (order number, customer PO, customer name, vendor name), Customer, Vendor, Salesperson, Commission Status pills (Not Eligible \| Eligible \| Paid), Invoice Status pills (Not Invoiced \| Invoiced \| Paid). Inline order_type editing per row — calls PATCH /api/commission/split-load/[splitLoadId], re-derives commission_status live. Route guard: SALES without can_view_commission → /dashboard. | 1 — Done |
| /invoicing | Invoice Queue + Credit Memos tabs. ACCOUNTING + ADMIN only. Filters: Search (matches order_number, customer_po, order_number_override, group_po_number), Customer, Vendor, CSR, Salesperson (single-select), Invoice Status (multi-select), Ship Date range. All persisted in URL params. Client-side filtering — full queue loads without pagination. | 1 — Done |
| /settings | Carriers, Order Statuses, Company Settings, Order Number preview, Order Types, Product Weights | 1 — Done |
| /global-emails | Global email contact directory. All roles view/add/edit. ADMIN only deletes. | 1 — Done |
| /team | User management — ADMIN only | 1 — Done |
| /api/orders | GET (filtering + pagination, SALES enforced); POST new order | 1 — Done |
| /api/orders/[orderId] | GET detail | 1 — Done |
| /api/orders/[orderId]/po-pdf | GET PO PDF (handles grouped orders via group_id) | 1 — Done |
| /api/orders/[orderId]/bol-pdf | GET BOL PDF | 1 — Done |
| /api/orders/[orderId]/invoice | PATCH invoice status + paid date. ACCOUNTING + ADMIN. | 1 — Done |
| /api/orders/duplicate/[orderId] | POST duplicate order | 1 — Done |
| /api/orders/confirmation-email | POST confirmation email (Graph API draft) | 1 — Done |
| /api/order-groups | POST create group (CSR/ADMIN) | 1 — Done |
| /api/order-groups/[id] | DELETE ungroup (ADMIN only) | 1 — Done |
| /api/recycling-orders | GET paginated list (?type=IBC\|Drum required; SALES enforced); POST new order | 1 — Done |
| /api/recycling-orders/[id] | GET full detail; PATCH update (CSR/ADMIN/ACCOUNTING) | 1 — Done |
| /api/recycling-orders/[id]/po-pdf | GET PDF (nodejs runtime); sets x-email-to/cc/subject headers | 1 — Done |
| /api/customers | GET customer list | 1 — Done |
| /api/customers/[customerId] | GET/PATCH customer detail | 1 — Done |
| /api/vendors | GET vendor list | 1 — Done |
| /api/vendors/[vendorId] | GET/PATCH vendor detail | 1 — Done |
| /api/users | GET users list; ?permission=SALES\|CSR filter; ?commission_eligible=true filter | 1 — Done |
| /api/me | GET current user id/name/email/role/email_signature | 1 — Done |
| /api/dropdown-configs | GET { type, values, meta } by ?type=; PUT replaces values array (ADMIN only) | 1 — Done |
| /api/order-type-configs | GET all rows; POST/PUT/DELETE (ADMIN only for writes) | 1 — Done |
| /api/orders/check-po | GET ?number=X — returns { exists: boolean } | 1 — Done |
| /api/orders/next-po-preview | GET ?initials=XX — returns { preview: string } without consuming sequence | 1 — Done |
| /api/schedules/admin-pdf | POST admin schedule PDF | 1 — Done |
| /api/schedules/vendor-pdf | POST vendor/Frontline schedule PDF | 1 — Done |
| /api/commission | GET commission data, role-filtered | 1 — Done |
| /api/commission/mark-paid | POST bulk mark commission paid | 1 — Done |
| /api/commission/split-load/[splitLoadId] | PATCH update order_type on a single order_split_loads row and re-derive commission_status. Re-derive logic: eligible type + was Not Eligible → Eligible; eligible type + already Eligible or Paid → unchanged; ineligible type → Not Eligible. ADMIN + ACCOUNTING only. | 1 — Done |
| /api/credit-memos | GET list (ACCOUNTING + ADMIN); POST create draft | 1 — Done |
| /api/credit-memos/[id] | PUT update draft (blocked if Final); DELETE draft same-day only | 1 — Done |
| /api/credit-memos/[id]/finalize | POST — stamps credit_number, sets status=Final, locks | 1 — Done |
| /api/credit-memos/[id]/pdf | GET — generates credit memo PDF. export const runtime = 'nodejs' | 1 — Done |
| /api/auth/signout | POST — server-side signout, clears cookies, redirects to /login | 1 — Done |
| /api/company-settings | GET/PUT company_settings singleton (ADMIN only for PUT) | 1 — Done |
| /api/global-emails | GET all contacts (?type= filter); POST create contact | 1 — Done |
| /api/global-emails/[id] | PUT update; DELETE (ADMIN only) | 1 — Done |
| /api/product-weights | GET all; POST/PUT/DELETE (ADMIN only for writes) | 1 — Done |
| /api/dashboard | GET dashboard stats | 1 — Done |
| GET /api/financials/product-totals | Returns product totals + vendor totals for regular orders by ship_date range |
| GET /api/financials/customer-orders | Returns order counts per customer by period (monthly or quarterly) |
| GET /api/financials/recycling-totals | Returns IBC and Drum totals from recycling_orders by pick_up_date range |
| GET /api/financials/pdf | Generates landscape A4 PDF of all financial data tables |

---

## 18. Phase 1 Build Order (Priority Sequence)

### Immediate (unblock the order form)
1–4. ✅ COMPLETE — Schema migrations, form fixes, first real order, API verification.

### Core pages
5. ✅ COMPLETE — Customers page — list + detail with contacts editor
6. ✅ COMPLETE — Vendors page — list + detail with PO/BOL contacts sections + checklist template editor
7. ✅ COMPLETE — Order detail/edit page

### Documents and schedules
8. ✅ COMPLETE — PO PDF route
9. ✅ COMPLETE — BOL PDF route
10. ✅ COMPLETE — Duplicate order button
11. ✅ COMPLETE — Schedules page + Email POs + Email BOLs via Graph API

### Recycling
12. ✅ COMPLETE — Recycling orders: migration (9 new columns on recycling_orders),
    IBC + Drum list pages, new + edit forms, PO PDF builder (inverted layout),
    Graph API email hook, navigation items. Inverted customer/vendor relationship
    documented in AGENTS.md. COASTAL_VENDOR_ID: 8ae0764b-c98d-4b4f-a71f-1e0111225a94.
    qb_invoice_number added to recycling_orders via migration (May 2026).

### Reports and admin
13. ✅ COMPLETE — Commission report page
14. ✅ COMPLETE — Invoicing page (/invoicing) — Invoice Queue + Credit Memos tab
15. ✅ COMPLETE — Admin/settings page
16. ✅ COMPLETE — Dashboard
17. Financial snapshot (admin only) — not yet built

### Data migration
18. Import last 12 months from Excel — not yet done
19. ✅ COMPLETE — Team/user management page
20–37. ✅ COMPLETE — All items per previous PRD entries.
38. ✅ COMPLETE — Multi-Ship-To Order Groups (order_groups table, group_id FK on orders,
    combined vendor PO PDF, Group/Ungroup UI). See Section 23.

---

## 19. Security Posture

### Current State

**Architecture:** Server-side only. All database queries run through Next.js API routes
using the Supabase service role key via Drizzle ORM. No direct client-side database access.

**Row Level Security:** Enabled on all public tables. All tables have a
"Service role full access" policy scoped to `service_role` only.
Tables with confirmed RLS: users, orders, customers, vendors, bills_of_lading,
recycling_orders, order_split_loads, audit_logs, company_settings, dropdown_configs,
product_weights, order_type_configs, global_email_contacts, credit_memos,
credit_memo_line_items, order_groups.

Run the Supabase security advisor after every DDL migration to confirm zero critical errors.

### Future Requirement: Multi-Tenant (MPH + Harding National)
When Harding National is onboarded: replace service_role-only policies with tenant-aware
RLS policies before adding their data. A `company_id` column will be required.
Architecture rules in Section 4 prohibiting `company_id` will need to be revised at that time.

---

## 20. Invoicing Business Rules

### Invoice Queue
- invoice_payment_status values: 'Not Invoiced' | 'Invoiced' | 'Paid'
- Setting Paid triggers commission eligibility on all eligible split loads.
- Downgrading from Paid shows confirmation dialog, clears invoice_paid_date, resets commission.
- Queue uses GET /api/orders with ?view=invoicing param.
- Recycling order invoicing is descoped from Phase 1.

### R-Suffix Rule
When orders.salesperson_id has is_commission_eligible = true, Invoice # on /invoicing
displays a fixed "R" suffix. Value stored as "1234R" in qb_invoice_number.
Currently applies to Renee Sauvageau only.

### Credit Memos
- Issued to customers only. Standalone records — do not alter orders.
- credit_memos.credit_number entered manually by Accounting (QBO owns sequence).
- 'Draft' = editable. 'Final' = locked. DELETE permitted on Draft memos created today only.
- PDF matches QBO-generated format exactly.
- Roles with access: ACCOUNTING, ADMIN.

---

## 21. Phase 2 Features (Do NOT Build in Phase 1)

- QuickBooks Online integration
- Invoice PDF generation and emailing
- Direct email via Resend
- Email notifications
- Vendor stock sheet tracking in-app
- Alliance Hillsboro collaborative schedule
- Financials tab with charts (/financials was deleted — do not recreate)
- Audit log UI
- Salesperson margin calculator, quote forms, performance dashboard
- Mobile-responsive optimization
- Forum, Resources tab, IBC catalog, CRM
- Nightly automated database backup to S3
- App-wide undo/redo
- Recycling order invoicing workflow

**If anyone asks Claude Code to build any of the above during Phase 1, refuse.**

---

## 22. Known Issues and Decisions Already Made

| Issue | Decision |
|-------|----------|
| Recycling inverted customer/vendor | customer_id = source company (PO recipient). vendor_id = processing facility (PO destination). PO goes TO customer. po_contacts on order (not vendor). See Section 14. |
| recycling_orders qb_invoice_number | Added via migration (May 2026). Text column, nullable. Surfaced on IBC and Drum edit forms. |
| Coastal Container Services UUID | 8ae0764b-c98d-4b4f-a71f-1e0111225a94. Stored as COASTAL_VENDOR_ID in src/lib/recycling/use-new-drum-form.ts. Pre-fills vendor_id on new drum form. |
| order_number_seq | Shared by regular orders, recycling orders, and order_groups.group_po_number. Single sequence, same format [Initials]-MPH[Number]. |
| RECYCLING_STATUSES | Hardcoded in schema.ts. NOT managed via dropdown_configs. Do not add RECYCLING_STATUS type. |
| appointment_notes on recycling | Plain text field. Never use a timestamp or time picker. |
| recycling_type discriminator | 'IBC' or 'Drum'. NOT NULL, default 'IBC'. Always pass in POST body. Always include ?type= in GET. |
| Multi-ship-to order groups | order_groups table + orders.group_id. Max 4 orders per group. Same vendor required. group_po_number from nextval(). Recycling orders excluded. See Section 23. |
| customer_contacts on orders | jsonb [{name, email, is_primary}]. is_primary=true → To, false → Cc. |
| bill_to_contacts on orders | jsonb [{name, email}]. Rendered in right column below Bill To Notes. |
| Global Email Contacts | global_email_contacts table. email is unique. type: CONFIRMATION \| BILL_TO \| BOTH. 732 contacts seeded 2026-04-30. |
| order_split_loads numeric precision | qty: numeric(12,3). buy: numeric(12,3). sell: numeric(10,2). |
| vendor default_load1_buy precision | numeric(12,3). default_bottle_cost: numeric(12,3). |
| order number format | [Initials]-MPH[Number]. Postgres sequence only. Never MAX()+1. |
| /financials route | Deleted — Phase 2. Do not recreate. |
| Button asChild | @base-ui/react has no asChild prop. Use styled native Link elements instead. |
| RLS on new tables | Must be manually enabled after every DDL migration. ALTER TABLE + policy + security advisor. |
| Canceled spelling | One L throughout. "Cancelled" removed everywhere. |
| Git Bash vs PowerShell | Jack uses Git Bash. Use rm -rf not Remove-Item. |
| node_modules corruption | If npm install says "up to date" but packages missing: rm -rf node_modules && rm -f package-lock.json && npm install |
| .next cache | If unexplained 404s: rm -rf .next then npm run dev |
| Vendor contacts | po_contacts, bol_contacts, invoice_contacts, schedule_contacts all use role: "to"\|"cc" shape. |
| BOL CC rule | orders@mphunited.com NOT CC'd on BOLs. Only on PO and invoice emails. |
| Recycling PO CC rule | orders@mphunited.com IS CC'd on recycling PO emails (same as regular orders). |
| PO PDF background | White (#ffffff). PAGE_BG constant in build-po-pdf.tsx. |
| Sales Order # | Removed from all UI and PDFs April 28 2026. Schema column retained for historical data. |
| proxy.ts | Next.js 16 middleware equivalent. Never rename to middleware.ts. |
| MSAL version | @azure/msal-browser 4.28.1 pinned. v5 breaks popup flow. Do not upgrade. |
| commission_paid_date | Set from /commission page. Represents Friday payroll date. |
| invoice_paid_date | Set on order edit form by Accounting. Triggers commission payout. |
| Date display format | MM/DD/YYYY throughout UI. YYYY-MM-DD in DB. Format on display only. |
| Credit memo numbers | Entered manually — QBO owns the sequence. Do not create Postgres sequence. |
| Wash & Return Stage | Canonical status spelling (replaced Rinse & Return Stage). |
| COASTAL_DEFAULT_SELL | "12.00" hardcoded in use-new-drum-form.ts. Pre-fills sell when vendor = Coastal and sell is empty. Edit form: only when sell is null on load. |
| Drum invoice_status | Always saves as 'Invoice'. Not shown in drum UI. invoice_customer_amount always null — not calculated or stored. |
| Recycling part_number | Not rendered on any recycling form. Always null on POST for new IBC and Drum orders. DB column retained for historical data. |
| Recycling default CSR | Matt Cozik. Resolved by name lookup from CSR users list. New forms: always if csr_id empty. Edit forms: only if loaded order csr_id is null. |
| Recycling form layout (IBC) | Financial section sits directly after Order Details. Credit/Freight Notes (po_notes) is inside Financial. BOL # is in Dates & Logistics. No separate BOL section. Notes section contains only misc_notes. |
| Recycling form layout (Drum) | Same as IBC layout minus Credit/Freight Notes and BOL (IBC-only). P/N removed. Qty next to Customer PO. Buy/Sell same row. |
---

## 23. Multi-Ship-To Order Groups

Some vendors ship one physical load to multiple customers at different destinations.
Modeled as separate orders linked by an `order_groups` record.

### Schema
**`order_groups` table:**
- `id` uuid PK
- `group_po_number` text unique — from `nextval('order_number_seq')`
- `vendor_id` uuid FK vendors — all orders in a group must share this vendor
- `notes` text nullable
- `created_at`, `updated_at`

**`orders.group_id`** — nullable uuid FK to `order_groups`.

### Behavior rules
- User selects 2–4 orders from the orders list, clicks "Group as Multi-Ship-To".
- All orders must share the same `vendor_id`. API rejects mismatched vendors (400).
- Blocked if any order already has a `group_id` or status past "Waiting On Vendor To Confirm".
- When `group_id` is set, `/api/orders/[orderId]/po-pdf` generates combined multi-ship-to PDF
  using `group_po_number`. Single-order path unchanged for ungrouped orders.
- Vendor PO email uses `group_po_number` in subject and body, attaches combined PDF.
- Customer confirmation emails unaffected — operate at individual order level.
- Ungrouping (ADMIN only) via order detail page: sets `group_id = null`, deletes order_groups row.
- Consumed `group_po_number` is not reused.
- group_po_number displays stacked below the individual order_number in the MPH PO cell on both the Orders list and Invoicing page. Searching for a group_po_number returns all orders in the group on both pages.
- Maximum 4 orders per group.
- Recycling orders do not support grouping.

---

## 24. What the Current Prototype Is NOT

The HTML prototype in `reference/` was built before the current schema. Use it only as
a visual reference for layout and UI patterns. Never use it as a data model reference.

---

## 25. Development Workflow

- Jack builds alone currently. Keith will return to the project eventually.
- Claude Code creates git worktrees under `.claude/worktrees/` for each task.
- **After every task Claude Code must:** commit all changes, merge branch to main, push to origin.
- Verify with `git log --oneline -5` after every task.
- Do not trust Claude Code's success confirmations — verify with git log yourself.
- Jack uses Git Bash on Windows. Use Git Bash commands (rm -rf), not PowerShell (Remove-Item).

When Keith eventually resumes:
- Read AGENTS.md and PRD.md before starting any session.
- Pull from main before starting work.
- Use Context7 MCP for current Next.js, Drizzle, shadcn/ui docs.

---

## 26. File Structure Reference
src/lib/db/schema.ts                — Drizzle schema, always read before writing queries
src/lib/db/index.ts                 — Drizzle client
src/lib/email/msal-client.ts        — MSAL singleton + getMailToken()
src/lib/email/graph-mail.ts         — createDraft(), attachFileToDraft(), openDraft()
src/lib/email/build-po-email.ts     — Regular order PO email builder (pure function)
src/lib/orders/build-po-pdf.tsx     — Regular order PO PDF builder
src/lib/orders/build-bol-pdf.tsx    — BOL PDF builder
src/lib/orders/build-multi-ship-to-pdf.tsx — Combined multi-ship-to PO PDF builder
src/lib/invoicing/build-credit-memo-pdf.tsx — Credit memo PDF builder
src/lib/recycling/build-recycling-po-pdf.tsx — Recycling PO PDF (inverted layout)
src/lib/recycling/use-new-ibc-form.ts
src/lib/recycling/use-new-drum-form.ts  — new drum form hook; COASTAL_VENDOR_ID const
  (8ae0764b-c98d-4b4f-a71f-1e0111225a94); COASTAL_DEFAULT_SELL const ("12.00" — default
  sell pre-fill when vendor = Coastal and sell is empty)
src/lib/recycling/use-edit-ibc-form.ts
src/lib/recycling/use-edit-drum-form.ts
src/lib/recycling/use-recycling-po-email.ts — Graph API PO email hook
src/lib/orders/badge-colors.ts      — getBadgeColor(), getBadgeTextColor()
src/lib/utils/format-date.ts        — formatDate() MM/DD/YYYY display helper
src/lib/schedules/                  — schedule PDF builders, fetching, date utils
src/components/orders/order-summary-drawer.tsx
src/components/orders/order-row.tsx — ChecklistPopup and NotesPopup
src/components/recycling/ibc-recycling-table.tsx
src/components/recycling/drum-recycling-table.tsx
src/components/recycling/new-ibc-form.tsx
src/components/recycling/new-drum-form.tsx
src/components/recycling/edit-ibc-form.tsx
src/components/recycling/edit-drum-form.tsx
src/components/recycling/recycling-order-summary-drawer.tsx
src/components/commission/          — commission report components
src/components/settings/            — settings page section components
src/components/global-emails/global-emails-client.tsx
src/app/(dashboard)/                — all authenticated pages
src/app/(dashboard)/recycling/page.tsx          — redirects to /recycling/ibcs
src/app/(dashboard)/recycling/ibcs/page.tsx
src/app/(dashboard)/recycling/ibcs/new/page.tsx
src/app/(dashboard)/recycling/ibcs/[id]/page.tsx
src/app/(dashboard)/recycling/drums/page.tsx
src/app/(dashboard)/recycling/drums/new/page.tsx
src/app/(dashboard)/recycling/drums/[id]/page.tsx
src/app/(auth)/login/               — login page
src/app/api/recycling-orders/route.ts
src/app/api/recycling-orders/[id]/route.ts
src/app/api/recycling-orders/[id]/po-pdf/route.ts
src/app/api/order-groups/route.ts
src/app/api/order-groups/[id]/route.ts
src/app/api/                        — all other API routes
src/proxy.ts                        — session handler (Next.js 16 middleware equivalent)
src/actions/team.ts                 — server actions for user/team management
src/config/nav.ts                   — navigation items
reference/                          — HTML prototype (UI reference only, not a spec)
AGENTS.md                           — technical conventions, read at every session
PRD.md                              — this file, product requirements, read at every session
drizzle/                            — migration SQL files and snapshots

---

## 27. Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          (auth only, never for DB queries)
SUPABASE_SERVICE_ROLE_KEY=eyJ...              (admin operations if needed)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres

DATABASE_URL must NOT be prefixed with NEXT_PUBLIC_. It is server-only.

## 28. Financial Section

Route: /financials
Access: ADMIN and ACCOUNTING roles only. Server-side redirect for all other roles.
All four API routes return 403 for unauthorized roles.
Nav icon: BarChart2. Recharts is installed as of this sprint.

### Features

**Product Totals (regular orders)**
- Data source: order_split_loads JOIN orders
- Date filter: order_split_loads.ship_date
- Left table: Product | Total QTY | Total Shipments (sorted by product name)
- Right table: Vendor | Product | Total QTY | Total Shipments (grouped by vendor_id)
- Vendor totals ALWAYS join by vendor_id — never group by vendor name text
- Total QTY = SUM(order_split_loads.qty)
- Total Shipments = COUNT(DISTINCT order_id) per product type
- Shipment counting rule: one order = one truck = one shipment per product type.
  If one truck carries two product types, each gets independent shipment credit.
  Total shipments across all product rows will exceed actual trucks dispatched.
  This is intentional and matches the existing Excel workbook behavior.
- Null order_type rows are grouped under "Other — Parts & Supplies"
- Both tables are sortable by column header click

**Aggregate Summary Cards**
Computed client-side from product-totals API response. No separate query.

| Card | order_type values included |
|---|---|
| Total New Poly Drums | 55 Gal New OH Poly Drum, 55 Gal New TH Poly Drum |
| Total Washout Drums | 55 Gal Washout OH Poly Drum, 55 Gal Washout TH Poly Drum |
| Total Steel Drums | 55 Gal New OH Steel Drum, 55 Gal New TH Steel Drum |
| Total All Drums | All 6 drum types above |
| Total 275 Gal IBCs | All order_types containing "275 Gal" |
| Total 330 Gal IBCs | All order_types containing "330 Gal" |
| Total 135 Gal IBCs | All order_types containing "135 Gal" |

Each card shows Total QTY and Total Shipments.
Washout Drums are intentionally separate from Total New Poly Drums — they are not
included in the poly drum card.

**Customer Order Frequency**
- Data source: orders JOIN order_split_loads JOIN customers
- Date filter: order_split_loads.ship_date
- Count unit: COUNT(DISTINCT orders.id) — one order = one data point
- Granularity: Monthly (DATE_TRUNC('month')) or Quarterly (DATE_TRUNC('quarter'))
- "By Customer" tab: customer selector + Recharts BarChart (navy bars) + data table
- "All Customers" tab: sortable pivot table, default sort Total Orders DESC

**Recycling Totals (separate section, not combined with product totals)**
- Data source: recycling_orders
- Date filter: pick_up_date (UI label is "Ship Date"; backend column is pick_up_date)
- Each recycling_orders row = one shipment (no split loads on recycling)
- IBC sub-table: recycling_type = 'IBC', grouped by vendor_id
- Drum sub-table: recycling_type = 'Drum', grouped by vendor_id
- Columns: Vendor | Total QTY | Total Orders
- Disclaimer note rendered on page: "Recycling totals are not included in Product Totals above."

**PDF Export**
- Route: GET /api/financials/pdf?startDate=&endDate=&customerId=
- export const runtime = 'nodejs' (required — crashes silently on Edge without it)
- Landscape A4, 2 pages
- Page 1: MPH logo header + date range + aggregate cards + product totals tables
- Page 2: customer order pivot table + recycling totals tables
- No charts in PDF — data tables only
- Logo PNG: https://oms-jade.vercel.app/mph-logo.png

### Future Considerations (not built)
- Salesperson access: deferred. Requires deliberate decision on whether buy/margin
  data should be visible to SALES role before any access is granted.
- Seasonal alerts: deferred to Phase 3. Requires recurrence pattern logic, minimum
  sample size definition, alert delivery mechanism, and dismissal state.
---

*Last updated: May 2026 — Financial section built (Section 28): /financials route added
for ADMIN + ACCOUNTING roles; product totals with vendor breakdown; 7 aggregate summary
cards; customer order frequency with Recharts bar chart (monthly/quarterly); recycling
totals as separate section using pick_up_date filter; landscape A4 PDF export (data tables
only); Recharts installed; seasonal alerts deferred to Phase 3.*

*Last updated: May 8, 2026 — Recycling section fully designed and built:
analyzed IBC and Drum Excel source files; designed single-table architecture
(recycling_type discriminator on recycling_orders); discovered and documented
inverted customer/vendor PO relationship from live PO PDFs (customer = source
company = PO recipient; vendor = processing facility = PO destination);
added 9 columns to recycling_orders via migration; built IBC and Drum list pages,
new/edit forms, recycling PO PDF builder (inverted layout, blind shipment support),
Graph API email hook (po_contacts on order, not vendor); COASTAL_VENDOR_ID set to
8ae0764b-c98d-4b4f-a71f-1e0111225a94; qb_invoice_number gap on recycling_orders
identified as known issue; AGENTS.md rules 59–65 added; full PRD and AGENTS.md
rewrite completed.*

*Last updated: May 2026 — Recycling section fully built (Section 14 rewritten):
recycling_orders table updated with 9 new columns (recycling_type, qty, buy, sell,
description, part_number, appointment_notes, po_contacts, is_blind_shipment); IBC and
Drum list pages, new/edit forms, inverted PO PDF builder, Graph API email hook built;
COASTAL_VENDOR_ID: 8ae0764b-c98d-4b4f-a71f-1e0111225a94; qb_invoice_number gap on
recycling_orders noted as known issue. Section 17 routes fully updated. Section 22
Known Issues updated with recycling, order_groups, and operational decisions.
Duplicate Section 20 numbering fixed. /financials added as Section 28 (built May 2026).*

*Last updated: May 7, 2026 — Multi-Ship-To Order Groups added (Section 23): order_groups
table, group_id FK on orders, combined vendor PO PDF and email for grouped orders.*

*Last updated: May 5–7, 2026 — Pre-launch hardening: buy/sell 3-decimal precision,
Wash & Return Stage canonical status, PO email REVISED label, Clear Filters button,
flagged row highlight, noValidate on new order form, order_type fallback.*

*Last updated: May 9, 2026 — UI design session shipped changes documented in Section 15:
Wanted Date column removed from orders list table (field still fetched, available on detail/edit);
row height updated to 52px; zebra striping updated to #f3f4f6/white via index-based rowIndex prop;
flagged row override changed to !bg-[#fef2f2]; MPH PO cell spec updated with CSR List and Notes
icon buttons (amber indicators for incomplete checklist and non-empty notes); Status column
constrained to 148px with text-wrap support; lifecycle pill visual spec added (Vercel pill pattern,
#1a2744 active, #fee2e2 Flagged inactive); Live Margin panel spec added (order-margin-card.tsx,
#1a2744 background, green/red margin thresholds); form section header spec added (2px navy left-bar,
13px semibold, sentence case, no all-caps); DESIGN.md reference added to Section 3.*