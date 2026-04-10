"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { CreateCustomerInput } from "@/types/customer";

function toJson<T>(value: T | undefined): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function createCustomer(
  companyId: string,
  input: CreateCustomerInput
) {
  const customer = await prisma.customer.create({
    data: {
      companyId,
      name: input.name,
      contacts: toJson(input.contacts),
      shipTo: toJson(input.shipTo),
      billTo: toJson(input.billTo),
      paymentTerms: input.paymentTerms,
      notes: input.notes,
    },
  });

  revalidatePath("/customers", "page");
  return customer;
}

export async function updateCustomer(
  customerId: string,
  input: Partial<CreateCustomerInput>
) {
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: input.name,
      contacts: toJson(input.contacts),
      shipTo: toJson(input.shipTo),
      billTo: toJson(input.billTo),
      paymentTerms: input.paymentTerms,
      notes: input.notes,
    },
  });

  revalidatePath("/customers", "page");
  return customer;
}

export async function deleteCustomer(customerId: string) {
  await prisma.customer.update({
    where: { id: customerId },
    data: { isActive: false },
  });

  revalidatePath("/customers", "page");
}
