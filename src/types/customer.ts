import type { Customer } from "@prisma/client";

export type { Customer };

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

export interface CustomerWithOrderCount extends Customer {
  _count: { orders: number };
}
