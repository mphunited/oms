import { PageHeader } from "@/components/shared/page-header";

interface FinancialsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function FinancialsPage({ params }: FinancialsPageProps) {
  await params;
  return (
    <>
      <PageHeader
        title="Financials"
        description="Revenue, margin, and financial reporting."
      />
      <div className="flex items-center justify-center h-64 rounded-md border border-dashed text-muted-foreground">
        Coming soon
      </div>
    </>
  );
}
