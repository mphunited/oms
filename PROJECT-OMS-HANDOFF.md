# MPH United Order Management System — Complete Handoff

## WHO IS JACK

Jack Schlaack is the IT and operations lead at MPH United, an IBC (Intermediate Bulk Container) business based in Fairhope, Alabama. He manages the Microsoft 365 environment and handles technical infrastructure. He is not a professional developer but has strong technical aptitude — he's managed SharePoint, Power Automate, Exchange, Power Apps, and built an HTML-based order management prototype. He will be using Claude Desktop App (Code tab + Cowork tab) as his primary AI development tool. His Claude account is jack@mphunited.com on the MPH United Team plan.

## WHO IS KEITH

Keith is Jack's coworker and collaborator on internal software development at MPH United. He has some Python knowledge but primarily uses AI (ChatGPT/Codex) for 90% of coding. He will use ChatGPT and Codex as his AI tools, pushing code to the same GitHub repo as Jack. Keith is available starting tomorrow afternoon (April 14, 2026) and will be the second builder on this project.

## THE PROJECT

Build a custom order management system (OMS) for MPH United to replace their current shared Excel workbook. The system handles IBC orders — purchase orders to vendors, bills of lading for shipping, invoicing to customers, and margin/revenue tracking. Approximately 10 remote users on a mix of Mac and PC. Processing 150–500 orders per month.

**This is MPH United only. Do not include multi-tenant architecture, company_id columns, or company switchers.**

## THE EXISTING PROTOTYPE

An HTML single-file application (13,400 lines, 263 functions) exists as the functional prototype. It has 8 tabs: Dashboard, Ongoing Orders, Add Order, Financials, Invoicing, Resources, Forum, Admin. It stores data in localStorage (single-user only). The file should be placed in the repo under `/reference/` so Claude Code can read it when building components. The filename is: `mph_order_app_forum_tab_ongoing_updates_desc_toggle_no_margin_partnum_in_full_only.html`

## TECHNOLOGY STACK (ALL DECISIONS FINAL)

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (full stack — frontend and backend) |
| Framework | Next.js 15 (React frontend + API routes) |
| Database | Supabase (managed PostgreSQL + auth + real-time + storage) |
| ORM | Prisma (type-safe database access, auto-generated types, migrations) |
| Hosting | Vercel (one Pro seat for Jack at $20/mo, Keith is free viewer) |
| UI Components | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| PDFs | React-PDF (@react-pdf/renderer) |
| QBO Integration | node-quickbooks (Phase 2) |
| Email (Phase 2) | Resend |
| Auth | Supabase Auth with Microsoft Entra SSO (employees sign in with M365 accounts) |
| Repository | github.com/mphunited/oms |
| Code Editor | VS Code |

## ACCOUNTS CREATED

- GitHub: github.com/mphunited/oms (repo exists, currently empty)
- Supabase: account created (need to create project and get connection string)
- Vercel: account created (need to connect to GitHub repo)
- Intuit Developer: account created (for QBO sandbox in Phase 2)

## CURRENT STATUS

- The oms repo has been cloned to Jack's machine at: `C:\Users\jack\Claude Projects\oms`
- The repo is empty — no code has been scaffolded yet
- Jack hit a 401 authentication error in Claude Desktop's Code tab — this needs to be resolved before building (likely needs Claude Code enabled in Organization settings > Capabilities)
- Keith joins tomorrow afternoon
- Jack has approximately 8 hours today to set up as much as possible before Keith arrives

## COLLABORATION MODEL

- Jack uses Claude Desktop App (Code tab for building, Cowork tab for file tasks, Chat tab for planning)
- Keith uses ChatGPT/Codex for code generation, VS Code for editing, same GitHub repo
- Both push/pull from github.com/mphunited/oms
- A CLAUDE.md file in the project root provides conventions for Claude Code
- A Claude Team Project called "MPH United OMS" in the Chat tab provides shared context
- Each person creates a local Cowork Project pointed at the oms folder for persistent memory
- Work is split by feature to avoid merge conflicts
- Daily check-ins on what each person is building
- Weekly 30-min sync to demo, plan, and resolve blockers

## USER ROLES

