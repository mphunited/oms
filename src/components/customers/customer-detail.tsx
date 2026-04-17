'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface Contact {
  name: string
  email: string
  phone_office: string
  phone_cell: string
  role: string
  is_primary: boolean
  notes: string
}

interface Address {
  street?: string
  city?: string
  state?: string
  zip?: string
}

export interface CustomerData {
  id: string
  name: string
  payment_terms: string | null
  is_active: boolean
  contacts: Contact[] | null
  ship_to: Address | null
  bill_to: Address | null
}

const EMPTY_CONTACT: Contact = {
  name: '', email: '', phone_office: '', phone_cell: '',
  role: '', is_primary: false, notes: '',
}

const EMPTY_ADDRESS: Address = { street: '', city: '', state: '', zip: '' }

interface CustomerDetailProps {
  customer: CustomerData
}

export function CustomerDetail({ customer: initial }: CustomerDetailProps) {
  const router = useRouter()
  const [data, setData] = useState<CustomerData>({
    ...initial,
    contacts: initial.contacts ?? [],
    ship_to: initial.ship_to ?? EMPTY_ADDRESS,
    bill_to: initial.bill_to ?? EMPTY_ADDRESS,
  })
  const [profileDirty, setProfileDirty] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [contactForm, setContactForm] = useState<Contact>(EMPTY_CONTACT)
  const [savingContact, setSavingContact] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  function setProfile<K extends keyof CustomerData>(key: K, value: CustomerData[K]) {
    setData(prev => ({ ...prev, [key]: value }))
    setProfileDirty(true)
  }

  function setAddress(field: 'ship_to' | 'bill_to', key: keyof Address, value: string) {
    setData(prev => ({
      ...prev,
      [field]: { ...(prev[field] ?? EMPTY_ADDRESS), [key]: value },
    }))
    setProfileDirty(true)
  }

  async function saveProfile() {
    setSavingProfile(true)
    try {
      const res = await fetch(`/api/customers/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          payment_terms: data.payment_terms,
          is_active: data.is_active,
          ship_to: data.ship_to,
          bill_to: data.bill_to,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setProfileDirty(false)
      toast.success('Customer saved')
      router.refresh()
    } catch (err) {
      toast.error('Failed to save customer')
      console.error(err)
    } finally {
      setSavingProfile(false)
    }
  }

  function openAddContact() {
    setEditingIndex(null)
    setContactForm(EMPTY_CONTACT)
    setContactDialogOpen(true)
  }

  function openEditContact(idx: number) {
    setEditingIndex(idx)
    setContactForm({ ...(data.contacts ?? [])[idx] })
    setContactDialogOpen(true)
  }

  async function saveContact() {
    setSavingContact(true)
    try {
      const contacts = [...(data.contacts ?? [])]
      if (contactForm.is_primary) {
        contacts.forEach(c => { c.is_primary = false })
      }
      if (editingIndex !== null) {
        contacts[editingIndex] = contactForm
      } else {
        contacts.push(contactForm)
      }
      const res = await fetch(`/api/customers/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json()
      setData(prev => ({ ...prev, contacts: updated.contacts ?? [] }))
      setContactDialogOpen(false)
      toast.success(editingIndex !== null ? 'Contact updated' : 'Contact added')
    } catch (err) {
      toast.error('Failed to save contact')
      console.error(err)
    } finally {
      setSavingContact(false)
    }
  }

  async function deleteContact(idx: number) {
    const contacts = (data.contacts ?? []).filter((_, i) => i !== idx)
    try {
      const res = await fetch(`/api/customers/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json()
      setData(prev => ({ ...prev, contacts: updated.contacts ?? [] }))
      setDeleteIndex(null)
      toast.success('Contact removed')
    } catch (err) {
      toast.error('Failed to remove contact')
      console.error(err)
    }
  }

  async function togglePrimary(idx: number) {
    const contacts = (data.contacts ?? []).map((c, i) => ({
      ...c,
      is_primary: i === idx ? !c.is_primary : false,
    }))
    try {
      const res = await fetch(`/api/customers/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json()
      setData(prev => ({ ...prev, contacts: updated.contacts ?? [] }))
    } catch (err) {
      toast.error('Failed to update contact')
      console.error(err)
    }
  }

  const contacts = data.contacts ?? []

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name">Name *</Label>
              <Input
                id="cust-name"
                value={data.name}
                onChange={e => setProfile('name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-terms">Payment Terms</Label>
              <Select
                value={data.payment_terms ?? ''}
                onValueChange={v => setProfile('payment_terms', v || null)}
              >
                <SelectTrigger id="cust-terms">
                  <SelectValue placeholder="Select terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PPD">PPD</SelectItem>
                  <SelectItem value="PPA">PPA</SelectItem>
                  <SelectItem value="FOB">FOB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="cust-active"
              checked={data.is_active}
              onCheckedChange={v => setProfile('is_active', v)}
            />
            <Label htmlFor="cust-active">Active</Label>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {(['ship_to', 'bill_to'] as const).map(field => (
              <div key={field} className="space-y-3">
                <p className="text-sm font-medium">
                  {field === 'ship_to' ? 'Default Ship To' : 'Default Bill To'}
                </p>
                {(['street', 'city', 'state', 'zip'] as const).map(key => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs capitalize">{key}</Label>
                    <Input
                      value={(data[field] as Address)?.[key] ?? ''}
                      onChange={e => setAddress(field, key, e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveProfile} disabled={!profileDirty || savingProfile}>
              {savingProfile ? 'Saving…' : 'Save Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contacts</CardTitle>
          <Button size="sm" onClick={openAddContact}>
            <Plus className="size-4 mr-1.5" />
            Add Contact
          </Button>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No contacts yet. Add one above.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((c, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <span className="font-medium">{c.name || '—'}</span>
                        {c.is_primary && (
                          <Badge variant="outline" className="ml-2 text-xs">Primary</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.role || '—'}</TableCell>
                      <TableCell>{c.email || '—'}</TableCell>
                      <TableCell className="text-sm">
                        {c.phone_office || c.phone_cell || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            title={c.is_primary ? 'Remove primary' : 'Set as primary'}
                            onClick={() => togglePrimary(idx)}
                          >
                            <Star className={`size-3.5 ${c.is_primary ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => openEditContact(idx)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteIndex(idx)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact edit dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {([
              { id: 'cf-name',  label: 'Name',          key: 'name'          as keyof Contact },
              { id: 'cf-role',  label: 'Role',           key: 'role'          as keyof Contact },
              { id: 'cf-email', label: 'Email',          key: 'email'         as keyof Contact },
              { id: 'cf-po',    label: 'Phone (Office)', key: 'phone_office'  as keyof Contact },
              { id: 'cf-pc',    label: 'Phone (Cell)',   key: 'phone_cell'    as keyof Contact },
            ] as const).map(({ id, label, key }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  value={contactForm[key] as string}
                  onChange={e => setContactForm(prev => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cf-notes">Notes</Label>
              <Textarea
                id="cf-notes"
                value={contactForm.notes}
                onChange={e => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                id="cf-primary"
                checked={contactForm.is_primary}
                onCheckedChange={v => setContactForm(prev => ({ ...prev, is_primary: v }))}
              />
              <Label htmlFor="cf-primary">Primary contact</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveContact} disabled={savingContact}>
              {savingContact ? 'Saving…' : 'Save Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteIndex !== null} onOpenChange={open => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{' '}
              {deleteIndex !== null ? contacts[deleteIndex]?.name || 'this contact' : 'this contact'} from the customer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteIndex !== null && deleteContact(deleteIndex)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
