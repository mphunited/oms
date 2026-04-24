'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type Option = { id: string; name: string }

export function OrderCombobox({ options, value, onChange, placeholder, disabled }: {
  options: Option[]; value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn('flex h-9 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50')} disabled={disabled}>
        {selected ? selected.name : <span className="text-muted-foreground">{placeholder}</span>}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="min-w-[var(--anchor-width)] p-0" side="bottom" align="start" sideOffset={4}>
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map(opt => (
                <CommandItem key={opt.id} value={opt.name} onSelect={() => { onChange(opt.id); setOpen(false) }}>
                  <Check className={cn('mr-2 h-4 w-4', value === opt.id ? 'opacity-100' : 'opacity-0')} />
                  {opt.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
