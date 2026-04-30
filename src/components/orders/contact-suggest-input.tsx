'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

export type ContactSuggestion = { name: string; email: string; company?: string | null }

type Props = {
  value: string
  onChange: (value: string) => void
  onSelectSuggestion: (s: ContactSuggestion) => void
  suggestions: ContactSuggestion[]
  placeholder?: string
  type?: 'text' | 'email'
  className?: string
}

export function ContactSuggestInput({ value, onChange, onSelectSuggestion, suggestions, placeholder, type = 'text', className }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const showAll = (!value || value.length === 0) && suggestions.length <= 20
  const filtered = showAll
    ? suggestions
    : value.length >= 2
      ? suggestions.filter(s => {
          const q = value.toLowerCase()
          return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
        })
      : []

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Input
        type={type}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
          {filtered.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              onMouseDown={e => { e.preventDefault(); onSelectSuggestion(s); setOpen(false) }}
            >
              <div className="font-medium">{s.name}</div>
              {s.company && <div className="text-xs text-muted-foreground">{s.company}</div>}
              <div className="text-xs text-muted-foreground">{s.email}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
