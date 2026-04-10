import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { company_members, users } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getCompanyById } from "@/lib/tenant/get-tenant";
import { UserPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TeamPageProps {
  params: Promise<{ tenant: string }>;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN:      "bg-purple-100 text-purple-800",
  CSR:        "bg-blue-100 text-blue-800",
  ACCOUNTING: "bg-green-100 text-green-800",
  WAREHOUSE:  "bg-amber-100 text-amber-800",
};

export default async function TeamPage({ params }: TeamPageProps) {
  const { tenant: companyId } = await params;
  const company = await getCompanyById(companyId);

  const rows = await db
    .select({ member: company_members, user: users })
    .from(company_members)
    .leftJoin(users, eq(users.id, company_members.user_id))
    .where(and(eq(company_members.company_id, company.id), eq(company_members.is_active, true)))
    .orderBy(asc(users.name));

  return (
    <>
      <PageHeader
        title="Team"
        description={`${rows.length} member${rows.length !== 1 ? "s" : ""} at ${company.name}`}
        actions={
          <Link
            href={`/${companyId}/admin/team/invite`}
            className={cn(buttonVariants(), "gap-2")}
          >
            <UserPlus className="size-4" />
            Invite member
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ member, user }) => (
          <Card key={member.id}>
            <CardContent className="flex items-center gap-3 pt-5">
              <Avatar>
                <AvatarFallback>
                  {(user?.name ?? "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.name ?? "Unknown"}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email ?? ""}</p>
              </div>
              <Badge className={ROLE_COLORS[member.role] ?? "bg-gray-100 text-gray-800"}>
                {member.role}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
