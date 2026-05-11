ALTER TABLE "order_split_loads"
  ADD COLUMN IF NOT EXISTS "customer_po" text,
  ADD COLUMN IF NOT EXISTS "order_type" text,
  ADD COLUMN IF NOT EXISTS "ship_date" date,
  ADD COLUMN IF NOT EXISTS "wanted_date" date,
  ADD COLUMN IF NOT EXISTS "commission_status" text DEFAULT 'Not Eligible',
  ADD COLUMN IF NOT EXISTS "commission_paid_date" date;
