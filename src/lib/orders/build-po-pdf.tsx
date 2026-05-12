import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { Order, OrderSplitLoad, Vendor, CompanySettings } from '@/lib/db/schema'

const NAVY = '#00205B'
const GOLD = '#B88A44'
const WHITE = '#FFFFFF'
const PAGE_BG = '#ffffff'
const RED = '#CC0000'

type Address = {
  name?: string; street?: string; city?: string; state?: string
  zip?: string; phone?: string; shipping_notes?: string
}
type Props = {
  order: Order
  splitLoads: OrderSplitLoad[]
  vendor: Vendor | null
  companySetting: CompanySettings | null
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '--'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}
function fmtDateLong(d: string | null | undefined): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
function fmtCurrency(v: string | null | undefined): string {
  if (!v) return '--'
  const n = parseFloat(v)
  return isNaN(n) ? '--' : `$${n.toFixed(2)}`
}
function calcTotal(qty: string | null | undefined, buy: string | null | undefined): string {
  if (!qty || !buy) return '--'
  const q = parseFloat(qty), b = parseFloat(buy)
  return isNaN(q) || isNaN(b) ? '--' : `$${(q * b).toFixed(2)}`
}
function calcOrderTotal(loads: OrderSplitLoad[]): string {
  let total = 0
  for (const l of loads) {
    if (l.qty && l.buy) {
      const q = parseFloat(l.qty), b = parseFloat(l.buy)
      if (!isNaN(q) && !isNaN(b)) total += q * b
    }
  }
  return `$${total.toFixed(2)}`
}

const S = StyleSheet.create({
  page:         { backgroundColor: PAGE_BG, padding: 40, fontFamily: 'Helvetica' },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo:         { width: 160, height: 'auto' },
  headerRight:  { alignItems: 'flex-end' },
  revised:      { fontSize: 10, color: GOLD, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  poTitle:      { fontSize: 26, fontFamily: 'Helvetica-Bold', color: NAVY },
  orderNum:     { fontSize: 11, color: NAVY, marginTop: 2 },
  orderDate:    { fontSize: 10, color: NAVY, marginTop: 2 },
  hr:           { backgroundColor: GOLD, height: 1.5, marginVertical: 10 },
  grid:         { borderWidth: 1, borderColor: '#CCCCCC', borderStyle: 'solid' },
  row:          { flexDirection: 'row' },
  rowBorder:    { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#CCCCCC', borderTopStyle: 'solid' },
  cell:         { padding: 8, flex: 1 },
  cellR:        { padding: 8, flex: 1, borderLeftWidth: 1, borderLeftColor: '#CCCCCC', borderLeftStyle: 'solid' },
  lbl:          { fontSize: 7.5, color: GOLD, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, marginBottom: 3 },
  val:          { fontSize: 9.5, color: NAVY },
  valBold:      { fontSize: 9.5, color: NAVY, fontFamily: 'Helvetica-Bold' },
  valRed:       { fontSize: 9.5, color: RED, fontFamily: 'Helvetica-Bold' },
  blindText:    { fontSize: 9.5, color: GOLD, fontFamily: 'Helvetica-Bold' },
  tableWrap:    { marginTop: 16 },
  thead:        { flexDirection: 'row', backgroundColor: NAVY, padding: 6 },
  th:           { color: WHITE, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  trow:         { flexDirection: 'row', padding: 6, borderBottomWidth: 0.5, borderBottomColor: '#DDDDDD', borderBottomStyle: 'solid' },
  td:           { color: NAVY, fontSize: 9 },
  tdBold:       { color: NAVY, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  colDesc:      { flex: 5 },
  colQty:       { flex: 1 },
  colPrice:     { flex: 1.5 },
  colTotal:     { flex: 1.5, textAlign: 'right' },
  pn:           { color: GOLD, fontSize: 8, marginTop: 1 },
  totalRow:     { flexDirection: 'row', backgroundColor: '#F0EBE0', padding: 6 },
  totalLbl:     { flex: 7.5, color: NAVY, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  totalVal:     { flex: 1.5, color: NAVY, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  notesBox:     { borderWidth: 1, borderColor: '#CCCCCC', borderStyle: 'solid', padding: 10, marginTop: 10 },
  notesLbl:     { fontSize: 8, color: GOLD, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8 },
  notesText:    { fontSize: 9, color: NAVY, marginTop: 4 },
})

export function PurchaseOrderPDF({ order, splitLoads, vendor, companySetting }: Props) {
  const va = (vendor?.address ?? {}) as Address
  const st = (order.ship_to ?? {}) as Address
  const shipLabel = order.is_blind_shipment
    ? 'SHIP TO'
    : `SHIP TO${st.name ? ` \u2014 ${st.name.toUpperCase()}` : ''}`

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* Header */}
        <View style={S.headerRow}>
          <View>
            {companySetting?.logo_url
              ? <Image src={companySetting.logo_url} style={S.logo} />
              : <Text style={S.valBold}>{companySetting?.name ?? 'MPH United'}</Text>}
          </View>
          <View style={S.headerRight}>
            {order.is_revised && <Text style={S.revised}>▲ REVISED</Text>}
            <Text style={S.poTitle}>Purchase Order</Text>
            <Text style={S.orderNum}>{order.order_number}</Text>
            <Text style={S.orderDate}>{fmtDateLong(order.order_date)}</Text>
          </View>
        </View>

        <View style={S.hr} />

        {/* Info grid */}
        <View style={S.grid}>

          {/* Row 1: Vendor | Ship To */}
          <View style={S.row}>
            <View style={S.cell}>
              <Text style={S.lbl}>VENDOR</Text>
              <Text style={S.valBold}>MPH United{vendor?.name ? ` / ${vendor.name}` : ''}</Text>
              {!!va.street && <Text style={S.val}>{va.street}</Text>}
              {!!(va.city || va.state || va.zip) && (
                <Text style={S.val}>{[va.city, va.state, va.zip].filter(Boolean).join(', ')}</Text>
              )}
              {!!vendor?.lead_contact && <Text style={S.val}>{vendor.lead_contact}</Text>}
            </View>
            <View style={S.cellR}>
              <Text style={S.lbl}>{shipLabel}</Text>
              {order.is_blind_shipment
                ? <Text style={S.blindText}>** BLIND SHIPMENT **</Text>
                : <View>
                    {!!st.name && <Text style={S.valBold}>{st.name}</Text>}
                    {!!st.street && <Text style={S.val}>{st.street}</Text>}
                    {!!(st.city || st.state || st.zip) && (
                      <Text style={S.val}>{[st.city, st.state, st.zip].filter(Boolean).join(', ')}</Text>
                    )}
                    {!!st.phone && <Text style={S.val}>{st.phone}</Text>}
                    {!!st.shipping_notes && <Text style={S.val}>{st.shipping_notes}</Text>}
                  </View>
              }
            </View>
          </View>

          {/* Row 2: Customer PO | Required Ship Date */}
          <View style={S.rowBorder}>
            <View style={S.cell}>
              <Text style={S.lbl}>CUSTOMER PO #</Text>
              <Text style={S.val}>{splitLoads[0]?.customer_po ?? order.customer_po ?? '--'}</Text>
            </View>
            <View style={S.cellR}>
              <Text style={S.lbl}>REQUIRED SHIP DATE</Text>
              <Text style={S.valRed}>{fmtDate(order.ship_date)}</Text>
            </View>
          </View>

          {/* Row 3: Ship Via | Appt. Time */}
          <View style={S.rowBorder}>
            <View style={S.cell}>
              <Text style={S.lbl}>SHIP VIA</Text>
              <Text style={S.val}>{order.freight_carrier ?? '--'}</Text>
            </View>
            <View style={S.cellR}>
              <Text style={S.lbl}>APPT. TIME</Text>
              {order.appointment_time
                ? <View>
                    <Text style={S.val}>{new Date(order.appointment_time).toLocaleString('en-US')}</Text>
                    {!!order.appointment_notes && <Text style={S.val}>{order.appointment_notes}</Text>}
                  </View>
                : order.appointment_notes
                  ? <Text style={S.val}>{order.appointment_notes}</Text>
                  : <Text style={S.val}>--</Text>}
            </View>
          </View>

        </View>

        {/* Line items */}
        <View style={S.tableWrap}>
          <View style={S.thead}>
            <Text style={[S.th, S.colDesc]}>DESCRIPTION</Text>
            <Text style={[S.th, S.colQty]}>QTY</Text>
            <Text style={[S.th, S.colPrice]}>UNIT PRICE</Text>
            <Text style={[S.th, S.colTotal]}>TOTAL</Text>
          </View>
          {splitLoads.map((load, i) => (
            <View key={load.id} style={[S.trow, { backgroundColor: i % 2 === 0 ? WHITE : '#FAF5E8' }]}>
              <View style={S.colDesc}>
                {splitLoads.length > 1 && (
                  <Text style={S.tdBold}>SPLIT LOAD {i + 1}</Text>
                )}
                <Text style={S.td}>{load.description ?? ''}</Text>
                {!!load.part_number && <Text style={S.pn}>P/N: {load.part_number}</Text>}
              </View>
              <Text style={[S.td, S.colQty]}>{load.qty ?? '--'}</Text>
              <Text style={[S.td, S.colPrice]}>{fmtCurrency(load.buy)}</Text>
              <Text style={[S.td, S.colTotal]}>{calcTotal(load.qty, load.buy)}</Text>
            </View>
          ))}
          <View style={S.totalRow}>
            <Text style={S.totalLbl}>ORDER TOTAL</Text>
            <Text style={S.totalVal}>{calcOrderTotal(splitLoads)}</Text>
          </View>
        </View>

        {/* PO Notes */}
        {!!(order.po_notes && order.po_notes.trim()) && (
          <View style={S.notesBox}>
            <Text style={S.notesLbl}>SPECIAL INSTRUCTIONS</Text>
            <Text style={S.notesText}>{order.po_notes}</Text>
          </View>
        )}

      </Page>
    </Document>
  )
}
