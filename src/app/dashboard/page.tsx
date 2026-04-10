/**
 * /dashboard — server-side redirect hub.
 *
 * After login, users land here. We:
 *  1. Confirm the Supabase session is valid.
 *  2. Look up the user's company membership via their email.
 *  3. Redirect to /[companyId]/orders.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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

  // Find the user's DB record and their company memberships
  const dbUser = await prisma.user.findUnique({
  where: { email: user.email! },
  include: { tenants: { include: { company: true } } },
});

const activeTenant = dbUser?.tenants.find((t) => t.company?.isActive);
if (activeTenant) {
  redirect(`/${activeTenant.companyId}/orders`);
}

  // No company yet — show a prompt
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
