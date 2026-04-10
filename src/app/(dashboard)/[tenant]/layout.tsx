import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getCompanyById } from "@/lib/tenant/get-tenant";
import { Toaster } from "@/components/ui/sonner";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenant } = await params;

  // Validates company exists and is active; throws notFound() otherwise
  await getCompanyById(tenant);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex flex-1 flex-col gap-6 p-6">{children}</main>
      </SidebarInset>
      <Toaster richColors />
    </SidebarProvider>
  );
}
