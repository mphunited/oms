import { Recycle } from 'lucide-react'

export default function RecyclingPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00205B]/10">
        <Recycle className="h-8 w-8 text-[#00205B]" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">Recycling Orders</h1>
      <p className="mt-2 text-sm text-muted-foreground">This section is coming soon.</p>
    </div>
  )
}
