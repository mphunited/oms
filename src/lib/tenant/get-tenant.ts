import { db } from "@/lib/db";
import { companies, company_members, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";

/**
 * Resolve a company by id and verify it is active.
 * Throws notFound() if the company does not exist or is inactive.
 */
export async function getCompanyById(companyId: string) {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
  });

  if (!company || !company.is_active) notFound();

  return company;
}

/**
 * Verify that a user is an active member of a company.
 * Returns the CompanyMember record (with user) or null.
 */
export async function getCompanyMember(companyId: string, userId: string) {
  const result = await db
    .select({ member: company_members, user: users })
    .from(company_members)
    .leftJoin(users, eq(users.id, company_members.user_id))
    .where(
      and(
        eq(company_members.company_id, companyId),
        eq(company_members.user_id, userId),
        eq(company_members.is_active, true)
      )
    )
    .limit(1);

  if (result.length === 0) return null;
  return { ...result[0].member, user: result[0].user };
}
