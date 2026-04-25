const FALLBACK_COLOR = '#6b7280'

export function getBadgeColor(
  meta: Record<string, { color: string }> | null,
  label: string,
): string {
  return meta?.[label]?.color ?? FALLBACK_COLOR
}

// Returns "#ffffff" for dark backgrounds, "#111827" for light ones.
// Threshold: relative luminance < 0.4 → white text.
export function getBadgeTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  function toLinear(c: number): number {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }

  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  return luminance < 0.4 ? '#ffffff' : '#111827'
}
