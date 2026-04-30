'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { GlobalEmailModal } from '@/components/global-emails/global-email-modal'

export type NewContactEntry = {
  name: string
  email: string
  fieldType: 'CONFIRMATION' | 'BILL_TO'
}

export function NewContactPrompt({
  pending,
  onClear,
}: {
  pending: NewContactEntry[]
  onClear: () => void
}) {
  const [queue, setQueue] = useState<NewContactEntry[]>([])
  const [modalContact, setModalContact] = useState<NewContactEntry | null>(null)
  // track emails shown so they don't re-prompt on re-render
  const shownRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (pending.length === 0) return
    const fresh = pending.filter(p => !shownRef.current.has(p.email.toLowerCase()))
    if (fresh.length > 0) setQueue(fresh)
  }, [pending])

  useEffect(() => {
    if (queue.length === 0) return
    const contact = queue[0]

    const advance = () =>
      setQueue(q => {
        const next = q.slice(1)
        if (next.length === 0) onClear()
        return next
      })

    toast(`Save ${contact.name || contact.email} to Global Emails?`, {
      id: 'new-contact-prompt',
      duration: Infinity,
      description: contact.name ? contact.email : undefined,
      action: {
        label: 'Save',
        onClick: () => {
          shownRef.current.add(contact.email.toLowerCase())
          setModalContact(contact)
          advance()
        },
      },
      cancel: {
        label: 'Dismiss',
        onClick: () => {
          shownRef.current.add(contact.email.toLowerCase())
          advance()
        },
      },
    })
  }, [queue, onClear])

  if (!modalContact) return null

  return (
    <GlobalEmailModal
      open={true}
      initial={{ name: modalContact.name, email: modalContact.email, type: modalContact.fieldType }}
      onClose={() => setModalContact(null)}
      onSaved={() => {
        setModalContact(null)
        toast.success('Contact saved to Global Emails')
      }}
    />
  )
}
