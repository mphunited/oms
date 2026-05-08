import { EditIbcForm } from '@/components/recycling/edit-ibc-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditIbcPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/recycling/ibcs" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold text-[#00205B]">Edit IBC Recycling Order</h1>
      </div>
      <EditIbcForm id={id} />
    </div>
  )
}
