export type { Customer } from "@/lib/db/schema";

export interface CustomerContact {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface CreateCustomerInput {
  name: string;
  contacts?: CustomerContact[];
  shipTo?: Address;
  billTo?: Address;
  paymentTerms?: string;
  notes?: string;
}

export interface CustomerWithOrderCount {
  id: string;
  company_id: string;
  name: string;
  contacts: unknown;
  ship_to: unknown;
  bill_to: unknown;
  payment_terms: string | null;
  is_active: boolean;
  created_at: Date;
  orderCount: number;
}
