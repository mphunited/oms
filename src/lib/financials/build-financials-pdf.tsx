import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

const NAVY = '#00205B'
const GOLD = '#B88A44'
const LIGHT = '#F5F5F5'
const LOGO = 'https://oms-jade.vercel.app/mph-logo.png'

function fmtDate(d: string): string {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 })
}

const S = StyleSheet.create({
  page:       { backgroundColor: '#ffffff', padding: 36, fontFamily: 'Helvetica', fontSize: 9 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  logo:       { width: 120, height: 'auto' },
  headerRight:{ alignItems: 'flex-end' },
  companyName:{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY },
  dateRange:  { fontSize: 9, color: '#555', marginTop: 3 },
  title:      { fontSize: 20, fontFamily: 'Helvetica-Bold', color: GOLD, marginTop: 2 },
  hr:         { backgroundColor: GOLD, height: 1.5, marginVertical: 10 },
  sectionHdr: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 6, marginTop: 14 },
  subHdr:     { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 4, marginTop: 8 },
  note:       { fontSize: 8, color: '#888', fontStyle: 'italic', marginTop: 6 },
  row2col:    { flexDirection: 'row', gap: 16 },
  col:        { flex: 1 },
  thead:      { flexDirection: 'row', backgroundColor: NAVY, padding: '4 6', borderRadius: 2, marginBottom: 1 },
  theadCell:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' },
  trow:       { flexDirection: 'row', borderBottom: '0.5 solid #eee', padding: '3 6', minHeight: 16 },
  trowAlt:    { flexDirection: 'row', borderBottom: '0.5 solid #eee', padding: '3 6', minHeight: 16, backgroundColor: LIGHT },
  cellText:   { fontSize: 8, color: '#222' },
  w40:        { width: '40%' },
  w30:        { width: '30%' },
  w20:        { width: '20%' },
  w15:        { width: '15%' },
  w10:        { width: '10%' },
  w25:        { width: '25%' },
  w35:        { width: '35%' },
  right:      { textAlign: 'right' },
  cardRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  card:       { border: '0.5 solid #ddd', borderRadius: 4, padding: '6 8', minWidth: 90 },
  cardLabel:  { fontSize: 7, color: '#888', marginBottom: 2 },
  cardVal:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: NAVY },
  cardSub:    { fontSize: 7, color: '#555' },
  footer:     { position: 'absolute', bottom: 20, left: 36, right: 36 },
  footerText: { fontSize: 7, color: '#aaa', textAlign: 'center' },
})

type ProductRow = { orderType: string; totalQty: number; totalShipments: number }
type VendorRow  = { vendorName: string; orderType: string; totalQty: number; totalShipments: number }
type RecyclingRow = { vendorName: string; totalQty: number; totalOrders: number }

type Props = {
  startDate: string
  endDate: string
  productTotals: ProductRow[]
  vendorTotals: VendorRow[]
  ibcTotals: RecyclingRow[]
  drumTotals: RecyclingRow[]
}

function aggregateCards(productTotals: ProductRow[]) {
  const sumTypes = (types: string[]) => {
    const set = new Set(types)
    const matching = productTotals.filter(r => set.has(r.orderType))
    return { qty: matching.reduce((a, r) => a + r.totalQty, 0), shipments: matching.reduce((a, r) => a + r.totalShipments, 0) }
  }
  const sumContains = (fragment: string) => {
    const matching = productTotals.filter(r => r.orderType.includes(fragment))
    return { qty: matching.reduce((a, r) => a + r.totalQty, 0), shipments: matching.reduce((a, r) => a + r.totalShipments, 0) }
  }
  return [
    { label: 'New Poly Drums', ...sumTypes(['55 Gal New OH Poly Drum', '55 Gal New TH Poly Drum']) },
    { label: 'Washout Drums',  ...sumTypes(['55 Gal Washout OH Poly Drum', '55 Gal Washout TH Poly Drum']) },
    { label: 'Steel Drums',    ...sumTypes(['55 Gal New OH Steel Drum', '55 Gal New TH Steel Drum']) },
    { label: 'All Drums',      ...sumTypes(['55 Gal New OH Poly Drum','55 Gal New TH Poly Drum','55 Gal Washout OH Poly Drum','55 Gal Washout TH Poly Drum','55 Gal New OH Steel Drum','55 Gal New TH Steel Drum']) },
    { label: '275 Gal IBCs',   ...sumContains('275 Gal') },
    { label: '330 Gal IBCs',   ...sumContains('330 Gal') },
    { label: '135 Gal IBCs',   ...sumContains('135 Gal') },
  ]
}

