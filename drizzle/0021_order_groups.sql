-- drizzle/0021_order_groups.sql
CREATE TABLE IF NOT EXISTS "order_groups" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "group_po_number"  text UNIQUE NOT NULL,
  "vendor_id"        uuid REFERENCES vendors(id),
  "notes"            text,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "group_id" uuid REFERENCES order_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "orders_group_id_idx" ON "orders"("group_id");

-- Enable RLS
ALTER TABLE "order_groups" ENABLE ROW LEVEL SECURITY;

-- Service-role-only access policy
CREATE POLICY "Service role full access" ON "order_groups"
  TO service_role USING (true) WITH CHECK (true);
