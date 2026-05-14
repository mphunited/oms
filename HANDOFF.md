# OMS Handoff — May 14, 2026

## Session Summary

All pre-Christina red items from May 13 are closed. Dark mode is partially 
complete — stopped mid-session with 3 known remaining items.

---

## Commits From This Session

| Commit | Description |
|--------|-------------|
| `7f92bf3` | fix: text-foreground on Buy/Sell/Ship To cells for dark mode |
| `c391b4b` | feat: hide New Order nav item for SALES role |
| `cf636eb` | fix: hide Notes button and block PATCH for SALES role |
| `697a991` | fix: use dbUser.role in orders list/create route |
| `c026b48` | fix: make customer_po optional on SplitLoad type (build fix) |
| `88ae2f7` | fix: apply stripMphPrefix to vendor name in PO PDF |
| `3d60498` | fix: email bugs — greeting name, city duplication, customer PO, recipient format |
| `a4e1250` | fix: block SALES from PDF generation and duplicate routes |
| `15658ee` | fix: dark mode backgrounds — orders table and reporting pages |
| `5814ee5` | fix: dark mode contrast and missing recycling section backgrounds |

---

## Still To Do

### 🔴 Finish Before Heavy Use

**1. Remaining dark mode fixes**
Three specific items stopped mid-session:
- `src/components/product-totals/aggregate-cards.tsx` — card label and number 
  text colors (text-gray-500 etc.) need to be text-foreground/text-muted-foreground
- `src/components/order-frequency/order-frequency-client.tsx` — monthly data 
  table row td elements need text-foreground
- `src/app/(dashboard)/product-totals/page.tsx` — page title barely visible,
  needs text-foreground

Prompt is already written — use the one from the May 14 session ending.
After fixing, also check `src/app/(dashboard)/margins/page.tsx` for the same
page title visibility issue.

**2. CSR access to Order Frequency**
CSRs currently cannot access Order Frequency. They should be able to — the page
shows shipment counts, not margin/buy data. Add CSR to the route guard and nav
config for `/order-frequency`.

---

### 🟡 Soon — Before Heavy Use

**3. team.ts unsafe server actions**
- File: `src/actions/team.ts`
- Contains banned `inviteUserByEmail` (lines 12, 25)
- `inviteMember`, `updateMemberRole`, `removeMember` lack ADMIN guards
- Fix: remove invite flow per AGENTS.md onboarding rules, add ADMIN checks

**4. Email flows using raw Graph helpers**
- Files: `new-order-form.tsx` (line 76), `use-recycling-po-email.ts` (line 36), 
  `schedules-client.tsx` (line 170)
- These use raw MSAL/Graph calls instead of `getMailTokenResilient`
- Causes silent failures when tokens expire
- Fix: migrate to resilient token/Graph helpers

**5. Dark mode — systematic cleanup**
After the targeted fixes above, run a grep for remaining hardcoded light colors: