import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { CreditMemo, CreditMemoLineItem, Customer, CompanySettings } from '@/lib/db/schema'

const NAVY  = '#00205B'
const GOLD  = '#B88A44'
const LIGHT = '#F5F5F5'

type Address = { street?: string; city?: string; state?: string; zip?: string }

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
  })
}

function fmtCurrency(v: string | number | null | undefined): string {
  if (v == null) return '—'
  const n = parseFloat(String(v))
  return isNaN(n) ? '—' : `$${n.toFixed(2)}`
}

const S = StyleSheet.create({
  page:       { backgroundColor: '#ffffff', padding: 40, fontFamily: 'Helvetica' },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo:       { width: 150, height: 'auto' },
  headerLeft: { flex: 1 },
  headerRight:{ alignItems: 'flex-end' },
  companyName:{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY },
  companyInfo:{ fontSize: 9, color: '#555', marginTop: 2, lineHeight: 1.4 },
  title:      { fontSize: 28, fontFamily: 'Helvetica-Bold', color: GOLD, marginTop: 4 },
  hr:         { backgroundColor: GOLD, height: 1.5, marginVertical: 10 },
  metaRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  block:      { flex: 1 },
  blockLabel: { fontSize: 8, color: '#888', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 3 },
  blockVal:   { fontSize: 10, color: '#222' },
  table:      { marginTop: 12 },
  thead:      { flexDirection: 'row', backgroundColor: NAVY, padding: '6 8', borderRadius: 2 },
  theadCell:  { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#fff' },
  trow:       { flexDirection: 'row', borderBottom: '1 solid #eee', padding: '5 8', minHeight: 24 },
  trowAlt:    { flexDirection: 'row', borderBottom: '1 solid #eee', padding: '5 8', minHeight: 24, backgroundColor: LIGHT },
  tdActivity: { width: '40%' },
  tdQty:      { width: '12%', textAlign: 'right' },
  tdRate:     { width: '18%', textAlign: 'right' },
  tdAmount:   { width: '18%', textAlign: 'right' },
  tdFill:     { width: '12%' },
  cellText:   { fontSize: 9, color: '#222' },
  cellMuted:  { fontSize: 8, color: '#555', marginTop: 1 },
  actBold:    { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#222' },
  totalRow:   { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  totalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, marginRight: 16 },
  totalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: NAVY },
})

type Props = {
  memo:           CreditMemo
  lineItems:      CreditMemoLineItem[]
  customer:       Customer | null
  companySetting: CompanySettings | null
}

export function CreditMemoPdf({ memo, lineItems, customer, companySetting }: Props) {
  const co     = companySetting
  const addr   = co?.address as Address | null
  const billTo = customer?.bill_to as Address | null

  const total = lineItems.reduce((sum, li) => {
    const v = parseFloat(String(li.amount ?? 0))
    return sum + (isNaN(v) ? 0 : v)
  }, 0)

  return (
    <Document>
      <Page size="LETTER" style={S.page}>
        {/* Header */}
        <View style={S.headerRow}>
          <View style={S.headerLeft}>
            <Text style={S.companyName}>{co?.name ?? 'MPH United'}</Text>
            {addr?.street && <Text style={S.companyInfo}>{addr.street}</Text>}
            {(addr?.city || addr?.state) && (
              <Text style={S.companyInfo}>{[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}</Text>
            )}
            {co?.phone && <Text style={S.companyInfo}>{co.phone}</Text>}
            {co?.email && <Text style={S.companyInfo}>{co.email}</Text>}
          </View>
          {co?.logo_url && (
            <View style={S.headerRight}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={co.logo_url} style={S.logo} />
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={S.title}>Credit Memo</Text>
        <View style={S.hr} />

        {/* Meta */}
        <View style={S.metaRow}>
          <View style={S.block}>
            <Text style={S.blockLabel}>Credit To</Text>
            {customer?.name && <Text style={S.blockVal}>{customer.name}</Text>}
            {billTo?.street && <Text style={S.blockVal}>{billTo.street}</Text>}
            {(billTo?.city || billTo?.state) && (
              <Text style={S.blockVal}>{[billTo.city, billTo.state, billTo.zip].filter(Boolean).join(', ')}</Text>
            )}
          </View>
          <View style={[S.block, { alignItems: 'flex-end' }]}>
            {memo.credit_number && (
              <>
                <Text style={S.blockLabel}>Credit #</Text>
                <Text style={S.blockVal}>{memo.credit_number}</Text>
              </>
            )}
            <Text style={[S.blockLabel, { marginTop: 6 }]}>Date</Text>
            <Text style={S.blockVal}>{fmtDate(memo.credit_date)}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={S.table}>
          <View style={S.thead}>
            <Text style={[S.theadCell, S.tdActivity]}>Activity</Text>
            <Text style={[S.theadCell, S.tdFill]} />
            <Text style={[S.theadCell, S.tdQty]}>QTY</Text>
            <Text style={[S.theadCell, S.tdRate]}>Rate</Text>
            <Text style={[S.theadCell, S.tdAmount]}>Amount</Text>
          </View>
          {lineItems.map((li, i) => (
            <View key={li.id} style={i % 2 === 0 ? S.trow : S.trowAlt}>
              <View style={S.tdActivity}>
                {li.activity_type && <Text style={S.actBold}>{li.activity_type}</Text>}
                {li.description   && <Text style={S.cellMuted}>{li.description}</Text>}
              </View>
              <View style={S.tdFill} />
              <Text style={[S.cellText, S.tdQty]}>{li.qty ?? '—'}</Text>
              <Text style={[S.cellText, S.tdRate]}>{fmtCurrency(li.rate)}</Text>
              <Text style={[S.cellText, S.tdAmount]}>{fmtCurrency(li.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={S.totalRow}>
          <Text style={S.totalLabel}>Total Credit</Text>
          <Text style={S.totalValue}>{fmtCurrency(total)}</Text>
        </View>

        {/* Notes */}
        {memo.notes && (
          <View style={{ marginTop: 20 }}>
            <Text style={S.blockLabel}>Notes</Text>
            <Text style={{ fontSize: 9, color: '#555', lineHeight: 1.5 }}>{memo.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
