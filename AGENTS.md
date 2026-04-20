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
4. Then proceed with the task

**Do not skip any of these steps. Do not rely on memory from a previous session.**

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

12. Git verification rule — Claude Code pushes to remote but does not always update local main. Always run git pull origin main before running git log to verify commits. Never trust Claude Code's success confirmations — verify with git log only after pulling.

13. **Session handling uses src/proxy.ts — NOT src/middleware.ts.**
    Next.js 16 renamed middleware.ts to proxy.ts with a `proxy` export.
    Never create src/middleware.ts — it will conflict and break the build.

14. **Vercel Framework Preset must be set to Next.js.**
    If deploying a new Vercel project, go to Settings → General → Framework Preset
    and set it to Next.js. Leaving it as "Other" causes 404 on all routes.

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

```
https://outlook.office.com/mail/deeplink/compose?to=...&cc=...&subject=...&body=...
```

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
- /orders/new — new order form (built, needs testing + fixes)
- /orders/[orderId] — order detail/edit (not started)
- /recycling — recycling orders (not started)
- /customers, /vendors — management pages (not started)
- /schedules — weekly schedule generation (not started)
- /commission — commission report (not started)

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

## PROTOTYPE NOTE

The HTML prototype in /reference/ is a UI reference only. It predates the current schema
and uses different data structures. This AGENTS.md and PRD.md are the authoritative specs.
When the prototype conflicts with either file, follow AGENTS.md and PRD.md.
