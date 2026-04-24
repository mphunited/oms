'use client'

import { useWatch } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { OrderFormValues, SplitLoadValue } from '@/lib/orders/order-form-schema'
import { COMMISSION_KEYWORDS } from '@/lib/orders/commission-eligibility'

function computeMargin(loads: SplitLoadValue[], values: Partial<OrderFormValues>) {
  const totalRevenue = loads.reduce((sum, l) => sum + (Number(l.sell) || 0) * (Number(l.qty) || 0), 0)
  const totalCOGS = loads.reduce((sum, l) => sum + (Number(l.buy) || 0) * (Number(l.qty) || 0), 0)
  const totalBottleCost = loads.reduce((sum, l) => {
    const bc = (Number(l.bottle_cost) || 0) * (Number(l.bottle_qty) || 0)
    const mf = ((Number(l.mph_freight_bottles) || 0) / 90) * (Number(l.bottle_qty) || 0)
    return sum + bc + mf
  }, 0)
  const freightToCustomer = Number(values.freight_to_customer) || 0
  const freightCost = Number(values.freight_cost) || 0
  const additionalCosts = Number(values.additional_costs) || 0
  const commissionQty = loads.reduce((sum, l) => {
    const eligible = COMMISSION_KEYWORDS.some(kw => (l.order_type || '').includes(kw))
    return sum + (eligible ? (Number(l.qty) || 0) : 0)
  }, 0)
  const commissionDeduction = commissionQty * 3
  const totalTopLine = totalRevenue + freightToCustomer
  const grossMargin = totalTopLine - totalCOGS - totalBottleCost
  const netMargin = grossMargin - freightCost - additionalCosts - commissionDeduction
  const marginPct = totalTopLine > 0 ? (netMargin / totalTopLine) * 100 : null
  return { totalRevenue, freightToCustomer, totalTopLine, totalCOGS, totalBottleCost,
    grossMargin, freightCost, additionalCosts, commissionDeduction, commissionQty,
    netMargin, marginPct }
}

export function OrderMarginCard({ control, loads }: { control: Control<OrderFormValues>; loads: SplitLoadValue[] }) {
  const values = useWatch({ control })
  const m = computeMargin(loads, values)
  const isLow = m.marginPct !== null && m.marginPct < 8
  return (
    <Card className={cn('sticky top-4 transition-colors', isLow && 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950')}>
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Live Margin</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span>${m.totalRevenue.toFixed(2)}</span></div>
        {m.freightToCustomer > 0 && <div className="flex justify-between text-muted-foreground"><span>+ Customer freight</span><span>${m.freightToCustomer.toFixed(2)}</span></div>}
        <div className="flex justify-between text-muted-foreground"><span>Total Costs</span><span>${m.totalCOGS.toFixed(2)}</span></div>
        {m.totalBottleCost > 0 && <div className="flex justify-between text-muted-foreground"><span>− Bottle costs</span><span>${m.totalBottleCost.toFixed(2)}</span></div>}
        <Separator />
        <div className="flex justify-between"><span className="text-muted-foreground">Gross margin</span><span>${m.grossMargin.toFixed(2)}</span></div>
        {m.freightCost > 0 && <div className="flex justify-between text-muted-foreground"><span>− MPH freight</span><span>${m.freightCost.toFixed(2)}</span></div>}
        {m.additionalCosts > 0 && <div className="flex justify-between text-muted-foreground"><span>− Additional costs</span><span>${m.additionalCosts.toFixed(2)}</span></div>}
        {m.commissionDeduction > 0 && <div className="flex justify-between text-muted-foreground"><span>− Commission ($3 × {m.commissionQty})</span><span>${m.commissionDeduction.toFixed(2)}</span></div>}
        <Separator />
        <div className="flex justify-between font-semibold"><span>Net margin</span><span className={isLow ? 'text-red-600 dark:text-red-400' : ''}>${m.netMargin.toFixed(2)}</span></div>
        {m.marginPct !== null && (
          <div className={cn('text-center text-2xl font-bold pt-1', isLow ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
            {m.marginPct.toFixed(1)}%
            {isLow && <p className="text-xs font-normal text-red-600 dark:text-red-400 mt-0.5">⚠ below 8% threshold</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
