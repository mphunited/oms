'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

type Option = { value: string; label: string }

type Props = {
  label: string
  options: Option[]
  selected: string[]
  onChange: (values: string[]) => void
}

export function FilterMultiSelect({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }

  const active = selected.length > 0
  const displayLabel = active ? `${label} (${selected.length})` : label

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
          active
            ? 'border-[#00205B] bg-[#00205B] text-white'
            : 'border-border bg-background text-foreground hover:bg-muted'
        }`}
      >
        {displayLabel}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-64 min-w-[220px] overflow-y-auto rounded-md border bg-popover shadow-md">
          {options.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No options</p>
          )}
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                selected.includes(opt.value)
                  ? 'border-[#00205B] bg-[#00205B]'
                  : 'border-border bg-background'
              }`}>
                {selected.includes(opt.value) && <Check className="h-3 w-3 text-white" />}
              </span>
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
