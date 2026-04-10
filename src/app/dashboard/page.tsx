/**
 * /dashboard — server-side redirect hub.
 *
 * After login, users land here. We:
 *  1. Confirm the Supabase session is valid.
 *  2. Look up the user's active company membership via their email.
 *  3. Redirect to /[companyId]/orders.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, company_members, companies } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Find the user's first active company membership
  const [membership] = await db
    .select({ company_id: company_members.company_id })
    .from(users)
    .innerJoin(company_members, eq(company_members.user_id, users.id))
    .innerJoin(companies, eq(companies.id, company_members.company_id))
    .where(
      and(
        eq(users.email, user.email!),
        eq(company_members.is_active, true),
        eq(companies.is_active, true)
      )
    )
    .limit(1);

  if (membership) {
    redirect(`/${membership.company_id}/orders`);
  }

  // No active company yet — show a prompt
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-2xl font-semibold">Welcome!</h1>
        <p className="text-muted-foreground">
          Your account isn&apos;t linked to a company yet. Contact your admin
          to get access.
        </p>
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          Back to login
        </Link>
      </div>
    </div>
  );
}
