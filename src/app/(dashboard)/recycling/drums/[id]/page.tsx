'use client'

import { use, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { EditDrumForm } from '@/components/recycling/edit-drum-form'
import { UnsavedChangesBanner } from '@/components/shared/unsaved-changes-banner'
import { ArrowLeft } from 'lucide-react'

export default function EditDrumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveRef = useRef<(() => void) | null>(null)
  useUnsavedChanges(isDirty)

  function handleSave() { saveRef.current?.() }

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
        <h1 className="text-xl font-semibold text-[#00205B]">Edit Drum Recycling Order</h1>
      </div>
      <UnsavedChangesBanner isDirty={isDirty} onSave={handleSave} saving={saving} />
      <EditDrumForm id={id} onDirtyChange={setIsDirty} onSavingChange={setSaving} saveRef={saveRef} />
    </div>
  )
}
