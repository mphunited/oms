'use client'

import { useState, useEffect } from 'react'

export type GlobalContactSuggestion = { name: string; email: string }

export function useGlobalContacts() {
  const [confirmationContacts, setConfirmationContacts] = useState<GlobalContactSuggestion[]>([])
  const [billToContacts, setBillToContacts] = useState<GlobalContactSuggestion[]>([])

  useEffect(() => {
    fetch('/api/global-emails?type=CONFIRMATION')
      .then(r => r.json())
      .then((data: { name: string; email: string }[]) =>
        setConfirmationContacts(Array.isArray(data) ? data.map(d => ({ name: d.name, email: d.email })) : [])
      )
      .catch(() => {})

    fetch('/api/global-emails?type=BILL_TO')
      .then(r => r.json())
      .then((data: { name: string; email: string }[]) =>
        setBillToContacts(Array.isArray(data) ? data.map(d => ({ name: d.name, email: d.email })) : [])
      )
      .catch(() => {})
  }, [])

  function findNewContacts(
    contacts: Array<{ email?: string; name?: string }>,
    globalList: GlobalContactSuggestion[],
    fieldType: 'CONFIRMATION' | 'BILL_TO',
  ) {
    const known = new Set(globalList.map(g => g.email.toLowerCase()))
    return contacts
      .filter(c => {
        const e = c.email?.trim().toLowerCase()
        return e && !known.has(e)
      })
      .map(c => ({
        name: c.name ?? '',
        email: c.email!.trim(),
        fieldType,
      }))
  }

  return { confirmationContacts, billToContacts, findNewContacts }
}
