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
5. If working on auth or user sync: read drizzle/0010_auth_user_sync_trigger.sql
   to understand the SSO→public.users sync mechanism. Do NOT use inviteUserByEmail
   or manually insert rows into public.users — see ## USER ONBOARDING section.
6. Then proceed with the task
7. Read DESIGN.md before writing any UI code. Follow its component specs exactly.
    For OMS-specific patterns, Section 10 takes precedence over the base Vercel spec.

**Do not skip any of these steps. Do not rely on memory from a previous session.**

**Before writing a single line of code, confirm you have read PRD.md in this session.
If you have not read it, stop and read it now. Do not proceed on memory alone.**

---

## ⛔ DO NOT RE-ADD — PERMANENT REMOVALS

These items were deliberately removed. Do not re-add them under any
circumstances, regardless of what seems logical or what prior code
suggests. If a task seems to require one of these, stop and re-read
PRD.md before proceeding.

| What | Removed From | Why |
|------|-------------|-----|
| Sales Order # field | new-order-form.tsx, orders/[orderId]/page.tsx, build-po-pdf.tsx, build-po-email.ts | Removed 2026-04-28 by business decision. Column retained in schema and API payloads for historical data only. Do not render, display, or output it anywhere. |
| Outlook Web deeplinks | All email flows | Replaced by Microsoft Graph API drafts. Never use mailto: or Outlook web URL construction for email. |
| next-auth | package.json | Auth is Supabase Auth + @supabase/ssr. Do not re-add. |
| Prisma | package.json | ORM is Drizzle only. Do not re-add. |
| /financials route | App router | Deleted intentionally. Do not recreate. |
| Greeting modal | Email flows | Email greeting is derived automatically from vendor.name. No modal. |
| Button asChild | All components | @base-ui/react does not support this prop. Use styled native Link elements instead. |
| Approved By / Date footer | build-recycling-po-pdf.tsx | Removed 2026-05-15 by business decision. Do not re-add signature fields to any recycling PO PDF. |
| Notes rendering (po_notes) | build-recycling-po-pdf.tsx | Removed 2026-05-15. Dead code styles notesBox, notesLbl, notesText remain in the S object — do not use them and do not remove them (inert, no runtime effect). Do not render any notes fields on any recycling PO PDF. |

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

2. **RLS is enabled on all public tables** with service_role-only policies.
   Direct public/anon access is blocked at the database level. All business data queries
   run server-side through Drizzle via DATABASE_URL (postgres superuser — bypasses RLS).
   Do not add anon or authenticated-role policies. See the ## Security section.
   When new tables are created via migration, RLS must be manually enabled — it is NOT
   automatic. Run ALTER TABLE public.[table] ENABLE ROW LEVEL SECURITY and add a
   service_role policy immediately after any DDL migration that creates a new table.

3. **salesperson_id and csr_id are UUID FKs to the users table.** NOT text dropdowns.

4. **order_split_loads is the universal line items table for regular orders.** Every
   regular order has at least one row. Pricing lives here, not on orders.
   Recycling orders do NOT use order_split_loads — pricing lives directly on
   recycling_orders (qty, buy, sell, description, part_number columns).

5. **Pricing fields (buy, sell, qty, description, part_number, bottle_cost, bottle_qty,
   mph_freight_bottles) live on order_split_loads — NOT on the orders table.**
   Exception: recycling_orders has its own qty, buy, sell, description, part_number
   columns directly on the table (no split loads for recycling).

6. **Do NOT reference a table called order_line_items.** It does not exist.

7. **invoice_payment_status lives on the orders table and recycling_orders table.**
   NOT derived from a separate invoices table.
   Values: 'Not Invoiced' | 'Invoiced' | 'Paid'

8. **customer_contacts on orders is JSONB** — stored as [{name, email}] array.
   Extract emails directly from the array for Graph API draft creation.

9. **Supabase anon key is used only for Supabase Auth** (sign-in and session checks).
   All business data queries go through Drizzle via DATABASE_URL (server-only env var).
   Never expose DATABASE_URL to the browser.

10. **@react-pdf/renderer routes must declare:** `export const runtime = 'nodejs'`
    Without this, Vercel may run them on the Edge runtime and they will crash silently.
    This applies to: po-pdf, bol-pdf, credit-memo pdf, schedule pdfs, recycling po-pdf.

11. **Vendor bottle defaults** — vendors table has three nullable columns:
    default_bottle_cost, default_bottle_qty, default_mph_freight_bottles.
    These autofill the bottle section on order_split_loads when a CSR expands it.
    vendors table also has default_load1_qty and default_load1_buy — autofill qty and
    buy on Load 1 of the New Order form when vendor is selected, only if empty.

12. **Git verification rule** — Claude Code pushes to remote but does not always update
    local main. Always run git pull origin main before running git log to verify commits.
    Never trust Claude Code's success confirmations — verify with git log only after
    pulling. Inside a git worktree, `git checkout main` silently fails because main is
    locked to the parent worktree — use `git push origin HEAD:main` directly from the
    worktree branch instead of checking out main to merge.

13. **Claude Code git commit rule — MANDATORY PROMPT FOOTER**
    Claude Code frequently makes file edits but silently fails to commit or push.
    Every Claude Code prompt must end with explicit git steps or the changes will
    not land on main. Always append this block to every prompt:

    After making the changes:
    git add [list of changed files]
    git commit -m "descriptive message"
    git push origin HEAD:main
    git log --oneline -3

    Never trust Claude Code's verbal success confirmations without seeing the
    commit hash appear in git log after git pull origin main.
    This failure mode was observed on 4 of 5 prompts in the May 14 session.

14. **ACCOUNTING role has access to PDF and duplicate routes.**
    Routes po-pdf, bol-pdf, duplicate/[orderId], and order-groups allow
    ADMIN, CSR, and ACCOUNTING. SALES is blocked. Do not change this without
    deliberate review — Accounting needs to generate and send POs/BOLs.

15. **Session handling uses src/proxy.ts — NOT src/middleware.ts.**
    Next.js 16 renamed middleware.ts to proxy.ts with a `proxy` export.
    Never create src/middleware.ts — it will conflict and break the build.

16. **Vercel Framework Preset must be set to Next.js.**
    If deploying a new Vercel project, go to Settings → General → Framework Preset
    and set it to Next.js. Leaving it as "Other" causes 404 on all routes.

17. **Stale .next cache causes all routes to 404 on Turbopack.**
    If all routes return 404 and nothing appears in the dev server terminal when
    hitting them, delete .next and restart:
    `rm -rf .next` (Git Bash) then `npm run dev`.
    This is the first debugging step for any unexplained 404s.
    Never use Remove-Item in Git Bash — that is PowerShell syntax.

18. **drizzle.config.ts loads .env.local via dotenv.**
    `npm run db:migrate` and other drizzle-kit CLI commands work without any
    manual env var setup. Do not remove the dotenv import from drizzle.config.ts.

19. **@react-pdf/renderer cannot render SVG.** Always use PNG or JPG for images
    in PDF components. Logo must be PNG. Stored at /public/mph-logo.png and
    referenced via https://oms-jade.vercel.app/mph-logo.png in company_settings.

20. **BOL description extraction uses bolDescription() helper** in
    src/lib/orders/build-bol-pdf.tsx. Strips "SPLIT LOAD n — " prefix, takes
    text before first "|". CSR convention: always use "|" to separate product
    specs in description field.
    The BOL PDF renders a **Contact Information & Delivery Notes** section below
    the Ship To box. It pulls from ship_to.shipping_notes only. Rendered as a
    free-text block. Section is hidden when shipping_notes is empty or absent.
    The Ship To box renders name and address only — no contact fields.
    ship_to JSONB keys phone_office, phone_ext, phone_cell, email, email2 are
    all legacy — not rendered on the order form. Retained for historical data.
    bill_to JSONB keys email and email2 are legacy — not rendered on the order
    form. phone_office, phone_ext, phone_cell are still rendered on Bill To.

21. **product_weights table** stores canonical BOL product names and weights.
    Seeded with 17 products. Do not hardcode weights anywhere — always query
    this table. **product_name values must exactly match the text returned by
    bolDescription()** from order descriptions. Use the abbreviation "Gal" (not
    "Gallon"), no apostrophe-s, following the ORDER_TYPES naming convention.
    Example: "275 Gal Rebottle IBC" not "275 Gallon Rebottle IBC's". If a BOL
    weight shows "--", the extracted description does not match any row in
    product_weights — check the exact string in Vercel logs under
    "[BOL PDF] keys going into inArray:".

22. **PO PDF logic lives in src/lib/orders/build-po-pdf.tsx**
    **BOL PDF logic lives in src/lib/orders/build-bol-pdf.tsx**
    **Recycling PO PDF logic lives in src/lib/recycling/build-recycling-po-pdf.tsx**
    Route files handle data fetching only. PDF components handle rendering only.
    - PO PDF background color is #ffffff (white). Constant: PAGE_BG in build-po-pdf.tsx.
    - Sales Order # field removed from PO PDF and all order forms as of 2026-04-28.
      Column retained in schema for historical data only. Do not re-add to any UI or PDF.
      See ⛔ DO NOT RE-ADD section above.
    - BOL signature boxes: Shipper and Carrier boxes each have a spacer <Text> element
      between the "Signature:" label and the signing underline. Consignee box has no
      signing line.
    - BOL return email is bol@mphunited.com. Hardcoded in build-bol-pdf.tsx.
    - Recycling PO PDF does NOT render any notes fields. appointment_notes
      and po_notes are not rendered. Do not add notes rendering to
      build-recycling-po-pdf.tsx under any circumstances.

