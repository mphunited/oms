'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Contact {
  name?: string
  email?: string
  is_primary?: boolean
}

interface Customer {
  id: string
  name: string
  payment_terms: string | null
  is_active: boolean
  contacts: Contact[] | null
}

interface CustomerListProps {
  initialCustomers: Customer[]
}

export function CustomerList({ initialCustomers }: CustomerListProps) {
  const router = useRouter()
  const [customers, setCustomers] = useState(initialCustomers)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTerms, setNewTerms] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), payment_terms: newTerms || null }),
      })
      if (!res.ok) throw new Error(await res.text())
      const created: Customer = await res.json()
      setCustomers(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setAddOpen(false)
      setNewName('')
      setNewTerms('')
      toast.success('Customer added')
      router.push(`/customers/${created.id}`)
    } catch (err) {
      toast.error('Failed to add customer')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search customers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4 mr-1.5" />
          Add Customer
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Terms</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {search ? 'No customers match your search.' : 'No customers yet.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(customer => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/customers/${customer.id}`)}
                >
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.payment_terms ?? '—'}</TableCell>
                  <TableCell>{customer.contacts?.length ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                      {customer.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Name *</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Acme Corp"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-terms">Payment Terms</Label>
              <Select value={newTerms} onValueChange={v => setNewTerms(v ?? '')}>
                <SelectTrigger id="new-terms">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newName.trim() || saving}>
              {saving ? 'Adding…' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
