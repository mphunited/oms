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
5. If working on auth or user sync: read drizzle/0010_auth_user_sync_trigger.sql to understand the SSO→public.users sync mechanism
6. Then proceed with the task

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

2. **RLS is enabled on all 11 public tables** with service_role-only policies (April 22, 2026).
   Direct public/anon access is blocked at the database level. All business data queries
   run server-side through Drizzle via DATABASE_URL (postgres superuser — bypasses RLS).
   Do not add anon or authenticated-role policies. See the ## Security section.

3. **salesperson_id and csr_id are UUID FKs to the users table.** NOT text dropdowns.

4. **order_split_loads is the universal line items table.** Every order has at least one
   row. Pricing lives here, not on orders.

5. **Pricing fields (buy, sell, qty, description, part_number, bottle_cost, bottle_qty,
   mph_freight_bottles) live on order_split_loads — NOT on the orders table.**

6. **Do NOT reference a table called order_line_items.** It does not exist.

7. **invoice_payment_status lives on the orders table.** NOT derived from a separate
   invoices table. Values: 'Not Invoiced' | 'Invoiced' | 'Paid'

8. **customer_contacts on orders is JSONB** — stored as [{name, email}] array.
   Extract emails directly from the array for Graph API draft creation.

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
    The BOL PDF renders a **Contact Information & Delivery Notes** section below
    the Ship To box. It pulls from ship_to.shipping_notes only. Rendered as a
    free-text block. Section is hidden when shipping_notes is empty or absent.
    The Ship To box renders name and address only — no contact fields.

19. **product_weights table** stores canonical BOL product names and weights.
    Seeded with 17 products. Do not hardcode weights anywhere — always query
    this table. **product_name values must exactly match the text returned by
    bolDescription()** from order descriptions. Use the abbreviation "Gal" (not
    "Gallon"), no apostrophe-s, following the ORDER_TYPES naming convention.
    Example: "275 Gal Rebottle IBC" not "275 Gallon Rebottle IBC's". If a BOL
    weight shows "--", the extracted description does not match any row in
    product_weights — check the exact string in Vercel logs under
    "[BOL PDF] keys going into inArray:".

20. **PO PDF logic lives in src/lib/orders/build-po-pdf.tsx**
    **BOL PDF logic lives in src/lib/orders/build-bol-pdf.tsx**
    Route files handle data fetching only. PDF components handle rendering only.
    - PO PDF background color is #ffffff (white). Constant: PAGE_BG in build-po-pdf.tsx.
    - Sales Order # on PO PDF renders only when vendor.name === 'MPH United / Alliance
      Container -- Hillsboro, TX' (strict equality). This is intentional — Alliance
      Hillsboro is the only vendor that requires it.
    - BOL signature boxes: Shipper and Carrier boxes each have a spacer <Text> element
      between the "Signature:" label and the signing underline. Consignee box has no
      signing line.
    - BOL return email is bol@mphunited.com. Hardcoded in build-bol-pdf.tsx. Rendered
      right-aligned and bold inside the Contact Information & Delivery Notes section.

21. **invoice_paid_date and commission_paid_date are date columns on orders.**
    invoice_paid_date = when customer paid. Set by Accounting on the order edit form.
    commission_paid_date on orders is updated for backward compatibility only — the
    canonical commission_paid_date lives on order_split_loads rows, stamped by
    POST /api/commission/mark-paid. Set in bulk from /commission page by ADMIN or
    ACCOUNTING using a payroll date input.

22. **schedule_contacts is a jsonb array on vendors** — [{name, email, is_primary}]
    Same shape as po_contacts. Used for vendor schedule email distribution.
    Frontline and admin schedule recipients live in company_settings.

23. **inArray() from drizzle-orm must be used for IN queries.** Never use
    manual .in() on a column. Import inArray from 'drizzle-orm'.

24. **Date display format is MM/DD/YYYY throughout the UI.** Stored format in
    the database remains YYYY-MM-DD. Format on display only, never on storage.

25. **Outlook Web deeplinks are no longer used.** All email actions now use
    Microsoft Graph API to create drafts with PDF attachments already attached.

