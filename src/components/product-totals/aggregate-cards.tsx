'use client'

export type ProductTotal = { orderType: string; totalQty: number; totalShipments: number }

type AggCard = { label: string; qty: number; shipments: number }
type Totals = { qty: number; shipments: number }

function computeCards(productTotals: ProductTotal[]): AggCard[] {
  const sumTypes = (types: string[]): Totals => {
    const set = new Set(types)
    const matching = productTotals.filter(r => set.has(r.orderType))
    return {
      qty: matching.reduce((a, r) => a + r.totalQty, 0),
      shipments: matching.reduce((a, r) => a + r.totalShipments, 0),
    }
  }
  const sumContains = (fragment: string): Totals => {
    const matching = productTotals.filter(r => r.orderType.includes(fragment))
    return {
      qty: matching.reduce((a, r) => a + r.totalQty, 0),
      shipments: matching.reduce((a, r) => a + r.totalShipments, 0),
    }
  }

  const ALL_DRUMS = ['55 Gal New OH Poly Drum', '55 Gal New TH Poly Drum', '55 Gal Washout OH Poly Drum', '55 Gal Washout TH Poly Drum', '55 Gal New OH Steel Drum', '55 Gal New TH Steel Drum']

  return [
    { label: 'Total new poly drums',    ...sumTypes(['55 Gal New OH Poly Drum', '55 Gal New TH Poly Drum']) },
    { label: 'Total washout drums',     ...sumTypes(['55 Gal Washout OH Poly Drum', '55 Gal Washout TH Poly Drum']) },
    { label: 'Total steel drums',       ...sumTypes(['55 Gal New OH Steel Drum', '55 Gal New TH Steel Drum']) },
    { label: 'Total all drums',         ...sumTypes(ALL_DRUMS) },
    { label: 'Total 275 Gal IBCs',      ...sumContains('275 Gal') },
    { label: 'Total 330 Gal IBCs',      ...sumContains('330 Gal') },
    { label: 'Total 135 Gal IBCs',      ...sumContains('135 Gal') },
  ]
}

function fmtNum(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 })
}

export function AggregateCards({ productTotals }: { productTotals: ProductTotal[] }) {
  const cards = computeCards(productTotals)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      {cards.map(c => (
        <div
          key={c.label}
          className="rounded-lg bg-card p-3"
          style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px' }}
        >
          <p className="text-[11px] font-medium text-muted-foreground leading-tight mb-1.5">{c.label}</p>
          <p className="text-xl font-semibold text-foreground">{fmtNum(c.qty)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{c.shipments} shipments</p>
        </div>
      ))}
    </div>
  )
}
