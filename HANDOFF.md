# OMS Handoff — May 15, 2026

## Session Summary

Five backlog items cleared. Three bugs found during testing. Worktree local
cleanup still pending (count: 8, target: 1 — run cleanup before next session).

---

## Commits From This Session

| Commit | Description |
|--------|-------------|
| `06f3ef5` | fix: remove Approved By and Date from recycling PO PDF |
| `a9e4688` | fix: apply stripMphPrefix to vendor dropdown in recycling edit forms |
| `241450f` | feat: move Export button to row 1 alongside Run Report on margins page |
| `e21dc9a` | feat: add default customer and buy price to new drum recycling form |
| `75e933c` | fix: auto-populate po_contacts from vendor on drum recycling new and edit forms |

---

## Still To Do

### 🔴 Do Before Next Session

**1. Local worktree directory cleanup**
git worktree list returned Lines: 8. Target is 1 (main only). Run:

```powershell
Remove-Item -Path "C:/Users/jack/Claude Projects/oms/.claude/worktrees/*" `
  -Recurse -Force
git worktree prune
git worktree list | Measure-Object -Line
```

Expected after: Lines: 1

---

### 🔴 Bugs Found During Testing

**2. Recycling IBC PDF — notes rendering at bottom**
Notes are appearing at the bottom of the recycling IBC PO PDF. No notes
should appear on any recycling PO PDF.
File: src/lib/recycling/build-recycling-po-pdf.tsx
Fix: Remove all notes field rendering (likely appointment_notes).

**3. Drum Edit — po_contacts not persisting to DB**
po_contacts populate correctly in the edit form UI (Prompt 5 worked for
display) but Email PO draft has no recipients. Root cause: po_contacts is
likely missing from the PATCH payload, so DB record stays null and the
email action reads empty contacts from DB.
Files: src/lib/recycling/use-edit-drum-form.ts (PATCH body),
src/app/api/recycling-orders/[id]/route.ts (PATCH handler must accept
po_contacts).

---

### 🟡 Features

**4. Duplicate button on Edit Drum and Edit IBC pages**
Both recycling edit pages need a Duplicate button.
Requires: POST /api/recycling-orders/[id]/duplicate route + button on both
edit page UIs. Access: ADMIN + CSR + ACCOUNTING. SALES blocked.
On duplicate: new order_number from sequence, status = 'Acknowledged Order',
pick_up_date = null, delivery_date = null, appointment_notes = null.
All other fields copied. Navigate to new order edit page after.

---

## Closed From May 15 — Confirmed Done

| Item | Resolution |
|------|-----------|
| Remove Approved By and Date from recycling PO PDF | 06f3ef5 |
| Hide "MPH United /" in Processing Facility dropdown — IBC + Drum edit | a9e4688 |
| Move Export button to row 1 alongside Run Report on margins page | 241450f |
| Default customer (Container Services Network) on new drum form | e21dc9a |
| Default buy $5.00 for Coastal on new drum form | e21dc9a |
| Auto-populate po_contacts from vendor on drum new and edit forms (display) | 75e933c |

---

## Known Acceptable Vulnerabilities
- esbuild ≤0.24.2 inside drizzle-kit — accept risk, never run npm audit fix --force
- xlsx SheetJS — write-only, never parses uploads, acceptable

---

## Critical Reminder for Claude Code Sessions
Every prompt must end with explicit git steps. Claude Code failed to push
commits on 4 of 5 prompts in the May 14 session without this. See AGENTS.md
rule 13 for the mandatory prompt footer.

Claude Code verbal commit hash confirmations are not reliable — always
verify with git pull origin main followed by git log --oneline.