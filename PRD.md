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
| Jack Schlaack | Admin / IT Lead | (none) | Builds the app using Claude Code. Not a professional developer. |
| Keith Ferrell | CSR & Admin | CSR | Will use the app. Will eventually contribute to building it. Currently unavailable. |
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
2. **RLS is enabled on all tables with service_role-only policies** (as of April 22, 2026). All DB access runs server-side through API routes. Direct public/anon access is blocked at the database level. See Section 19 for full security posture.
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
| dropdown_configs | Configurable dropdown lists (one row per type; values is a jsonb string[]) |
| audit_logs | Immutable change log |

### users table — key fields
id (UUID, mirrors auth.users), email, name, avatar_url, entra_id, title, phone,
email_signature, role (user_role enum: ADMIN|CSR|ACCOUNTING|SALES), permissions (jsonb,
default [] — array of "SALES"|"CSR" controlling order form dropdown appearance independently
of app role), can_view_commission (boolean), is_commission_eligible (boolean, default false —
controls commission report filtering; currently true for Renee Sauvageau only), is_active (boolean), created_at

### orders table — key fields
id, order_number (text, unique), order_date, order_type, customer_id, vendor_id,
salesperson_id, csr_id, csr2_id, status, customer_po, freight_cost, freight_to_customer,
additional_costs, freight_carrier (text — populated from dropdown_configs CARRIER type),
ship_date, wanted_date, ship_to (jsonb), bill_to (jsonb),
customer_contacts (jsonb — [{name, email}], extract emails directly for Graph API drafts),
terms, appointment_time, appointment_notes, po_notes, freight_invoice_notes, shipper_notes,
misc_notes, flag, is_blind_shipment, is_revised, invoice_payment_status, commission_status,
qb_invoice_number, invoice_paid_date (date), commission_paid_date (date),
checklist (jsonb), sales_order_number, created_at, updated_at

### order_split_loads — key fields
id, order_id (FK→orders), description, part_number, qty, buy, sell,
bottle_cost, bottle_qty, mph_freight_bottles,
order_number_override (text, nullable — per-load MPH PO; auto-generated via nextval() on save when separate_po=true),
customer_po (text, nullable — per-load Customer PO, overrides order-level when set),
order_type (text, nullable — per-load Order Type, drives commission eligibility for this load),
ship_date (date, nullable — per-load Ship Date),
wanted_date (date, nullable — per-load Wanted Date),
commission_status (text, default 'Not Eligible' — computed per load from order_type keyword matching),
commission_paid_date (date, nullable — stamped when commission paid for this load),
created_at, updated_at

### vendors table — key fields
id, name, is_active, is_blind_shipment_default (boolean, default false — when true, new orders for this vendor auto-check the Blind Shipment toggle), address (jsonb: {street, city, state, zip}), notes, lead_contact,
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

### dropdown_configs — active types
| type | purpose |
|------|---------|
| CARRIER | Freight carrier names for the freight_carrier field on orders. Seeded with 34 carriers. Fetched via GET /api/dropdown-configs?type=CARRIER (returns { type, values, meta }). Managed via /settings Carriers section (ADMIN only). |
| ORDER_STATUS | Order status values for inline editing on the orders table. Seeded from ORDER_STATUSES constant. Managed via /settings General section (ADMIN only). ORDER_STATUSES const in schema.ts kept for TypeScript type safety but runtime status values come from DB. |

