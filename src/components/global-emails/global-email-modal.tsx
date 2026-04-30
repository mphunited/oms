'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export type GlobalEmailContactRow = {
  id: string
  name: string
  email: string
  company: string | null
  type: 'CONFIRMATION' | 'BILL_TO' | 'BOTH'
}

type ModalInitial = {
  id?: string
  name: string
  email: string
  company?: string | null
  type?: string
}

export function GlobalEmailModal({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean
  initial?: ModalInitial | null
  onClose: () => void
  onSaved: (contact: GlobalEmailContactRow) => void
}) {
  const isEdit = !!initial?.id
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [type, setType] = useState<'CONFIRMATION' | 'BILL_TO' | 'BOTH'>('BOTH')
  const [saving, setSaving] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setEmail(initial?.email ?? '')
      setCompany(initial?.company ?? '')
      setType((initial?.type as 'CONFIRMATION' | 'BILL_TO' | 'BOTH') ?? 'BOTH')
      setEmailError(null)
    }
  }, [open, initial])

  async function handleSubmit() {
    const trimName = name.trim()
    const trimEmail = email.trim()
    if (!trimName) { toast.error('Name is required'); return }
    if (!trimEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      toast.error('Valid email is required')
      return
    }
    setSaving(true)
    setEmailError(null)
    try {
      const url = isEdit ? `/api/global-emails/${initial!.id}` : '/api/global-emails'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimName, email: trimEmail, company: company.trim() || null, type }),
      })
      if (res.status === 409) {
        const data = await res.json()
        setEmailError(data.error ?? 'A contact with this email already exists')
        return
      }
      if (!res.ok) throw new Error(await res.text())
      const contact = await res.json() as GlobalEmailContactRow
      onSaved(contact)
    } catch {
      toast.error(isEdit ? 'Failed to update contact' : 'Failed to save contact')
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); void handleSubmit() }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Contact' : 'Add to Global Emails'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ge-name">Name *</Label>
            <Input id="ge-name" value={name} onChange={e => setName(e.target.value)} onKeyDown={handleKeyDown} placeholder="Full name" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ge-email">Email *</Label>
            <Input id="ge-email" type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailError(null) }} onKeyDown={handleKeyDown} placeholder="email@company.com" />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ge-company">Company</Label>
            <Input id="ge-company" value={company} onChange={e => setCompany(e.target.value)} onKeyDown={handleKeyDown} placeholder="Company name (optional)" />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={v => setType(v as 'CONFIRMATION' | 'BILL_TO' | 'BOTH')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CONFIRMATION">Confirmation</SelectItem>
                <SelectItem value="BILL_TO">Bill To</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={saving} className="bg-[#00205B] hover:bg-[#00205B]/90 text-white">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : isEdit ? 'Update' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
