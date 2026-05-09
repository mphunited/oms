# Design System: Vercel (adapted for MPH United OMS)

## 1. Visual Theme & Atmosphere

Vercel's design system is built on a near-pure white canvas (`#ffffff`) with
near-black (`#171717`) text — a gallery-like emptiness where every element earns
its pixel. This is minimalism as engineering principle, not decoration.

The MPH United OMS follows this foundation with one intentional deviation: the
dark navy (`#1a2744`) header and brand accent. Navy plays the structural role
that Vercel's black plays in its marketing site — the one chromatic anchor in an
otherwise achromatic system. Everything else — surfaces, cards, borders, type —
follows the Vercel spec exactly.

**Key Characteristics:**
- Pure white canvas (`#ffffff`) for all page surfaces and cards
- Near-black (`#171717`) for primary text — not pure black, preventing harshness
- MPH United brand navy (`#1a2744`) for the sidebar, header, active states,
  section accent bars, and the Live Margin panel
- Shadow-as-border technique throughout: `box-shadow: 0px 0px 0px 1px rgba(0,0,0,0.08)`
  replaces traditional CSS borders on all interactive and card elements
- Multi-layer shadow stacks for cards (border + elevation + inner highlight)
- Geist Sans as the primary typeface (or Inter as fallback — same weight system)
- Three weights only: 400 (read), 500 (interact/navigate), 600 (headings/announce)
- `#fafafa` as the only surface tint — used for alternating table rows
- Gray scale from `#171717` to `#ffffff` is the entire chromatic system, plus navy

## 2. Color Palette & Roles

### Primary Surfaces
- **Page Background** (`#ffffff`): All page surfaces, form backgrounds, card faces.
- **Row Stripe** (`#fafafa`): Alternating table row background (odd rows). Barely
  visible — just enough to guide the eye without feeling like a spreadsheet.
- **Overlay Backdrop** (`hsla(0, 0%, 98%, 1)`): Modal and dialog backdrops.

### Brand & Navigation
- **MPH Navy** (`#1a2744`): The single brand color. Used for: sidebar background,
  page header, table header row, section accent bars (left-border on form section
  headings), active navigation states, and the Live Margin panel background. This
  is the only non-achromatic color in the UI chrome.
- **Navy Text on Navy** (`rgba(255,255,255,0.82)`): Column headers and nav labels
  on navy backgrounds. Not pure white — prevents harshness.
- **Navy Muted** (`rgba(255,255,255,0.5)`): Secondary text on navy (labels,
  breadcrumbs, metadata inside the Live Margin panel).

### Text
- **Primary Text** (`#171717`): Headings, table cell primary content, form labels.
  Not pure black — the slight warmth prevents eye strain.
- **Secondary Text** (`#4d4d4d`): Body copy, table cell secondary content,
  descriptions.
- **Muted Text** (`#6b7280`): Metadata, placeholder text, de-emphasized labels,
  date values in table cells.
- **Disabled / Hint** (`#9ca3af`): Icon default state, placeholder text in inputs.

### Borders & Shadows (shadow-as-border system)
- **Default Border** (`rgba(0,0,0,0.08) 0px 0px 0px 1px`): The signature. Applied
  as `box-shadow`, not `border`, on all cards, inputs, and interactive elements.
  Do not use `border: 1px solid` — use this shadow instead.
- **Hover Border** (`rgba(0,0,0,0.14) 0px 0px 0px 1px`): On hover states.
- **Row Divider** (`#f3f4f6`): `border-bottom` on table rows only. This is the
  one place a traditional border is acceptable.
- **Card Shadow Stack** (`rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px, #fafafa 0px 0px 0px 1px`):
  Full multi-layer card shadow for raised panels (order summary drawer, Live
  Margin card, form section cards).
- **Gray 100** (`#ebebeb`): Used only for image borders and the lightest visible
  separators. Not for interactive elements.