**dropdown_configs.meta** — nullable JSONB column on every dropdown_configs row.
Shape: `{ [label: string]: { color: string } }`. Stores per-label badge colors for
ORDER_STATUS and CARRIER types. Seeded with defaults for all 17 ORDER_STATUS values
and all 34 CARRIER values. Editable via /settings (inline color swatches per item).
GET /api/dropdown-configs returns `{ type, values, meta }`. PUT merges meta — never
nulls it when meta is absent from the request body.

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
{ "name": "", "street": "", "street2": "", "city": "", "state": "", "zip": "", "phone_office": "", "phone_ext": "", "phone_cell": "", "email": "", "email2": "", "shipping_notes": "" }
```
- `street` — primary street address
- `street2` — optional second address line (PO Box, suite, unit, etc.); printed on its own line directly below `street` when present
- `phone_office` — main office/direct line
- `phone_ext` — extension for the office line
- `phone_cell` — mobile number
- `email` — location-specific contact email (e.g. dock scheduler, receiving); distinct from customer_contacts order confirmation emails
- `email2` — second location-specific email
- `shipping_notes` — free text for dock hours, contact titles, appointment instructions, etc.
- `phone_office`, `phone_ext`, `phone_cell`, `email`, `email2` — **Legacy fields.** No longer rendered on the order form or BOL PDF. Retained in the JSONB schema for historical data only. Do not add new form inputs for these keys.

**Legacy records:** older rows may have a `phone` key instead of `phone_office`/`phone_cell`. Display code must fall back to showing `phone` when both `phone_office` and `phone_cell` are absent.

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
`Rebottle`, `Washout`, or `Wash & Return` is eligible. Commission eligibility is only for one salesperson and that is Renee (not Mike, Larry, or Jennifer).

**order_type now lives per split load on order_split_loads** in addition to the order-level
field on orders. Commission eligibility is evaluated per split load based on its own
order_type. The order-level order_type remains for filtering and display on the orders list.

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

**All email uses Microsoft Graph API to create Outlook drafts with PDF attachments.**
Outlook Web deeplinks are no longer used. Graph API allows attaching the PDF automatically.

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
No greeting modal is shown. Greeting name is derived automatically from vendor.name. User email signature is fetched from /api/me (email_signature field) and appended to every draft via createDraft() signature parameter.

### Recipient Rules
- **PO emails to vendors:** To = vendor's po_contacts (primary first), CC = remaining po_contacts + orders@mphunited.com
- **BOL emails to vendors:** To = vendor's bol_contacts (primary first), CC = remaining bol_contacts. orders@mphunited.com is NOT CC'd on BOLs.
- **Customer confirmations:** To = order's customer_contacts field (jsonb [{name, email}], extract emails directly from array)
- **Invoice emails:** To = customer invoice contacts. orders@mphunited.com CC'd on invoices (Phase 2).
- **Weekly schedules:** Open in Outlook Web button on the schedule generation screen (deeplink acceptable here — no PDF attachment needed).
- **Bulk PO email:** All selected orders must be from the same vendor — show error toast if not.

### PO Email Body Spec
PO email body is built by `src/lib/email/build-po-email.ts` — pure function, returns `{ subject, bodyHtml, to, cc }`.

**Subject line:**
| Scenario | Format |
|----------|--------|
| Single order, non-blind | `MPH United PO [order_number] -- [customer_name] \| Ship [MM/DD/YYYY]` |
| Single order, blind | `MPH United PO [order_number] \| Ship [MM/DD/YYYY]` |
| Multiple orders, non-blind | `[count] MPH United POs [order_numbers] \| Multiple Orders` |
| Multiple orders, blind | `[count] MPH United POs [order_numbers] \| Multiple Orders` |

**Intro paragraph:**
- Non-blind: `Please find [order/X orders] below for MPH United / [vendor_name] -- [vendor_city, vendor_state] -- [customer_ship_to_city, customer_ship_to_state] to [customer_name].`
- Blind: `Please find [order/X orders] below for MPH United / [vendor_name] -- [vendor_city, vendor_state].`

**Order table:**
- Non-blind columns: MPH PO | Customer PO | Product/Description | Ship Date | Qty | Unit Price | Total
- Blind columns: MPH PO | Product/Description | Ship Date | Qty | Unit Price | Total
- One row per `order_split_loads` row
- MPH PO = `order_number_override` if set, else `order_number`
- Part number rendered in gold (#B88A44), omitted if null
- Null qty or sell renders as `--`
- Total = qty × sell, formatted as currency

**Below-table fields:**
- Non-blind: Sales Order # (only if not null; always present for Alliance-Hillsboro), Ship Via (freight_carrier), Ship To (ship_to JSONB from first order), PO Notes (only if not null)
- Blind: PO Notes only (if not null)

**Closing paragraph:**
- Single order: `Please confirm receipt of this PO and provide expected ship date at your earliest convenience. Please reference MPH PO # on all correspondence and shipping documents.`
- Multiple orders: `Please confirm receipt of these POs and provide expected ship dates at your earliest convenience. Please reference MPH PO # on all correspondence and shipping documents.`

