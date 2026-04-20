'use client'

import { Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export type ChecklistItem = {
  label: string
  done: boolean
}

export function OrderChecklist({
  items,
  onChange,
}: {
  items: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
}) {
  function toggle(index: number) {
    onChange(items.map((item, i) => i === index ? { ...item, done: !item.done } : item))
  }

  function updateLabel(index: number, label: string) {
    onChange(items.map((item, i) => i === index ? { ...item, label } : item))
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  function add() {
    onChange([...items, { label: '', done: false }])
  }

  if (items.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">No checklist items.</p>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Step
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-3 rounded-md border px-3 py-2">
          <Switch
            id={`checklist-${index}`}
            checked={item.done}
            onCheckedChange={() => toggle(index)}
          />
          <Input
            value={item.label}
            onChange={e => updateLabel(index, e.target.value)}
            placeholder="Step description"
            className={item.done ? 'line-through text-muted-foreground' : ''}
          />
          <button
            type="button"
            onClick={() => remove(index)}
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Step
      </button>
    </div>
  )
}