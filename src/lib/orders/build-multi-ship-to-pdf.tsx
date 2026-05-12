import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { CompanySettings } from '@/lib/db/schema'

const NAVY = '#00205B'
const GOLD = '#B88A44'
const WHITE = '#FFFFFF'
const RED = '#CC0000'

type Address = {
  name?: string; street?: string; city?: string; state?: string
  zip?: string; phone?: string; shipping_notes?: string
}

type SplitLoad = {
  id: string
  description: string | null
  part_number: string | null
  qty: string | null
  buy: string | null
  customer_po?: string | null
}

export type MultiShipToOrder = {
  id: string
  order_number: string
  customer_name: string | null
  customer_po: string | null
  ship_date: string | null
  appointment_time: string | null
  appointment_notes: string | null
  po_notes: string | null
  freight_carrier: string | null
  ship_to: Address | null
  split_loads: SplitLoad[]
}

export type MultiShipToGroup = {
  group_po_number: string
}

type VendorAddress = {
  street?: string; city?: string; state?: string; zip?: string
}

export type MultiShipToVendor = {
  name: string
  address: VendorAddress | null
  lead_contact: string | null
}

type Props = {
  group: MultiShipToGroup
  orders: MultiShipToOrder[]
  vendor: MultiShipToVendor | null
  companySetting: CompanySettings | null
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '--'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
  })
}

function fmtDateLong(d: string | null | undefined): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function fmtCurrency(v: string | null | undefined, unit = false): string {
  if (!v) return '--'
  const n = parseFloat(v)
  if (isNaN(n)) return '--'
  if (unit) {
    const s = n.toFixed(3)
    return `$${s.endsWith('0') ? n.toFixed(2) : s}`
  }
  return `$${n.toFixed(2)}`
}

function calcTotal(qty: string | null, buy: string | null): string {
  if (!qty || !buy) return '--'
  const q = parseFloat(qty), b = parseFloat(buy)
  return isNaN(q) || isNaN(b) ? '--' : `$${(q * b).toFixed(2)}`
}

function calcGrandTotal(allOrders: MultiShipToOrder[]): string {
  let total = 0
  for (const o of allOrders) {
    for (const l of o.split_loads) {
      if (l.qty && l.buy) {
        const q = parseFloat(l.qty), b = parseFloat(l.buy)
        if (!isNaN(q) && !isNaN(b)) total += q * b
      }
    }
  }
  return `$${total.toFixed(2)}`
}

