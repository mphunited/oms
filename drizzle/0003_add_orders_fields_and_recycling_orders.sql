CREATE TABLE "recycling_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"order_date" date,
	"order_type" text,
	"customer_id" uuid NOT NULL,
	"vendor_id" uuid,
	"salesperson_id" uuid,
	"csr_id" uuid,
	"status" text DEFAULT 'Acknowledged Order' NOT NULL,
	"customer_po" text,
	"pick_up_date" date,
	"delivery_date" date,
	"ship_from" jsonb,
	"ship_to" jsonb,
	"bill_to" jsonb,
	"customer_contacts" text,
	"freight_carrier" text,
	"freight_cost" numeric(10, 2),
	"freight_to_customer" numeric(10, 2),
	"freight_credit_amount" numeric(10, 2),
	"additional_costs" numeric(10, 2) DEFAULT '0' NOT NULL,
	"invoice_status" text DEFAULT 'No Charge',
	"invoice_customer_amount" numeric(10, 2),
	"invoice_payment_status" text DEFAULT 'Not Invoiced' NOT NULL,
	"terms" text,
	"bol_number" text,
	"po_notes" text,
	"misc_notes" text,
	"flag" boolean DEFAULT false NOT NULL,
	"checklist" jsonb,
	"commission_status" text DEFAULT 'Not Eligible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recycling_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "customer_contacts" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "is_blind_shipment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "is_revised" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "checklist" jsonb;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "contacts" jsonb;--> statement-breakpoint
ALTER TABLE "recycling_orders" ADD CONSTRAINT "recycling_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recycling_orders" ADD CONSTRAINT "recycling_orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recycling_orders" ADD CONSTRAINT "recycling_orders_salesperson_id_users_id_fk" FOREIGN KEY ("salesperson_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recycling_orders" ADD CONSTRAINT "recycling_orders_csr_id_users_id_fk" FOREIGN KEY ("csr_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recycling_orders_customer_id_idx" ON "recycling_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "recycling_orders_status_idx" ON "recycling_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recycling_orders_pick_up_date_idx" ON "recycling_orders" USING btree ("pick_up_date");