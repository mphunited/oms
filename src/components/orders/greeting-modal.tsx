'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  defaultName: string
  onConfirm: (name: string) => void
  onCancel: () => void
}

export function GreetingModal({ open, defaultName, onConfirm, onCancel }: Props) {
  const [name, setName] = useState(defaultName)

  useEffect(() => {
    if (open) setName(defaultName)
  }, [open, defaultName])

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel() }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Email Greeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label htmlFor="greeting-name">Greeting name</Label>
          <Input
            id="greeting-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="First name"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onConfirm(name.trim()) }}
          />
          <p className="text-xs text-muted-foreground">Appears as &ldquo;Hi [name],&rdquo; in the email.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onConfirm(name.trim())} disabled={!name.trim()}>
            Create Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