### Status Colors (badges and pills only)
These appear exclusively in badge/pill components. Never use them as background
colors on full surfaces.
- **Sent / In Transit**: `#d1fae5` background, `#065f46` text (emerald tint)
- **Confirmed**: `#dbeafe` background, `#1e40af` text (blue tint)
- **Pending / Neutral**: `#f3f4f6` background, `#4b5563` text (gray, shadow-border)
- **Ready to Invoice**: `#ede9fe` background, `#5b21b6` text (purple tint)
- **Complete**: `#d1fae5` background, `#065f46` text (same as Sent)
- **Canceled**: `#fee2e2` background, `#991b1b` text (red tint)
- **Flagged tab / flag icon**: `#ef4444` (red) for the flag icon when active;
  `#fee2e2` background with `#991b1b` text for the Flagged filter tab
- **Margin healthy** (`#10b981`): Net margin value in Live Margin panel when ≥ 8%
- **Margin warning** (`#ef4444`): Net margin value when < 8% threshold

### Interactive
- **Link / PO Number** (`#1a2744`): Clickable PO number links in the table. Navy,
  weight 600. Not the generic blue — these are internal navigation links.
- **Focus Ring** (`hsla(212, 100%, 48%, 1)`): 2px solid outline on all focused
  interactive elements. Accessibility-required.

## 3. Typography Rules

### Font Family
- **Primary**: `Geist`, fallback: `Inter, -apple-system, system-ui, sans-serif`
- **Monospace**: `Geist Mono`, fallback: `ui-monospace, SFMono-Regular, Menlo`
- **OpenType**: `"liga"` enabled globally on all Geist text

To add Geist in Next.js 16:
```bash
npm install geist
```
```typescript
// src/app/layout.tsx
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
```

If keeping Inter instead of Geist, the weight system and all other rules apply
identically. Inter is an acceptable substitute — just skip the `"liga"` feature.

### Weight System (strict — only three weights)
- **400** — Reading: body copy, table cell content, form input values
- **500** — Interacting: navigation links, button labels, column headers, form
  field labels, badge text
- **600** — Announcing: page headings, section headings, PO number links, card
  titles, the net margin value in Live Margin

Never use weight 700 (bold). Maximum is 600.

### Hierarchy

| Role | Size | Weight | Letter Spacing | Usage |
|------|------|--------|----------------|-------|
| Page title | 24px | 600 | -0.96px | "Orders", "New Order", "Customers" |
| Section heading | 13px | 600 | normal | Form section labels (ORDER IDENTITY etc.) |
| Table header | 11px | 500 | normal | Column header labels |
| Body / cell | 13px | 400 | normal | Table cell primary text |
| Body small | 12px | 400 | normal | Table cell secondary (city/state, dates) |
| PO number | 12px | 600 | normal | Clickable MPH PO links |
| Badge | 10–11px | 500 | normal | Status pills, carrier badges |
| Button label | 14px | 500 | normal | Primary and ghost buttons |
| Caption | 12px | 400–500 | normal | Metadata, helper text |
| Mono label | 12px | 500 | normal | Auto-generated field hints, PO previews |

### Letter Spacing
Display sizes only (page titles at 24px+): use -0.96px. Below 20px: normal.
Never use positive letter-spacing. Never use all-caps in the app chrome
(section headers are sentence case, not ALL CAPS).

## 4. Component Stylings

### Buttons

**Primary (dark)**
- Background: `#1a2744` (MPH Navy, replaces Vercel Black)
- Text: `#ffffff`, 14px weight 500
- Padding: 8px 16px
- Radius: 6px
- Hover: `#243554` (slightly lighter navy)
- Use: "+ New Order", "Save", primary form actions

**Ghost (secondary)**
- Background: `#ffffff`
- Text: `#374151`, 14px weight 500
- Shadow: `0px 0px 0px 1px rgba(0,0,0,0.08)` (shadow-as-border)
- Radius: 6px
- Hover shadow: `0px 0px 0px 1px rgba(0,0,0,0.14), 0px 1px 2px rgba(0,0,0,0.04)`
- Use: "Cancel", "Duplicate", secondary actions

**Icon button (small)**
- Background: `#ffffff`
- Shadow: `0px 0px 0px 1px rgba(0,0,0,0.08), 0px 1px 2px rgba(0,0,0,0.04)`
- Radius: 6px
- Size: 24×24px
- Icon color: `#9ca3af` at rest, `#374151` on hover
- Has-content variant: amber ring `0px 0px 0px 1px rgba(245,158,11,0.4)`,
  amber icon `#f59e0b` — used on Notes icon when notes field is non-empty
