import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCompanyById } from "@/lib/tenant/get-tenant";

interface SettingsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { tenant: companyId } = await params;
  const company = await getCompanyById(companyId);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your company preferences."
      />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company</CardTitle>
            <CardDescription>Basic company information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" defaultValue={company.name} />
            </div>
            {company.legalName && (
              <div className="space-y-2">
                <Label htmlFor="legalName">Legal name</Label>
                <Input id="legalName" defaultValue={company.legalName} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={company.email ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" defaultValue={company.phone ?? ""} />
            </div>
            <Button>Save changes</Button>
          </CardContent>
        </Card>

        {company.qboRealmId && (
          <Card>
            <CardHeader>
              <CardTitle>QuickBooks Online</CardTitle>
              <CardDescription>QBO integration status</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Connected · Realm ID: <span className="font-mono">{company.qboRealmId}</span>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
