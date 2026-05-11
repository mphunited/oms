'use client'

import { AlertTriangle } from 'lucide-react'

export function UnsavedChangesBanner({
  isDirty,
  onSave,
  saving,
}: {
  isDirty: boolean
  onSave: () => void
  saving: boolean
}) {
  if (!isDirty) return null

  return (
    <div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        You have unsaved changes
      </span>
      <button
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving…' : 'Save Now'}
      </button>
    </div>
  )
}
