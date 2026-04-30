'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Pencil, Trash2, Loader2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GlobalEmailModal, type GlobalEmailContactRow } from '@/components/global-emails/global-email-modal'

const TYPE_BADGE: Record<string, string> = {
  CONFIRMATION: 'bg-blue-100 text-blue-800 border-blue-200',
  BILL_TO: 'bg-amber-100 text-amber-800 border-amber-200',
  BOTH: 'bg-green-100 text-green-800 border-green-200',
}

const TYPE_LABEL: Record<string, string> = {
  CONFIRMATION: 'Confirmation',
  BILL_TO: 'Bill To',
  BOTH: 'Both',
}

type SortCol = 'name' | 'company' | 'email'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol | null; sortDir: SortDir }) {
  if (sortCol !== col) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />
  return sortDir === 'asc'
    ? <ArrowUp className="ml-1 h-3.5 w-3.5" />
    : <ArrowDown className="ml-1 h-3.5 w-3.5" />
}

export function GlobalEmailsClient({ isAdmin }: { isAdmin: boolean }) {
  const [contacts, setContacts] = useState<GlobalEmailContactRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [sortCol, setSortCol] = useState<SortCol | null>('company')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalInitial, setModalInitial] = useState<{ id?: string; name: string; email: string; company?: string | null; type?: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/global-emails')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<GlobalEmailContactRow[]> })
      .then(data => { setContacts(data); setLoading(false) })
      .catch(() => { toast.error('Failed to load contacts'); setLoading(false) })
  }, [])

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      if (sortDir === 'asc') { setSortDir('desc') }
      else { setSortCol(null); setSortDir('asc') }
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q)
    const matchType = typeFilter === 'ALL' || c.type === typeFilter
    return matchSearch && matchType
  })

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0
    const dir = sortDir === 'asc' ? 1 : -1

    if (sortCol === 'company') {
      const ac = a.company?.trim() ?? ''
      const bc = b.company?.trim() ?? ''
      // nulls/empty always to bottom regardless of direction
      if (!ac && !bc) return a.name.localeCompare(b.name)
      if (!ac) return 1
      if (!bc) return -1
      const cmp = ac.localeCompare(bc)
      if (cmp !== 0) return cmp * dir
      // secondary: name ASC within the same company
      return a.name.localeCompare(b.name)
    }

    return a[sortCol].localeCompare(b[sortCol]) * dir
  })

  function openAdd() {
    setModalInitial({ name: '', email: '', company: null, type: 'BOTH' })
    setModalOpen(true)
  }

  function openEdit(c: GlobalEmailContactRow) {
    setModalInitial({ id: c.id, name: c.name, email: c.email, company: c.company, type: c.type })
    setModalOpen(true)
  }

  function handleSaved(updated: GlobalEmailContactRow) {
    setContacts(prev => {
      const idx = prev.findIndex(c => c.id === updated.id)
      return idx >= 0
        ? prev.map((c, i) => i === idx ? updated : c)
        : [...prev, updated]
    })
    setModalOpen(false)
    toast.success(modalInitial?.id ? 'Contact updated' : 'Contact added')
  }

  async function handleDelete(id: string, name: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/global-emails/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`${res.status}`)
      setContacts(prev => prev.filter(c => c.id !== id))
      toast.success(`"${name}" deleted`)
    } catch {
      toast.error('Failed to delete contact')
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const thClass = 'px-4 py-2 text-left font-medium text-muted-foreground'
  const sortThClass = `${thClass} cursor-pointer select-none hover:text-foreground transition-colors`

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, or company…" className="pl-8 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={v => setTypeFilter(v ?? 'ALL')}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="CONFIRMATION">Confirmation</SelectItem>
            <SelectItem value="BILL_TO">Bill To</SelectItem>
            <SelectItem value="BOTH">Both</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button onClick={openAdd} className="h-9 bg-[#00205B] hover:bg-[#00205B]/90 text-white">
          <Plus className="mr-1.5 h-4 w-4" />Add Contact
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />Loading…
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className={sortThClass} onClick={() => handleSort('name')}>
                  <span className="inline-flex items-center">Name<SortIcon col="name" sortCol={sortCol} sortDir={sortDir} /></span>
                </th>
                <th className={sortThClass} onClick={() => handleSort('email')}>
                  <span className="inline-flex items-center">Email<SortIcon col="email" sortCol={sortCol} sortDir={sortDir} /></span>
                </th>
                <th className={sortThClass} onClick={() => handleSort('company')}>
                  <span className="inline-flex items-center">Company<SortIcon col="company" sortCol={sortCol} sortDir={sortDir} /></span>
                </th>
                <th className={thClass}>Type</th>
                <th className={`${thClass} w-10`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    {contacts.length === 0
                      ? 'No contacts yet. Add your first contact to get started.'
                      : 'No contacts match your search.'}
                  </td>
                </tr>
              ) : sorted.map(c => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.company || <span className="text-muted-foreground/50">—</span>}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_BADGE[c.type] ?? ''}`}>
                      {TYPE_LABEL[c.type] ?? c.type}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {confirmDeleteId === c.id ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">Delete {c.name}? This will not affect contacts already saved on orders.</span>
                        <Button size="sm" variant="destructive" className="h-7 px-2 text-xs shrink-0"
                          onClick={() => void handleDelete(c.id, c.name)} disabled={!!deletingId}>
                          {deletingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes, delete'}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs shrink-0"
                          onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)} aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setConfirmDeleteId(c.id)} aria-label="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <GlobalEmailModal
        open={modalOpen}
        initial={modalInitial}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
