# Prisma → Drizzle ORM Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Prisma with Drizzle ORM (postgres-js adapter) and define the full 14-table schema matching the Supabase database described in the MPH OMS blueprint.

**Architecture:** Drizzle connects to Supabase Postgres via `postgres` (postgres-js), bypassing Prisma's connection pooler issues. The schema lives in `src/lib/db/schema.ts`; the singleton client in `src/lib/db/index.ts`. `drizzle-kit` handles migration generation; migrations are applied via Supabase SQL Editor or `drizzle-kit push`.

**Tech Stack:** drizzle-orm, postgres (postgres-js), drizzle-kit, TypeScript, Next.js 16 App Router, Supabase PostgreSQL

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Delete | `prisma/schema.prisma` | Old Prisma schema |
| Delete | `prisma.config.ts` | Prisma config |
| Delete | `prisma/` directory | All Prisma files |
| Delete | `src/generated/prisma/` | Generated Prisma client (if exists) |
| Create | `drizzle.config.ts` | Drizzle-kit config (schema path, output dir, DB URL) |
| Create | `src/lib/db/schema.ts` | All 14 table definitions + TypeScript inferred types |
| Create | `src/lib/db/index.ts` | Singleton postgres-js client + drizzle instance |
| Create | `.env.example` | Documents required env vars |
| Modify | `package.json` | Remove prisma deps, add drizzle-orm + postgres + drizzle-kit |

---

## Task 1: Remove Prisma

**Files:**
- Delete: `prisma/schema.prisma`
- Delete: `prisma.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Uninstall Prisma packages**

```bash
cd "C:\Users\jack\Claude Projects\oms\.claude\worktrees\vigilant-villani"
npm uninstall @prisma/client prisma
```

Expected output: removed 2 packages

- [ ] **Step 2: Delete Prisma files**

Delete `prisma/schema.prisma`, `prisma.config.ts`, and the `prisma/` directory. If `src/generated/prisma/` exists, delete it too.

```bash
rm -rf prisma prisma.config.ts src/generated
```

- [ ] **Step 3: Verify package.json has no Prisma references**

Open `package.json`. Confirm neither `@prisma/client` nor `prisma` appear in `dependencies` or `devDependencies`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Prisma ORM"
```

---

## Task 2: Install Drizzle

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime and dev dependencies**

```bash
npm install drizzle-orm postgres
npm install --save-dev drizzle-kit
```

`drizzle-orm` — ORM runtime
`postgres` — postgres-js driver (Supabase-compatible)
`drizzle-kit` — CLI for generating and pushing migrations

- [ ] **Step 2: Verify installation**

```bash
npx drizzle-kit --version
```

Expected: prints a version number (e.g. `0.x.x`)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install drizzle-orm, postgres, drizzle-kit"
```

---

## Task 3: Create Drizzle config

**Files:**
- Create: `drizzle.config.ts`

- [ ] **Step 1: Create the config file**

Create `drizzle.config.ts` at the project root:

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

- [ ] **Step 2: Create .env.example**

Create `.env.example` at the project root:

```
# Supabase connection string (use the "Transaction" pooler URL from Supabase dashboard)
# Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

- [ ] **Step 3: Confirm .gitignore excludes .env.local**

Open `.gitignore`. It should already exclude `.env.local` (Next.js default). Confirm — do not add `.env.example` to gitignore.

- [ ] **Step 4: Commit**

```bash
git add drizzle.config.ts .env.example
git commit -m "chore: add drizzle-kit config"
```

---

## Task 4: Create the database schema

**Files:**
- Create: `src/lib/db/schema.ts`

This file defines all 14 tables. Every table has `company_id` for multi-tenancy (except `users`, `audit_logs`, `forum_replies`).

- [ ] **Step 1: Create `src/lib/db/` directory and schema file**

Create `src/lib/db/schema.ts`:

```typescript
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core'

// ─── companies ───────────────────────────────────────────────────────────────

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  legal_name: text('legal_name'),
  address: jsonb('address'),
  email: text('email'),
  phone: text('phone'),
  logo_url: text('logo_url'),
  qbo_realm_id: text('qbo_realm_id'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert

// ─── users ────────────────────────────────────────────────────────────────────
// id mirrors the Supabase auth.users UUID — no defaultRandom() so it matches auth

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  avatar_url: text('avatar_url'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// ─── company_members ──────────────────────────────────────────────────────────

export const company_members = pgTable('company_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'CSR' | 'ACCOUNTING' | 'WAREHOUSE' | 'ADMIN'
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type CompanyMember = typeof company_members.$inferSelect
export type NewCompanyMember = typeof company_members.$inferInsert

// ─── customers ────────────────────────────────────────────────────────────────

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  contacts: jsonb('contacts'),   // array of { name, email, phone, title }
  ship_to: jsonb('ship_to'),    // { address, city, state, zip }
  bill_to: jsonb('bill_to'),    // { address, city, state, zip }
  payment_terms: text('payment_terms'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert

// ─── vendors ──────────────────────────────────────────────────────────────────

export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: jsonb('address'),    // { address, city, state, zip }
  notes: text('notes'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Vendor = typeof vendors.$inferSelect
export type NewVendor = typeof vendors.$inferInsert

// ─── orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  order_number: text('order_number').notNull(),
  customer_id: uuid('customer_id').notNull().references(() => customers.id),
  status: text('status').notNull().default('PENDING'),
  // status values: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  salesperson: text('salesperson'),
  csr: text('csr'),
  ship_date: date('ship_date'),
  delivery_date: date('delivery_date'),
  customer_po: text('customer_po'),
  freight_carrier: text('freight_carrier'),
  appointment_time: timestamp('appointment_time', { withTimezone: true }),
  appointment_notes: text('appointment_notes'),
  po_notes: text('po_notes'),
  freight_notes: text('freight_notes'),
  shipper_notes: text('shipper_notes'),
  misc_notes: text('misc_notes'),
  terms: text('terms'),
  notes: text('notes'),
  flag: boolean('flag').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert

// ─── order_line_items ─────────────────────────────────────────────────────────

export const order_line_items = pgTable('order_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  vendor_id: uuid('vendor_id').references(() => vendors.id),
  description: text('description'),
  qty: numeric('qty', { precision: 10, scale: 2 }),
  buy_each: numeric('buy_each', { precision: 10, scale: 2 }),
  sell_each: numeric('sell_each', { precision: 10, scale: 2 }),
  freight_cost: numeric('freight_cost', { precision: 10, scale: 2 }),
  split_load: boolean('split_load').default(false),
  part_number: text('part_number'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type OrderLineItem = typeof order_line_items.$inferSelect
export type NewOrderLineItem = typeof order_line_items.$inferInsert

// ─── invoices ─────────────────────────────────────────────────────────────────

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: uuid('order_id').notNull().references(() => orders.id),
  invoice_number: text('invoice_number').notNull(),
  total: numeric('total', { precision: 10, scale: 2 }),
  status: text('status').notNull().default('DRAFT'),
  // status values: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'VOID'
  qbo_invoice_id: text('qbo_invoice_id'),
  issued_at: timestamp('issued_at', { withTimezone: true }),
  due_at: timestamp('due_at', { withTimezone: true }),
  paid_at: timestamp('paid_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert

// ─── bills_of_lading ──────────────────────────────────────────────────────────

export const bills_of_lading = pgTable('bills_of_lading', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  bol_number: text('bol_number'),
  carrier: text('carrier'),
  ship_from: jsonb('ship_from'),  // { name, address, city, state, zip }
  ship_to: jsonb('ship_to'),     // { name, address, city, state, zip }
  pickup_date: date('pickup_date'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type BillOfLading = typeof bills_of_lading.$inferSelect
export type NewBillOfLading = typeof bills_of_lading.$inferInsert

// ─── dropdown_configs ─────────────────────────────────────────────────────────

export const dropdown_configs = pgTable('dropdown_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  // type values: 'SALESPERSON' | 'CSR' | 'STATUS' | 'CARRIER' | 'PAYMENT_TERMS'
  values: jsonb('values').notNull().default([]),  // string[]
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DropdownConfig = typeof dropdown_configs.$inferSelect
export type NewDropdownConfig = typeof dropdown_configs.$inferInsert

// ─── forum_posts ──────────────────────────────────────────────────────────────

export const forum_posts = pgTable('forum_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  author_id: uuid('author_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  tag: text('tag'),
  status: text('status').notNull().default('OPEN'),  // 'OPEN' | 'RESOLVED' | 'CLOSED'
  is_pinned: boolean('is_pinned').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ForumPost = typeof forum_posts.$inferSelect
export type NewForumPost = typeof forum_posts.$inferInsert

// ─── forum_replies ────────────────────────────────────────────────────────────

export const forum_replies = pgTable('forum_replies', {
  id: uuid('id').primaryKey().defaultRandom(),
  post_id: uuid('post_id').notNull().references(() => forum_posts.id, { onDelete: 'cascade' }),
  author_id: uuid('author_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ForumReply = typeof forum_replies.$inferSelect
export type NewForumReply = typeof forum_replies.$inferInsert

// ─── resources ────────────────────────────────────────────────────────────────

export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  url: text('url').notNull(),
  kind: text('kind'),  // e.g. 'link' | 'document' | 'video'
  pinned: boolean('pinned').notNull().default(false),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Resource = typeof resources.$inferSelect
export type NewResource = typeof resources.$inferInsert

// ─── audit_logs ───────────────────────────────────────────────────────────────

export const audit_logs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id),
  table_name: text('table_name').notNull(),
  record_id: uuid('record_id').notNull(),
  action: text('action').notNull(),  // 'INSERT' | 'UPDATE' | 'DELETE'
  old_value: jsonb('old_value'),
  new_value: jsonb('new_value'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AuditLog = typeof audit_logs.$inferSelect
export type NewAuditLog = typeof audit_logs.$inferInsert
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat: add Drizzle schema for all 14 tables"
```