| Role | Who | What They Do | What They Can't Do |
|------|-----|-------------|-------------------|
| Admin | Jack | Everything — user management, settings, financial data, all features | N/A |
| CSR | Christina, Keith, Gracie | Create/edit orders, POs, BOLs, manage customers/vendors, view dashboard | Admin settings, financial snapshot, delete orders (TBD) |
| Salesperson | 4 employees including Renee | View their own orders only, personal dashboard, margin calculator | Create/edit orders, see other salespeople's orders, admin, financial data |
| Accounting | TBD | Invoice management, payment tracking, commission reports | TBD |
| Warehouse | TBD | BOL creation, shipment status updates | TBD |

Note: The salesperson field on orders must link to an actual User record (not just a text string) so the system can filter orders by logged-in salesperson.

## DATABASE SCHEMA (PRISMA MODELS TO CREATE)

These are the tables needed for MPH United.

### Core Tables
- **User** — email, name, role (Admin/CSR/Salesperson/Accounting/Warehouse), entra_id
- **Customer** — name, contacts, ship_to, bill_to, payment_terms
- **Vendor** — name, address, notes
- **Order** — order_number, customer_id, status, salesperson_id (FK to User), csr_id (FK to User), order_type (Bottle/Rebottle IBC/Washout IBC/Drums/Parts), ship_date, wanted_date, customer_po, description, qty, buy_each, sell_each, freight_cost, freight_carrier, freight_to_customer_type, po_notes, freight_invoice_notes, misc_notes, ship_to, bill_to, appointment_time, flag, qb_invoice_number, invoice_payment_status (Not Invoiced/Invoiced/Paid), commission_status (Not Eligible/Eligible/Commission Paid), created_at, updated_at
- **OrderSplitLoad** — order_id, load_number, description, qty, buy_each, sell_each, freight_cost, ship_date, carrier
- **BillOfLading** — order_id, bol_number, carrier, ship_from, ship_to, pickup_date, delivery_date
- **AuditLog** — user_id, table_name, record_id, action (create/update/delete), old_value, new_value, timestamp

### Config Tables
- **DropdownConfig** — type (salesperson/csr/customer/vendor/carrier/status), values (text array)
- **CompanySettings** — legal_name, display_name, address, email, phone, completed_bol_email, default_ship_from, next_order_number

### Future Tables (Phase 2, design later)
- **Invoice** — order_id, invoice_number, total, status, qbo_invoice_id
- **ForumPost** — author_id, title, body, tag, status, created_at
- **ForumReply** — post_id, author_id, body, created_at
- **Resource** — title, url, kind, pinned, notes

## PHASE 1 FEATURES (LAUNCH SCOPE)

### Orders & POs
- Order creation form with all current fields (customer, vendor, description, qty, pricing, dates, notes, salesperson, CSR)
- Split load support (multiple loads per order)
- Auto-generated order numbers (continuing from current sequence ~11415)
- Order type field: Bottle, Rebottle IBC, Washout IBC, Drums, Parts
- PO PDF generation matching current template
- BOL PDF generation matching current template
- "Open in Outlook Web" button for emailing POs (deeplink to outlook.office.com/mail/deeplink/compose with To, CC orders@mphunited.com, Subject, Body pre-filled — works on Mac and PC)
- Order status tracking with full status workflow
- Order editing and duplication

### Ongoing Orders
- Orders table with columns: Order #, Status, Customer, Vendor, Description, Qty, Ship Date, Wanted Date, Customer PO, Sell Total, Margin, Actions
- Search across order number, customer, vendor, PO, description
- Status filter, lifecycle filter (active/complete/cancelled)
- Multi-select filters for customer, vendor, CSR
- Ship date sorting
- Flag/unflag orders
- Notes modal per order
- Description toggle (compact vs full)

### Invoicing & Payment Tracking
- Manual entry field for QuickBooks invoice number on each order
- Invoice payment status: Not Invoiced → Invoiced → Paid
- Commission status: Not Eligible → Eligible (customer paid) → Commission Paid
- Filter orders by invoice/commission status
- Visual indicators on orders table

### Commission Report (Renee)
- Commission report page for the commission-eligible salesperson
- Date range selector (defaults to current 2-week payroll period)
- Filters: invoice paid + commission not yet paid + order type is Bottle/Rebottle IBC/Washout IBC (excludes Drums and Parts)
- Shows: order number, customer, quantity, commission amount ($3 × qty)
- Total row: total quantity × $3
- "Mark as Commission Paid" button to batch-update displayed orders
- Export/print for payroll

