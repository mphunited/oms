import { NewDrumForm } from '@/components/recycling/new-drum-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewDrumPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/recycling/drums" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold text-[#00205B]">New Drum Recycling Order</h1>
      </div>
      <NewDrumForm />
    </div>
  )
}
