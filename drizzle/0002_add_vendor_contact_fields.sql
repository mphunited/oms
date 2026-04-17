DROP INDEX "dropdown_configs_type_unique";--> statement-breakpoint
DROP INDEX "orders_salesperson_id_idx";--> statement-breakpoint
DROP INDEX "orders_csr_id_idx";--> statement-breakpoint
DROP INDEX "orders_order_number_unique";--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "is_active" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "additional_costs" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "flag" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "flag" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "invoice_payment_status" SET DEFAULT 'Not Invoiced';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "commission_status" SET DEFAULT 'Not Eligible';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "commission_status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CSR';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_active" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "vendors" ALTER COLUMN "is_active" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "lead_contact" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "dock_info" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "po_contacts" jsonb;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "bol_contacts" jsonb;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "invoice_contacts" jsonb;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "checklist_template" jsonb;--> statement-breakpoint
CREATE INDEX "orders_ship_date_idx" ON "orders" USING btree ("ship_date");--> statement-breakpoint
CREATE INDEX "orders_invoice_payment_status_idx" ON "orders" USING btree ("invoice_payment_status");--> statement-breakpoint
ALTER TABLE "dropdown_configs" ADD CONSTRAINT "dropdown_configs_type_unique" UNIQUE("type");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_number_unique" UNIQUE("order_number");