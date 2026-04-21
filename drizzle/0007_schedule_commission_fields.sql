-- Migration: 0007_schedule_commission_fields
-- Adds fields required for commission workflow and schedule email distribution.
-- Apply via: npm run db:migrate  (drizzle-kit reads .env.local automatically)

-- orders: invoice paid date, commission paid date, QB sync timestamp
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS invoice_paid_date     date,
  ADD COLUMN IF NOT EXISTS commission_paid_date  date,
  ADD COLUMN IF NOT EXISTS qb_synced_at          timestamptz;

-- vendors: schedule email recipients (same shape as po_contacts)
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS schedule_contacts jsonb;

-- company_settings: Frontline schedule recipients + admin schedule recipients
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS frontline_schedule_contacts jsonb,
  ADD COLUMN IF NOT EXISTS admin_schedule_recipients   jsonb;
