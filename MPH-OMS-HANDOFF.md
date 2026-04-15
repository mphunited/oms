# MPH United Order Management System — Complete Handoff

**Last updated: April 15, 2026**

---

## WHO IS JACK

Jack Schlaack is the IT and operations lead at MPH United, an IBC (Intermediate Bulk Container) business based in Fairhope, Alabama. He manages the Microsoft 365 environment and handles technical infrastructure. He is not a professional developer but has strong technical aptitude — he's managed SharePoint, Power Automate, Exchange, Power Apps, and built an HTML-based order management prototype. He uses Claude Code as his primary AI development tool and Claude.ai (jack@mphunited.com, MPH United Team plan) for architecture guidance.

## WHO IS KEITH

Keith is Jack's coworker and collaborator on internal software development at MPH United. He has some Python knowledge but primarily uses AI for 90% of coding. He uses Claude Code and Context7. Both Jack and Keith push/pull from the same GitHub repo. Keith's availability is variable — Jack can proceed independently when Keith is unavailable.

---

## THE PROJECT

Build a custom order management system (OMS) for MPH United to replace their current shared Excel workbook. The system handles IBC orders — purchase orders to vendors, bills of lading for shipping, invoicing to customers, and margin/revenue tracking. Approximately 10 remote users on a mix of Mac and PC. Processing 150–500 orders per month.

**This is MPH United only. Single-tenant. No company_id columns anywhere. No multi-tenant architecture.**

---

## THE EXISTING PROTOTYPE

An HTML single-file application (13,400 lines, 263 functions) exists as the functional prototype. It has 8 tabs: Dashboard, Ongoing Orders, Add Order, Financials, Invoicing, Resources, Forum, Admin. It stores data in localStorage (single-user only).

File location in repo: `reference/mph_order_app_forum_tab_ongoing_updates_desc_toggle_no_margin_partnum_in_full_only.html`

Claude Code reads this file as a UI reference when building components. The prototype is NOT complete — it is missing some fields and features. Use it as a starting point, not a final spec. This HANDOFF document and CLAUDE.md are the authoritative requirements.

---

## TECHNOLOGY STACK (ALL DECISIONS FINAL)

| Layer | Technology |
|-------|------------|
| Language | TypeScript (full stack) |
| Framework | Next.js 16 (React frontend + API routes) |
| Database | Supabase (managed PostgreSQL + auth + real-time + storage) |
| ORM | Drizzle ORM — Prisma was removed due to Supabase pooler incompatibility |
| Hosting | Vercel (Pro seat for Jack at $20/mo, Keith is free viewer) |
| UI Components | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| PDFs | React-PDF (@react-pdf/renderer) |
| QBO Integration | node-quickbooks (Phase 2) |
| Email (Phase 2) | Resend |
| Auth | Supabase Auth with Microsoft Entra SSO |
| Repository | github.com/mphunited/oms |
| Code Editor | VS Code |

---

## ACCOUNTS & INFRASTRUCTURE

- **GitHub**: github.com/mphunited/oms — working
- **Supabase**: MPH OMS Project — connected, all tables created and verified
- **Vercel**: connected to GitHub repo — deploying successfully as of April 15, 2026
- **Intuit Developer**: account created (QBO sandbox — Phase 2)
- **Azure App Registration**: MPH OMS app registered — Entra SSO working

---

## CURRENT STATUS (April 15, 2026)

### Done
- Next.js 16 scaffold with TypeScript, Tailwind CSS, shadcn/ui
- Drizzle ORM installed and configured — connects to Supabase via Transaction Pooler (port 6543)
- Full database schema verified in Supabase — 9 tables, all correct
- schema.ts corrected to match actual Supabase schema (single-tenant, correct field names)
- Supabase Auth working with Entra SSO — employees sign in with Microsoft accounts
- All Phase 1 routes scaffolded with placeholder pages
- Sidebar navigation working
- HTML prototype in /reference/ folder
- CLAUDE.md conventions file in repo root
- Vercel connected and deploying green

