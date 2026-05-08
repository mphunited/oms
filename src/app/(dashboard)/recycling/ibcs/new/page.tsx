import { NewIbcForm } from '@/components/recycling/new-ibc-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewIbcPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/recycling/ibcs" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold text-[#00205B]">New IBC Recycling Order</h1>
      </div>
      <NewIbcForm />
    </div>
  )
}
