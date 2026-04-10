import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
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

  const members = await prisma.companyMember.findMany({
    where: { companyId: company.id, isActive: true },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <>
      <PageHeader
        title="Team"
        description={`${members.length} member${members.length !== 1 ? "s" : ""} at ${company.name}`}
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
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex items-center gap-3 pt-5">
              <Avatar>
                <AvatarFallback>
                  {member.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{member.user.name}</p>
                <p className="text-sm text-muted-foreground truncate">{member.user.email}</p>
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
