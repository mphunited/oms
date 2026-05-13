import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  tablesFilter: [
  "users",
  "customers",
  "vendors",
  "order_groups",
  "orders",
  "order_split_loads",
  "recycling_orders",
  "bills_of_lading",
  "company_settings",
  "dropdown_configs",
  "product_weights",
  "order_type_configs",
  "audit_logs",
  "global_email_contacts",
  "credit_memos",
  "credit_memo_line_items",
  "email_errors",
],
});
