import { PageHeader } from "@/components/shared/page-header";

interface ResourcesPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function ResourcesPage({ params }: ResourcesPageProps) {
  await params;
  return (
    <>
      <PageHeader
        title="Resources"
        description="Shared links, documents, and reference materials."
      />
      <div className="flex items-center justify-center h-64 rounded-md border border-dashed text-muted-foreground">
        Coming soon
      </div>
    </>
  );
}
