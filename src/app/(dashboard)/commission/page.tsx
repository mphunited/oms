// src/app/(dashboard)/commission/page.tsx
// Commission report page.
// SALES role: sees only their own orders.
// ADMIN and ACCOUNTING: see all orders.

import { CommissionClient } from "@/components/commission/commission-client";

export const metadata = { title: "Commission Report — MPH United" };

export default function CommissionPage() {
  return <CommissionClient />;
}