- Use: CSR List (clipboard-list icon), Notes (notes icon), inline row actions

**Destructive**
- Background: `#fee2e2`
- Text: `#991b1b`, 14px weight 500
- Shadow: `0px 0px 0px 1px rgba(153,27,27,0.2)`
- Radius: 6px
- Use: Delete actions, confirmation dialogs

### Status Badges / Carrier Badges
All badges use the pill shape (9999px radius). Two sizes:

**Standard pill** (status badges)
- Padding: 3px 10px
- Font: 10px weight 500
- Colors: per Section 2 Status Colors table above

**Carrier pill** (Frontline, CPU, etc.)
- Same shape and size as status badges
- Use a consistent color per carrier — do not vary arbitrarily. Suggested:
  Frontline → emerald tint (`#d1fae5` / `#065f46`), CPU → amber tint
  (`#fef3c7` / `#92400e`), Frontline (FR) → blue tint. Map consistently in
  `badge-colors.ts` and keep the mapping stable.
- Never use purple or high-saturation colors for carriers — they compete visually
  with status badges.

### Cards & Containers
- Background: `#ffffff`
- Shadow: `rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px, #fafafa 0px 0px 0px 1px`
- Radius: 8px (standard), 12px (drawers, large panels)
- Never use `border: 1px solid` on cards — always use the shadow stack above

### Live Margin Panel
- Background: `#1a2744` (MPH Navy)
- Radius: 8px
- Padding: 16px
- Label text: `rgba(255,255,255,0.6)`, 11px weight 500
- Value text: `rgba(255,255,255,0.9)`, 15px weight 500
- Divider: `rgba(255,255,255,0.12)` horizontal line
- Net Margin label: `rgba(255,255,255,0.6)`, 11px weight 500
- Net Margin value: `#10b981` (emerald) when ≥ 8%, `#ef4444` (red) when < 8%,
  22px weight 600
- Percentage: `rgba(255,255,255,0.65)`, 12px weight 400
- Position: sticky right column on New Order and Edit Order pages

### Data Table
- Container: no outer border — table sits on the page background
- Header row: `#1a2744` background, `rgba(255,255,255,0.82)` text, 11px weight 500
- Header radius: 8px 8px 0 0 on the header row (top corners only)
- Odd rows: `#fafafa` background
- Even rows: `#ffffff` background
- Row divider: `border-bottom: 1px solid #f3f4f6`
- Row height: 44px standard. 52px only when two stacked elements are required.
- Cell padding: 0 10px (height handled by row height, not cell padding)
- Hover row: `background: #f0f4ff` (very light navy tint) — shows which row
  the user is on
- Expandable chevron: `#9ca3af` at rest, `#374151` on hover

### Form Section Headers
Replace all-caps muted labels with:
```jsx
<div className="flex items-center gap-2 mb-4">
  <div className="w-0.5 h-5 rounded-full bg-[#1a2744]" />
  <h3 className="text-[13px] font-semibold text-[#171717] tracking-normal">
    Order identity
  </h3>
</div>
```
Sentence case always. The navy left bar (`w-0.5`) ties section structure to the
brand color without using heavy borders or backgrounds.

### Filter Bar (Lifecycle Tabs)
The Active / Complete / Flagged / All tabs:
- Default: `#ffffff` background, `#374151` text, 13px weight 500,
  `box-shadow: 0px 0px 0px 1px rgba(0,0,0,0.08)`, 9999px radius (pill shape)
- Active: `#1a2744` background, `#ffffff` text, same radius
- Flagged tab specifically: `#fee2e2` background, `#991b1b` text at rest;
  `#1a2744` background, `#ffffff` text when active — visually connected to
  the flag icon color
- Padding: 5px 14px
- Gap between tabs: 4px

### Inputs & Form Fields
- Background: `#ffffff`
- Shadow: `0px 0px 0px 1px rgba(0,0,0,0.08)` (shadow-as-border)
- Radius: 6px
- Padding: 8px 12px
- Text: `#171717`, 14px weight 400
- Placeholder: `#9ca3af`
- Focus: `outline: 2px solid hsla(212, 100%, 48%, 1)` — the blue focus ring
- Hover: shadow intensifies to `0px 0px 0px 1px rgba(0,0,0,0.14)`
- Error state: `0px 0px 0px 1px rgba(220,38,38,0.5)` + red helper text