### In Progress
- Orders page — API route and UI components generated, needs review and testing

### What's Next (Priority Order)
1. Verify Orders page works locally (npm run dev → localhost:3000/orders)
2. Build Add/Edit Order form — all fields, split loads, live margin indicator
3. Build Customers page — list and detail
4. Build Vendors page — list and detail
5. PO PDF generation
6. BOL PDF generation
7. Weekly Schedule PDFs

---

## LOCAL DEVELOPMENT

```bash
git clone https://github.com/mphunited/oms.git
cd oms
npm install
cp .env.example .env.local
# Fill in Supabase credentials
npm run dev
# Visit http://localhost:3000
```

### Required .env.local Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

**Use Transaction Pooler (port 6543) only. No DIRECT_URL needed.**

---

## DATABASE SCHEMA

All tables are in Supabase. Schema managed via Drizzle at `src/lib/db/schema.ts`.

**CRITICAL: No company_id columns anywhere. Single tenant. No companies table. No company_members table.**

### Tables

| Table | Purpose |
|-------|---------|
| users | Employee accounts — synced from Entra SSO |
| customers | Customer profiles |
| vendors | Vendor profiles |
| orders | Core order records — all pricing fields live here directly |
| order_split_loads | Split load line items (child of orders — used for multi-vendor splits only) |
| bills_of_lading | BOL records linked to orders |
| company_settings | MPH United company profile (singleton row) |
| dropdown_configs | Configurable dropdown lists |
| audit_logs | Immutable change log |

### IMPORTANT: Where Pricing Lives

Pricing fields (`qty`, `buy_price`, `sell_price`, `freight_cost`, `freight_to_customer`, `bottle_cost`, `bottle_qty`, `mph_freight_bottles`, `additional_costs`) live **directly on the `orders` table** — NOT on a separate line items table.

`order_split_loads` is only used when a single order has multiple vendors/loads (split loads). For the vast majority of orders it will have zero rows.

Do NOT reference a table called `order_line_items` — it does not exist.

### Orders Table — Full Field List

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| order_number | text UNIQUE | MPH PO — auto-generated from ~11415, displayed as 'MPH PO' in UI |
| order_date | date | |
| order_type | text | Bottle, Rebottle IBC, Washout IBC, Drums, Parts |
| customer_id | uuid FK | → customers |
| vendor_id | uuid FK | → vendors |
| salesperson_id | uuid FK | → users (NOT a text dropdown) |
| csr_id | uuid FK | → users (NOT a text dropdown) |
| status | text | See status values below |
| customer_po | text | Customer's PO number |
| description | text | |
| part_number | text | |
| qty | numeric | |
| buy_price | numeric | Cost per unit |
| sell_price | numeric | Sale price per unit |
| freight_cost | numeric | MPH freight cost |
| freight_to_customer | numeric | Freight charged to customer |
| additional_costs | numeric | Default 0 — use misc_notes to explain |
| bottle_cost | numeric | Cost per bottle (if applicable) |
| bottle_qty | numeric | Bottle quantity (if applicable) |
| mph_freight_bottles | numeric | MPH freight for bottles |
| freight_carrier | text | |
| ship_date | date | |
| wanted_date | date | |
| ship_to | jsonb | Address object |
| bill_to | jsonb | Address object |
| customer_contacts | jsonb | Contact array |
| terms | text | PPD, PPA, FOB |
| appointment_time | timestamp | |
| appointment_notes | text | |
| po_notes | text | |
| freight_invoice_notes | text | |
| shipper_notes | text | |
| misc_notes | text | Also explains additional_costs |
| flag | boolean | Default false |
| invoice_payment_status | text | NOT NULL DEFAULT 'Not Invoiced' — values: Not Invoiced, Invoiced, Paid |
| commission_status | text | NOT NULL DEFAULT 'Not Eligible' — values: Not Eligible, Eligible, Commission Paid |
| qb_invoice_number | text | Manual entry from QuickBooks |
| created_at | timestamp | |
| updated_at | timestamp | |

