'use client'

import { useState, useEffect } from 'react'
import { GlobalEmailsClient } from '@/components/global-emails/global-emails-client'

export default function GlobalEmailsPage() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(me => setIsAdmin(me?.role === 'ADMIN'))
      .catch(() => {})
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Global Emails</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Shared contact directory for order confirmations and billing
        </p>
      </div>
      <GlobalEmailsClient isAdmin={isAdmin} />
    </div>
  )
}