26. **Never use Outlook Web deeplinks for email.** Use Microsoft Graph API via
    src/lib/email/msal-client.ts and src/lib/email/graph-mail.ts.
    - MSAL client: singleton PublicClientApplication, getMailToken() acquires token
      with scopes Mail.ReadWrite and Mail.Send (silent, popup fallback).
    - Azure App Registration: clientId 2785bb21-50cc-4e45-a996-c0aec39b13bd,
      tenantId 3abf2937-e518-43e5-b2a4-456eecfa8b00.
    - Graph helpers: createDraft(), attachFileToDraft(), openDraft() in
      src/lib/email/graph-mail.ts.

27. **MSAL version is @azure/msal-browser 4.28.1 (pinned).** Do NOT upgrade to v5
    — popup flow is broken in v5. The redirectUri points to /msal-callback (a blank
    Next.js page with its own layout to prevent root layout interference).
    Azure SPA redirect URIs registered:
    http://localhost:3000/msal-callback,
    https://oms-mphuniteds-projects.vercel.app/msal-callback,
    https://oms-jade.vercel.app/msal-callback.

28. **PO email body is built by src/lib/email/build-po-email.ts** — pure function,
    takes order data, returns { subject, bodyHtml, to, cc }.
    Never inline PO email construction in a component or route.

29. **Email buttons do NOT show a greeting modal.** The greeting name is derived
    automatically from vendor.name. Do not add a modal to any email flow.

30. **orders table has csr2_id — nullable UUID FK to users.id.** The order form and
    edit page both have a CSR 2 (optional) dropdown. API routes accept and return
    csr2_id and csr2_name. Schedule PDFs display CSR as first name only; two CSRs
    shown as FirstName / FirstName2.

31. **users table has title (text), phone (text), email_signature (text), and
    can_view_commission (boolean, default false) columns.** Email signatures are
    appended to all Graph API drafts automatically via getUserSignature() called
    in parallel with getMailToken(). Manage user records including signature on
    /team page (ADMIN only).

32. **users table has a permissions column (jsonb, default []).** Valid values in the
    array: "SALES" | "CSR". This controls which order-form role dropdowns a user
    appears in, independent of their app access role. Salesperson dropdown filters
    GET /api/users?permission=SALES. CSR dropdown filters GET /api/users?permission=CSR.
    A user with role=ADMIN can have either or both permissions to appear in order form
    dropdowns. Managed on the /team page.

33. **freight_carrier on orders is a Select dropdown** populated from dropdown_configs
    where type = 'CARRIER'. Fetch via GET /api/dropdown-configs?type=CARRIER, which
    returns a string[] from the row's values jsonb array. Seeded with 34 carriers in
    Supabase Studio. The Input field was replaced with a Select on both the new order
    form and the order edit page.

34. **on_auth_user_created trigger syncs auth.users → public.users on first SSO login.**
    Fires AFTER INSERT on auth.users. Name extraction priority:
      1. raw_user_meta_data->>'full_name'
      2. CONCAT(custom_claims->>'given_name', ' ', custom_claims->>'family_name')
      3. email (last resort)
    Tracked in drizzle/0010_auth_user_sync_trigger.sql for version control.
    Applied via Supabase MCP (not drizzle-kit — pooler lacks auth schema DDL permission).
    Do NOT attempt to re-apply via npm run db:migrate — use Supabase MCP apply_migration.

35. **Commission eligibility is determined per split load** based on
    order_split_loads.order_type using keyword matching (New IBC, Bottle, Rebottle,
    Washout, Wash & Return). commission_status and commission_paid_date live on
    order_split_loads. The order-level commission_status on orders is derived from
    split load statuses and kept for backward compatibility only.

36. **order_split_loads carries per-load fields** in addition to its pricing columns:
    customer_po (overrides order-level when set), order_type (drives commission
    eligibility for this load), ship_date, wanted_date, commission_status
    (default 'Not Eligible'), commission_paid_date, and order_number_override
    (per-load MPH PO when the load needs its own sequential number).

37. **Split load MPH PO numbers** are generated via SELECT nextval('order_number_seq')
    on save only — never on preview. Preview uses pg_sequence_last_value without
    consuming the sequence. The generated number is stored in
    order_split_loads.order_number_override.

