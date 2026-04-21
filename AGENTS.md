# MPH United OMS — Agent Conventions

Read this file completely at the start of every session, then immediately read PRD.md.
Both files must be read before writing any code.

YOU ARE A SENIOR DEVELOPER. DO NOT BE LAZY. IF THERE IS A BUG FIND THE ROOT CAUSE AND FIX IT. NO TEMPORARY FIXES. NEVER BE LAZY.

MAKE ALL FIXES AND CODE CHANGES AS SIMPLE AS HUMANLY POSSIBLE. THEY SHOULD ONLY IMPACT NECESSARY CODE RELEVANT TO THE TASK AND NOTHING ELSE. IT SHOULD IMPACT AS LITTLE CODE AS POSSIBLE. YOUR GOAL IS TO NOT INTRODUCE ANY BUGS.
---

## SESSION STARTUP SEQUENCE

1. Read AGENTS.md (this file) — technical conventions and architecture rules
2. Read PRD.md — product requirements, feature scope, business rules, build order
3. Read src/lib/db/schema.ts — current schema before writing any queries or API routes
4. Review the TECHNOLOGY STACK section in this file before writing any code
5. Then proceed with the task

**Do not skip any of these steps. Do not rely on memory from a previous session.**

**Before writing a single line of code, confirm you have read PRD.md in this session.
If you have not read it, stop and read it now. Do not proceed on memory alone.**

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
**Full requirements are in PRD.md. Read it.**

---

## CRITICAL ARCHITECTURE RULES

1. **NO company_id columns anywhere.** No companies table. No company_members table.
   If you are about to add company_id to anything, stop and re-read PRD.md.

2. **NO RLS policies.** Single company, trusted internal employees.

3. **salesperson_id and csr_id are UUID FKs to the users table.** NOT text dropdowns.

4. **order_split_loads is the universal line items table.** Every order has at least one
   row. Pricing lives here, not on orders.

5. **Pricing fields (buy, sell, qty, description, part_number, bottle_cost, bottle_qty,
   mph_freight_bottles) live on order_split_loads — NOT on the orders table.**

6. **Do NOT reference a table called order_line_items.** It does not exist.

7. **invoice_payment_status lives on the orders table.** NOT derived from a separate
   invoices table. Values: 'Not Invoiced' | 'Invoiced' | 'Paid'

8. **customer_contacts on orders is JSONB** — stored as [{name, email}] array.
   Extract emails directly from the array for Outlook deeplinks.

9. **Supabase anon key is used only for Supabase Auth** (sign-in and session checks).
   All business data queries go through Drizzle via DATABASE_URL (server-only env var).
   Never expose DATABASE_URL to the browser.

10. **@react-pdf/renderer routes must declare:** `export const runtime = 'nodejs'`
    Without this, Vercel may run them on the Edge runtime and they will crash silently.

11. **Vendor bottle defaults** — vendors table has three nullable columns:
    default_bottle_cost, default_bottle_qty, default_mph_freight_bottles.
    These autofill the bottle section on order_split_loads when a CSR
    expands it on the order form. Fields remain editable per order.
    Migration required before building the vendor page.

12. **Git verification rule** — Claude Code pushes to remote but does not always update
    local main. Always run git pull origin main before running git log to verify commits.
    Never trust Claude Code's success confirmations — verify with git log only after pulling.

13. **Session handling uses src/proxy.ts — NOT src/middleware.ts.**
    Next.js 16 renamed middleware.ts to proxy.ts with a `proxy` export.
    Never create src/middleware.ts — it will conflict and break the build.

14. **Vercel Framework Preset must be set to Next.js.**
    If deploying a new Vercel project, go to Settings → General → Framework Preset
    and set it to Next.js. Leaving it as "Other" causes 404 on all routes.

15. **Stale .next cache causes all routes to 404 on Turbopack.**
    If all routes return 404 and nothing appears in the dev server terminal when
    hitting them, delete .next and restart:
    `Remove-Item -Recurse -Force .next` then `npm run dev`.
    This is the first debugging step for any unexplained 404s.

16. **drizzle.config.ts loads .env.local via dotenv.**
    `npm run db:migrate` and other drizzle-kit CLI commands work without any
    manual env var setup. Do not remove the dotenv import from drizzle.config.ts.

