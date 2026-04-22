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

interface GreetingModalProps {
  defaultName: string
  onConfirm: (greetingName: string) => void
  onCancel: () => void
  isOpen: boolean
}

export function GreetingModal({ isOpen, defaultName, onConfirm, onCancel }: GreetingModalProps) {
  const [name, setName] = useState(defaultName)

  useEffect(() => {
    if (isOpen) setName(defaultName)
  }, [isOpen, defaultName])

  return (
    <Dialog open={isOpen} onOpenChange={v => { if (!v) onCancel() }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Email Greeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label htmlFor="greeting-name-email">Greeting name</Label>
          <Input
            id="greeting-name-email"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="First name"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onConfirm(name.trim()) }}
          />
          <p className="text-xs text-muted-foreground">Appears as &ldquo;Hello [name],&rdquo; in the email.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={() => onConfirm(name.trim())}
            disabled={!name.trim()}
            className="bg-[#00205B] hover:bg-[#00205B]/90 text-white"
          >
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
