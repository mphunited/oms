export function formatCurrency(val: string | null | undefined): string {
  const n = parseFloat(val ?? '')
  return isNaN(n) ? '—' : `$${n.toFixed(2)}`
}

export function firstDescription(loads: { description: string | null }[]): string {
  const desc = loads[0]?.description ?? '—'
  return desc.length > 40 ? desc.slice(0, 40) + '…' : desc
}

export function firstQty(loads: { qty: string | null }[]): string {
  const val = loads[0]?.qty
  if (!val) return '—'
  const n = parseFloat(val)
  return isNaN(n) ? '—' : String(n)
}

export function formatShipTo(shipTo: unknown): string {
  if (!shipTo || typeof shipTo !== 'object') return '—'
  const s = shipTo as { city?: string; state?: string }
  if (!s.city && !s.state) return '—'
  return [s.city, s.state].filter(Boolean).join(', ')
}