### Order Status Values
Pending, Waiting On Vendor To Confirm, Waiting To Confirm To Customer, Confirmed To Customer, Rinse And Return Stage, Sent Order To Carrier, Ready To Ship, Ready To Invoice, Complete, Cancelled

### Users Table

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | Mirrors Supabase auth.users UUID — no defaultRandom() |
| email | text | |
| name | text | |
| avatar_url | text | |
| entra_id | text | Microsoft Entra ID |
| role | text | DEFAULT 'CSR' — values: ADMIN, CSR, SALESPERSON, ACCOUNTING, WAREHOUSE |
| is_active | boolean | |
| created_at | timestamp | |

---

## MARGIN FORMULA

```
Profit = (sell_price - buy_price) × qty
       + freight_to_customer
       - freight_cost
       - (bottle_cost × bottle_qty)
       - ((mph_freight_bottles / 90) × bottle_qty)
       - (qty × $3 if commission-eligible order type)
       - additional_costs

Profit % = Profit ÷ ((sell_price × qty) + freight_to_customer)
```

**Red indicator threshold: Profit % < 8%**

Commission-eligible order types: Bottle, Rebottle IBC, Washout IBC
NOT eligible: Drums, Parts

---

## COMMISSION SYSTEM

- Salesperson: Renee only (currently)
- Rate: $3 per unit
- Eligible when: customer pays invoice (not when invoice is sent)
- Payroll: biweekly
- Commission report filters: invoice paid + commission not yet paid + eligible order type
- After payroll: orders marked 'Commission Paid'
- Phase 1: manual invoice paid marking in app
- Phase 2: QBO integration auto-marks when payment confirmed

---

## EMAIL WORKFLOW

All emailing in Phase 1 uses Outlook Web deeplinks — NOT mailto: links (fixes Mac compatibility).

Pattern:
```
https://outlook.office.com/mail/deeplink/compose?to=vendor@email.com&cc=orders@mphunited.com&subject=...&body=...
```

orders@mphunited.com is always CC'd on POs and invoices.

Phase 2: Resend for direct one-click sending from the app.

---

## APPLICATION ROUTES

| Route | Page | Status |
|-------|------|--------|
| /login | Sign in with Microsoft | Working (Entra SSO) |
| /dashboard | Redirect to /orders | Working |
| /orders | Ongoing orders table | In progress |
| /orders/new | Add new order | Not started |
| /orders/[orderId] | Order detail/edit | Not started |
| /customers | Customer list | Placeholder |
| /customers/[customerId] | Customer detail | Placeholder |
| /vendors | Vendor list | Placeholder |
| /vendors/[vendorId] | Vendor detail | Placeholder |
| /financials | Financial reports | Placeholder |
| /invoicing | Invoice queue | Placeholder |
| /settings | Admin/settings | Placeholder |
| /team | User management | Placeholder |

Forum and Resources are Phase 2.

---

## USER ROLES

| Role | Who | What They Can Do |
|------|-----|-----------------|
| ADMIN | Jack | Everything — all features, user management, settings, financial data |
| CSR | Christina, Jordan, Keith, Gracie | Create/edit orders, POs, BOLs, manage customers/vendors |
| SALESPERSON | Renee + 3 others | View their own orders only, personal dashboard |
| ACCOUNTING | TBD | Invoice management, payment tracking, commission reports |
| WAREHOUSE | TBD | BOL creation, shipment status updates |

---

## DOCUMENT GENERATION

| Document | DB Table? | How Accessed |
|----------|-----------|--------------|
| Purchase Order (PO) | No | Button inside Order detail — PDF from order data |
| Bill of Lading (BOL) | Yes — bills_of_lading | Button inside Order detail |
| Invoice | Phase 2 | Generated from order |

