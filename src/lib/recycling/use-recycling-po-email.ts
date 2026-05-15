'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { getMailTokenResilient } from '@/lib/email/msal-client-resilient'
import { createDraftResilient, attachFileToDraftResilient } from '@/lib/email/graph-mail-resilient'
import { openDraft } from '@/lib/email/graph-mail'
import { getUserSignature } from '@/lib/email/get-user-signature'

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function useRecyclingPoEmail(id: string, orderNumber: string) {
  const [emailingPo, setEmailingPo] = useState(false)

  async function handleEmailPo() {
    setEmailingPo(true)
    const toastId = toast.loading('Creating draft…')
    try {
      const pdfRes = await fetch(`/api/recycling-orders/${id}/po-pdf`)
      if (!pdfRes.ok) throw new Error('Failed to fetch PO PDF')

      const toHeader  = pdfRes.headers.get('x-email-to') ?? ''
      const ccHeader  = pdfRes.headers.get('x-email-cc') ?? ''
      const subject   = pdfRes.headers.get('x-email-subject') ?? `MPH United PO ${orderNumber}`

      const to = toHeader ? toHeader.split(',').map(s => s.trim()).filter(Boolean) : []
      const cc = ccHeader ? ccHeader.split(',').map(s => s.trim()).filter(Boolean) : []

      const base64 = await blobToBase64(await pdfRes.blob())
      const [token, signature] = await Promise.all([getMailTokenResilient(), getUserSignature()])

      const bodyHtml = `<div style="font-family:'Aptos','Calibri','Arial',sans-serif;font-size:12pt;color:#1f2937;max-width:700px;line-height:1.6;">
  <p style="margin:0 0 16px;">Please find attached Purchase Order ${orderNumber}.</p>
  <p style="margin:0 0 16px;">Please confirm receipt at your earliest convenience. Please reference MPH PO # on all correspondence and shipping documents.</p>
</div>`

      const { id: messageId, webLink } = await createDraftResilient(token, { to, cc, subject, bodyHtml, signature })
      await attachFileToDraftResilient(token, messageId, `MPH PO ${orderNumber}.pdf`, base64)
      toast.success('Draft created — opening Outlook', { id: toastId })
      openDraft(webLink)
    } catch (err) {
      toast.error('Failed to create draft: ' + (err instanceof Error ? err.message : String(err)), { id: toastId })
    } finally {
      setEmailingPo(false)
    }
  }

  return { handleEmailPo, emailingPo }
}