38. **GET /api/orders search includes order_split_loads.order_number_override**
    via a subquery so searching for a split-load override PO number surfaces the
    parent order in the results.

39. **GET /api/dropdown-configs?type=X returns { type, values, meta }.**
    values is string[]. meta is nullable JSONB of per-label badge colors.
    PUT /api/dropdown-configs performs full array replacement for a given type.
    ADMIN role enforced server-side on PUT. Currently manages types:
    CARRIER (freight carriers), ORDER_STATUS (order status values).
    PUT sorts values alphabetically before saving. PUT merges meta — does not
    null it out when meta is absent from the request body.

40. **users table has is_commission_eligible boolean (default false).** Only users
    with is_commission_eligible = true appear in the commission report salesperson
    dropdown and commission API queries. Currently only Renee Sauvageau is eligible.
    Managed on /team page by ADMIN. Distinct from can_view_commission (controls
    whether a user can see the commission nav item at all).

42. **dropdown_configs.meta is a nullable JSONB column storing per-label badge colors.**
    Shape: { [label: string]: { color: string } }. The existing values column stays
    as string[]. Do not change the values shape. GET /api/dropdown-configs returns
    { type, values, meta }. PUT accepts optional meta and merges — never nulls it.
    Default colors seeded for ORDER_STATUS (17 values) and CARRIER (34 values).
    Colors editable in /settings via inline swatches on each item row.