23. **invoice_paid_date and commission_paid_date are date columns on orders.**
    invoice_paid_date = when customer paid. Set by Accounting on the order edit form.
    commission_paid_date on orders is updated for backward compatibility only — the
    canonical commission_paid_date lives on order_split_loads rows, stamped by
    POST /api/commission/mark-paid.

24. **Vendor contact arrays (po_contacts, bol_contacts, invoice_contacts, schedule_contacts)
    all use shape `[{name, email, role: "to"|"cc"}]`.**
    `role: "to"` = primary recipient; `role: "cc"` = copied recipient.
    Backward-compat: normalizeContacts() in vendor detail treats `is_primary=true` as
    `role="to"`, `is_primary=false` as `role="cc"` for older records that lack role field.
    Validation: save is blocked if po_contacts or bol_contacts have entries but none
    with role="to".
    If bol_contacts or po_contacts is empty, sendBolEmail and sendPoEmail open an Outlook
    draft with an empty To field rather than throwing. This is intentional.

25. **inArray() from drizzle-orm must be used for IN queries.** Never use
    manual .in() on a column. Import inArray from 'drizzle-orm'.

26. **Date display format is MM/DD/YYYY throughout the UI.** Stored format in
    the database remains YYYY-MM-DD. Format on display only, never on storage.

27. **Outlook Web deeplinks are no longer used.** All email actions now use
    Microsoft Graph API to create drafts with PDF attachments already attached.

28. **Never use Outlook Web deeplinks for email.** Use Microsoft Graph API via
    the resilient email modules.
    - MSAL client: src/lib/email/msal-client.ts — singleton PublicClientApplication.
      getMailToken() acquires token silently, popup fallback.
    - Resilient token acquisition: src/lib/email/msal-client-resilient.ts
      getMailTokenResilient() — adds popup retry (2 attempts), 30s timeout,
      structured TokenAcquisitionError with codes: SILENT_FAILED | USER_CANCELLED |
      POPUP_TIMEOUT | POPUP_FAILED. Import isTokenError() for type guard.
      USER_CANCELLED is retryable=true; SILENT_FAILED is retryable=false.
    - Token cache: src/lib/email/token-cache.ts — singleton tokenCache.
      tokenCache.acquire('mail_token', fn) prevents concurrent token acquisitions
      and caches tokens for 55 minutes with a 30-second expiry buffer.
    - Graph helpers (fragile originals): src/lib/email/graph-mail.ts
      createDraft(), attachFileToDraft(), openDraft() — still used for openDraft only.
    - Resilient Graph helpers: src/lib/email/graph-mail-resilient.ts
      createDraftResilient(), attachFileToDraftResilient() — wrap Graph calls in
      retryWithBackoff (3 attempts, exponential backoff 1s→2s→4s).
      GraphAPIError class: status, retryable (true for 408/429/5xx), context.
      Non-retryable errors (401/403/400) throw immediately without retry.
    - Azure App Registration: clientId 2785bb21-50cc-4e45-a996-c0aec39b13bd,
      tenantId 3abf2937-e518-43e5-b2a4-456eecfa8b00.
    - All email action hooks (use-order-email-actions.ts, email-draft-helpers.ts)
      use getMailTokenResilient + createDraftResilient + attachFileToDraftResilient.
      The raw getMailToken/createDraft/attachFileToDraft must NOT be used in new code.

29. **MSAL version is @azure/msal-browser 4.28.1 (pinned).** Do NOT upgrade to v5
    — popup flow is broken in v5. The redirectUri points to /msal-callback.html
    (a static HTML file at public/msal-callback.html — not a Next.js page).
    Azure SPA redirect URIs registered:
    http://localhost:3000/msal-callback.html,
    https://oms-mphuniteds-projects.vercel.app/msal-callback.html,
    https://oms-jade.vercel.app/msal-callback.html.

30. **PO email body is built by src/lib/email/build-po-email.ts** — pure function,
    takes order data, returns { subject, bodyHtml, to, cc }.
    Never inline PO email construction in a component or route.
    - Intro string uses vendorName directly — do NOT prepend "MPH United / " as a
      hardcoded prefix. Vendor names already contain their full display string.
    - When all orders in the batch have is_revised = true, subject is prefixed with
      "REVISED: " and orderWord becomes "1 REVISED order" / "N REVISED orders".
    - is_revised must be included in OrderSnap (optional: boolean) and passed through
      use-edit-order-form.ts and use-order-email-actions.ts to buildPoEmail.

31. **Email buttons do NOT show a greeting modal.** The greeting name is derived
    automatically from vendor.name. Do not add a modal to any email flow.

32. **orders table has csr2_id — nullable UUID FK to users.id.** The order form and
    edit page both have a CSR 2 (optional) dropdown. API routes accept and return
    csr2_id and csr2_name. Schedule PDFs display CSR as first name only; two CSRs
    shown as FirstName / FirstName2. recycling_orders does NOT have csr2_id.

33. **users table has title (text), phone (text), email_signature (text), and
    can_view_commission (boolean, default false) columns.** Email signatures are
    appended to all Graph API drafts automatically via getUserSignature() called
    in parallel with getMailToken(). Manage user records including signature on
    /team page (ADMIN only).

34. **users table has a permissions column (jsonb, default []).** Valid values in the
    array: "SALES" | "CSR". This controls which order-form role dropdowns a user
    appears in, independent of their app access role. Salesperson dropdown filters
    GET /api/users?permission=SALES. CSR dropdown filters GET /api/users?permission=CSR.
    A user with role=ADMIN can have either or both permissions to appear in order form
    dropdowns. Managed on the /team page.

35. **freight_carrier on orders is a Select dropdown** populated from dropdown_configs
    where type = 'CARRIER'. Fetch via GET /api/dropdown-configs?type=CARRIER, which
    returns a string[] from the row's values jsonb array. Seeded with 34 carriers.
    The same CARRIER dropdown is used on recycling order forms.

36. **on_auth_user_created trigger syncs auth.users → public.users on first SSO login.**
    Fires AFTER INSERT on auth.users. Name extraction priority:
      1. raw_user_meta_data->>'full_name'
      2. CONCAT(custom_claims->>'given_name', ' ', custom_claims->>'family_name')
      3. email (last resort)
    Tracked in drizzle/0010_auth_user_sync_trigger.sql for version control.
    Applied via Supabase MCP (not drizzle-kit — pooler lacks auth schema DDL permission).
    Do NOT attempt to re-apply via npm run db:migrate — use Supabase MCP apply_migration.
    drizzle-kit db:push crashes when existing tables have check constraints (known bug).
    For new table DDL: write schema in schema.ts, apply via Supabase MCP apply_migration,
    then add the table name to tablesFilter in drizzle.config.ts.

37. **Commission eligibility is determined per split load** by looking up
    order_split_loads.order_type against the order_type_configs table
    (is_commission_eligible column). Do NOT use keyword matching — it has been
    replaced by a DB lookup. commission_status and commission_paid_date live on
    order_split_loads. The order-level commission_status on orders is derived from
    split load statuses and kept for backward compatibility only.
    Recycling orders have a commission_status column but no commission tracking workflow
    is built for them in Phase 1.

38. **order_split_loads carries per-load fields** in addition to its pricing columns:
    customer_po (overrides order-level when set), order_type (drives commission
    eligibility for this load), ship_date, wanted_date, commission_status
    (default 'Not Eligible'), commission_paid_date, and order_number_override
    (per-load MPH PO when the load needs its own sequential number).
    qty precision: numeric(12,3). buy precision: numeric(12,3). sell: numeric(10,2).

39. **Split load MPH PO numbers** are generated via SELECT nextval('order_number_seq')
    on save only — never on preview. Preview uses pg_sequence_last_value without
    consuming the sequence. The generated number is stored in
    order_split_loads.order_number_override.

40. **GET /api/orders search includes order_split_loads.order_number_override**
    via a subquery so searching for a split-load override PO number surfaces the
    parent order in the results.

41. **GET /api/dropdown-configs?type=X returns { type, values, meta }.**
    values is string[]. meta is nullable JSONB of per-label badge colors.
    PUT /api/dropdown-configs performs full array replacement for a given type.
    ADMIN role enforced server-side on PUT. Currently manages types:
    CARRIER (freight carriers), ORDER_STATUS (order status values).
    PUT sorts values alphabetically before saving. PUT merges meta — does not
    null it out when meta is absent from the request body.

42. **users table has is_commission_eligible boolean (default false).** Only users
    with is_commission_eligible = true appear in the commission report salesperson
    dropdown and commission API queries. Currently only Renee Sauvageau is eligible.
    Managed on /team page by ADMIN. Distinct from can_view_commission (controls
    whether a user can see the commission nav item at all).

