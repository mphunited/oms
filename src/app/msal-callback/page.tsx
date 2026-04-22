'use client'
import { useEffect } from 'react'
import { msalInstance } from '@/lib/email/msal-client'

export default function MsalCallback() {
  useEffect(() => {
    msalInstance.initialize().then(() => {
      msalInstance.handleRedirectPromise().catch(() => {})
    })
  }, [])
  return null
}
