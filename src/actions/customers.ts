"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { CreateCustomerInput } from "@/types/customer";

export async function createCustomer(input: CreateCustomerInput) {
  const [customer] = await db.insert(customers).values({
    name: input.name,
    contacts: input.contacts ?? null,
    ship_to: input.shipTo ?? null,
    bill_to: input.billTo ?? null,
    payment_terms: input.paymentTerms,
  }).returning();

  revalidatePath("/customers", "page");
  return customer;
}

export async function updateCustomer(
  customerId: string,
  input: Partial<CreateCustomerInput>
) {
  const [customer] = await db.update(customers)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.contacts !== undefined && { contacts: input.contacts }),
      ...(input.shipTo !== undefined && { ship_to: input.shipTo }),
      ...(input.billTo !== undefined && { bill_to: input.billTo }),
      ...(input.paymentTerms !== undefined && { payment_terms: input.paymentTerms }),
    })
    .where(eq(customers.id, customerId))
    .returning();

  revalidatePath("/customers", "page");
  return customer;
}

export async function deleteCustomer(customerId: string) {
  await db.update(customers)
    .set({ is_active: false })
    .where(eq(customers.id, customerId));

  revalidatePath("/customers", "page");
}
