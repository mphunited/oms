# OMS Handoff — May 13, 2026

## What Was Done Today

| # | Fix | Commit |
|---|-----|--------|
| 1 | Database password rotated, Vercel DATABASE_URL updated, unused Postgres vars removed | — |
| 2 | test-db.js purged from all git history | force push |
| 3 | Commission status canonical value: `"Commission Paid"` everywhere | 6395b12 |
| 4 | Separate PO flag preserved in edit-order PATCH payload | 9ec84bc |
| 5 | `public/msal-callback.html` created for MSAL popup OAuth redirect | e354697 |
| 6 | Dashboard stats filtered to own orders for SALES role | 9e2f100 |
| 7 | New Order button hidden + order detail read-only for SALES role | b336e56 |
| 8 | Order Frequency filtered to own orders for SALES role | fae59fc |
| 9 | Margins opened to SALES role with own-orders filter (server-side enforced) | 9d59c23 |

Mike Harding confirmed as ADMIN. Larry/Jennifer confirmed `can_view_commission = false`. Renee confirmed `can_view_commission = true`.

---

## Still To Do — Priority Order

### 🔴 Before Christina Goes Live

**1. Test SALES role permissions end-to-end**
- Log in as a SALES test account (jack2 or create a test SALES user)
- Confirm: only sees own orders on Orders list, Dashboard, Order Frequency, Margins
- Confirm: New Order button not visible
- Confirm: Order detail is read-only (no Save/Delete buttons)
- Confirm: Commission nav not visible (unless can_view_commission = true)

**2. Test separate PO flow**
- Create an order with 2+ split loads
- Use "Assign Separate PO" on Load 2
- Save the order
- Reopen and confirm the separate PO assignment persisted

**3. Test MSAL email draft flow**
- Create an order with customer contacts set
- Trigger the email customer confirmation action
- Confirm the Outlook draft opens correctly (the /msal-callback.html fix)

**4. RLS missing on `recycling_orders` and `product_weights` tables**
- These tables were created in migrations 0003 and 0006 without RLS SQL
- Run in Supabase SQL editor:
  ```sql
  ALTER TABLE public.recycling_orders ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "service_role_only" ON public.recycling_orders
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  ALTER TABLE public.product_weights ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "service_role_only" ON public.product_weights
    FOR ALL TO service_role USING (true) WITH CHECK (true);
  ```
- Run Supabase Security Advisor after and confirm clean

**5. Manual PO route check uses wrong role source**
- File: `src/app/api/orders/[orderId]/route.ts` around line 331
- Bug: checks `user.role` from Supabase Auth instead of `public.users.role` from DB
- Fix: use the already-fetched DB user role consistently
- Claude Code prompt: *"In the manual PO creation block in src/app/api/orders/[orderId]/route.ts around line 331, the role check uses supabase auth user.role instead of the DB user's role fetched via getCurrentDbUser(). Fix it to use the DB role. No other changes."*

---

### 🟡 Soon — Before Heavy Use

**6. Authorization gaps on PDF and duplicate routes**
- PO/BOL PDF routes only check auth, not role or order ownership
- Duplicate order route lacks CSR/ADMIN guard
- Files: `po-pdf/route.ts`, `bol-pdf/route.ts`, `duplicate/route.ts`, `order-groups/route.ts`
- Fix: add role check (ADMIN or CSR) before allowing these actions
- Low blast radius with current user base but worth fixing before external access

**7. team.ts unsafe server actions**
- File: `src/actions/team.ts`
- Contains service-role admin code and banned `inviteUserByEmail` (lines 12, 25)
- `inviteMember`, `updateMemberRole`, `removeMember` lack ADMIN guards
- Fix: remove invite flow entirely per AGENTS.md onboarding rules, add ADMIN checks to all privileged actions

**8. Email flows using raw Graph helpers**
- Files: `new-order-form.tsx` (line 76), `use-recycling-po-email.ts` (line 36), `schedules-client.tsx` (line 170)
- These use raw MSAL/Graph calls instead of `getMailTokenResilient` and resilient wrappers
- Causes silent failures when tokens expire
- Fix: migrate to resilient token/Graph helpers

**9. .env.example incomplete**
- Currently only documents `DATABASE_URL`
- Add: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Remove or document `SUPABASE_SERVICE_ROLE_KEY` appropriately

---

### 🟢 Nice To Have (Post-Launch)

**10. Add typecheck and test scripts to package.json**
```json
"typecheck": "tsc --noEmit",
"test": "vitest"
```

**11. Lint warning**
- File: `src/components/credit-memo-form.tsx` line 99
- `today` missing from useEffect dependency array

**12. Sidebar loads open during /api/me fetch**
- File: `src/components/layout/app-sidebar.tsx` line 90
- Flickers open briefly before role is known
- Fix: default to closed state while loading

**13. Worktree cleanup**
- ~90 stale `claude/` branches in the repo
- Periodically delete merged/old worktree branches to keep repo lean
- Command: `git branch -r | Select-String "claude/" | ...` then bulk delete

**14. tsconfig.json breadth**
- Currently includes all `**/*.ts(x)` which pulls in ~371k files from `.claude/worktrees`
- Add `.claude` to `exclude` in tsconfig.json to keep tooling fast

---

## Known Acceptable Vulnerabilities (Do Not Fix)
- esbuild ≤0.24.2 inside drizzle-kit — accept risk, never run `npm audit fix --force`
- xlsx SheetJS — Prototype Pollution + ReDoS — acceptable (write-only, never parses uploads)
