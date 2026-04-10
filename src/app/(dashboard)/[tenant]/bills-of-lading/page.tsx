import { PageHeader } from "@/components/shared/page-header";

interface BillsOfLadingPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function BillsOfLadingPage({ params }: BillsOfLadingPageProps) {
  await params;
  return (
    <>
      <PageHeader
        title="Bills of Lading"
        description="Track shipment documentation for orders."
      />
      <div className="flex items-center justify-center h-64 rounded-md border border-dashed text-muted-foreground">
        Coming soon
      </div>
    </>
  );
}
