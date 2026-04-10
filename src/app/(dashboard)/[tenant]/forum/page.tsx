import { PageHeader } from "@/components/shared/page-header";

interface ForumPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function ForumPage({ params }: ForumPageProps) {
  await params;
  return (
    <>
      <PageHeader
        title="Forum"
        description="Team discussion board for questions and updates."
      />
      <div className="flex items-center justify-center h-64 rounded-md border border-dashed text-muted-foreground">
        Coming soon
      </div>
    </>
  );
}