17. **@react-pdf/renderer cannot render SVG.** Always use PNG or JPG for images
    in PDF components. Logo must be PNG. Stored at /public/mph-logo.png and
    referenced via https://oms-jade.vercel.app/mph-logo.png in company_settings.

18. **BOL description extraction uses bolDescription() helper** in
    src/lib/orders/build-bol-pdf.tsx. Strips "SPLIT LOAD n — " prefix, takes
    text before first "|". CSR convention: always use "|" to separate product
    specs in description field.

19. **product_weights table** stores canonical BOL product names and weights.
    Seeded with 17 products. Do not hardcode weights anywhere — always query
    this table.

20. **PO PDF logic lives in src/lib/orders/build-po-pdf.tsx**
    **BOL PDF logic lives in src/lib/orders/build-bol-pdf.tsx**
    Route files handle data fetching only. PDF components handle rendering only.

21. **invoice_paid_date and commission_paid_date are date columns on orders.**
    invoice_paid_date = when customer paid. commission_paid_date = Friday payroll
    date when commission was paid to salesperson. Both nullable. Set by Accounting.
    commission_paid_date is set in bulk from /commission page, not the order form.

22. **schedule_contacts is a jsonb array on vendors** — [{name, email, is_primary}]
    Same shape as po_contacts. Used for vendor schedule email distribution.
    Frontline and admin schedule recipients live in company_settings.

23. **inArray() from drizzle-orm must be used for IN queries.** Never use
    manual .in() on a column. Import inArray from 'drizzle-orm'.

24. **Date display format is MM/DD/YYYY throughout the UI.** Stored format in
    the database remains YYYY-MM-DD. Format on display only, never on storage.

25. **Outlook Web deeplinks cannot attach files.** The email button opens a
    compose window with pre-filled recipients, subject, and body. The PDF must
    be attached manually by the user. Never claim otherwise in email body text.
---

## TECHNOLOGY STACK

| Layer            | Technology                                                        |
|------------------|-------------------------------------------------------------------|
| Language         | TypeScript (full stack)                                           |
| Framework        | Next.js 16 (React frontend + API routes)                          |
| Database         | Supabase (managed PostgreSQL)                                     |
| ORM              | Drizzle ORM — Prisma was removed, do not add it                   |
| Hosting          | Vercel Pro                                                        |
| UI Components    | shadcn/ui + Tailwind CSS                                          |
| UI Primitives    | @base-ui/react — underlies shadcn/ui components, do NOT add Radix |
| Charts           | Recharts                                                          |
| PDFs             | @react-pdf/renderer                                               |
| Auth             | Supabase Auth + Microsoft Entra SSO via @supabase/ssr             |
| Theme            | next-themes (light/dark toggle)                                   |
| Forms            | react-hook-form + @hookform/resolvers                             |
| Validation       | zod v4 — import from 'zod'. Use zodResolver directly in useForm(). Do NOT create a custom useZodForm wrapper. |
| Notifications    | sonner (toast notifications)                                      |
| Icons            | lucide-react v1.x                                                 |
| Repository       | github.com/mphunited/oms                                          |

**Removed packages — do NOT re-add:**
- `next-auth` — removed, unused. Auth is handled entirely by Supabase Auth + @supabase/ssr.
- `prisma` — removed. ORM is Drizzle only.

---

## PACKAGE DISCIPLINE — READ BEFORE ADDING ANY DEPENDENCY

Before installing any new npm package, you must:

1. **Check if the existing stack already solves the problem.**
   - Need UI components? → shadcn/ui first
   - Need charts? → Recharts (already installed)
   - Need date handling? → Check if date-fns or native JS Date is sufficient
   - Need PDF? → @react-pdf/renderer (already installed)
   - Need forms/validation? → Check if react-hook-form or zod is already present
   - Need state management? → React built-ins (useState, useReducer, Context) first

2. **If no existing package solves it**, ask: can it be solved with ~20 lines of TypeScript?
   If yes, write the utility. Do not add a dependency.

3. **Only if neither of the above works**, may you add a new package. When you do:
   - Add it to the TECHNOLOGY STACK table in this file with a one-line reason
   - Use the most minimal, well-maintained package available
   - Do NOT add packages that duplicate existing stack capabilities

