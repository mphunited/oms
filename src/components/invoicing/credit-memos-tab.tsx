'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, FileText, Pencil, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils/format-date'
import { CreditMemoForm } from './credit-memo-form'

type CreditMemoListRow = {
  id: string
  credit_number: string | null
  credit_date: string
  customer_name: string | null
  notes: string | null
  status: string
  created_by_name: string | null
  line_item_count: number
  total_amount: string | null
  created_at: string
}

export function CreditMemosTab() {
  const [memos, setMemos]         = useState<CreditMemoListRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [formOpen, setFormOpen]   = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch('/api/credit-memos')
      .then(r => r.json())
      .then((data: CreditMemoListRow[]) => { setMemos(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { toast.error('Failed to load credit memos'); setLoading(false) })
  }, [refreshKey])

  function openNew() { setEditId(null); setFormOpen(true) }
  function openEdit(id: string) { setEditId(id); setFormOpen(true) }

  async function handleDelete(id: string) {
    if (!confirm('Delete this draft credit memo? This cannot be undone.')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/credit-memos/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Delete failed')
      }
      toast.success('Credit memo deleted')
      setRefreshKey(k => k + 1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  function canDelete(memo: CreditMemoListRow): boolean {
    return memo.status === 'Draft' && memo.created_at.slice(0, 10) === today
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Credit Memos</h2>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-md bg-[#00205B] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#B88A44] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Credit Memo
        </button>
      </div>

      {loading ? (
        <p className="py-6 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {['Credit #', 'Date', 'Customer', 'Total', 'Status', 'Created By', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {memos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No credit memos yet.
                  </td>
                </tr>
              ) : memos.map(memo => (
                <tr key={memo.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 font-mono">{memo.credit_number ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(memo.credit_date)}</td>
                  <td className="px-3 py-2">{memo.customer_name ?? '—'}</td>
                  <td className="px-3 py-2 font-medium tabular-nums">
                    ${parseFloat(memo.total_amount ?? '0').toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      memo.status === 'Final'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400'
                    }`}>
                      {memo.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{memo.created_by_name ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {memo.status === 'Draft' && (
                        <button
                          type="button"
                          onClick={() => openEdit(memo.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {memo.status === 'Final' && (
                        <a
                          href={`/api/credit-memos/${memo.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="View PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </a>
                      )}
                      {canDelete(memo) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(memo.id)}
                          disabled={deleting === memo.id}
                          className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreditMemoForm
        open={formOpen}
        editId={editId}
        onClose={() => setFormOpen(false)}
        onSaved={() => setRefreshKey(k => k + 1)}
      />
    </div>
  )
}
