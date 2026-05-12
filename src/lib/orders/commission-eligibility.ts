// Keywords that make a load commission-eligible
export const COMMISSION_KEYWORDS = ['New IBC', 'Bottle', 'Rebottle', 'Washout', 'Wash & Return'] as const

// Keywords that show bottle cost fields (New IBC does NOT use bottle fields)
export const BOTTLE_KEYWORDS = ['Bottle', 'Rebottle', 'Washout', 'Wash & Return'] as const

export function deriveLoadCommissionStatus(
  orderType: string | null | undefined,
  configMap?: Map<string, boolean>
): string {
  if (!orderType) return 'Not Eligible'
  if (configMap) {
    return configMap.get(orderType) ? 'Eligible' : 'Not Eligible'
  }
  return COMMISSION_KEYWORDS.some(kw => orderType.includes(kw)) ? 'Eligible' : 'Not Eligible'
}

export function deriveOrderCommissionStatus(
  loads: Array<{ commission_status: string; commission_paid_date: string | null }>
): string {
  const eligible = loads.filter(l => l.commission_status === 'Eligible')
  if (eligible.length === 0) return 'Not Eligible'
  if (eligible.every(l => l.commission_paid_date !== null)) return 'Commission Paid'
  return 'Eligible'
}

export function deriveInitials(name: string | null | undefined): string {
  if (!name?.trim()) return 'XX'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0][0] ?? 'X').toUpperCase() + 'X'
  return ((parts[0][0] ?? 'X') + (parts[parts.length - 1][0] ?? 'X')).toUpperCase()
}

export function deriveFirstName(name: string | null | undefined): string {
  if (!name?.trim()) return '—'
  return name.trim().split(/\s+/)[0]
}