### Navigation Sidebar
- Background: `#1a2744`
- Width: current (icon-only) — add tooltip on hover for each icon
- Icon color: `rgba(255,255,255,0.5)` at rest
- Icon active: `rgba(255,255,255,0.95)` + `rgba(255,255,255,0.08)` pill background
- Hover: `rgba(255,255,255,0.06)` background on icon button

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Scale: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
- Component internal gaps: 4px (tight), 8px (default), 12px (relaxed)
- Section separation on forms: 32px between sections
- Page padding: 24px (sides), 32px (top)
- Notable rule from Vercel: no 20px or 24px in the primary scale — jump from
  16px directly to 32px for section-level spacing.

### Grid
- Max content width: 1280px
- Form layout: full-width single column for most fields; 2-column grid for
  paired fields (Ship Date / Wanted Date, Buy / Sell / Terms)
- Live Margin: right-column sticky panel, ~220px wide, independent of form width
- Table: full width, no max-width constraint

### Whitespace Philosophy
Vercel: white space IS the design. Do not fill gaps with decorative elements,
background tints, or additional borders. Section separation comes from spacing
alone, not from visible dividers. The dark navy header and section accent bars
provide sufficient structural rhythm.

### Border Radius Scale
- 4px: inline code snippets, tiny tags
- 6px: buttons, inputs, icon buttons, small containers
- 8px: cards, table container, dropdowns, popovers
- 12px: drawers (Order Summary), large panels
- 9999px: status badges, carrier badges, filter tabs (pill shape)

## 6. Depth & Elevation

| Level | Shadow | Use |
|-------|--------|-----|
| Flat | none | Page background, table rows |
| Ring | `rgba(0,0,0,0.08) 0px 0px 0px 1px` | Shadow-border on all interactive elements |
| Hover ring | `rgba(0,0,0,0.14) 0px 0px 0px 1px` | Hover state on buttons, inputs |
| Card | Ring + `rgba(0,0,0,0.04) 0px 2px 2px` + `#fafafa 0px 0px 0px 1px` | Cards, the Live Margin panel |
| Drawer | Card shadow + `rgba(0,0,0,0.04) 0px 8px 8px -8px` | Order Summary Drawer |
| Focus | `outline: 2px solid hsla(212, 100%, 48%, 1)` | All keyboard-focused elements |

The inner `#fafafa` ring in the card shadow is what gives Vercel cards their
subtle inner highlight. Do not omit it — it is the difference between a card
that looks flat and one that looks built.

## 7. Do's and Don'ts

### Do
- Use shadow-as-border (`0px 0px 0px 1px rgba(0,0,0,0.08)`) instead of
  CSS `border` on all cards, inputs, and interactive elements
- Use `#1a2744` (MPH Navy) as the only chromatic color in the UI chrome
- Use the three-weight system: 400 / 500 / 600 only
- Apply negative letter-spacing only at heading sizes (24px+)
- Use `#fafafa` for alternating table rows — the subtlest possible stripe
- Keep status badge colors semantic: teal for in-transit, blue for confirmed,
  gray for pending, red for canceled
- Use sentence case for all labels, headings, and section titles
- Add the has-notes amber indicator to the Notes icon button when notes exist
- Apply the full card shadow stack (Ring + elevation + inner `#fafafa` ring)
  to all raised card elements

### Don't
- Don't use `border: 1px solid #e5e7eb` on cards or inputs — use shadow-as-border
- Don't introduce warm colors (orange, yellow, bright green) into the UI chrome
- Don't use weight 700 anywhere — 600 is the maximum
- Don't use ALL CAPS for section labels — sentence case throughout
- Don't use color decoratively — status colors are functional only
- Don't add background tints to form sections — spacing and the accent bar
  provide sufficient section separation
- Don't use the focus ring color (`hsla(212,100%,48%,1)`) for anything except
  keyboard focus — it is reserved for accessibility
- Don't use `#000000` (pure black) for text — always `#171717`
- Don't skip the inner `#fafafa` ring in card shadows

