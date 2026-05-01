import { formatDate } from '@/lib/utils/format-date'
import { formatCurrency } from '@/lib/utils/order-table-utils'

export type FullSplitLoad = {
  id: string
  order_number_override: string | null
  customer_po: string | null
  description: string | null
  order_type: string | null
  qty: string | null
  ship_date: string | null
  wanted_date: string | null
  buy: string | null
  sell: string | null
}

type Props = {
  load: FullSplitLoad
  orderNumber: string
  orderCustomerPo: string | null
}

export function SplitLoadSubRow({ load, orderNumber, orderCustomerPo }: Props) {
  const mphPo = load.order_number_override ?? orderNumber
  const custPo = load.customer_po ?? orderCustomerPo ?? '—'

  return (
    <tr className="bg-muted/20 text-xs text-muted-foreground border-t border-dashed">
      <td /> {/* chevron col */}
      <td /> {/* checkbox col */}
      <td /> {/* flag col */}
      <td className="px-3 py-1.5 font-mono text-foreground">{mphPo}</td>
      <td /> {/* status col */}
      <td /> {/* customer col */}
      <td className="px-3 py-1.5">{custPo}</td>
      <td className="px-3 py-1.5" title={load.description ?? ''}>{load.description ?? '—'}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{load.qty != null ? parseFloat(load.qty).toString() : '—'}</td>
      <td className="px-3 py-1.5">{formatDate(load.ship_date)}</td>
      <td className="px-3 py-1.5">{formatDate(load.wanted_date)}</td>
      <td /> {/* vendor col */}
      <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(load.buy)}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(load.sell)}</td>
      <td /> {/* ship to col */}
      <td /> {/* freight col */}
      <td /> {/* actions col */}
    </tr>
  )
}
