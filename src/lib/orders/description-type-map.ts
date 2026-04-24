export const DESCRIPTION_TYPE_MAP: Array<{ keywords: string[]; orderType: string }> = [
  { keywords: ['Wash & Return', '275'], orderType: '275 Gal Wash & Return Program' },
  { keywords: ['Wash & Return', '330'], orderType: '330 Gal Wash & Return Program' },
  { keywords: ['Wash & Return'],        orderType: '275 Gal Wash & Return Program' },
  { keywords: ['Rebottle', '275'],      orderType: '275 Gal Rebottle IBC' },
  { keywords: ['Rebottle', '330'],      orderType: '330 Gal Rebottle IBC' },
  { keywords: ['Rebottle'],             orderType: '275 Gal Rebottle IBC' },
  { keywords: ['Washout', '275'],       orderType: '275 Gal Washout IBC' },
  { keywords: ['Washout', '330'],       orderType: '330 Gal Washout IBC' },
  { keywords: ['Washout'],              orderType: '275 Gal Washout IBC' },
  { keywords: ['275', 'Bottle'],        orderType: '275 Gal Bottle' },
  { keywords: ['330', 'Bottle'],        orderType: '330 Gal Bottle' },
  { keywords: ['135'],                  orderType: '135 Gal New IBC' },
  { keywords: ['275'],                  orderType: '275 Gal New IBC' },
  { keywords: ['330'],                  orderType: '330 Gal New IBC' },
  { keywords: ['Drum'],                 orderType: '55 Gal Drums' },
]

export function matchOrderType(description: string): string | null {
  const lower = description.toLowerCase()
  for (const { keywords, orderType } of DESCRIPTION_TYPE_MAP) {
    if (keywords.every(kw => lower.includes(kw.toLowerCase()))) return orderType
  }
  return null
}
