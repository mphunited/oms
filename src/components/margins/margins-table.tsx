'use client'

import { formatDate } from '@/lib/utils/format-date'
import { stripMphPrefix } from '@/lib/utils/strip-mph-prefix'

export type MarginRow = {
  orderId: string
  orderNumber: string
  salesperson: string | null
  customerName: string
  vendorName: string | null
  shipToLabel: string | null
  description: string | null
  shipDate: string | null
  buy: string | null
  sell: string | null
  qty: string | null
  freightCost: string | null
  customerFreightCost: string | null
  additionalCosts: string | null
  bottleCost: string | null
  bottleQty: string | null
  mphFreightBottles: string | null
  commissionAmount: string
  ibcTotalCost: string | null
  ibcTotalSellPrice: string | null
  profit: string | null
  profitPct: string | null
}

function currency(v: string | null): string {
  if (v === null || v === undefined) return '—'
  const n = parseFloat(v)
  if (isNaN(n)) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function firstName(name: string | null): string {
  return name ? name.trim().split(/\s+/)[0] : '—'
}

function qty2(v: string | null): string {
  if (v === null || v === undefined) return '—'
  const n = parseFloat(v)
  if (isNaN(n)) return '—'
  return n.toFixed(2)
}

const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <th
    className={`px-3 py-2 text-[12px] font-semibold text-white whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
  >
    {children}
  </th>
)

const TD = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <td className={`px-3 py-2 text-[13px] text-[#171717] whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </td>
)

type Props = { rows: MarginRow[] }

export function MarginsTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#e5e7eb]">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="bg-[#1a2744]">
            <TH>Salesperson</TH>
            <TH>MPH PO</TH>
            <TH>Vendor</TH>
            <TH>Customer</TH>
            <TH>Ship To</TH>
            <TH>Description</TH>
            <TH>Ship Date</TH>
            <TH right>Buy</TH>
            <TH right>Sell</TH>
            <TH right>Qty</TH>
            <TH right>Freight Cost</TH>
            <TH right>Customer Freight</TH>
            <TH right>Additional Costs</TH>
            <TH right>Bottle Cost</TH>
            <TH right>Bottle Qty</TH>
            <TH right>MPH Freight Bottles</TH>
            <TH right>Commission</TH>
            <TH right>IBC Total Cost</TH>
            <TH right>IBC Total Sell</TH>
            <TH right>Profit</TH>
            <TH right>Profit %</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const pct = r.profitPct !== null ? parseFloat(r.profitPct) : null
            const pctColor = pct === null ? '' : pct < 8 ? 'text-[#ef4444]' : 'text-[#10b981]'
            const isCommission = parseFloat(r.commissionAmount) !== 0

            return (
              <tr key={r.orderId} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f9fafb]'}>
                <TD>{firstName(r.salesperson)}</TD>
                <TD>{r.orderNumber}</TD>
                <TD>{r.vendorName ? stripMphPrefix(r.vendorName) : '—'}</TD>
                <TD>{r.customerName}</TD>
                <TD>{r.shipToLabel ?? '—'}</TD>
                <td className="px-3 py-2 text-[13px] text-[#171717] whitespace-normal break-words max-w-xs line-clamp-3">{r.description ?? '—'}</td>
                <TD>{formatDate(r.shipDate)}</TD>
                <TD right>{currency(r.buy)}</TD>
                <TD right>{currency(r.sell)}</TD>
                <TD right>{qty2(r.qty)}</TD>
                <TD right>{currency(r.freightCost)}</TD>
                <TD right>{currency(r.customerFreightCost)}</TD>
                <TD right>{currency(r.additionalCosts)}</TD>
                <TD right>{currency(r.bottleCost)}</TD>
                <TD right>{qty2(r.bottleQty)}</TD>
                <TD right>{currency(r.mphFreightBottles)}</TD>
                <TD right>
                  {isCommission ? (
                    <span className="font-medium">{currency(r.commissionAmount)}</span>
                  ) : '—'}
                </TD>
                <TD right>{currency(r.ibcTotalCost)}</TD>
                <TD right>{currency(r.ibcTotalSellPrice)}</TD>
                <TD right>{currency(r.profit)}</TD>
                <td className={`px-3 py-2 text-[13px] whitespace-nowrap text-right font-medium ${pctColor}`}>
                  {pct === null ? '—' : `${pct.toFixed(1)}%`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
