'use client'

import { use, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { EditDrumForm } from '@/components/recycling/edit-drum-form'
import { UnsavedChangesBanner } from '@/components/shared/unsaved-changes-banner'
import { ArrowLeft, Copy } from 'lucide-react'
import { toast } from 'sonner'

export default function EditDrumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const saveRef = useRef<(() => void) | null>(null)
  useUnsavedChanges(isDirty)

  function handleSave() { saveRef.current?.() }

  async function handleDuplicate() {
    setDuplicating(true)
    try {
      const res = await fetch(`/api/recycling-orders/${id}/duplicate`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? 'Failed to duplicate order')
        return
      }
      const { id: newId } = await res.json()
      toast.success('Order duplicated')
      router.push(`/recycling/drums/${newId}`)
    } catch {
      toast.error('Failed to duplicate order')
    } finally {
      setDuplicating(false)
    }
  }

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
        <div className="ml-auto">
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
            {duplicating ? 'Duplicating…' : 'Duplicate'}
          </button>
        </div>
      </div>
      <UnsavedChangesBanner isDirty={isDirty} onSave={handleSave} saving={saving} />
      <EditDrumForm id={id} onDirtyChange={setIsDirty} onSavingChange={setSaving} saveRef={saveRef} />
    </div>
  )
}