export function ProductTotalsPdf({ startDate, endDate, productTotals, vendorTotals, ibcTotals, drumTotals }: Props) {
  const cards = aggregateCards(productTotals)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>
        {/* Header */}
        <View style={S.header}>
          <View>
            <Image style={S.logo} src={LOGO} />
          </View>
          <View style={S.headerRight}>
            <Text style={S.companyName}>MPH United</Text>
            <Text style={S.title}>Product Totals Report</Text>
            <Text style={S.dateRange}>
              {fmtDate(startDate)} — {fmtDate(endDate)}
            </Text>
          </View>
        </View>
        <View style={S.hr} />

        {/* Aggregate Cards */}
        <Text style={S.sectionHdr}>Aggregate Summary</Text>
        <View style={S.cardRow}>
          {cards.map(c => (
            <View key={c.label} style={S.card}>
              <Text style={S.cardLabel}>{c.label}</Text>
              <Text style={S.cardVal}>{fmtNum(c.qty)}</Text>
              <Text style={S.cardSub}>{c.shipments} shipments</Text>
            </View>
          ))}
        </View>

        {/* Product Totals (2 columns) */}
        <Text style={S.sectionHdr}>Product Totals (regular orders)</Text>
        <View style={S.row2col}>
          {/* Left: by product */}
          <View style={S.col}>
            <Text style={S.subHdr}>By product</Text>
            <View style={S.thead}>
              <Text style={[S.theadCell, S.w40]}>Product</Text>
              <Text style={[S.theadCell, S.w30, S.right]}>Total QTY</Text>
              <Text style={[S.theadCell, S.w30, S.right]}>Shipments</Text>
            </View>
            {productTotals.map((r, i) => (
              <View key={r.orderType} style={i % 2 === 0 ? S.trow : S.trowAlt}>
                <Text style={[S.cellText, S.w40]}>{r.orderType}</Text>
                <Text style={[S.cellText, S.w30, S.right]}>{fmtNum(r.totalQty)}</Text>
                <Text style={[S.cellText, S.w30, S.right]}>{r.totalShipments}</Text>
              </View>
            ))}
          </View>

          {/* Right: by vendor + product */}
          <View style={S.col}>
            <Text style={S.subHdr}>By vendor and product</Text>
            <View style={S.thead}>
              <Text style={[S.theadCell, S.w25]}>Vendor</Text>
              <Text style={[S.theadCell, S.w35]}>Product</Text>
              <Text style={[S.theadCell, S.w20, S.right]}>QTY</Text>
              <Text style={[S.theadCell, S.w20, S.right]}>Ships</Text>
            </View>
            {vendorTotals.map((r, i) => (
              <View key={`${r.vendorName}-${r.orderType}`} style={i % 2 === 0 ? S.trow : S.trowAlt}>
                <Text style={[S.cellText, S.w25]}>{r.vendorName}</Text>
                <Text style={[S.cellText, S.w35]}>{r.orderType}</Text>
                <Text style={[S.cellText, S.w20, S.right]}>{fmtNum(r.totalQty)}</Text>
                <Text style={[S.cellText, S.w20, S.right]}>{r.totalShipments}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={S.footer}>
          <Text style={S.footerText}>
            Recycling totals are not included in Product Totals above. Generated {new Date().toLocaleDateString('en-US')}.
          </Text>
        </View>
      </Page>

      {/* Page 2: Recycling Totals */}
      <Page size="A4" orientation="landscape" style={S.page}>
        <Text style={S.sectionHdr}>Recycling Orders</Text>
        <Text style={S.note}>Recycling totals are not included in Product Totals above.</Text>
        <View style={S.row2col}>
          <View style={S.col}>
            <Text style={S.subHdr}>IBC recycling</Text>
            <View style={S.thead}>
              <Text style={[S.theadCell, S.w40]}>Vendor</Text>
              <Text style={[S.theadCell, S.w30, S.right]}>Total QTY</Text>
              <Text style={[S.theadCell, S.w30, S.right]}>Orders</Text>
            </View>
            {ibcTotals.map((r, i) => (
              <View key={r.vendorName} style={i % 2 === 0 ? S.trow : S.trowAlt}>
                <Text style={[S.cellText, S.w40]}>{r.vendorName}</Text>
                <Text style={[S.cellText, S.w30, S.right]}>{fmtNum(r.totalQty)}</Text>
                <Text style={[S.cellText, S.w30, S.right]}>{r.totalOrders}</Text>
              </View>
            ))}
            {ibcTotals.length === 0 && (
              <View style={S.trow}><Text style={S.cellText}>No IBC recycling orders in range</Text></View>
            )}
          </View>
          <View style={S.col}>
            <Text style={S.subHdr}>Drum recycling</Text>
            <View style={S.thead}>
              <Text style={[S.theadCell, S.w40]}>Vendor</Text>
              <Text style={[S.theadCell, S.w30, S.right]}>Total QTY</Text>
              <Text style={[S.theadCell, S.w30, S.right]}>Orders</Text>
            </View>
            {drumTotals.map((r, i) => (
              <View key={r.vendorName} style={i % 2 === 0 ? S.trow : S.trowAlt}>
                <Text style={[S.cellText, S.w40]}>{r.vendorName}</Text>
                <Text style={[S.cellText, S.w30, S.right]}>{fmtNum(r.totalQty)}</Text>
                <Text style={[S.cellText, S.w30, S.right]}>{r.totalOrders}</Text>
              </View>
            ))}
            {drumTotals.length === 0 && (
              <View style={S.trow}><Text style={S.cellText}>No drum recycling orders in range</Text></View>
            )}
          </View>
        </View>

        <View style={S.footer}>
          <Text style={S.footerText}>
            Recycling totals are not included in Product Totals above. Generated {new Date().toLocaleDateString('en-US')}.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
