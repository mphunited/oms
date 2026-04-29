'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type StatusCount = { status: string; count: number }

export function StatusBarChart({ data }: { data: StatusCount[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No active orders.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 24, bottom: 0, left: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="status"
          width={190}
          tick={{ fontSize: 12, fill: '#374151' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: '#f3f4f6' }}
          contentStyle={{ borderRadius: 8, fontSize: 13, border: '1px solid #e5e7eb' }}
          formatter={(v: number) => [v, 'Orders']}
        />
        <Bar dataKey="count" fill="#B88A44" radius={[0, 4, 4, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}