43. **dropdown_configs.meta is a nullable JSONB column storing per-label badge colors.**
    Shape: { [label: string]: { color: string } }. The existing values column stays
    as string[]. Do not change the values shape. GET /api/dropdown-configs returns
    { type, values, meta }. PUT accepts optional meta and merges — never nulls it.
    Default colors seeded for ORDER_STATUS (17 values) and CARRIER (34 values).
    Colors editable in /settings via inline swatches on each item row.

44. **The orders table expanded row uses card-style layout** inside a single colSpan
    cell. Do not attempt to align expanded row cells to parent column widths — column
    widths are dynamic and this pattern always misaligns. Each split load renders as
    a card: bg-muted/40 rounded-md p-3 border-l-4 border-[#B88A44], grid grid-cols-2.

45. **Expanded split load detail (chevron click on order row) shows per-load fields:**
    Load PO | Customer PO | Description | Qty | Buy | Sell. Ship Date and Wanted Date
    are NOT shown (already on main row). Order Type is NOT shown (redundant).
    Customer PO is shown directly below Load PO.

46. **Order Summary Drawer** — clicking the MPH PO number in the orders table opens a
    Sheet drawer (side="right", w-[520px]) that fetches from GET /api/orders/[orderId].
    The PO number cell is a button, not a link. The Edit Order link is in the drawer
    header. Never use Button asChild for the Edit Order link — use a styled native Link.

47. **GET /api/dropdown-configs returns { type, values, meta }** — NOT a plain string[].
    Callers that only need the values array must extract .values from the response.
    Three existing callers patched when meta was added:
    orders-filter-bar.tsx, use-edit-order-form.ts, use-new-order-form.ts.
    Recycling forms also use .values extraction for CARRIER dropdown.

48. **Filter bar on /orders has two always-visible rows — no More Filters toggle.**
    Recycling list pages (/recycling/ibcs and /recycling/drums) use the same two-row
    pattern without the Flagged pill:
    - Row 1: Search | lifecycle pills (Active/Complete/All) | Status single-select dropdown
         (RECYCLING_STATUSES — NOT multi-select) | Clear Filters
    - Row 2: Customer | Vendor | CSR | Salesperson (all single-select)
    API params: customer_id, vendor_id, csr_id, salesperson_id, status.
    No Canceled lifecycle pill on any filter bar.

49. **New Order form layout rules:**
    - Blind Shipment toggle is in the Customer & Vendor section, second row under Vendor.
    - Flag This Order and Revised PO are NOT on the New Order form — Edit page only.
    - Save Order button is at the bottom of the form, below Misc Notes.
    - Invoice & Payment section is on Edit page only.
    - Manual PO entry mode is available to ADMIN and CSR roles via a toggle.

50. **Color inputs in settings — Use `<input type="color">` directly as the visible
    swatch element.** Never use a hidden input triggered via a ref click — this pattern
    does not reliably fire onChange.

51. **PATCH /api/orders/[orderId] — checklist is intentionally excluded from full-form
    saves.** It is only written when the PATCH body contains checklist as the sole field
    (sent by ChecklistPopup in order-row.tsx).

52. **DATE_FIELDS coercion on order_split_loads** — ship_date, wanted_date, and
    commission_paid_date must be coerced from empty string ("") or undefined to null
    before DB insert/update. PostgreSQL rejects empty string for date columns.

    **recycling_orders PATCH coerce pattern** — coerce empty strings to null only.
    Do NOT coerce undefined fields to null — absent fields are excluded from the
    SET clause automatically by Drizzle and do not need to be set at all.
    Wrong:  if (out[f] === '' || out[f] === undefined) out[f] = null
    Right:  if (out[f] === '') out[f] = null

    additional_costs on recycling_orders is NOT NULL with default '0'. Always
    add an explicit fallback after the coerce loops:
      if (out.additional_costs === null || out.additional_costs === undefined) {
        out.additional_costs = '0'
      }
    Never set a NOT NULL column to null in a PATCH — check schema.ts for
    notNull() constraints before adding fields to any coerce function.

53. **customer_contacts JSONB shape on orders** | [{name, email, is_primary: boolean}]
    — is_primary=true → To recipient, false → Cc recipient for confirmation emails.
    Default first contact to true, rest to false. Treat missing is_primary as true.

    **Email Customer Confirmation** | POST /api/orders/confirmation-email. Accepts
    orderIds[]. Guards against multi-customer selection (400). CPU detection:
    freight_carrier contains "CPU" (case-insensitive). Opens Graph API draft — does not
    auto-send. HTML email uses Outlook-safe nested table layout. orders@mphunited.com
    is NOT added to confirmation email Cc — it belongs to PO emails only.

    **PO email duplicate recipient fix** | graph-mail.ts parseEmailAddress() splits
    RFC 5322 "Name <email>" strings into separate name and address fields.

54. **order_type_configs is the runtime source of truth for order types and commission
    eligibility.**
    - Do NOT use keyword matching to determine commission eligibility anywhere.
    - Always join or query order_type_configs to get is_commission_eligible.
    - The ORDER_TYPES constant in schema.ts exists for TypeScript type safety only.
    - ADMIN can add, remove, and toggle commission eligibility via /settings.
    - API route: GET /api/order-type-configs (auth required, all roles).

55. **product_weights table is managed via /settings (Product Weights section).**
    - ADMIN only. CRUD on product_name / weight_lbs rows.
    - product_name values must exactly match bolDescription() output (text before "|").
    - API route: GET /api/product-weights (all roles). POST, PUT, DELETE: ADMIN only.

56. **global_email_contacts is a standalone table — not linked to customers or vendors.**
    It is a flat shared directory of name/email/company/type used for autocomplete on
    order forms. email is unique (enforced by DB constraint). type is a pgEnum:
    CONFIRMATION | BILL_TO | BOTH. Company is optional (nullable text).
    Do NOT add foreign keys from global_email_contacts to any other table.

57. **Canonical order status spelling is "Canceled" (one L).** "Cancelled" (two L's) was
    removed from ORDER_STATUSES in schema.ts and normalized in the database via migration.
    Do not reintroduce "Cancelled" anywhere — not in code, queries, filters, seed data,
    or migrations. The lifecycle filter in GET /api/orders uses "Canceled" only.

58. **GET /api/orders uses an explicit Drizzle .select({}) — it does NOT auto-include new
    columns.** Any new field added to the orders table that needs to reach the client MUST
    be explicitly added to the .select({}) in src/app/api/orders/route.ts. The [orderId]
    GET uses db.query.orders.findFirst which returns all columns automatically — but the
    list route does not. This has caused silent bugs. Always check both routes when adding
    a new orders table column. Apply the same discipline to GET /api/recycling-orders.
    When adding a new row-level feature (popup, indicator, computed value), check the list
    route .select({}) first — the detail route does not need changes for popups or drawers.

59. **Orders list default sort is ship_date ASC NULLS LAST.**
    Sortable columns: ship_date, customer_name, ship_to_name, vendor_name.
    Recycling list pages default sort: pick_up_date ASC NULLS LAST.

60. **Flagged orders visual treatment in orders list.**
    When order.flag is true: <tr> gets bg-red-50 dark:bg-red-950/20, Flag icon renders
    text-red-500 fill-red-500. Optimistic update is in orders-table.tsx — visual flips
    immediately on click before API responds. Same treatment applies on recycling list
    pages.

61. **order_groups table enables multi-ship-to order grouping (2–4 orders, same vendor).**
    - group_po_number is minted from nextval('order_number_seq') — same sequence as
      regular order numbers and recycling order numbers.
    - orders.group_id (nullable UUID FK to order_groups) — null on all standard orders.
    - When group_id is set, /api/orders/[orderId]/po-pdf generates a combined multi-ship-to
      PDF using group_po_number as the PO number.
    - Grouping is managed from the orders list page selection toolbar (ADMIN/CSR only).
    - Ungrouping (ADMIN only): sets group_id = null on all members, deletes order_groups row.
    - Maximum 4 orders per group. All orders in a group must share the same vendor_id.
    - Recycling orders do NOT support grouping.
    - Multi-ship-to PDF builder: src/lib/orders/build-multi-ship-to-pdf.tsx.
    - API routes: POST /api/order-groups (create group), DELETE /api/order-groups/[id]
      (ungroup, ADMIN only).
    - group_po_number displays stacked below the individual order_number in the MPH PO
      cell on both the Orders list and Invoicing page. Not shown in the Customer column.
      Orders list search uses a groupSubquery with inArray. Invoicing path uses a LEFT
      JOIN on order_groups. Both return all orders in the group when a group_po_number
      matches.

62. **Recycling orders have an inverted customer/vendor relationship for IBC orders.**
    - recycling_orders.customer_id = the company providing empty IBCs or drums for
      disposal. It is a record in the customers table.
    - recycling_orders.vendor_id = the recycling/processing facility that receives
      and processes the containers. It is a record in the vendors table.
    - PO PDF "Vendor" block — differs by recycling_type:
        IBC: "Vendor" block = customer record (inverted — PO addressed to IBC source
             company). Address: customers.bill_to, fall back to customers.ship_to if
             bill_to is null or empty.
        Drum: "Vendor" block = vendor record (NOT inverted — PO addressed to processing
              facility). Drum layout is NOT inverted.
    - PO PDF right column — differs by recycling_type:
        IBC: right column label = "SHIP TO", data = vendor.address.
             Hidden (shows "CPU" only) when is_blind_shipment = true.
        Drum: right column label = "SHIP FROM", data = order.ship_from JSONB.
              shape: { name, street, city, state, zip }
              If ship_from is null/empty, render block empty — do not throw.
    - PO PDF info grid — differs by recycling_type:
        IBC info grid:  Row 1: PO NUMBER / PO DATE
                        Row 2: SHIP VIA / CUSTOMER PO #
        Drum info grid: Row 1: CUSTOMER PO # / REQUIRED SHIP DATE (order.pick_up_date)
                        Row 2: SHIP VIA / APPT. TIME (always "--" — appointment_notes
                               is IBC-only per Rule 67)
    - po_contacts on recycling_orders drives PO email To/CC — NOT vendor.po_contacts.
      po_contacts shape: [{ name, email, role: "to"|"cc" }]
    - IBC PO emails: CC includes orders@mphunited.com.
    - Drum PO emails: CC does NOT include orders@mphunited.com.
    - If po_contacts is empty, draft opens with empty To field — do not throw an error.
    - PO_CONTACTS NAME SANITIZATION: po_contacts name field must store display name only —
      never an RFC 5322 formatted string (e.g. "Name <email>"). The po-pdf route sanitizes
      c.name with /<[^>]*>/g before building x-email-to and x-email-cc headers. If a
      contact's name field contains an embedded email in angle brackets, the sanitization
      strips it before wrapping with <${c.email}>.

63. **Drum recycling vendor default is Coastal Container Services.**
    - UUID: 8ae0764b-c98d-4b4f-a71f-1e0111225a94 (MPH United / Coastal Container
      Services -- Alvin, TX)
    - Stored as COASTAL_VENDOR_ID constant in src/lib/recycling/use-new-drum-form.ts.
    - Pre-fills vendor_id on the new drum form. Field remains a dropdown — editable.
    - COASTAL_DEFAULT_SELL = "12.00" is also in use-new-drum-form.ts. Pre-fills the sell
      field when vendor = Coastal and sell is currently empty. CSR can edit freely.
    - COASTAL_DEFAULT_BUY = "5.00" is in use-new-drum-form.ts. Pre-fills the buy
      field when vendor = Coastal and buy is currently empty. Never overwrites an existing value.
    - CONTAINER_SERVICES_CUSTOMER_ID = "212d0119-52e4-4bf8-acb1-41026f47320e"
      (Container Services Network). Pre-fills customer_id on new drum form initialization.
      Applied only when customer_id is null/empty — never overwrites an existing value.

64. **Recycling orders use the same order_number_seq as regular orders.**
    - Same [Initials]-MPH[Number] format. No separate sequence.
    - Recycling PO numbers appear in the same number range as regular orders.
    - order_groups.group_po_number also uses the same sequence.

65. **Recycling statuses are hardcoded in RECYCLING_STATUSES constant in schema.ts.**
    - Not managed via dropdown_configs. Do not add a RECYCLING_STATUS type there.
    - Values: Acknowledged Order | PO Request To Accounting | Waiting On Vendor To
      Confirm | Credit Sent In | Confirmed To Customer | Waiting For Customer To
      Confirm | Ready To Pickup | Picked Up | Sent Order To Carrier | Ready To Ship |
      Ready To Invoice | Complete | Canceled

66. **appointment_notes on recycling_orders is plain text, not a timestamp.**
    - Free-text field (e.g. "Not needed right away", "Call ahead").
    - Never use a timestamp, DatePicker, or TimePicker input for this field.
    - IBC orders only — not shown on drum order forms.

67. **recycling_type discriminator field.**
    - Values: 'IBC' | 'Drum'. Column is NOT NULL, default 'IBC'.
    - Always pass recycling_type in POST /api/recycling-orders body.
    - Always include ?type=IBC or ?type=Drum in GET /api/recycling-orders — it is
      required, not optional.
    - IBC-only fields (hide from drum forms): delivery_date, appointment_notes,
      freight_credit_amount, ship_to.
    - Drum-only fields (hide from IBC forms): ship_from, bill_to, customer_contacts.

68. **Default CSR on recycling order forms is Matt Cozik.**
    - Applies to both IBC and Drum new and edit forms.
    - Implementation: after fetching CSR users list for the dropdown, find the user
      with name === "Matt Cozik" and set csr_id to that user's id.
    - New forms: apply whenever csr_id is null/empty at initialization.
    - Edit forms: apply only if the loaded order's csr_id is null. Never overwrite
      an existing CSR assignment.
    - If Matt Cozik is not found in the list (e.g. deactivated), leave csr_id empty.

69. **Drum recycling orders: invoice_status and invoice_customer_amount are not
    user-editable and are not rendered in the drum form UI.**
    - POST and PATCH for drum orders always send invoice_status: 'Invoice'.
    - invoice_customer_amount is always null for drum orders — it is not calculated
      or stored.
    - These fields remain in the schema and are fully used by IBC orders.
    - Do not re-add these fields to drum forms.

70. **part_number is not rendered on any recycling order form (IBC or Drum).**
    - New IBC and Drum forms always send part_number: null on POST.
    - The column is retained in recycling_orders for historical data only.
    - Do not re-add part_number to any recycling form UI.

71. **Email error logging.** All email operation failures are logged to the
    email_errors table via src/lib/email/error-logger.ts.
    - logEmailError(context, error, severity?) — never throws, swallows fetch failures.
    - Severity values: 'warning' | 'error' | 'critical'.
    - API endpoint: POST /api/logs/email-error — session-guarded, inserts to DB.
    - email_errors table: id, user_id, context, message, status_code, severity,
      created_at. RLS enabled with service_role policy.
    - Query pattern: SELECT context, severity, COUNT(*) FROM email_errors
      WHERE created_at > now() - interval '7 days' GROUP BY context, severity
      to monitor email health.

72. **Navigation guard and unsaved changes protection.**
    - src/lib/navigation-guard.ts — module-level singleton (not React context).
      navigationGuard.setDirty(v), navigationGuard.isDirty(), navigationGuard.confirm().
      confirm() shows window.confirm if dirty, returns true if clean.
    - src/hooks/use-unsaved-changes.ts — call useUnsavedChanges(isDirty) in any
      edit or new-record page. Handles: beforeunload (tab close/refresh),
      popstate (browser back attempt), and publishes to navigationGuard.
    - src/components/layout/app-sidebar.tsx — all nav items use guardedNavigate(href)
      instead of plain <Link>. Checks navigationGuard.confirm() before router.push.
    - isDirty tracking pattern for pages using individual useState fields (no RHF):
      add isDirty + markDirty: () => setIsDirty(true) to the form hook, call
      markDirty() in onChange of key fields. Reset setIsDirty(false) after save and
      after initial data load.
    - isDirty tracking for forms rendered as child components (recycling pages):
      form component accepts onDirtyChange?: (v: boolean) => void prop. Page owns
      local isDirty state fed by onDirtyChange, passes to useUnsavedChanges.
    - react-hook-form pages (new-order-form): use form.formState.isDirty && !savedOrder.
    - BROWSER BACK BUTTON LIMITATION: popstate fires after Next.js router has already
      navigated internally. window.history.pushState restores the URL but not the
      React tree. Browser back cannot be reliably prevented in Next.js App Router
      without a third-party library. Sidebar links and in-page back buttons are
      the reliable interception points.

73. **Product Totals (/product-totals), Margins (/margins), and Order Frequency
    (/order-frequency) are ADMIN + ACCOUNTING only.**
    Role check enforced in two places for each section: server-side redirect in page.tsx
    and 403 guard in all API routes under /api/product-totals/, /api/margins/,
    /api/order-frequency/.
    Do NOT add salesperson-level access until a deliberate decision is made to expose
    aggregate or margin data to the SALES role.
    Recharts IS installed. Do not install it again.
    Product Totals: aggregate drum/IBC cards computed client-side from the product-totals
    API response — no separate query. Shipment counting rule: COUNT(DISTINCT order_id)
    per product type. One order = one truck. Mixed-type orders give each product type
    independent shipment credit. Recycling orders use pick_up_date as date filter (no
    ship_date column on recycling_orders). PDF route must include: export const runtime = 'nodejs'
    Margins: shows regular orders only — exactly one order_split_loads row, status !=
    'Canceled', order_type not '275 Gal IBC Wash & Return Program' or '330 Gal IBC
    Wash & Return Program'. One row per order. Filters: date range (ship_date),
    Customer, Ship To, Vendor, Salesperson (SALES role only), Search (customer name,
    order_number, vendor name). Salesperson dropdown populated from
    /api/margins/salesperson-options — role = 'SALES' only, not ADMIN or CSR.
    Salesperson column renders first name only. Commission Amount column = qty × $3
    for commission-eligible orders (per order_type_configs), shown as "—" when
    ineligible. Commission is always deducted from Profit regardless of column display.
    IBC Total Cost = (bottle_cost × bottle_qty) + mph_freight_bottles + additional_costs.
    IBC Total Sell Price = (sell × qty) + freight_to_customer.
    mph_freight_bottles is used directly in IBC Total Cost; used as
    (mph_freight_bottles / 90) × bottle_qty in the Profit formula — intentionally
    different. Excel export via xlsx (SheetJS). Export button in filter bar row 1
    alongside Run Report. Disabled when no rows loaded.
    Order Frequency: grouped bar chart (Recharts), two series per month — "Orders Placed"
    (navy #1a2744, by order_date) and "Orders Shipped" (blue #3b82f6, by effective
    ship_date = COALESCE(MIN(split_load.ship_date), orders.ship_date)). Customer required
    before Run Report. Ship To dropdown reuses /api/margins/ship-to-options.
    Zero-count months always included in both series.
    Ship To composite key (used in both Margins and Order Frequency):
    CONCAT(ship_to->>'name', '|', ship_to->>'city', '|', ship_to->>'state').
    Ship To label format: "name, city, state" — all three parts from orders.ship_to JSONB.
    /api/margins/ship-to-options is shared between Margins and Order Frequency — do not
    duplicate it.

74. **Always use supabase.auth.getUser() for authentication and identity checks.**
    Never use supabase.auth.getSession() for this purpose — session data comes from
    cookies and is not verified by the Auth server. getUser() authenticates by
    contacting the Supabase Auth server directly and is the only secure option.
    Pattern: const { data: { user }, error } = await supabase.auth.getUser()
    Guard: if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    When a file already has a local const user = (a DB lookup result), rename the DB
    result to dbUser to avoid shadowing the auth user. This was applied to:
    me/route.ts, orders/route.ts, orders/[orderId]/route.ts, order-groups/route.ts,
    orders/duplicate/[orderId]/route.ts.
    src/proxy.ts already used getUser() — do not change it.

75. **Never use asc(nullsLast()) or desc(nullsLast()) from drizzle-orm for ORDER BY.**
    These wrappers generate invalid PostgreSQL — the direction modifier is appended
    after NULLS LAST, producing `pick_up_date NULLS LAST asc` which PostgreSQL rejects.
    This caused every GET /api/recycling-orders request to return a 500 silently until
    error logging was added.
    Always write sort-with-nulls as a raw SQL template:
    `.orderBy(sql`${table.column} asc nulls last`)`
    `.orderBy(sql`${table.column} desc nulls last`)`
    This applies to every list route. The orders list route uses ship_date. The
    recycling-orders list route uses pick_up_date. Any new list route must follow
    this pattern.

76. **Orders filter bar uses two-layer persistence: URL params + sessionStorage.**
    URL params: written on every filter change via router.replace(..., { scroll: false }).
    Read on mount as first priority. Supports refresh and shareable/bookmarkable URLs.
    Defaults (lifecycle=active, empty selections) are omitted from the URL to keep it clean.
    sessionStorage key "orders_filters": written alongside URL params on every change.
    Read on mount only when URL has no filter params (i.e. user navigated to plain /orders
    via the sidebar). Survives client-side navigation. All sessionStorage access is wrapped
    in try/catch (throws in some privacy browser modes).
    Clear Filters: resets to DEFAULT_FILTERS, calls router.replace to collapse URL to /orders,
    and calls sessionStorage.removeItem("orders_filters").
    The /invoicing and /recycling list pages use URL params only — no sessionStorage layer yet.

77. **Drizzle migration journal discipline — how to handle journal drift.**
    The journal drifts when schema changes are applied via Supabase MCP instead of db:migrate
    (required when DDL touches the auth schema, which the Transaction Pooler cannot access).
    To resync after drift:
    1. Run npm run db:generate and inspect the output SQL.
    2. For each statement that re-applies existing DDL: wrap CREATE TABLE with IF NOT EXISTS,
       wrap ADD COLUMN with ADD COLUMN IF NOT EXISTS, wrap CREATE INDEX with CREATE INDEX IF
       NOT EXISTS, wrap CREATE TYPE with a DO/EXCEPTION block.
    3. For auth-schema DDL (triggers on auth.users): replace entirely with SELECT 1; — the
       pooler cannot execute auth-schema statements.
    4. Run npm run db:migrate to advance the journal.
    5. Run npm run db:generate again — output must be "No schema changes, nothing to migrate".
    6. Run the Supabase security advisor to confirm zero critical errors.
    Never run npm audit fix --force — the esbuild advisory in drizzle-kit is a known
    acceptable vulnerability (see KNOWN ACCEPTABLE VULNERABILITIES).
    **tablesFilter must include ALL tables in schema.ts** — if a table is missing from the
    filter, db:generate cannot detect drift for it, forcing MCP-only migrations and
    recurring journal drift. Always add new tables to tablesFilter when adding them to
    schema.ts. Current canonical list: users, customers, vendors, order_groups, orders,
    order_split_loads, recycling_orders, bills_of_lading, company_settings,
    dropdown_configs, product_weights, order_type_configs, audit_logs,
    global_email_contacts, credit_memos, credit_memo_line_items, email_errors.
    **If db:generate outputs "No schema changes, nothing to migrate"**: the journal is
    already in sync. Skip steps 2–4. Proceed directly to step 6 (security advisor).

78. **stripMphPrefix utility — always use for vendor name display.**
    File: src/lib/utils/strip-mph-prefix.ts
    Vendor names in the database are stored as "MPH United / [Vendor Name]".
    Never render raw vendor names directly. Always wrap with stripMphPrefix()
    before displaying in any table cell, dropdown option, or export column.
    The utility strips the prefix with a case-insensitive regex. The stored
    value is never modified — stripping happens at render time only.
    Currently applied in:
      - product-totals-section.tsx (Vendor Product Totals table)
      - recycling-totals-section.tsx (IBC and Drum vendor columns)
      - margins-table.tsx (Vendor column)
      - margins-client.tsx (All Vendors dropdown options)
      - edit-ibc-form.tsx (Processing Facility dropdown)
      - edit-drum-form.tsx (Processing Facility dropdown)
    Apply to any future surface that renders vendor names.

79. **Rule: MSAL callback redirect URI**
    The registered Single-page application redirect URI in Azure is `/msal-callback.html`
    (with .html extension). The file `public/msal-callback.html` exists as a static file
    in the Next.js public folder. Do NOT change the redirect URI or remove this file.
    msal-client.ts correctly points to `/msal-callback.html` — do not change it.

80. **Rule: Commission status canonical value**
    The canonical commission split-load status strings are defined in `COMMISSION_STATUSES`
    in schema.ts: `"Not Eligible"`, `"Eligible"`, `"Commission Paid"`.
    The mark-paid route MUST write `"Commission Paid"` — never the bare string `"Paid"`.
    `deriveOrderCommissionStatus` in `src/lib/commission-eligibility.ts` is the single
    source of truth for deriving status. Never hardcode status strings outside of schema.ts
    constants.

81.  **Rule: SALES role data access**
    SALES users see only orders where `salesperson_id = their own user id`.
    This filter is enforced server-side in every API route and page query.
    SALES users cannot create or edit orders.
    Applies to: Dashboard, Orders list, Order Frequency, Margins.
    Do NOT remove or weaken these filters.

82.  **Rule: Commission nav visibility**
    Commission page nav item is gated by `can_view_commission` flag on the users table.
    As of May 2026: Renee Sauvageau = true, all others = false.
    `is_commission_eligible` is a separate flag controlling salesperson dropdown and
    API filtering in commission report — only Renee is eligible.
    Do not conflate these two flags.

83. **Rule: Recycling order duplication**
    Route: POST /api/recycling-orders/[id]/duplicate
    Access: ADMIN, CSR, ACCOUNTING. SALES blocked (same as rule 14).
    Behavior: copies all fields from the source recycling order except:
      status              → 'Acknowledged Order'
      order_number        → new value from order_number_seq
      pick_up_date        → null
      delivery_date       → null
      appointment_notes   → null
      bol_number          → null
      qb_invoice_number   → null
      flag                → false
      invoice_payment_status → 'Not Invoiced'
      commission_status   → 'Not Eligible'
      part_number         → null
    Returns: { id, recycling_type }
    Navigation: IBC duplicate → /recycling/ibcs/[newId],
                Drum duplicate → /recycling/drums/[newId]
    UI: Duplicate button in page header of both edit pages.
        Shows "Duplicating…" loading state. Sonner toast on success/error.

84. **Rule: RECYCLING_ONLY permission**
    "RECYCLING_ONLY" is a valid value in users.permissions JSONB array.
    No schema migration required — the column accepts any string values.

    Effect:
    - PATCH /api/orders/[orderId]: returns 403 Forbidden immediately after
      auth check if caller's permissions include "RECYCLING_ONLY"
    - /orders/[orderId]/page.tsx: server-side redirect to /orders before
      client component loads if current user has "RECYCLING_ONLY"
    - Has NO effect on recycling order access (/recycling/*)
    - Does NOT block /orders list page — user can still view orders

    Implementation files:
    - src/app/api/orders/[orderId]/route.ts — PATCH guard
    - src/app/(dashboard)/orders/[orderId]/page.tsx — server redirect
      (client code moved to order-edit-client.tsx unchanged)
    - src/components/team/team-member-dialog.tsx — "Recycling Only"
      checkbox under permissions section

    Management: /team page (ADMIN only). Set "Recycling Only" checkbox
    for the user. No SQL required.

    Current users with RECYCLING_ONLY: Matt Cozik (set manually via /team).

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
| Charts           | Recharts — installed. Do not install again.                       |
| PDFs             | @react-pdf/renderer                                               |
| Excel export     | xlsx (SheetJS) — used in Margins report export                    |
| Auth             | Supabase Auth + Microsoft Entra SSO via @supabase/ssr             |
| Theme            | next-themes (light/dark toggle)                                   |
| MSAL             | @azure/msal-browser 4.28.1 (pinned — v5 breaks popup flow)        |
| Forms            | react-hook-form + @hookform/resolvers                             |
| Validation       | zod v4 — import from 'zod'. Use zodResolver directly in useForm(). |
| Notifications    | sonner (toast notifications)                                      |
| Icons            | lucide-react v1.x                                                 |
| Repository       | github.com/mphunited/oms                                          |

**Removed packages — do NOT re-add:**
- `next-auth` — removed, unused. Auth is handled entirely by Supabase Auth + @supabase/ssr.
- `prisma` — removed. ORM is Drizzle only.

---

## CODE QUALITY

Lint: `npm run lint` (scoped to `src/` as of 2026-05-12). Target: 0 errors.
One known deferred warning: `credit-memo-form.tsx` react-hooks/exhaustive-deps
(`today` dependency, low risk). **Do not attempt to resolve this warning** —
it is intentionally deferred and tracked here. Never run lint fixes blindly.
Address errors only; leave warnings documented in this section alone.

---

## PACKAGE DISCIPLINE — READ BEFORE ADDING ANY DEPENDENCY

Before installing any new npm package, you must:

1. **Check if the existing stack already solves the problem.**
2. **If no existing package solves it**, ask: can it be solved with ~20 lines of
   TypeScript? If yes, write the utility. Do not add a dependency.
3. **Only if neither of the above works**, may you add a new package. When you do:
   - Add it to the TECHNOLOGY STACK table in this file with a one-line reason
   - Use the most minimal, well-maintained package available
   - Do NOT add packages that duplicate existing stack capabilities

**Never add a package silently. If you add one, it must appear in this file.**

---

## FILE MODULARITY RULES — NO MONOLITHS

1. **No file may exceed 300 lines.** If a file is approaching this limit, split it.
2. **One component per file.**
3. **Split by concern:** UI layout from data-fetching, form components from page
   components, utilities into src/lib/, API route handlers from business logic.
4. **Reuse before you duplicate.** Check src/components/ for an existing component.
5. **Name files after what they do.** order-status-badge.tsx, use-order-form.ts.
6. **If a new API route needs a helper function longer than ~30 lines**, extract it
   to src/lib/[domain]/[name].ts and import it.

---

## DATABASE CONNECTION

Use Transaction Pooler only — port 6543.
No DIRECT_URL needed. No Session Pooler.
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres

---

## SCHEMA OVERVIEW

Tables: users, customers, vendors, order_groups, orders, order_split_loads,
        recycling_orders, bills_of_lading, company_settings, dropdown_configs,
        product_weights, order_type_configs, audit_logs, global_email_contacts,
        credit_memos, credit_memo_line_items, email_errors

Schema file: src/lib/db/schema.ts — this is the source of truth. Always read it before
writing queries or API routes. Full field-level detail is in PRD.md Section 5.

Key relationships:
- orders.group_id → order_groups (nullable, multi-ship-to feature)
- orders.customer_id → customers (NOT NULL)
- recycling_orders.customer_id → customers (IBC/drum source company, PO recipient)
- recycling_orders.vendor_id → vendors (processing facility, PO destination)
- order_split_loads.order_id → orders (CASCADE delete)
- recycling_orders uses its own qty/buy/sell/description — no order_split_loads rows

---

## ORDER NUMBER FORMAT

Format: `[Initials]-MPH[Number]` — e.g., `CB-MPH15001`
Uses a single Postgres sequence for ALL order numbers:
  `SELECT nextval('order_number_seq')`
This sequence is shared by: regular orders, recycling orders, and order_groups.group_po_number.
Do NOT use MAX(order_number) + 1 — race condition.

---

## MARGIN FORMULA

Applies to regular orders only. Recycling orders have no margin calculation in Phase 1.

Profit =
  SUM per line: (sell - buy) × qty        [order_split_loads]
  + freight_to_customer                   [order level]
  - freight_cost                          [order level]
  - SUM per line: bottle_cost × bottle_qty
  - SUM per line: (mph_freight_bottles / 90) × bottle_qty
  - SUM commission-eligible units × $3
  - additional_costs                      [order level]

Profit % = Profit ÷ ( SUM(sell × qty) + freight_to_customer )
Red threshold: Profit % < 8%

Commission eligibility: determined per order_type via order_type_configs.is_commission_eligible.
Do NOT hardcode eligible/ineligible type lists anywhere — always query order_type_configs.

---

## ORDER STATUS VALUES (STANDARD)

Pending | Waiting On Vendor To Confirm | Waiting To Confirm To Customer |
Confirmed To Customer | Wash & Return Stage | Sent Order To Carrier |
Ready To Ship | Ready To Invoice | Complete | Canceled

## ORDER STATUS VALUES (RECYCLING — hardcoded, not in dropdown_configs)

Acknowledged Order | PO Request To Accounting | Waiting On Vendor To Confirm |
Credit Sent In | Confirmed To Customer | Waiting For Customer To Confirm |
Ready To Pickup | Picked Up | Sent Order To Carrier | Ready To Ship |
Ready To Invoice | Complete | Canceled

---

## ORDER TYPE VALUES

Canonical list lives in order_type_configs table and the ORDER_TYPES constant in schema.ts.
order_type_configs is the runtime source of truth for commission eligibility.
ORDER_TYPES constant is used for TypeScript type safety only.

---

## USER ROLES

ADMIN | CSR | ACCOUNTING | SALES

Role is enforced as a PostgreSQL enum (user_role) in the database.
Default role for new users: CSR.

SALES role enforcement on list APIs:
- GET /api/orders: salesperson_id filter unconditionally enforced server-side
- GET /api/recycling-orders: salesperson_id filter unconditionally enforced server-side
- Both filters applied before processing any query params — client cannot override.

---

## EMAIL PATTERN

All email actions use **Microsoft Graph API** to create Outlook drafts with PDF attachments.
Outlook Web deeplinks are no longer used anywhere in the app.

- Token: call getMailToken() from src/lib/email/msal-client.ts
- Draft creation: createDraft() → attachFileToDraft() → openDraft() from graph-mail.ts
- No greeting modal. User email signature fetched from /api/me, appended to every draft.
- PO email body spec: src/lib/email/build-po-email.ts — pure function
- Regular order PO emails: CC includes orders@mphunited.com
- BOL emails: orders@mphunited.com is NOT CC'd
- Recycling PO emails: To/CC from recycling_orders.po_contacts (NOT vendor.po_contacts).
  Hook: src/lib/recycling/use-recycling-po-email.ts.
  Recycling PO emails (IBC only): CC includes orders@mphunited.com.
  Drum PO emails: CC does NOT include orders@mphunited.com.
- Full email rules in PRD.md Section 11

---

## ORDER FORM AUTOCOMPLETE — GLOBAL EMAILS

Both the New Order and Edit Order forms have autocomplete on two contact fields:
- Customer Contacts for Order Confirmations → GET /api/global-emails?type=CONFIRMATION
- Bill To Contacts → GET /api/global-emails?type=BILL_TO

Fetch the relevant contact list ONCE on page load. Do NOT fire a new API call per keystroke.
Match on both name and email, case-insensitive.

---

## DOCUMENT GENERATION

Regular orders:
- PO PDF: GET /api/orders/[orderId]/po-pdf — nodejs runtime, no separate DB record
- Multi-ship-to PO PDF: same route, uses group_id to build combined document
- BOL PDF: GET /api/orders/[orderId]/bol-pdf
- Weekly schedules: admin (with pricing) and vendor/Frontline (no pricing)
- Credit memo PDF: GET /api/credit-memos/[id]/pdf

Recycling orders:
- PO PDF: GET /api/recycling-orders/[id]/po-pdf — nodejs runtime
  Builder: src/lib/recycling/build-recycling-po-pdf.tsx
  Inverted layout: customer in Vendor block, vendor in Ship To block.
  Single line item from order fields (not split loads). Buy price shown.
  Sets x-email-to/cc/subject response headers for email hook.
- No BOL PDF for recycling — bol_number is recorded as text only.

---

## PHASE BOUNDARIES

**Phase 1 (now):** Everything in PRD.md Section 18.
**Phase 2 (after launch):** Everything in PRD.md Section 20.

**If asked to build a Phase 2 feature, refuse and explain it is Phase 2.**
The /financials route was deleted — do not recreate it.

---

## APPLICATION ROUTES

Full route table in PRD.md Section 17.

Key routes:
- /orders — ongoing orders table (working)
- /orders/new — new order form (working)
- /orders/[orderId] — order detail/edit (working)
- /recycling — redirects to /recycling/ibcs
- /recycling/ibcs — IBC recycling list (2-row filter bar, summary drawer, flag toggle)
- /recycling/ibcs/new — new IBC recycling order form
- /recycling/ibcs/[id] — IBC order detail/edit (Save, Email PO, Download PDF)
- /recycling/drums — drum recycling list
- /recycling/drums/new — new drum form (Coastal pre-filled)
- /recycling/drums/[id] — drum order detail/edit
- /customers — customer list (working)
- /customers/[customerId] — customer detail + contacts editor (working)
- /vendors — vendor list (working)
- /vendors/[vendorId] — vendor detail + contacts + checklist template (working)
- /schedules — weekly schedule generation (working)
- /commission — commission report (working)
- /invoicing — invoice queue + credit memos (working)
- /product-totals — product totals + recycling totals + PDF export (ADMIN + ACCOUNTING)
- /margins — margin report: regular single-load orders, per-order row, Excel export
  (ADMIN + ACCOUNTING)
- /order-frequency — grouped bar chart: Orders Placed vs Orders Shipped per month,
  Customer + Ship To filters (ADMIN + ACCOUNTING)
- /settings — admin settings (working)
- /global-emails — global email directory (working)
- /team — user management (working)
- /api/recycling-orders — GET (?type=IBC|Drum required, paginated, SALES enforced) + POST
- /api/recycling-orders/[id] — GET detail + PATCH (CSR/ADMIN/ACCOUNTING)
- /api/recycling-orders/[id]/po-pdf — GET PDF (nodejs runtime, sets email headers)
- /api/order-groups — POST create group (CSR/ADMIN)
- /api/order-groups/[id] — DELETE ungroup (ADMIN only)
- /api/orders — GET with full server-side filtering + pagination
- /api/orders/[orderId] — GET detail
- /api/orders/[orderId]/po-pdf — GET PO PDF (handles grouped orders via group_id)
- /api/orders/[orderId]/bol-pdf — GET BOL PDF
- /api/orders/duplicate/[orderId] — POST duplicate order
- /api/commission — GET commission data for commission-eligible salespersons. Returns ALL
  order_split_loads rows regardless of order type eligibility. Supports query params:
  salespersonId, startDate, endDate, commissionStatus, invoiceStatus, customerId, vendorId,
  search (ILIKE on order_number, customer_po, customer name, vendor name). Role-filtered.
- /api/commission/mark-paid — POST bulk mark commission paid
- /api/commission/split-load/[splitLoadId] — PATCH update order_type on a single
  order_split_loads row, re-derive commission_status. ADMIN/ACCOUNTING only.
- /api/product-totals/product-totals — GET; filter: order_split_loads.ship_date
- /api/product-totals/customer-orders — GET; monthly/quarterly order counts
- /api/product-totals/recycling-totals — GET; filter: pick_up_date
- /api/product-totals/pdf — GET; export const runtime = 'nodejs'
- /api/margins — GET; single-load orders only; excludes Canceled + W&R Program; all filters
- /api/margins/ship-to-options — GET; distinct ship_to locations for a customer;
  shared by Margins and Order Frequency
- /api/margins/salesperson-options — GET; active users WHERE role = 'SALES' only
- /api/order-frequency — GET; returns orderDateSeries + shipDateSeries, zero-fill all months
- /api/me — GET current user id/name/email/role/email_signature
- /api/users — GET users list; ?permission=SALES|CSR filter
- /api/dropdown-configs — GET { type, values, meta }; PUT (ADMIN only)
- /api/order-type-configs — GET all rows; POST/PUT/DELETE (ADMIN only for writes)
- /api/product-weights — GET all; POST/PUT/DELETE (ADMIN only for writes)
- /api/company-settings — GET/PUT (ADMIN only for PUT)
- /api/global-emails — GET + POST
- /api/global-emails/[id] — PUT + DELETE (ADMIN only for DELETE)
- /api/auth/signout — POST server-side signout

---

## COLLABORATION

Jack (IT lead) builds alone currently. Keith (coworker) will return to the project later.
Both use Claude Code on github.com/mphunited/oms.

---

## WORKTREE DISCIPLINE

Claude Code creates git worktrees under .claude/worktrees/ for each task.
**After every task Claude Code must:**
1. Commit all changes in the worktree
2. Merge the worktree branch to main
3. Push to origin
4. Never leave work on a claude/ branch without merging

Verify with `git log --oneline -5` after every task.
Do not trust Claude Code's success confirmations — verify with git log yourself.

**COMMIT VERIFICATION (mandatory after every Claude Code task):**
Before merging or moving on, ask Claude Code: "Show me the commit hash
for the changes you just made." If it cannot provide one, the changes
are on a worktree branch only. Run:
  git for-each-ref --sort=-committerdate refs/heads/claude/ \
    --format="%(committerdate:short) %(refname:short)" | head -5
then merge the correct branch to main before proceeding.

Inside a git worktree, `git checkout main` silently fails — use
`git push origin HEAD:main` directly from the worktree branch.

**Shell environment:** Jack uses Git Bash on Windows.
- Git Bash commands: rm -rf, find, grep
- PowerShell commands (Remove-Item, Get-ChildItem) do NOT work in Git Bash
- Never give PowerShell commands when the user is in Git Bash
- Always tell him what one to use.

---

## FILE STRUCTURE REFERENCE

src/lib/db/schema.ts          — Drizzle schema, always read before writing queries
src/lib/db/index.ts           — Drizzle client
src/lib/email/msal-client.ts  — MSAL singleton + getMailToken()
src/lib/email/graph-mail.ts   — createDraft(), attachFileToDraft(), openDraft()
src/lib/email/graph-mail-resilient.ts — createDraftResilient(), attachFileToDraftResilient(), GraphAPIError, retryWithBackoff
src/lib/email/msal-client-resilient.ts — getMailTokenResilient(), TokenAcquisitionError, isTokenError()
src/lib/email/token-cache.ts     — tokenCache singleton (55-min cache, 30s expiry buffer)
src/lib/email/error-logger.ts    — logEmailError() — logs to email_errors, never throws
src/lib/navigation-guard.ts      — module-level dirty state for cross-component nav guard
src/hooks/use-unsaved-changes.ts — useUnsavedChanges(isDirty) — beforeunload + popstate + guard
src/components/orders/email-status-indicator.tsx — EmailStatusIndicator, EmailOperationStatus type
src/app/api/logs/email-error/route.ts — POST email error log endpoint
src/lib/email/build-po-email.ts — PO email subject/body builder (pure function)
src/lib/utils/format-date.ts  — formatDate() MM/DD/YYYY display helper
src/lib/orders/badge-colors.ts — getBadgeColor(), getBadgeTextColor() helpers
src/lib/orders/commission-eligibility.ts — deriveInitials(), deriveFirstName() helpers
src/lib/orders/build-po-pdf.tsx — regular order PO PDF builder
src/lib/orders/build-bol-pdf.tsx — BOL PDF builder
src/lib/orders/build-multi-ship-to-pdf.tsx — combined multi-ship-to PO PDF builder
src/lib/invoicing/build-credit-memo-pdf.tsx — credit memo PDF builder
src/lib/recycling/build-recycling-po-pdf.tsx — recycling PO PDF (inverted layout:
  customer in Vendor block, vendor in Ship To; single line item; buy price shown)
src/lib/recycling/use-new-ibc-form.ts   — new IBC form state and submission hook
src/lib/recycling/use-new-drum-form.ts  — new drum form hook; COASTAL_VENDOR_ID const
  (8ae0764b-c98d-4b4f-a71f-1e0111225a94)
src/lib/recycling/use-edit-ibc-form.ts  — edit IBC form state hook
src/lib/recycling/use-edit-drum-form.ts — edit drum form state hook
src/lib/recycling/build-drum-po-email.ts — drum PO email body builder;
  pure function buildDrumPoEmail(order, vendor) → { bodyHtml }; drum only.
  Greeting from vendor.name, 7-column product table (MPH PO, Customer PO,
  Description, Ship Date, Qty, Unit Price, Total), Ship Via/From block,
  three-line footer. IBC uses minimal body in use-recycling-po-email.ts.
src/lib/recycling/use-recycling-po-email.ts — Graph API PO email hook; reads
  x-email-to/cc/subject headers from po-pdf route response
src/lib/schedules/                      — schedule PDF builders, order fetching, utils
src/components/orders/order-summary-drawer.tsx — Sheet drawer (right side), w-[520px]
src/components/orders/order-row.tsx     — contains ChecklistPopup and NotesPopup
src/components/recycling/ibc-recycling-table.tsx — IBC list page client component
src/components/recycling/drum-recycling-table.tsx — drum list page client component
src/components/recycling/new-ibc-form.tsx — new IBC order form component
src/components/recycling/new-drum-form.tsx — new drum order form component
src/components/recycling/edit-ibc-form.tsx — edit IBC order form component
src/components/recycling/edit-drum-form.tsx — edit drum order form component
src/components/recycling/recycling-order-summary-drawer.tsx — Sheet drawer for
  recycling orders; recycling_type-aware (hides delivery_date/freight_credit for Drum)
src/components/commission/commission-client.tsx
src/components/commission/commission-filters.tsx — search input, customer/vendor/salesperson
  dropdowns, commission status pill group (Not Eligible | Eligible | Paid), invoice status
  pill group (Not Invoiced | Invoiced | Paid), Clear Filters button
src/components/commission/commission-table.tsx
src/components/commission/commission-badge.tsx
src/components/settings/carriers-section.tsx
src/components/settings/order-statuses-section.tsx
src/components/settings/company-settings-section.tsx
src/components/settings/order-number-section.tsx
src/components/settings/order-types-section.tsx
src/components/settings/product-weights-section.tsx
src/lib/utils/strip-mph-prefix.ts — strips "MPH United / " prefix from vendor name
  strings at render time; import and use wherever vendor names are displayed
src/app/(dashboard)/product-totals/page.tsx — Product Totals page (ADMIN + ACCOUNTING);
  server-side role redirect; default date range = current calendar year
src/components/product-totals/product-totals-client.tsx — main shell; owns shared date
  range state passed to all sections
src/components/product-totals/product-totals-section.tsx — two sortable tables: Product
  Totals (left) and Vendor Product Totals (right); vendor names use stripMphPrefix();
  vendor totals always join by vendor_id
src/components/product-totals/aggregate-cards.tsx — 7 computed summary cards; computed
  client-side from product-totals API response, no separate query
src/components/product-totals/customer-frequency-section.tsx — preserved but not rendered
  on product-totals page; repurposed reference for Order Frequency chart pattern
src/components/product-totals/recycling-totals-section.tsx — IBC and Drum sub-tables;
  vendor names use stripMphPrefix(); gold left-bar border; recycling disclaimer note
src/lib/financials/build-financials-pdf.tsx — landscape A4 PDF; page 1 = header +
  aggregate cards + product tables; page 2 = recycling totals only (customer pivot
  removed); export const runtime = 'nodejs' required on pdf route
src/app/api/product-totals/product-totals/route.ts — GET; filter: order_split_loads.ship_date
src/app/api/product-totals/customer-orders/route.ts — GET; monthly/quarterly counts
src/app/api/product-totals/recycling-totals/route.ts — GET; filter: pick_up_date
src/app/api/product-totals/pdf/route.ts — GET; export const runtime = 'nodejs'
src/app/(dashboard)/margins/page.tsx — Margins page (ADMIN + ACCOUNTING only)
src/components/margins/margins-client.tsx — two-row filter bar (search+dates /
  dropdowns+Run+Export); Ship To disabled until customer selected; report fires on
  Run click only; Export to Excel button in filter bar row 1 alongside Run Report
src/components/margins/margins-table.tsx — 21-column scrollable table; Vendor uses
  stripMphPrefix(); Salesperson renders first name only; Profit % red < 8% / green >= 8%;
  Commission shows "—" when ineligible; Description wraps max 3 lines (line-clamp-3)
src/app/api/margins/route.ts — GET; single-load orders; excludes Canceled + W&R Program;
  computes IBC Total Cost, IBC Total Sell Price, Commission Amount, Profit, Profit %
src/app/api/margins/ship-to-options/route.ts — GET; distinct ship_to locations for a
  customer; label = "name, city, state"; shared with order-frequency
src/app/api/margins/salesperson-options/route.ts — GET; active users WHERE role = 'SALES'
src/app/(dashboard)/order-frequency/page.tsx — Order Frequency page (ADMIN + ACCOUNTING)
src/components/order-frequency/order-frequency-client.tsx — filter bar; grouped bar chart
  (Recharts): navy bars = Orders Placed, blue bars = Orders Shipped; summary cards;
  data table with all months including zeros
src/app/api/order-frequency/route.ts — GET; returns orderDateSeries + shipDateSeries
  arrays; zero-fills all months in range; COALESCE(MIN(split_load.ship_date), orders.ship_date)
  for effective ship date
src/components/global-emails/global-emails-client.tsx
src/components/layout/        — sidebar, header, nav
src/app/(dashboard)/          — all authenticated pages
src/app/(dashboard)/recycling/page.tsx  — redirects to /recycling/ibcs
src/app/(dashboard)/recycling/ibcs/page.tsx
src/app/(dashboard)/recycling/ibcs/new/page.tsx
src/app/(dashboard)/recycling/ibcs/[id]/page.tsx
src/app/(dashboard)/recycling/drums/page.tsx
src/app/(dashboard)/recycling/drums/new/page.tsx
src/app/(dashboard)/recycling/drums/[id]/page.tsx
src/app/(auth)/login/         — login page
src/app/api/recycling-orders/route.ts   — GET (paginated, ?type=IBC|Drum) + POST
src/app/api/recycling-orders/[id]/route.ts — GET detail + PATCH
src/app/api/recycling-orders/[id]/po-pdf/route.ts — GET PDF; sets email headers;
  export const runtime = 'nodejs'
src/app/api/recycling-orders/[id]/duplicate/route.ts — POST; mints
  new order_number from sequence; resets status, dates, flags; returns
  { id, recycling_type }; ADMIN + CSR + ACCOUNTING only
src/app/api/order-groups/route.ts       — POST create group
src/app/api/order-groups/[id]/route.ts  — DELETE ungroup (ADMIN only)
src/app/api/orders/[orderId]/po-pdf/route.ts — handles grouped orders via group_id
src/app/api/commission/split-load/[splitLoadId]/route.ts — PATCH: update order_type on a
  split load, re-derive commission_status. Re-derive logic: eligible type + was Not Eligible
  → Eligible; eligible type + already Eligible or Paid → unchanged; ineligible type →
  Not Eligible. ADMIN + ACCOUNTING only.
src/app/api/auth/signout/route.ts
src/app/api/company-settings/route.ts
src/proxy.ts                  — session handler (Next.js 16 middleware equivalent)
src/actions/team.ts           — server actions for user/team management
src/config/nav.ts             — navigation items
reference/                    — HTML prototype (UI reference only, not a spec)
AGENTS.md                     — this file
PRD.md                        — product requirements
drizzle/                      — migration SQL files and snapshots

---

## PROTOTYPE NOTE

The HTML prototype in /reference/ is a UI reference only. It predates the current schema
and uses different data structures. AGENTS.md and PRD.md are the authoritative specs.

---

## KNOWN ACCEPTABLE VULNERABILITIES

- **esbuild <=0.24.2** inside drizzle-kit — accept the risk. Never run
  `npm audit fix --force` to resolve this.
- **xlsx (SheetJS) — Prototype Pollution (GHSA-4r6h-8v6p-xvw6) and ReDoS
  (GHSA-5pgg-2g8v-p4x9)** — No fix available upstream. Acceptable because xlsx
  is used write-only (server-side export generation from DB data). It never
  parses user-uploaded files, so neither vulnerability is reachable.

---

## SECURITY

- RLS enabled on all public tables. Service role full access policy only.
- All DB queries run server-side through Next.js API routes.
- When new tables are created via migration, manually run:
  ALTER TABLE public.[table] ENABLE ROW LEVEL SECURITY;
  and add service_role policy. Run Supabase security advisor after every DDL migration.
- **test-db.js** was permanently removed from the codebase and purged from all git
    history on May 13, 2026. Never commit database credentials to any file.
    All credentials must live in `.env.local` (gitignored) and Vercel environment variables.
    `.env.local` is in `.gitignore` — never remove it from there.

---

## USER ONBOARDING

Do NOT use inviteUserByEmail or manually insert rows into public.users.
1. Share https://oms-jade.vercel.app with the new user
2. They sign in with their MPH United Microsoft account
3. The handle_new_auth_user trigger creates their public.users row automatically
4. Admin updates role, permissions, can_view_commission via /team page

---

## BRAND & THEME CONVENTIONS

Colors: --mph-navy #00205B, --mph-gold #B88A44, --mph-gold-light #E5C678
Sidebar: collapsible="icon" rail, navy background, gold active border,
         text-[15px] font-medium nav items
Header: navy background, MPH logo left, white text/icons
Login: navy gradient background, logo above card
Primary buttons: navy bg, gold hover
Never use Button asChild — @base-ui/react does not support this prop.
Use styled native Link elements wherever a link needs button styling.

shadcn override patterns — when a shadcn component ignores whitespace or layout overrides
on parent elements, use browser devtools to find the baked-in utility class on the inner
element. Common patterns:
- [&>span]: targets the inner span of SelectTrigger
- !line-clamp-none overrides SelectValue's baked-in line-clamp-1
- !h-auto overrides SelectTrigger's baked-in h-8
- Use the ! (important) prefix when shadcn utilities cannot be overridden from a parent element

Orders page sticky layout rules:
- orders/page.tsx wrapper: ONLY <div className="p-6"> — no overflow-hidden
- layout.tsx <main>: ONLY className="flex flex-1 flex-col" — no overflow-hidden
- overflow-hidden on any ancestor of a sticky element breaks sticky positioning
- orders-table.tsx filter bar: sticky top-14 z-20
- orders-table.tsx thead: sticky z-10 with inline style top from filterBarHeight
- filterBarHeight initializes at 112 (two-row filter bar height)

Orders table row striping uses index-based logic (rowIndex % 2), not CSS odd: selectors.
The rowIndex prop is passed from orders-table.tsx. Any new row-level background logic must
use cn() with this prop.