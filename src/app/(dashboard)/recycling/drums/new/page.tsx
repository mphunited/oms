'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { NewDrumForm } from '@/components/recycling/new-drum-form'
import { ArrowLeft } from 'lucide-react'

export default function NewDrumPage() {
  const router = useRouter()
  const [isDirty, setIsDirty] = useState(false)
  useUnsavedChanges(isDirty)

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => {
            if (isDirty && !window.confirm('You have unsaved changes. Leave anyway?')) return
            router.push('/recycling/drums')
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-semibold text-[#00205B]">New Drum Recycling Order</h1>
      </div>
      <NewDrumForm onDirtyChange={setIsDirty} />
    </div>
  )
}
