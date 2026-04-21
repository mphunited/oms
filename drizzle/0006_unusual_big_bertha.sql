CREATE TABLE "product_weights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_name" text NOT NULL,
	"weight_lbs" numeric(6, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_weights_product_name_unique" UNIQUE("product_name")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sales_order_number" text;