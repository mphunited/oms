# MPH OMS — Next Session Prompts
**Updated: April 16, 2026**

---

## CLAUDE.AI SESSION PROMPT
*(Use this to start your next architecture/planning conversation in claude.ai)*

```
I'm building the MPH United OMS — a single-tenant order management system in
Next.js 16 / TypeScript / Supabase / Drizzle / shadcn/ui. I've uploaded PRD.md
and AGENTS.md. Read both before doing anything.

Current session goals:
[replace this line with what you want to work on]

Key things to know coming into this session:
- PRD.md is the authoritative requirements document — supersedes all older files
- AGENTS.md is the technical conventions document — read it first
- pricing fields live on order_split_loads, NOT orders
- order numbers use format [Initials]-MPH[Number] via Postgres sequence order_number_seq
- customer_contacts on orders is TEXT, not jsonb
- vendors need po_contacts, bol_contacts, invoice_contacts (separate jsonb arrays)
- is_blind_shipment and is_revised boolean fields need to be added to orders
- new-order-form.tsx exists but has not been tested end-to-end yet
- Claude Code worktree branches must always be merged to main after each task
```

---

## CLAUDE CODE SESSION PROMPT
*(Paste this as your first message when starting Claude Code)*

```
Read AGENTS.md and PRD.md before doing anything. Both files are in the repo root.

Then do these tasks in order, one at a time. Wait for my confirmation before
moving to the next step.

STEP 1 — Verify current state:
Show me the output of:
- git log --oneline -5
- Get-ChildItem src/components/orders/
- Get-ChildItem src/app/api/
- The current contents of src/lib/db/schema.ts (just the vendors and orders table definitions)

STEP 2 — Schema migration (vendors table):
Add these columns to the vendors table in schema.ts:
- lead_contact (text, nullable)
- dock_info (text, nullable) — dock hours and carrier contact instructions
- po_contacts (jsonb, nullable) — PO email recipients array
- bol_contacts (jsonb, nullable) — BOL email recipients array
- invoice_contacts (jsonb, nullable) — invoice email recipients array (Phase 2 use)
- checklist_template (jsonb, nullable) — default action items copied to new orders

Generate and apply the Drizzle migration. Verify the columns exist in Supabase.
Show me the migration SQL before applying it.
After applying: commit, merge to main, push. Show git log --oneline -5.

STEP 3 — Schema migration (orders table):
Make these changes to the orders table in schema.ts:
- Add is_blind_shipment (boolean, not null, default false)
- Add is_revised (boolean, not null, default false)
- Add checklist (jsonb, nullable) — per-order action items
- Change customer_contacts from jsonb to text

Generate and apply the Drizzle migration. Verify in Supabase.
Show me the migration SQL before applying it.
After applying: commit, merge to main, push. Show git log --oneline -5.

STEP 4 — Fix order number generation in /api/orders/route.ts:
Replace the current MAX(CAST(order_number AS INTEGER)) + 1 approach with:
  SELECT nextval('order_number_seq')
The sequence already exists in Supabase (CREATE SEQUENCE order_number_seq START 11416).
The order_number format must be: [user initials]-MPH[number] e.g. CB-MPH15001
The user's initials must come from the authenticated session (Supabase Auth user).
Show me the updated route.ts before writing it.
After writing: commit, merge to main, push. Show git log --oneline -5.

STEP 5 — Fix new-order-form.tsx:
Make these changes:
a) Default the Notes collapsible section to open (change notesOpen initial state to true)
b) Add a visible error message when form submission fails (currently fails silently)
c) Add is_blind_shipment toggle field (Switch component, label "Blind Shipment")
d) Add is_revised toggle field (Switch component, label "Revised PO")
e) Add &cc=orders@mphunited.com to the Outlook deeplink in the post-save banner

Show me each change before writing. After all changes confirmed:
commit, merge to main, push. Show git log --oneline -5.

STEP 6 — End-to-end test:
With npm run dev running:
- Submit one test order through the form
- Show me the Supabase row that was created (query orders table and order_split_loads)
- Confirm the order_number is in the correct format
- Confirm all fields saved correctly

Do not proceed past Step 1 until I confirm.
Do not proceed past Step 2 until I confirm.
(And so on for each step.)
After every commit, show me git log --oneline -5.
Never tell me something is committed without showing the log.
```

---

## CURRENT STATE (April 16, 2026)

| Item | Status |
|------|--------|
| Next.js 16 scaffold | ✓ Done |
| Supabase schema (9 tables) | ✓ Done |
| Entra SSO | ✓ Done |
| Vercel deploy | ✓ Done |
| Orders page (table, filters, pagination) | ✓ Done |
| Dark/light mode | ✓ Done |
| new-order-form.tsx | ✓ Built — needs fixes (see Step 5) |
| Vendor po_contacts / bol_contacts columns | ✗ Not migrated yet |
| is_blind_shipment / is_revised on orders | ✗ Not migrated yet |
| checklist columns on vendors + orders | ✗ Not migrated yet |
| customer_contacts changed to text | ✗ Not migrated yet |
| Order number format ([Initials]-MPH[N]) | ✗ Still using old MAX+1 |
| Form tested end-to-end | ✗ Not yet |
| /api/customers, /api/vendors, /api/users | ✗ Not verified with real data |
| Customers page | ✗ Not started |
| Vendors page | ✗ Not started |
| Order detail/edit page | ✗ Not started |
| PO PDF route | ✗ Not started |
| BOL PDF route | ✗ Not started |
| Weekly schedules | ✗ Not started |
| Recycling orders section | ✗ Not started |
| Commission report | ✗ Not started |

---

## WHAT'S NEXT AFTER THIS SESSION

Once the schema migration and form fixes are done and the form tests clean:

1. Verify /api/customers, /api/vendors, /api/users return real Supabase data
2. Build Customers page — list + detail with contacts editor
3. Build Vendors page — list + detail with PO/BOL contacts + checklist template editor
4. Build Order detail/edit page — full edit form + checklist UI + PO button + Duplicate button
5. PO PDF route — /api/orders/[orderId]/po-pdf

Full priority sequence is in PRD.md Section 18.

---

## STANDING REMINDERS FOR CLAUDE CODE

- **Read AGENTS.md and PRD.md at the start of every session** — both files, every time
- **Always merge to main after every task** — verify with `git log --oneline -5`
- **Never trust success confirmations** — always verify with git commands
- **Show changes before writing** — never write files without showing the diff first
- **One step at a time** — wait for confirmation between steps
- **Pricing is on order_split_loads** — never add qty/buy/sell to the orders table
- **customer_contacts on orders is TEXT** — not jsonb
- **order_number_seq is the sequence** — never use MAX()+1
- **BOL emails do NOT CC orders@mphunited.com** — POs and invoices do, BOLs don't
- **Phase 2 features are off-limits** — if asked to build one, refuse and explain
- **Use Context7 MCP** for Next.js 16, Drizzle, shadcn/ui docs before implementing
- **@react-pdf/renderer routes need:** `export const runtime = 'nodejs'`
- **After every commit:** show `git log --oneline -5` — no exceptions
