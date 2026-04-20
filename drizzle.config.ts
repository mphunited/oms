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
    "orders",
    "order_split_loads",
    "bills_of_lading",
    "company_settings",
    "dropdown_configs",
    "audit_logs",
  ],
});
