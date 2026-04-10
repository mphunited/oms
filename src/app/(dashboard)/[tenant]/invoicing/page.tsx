import { PageHeader } from "@/components/shared/page-header";

interface InvoicingPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function InvoicingPage({ params }: InvoicingPageProps) {
  await params;
  return (
    <>
      <PageHeader
        title="Invoicing"
        description="Create and manage customer invoices."
      />
      <div className="flex items-center justify-center h-64 rounded-md border border-dashed text-muted-foreground">
        Coming soon
      </div>
    </>
  );
}