## 8. Responsive Behavior

Mobile optimization is Phase 2 (per PRD Section 21). Current target is desktop
only. Minimum supported viewport: 1280px wide.

For reference when Phase 2 begins:
- Table: horizontal scroll wrapper on viewports < 1024px
- Form: single column below 768px
- Sidebar: collapse to hamburger below 768px
- Live Margin panel: moves below form on mobile (stops being sticky)
- Filter bar: wrap to two rows below 600px
- Touch targets: minimum 44×44px for all interactive elements

## 9. Agent Prompt Guide

### Quick Token Reference
| Token | Value | Use |
|-------|-------|-----|
| Page background | `#ffffff` | All surfaces |
| Row stripe | `#fafafa` | Table odd rows |
| Brand navy | `#1a2744` | Header, sidebar, section bars, Live Margin |
| Primary text | `#171717` | Headings, labels |
| Secondary text | `#4d4d4d` | Body, descriptions |
| Muted text | `#6b7280` | Metadata, dates |
| Shadow-border | `rgba(0,0,0,0.08) 0px 0px 0px 1px` | All interactive elements |
| Card shadow | `rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px, #fafafa 0px 0px 0px 1px` | Raised panels |
| Focus ring | `outline: 2px solid hsla(212,100%,48%,1)` | Keyboard focus |
| Radius (button/input) | `6px` | Buttons, inputs, icon buttons |
| Radius (card) | `8px` | Cards, dropdowns |
| Radius (badge) | `9999px` | All pills and badges |

### Example Component Prompts
- "Style the orders table: white page background, `#1a2744` header row, 11px
  Geist weight 500 column labels at `rgba(255,255,255,0.82)`. Odd rows `#fafafa`,
  even rows `#ffffff`, `border-bottom: 1px solid #f3f4f6` on each row. 44px row
  height. PO number: 12px weight 600 `#1a2744`."

- "Style a status badge: `#d1fae5` background, `#065f46` text, 9999px radius,
  3px 10px padding, 10px Geist weight 500. No border — shadow `0px 0px 0px 1px
  rgba(6,95,70,0.1)` instead."

- "Style a ghost button: `#ffffff` background, `#374151` text, 14px weight 500,
  8px 16px padding, 6px radius, `box-shadow: 0px 0px 0px 1px rgba(0,0,0,0.08)`.
  Hover: shadow `0px 0px 0px 1px rgba(0,0,0,0.14), 0px 1px 2px rgba(0,0,0,0.04)`."

- "Style a form section header: `<div>` with a 2px wide, 20px tall, `#1a2744`
  left bar (border-radius 2px), then 13px Geist weight 600 `#171717` text in
  sentence case. Gap 8px between bar and text. Margin-bottom 16px."

- "Style the Live Margin panel: `#1a2744` background, 8px radius, 16px padding.
  Labels: `rgba(255,255,255,0.6)` 11px weight 500. Values: `rgba(255,255,255,0.9)`
  15px weight 500. Net Margin value: 22px weight 600, `#10b981` if ≥ 8%,
  `#ef4444` if < 8%. Sticky right column."

### Iteration Guide
1. Shadow-as-border is non-negotiable — never use CSS `border` on interactive
   elements or cards. If Claude Code reaches for `border: 1px solid`, redirect
   it to `box-shadow: 0px 0px 0px 1px rgba(0,0,0,0.08)`.
2. Navy (`#1a2744`) is the only brand color — it appears in the header, sidebar,
   table header, form section bars, active states, and Live Margin panel.
   Everything else is black-to-white grayscale.
3. Three weights only: 400 reads, 500 interacts, 600 announces.
4. `#fafafa` for row stripes. Nothing heavier.
5. Status badge colors are semantic — teal for good/moving, blue for confirmed,
   gray for neutral, red for problem. Never reassign them.
6. The has-notes amber ring on the Notes icon button is a conditional:
   `notes && notes.length > 0 ? 'amber-ring' : ''`.

---

## 10. MPH United OMS — App-Specific Rules

These rules override or extend the Vercel spec for OMS-specific components.
Claude Code must follow these when building or modifying OMS UI.