**Never add a package silently. If you add one, it must appear in this file.**

---

## FILE MODULARITY RULES — NO MONOLITHS

This project must remain navigable by a non-professional developer (Jack) and maintainable
when Keith returns. Monolithic files make debugging harder and AI-assisted edits riskier.

**Hard rules:**

1. **No file may exceed 300 lines.** If a file is approaching this limit, split it.

2. **One component per file.** Do not define multiple exported React components in the
   same file. Each component gets its own file under the appropriate `src/components/` subdirectory.

3. **Split by concern, not by size.** Separate:
   - UI layout from data-fetching logic
   - Form components from page components
   - Utility/helper functions into `src/lib/` files
   - API route handlers from their business logic (extract logic into `src/lib/`)

4. **Reuse before you duplicate.** Before creating a new component, check
   `src/components/` for an existing one that can be extended or parameterized.

5. **Name files after what they do.** `order-status-badge.tsx`, not `helpers.tsx`.
   `use-order-form.ts` for hooks, `format-currency.ts` for utilities.

6. **If a new API route needs a helper function longer than ~30 lines**, extract it to
   `src/lib/[domain]/[name].ts` and import it. Do not inline complex logic in route files.

**When in doubt: smaller files, clearer names, one responsibility each.**

---

## DATABASE CONNECTION

Use Transaction Pooler only — port 6543.
No DIRECT_URL needed. No Session Pooler.
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres

---

## SCHEMA OVERVIEW

Tables: users, customers, vendors, orders, order_split_loads, recycling_orders,
        bills_of_lading, company_settings, dropdown_configs, audit_logs

Schema file: src/lib/db/schema.ts — this is the source of truth. Always read it before
writing queries or API routes. Full field-level detail is in PRD.md Section 5.

---

## ORDER NUMBER FORMAT

Format: `[Initials]-MPH[Number]` — e.g., `CB-MPH15001`
Uses a Postgres sequence: `SELECT nextval('order_number_seq')`
Do NOT use MAX(order_number) + 1 — race condition.

---

## MARGIN FORMULA
Profit =
SUM per line: (sell - buy) × qty

freight_to_customer                          [order level]


freight_cost                                 [order level]
SUM per line: bottle_cost × bottle_qty
SUM per line: (mph_freight_bottles / 90) × bottle_qty
SUM commission-eligible units × $3
additional_costs                             [order level]

Profit % = Profit ÷ ( SUM(sell × qty) + freight_to_customer )
Red threshold: Profit % < 8%

Commission-eligible order types: Bottle, Rebottle IBC, Washout IBC
NOT eligible: Drums, Parts

---

## ORDER STATUS VALUES (STANDARD)

Pending | Waiting On Vendor To Confirm | Waiting To Confirm To Customer |
Confirmed To Customer | Rinse And Return Stage | Sent Order To Carrier |
Ready To Ship | Ready To Invoice | Complete | Cancelled

## ORDER STATUS VALUES (RECYCLING)

Acknowledged Order | PO Request To Accounting | Waiting On Vendor To Confirm |
Credit Sent In | Confirmed To Customer | Waiting For Customer To Confirm |
Ready To Pickup | Picked Up | Sent Order To Carrier | Ready To Ship |
Ready To Invoice | Complete | Canceled

---

## ORDER TYPE VALUES

Bottle | Rebottle IBC | Washout IBC | Drums | Parts

---

## USER ROLES

ADMIN | CSR | ACCOUNTING | SALES

Role is enforced as a PostgreSQL enum (user_role) in the database.
Default role for new users: CSR

---

## EMAIL PATTERN

All email actions use Outlook Web deeplinks — NOT mailto: links (fixes Mac compatibility).
https://outlook.office.com/mail/deeplink/compose?to=...&cc=...&subject=...&body=...

- PO emails: CC includes orders@mphunited.com
- BOL emails: orders@mphunited.com is NOT CC'd
- Customer confirmations: extract emails from free-text customer_contacts field via regex
- Full email rules in PRD.md Section 11

---

## DOCUMENT GENERATION