### Weekly Schedules
- Weekly Schedule PDF (owner version — all orders, all vendors, grouped by vendor, with buy price, customer, freight carrier, ship-to details)
- Frontline Schedule PDF (vendor version — no pricing, grouped by vendor, PO/description/qty/ship date/appointment/customer/ship-to)
- Date range selector (default current Mon–Fri)
- Vendor filter for Frontline Schedule (all vendors or specific vendor)
- "Open in Outlook Web" to email schedules
- Total shipment count on each schedule

### Dashboard
- Hero stats (active orders, confirmed, ready to ship, ready to invoice)
- Status distribution view
- Weekly shipping chart

### Customer & Vendor Management
- Customer profiles (name, contacts, ship-to, bill-to) with auto-fill on order form
- Vendor profiles (name, address) with auto-fill
- Search across both

### Admin
- Company settings (name, address, email, phone, default ship-from)
- Dropdown maintenance (salespeople, CSRs, customers, vendors, carriers, statuses)
- Next order number configuration
- Financial snapshot (total sell, buy, freight, margin — admin only)

### Auth & Users
- Microsoft Entra SSO login via Supabase Auth (employees sign in with M365 accounts)
- Roles: Admin, CSR, Salesperson (view-only of own orders)
- Role-based navigation

### Salesperson View
- "My Orders" — filtered ongoing orders showing only their orders (read-only)
- Personal dashboard with their stats
- Margin calculator tool (standalone, no database — input buy/sell/freight/qty, see margin)

### Data
- Import last 12 months of orders from Excel (500–2,000 orders, all key fields exist)
- Export/backup to JSON

### Infrastructure
- Deploy on Vercel with custom domain (e.g., orders.mphunited.com)
- Supabase Pro database ($25/mo)
- CLAUDE.md conventions file in repo root
- Dark mode toggle
- Nightly automated database backup (S3 or similar)

## PHASE 2 FEATURES (AFTER LAUNCH)

### QuickBooks Online Integration
- OAuth 2.0 connection to QBO
- Push invoices to QBO
- Push vendor bills to QBO
- Automatic payment status sync: QBO checks if invoice paid → writes back to app
- Automatic commission eligibility: when QBO confirms payment → order commission status updates to Eligible → appears on Renee's next commission report
- Customer and vendor sync
- QBO connection dashboard in admin

### Invoicing
- Invoice PDF generation from order data
- Invoice queue showing orders ready to invoice
- Invoice number auto-generation or pull from QBO
- "Open in Outlook Web" for emailing invoices
- Integrated with QBO payment data

### Financials Tab
- Date range filtering
- Revenue and margin charts
- Customer breakdown, vendor breakdown
- Trend charts

### Email Improvements
- Direct send via Resend (one-click, no Outlook)
- Email preview before sending
- Email activity log per order

### Salesperson Enhancements
- Online forms (new customer request, quote request)
- Personal performance dashboard

### Operational Improvements
- Audit log UI (who changed what, when)
- Email notifications (order created, status changed, ready to invoice)
- Ship date range filter on ongoing orders
- Mobile-responsive optimization
- CSR checklist per order
- Forum (internal discussion threads)
- Resources (shared links/documents)
- Undo/redo (if feasible)

## EMAIL WORKFLOW

For Phase 1, all emailing uses Outlook Web deeplinks (not mailto:). This solves the Mac compatibility issue Jack experienced with the existing PO generator.

Pattern: `https://outlook.office.com/mail/deeplink/compose?to=vendor@email.com&cc=orders@mphunited.com&subject=...&body=...`

The app generates the PDF (user downloads it), then opens the Outlook Web compose window with To/CC/Subject/Body pre-filled. User drags the PDF attachment in and sends. Works identically on Mac and PC.

orders@mphunited.com is always CC'd on POs sent to vendors and invoices sent to customers so the whole team sees them.

Phase 2 adds Resend for direct one-click sending from the app (no Outlook needed).

## WEEKLY SCHEDULE FORMAT

Two versions generated from the same order data filtered by ship date range:

**Weekly Schedule (owners):** Grouped by vendor, columns: Vendor, Sales Person/CSR, MPH PO, Customer PO, Description, Qty, Ship Date, Buy, Customer, Freight, Ship To. Shows total order count. Includes all vendors and all financial data.

