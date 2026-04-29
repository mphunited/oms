type StatusCount = { status: string; count: number }

export function StatusBarChart({ data }: { data: StatusCount[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No active orders.</p>
  }

  const max = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="space-y-2">
      {data.map(({ status, count }) => (
        <div key={status} className="flex items-center gap-3 text-sm">
          <span className="w-48 shrink-0 text-right text-muted-foreground truncate" title={status}>
            {status}
          </span>
          <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm transition-all"
              style={{ width: `${(count / max) * 100}%`, backgroundColor: '#B88A44' }}
            />
          </div>
          <span className="w-6 shrink-0 text-right font-medium tabular-nums text-foreground">
            {count}
          </span>
        </div>
      ))}
    </div>
  )
}
