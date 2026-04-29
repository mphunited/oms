-- drizzle/0017_invoicing_tables.sql
CREATE TABLE IF NOT EXISTS "credit_memos" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "credit_number" text,
  "credit_date" date NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
  "notes"       text,
  "status"      text NOT NULL DEFAULT 'Draft',
  "created_by"  uuid REFERENCES "users"("id"),
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  "updated_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "credit_memo_line_items" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "credit_memo_id"  uuid NOT NULL REFERENCES "credit_memos"("id") ON DELETE CASCADE,
  "activity_type"   text,
  "description"     text,
  "qty"             numeric(10,2),
  "rate"            numeric(10,2),
  "amount"          numeric(10,2),
  "sort_order"      integer NOT NULL DEFAULT 0,
  "created_at"      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE "credit_memos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_memo_line_items" ENABLE ROW LEVEL SECURITY;

-- Service-role-only access policies
CREATE POLICY "Service role full access" ON "credit_memos"
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON "credit_memo_line_items"
  TO service_role USING (true) WITH CHECK (true);