- PO PDF: `GET /api/orders/[orderId]/po-pdf` — server-side, nodejs runtime, no separate DB record
- BOL PDF: stored in bills_of_lading table
- Weekly schedules: admin version (with pricing) and vendor/Frontline version (no pricing)
- Full spec in PRD.md Section 12

---

## PHASE BOUNDARIES

**Phase 1 (now):** Everything in PRD.md Section 18.
**Phase 2 (after launch):** Everything in PRD.md Section 19.

**If asked to build a Phase 2 feature, refuse and explain it is Phase 2.**

---

## APPLICATION ROUTES

Full route table in PRD.md Section 17.

Key routes:
- /orders — ongoing orders table (working)
- /orders/new — new order form (built, tested, working)
- /orders/[orderId] — order detail/edit (built, working — duplicate button stubs to /orders/new, no pre-fill yet)
- /customers — customer list (built, working)
- /customers/[customerId] — customer detail + contacts editor (built, working)
- /vendors — vendor list (built, working)
- /vendors/[vendorId] — vendor detail + contacts + checklist template (built, working)
- /recycling — recycling orders (not started)
- /schedules — weekly schedule generation (built, needs inArray fix and real data test)
- /commission — commission report with mark-paid workflow (built, needs real data test)
- /api/schedules/admin-pdf — POST admin schedule PDF
- /api/schedules/vendor-pdf — POST vendor/Frontline schedule PDF
- /api/commission — GET commission data, role-filtered
- /api/commission/mark-paid — POST bulk mark commission paid
- /api/me — GET current user id/name/email/role

---

## COLLABORATION

Jack (IT lead) builds alone currently. Keith (coworker) will return to the project later.
Both use Claude Code on github.com/mphunited/oms.

---

## WORKTREE DISCIPLINE

Claude Code creates git worktrees under .claude/worktrees/ for each task. This is by design.
**After every task Claude Code must:**
1. Commit all changes in the worktree
2. Merge the worktree branch to main
3. Push to origin
4. Never leave work on a claude/ branch without merging

Verify with `git log --oneline -5` after every task.
Do not trust Claude Code's success confirmations — verify with git log yourself.

---

## FILE STRUCTURE REFERENCE
src/lib/db/schema.ts          — Drizzle schema, always read before writing queries
src/lib/db/index.ts           — Drizzle client
src/app/(dashboard)/          — all authenticated pages
src/app/(auth)/login/         — login page
src/proxy.ts                  — session handler (Next.js 16 middleware equivalent)
src/app/api/                  — all API routes
src/actions/team.ts           — server actions for user/team management (invite, role update, deactivate)
src/components/layout/        — sidebar, header, nav
src/components/orders/        — order components including new-order-form.tsx
src/components/recycling/     — recycling order components
src/config/nav.ts             — navigation items
reference/                    — HTML prototype (UI reference only, not a spec)
AGENTS.md                     — technical conventions, read at every session
PRD.md                        — product requirements, read at every session
drizzle/                      — migration SQL files and snapshots

---

## PROTOTYPE NOTE

The HTML prototype in /reference/ is a UI reference only. It predates the current schema
and uses different data structures. This AGENTS.md and PRD.md are the authoritative specs.
When the prototype conflicts with either file, follow AGENTS.md and PRD.md.

---

## KNOWN ACCEPTABLE VULNERABILITIES

Do not attempt to fix the following — the fix breaks the toolchain:

- **esbuild <=0.24.2** inside `drizzle-kit` (via @esbuild-kit/core-utils → @esbuild-kit/esm-loader)
  - Severity: moderate
  - Risk: only exploitable if running `drizzle-kit studio` locally while browsing a malicious site simultaneously
  - Fix would downgrade drizzle-kit to 0.18.1 — a breaking change from current 0.31.x
  - Decision: accept the risk. Never run `npm audit fix --force` to resolve this.

  ## BRAND & THEME CONVENTIONS

Colors: --mph-navy #00205B, --mph-gold #B88A44, --mph-gold-light #E5C678
Sidebar: collapsible="icon" rail, navy background, gold active border, 
         text-[15px] font-medium nav items, hover to expand/collapse (300ms debounce)
Header: navy background, MPH logo left, white text/icons
Login: navy gradient background, logo above card
Primary buttons: navy bg, gold hover
Status badges: color-coded lookup map in order-status-badge.tsx