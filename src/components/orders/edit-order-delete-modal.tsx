'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Props = {
  orderId: string
  orderNumber: string
  onClose: () => void
}

export function EditOrderDeleteModal({ orderId, orderNumber, onClose }: Props) {
  const router = useRouter()
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (deleteInput !== 'DELETE') return
    setDeleting(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`${res.status}`)
      toast.success('Order deleted')
      router.push('/orders')
    } catch (err) {
      toast.error('Delete failed: ' + (err instanceof Error ? err.message : String(err)))
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg space-y-4">
        <h2 className="text-lg font-semibold">Delete Order</h2>
        <p className="text-sm text-muted-foreground">
          This will permanently delete order <span className="font-mono font-medium">{orderNumber}</span> and all its split loads. This cannot be undone.
        </p>
        <p className="text-sm">Type <span className="font-mono font-semibold">DELETE</span> to confirm:</p>
        <input
          type="text"
          value={deleteInput}
          onChange={e => setDeleteInput(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-destructive"
          placeholder="Type DELETE"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => { onClose(); setDeleteInput('') }}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteInput !== 'DELETE' || deleting}
            className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
