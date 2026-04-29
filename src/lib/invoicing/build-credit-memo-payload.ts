import type { LineItemDraft } from '@/components/invoicing/credit-memo-line-items'

type FormData = {
  credit_number: string
  credit_date: string
  customer_id: string
  notes: string
  line_items: LineItemDraft[]
}

export function buildCreditMemoPayload(form: FormData) {
  return {
    credit_number: form.credit_number.trim() || null,
    credit_date:   form.credit_date,
    customer_id:   form.customer_id,
    notes:         form.notes.trim() || null,
    line_items: form.line_items.map((li, i) => ({
      activity_type: li.activity_type || null,
      description:   li.description || null,
      qty:    li.qty   ? parseFloat(li.qty)   : null,
      rate:   li.rate  ? parseFloat(li.rate)  : null,
      amount: li.amount ? parseFloat(li.amount) : null,
      sort_order: i,
    })),
  }
}
