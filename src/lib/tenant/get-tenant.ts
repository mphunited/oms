import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

/**
 * Resolve a company by id and verify it is active.
 * Throws notFound() if the company does not exist or is inactive.
 */
export async function getCompanyById(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company || !company.isActive) notFound();

  return company;
}

/**
 * Verify that a user is an active member of a company.
 * Returns the CompanyMember record (with user) or null.
 */
export async function getCompanyMember(companyId: string, userId: string) {
  return prisma.companyMember.findFirst({
    where: { companyId, userId, isActive: true },
    include: { user: true },
  });
}
