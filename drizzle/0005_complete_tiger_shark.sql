DO $$ BEGIN
  CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'CSR', 'ACCOUNTING', 'SALES');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'Pending';--> statement-breakpoint
ALTER TABLE "recycling_orders" ALTER COLUMN "customer_contacts" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CSR'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "bills_of_lading" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "order_split_loads" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "default_bottle_cost" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "default_bottle_qty" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "default_mph_freight_bottles" numeric(10, 2);