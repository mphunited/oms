-- ── orders: drop columns moved to order_split_loads ──────────────────────────
ALTER TABLE "orders" DROP COLUMN "description";
--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "part_number";
--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "qty";
--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "buy_price";
--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "sell_price";
--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "bottle_cost";
--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "bottle_qty";
--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "mph_freight_bottles";
--> statement-breakpoint

-- ── order_split_loads: reshape to new structure ───────────────────────────────
ALTER TABLE "order_split_loads" RENAME COLUMN "buy_each" TO "buy";
--> statement-breakpoint
ALTER TABLE "order_split_loads" RENAME COLUMN "sell_each" TO "sell";
--> statement-breakpoint
ALTER TABLE "order_split_loads" DROP CONSTRAINT "order_split_loads_vendor_id_vendors_id_fk";
--> statement-breakpoint
ALTER TABLE "order_split_loads" DROP COLUMN "vendor_id";
--> statement-breakpoint
ALTER TABLE "order_split_loads" DROP COLUMN "freight_cost";
--> statement-breakpoint
ALTER TABLE "order_split_loads" ADD COLUMN "bottle_cost" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "order_split_loads" ADD COLUMN "bottle_qty" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "order_split_loads" ADD COLUMN "mph_freight_bottles" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "order_split_loads" ADD COLUMN "order_number_override" text;
