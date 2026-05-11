import { useEffect } from 'react'
import { navigationGuard } from '@/lib/navigation-guard'

export function useUnsavedChanges(isDirty: boolean): void {
  useEffect(() => {
    navigationGuard.setDirty(isDirty)
  }, [isDirty])

  useEffect(() => {
    return () => { navigationGuard.setDirty(false) }
  }, [])

  useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    const handlePopState = () => {
      if (!navigationGuard.isDirty()) return
      if (!window.confirm('You have unsaved changes. Leave anyway?')) {
        window.history.pushState(null, '', window.location.href)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isDirty])
}
