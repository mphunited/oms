import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { CompanySettings } from '@/lib/db/schema'

const NAVY  = '#00205B'
const GOLD  = '#B88A44'
const WHITE = '#FFFFFF'
const PAGE_BG = '#ffffff'

type Address = { name?: string; street?: string; city?: string; state?: string; zip?: string }

export type RecyclingOrderForPdf = {
  order_number:      string
  order_date:        string | null
  customer_po:       string | null
  recycling_type:    string
  description:       string | null
  part_number:       string | null
  qty:               string | null
  buy:               string | null
  freight_carrier:   string | null
  pick_up_date:      string | null
  po_notes:          string | null
  is_blind_shipment: boolean
}

export type RecyclingCustomerForPdf = {
  name:    string
  bill_to: unknown
  ship_to: unknown
}

export type RecyclingVendorForPdf = {
  name:    string
  address: unknown
}

type Props = {
  order:           RecyclingOrderForPdf
  customer:        RecyclingCustomerForPdf
  vendor:          RecyclingVendorForPdf | null
  companySetting:  CompanySettings | null
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
function calcAmount(qty: string | null | undefined, buy: string | null | undefined): string {
  if (!qty || !buy) return '--'
  const q = parseFloat(qty), b = parseFloat(buy)
  return isNaN(q) || isNaN(b) ? '--' : `$${(q * b).toFixed(2)}`
}

const S = StyleSheet.create({
  page:      { backgroundColor: PAGE_BG, padding: 40, fontFamily: 'Helvetica' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo:      { width: 160, height: 'auto' },
  headerRight: { alignItems: 'flex-end' },
  poTitle:   { fontSize: 26, fontFamily: 'Helvetica-Bold', color: NAVY },
  orderNum:  { fontSize: 11, color: NAVY, marginTop: 2 },
  orderDate: { fontSize: 10, color: NAVY, marginTop: 2 },
  hr:        { backgroundColor: GOLD, height: 1.5, marginVertical: 10 },
  grid:      { borderWidth: 1, borderColor: '#CCCCCC', borderStyle: 'solid' },
  row:       { flexDirection: 'row' },
  rowBorder: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#CCCCCC', borderTopStyle: 'solid' },
  cell:      { padding: 8, flex: 1 },
  cellR:     { padding: 8, flex: 1, borderLeftWidth: 1, borderLeftColor: '#CCCCCC', borderLeftStyle: 'solid' },
  lbl:       { fontSize: 7.5, color: GOLD, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, marginBottom: 3 },
  val:       { fontSize: 9.5, color: NAVY },
  valBold:   { fontSize: 9.5, color: NAVY, fontFamily: 'Helvetica-Bold' },
  blindText: { fontSize: 9.5, color: GOLD, fontFamily: 'Helvetica-Bold' },
  tableWrap: { marginTop: 16 },
  thead:     { flexDirection: 'row', backgroundColor: NAVY, padding: 6 },
  th:        { color: WHITE, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  trow:      { flexDirection: 'row', padding: 6, borderBottomWidth: 0.5, borderBottomColor: '#DDDDDD', borderBottomStyle: 'solid', backgroundColor: WHITE },
  td:        { color: NAVY, fontSize: 9 },
  tdGold:    { color: GOLD, fontSize: 8, marginTop: 1 },
  col1:      { flex: 1.2, textAlign: 'center' },
  col2:      { flex: 3 },
  col3:      { flex: 4 },
  col4:      { flex: 1.2, textAlign: 'right' },
  col5:      { flex: 1.5, textAlign: 'right' },
  col6:      { flex: 1.5, textAlign: 'right' },
  totalRow:  { flexDirection: 'row', backgroundColor: '#F0EBE0', padding: 6 },
  totalLbl:  { flex: 9.9, color: NAVY, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  totalVal:  { flex: 1.5, color: NAVY, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  notesBox:  { borderWidth: 1, borderColor: '#CCCCCC', borderStyle: 'solid', padding: 10, marginTop: 10 },
  notesLbl:  { fontSize: 8, color: GOLD, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8 },
  notesText: { fontSize: 9, color: NAVY, marginTop: 4 },
  sigRow:    { flexDirection: 'row', marginTop: 24, gap: 32 },
  sigBlock:  { flex: 1 },
  sigLine:   { borderBottomWidth: 1, borderBottomColor: '#CCCCCC', borderBottomStyle: 'solid', height: 24 },
  sigLbl:    { fontSize: 7.5, color: GOLD, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, marginTop: 3 },
})

export function RecyclingPurchaseOrderPDF({ order, customer, vendor, companySetting }: Props) {
  const customerAddr = ((order.is_blind_shipment ? customer.bill_to ?? customer.ship_to : customer.bill_to ?? customer.ship_to) ?? {}) as Address
  const vendorAddr   = (vendor?.address ?? {}) as Address

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* Header */}
        <View style={S.headerRow}>
          <View>
            {companySetting?.logo_url
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={companySetting.logo_url} style={S.logo} />
              : <Text style={S.valBold}>{companySetting?.name ?? 'MPH United'}</Text>}
          </View>
          <View style={S.headerRight}>
            <Text style={S.poTitle}>Purchase Order</Text>
            <Text style={S.orderNum}>{order.order_number}</Text>
            <Text style={S.orderDate}>{fmtDateLong(order.order_date)}</Text>
          </View>
        </View>

        <View style={S.hr} />

        {/* Info grid */}
        <View style={S.grid}>

          {/* Row 1: Vendor (= customer company providing IBCs) | Ship To (= vendor processing facility) */}
          <View style={S.row}>
            <View style={S.cell}>
              <Text style={S.lbl}>VENDOR</Text>
              <Text style={S.valBold}>{customer.name}</Text>
              {!!(customerAddr.street) && <Text style={S.val}>{customerAddr.street}</Text>}
              {!!(customerAddr.city || customerAddr.state || customerAddr.zip) && (
                <Text style={S.val}>{[customerAddr.city, customerAddr.state, customerAddr.zip].filter(Boolean).join(', ')}</Text>
              )}
            </View>
            <View style={S.cellR}>
              <Text style={S.lbl}>SHIP TO</Text>
              {order.is_blind_shipment
                ? <Text style={S.blindText}>CPU</Text>
                : vendor
                  ? <View>
                      <Text style={S.valBold}>{vendor.name}</Text>
                      {!!(vendorAddr.street) && <Text style={S.val}>{vendorAddr.street}</Text>}
                      {!!(vendorAddr.city || vendorAddr.state || vendorAddr.zip) && (
                        <Text style={S.val}>{[vendorAddr.city, vendorAddr.state, vendorAddr.zip].filter(Boolean).join(', ')}</Text>
                      )}
                    </View>
                  : <Text style={S.val}>--</Text>}
            </View>
          </View>

          {/* Row 2: PO Number | PO Date */}
          <View style={S.rowBorder}>
            <View style={S.cell}>
              <Text style={S.lbl}>PO NUMBER</Text>
              <Text style={S.val}>{order.order_number}</Text>
            </View>
            <View style={S.cellR}>
              <Text style={S.lbl}>PO DATE</Text>
              <Text style={S.val}>{fmtDate(order.order_date)}</Text>
            </View>
          </View>

          {/* Row 3: Ship Via | Customer PO */}
          <View style={S.rowBorder}>
            <View style={S.cell}>
              <Text style={S.lbl}>SHIP VIA</Text>
              <Text style={S.val}>{order.freight_carrier ?? '--'}</Text>
            </View>
            <View style={S.cellR}>
              <Text style={S.lbl}>CUSTOMER PO #</Text>
              <Text style={S.val}>{order.customer_po ?? '--'}</Text>
            </View>
          </View>

        </View>

        {/* Line items table */}
        <View style={S.tableWrap}>
          <View style={S.thead}>
            <Text style={[S.th, S.col1]}>#</Text>
            <Text style={[S.th, S.col2]}>PRODUCT OR SERVICE</Text>
            <Text style={[S.th, S.col3]}>DESCRIPTION</Text>
            <Text style={[S.th, S.col4]}>QTY</Text>
            <Text style={[S.th, S.col5]}>RATE</Text>
            <Text style={[S.th, S.col6]}>AMOUNT</Text>
          </View>
          <View style={S.trow}>
            <Text style={[S.td, S.col1]}>1</Text>
            <View style={S.col2}>
              {order.part_number
                ? <Text style={S.tdGold}>{order.part_number}</Text>
                : <Text style={S.td} />}
            </View>
            <Text style={[S.td, S.col3]}>{order.description ?? ''}</Text>
            <Text style={[S.td, S.col4]}>{order.qty ?? '--'}</Text>
            <Text style={[S.td, S.col5]}>{fmtCurrency(order.buy)}</Text>
            <Text style={[S.td, S.col6]}>{calcAmount(order.qty, order.buy)}</Text>
          </View>
          <View style={S.totalRow}>
            <Text style={S.totalLbl}>TOTAL</Text>
            <Text style={S.totalVal}>{calcAmount(order.qty, order.buy)}</Text>
          </View>
        </View>

        {/* Notes */}
        {!!(order.po_notes && order.po_notes.trim()) && (
          <View style={S.notesBox}>
            <Text style={S.notesLbl}>NOTES</Text>
            <Text style={S.notesText}>{order.po_notes}</Text>
          </View>
        )}


      </Page>
    </Document>
  )
}