**Frontline Schedule (vendors):** Grouped by vendor, columns: Vendor, Sales Person/CSR, MPH PO, Customer PO, Description, Qty, Ship Date, Appt. Time, Customer, Ship To. NO buy price, NO freight cost. Shows total shipment count. Can be filtered to a specific vendor for emailing.

Reference PDFs of both formats were uploaded in this conversation.

## COMMISSION SYSTEM

- One salesperson (Renee) receives commission
- Rate: $3 per unit (bottle/rebottle IBC/washout IBC only — NOT drums, NOT parts)
- Commission is earned when the CUSTOMER PAYS the invoice (not when invoice is sent)
- Phase 1: someone manually marks invoice as paid in the app after checking QBO
- Phase 2: QBO integration automatically marks invoices as paid
- Payroll is biweekly — commission report pulls all orders where customer paid AND commission not yet paid
- After payroll processes, orders are marked "Commission Paid" so they don't appear on next report

## IMPORTANT DESIGN DECISIONS

1. **Single company (MPH United)** — no multi-tenant architecture needed
2. **No RLS policies** — single company, trusted internal employees
3. **Entra SSO from day one** — no email/password auth
4. **Salesperson field links to User table** — not a text dropdown
5. **Outlook Web deeplinks instead of mailto:** — fixes Mac compatibility
6. **Order type field required** — needed for commission filtering (Bottle/Rebottle/Washout/Drums/Parts)
7. **Forum and Resources are Phase 2** — don't delay launch
8. **QBO integration is Phase 2** — manual invoice number entry in Phase 1
9. **Run both systems in parallel** — don't turn off Excel until the new app proves itself for 2-4 weeks
10. **Get one CSR (Christina or Gracie) testing by week 6-7** — don't wait until launch for feedback

## WHAT NEEDS TO HAPPEN NEXT

1. **Resolve the Claude Code 401 auth error** — Check Organization settings > Capabilities > ensure Claude Code is enabled. May need to log out and back into Claude Desktop.
2. **Scaffold the Next.js project** — TypeScript, Tailwind, shadcn/ui, Prisma. First prompt: "Scaffold a new Next.js 15 project with TypeScript, Tailwind CSS, shadcn/ui, and Prisma in this directory. Set up the folder structure for an order management system. Include a .env.example file for Supabase credentials."
3. **Create Supabase project** — Get the connection string and add to .env
4. **Define Prisma schema** — All tables from the schema section above
5. **Run first migration** — npx prisma db push
6. **Configure Supabase Auth with Microsoft Entra** — Register app in Entra admin, configure OIDC in Supabase
7. **Build login page** — Single "Sign in with Microsoft" button
8. **Build app shell** — Tab navigation matching the HTML prototype, header, dark mode toggle
9. **Build Customer Management page** — First complete page, establishes all patterns
10. **Build Vendor Management page** — Same pattern, confirms the patterns work
11. **Deploy to Vercel** — Connect repo, get live URL
12. **Create CLAUDE.md** — Conventions file in project root
13. **Keith clones and verifies** — git clone, npm install, npm run dev, confirm it works on his machine

## FILES GENERATED IN THIS CONVERSATION

Multiple Word documents were created during this conversation covering architecture recommendations, stack comparisons, build timelines, requirements discovery, and collaboration guides. The most current versions are:
- IBC-Order-Platform-Decision-Document-v3.docx (stack decision doc for Jack and Keith)
- Azure-vs-Supabase-Stack-Comparison.docx (one-page infrastructure comparison)
- MPH-OMS-Final-Guide-and-Conversion-Blueprint.docx (final collaboration guide with HTML-to-Next.js mapping)

## CONTEXT FOR CLAUDE

Jack prefers comprehensive Word documents with structured tables. He values honest assessments and direct feedback over agreement. He's learning as he builds — explain concepts when they come up but don't over-explain things he already understands. Keith is coming from ChatGPT and will push code to the same repo. The HTML prototype file is the UI spec — reference it when building components. The weekly schedule PDFs show the exact format for the schedule generation feature. Renee's commission system is $3/unit on Bottle+Rebottle+Washout orders only, earned when customer pays, reported biweekly.