## WEEKLY SCHEDULES

**Weekly Schedule (owners/admin):** All orders grouped by vendor. Columns: Vendor, Salesperson/CSR, MPH PO, Customer PO, Description, Qty, Ship Date, Buy, Customer, Freight, Ship To. Includes financial data.

**Frontline Schedule (vendors):** No buy price, no freight cost. Can be filtered to specific vendor. Columns: Vendor, Salesperson/CSR, MPH PO, Customer PO, Description, Qty, Ship Date, Appt. Time, Customer, Ship To.

Both: date range selector (default Mon–Fri current week), total shipment count, 'Open in Outlook Web' button.

---

## PHASE 1 BUILD ORDER

### Immediate
1. ~~Complete Entra SSO~~ ✓ Done
2. ~~Replace login with Microsoft button~~ ✓ Done
3. ~~Connect Vercel~~ ✓ Done
4. Orders page — ongoing orders table with filters and pagination
5. Add/Edit Order form — all fields, split loads, live margin indicator
6. Customers page — list and detail
7. Vendors page — list and detail
8. PO PDF generation
9. BOL PDF generation
10. Weekly Schedule PDFs

### Later Phase 1
- Dashboard (hero stats, charts)
- Financials tab
- Commission report
- Admin/Settings page
- Data import from Excel (last 12 months)
- Team/user management

---

## PHASE 2 FEATURES (AFTER LAUNCH)
- QuickBooks Online integration
- Invoice PDF generation and queue
- Resend email integration
- Forum and Resources tabs
- Audit log UI
- Mobile optimization
- Salesperson online forms
- Email notifications

---

## IMPORTANT DESIGN DECISIONS

1. **Single company (MPH United)** — no multi-tenant architecture, no company_id anywhere
2. **No RLS policies** — single company, trusted internal employees
3. **Entra SSO from day one** — Microsoft 365 accounts only
4. **Pricing lives on orders table** — not on a line items table. order_split_loads is for split-load scenarios only
5. **salesperson_id and csr_id are UUID FKs to users** — NOT text dropdowns
6. **invoice_payment_status lives on orders** — NOT derived from a separate invoices table join. Values: Not Invoiced, Invoiced, Paid
7. **Outlook Web deeplinks instead of mailto:** — fixes Mac compatibility
8. **order_number = MPH PO** — same thing, displayed as 'MPH PO' in UI
9. **Forum and Resources are Phase 2** — don't delay launch
10. **QBO integration is Phase 2** — manual invoice number entry in Phase 1
11. **Run both systems in parallel** — don't turn off Excel until app proves itself 2–4 weeks
12. **Get one CSR testing by week 6–7** — don't wait until launch for feedback
13. **Prototype is reference only** — it is incomplete, this HANDOFF is the spec

---

## COLLABORATION MODEL

- Jack and Keith both use Claude Code pointed at the oms folder
- Context7 MCP installed in Claude Code for library documentation
- Both push/pull from github.com/mphunited/oms
- CLAUDE.md in project root provides conventions for Claude Code
- Work is split by feature to avoid merge conflicts
- Daily check-ins on what each person is building

---

## KEY FILES

| Path | Purpose |
|------|---------|
| MPH-OMS-HANDOFF.md | This file — authoritative requirements |
| CLAUDE.md | Claude Code conventions — read at start of every session |
| src/lib/db/schema.ts | Drizzle schema — must match Supabase exactly |
| src/lib/db/index.ts | Drizzle client |
| drizzle/ | Migration SQL files |
| reference/ | HTML prototype — UI reference only |
| src/app/(dashboard)/ | All authenticated app pages |
| src/app/login/ | Login page |
| src/components/layout/ | Sidebar, header, nav |
| src/config/nav.ts | Navigation items |
