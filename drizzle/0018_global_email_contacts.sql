-- drizzle/0018_global_email_contacts.sql
CREATE TYPE "global_email_contact_type" AS ENUM ('CONFIRMATION', 'BILL_TO', 'BOTH');

CREATE TABLE IF NOT EXISTS "global_email_contacts" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       text NOT NULL,
  "email"      text NOT NULL,
  "type"       "global_email_contact_type" NOT NULL DEFAULT 'BOTH',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "global_email_contacts_email_unique" UNIQUE ("email")
);

-- Enable RLS
ALTER TABLE "global_email_contacts" ENABLE ROW LEVEL SECURITY;

-- Service-role-only access policy
CREATE POLICY "Service role full access" ON "global_email_contacts"
  TO service_role USING (true) WITH CHECK (true);
