'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { InvoiceQueueTab } from './invoice-queue-tab'
import { CreditMemosTab } from './credit-memos-tab'

type Tab = 'queue' | 'credits'

export function InvoicingClient() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const activeTab = (searchParams.get('tab') as Tab) ?? 'queue'

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    // Clear queue-specific params when switching away
    if (tab !== 'queue') {
      params.delete('customerId')
      params.delete('invoiceStatus')
      params.delete('shipDateFrom')
      params.delete('shipDateTo')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'queue',   label: 'Invoice Queue' },
    { id: 'credits', label: 'Credit Memos' },
  ]

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-[#00205B] text-[#00205B] dark:border-[#E5C678] dark:text-[#E5C678]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'queue'   && <InvoiceQueueTab />}
      {activeTab === 'credits' && <CreditMemosTab />}
    </div>
  )
}
