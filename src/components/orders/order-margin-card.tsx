'use client'

import { useState, useEffect } from 'react'
import { useWatch } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type { OrderFormValues, SplitLoadValue } from '@/lib/orders/order-form-schema'

let _configCache: Map<string, boolean> | null = null
async function fetchConfigMap(): Promise<Map<string, boolean>> {
  if (_configCache) return _configCache
  try {
    const res = await fetch('/api/order-type-configs')
    if (!res.ok) throw new Error('Failed to fetch')
    const data: { order_type: string; is_commission_eligible: boolean }[] = await res.json()
    _configCache = new Map(data.map(d => [d.order_type, d.is_commission_eligible]))
  } catch {
    _configCache = new Map()
  }
  return _configCache!
}

function computeMargin(loads: SplitLoadValue[], values: Partial<OrderFormValues>, configMap: Map<string, boolean>) {
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
    const eligible = configMap.get(l.order_type || '') ?? false
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

const labelCls = 'text-[11px] font-medium text-white/65'
const valueCls = 'text-[15px] font-medium text-white/90'

export function OrderMarginCard({ control, loads }: { control: Control<OrderFormValues>; loads: SplitLoadValue[] }) {
  const [configMap, setConfigMap] = useState<Map<string, boolean>>(new Map())

  useEffect(() => {
    fetchConfigMap().then(setConfigMap)
  }, [])

  const values = useWatch({ control })
  const m = computeMargin(loads, values, configMap)

  const netMarginColor = m.marginPct === null
    ? 'text-white/90'
    : m.marginPct >= 8
      ? 'text-[#10b981]'
      : 'text-[#ef4444]'

  return (
    <div className="bg-[#1a2744] rounded-lg p-4 sticky top-4">
      <p className="text-[11px] font-medium tracking-[.08em] text-white/60 uppercase mb-3">
        Live Margin
      </p>

      <div className="space-y-1.5">
        <div className="flex justify-between items-baseline">
          <span className={labelCls}>Revenue</span>
          <span className={valueCls}>${m.totalRevenue.toFixed(2)}</span>
        </div>
        {m.freightToCustomer > 0 && (
          <div className="flex justify-between items-baseline">
            <span className={labelCls}>+ Customer freight</span>
            <span className={valueCls}>${m.freightToCustomer.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline">
          <span className={labelCls}>Total Costs</span>
          <span className={valueCls}>${m.totalCOGS.toFixed(2)}</span>
        </div>
        {m.totalBottleCost > 0 && (
          <div className="flex justify-between items-baseline">
            <span className={labelCls}>− Bottle costs</span>
            <span className={valueCls}>${m.totalBottleCost.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.12] my-2.5" />

      <div className="space-y-1.5">
        <div className="flex justify-between items-baseline">
          <span className={labelCls}>Gross margin</span>
          <span className={valueCls}>${m.grossMargin.toFixed(2)}</span>
        </div>
        {m.freightCost > 0 && (
          <div className="flex justify-between items-baseline">
            <span className={labelCls}>− MPH freight</span>
            <span className={valueCls}>${m.freightCost.toFixed(2)}</span>
          </div>
        )}
        {m.additionalCosts > 0 && (
          <div className="flex justify-between items-baseline">
            <span className={labelCls}>− Additional costs</span>
            <span className={valueCls}>${m.additionalCosts.toFixed(2)}</span>
          </div>
        )}
        {m.commissionDeduction > 0 && (
          <div className="flex justify-between items-baseline">
            <span className={labelCls}>− Commission ($3 × {m.commissionQty})</span>
            <span className={valueCls}>${m.commissionDeduction.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.12] my-2.5" />

      <div className="flex justify-between items-baseline">
        <span className="text-[11px] font-medium text-white/60">Net margin</span>
        <span className={`text-[22px] font-semibold ${netMarginColor}`}>
          ${m.netMargin.toFixed(2)}
        </span>
      </div>
      {m.marginPct !== null && (
        <div className="text-right text-[12px] text-white/65 mt-1">
          {m.marginPct.toFixed(1)}%
        </div>
      )}
    </div>
  )
}