---

## Task 5: Create the database client

**Files:**
- Create: `src/lib/db/index.ts`

- [ ] **Step 1: Create the client module**

Create `src/lib/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// In Next.js server components and API routes, DATABASE_URL must be set.
// The postgres-js client works reliably with Supabase's Transaction pooler (port 6543).
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false, // required for Supabase Transaction pooler (pgBouncer)
})

export const db = drizzle(client, { schema })
```

> **Why `prepare: false`?** Supabase's transaction pooler (pgBouncer) does not support prepared statements. Without this flag, queries will fail in production.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If there are module resolution errors for `drizzle-orm` or `postgres`, ensure the packages installed correctly (`ls node_modules/drizzle-orm` and `ls node_modules/postgres`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/index.ts
git commit -m "feat: add Drizzle db client with postgres-js adapter"
```

---

## Task 6: Generate migration SQL

**Files:**
- Create: `drizzle/` directory (auto-generated by drizzle-kit)

This step generates SQL you can review and apply to Supabase via the SQL Editor. It does **not** run against the database — it only produces files.

- [ ] **Step 1: Ensure DATABASE_URL is set in your local .env.local**

Create or open `.env.local` (not committed to git) and add your Supabase connection string:

```
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Get this from: Supabase Dashboard → Project → Settings → Database → Connection string → Transaction mode (port 6543).

- [ ] **Step 2: Generate migration**

```bash
npx drizzle-kit generate
```

Expected: creates `drizzle/0000_initial_schema.sql` (or similar). Review the file — it should contain `CREATE TABLE` statements for all 14 tables.

- [ ] **Step 3: Commit the generated migration**

```bash
git add drizzle/
git commit -m "feat: generate initial Drizzle migration SQL"
```

---

## Task 7: Apply migration to Supabase

The tables already exist in Supabase (per the blueprint: "All tables exist in Supabase"). This task syncs Drizzle's migration state without re-creating tables.

**Two options — choose one:**

### Option A: `drizzle-kit push` (fastest for dev)

Pushes schema directly without generating a migration file. Safe when the tables already match the schema.

```bash
npx drizzle-kit push
```

Expected output: `[✓] Changes applied` or `No changes detected` if tables already match.

### Option B: Apply SQL via Supabase SQL Editor (safest)

1. Open Supabase Dashboard → SQL Editor
2. Open `drizzle/0000_initial_schema.sql`
3. Wrap the content in a transaction and execute:

```sql
BEGIN;
-- paste contents of drizzle/0000_initial_schema.sql here
COMMIT;
```

If tables already exist, use `CREATE TABLE IF NOT EXISTS` (drizzle-kit generate uses this by default).

- [ ] **Step 1: Choose Option A or B and apply**

- [ ] **Step 2: Verify tables exist in Supabase**

In Supabase Dashboard → Table Editor, confirm all 14 tables are visible:
`companies`, `users`, `company_members`, `customers`, `vendors`, `orders`, `order_line_items`, `invoices`, `bills_of_lading`, `dropdown_configs`, `forum_posts`, `forum_replies`, `resources`, `audit_logs`

---

## Task 8: Add npm scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add drizzle-kit scripts to package.json**

Open `package.json` and update the `"scripts"` section:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "db:migrate": "drizzle-kit migrate"
}
```

- [ ] **Step 2: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add drizzle-kit npm scripts"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|-------------|------|
| Remove Prisma completely | Task 1 |
| Set up Drizzle with Supabase postgres-js adapter | Tasks 2, 3, 5 |
| Recreate schema in Drizzle format | Task 4 |
| `prepare: false` for Supabase pooler compatibility | Task 5 |
| All 14 blueprint tables present | Task 4 |
| `company_id` on every applicable table | Task 4 (verified in schema) |
| Migration SQL generated | Task 6 |
| Apply to Supabase | Task 7 |
| npm convenience scripts | Task 8 |
| Update all database calls | N/A — no calls exist in codebase yet |

### Placeholder scan

No TBDs, TODOs, or "similar to Task N" patterns. All code blocks are complete and runnable.

### Type consistency

- `db` exported from `src/lib/db/index.ts` — used the same way in all future API routes: `import { db } from '@/lib/db'`
- Schema exports: `companies`, `users`, etc. — same snake_case names used consistently throughout schema.ts
- `$inferSelect` / `$inferInsert` type pattern applied uniformly to all 14 tables