### The only deviation from Vercel's achromatic system
Vercel uses `#171717` as its primary brand color (for CTAs, nav, active states).
The OMS substitutes `#1a2744` (MPH Navy) in every place Vercel would use
`#171717` for navigation or CTAs. Body text, table text, and headings still use
`#171717`. The substitution applies to: header background, sidebar background,
table header row, primary buttons, form section accent bars, active nav states,
and the Live Margin panel.

### Orders table — MPH PO column
The MPH PO cell contains:
1. The PO number as a clickable link (opens Order Summary Drawer, does NOT navigate)
2. A CSR List icon button (clipboard-list icon, 24×24px, ghost style)
3. A Notes icon button (notes icon, 24×24px, ghost style)

Icons sit inline to the right of the PO number text, on the same line. Use a
`flex items-center gap-1.5` wrapper. The Notes icon gets an amber ring
(`box-shadow: 0px 0px 0px 1px rgba(245,158,11,0.4)`, icon color `#f59e0b`) when
the order's `notes` field is non-empty. Both icons use Vercel's ghost icon button
spec from Section 4.

If a grouped order has a `group_po_number`, display it in small muted text below
the primary PO number (`text-[10px] text-[#9ca3af]`). The icon buttons remain
inline with the primary PO number only.

### Orders table — row height and striping
- Standard row height: 44px (CSS `height: 44px` on `<tr>`)
- Odd rows: `#fafafa`, even rows: `#ffffff`
- Row divider: `border-bottom: 1px solid #f3f4f6`
- Flagged rows: `background: #fef2f2` (overrides stripe) — both odd and even

### Filter bar
Two rows:
- Row 1: Search input (ghost, shadow-border) | Active / Complete / Flagged / All
  pills | Status multi-select | Clear
- Row 2: Customer | Vendor | CSR | Salesperson dropdowns | Ship Date range

Lifecycle pill spec: 9999px radius, 5px 14px padding, 13px weight 500.
Active: `#1a2744` bg / `#ffffff` text. Inactive: `#ffffff` bg / `#374151` text /
shadow-border. Flagged: `#fee2e2` bg / `#991b1b` text at rest, `#1a2744` /
`#ffffff` when active.

### New Order and Edit Order forms
- Form background: `#ffffff` (no section-level tinting)
- Section separation: 32px gap between sections, no horizontal rules
- Section header: navy left bar + 13px weight 600 sentence-case label (see Section 4)
- Live Margin panel: sticky right column, `#1a2744` background card, per Section 4
- Required field indicator: `#ef4444` asterisk (`*`), inline after the label
- Optional fields: no annotation — required fields are marked, optional fields
  are unmarked (not labeled "optional")

### Status badge color map
Map these exactly in `badge-colors.ts`. Do not deviate:

| Status | Background | Text |
|--------|------------|------|
| Pending | `#f3f4f6` | `#4b5563` |
| Waiting On Vendor To Confirm | `#fef3c7` | `#92400e` |
| Waiting To Confirm To Customer | `#fef3c7` | `#92400e` |
| Confirmed To Customer | `#dbeafe` | `#1e40af` |
| Wash & Return Stage | `#ede9fe` | `#5b21b6` |
| Sent Order To Carrier | `#d1fae5` | `#065f46` |
| Ready To Ship | `#d1fae5` | `#065f46` |
| Ready To Invoice | `#dbeafe` | `#1e40af` |
| Complete | `#d1fae5` | `#065f46` |
| Canceled | `#fee2e2` | `#991b1b` |

All badges: 10px weight 500, 9999px radius, 3px 10px padding.

### Dark mode
The `next-themes` toggle is present in the UI. When dark mode is active:
- Page background: `#0a0a0a`
- Card surfaces: `rgba(255,255,255,0.02)` — follow Linear's surface system for dark
- Text: `#f7f8f8` primary, `#8a8f98` muted
- Shadow-as-border: `rgba(255,255,255,0.08) 0px 0px 0px 1px`
- MPH Navy header: unchanged — it is already dark
- Row stripe: `rgba(255,255,255,0.02)`

Dark mode is not a current priority (Phase 2). When implementing, apply Linear's
dark surface system (see Section 1 of Linear DESIGN.md) to all content areas,
while keeping the navy header and sidebar unchanged.