const S = StyleSheet.create({
  page:        { backgroundColor: '#ffffff', padding: 40, fontFamily: 'Helvetica' },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo:        { width: 160, height: 'auto' },
  headerRight: { alignItems: 'flex-end' },
  poTitle:     { fontSize: 22, fontFamily: 'Helvetica-Bold', color: NAVY },
  poSubtitle:  { fontSize: 10, color: GOLD, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  orderNum:    { fontSize: 11, color: NAVY, marginTop: 2 },
  orderDate:   { fontSize: 10, color: NAVY, marginTop: 2 },
  hr:          { backgroundColor: GOLD, height: 1.5, marginVertical: 10 },

  infoGrid:    { borderWidth: 1, borderColor: '#CCCCCC', borderStyle: 'solid', marginBottom: 14 },
  row:         { flexDirection: 'row' },
  rowBorder:   { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#CCCCCC', borderTopStyle: 'solid' },
  cell:        { padding: 8, flex: 1 },
  cellR:       { padding: 8, flex: 1, borderLeftWidth: 1, borderLeftColor: '#CCCCCC', borderLeftStyle: 'solid' },
  lbl:         { fontSize: 7.5, color: GOLD, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, marginBottom: 3 },
  val:         { fontSize: 9.5, color: NAVY },
  valBold:     { fontSize: 9.5, color: NAVY, fontFamily: 'Helvetica-Bold' },
  valRed:      { fontSize: 9.5, color: RED, fontFamily: 'Helvetica-Bold' },

  dropHeader:  { backgroundColor: NAVY, padding: 8, flexDirection: 'row', alignItems: 'center' },
  dropLabel:   { color: WHITE, fontSize: 9.5, fontFamily: 'Helvetica-Bold', flex: 1 },
  dropSection: { borderWidth: 1, borderColor: '#CCCCCC', borderStyle: 'solid', marginBottom: 10 },

  dropInfoRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#CCCCCC', borderTopStyle: 'solid' },
  dropCell:    { padding: 8, flex: 1 },
  dropCellR:   { padding: 8, flex: 1, borderLeftWidth: 1, borderLeftColor: '#CCCCCC', borderLeftStyle: 'solid' },

  thead:       { flexDirection: 'row', backgroundColor: '#E8EFF8', padding: 5 },
  th:          { color: NAVY, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  trow:        { flexDirection: 'row', padding: 5, borderTopWidth: 0.5, borderTopColor: '#DDDDDD', borderTopStyle: 'solid' },
  td:          { color: NAVY, fontSize: 8.5 },
  tdBold:      { color: NAVY, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  pn:          { color: GOLD, fontSize: 7.5, marginTop: 1 },
  colDesc:     { flex: 5 },
  colQty:      { flex: 1 },
  colPrice:    { flex: 1.5 },
  colTotal:    { flex: 1.5, textAlign: 'right' },

  totalBox:    { backgroundColor: '#F0EBE0', padding: 8, flexDirection: 'row', gap: 16 },
  totalLbl:    { fontSize: 9.5, color: NAVY, fontFamily: 'Helvetica-Bold' },
})

export function MultiShipToPDF({ group, orders, vendor, companySetting }: Props) {
  const va = (vendor?.address ?? {}) as VendorAddress
  const firstOrder = orders[0]

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
            <Text style={S.poSubtitle}>MULTI SHIP-TO SPLIT LOAD</Text>
            <Text style={S.orderNum}>{group.group_po_number}</Text>
            <Text style={S.orderDate}>{fmtDateLong(firstOrder?.ship_date)}</Text>
          </View>
        </View>

        <View style={S.hr} />

        {/* Info grid: Vendor | Ship Via | Required Ship Date */}
        <View style={S.infoGrid}>
          <View style={S.row}>
            <View style={S.cell}>
              <Text style={S.lbl}>VENDOR</Text>
              <Text style={S.valBold}>{vendor?.name ?? 'Unknown Vendor'}</Text>
              {!!va.street && <Text style={S.val}>{va.street}</Text>}
              {!!(va.city || va.state || va.zip) && (
                <Text style={S.val}>{[va.city, va.state, va.zip].filter(Boolean).join(', ')}</Text>
              )}
              {!!vendor?.lead_contact && <Text style={S.val}>{vendor.lead_contact}</Text>}
            </View>
            <View style={S.cellR}>
              <Text style={S.lbl}>SHIP VIA</Text>
              <Text style={S.val}>{firstOrder?.freight_carrier ?? '--'}</Text>
            </View>
            <View style={S.cellR}>
              <Text style={S.lbl}>REQUIRED SHIP DATE</Text>
              <Text style={S.valRed}>{fmtDate(firstOrder?.ship_date)}</Text>
            </View>
          </View>
        </View>

        {/* One section per order (drop) */}
        {orders.map((order, dropIndex) => {
          const st = (order.ship_to ?? {}) as Address
          const dropNum = dropIndex + 1
          return (
            <View key={order.id} style={S.dropSection}>
              {/* Drop header */}
              <View style={S.dropHeader}>
                <Text style={S.dropLabel}>
                  SPLIT LOAD {dropNum} — DROP {dropNum}{order.customer_name ? ` — ${order.customer_name.toUpperCase()}` : ''}
                </Text>
              </View>

              {/* Customer PO | Ship Date | Appt */}
              <View style={S.dropInfoRow}>
                <View style={S.dropCell}>
                  <Text style={S.lbl}>CUSTOMER PO #</Text>
                  <Text style={S.val}>{order.split_loads[0]?.customer_po ?? order.customer_po ?? '--'}</Text>
                </View>
                <View style={S.dropCellR}>
                  <Text style={S.lbl}>SHIP DATE</Text>
                  <Text style={S.valRed}>{fmtDate(order.ship_date)}</Text>
                </View>
                <View style={S.dropCellR}>
                  <Text style={S.lbl}>APPT. TIME</Text>
                  <Text style={S.val}>
                    {order.appointment_time
                      ? new Date(order.appointment_time).toLocaleString('en-US')
                      : order.appointment_notes ?? '--'}
                  </Text>
                </View>
              </View>

              {/* Product table */}
              <View style={{ padding: 8 }}>
                <View style={S.thead}>
                  <Text style={[S.th, S.colDesc]}>DESCRIPTION</Text>
                  <Text style={[S.th, S.colQty]}>QTY</Text>
                  <Text style={[S.th, S.colPrice]}>UNIT PRICE</Text>
                  <Text style={[S.th, S.colTotal]}>TOTAL</Text>
                </View>
                {order.split_loads.map((load, i) => (
                  <View key={load.id} style={[S.trow, { backgroundColor: i % 2 === 0 ? WHITE : '#FAF5E8' }]}>
                    <View style={S.colDesc}>
                      <Text style={S.td}>{load.description ?? ''}</Text>
                      {!!load.part_number && <Text style={S.pn}>P/N: {load.part_number}</Text>}
                    </View>
                    <Text style={[S.td, S.colQty]}>{load.qty ?? '--'}</Text>
                    <Text style={[S.td, S.colPrice]}>{fmtCurrency(load.buy, true)}</Text>
                    <Text style={[S.td, S.colTotal]}>{calcTotal(load.qty, load.buy)}</Text>
                  </View>
                ))}
              </View>

              {/* Ship To + PO Notes */}
              <View style={[S.dropInfoRow, { borderTopWidth: 1, borderTopColor: '#CCCCCC', borderTopStyle: 'solid' }]}>
                <View style={S.dropCell}>
                  <Text style={S.lbl}>SHIP TO</Text>
                  {!!st.name && <Text style={S.valBold}>{st.name}</Text>}
                  {!!st.street && <Text style={S.val}>{st.street}</Text>}
                  {!!(st.city || st.state || st.zip) && (
                    <Text style={S.val}>{[st.city, st.state, st.zip].filter(Boolean).join(', ')}</Text>
                  )}
                  {!!st.phone && <Text style={S.val}>{st.phone}</Text>}
                </View>
                {!!(order.po_notes && order.po_notes.trim()) && (
                  <View style={S.dropCellR}>
                    <Text style={S.lbl}>PO NOTES</Text>
                    <Text style={S.val}>{order.po_notes}</Text>
                  </View>
                )}
              </View>
            </View>
          )
        })}

        {/* Footer totals */}
        <View style={S.totalBox}>
          <Text style={S.totalLbl}>{orders.length} DESTINATIONS</Text>
          <Text style={S.totalLbl}>ORDER TOTAL: {calcGrandTotal(orders)}</Text>
        </View>

      </Page>
    </Document>
  )
}
