'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type CustomerRow = {
  id: string
  name: string
  payment_terms: string | null
  is_active: boolean
  created_at: string
}

export default function CustomersPage() {
  const [rows, setRows]       = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')

  useEffect(() => {
    fetch('/api/customers')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<CustomerRow[]> })
      .then(data => { setRows(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const created = await res.json() as CustomerRow
      setRows(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setCreating(false)
    } catch (err) {
      alert('Failed to create customer: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Customer
          </button>
        )}
      </div>

      {creating && (
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
            placeholder="Customer name"
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button onClick={handleCreate} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Save
          </button>
          <button onClick={() => { setCreating(false); setNewName('') }} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors">
            Cancel
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error   && <p className="text-sm text-destructive">Error: {error}</p>}

      {!loading && !error && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Payment Terms</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2">
                    <Link href={`/customers/${row.id}`} className="font-medium hover:underline text-primary">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{row.payment_terms ?? '—'}</td>
                  <td className="px-4 py-2">
                    <Badge variant={row.is_active ? 'default' : 'secondary'}>
                      {row.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No customers yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}