**Blind shipment rules:**
Hide customer name, Customer PO column, Ship To, and Sales Order # from both subject and body when `is_blind_shipment = true`.

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
- **Ship To box** on the BOL PDF shows name and address only — no contact fields.
- **Contact Information & Delivery Notes section** renders below the Ship To box.
  Pulls ship_to.shipping_notes only. Rendered as a free-text block. Section is
  hidden when shipping_notes is empty or absent.
- **BOL return email:** bol@mphunited.com. Hardcoded in build-bol-pdf.tsx.
  Rendered right-aligned and bold, separated from contact fields by a divider line.

### PO PDF notes
- **Background color:** white (#ffffff). Constant PAGE_BG in build-po-pdf.tsx.
- **Sales Order # field** renders only when vendor.name === 'MPH United / Alliance
  Container -- Hillsboro, TX' (strict equality). Alliance Hillsboro is the only
  vendor that requires it.
- PO PDF has no signature lines.

### product_weights naming convention
- product_name values must exactly match the text returned by bolDescription() from
  order_split_loads.description. Use "Gal" (not "Gallon"), no apostrophe-s, following
  ORDER_TYPES naming. Example: "275 Gal Rebottle IBC" not "275 Gallon Rebottle IBC's".
- Seeded with 17 products. If a BOL weight shows "--", the extracted description does
  not match any product_weights row — check Vercel logs for the exact queried string.

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

A CSR List button on each row of the orders list page opens a checklist popup. CSRs can check and uncheck items directly from the list page without navigating to the order detail page. Each toggle auto-saves immediately via PATCH. The popup also shows a progress count (e.g. 3/5) and a progress bar.

**Checklist save ownership:** The checklist column is saved exclusively through ChecklistPopup (in order-row.tsx), which sends PATCH with `{ checklist: updated }` as the only body field. The edit page OrderChecklist component manages local checklist state for display but does not independently PATCH the checklist column — that responsibility belongs to the popup only.

---

## 14. Recycling Orders

Recycling orders are a **separate section** of the app (`/recycling`). They share
customers, vendors, and users tables but have their own schema, routes, and status workflow.
It may be better to have two separate tables for Recycling Drums and Recycling IBCs since these are also different.

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
Flag | MPH PO | Status | Sales/CSR | Customer | Customer PO | Description | Qty |
Ship Date | Wanted Date | Vendor | Buy | Sell | Ship To | Carrier | Actions

Rules:
- Flag column shows flag icon; clickable to toggle; lucide Flag icon, gold filled when true, gray outline when false.
- **MPH PO number cell is a button** — clicking it opens the Order Summary Drawer (Sheet, right side). It does NOT navigate to the edit page. The Edit link is inside the drawer header.
- **Actions cell hover pencil** — hovering any order row reveals a Pencil icon in the Actions cell (opacity-0 → opacity-100 on group-hover; `group` class on `<tr>`). Clicking it navigates directly to /orders/[orderId]. The drawer open behavior on MPH PO click is unchanged.
- **Status** renders as a colored pill badge (color from dropdown_configs.meta for ORDER_STATUS).
  Non-SALES roles see an inline-editable Select; SALES role sees a read-only badge.
  The status select element renders with its badge color as inline background and text color styles, using getBadgeColor() and getBadgeTextColor() from src/lib/orders/badge-colors.ts.
- **Carrier** renders as a colored pill badge (color from dropdown_configs.meta for CARRIER).
  Dash if freight_carrier is null.
- Sales/CSR column shows "FirstName / FirstName" format; two CSRs shown as "First / First2".
- **Customer PO cell** shows a small badge below the Customer PO value: "Wash & Return" (gold: bg-[#B88A44]/15 text-[#B88A44]) when any split load's order_type contains "Wash & Return"; "Split Load" (muted) when there are 2+ split loads and none are Wash & Return; nothing otherwise. Derived from the split_loads array already returned by GET /api/orders.
- **Ship To cell** shows ship_to.name on the first line and city, state on the second line in text-xs text-muted-foreground. Renders — when ship_to is null.
- Actions column: Pencil icon (hover-revealed via group-hover, navigates to /orders/[orderId]), Duplicate copy icon (always visible).
- Table supports multi-select for bulk Email POs / Email BOLs actions.
- **Each order row is expandable** via a chevron icon. Expanded view renders a single
  colSpan cell containing one card per split load. Card style: bg-muted/40 rounded-md p-3
  border-l-4 border-[#B88A44]. Grid inside: grid-cols-2 gap-x-6 gap-y-1 text-sm.
  "Load N" label only shown when 2+ loads exist. Fields shown: Load PO, Order Type,
  Description (col-span-2), Qty, Buy, Sell, Ship Date, Wanted Date.
  Commission status and bottle fields are NOT shown in the expanded row (not returned by
  list API — use the Order Summary Drawer for full detail).
  Do NOT attempt to align expanded row cells to parent column widths.

**Order Summary Drawer** — Sheet component, side="right", w-[520px]. Triggered by
clicking the MPH PO number. Fetches from GET /api/orders/[orderId] on open. Clears
stale data immediately on orderId change. Loading spinner while fetching; error + retry
on failure. Sections: Order Info grid, Ship To / Bill To addresses, Order Contacts,
Split Loads (full fields including commission status and bottle fields), Freight & Costs
(only if non-zero), Notes (only if populated). Edit Order link in drawer header.

**Filter bar** — two always-visible rows (no More Filters toggle, no hidden filters):
- Row 1: Search field | lifecycle pills (Active / Complete / Flagged / All) | Status multi-select
- Row 2: Customer multi-select | Vendor multi-select | CSR multi-select | Salesperson multi-select | Ship Date range
Both rows flex-wrap for graceful degradation on smaller screens. No Cancelled lifecycle pill.

Each order row in the MPH PO cell contains two small action buttons rendered below the order number: CSR List — opens a popup modal showing the order's checklist items with checkboxes; auto-saves each item to orders.checklist via PATCH on toggle. Notes — opens a popup modal showing and editing po_notes, freight_invoice_notes, and misc_notes; requires explicit Save button. Both popups fetch order data from GET /api/orders/[orderId] on open.

List API (GET /api/orders) returns csr2_name alongside csr_name.

Filters available:
- Search: order number, customer, vendor, customer PO, description, split-load override PO
- Status: multi-select (values from dropdown_configs ORDER_STATUS type)
- Lifecycle: Active (not Complete/Cancelled) | Complete | All
- Customer: multi-select
- Vendor: multi-select
- CSR: multi-select
- Salesperson: multi-select
- Ship date: range
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
| /orders | Ongoing orders table with full server-side filtering + pagination | 1 — Done |
| /orders/new | New order form | 1 — Done |
| /orders/[orderId] | Order detail, edit, PO, BOL, checklist, duplicate | 1 — Done |
| /recycling | Coming Soon placeholder | 1 — Placeholder only; full feature not yet built |
| /recycling/new | New recycling order form | 1 |
| /recycling/[id] | Recycling order detail and edit | 1 |
| /customers | Customer list | 1 — Done |
| /customers/[customerId] | Customer detail and contacts editor | 1 — Done |
| /vendors | Vendor list | 1 — Done |
| /vendors/[vendorId] | Vendor detail, contacts, checklist template | 1 — Done |
| /schedules | Weekly schedule generation | 1 — Done (Graph API email, auto-attached PDF) |
| /commission | Commission report rebuilt around order_split_loads. One row per eligible split load. Filters: salesperson (commission_eligible only, auto-selects Renee), commission status (unpaid/paid/all), invoice payment status, ship date range, commission paid date range. Columns: Vendor, Customer, Sales/CSR, MPH PO (clickable link), Customer PO, Description, Ship Date, Qty, Invoice Status, Invoice Paid Date, Comm Paid Date. Footer: total selected qty + commission amount (qty × $3). Mark Commission Paid stamps split load rows. | 1 — Done |
| /settings | Admin settings | 1 |
| /team | User management — ADMIN only, manages title/phone/email_signature/role/can_view_commission/permissions | 1 — Done |
| /api/orders | GET orders with server-side filtering + pagination; POST new order | 1 — Done |
| /api/orders/[orderId] | GET order detail | 1 — Done |
| /api/orders/[orderId]/po-pdf | GET PO PDF | 1 — Done |
| /api/orders/[orderId]/bol-pdf | GET BOL PDF | 1 — Done |
| /api/orders/duplicate/[orderId] | POST duplicate order | 1 — Done |
| /api/customers | GET customer list | 1 — Done |
| /api/vendors | GET vendor list | 1 — Done |
| /api/users | GET users list; ?permission=SALES\|CSR filters by permissions jsonb | 1 — Done |
| /api/me | GET current user id/name/email/role/email_signature | 1 — Done |
| /api/dropdown-configs | GET dropdown values by type; ?type=CARRIER\|ORDER_STATUS returns string[]. PUT replaces full array for a type (ADMIN only). | 1 — Done |
| /api/orders/check-po | GET ?number=X — returns { exists: boolean }; checks PO number uniqueness for manual entry mode. Auth required. | 1 — Done |
| /api/orders/next-po-preview | GET ?initials=XX — returns { preview: string } next sequence PO WITHOUT consuming it (uses pg_sequence_last_value). | 1 — Done |
| /api/schedules/admin-pdf | POST admin schedule PDF | 1 — Done |
| /api/schedules/vendor-pdf | POST vendor/Frontline schedule PDF | 1 — Done |
| /api/commission | GET commission data, role-filtered | 1 — Done |
| /api/commission/mark-paid | POST bulk mark commission paid | 1 — Done |

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
11. ✅ COMPLETE — Schedules page — admin/vendor/Frontline schedule PDFs + Graph API email with auto-attached PDF, recipients from DB
    ✅ COMPLETE — Email POs via Graph API (order detail page + bulk from orders table)
    ✅ COMPLETE — Email BOLs via Graph API (order detail page + bulk from orders table)

### Recycling
12. Recycling orders table + new recycling order form + detail page

### Reports and admin
13. ✅ COMPLETE — Commission report page — rebuilt around order_split_loads. Per-load commission tracking, mark-paid workflow, salesperson filter (commission_eligible only), status/invoice/date filters.
14. Invoicing queue
15. ✅ COMPLETE (partial) — Admin/settings page — Carriers section (CARRIER type in dropdown_configs) and Order Statuses section (ORDER_STATUS type) built and working. Company settings / order number sequence management not yet built. Both sections include inline color swatches per item: clicking a swatch opens a native color picker; color changes update the swatch in real time; a "Save Colors" button appears only when colors are dirty and calls PUT /api/dropdown-configs with the updated meta. New items default to #6b7280; deleted items are removed from meta.
16. Dashboard (hero stats, status distribution, weekly chart)
17. Financial snapshot (admin only)

### Data migration
18. Import last 12 months from Excel
19. ✅ COMPLETE — Team/user management page (ADMIN only — title, phone, email_signature, role, can_view_commission, permissions)
20. ✅ COMPLETE — Orders table filters and search (server-side filtering + pagination on GET /api/orders; filter bar UI with lifecycle pills, multi-select dropdowns, flag toggle, More Filters collapsible, date range, search)
21. ✅ COMPLETE — Auth trigger (on_auth_user_created) syncing auth.users → public.users on first SSO login. Applied via Supabase MCP. Tracked in drizzle/0010_auth_user_sync_trigger.sql.
22. ✅ COMPLETE — Freight carrier dropdown from dropdown_configs (type=CARRIER, seeded with 34 carriers). Both new-order-form and order edit page use Select.
23. ✅ COMPLETE — Salesperson/CSR order form dropdowns filtered by permissions field (?permission=SALES and ?permission=CSR via GET /api/users).
24. ✅ COMPLETE — Users seeded: 15 users with correct UUIDs, roles, and permissions. Roles and permissions set in Supabase Studio.
25. ✅ COMPLETE — Customers seeded: 192 customers imported.
26. ✅ COMPLETE — Vendors seeded: 32 vendors. Naming convention: "MPH United / [Vendor Name] -- [City, State]".
27. ✅ COMPLETE — Recycling placeholder page at /recycling ("Coming Soon").
28. ✅ COMPLETE — Per-load commission tracking on order_split_loads (commission_status, commission_paid_date per load; order-level derived for backward compat).
29. ✅ COMPLETE — Per-load MPH PO, Customer PO, Order Type, Ship Date, Wanted Date added to order_split_loads. Inline expand on orders table shows per-load detail rows.
30. ✅ COMPLETE — Commission report rebuilt around split loads (one row per eligible load, mark-paid workflow, new filter controls).
31. ✅ COMPLETE — Carriers management in /settings (CARRIER type in dropdown_configs via CarriersSection component).
32. ✅ COMPLETE — Order Status management in /settings General section (ORDER_STATUS type via OrderStatusesSection; inline status editing on /orders table reads from DB).
33. ✅ COMPLETE — is_commission_eligible boolean on users table. API and UI filter correctly.
34. ✅ COMPLETE — Manual PO entry mode for historical order import (ADMIN and CSR toggle on New Order form; GET /api/orders/check-po uniqueness check; GET /api/orders/next-po-preview preview endpoint; Invoice Number field shown alongside MPH PO Number in manual mode).
35. ✅ COMPLETE — is_blind_shipment_default boolean on vendors table. Vendor detail page toggle ("Blind Shipment by Default"). New Order form auto-checks Blind Shipment toggle on vendor selection. 8 vendors seeded with default = true.
36. ✅ COMPLETE — Split load date pre-fill: ship_date and wanted_date auto-populate from Load 1 when adding a 2nd+ split load on New Order form and Edit Order page. Fields remain fully editable per load.
37. ✅ COMPLETE — Ship To / Bill To address fields expanded: Street 2, Office Phone, Ext, Cell, Email 1, Email 2 added to OrderAddressFields component and addressSchema. Legacy `phone` key preserved for backward compatibility on display. Split load dates consolidated to order-level: Load 2+ show read-only date display instead of editable inputs.

---

## 19. Security Posture

### Current State (as of April 22, 2026)

**Architecture:** Server-side only. All database queries run through Next.js API routes
using the Supabase service role key via Drizzle ORM. No direct client-side database access.
The only client-side Supabase usage is authentication (`login/page.tsx` and `auth/callback/route.ts`).

**Row Level Security:** Enabled on all 11 public tables:
`users`, `orders`, `customers`, `vendors`, `bills_of_lading`, `recycling_orders`,
`order_split_loads`, `audit_logs`, `company_settings`, `dropdown_configs`, `product_weights`.

All tables have a "Service role full access" policy scoped to `service_role` only.
Direct public/anon access to all tables is blocked at the database level.

Supabase security advisor: zero critical errors. One warning (leaked password protection)
is not applicable — the app uses Microsoft SSO only, no email/password auth.

### Future Requirement: Multi-Tenant (MPH + Harding National)

When Harding National is onboarded as a second tenant:
- The current service_role-only policies must be **replaced** with tenant-aware RLS policies
  that enforce row-level isolation between MPH United and Harding National data.
- This must happen **before** any Harding National data is added to the database.
- A `company_id` column and RLS predicates will be required on all shared tables.
- Architecture rules in Section 4 prohibiting `company_id` will need to be revised at that time.

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
| RLS | Enabled on all 11 public tables as of April 22, 2026. "Service role full access" policies scoped to service_role only. Direct public/anon access blocked at DB level. When Harding National is added as a second tenant, replace with tenant-aware RLS policies before adding their data. |
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
| Outlook schedule email attachment | Resolved. Schedule emails now use Graph API draft flow with PDF auto-attached, same as PO and BOL emails. |
| MSAL popup auth | @azure/msal-browser pinned to 4.28.1. v5 has a confirmed bug where popup flow times out. Do not upgrade. Redirects to /msal-callback (blank page, isolated layout). |
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
| Outlook draft signatures | Graph API cannot read Outlook signatures. Signatures stored in users.email_signature, managed on /team page, appended automatically to all drafts via createDraft() signature parameter. |
| PO PDF signature lines | Removed from PO PDF. |
| Two CSRs per order | csr2_id added to orders table. Order form and edit page have optional CSR 2 dropdown. Schedule PDFs show both first names as First1 / First2. |
| Vendor blind shipment default | is_blind_shipment_default boolean on vendors (default false). When a CSR selects a vendor on the New Order form, is_blind_shipment is auto-set to the vendor's default. The toggle remains fully editable; changing vendor re-applies the default. 8 vendors seeded with default = true: all 6 MPH United / Core locations (Calhoun GA, Houston TX, Nashua IA, Shreveport LA, South Holland IL, Waterloo IA), MPH United / Eco Green -- Houston TX, and MPH United / TLD (Ted Levine Drum Co) -- South El Monte CA. |
| permissions field on users | jsonb array (default []) controlling which order-form role dropdowns a user appears in, independent of their app role. Values: "SALES" \| "CSR". Salesperson dropdown → ?permission=SALES; CSR dropdown → ?permission=CSR. Managed on /team page by ADMIN. |
| Vendor naming convention | All vendor names use format: "MPH United / [Vendor Name] -- [City, State]". 32 vendors seeded. |
| dropdown_configs CARRIER type | freight_carrier field on orders is a Select populated from dropdown_configs where type='CARRIER'. Values are a jsonb string[] on the single CARRIER row. Seeded with 34 freight carriers in Supabase Studio. API: GET /api/dropdown-configs?type=CARRIER. |
| Auth trigger on_auth_user_created | Fires AFTER INSERT on auth.users. Inserts into public.users with correct UUID, email, name (priority: full_name → given_name+family_name from custom_claims → email), role=CSR, is_active=true. Applied via Supabase MCP (pooler lacks auth schema DDL permission). Tracked in drizzle/0010_auth_user_sync_trigger.sql. Do NOT re-apply via drizzle-kit. |
| Entra SSO token name fields | Require profile scope in signInWithOAuth call. full_name at top level of raw_user_meta_data. given_name and family_name nested under raw_user_meta_data->'custom_claims'. |
| inviteMember function | src/actions/team.ts uses supabase.auth.admin.inviteUserByEmail() (requires SUPABASE_SERVICE_ROLE_KEY). Direct insert into public.users removed — the on_auth_user_created trigger handles sync on first login. |
| Sign-out bug in development | Sign-out does not work reliably on localhost. Use incognito window as workaround. Not yet fixed. |
| Per-load commission_status | commission_status and commission_paid_date live on order_split_loads. Order-level commission_status is derived (any eligible load → Eligible; all paid → Commission Paid; else Not Eligible) and kept for backward compatibility and orders table filtering. |
| Split load MPH PO | order_split_loads.order_number_override stores per-load PO. Auto-generated via nextval() on save only. Preview uses pg_sequence_last_value without consuming sequence (GET /api/orders/next-po-preview). |
| Split load Ship Date / Wanted Date | Ship Date and Wanted Date are order-level fields. All split loads share the same dates — loads never ship on different dates. Dates are saved at the order level (from the order form's Ship Date / Wanted Date fields) and stamped onto every order_split_loads row at save time. On the New Order and Edit Order forms, Load 1 shows editable date inputs. Load 2+ show read-only displays of the order-level dates — no separate inputs. The order-split-loads-editor.add() function initializes new loads with orderShipDate / orderWantedDate from order-level props, not from Load 1's local state. |
| Split load Customer PO | order_split_loads.customer_po overrides order-level customer_po when set. Load 1 defaults to order-level value on the form. |
| ORDER_STATUS in dropdown_configs | Order statuses seeded into dropdown_configs type=ORDER_STATUS. UI reads from DB at runtime via GET /api/dropdown-configs?type=ORDER_STATUS. Managed via /settings General section. ORDER_STATUSES const in schema.ts kept for TypeScript type safety but runtime values come from DB. |
| Manual PO entry mode | Available to ADMIN and CSR roles. Toggle on New Order form bypasses sequence. Accepts plain numbers (12345) or prefixed (PM-MPH12345). Server-side validates role (ADMIN|CSR) and uniqueness. Used for historical order import. |
| Invoice Number in manual mode | When manual PO mode is active, an Invoice Number field (mapped to qb_invoice_number) appears to the right of MPH PO Number. Optional — can be left blank. Cleared automatically when manual mode is toggled off. Not shown outside manual mode (qb_invoice_number on the edit page is the canonical place for non-import orders). |
| Commission report salesperson filter | Fetches /api/users?commission_eligible=true. Auto-selects first eligible user (Renee) on load for ADMIN/ACCOUNTING. Non-eligible salespersons never appear in dropdown. |
| Flag This Order / Revised PO | Not on New Order form. Set on Edit Order page only. |
| Blind Shipment on New Order form | Toggle is in the Customer & Vendor section, second row under Vendor dropdown. |
| Split load date pre-fill | Removed as a separate concept. Load 2+ date fields are read-only displays of the order-level Ship Date / Wanted Date. No pre-fill logic needed. |
| Color picker in settings | Input type="color" is used directly as the visible swatch. The hidden input + ref click pattern was removed — it did not reliably fire onChange across browsers. |
| PO PDF background | White (#ffffff). Constant PAGE_BG in build-po-pdf.tsx. |
| Sales Order # on PO | Only rendered when vendor.name === 'MPH United / Alliance Container -- Hillsboro, TX'. Strict equality. |
| BOL product_weights naming | product_name must match bolDescription() output exactly. Use Gal not Gallon, no apostrophe-s. If weight shows --, check that the extracted description matches a row in product_weights. Check Vercel logs for "[BOL PDF] keys going into inArray:" to see the exact string being queried. |
| BOL Contact Information & Delivery Notes | Renders below Ship To box. Pulls ship_to.shipping_notes only. Free-text block. Hidden when shipping_notes is empty or absent. Ship To box shows name and address only. |
| BOL email address | bol@mphunited.com. Hardcoded in build-bol-pdf.tsx. Right-aligned, bold, separated from contact fields by a divider line inside the Contact Information & Delivery Notes section. |
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

*Last updated: April 24, 2026 — per-load fields added to order_split_loads (customer_po, order_type, ship_date, wanted_date, commission_status, commission_paid_date); commission report rebuilt around split loads with expanded filters and columns; is_commission_eligible added to users; ORDER_STATUS type added to dropdown_configs; /settings page built with Carriers and Order Statuses sections; inline status editing on orders table; orders table expandable rows showing per-load detail; GET /api/orders/check-po and next-po-preview routes added; manual PO entry mode for historical import (ADMIN); PUT /api/dropdown-configs added; salesperson SelectValue bug fixed in commission filters.*

*Last updated: April 24, 2026 — Ship To / Bill To address fields expanded (street2, phone_office, phone_ext, phone_cell, email, email2); split load dates consolidated to order-level (Load 2+ read-only display, no separate date inputs); address JSONB shape updated in schema comments.*

*Prior: April 23, 2026 — permissions jsonb column added to users (controls order-form salesperson/CSR dropdowns independently of app role; seeded for 15 users); freight_carrier changed from text Input to Select populated from dropdown_configs CARRIER type (34 carriers seeded); GET /api/users now accepts ?permission= filter; GET /api/dropdown-configs route created; on_auth_user_created auth trigger applied via Supabase MCP (tracks full_name → custom_claims → email priority); inviteMember fixed to use supabase.auth.admin.inviteUserByEmail; orders table server-side filters and search fully built; recycling placeholder page added; 192 customers and 32 vendors seeded.*
*This document should be updated whenever significant decisions are made or scope changes.*
*Retire: New_MPH_Order_Management_App.docx and MPH-OMS-HANDOFF.md once this file is committed to the repo.*
