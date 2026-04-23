ALTER TABLE "order_split_loads"
  ADD COLUMN "customer_po" text,
  ADD COLUMN "order_type" text,
  ADD COLUMN "ship_date" date,
  ADD COLUMN "wanted_date" date,
  ADD COLUMN "commission_status" text DEFAULT 'Not Eligible',
  ADD COLUMN "commission_paid_date" date;