43. **The orders table expanded row uses card-style layout** inside a single colSpan cell.
    Do not attempt to align expanded row cells to parent column widths — column widths
    are dynamic and this pattern always misaligns. Each split load renders as a card:
    bg-muted/40 rounded-md p-3 border-l-4 border-[#B88A44], grid grid-cols-2 inside.

44. **Order Summary Drawer** — clicking the MPH PO number in the orders table opens a
    Sheet drawer (side="right", w-[520px]) that fetches from GET /api/orders/[orderId].
    The PO number cell is a button, not a link. The Edit Order link is in the drawer header.
    The drawer shows: Order Info, Ship To/Bill To addresses, Order Contacts, Split Loads
    (full fields including commission + bottle), Freight & Costs, Notes.

45. **GET /api/dropdown-configs returns { type, values, meta }** — NOT a plain string[].
    Callers that only need the values array must extract .values from the response.
    Three existing callers were patched when meta was added:
    orders-filter-bar.tsx, use-edit-order-form.ts, use-new-order-form.ts.

46. **Filter bar on /orders has two always-visible rows — no More Filters toggle.**
    Row 1: Search | lifecycle pills (Active/Complete/Flagged/All) | Status multi-select.
    Row 2: Customer | Vendor | CSR | Salesperson | Ship Date range.
    No Cancelled lifecycle pill. Both rows flex-wrap for smaller screens.

41. **New Order form layout rules:**
    - Blind Shipment toggle is in the Customer & Vendor section, second row under Vendor.
    - Flag This Order and Revised PO are NOT on the New Order form — Edit page only.
    - Save Order button is at the bottom of the form, below Misc Notes.
    - Invoice & Payment section (payment status, paid dates) is on Edit page only.
    - Manual PO entry mode is available to ADMIN and CSR roles via a toggle. Bypasses
      sequence. Accepts both plain numbers (12345) and prefixed format (PM-MPH12345).
      Server validates role (ADMIN|CSR) and uniqueness via GET /api/orders/check-po
      before submit. Used for historical import. When active, shows an Invoice Number
      field (qb_invoice_number) to the right of the MPH PO Number field.
    - When a vendor is selected, is_blind_shipment is auto-set to the vendor's
      is_blind_shipment_default value. The toggle remains fully editable; re-selecting
      a vendor re-applies its default.

47. **Color inputs in settings — Use `<input type="color">` directly as the visible swatch element.**
    Never use a hidden input triggered via a ref click — this pattern does not reliably fire onChange.
    The colorRefs ref pattern was removed from both order-statuses-section.tsx and carriers-section.tsx.

48. **PATCH /api/orders/[orderId] — checklist is intentionally excluded from full-form saves.**
    It is only written when the PATCH body contains checklist as the sole field (sent by
    ChecklistPopup in order-row.tsx). Do not add checklist back to the edit page handleSave
    body in use-edit-order-form.ts.
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
| MSAL             | @azure/msal-browser — client-side token acquisition for MS Graph Mail API |
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

All email actions use **Microsoft Graph API** to create Outlook drafts with PDF attachments.
Outlook Web deeplinks are no longer used anywhere in the app.

- Token: call getMailToken() from src/lib/email/msal-client.ts
- Draft creation: createDraft() → attachFileToDraft() → openDraft() from src/lib/email/graph-mail.ts
- No greeting modal. Greeting name uses vendor.name directly. User email signature fetched from /api/me and appended to every draft automatically.
- PO email body spec: src/lib/email/build-po-email.ts — pure function, returns { subject, bodyHtml, to, cc }
- PO emails: CC includes orders@mphunited.com
- BOL emails: orders@mphunited.com is NOT CC'd
- Full email rules and PO body spec in PRD.md Section 11

---

## DOCUMENT GENERATION

- PO PDF: `GET /api/orders/[orderId]/po-pdf` — server-side, nodejs runtime, no separate DB record
- BOL PDF: stored in bills_of_lading table
- Weekly schedules: admin version (with pricing) and vendor/Frontline version (no pricing)
- PO PDF signature lines removed. All schedule PDFs use first name only for salesperson/CSR display.
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
- /orders — ongoing orders table (working). MPH PO number cell is a button that opens the Order Summary Drawer (Sheet, right side) — does NOT navigate. Edit link is in the drawer header. Expandable row shows per-load card layout inside a single colSpan cell (not column-mirroring); colSpan=18. Filter bar has two always-visible rows; no More Filters toggle. Status and Carrier columns render as colored pill badges (colors from dropdown_configs.meta). List API returns csr2_name alongside csr_name. Ship To column (after Sell) shows ship_to.name and city, state from the ship_to JSONB. Hovering any row reveals a Pencil icon in the Actions cell (opacity-0 → group-hover:opacity-100) that navigates to /orders/[orderId]; Duplicate copy icon is always visible. Customer PO cell shows a badge below the PO value: "Wash & Return" (gold) when any split load order_type contains "Wash & Return"; "Split Load" (muted) for 2+ load orders with no Wash & Return; nothing otherwise.
- /orders/new — new order form (built, tested, working)
- /orders/[orderId] — order detail/edit (built, working — duplicate button stubs to /orders/new, no pre-fill yet)
- /customers — customer list (built, working)
- /customers/[customerId] — customer detail + contacts editor (built, working)
- /vendors — vendor list (built, working)
- /vendors/[vendorId] — vendor detail + contacts + checklist template (built, working)
- /recycling — placeholder page (coming soon — not yet built)
- /schedules — weekly schedule generation (built, working — Graph API email with auto-attached PDF, recipients from DB)
- /commission — commission report with mark-paid workflow (built, needs real data test)
- /team — user management (built, working — ADMIN only, manages title, phone, email_signature, role, can_view_commission, permissions)
- /api/orders — GET with full server-side filtering + pagination (search, lifecycle, status, customer/vendor/salesperson/csr, date range, invoice/commission status, flag, page/limit)
- /api/schedules/admin-pdf — POST admin schedule PDF
- /api/schedules/vendor-pdf — POST vendor/Frontline schedule PDF
- /api/commission — GET commission data, role-filtered
- /api/commission/mark-paid — POST bulk mark commission paid
- /api/me — GET current user id/name/email/role
- /api/users — GET users list; accepts ?permission=SALES|CSR to filter by permissions jsonb
- /api/dropdown-configs — GET dropdown values by type; accepts ?type=CARRIER|ORDER_STATUS; returns { type, values, meta } (NOT a plain string[]). PUT replaces values array and merges meta for a type (ADMIN only).
- /api/orders/check-po?number=X — GET, returns { exists: boolean }; checks uniqueness of a manual PO number. Auth required.
- /api/orders/next-po-preview?initials=XX — GET, returns { preview: string } formatted as [Initials]-MPH[N] WITHOUT consuming the sequence (uses pg_sequence_last_value).

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

**If gh CLI is not available**, merge manually and do not ask the user to open a PR:
```
git checkout main && git merge [branch] && git push origin main
```
Always verify the commit appears on main with `git log --oneline -5` before reporting the task complete. Never end a task by asking the user to open a PR.

---

## FILE STRUCTURE REFERENCE
src/lib/db/schema.ts          — Drizzle schema, always read before writing queries
src/lib/db/index.ts           — Drizzle client
src/lib/email/msal-client.ts  — MSAL singleton + getMailToken()
src/lib/email/graph-mail.ts   — createDraft(), attachFileToDraft(), openDraft()
src/lib/email/build-po-email.ts — PO email subject/body builder (pure function)
src/lib/utils/format-date.ts  — formatDate() MM/DD/YYYY display helper
src/lib/orders/badge-colors.ts — getBadgeColor(), getBadgeTextColor() helpers for colored pill badges
src/components/orders/order-summary-drawer.tsx — Sheet drawer (right side), fetches from GET /api/orders/[orderId], triggered by PO number click in orders table
src/components/orders/order-row.tsx — contains ChecklistPopup (local component, not a separate file); fetches GET /api/orders/[orderId] on open and saves via PATCH with { checklist: updated } as the only body field
src/app/(dashboard)/          — all authenticated pages
src/app/(auth)/login/         — login page
src/proxy.ts                  — session handler (Next.js 16 middleware equivalent)
src/app/api/                  — all API routes
src/actions/team.ts           — server actions for user/team management (invite, role update, deactivate)
src/components/layout/        — sidebar, header, nav
src/components/orders/        — order components including new-order-form.tsx
src/components/recycling/     — recycling order components
src/components/commission/commission-client.tsx  — commission report page client component
src/components/commission/commission-filters.tsx — commission filter bar (status, date, salesperson controls)
src/components/commission/commission-table.tsx   — commission report table with mark-paid checkboxes
src/components/commission/commission-badge.tsx   — commission status badge (Not Eligible/Eligible/Paid)
src/components/settings/carriers-section.tsx     — carriers management UI (/settings page)
src/components/settings/order-statuses-section.tsx — order status management UI (/settings page)
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

---

## SECURITY

**Status as of April 22, 2026:**

- **RLS is enabled on all 11 public tables:** users, orders, customers, vendors,
  bills_of_lading, recycling_orders, order_split_loads, audit_logs, company_settings,
  dropdown_configs, product_weights.
- All tables have a **"Service role full access" policy scoped to service_role only.**
  Direct public/anon access to all tables is blocked at the database level.
- All database queries run **server-side** through Next.js API routes. No client-side
  Supabase data queries exist — the only client-side Supabase usage is auth flows in
  `src/app/(auth)/login/page.tsx` and `src/app/auth/callback/route.ts`.
- Supabase security advisor shows **zero critical errors** as of April 22, 2026.
- The one remaining warning (leaked password protection) is **irrelevant** — the app uses
  Microsoft SSO exclusively. Email/password auth is not used.

**Operational rules:**
- When new tables are created via migration, **RLS must be manually enabled** — it is NOT
  automatic for migration-created tables. Run `ALTER TABLE public.[table] ENABLE ROW LEVEL SECURITY;`
  and add a service_role policy immediately after any DDL migration that creates a new table.
- Run the Supabase security advisor after every DDL migration to confirm zero critical errors.
- **When Harding National is added as a second tenant**, the service_role-only policies
  must be replaced with tenant-aware RLS policies enforcing row-level tenant isolation
  **before** any Harding National data is added to the database.

---

  ## BRAND & THEME CONVENTIONS

Colors: --mph-navy #00205B, --mph-gold #B88A44, --mph-gold-light #E5C678
Sidebar: collapsible="icon" rail, navy background, gold active border, 
         text-[15px] font-medium nav items, hover to expand/collapse (300ms debounce)
Header: navy background, MPH logo left, white text/icons
Login: navy gradient background, logo above card
Primary buttons: navy bg, gold hover
Status badges: color-coded lookup map in order-status-badge.tsx