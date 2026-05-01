import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { Order, OrderSplitLoad, Vendor, CompanySettings } from '@/lib/db/schema'

const NAVY = '#00205B', GOLD = '#B88A44', WHITE = '#FFFFFF'
const LIGHT_GRAY = '#F5F5F5', BORDER = '#CCCCCC'

type Addr = { name?:string; street?:string; street2?:string; city?:string; state?:string; zip?:string; phone?:string; phone_office?:string; phone_cell?:string; email?:string; email2?:string; shipping_notes?:string }
type Props = { order:Order; splitLoads:OrderSplitLoad[]; vendor:Vendor|null; companySetting:CompanySettings|null; weightMap:Record<string,number> }

export function bolDescription(description: string | null): string {
  if (!description) return ''
  const stripped = description.replace(/^SPLIT LOAD \d+ — /i, '').trim()
  return stripped.split('|')[0].trim()
}
function fmtDate(d:string|null|undefined):string {
  if (!d) return ''
  return new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})
}
function fmtQty(v:string|null|undefined):string {
  if (!v) return '--'
  const n = parseFloat(v)
  return isNaN(n) ? '--' : String(Math.round(n))
}

const S = StyleSheet.create({
  page:    {backgroundColor:WHITE,padding:36,fontFamily:'Helvetica'},
  hRow:    {flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  logo:    {width:140},
  hTitle:  {fontSize:20,fontFamily:'Helvetica-Bold',color:NAVY},
  hDate:   {fontSize:9,color:NAVY,textAlign:'right'},
  hr:      {backgroundColor:GOLD,height:1.5,marginVertical:8},
  row:     {flexDirection:'row'},
  lbl:     {fontSize:7.5,color:GOLD,fontFamily:'Helvetica-Bold',letterSpacing:0.8,marginBottom:3},
  val:     {fontSize:9.5,color:NAVY},
  vBold:   {fontSize:9.5,color:NAVY,fontFamily:'Helvetica-Bold'},
  // info grid cells
  cL:      {flex:1,borderWidth:1,borderColor:BORDER,borderStyle:'solid',padding:8},
  cR:      {flex:1,borderWidth:1,borderColor:BORDER,borderStyle:'solid',borderLeftWidth:0,padding:0},
  cL2:     {flex:1,borderWidth:1,borderColor:BORDER,borderStyle:'solid',borderTopWidth:0,padding:8},
  cR2:     {flex:1,borderWidth:1,borderColor:BORDER,borderStyle:'solid',borderLeftWidth:0,borderTopWidth:0,padding:0},
  sub:     {padding:8},
  subB:    {padding:8,borderTopWidth:1,borderTopColor:BORDER,borderTopStyle:'solid'},
  noteRow: {flexDirection:'row',borderWidth:1,borderColor:BORDER,borderStyle:'solid',borderTopWidth:0,padding:8},
  noteL:   {flex:1},
  noteR:   {flex:1,alignItems:'flex-end'},
  secLbl:  {fontSize:8,color:GOLD,fontFamily:'Helvetica-Bold',letterSpacing:0.8,marginTop:12,marginBottom:4},
  th:      {flexDirection:'row',backgroundColor:NAVY,padding:5},
  thTxt:   {color:WHITE,fontSize:8,fontFamily:'Helvetica-Bold'},
  tr:      {flexDirection:'row',padding:5,borderBottomWidth:0.5,borderBottomColor:BORDER,borderBottomStyle:'solid'},
  td:      {color:NAVY,fontSize:8.5},
  totRow:  {flexDirection:'row',backgroundColor:LIGHT_GRAY,padding:5},
  totLbl:  {flex:5,color:NAVY,fontSize:8.5,fontFamily:'Helvetica-Bold'},
  totRest: {flex:3.5},
  cthRow:  {flexDirection:'row',backgroundColor:NAVY,padding:4},
  cthTxt:  {color:WHITE,fontSize:7,fontFamily:'Helvetica-Bold'},
  ctr:     {flexDirection:'row',padding:4,borderBottomWidth:0.5,borderBottomColor:BORDER,borderBottomStyle:'solid',minHeight:16},
  ctd:     {color:NAVY,fontSize:7.5},
  legal:   {fontSize:6.5,color:'#666666',padding:6},
  notice:  {borderWidth:0.5,borderColor:BORDER,borderStyle:'solid',marginTop:6,padding:4},
  noticeTx:{fontSize:6.5,color:'#666666'},
  sigRow:  {flexDirection:'row',marginTop:8},
  sigC:    {flex:1,borderWidth:1,borderColor:BORDER,borderStyle:'solid',padding:8},
  sigCR:   {flex:1,borderWidth:1,borderColor:BORDER,borderStyle:'solid',borderLeftWidth:0,padding:8},
  sigLbl:  {fontSize:7.5,color:GOLD,fontFamily:'Helvetica-Bold',letterSpacing:0.8,marginBottom:6},
  sigTxt:  {fontSize:7,color:NAVY,marginBottom:3},
  // col widths
  d3:{flex:3},d1:{flex:1},d15:{flex:1.5},d2:{flex:2},
  hu:{flex:2},pkg:{flex:2},wt:{flex:1},hm:{flex:0.7},cDesc:{flex:3},nmfc:{flex:1},cls:{flex:0.8},
})

export function BillOfLadingPDF({order,splitLoads,vendor,companySetting,weightMap}:Props) {
  const va = (vendor?.address??{}) as Addr
  const st = (order.ship_to??{}) as Addr
  const addrLine = (a:Addr) => [a.city,a.state,a.zip].filter(Boolean).join(', ')

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* Header */}
        <View style={S.hRow}>
          {companySetting?.logo_url
            ? <Image src={companySetting.logo_url} style={S.logo}/>
            : <Text style={S.vBold}>{companySetting?.name??'MPH United'}</Text>}
          <Text style={S.hTitle}>Bill of Lading</Text>
          <Text style={S.hDate}>{fmtDate(order.order_date)}</Text>
        </View>
        <View style={S.hr}/>

        {/* Info Grid Row 1 */}
        <View style={S.row}>
          <View style={S.cL}>
            <Text style={S.lbl}>SHIP FROM</Text>
            <Text style={S.vBold}>{vendor?.name??'—'}</Text>
            {!!va.street&&<Text style={S.val}>{va.street}</Text>}
            {!!(va.city||va.state||va.zip)&&<Text style={S.val}>{addrLine(va)}</Text>}
            {!!vendor?.lead_contact&&<Text style={S.val}>{vendor.lead_contact}</Text>}
          </View>
          <View style={S.cR}>
            <View style={S.sub}>
              <Text style={S.lbl}>BOL NUMBER</Text>
              <Text style={S.val}>{order.order_number}</Text>
            </View>
            <View style={S.subB}>
              <Text style={S.lbl}>MPH LOAD #</Text>
              <Text style={S.val}>{order.order_number}</Text>
            </View>
            <View style={S.subB}>
              <Text style={S.lbl}>CUSTOMER PO #</Text>
              <Text style={S.val}>{splitLoads[0]?.customer_po ?? order.customer_po ?? '--'}</Text>
            </View>
          </View>
        </View>

        {/* Info Grid Row 2 */}
        <View style={S.row}>
          <View style={S.cL2}>
            <Text style={S.lbl}>SHIP TO</Text>
            <Text style={S.vBold}>{st.name??'—'}</Text>
            {!!st.street&&<Text style={S.val}>{st.street}</Text>}
            {!!st.street2&&<Text style={S.val}>{st.street2}</Text>}
            {!!(st.city||st.state||st.zip)&&<Text style={S.val}>{addrLine(st)}</Text>}
          </View>
          <View style={S.cR2}>
            <View style={S.sub}>
              <Text style={S.lbl}>CARRIER NAME</Text>
              <Text style={S.val}>{order.freight_carrier??'--'}</Text>
            </View>
            <View style={S.subB}>
              <Text style={S.lbl}>TRAILER # / TRUCK #</Text>
              <Text style={S.val}>{'\n'}</Text>
              <Text style={S.val}>{'\n'}</Text>
            </View>
          </View>
        </View>

        {/* Contact Information & Delivery Notes */}
        {!!st.shipping_notes&&(
          <View style={{borderWidth:1,borderColor:BORDER,borderStyle:'solid',borderTopWidth:0,padding:8}}>
            <Text style={S.lbl}>CONTACT INFORMATION & DELIVERY NOTES</Text>
            <Text style={S.val}>{st.shipping_notes}</Text>
            <View style={{borderBottomWidth:1,borderBottomColor:BORDER,borderBottomStyle:'solid',marginVertical:6}}/>
            <Text style={{fontSize:8,color:NAVY,textAlign:'right',fontFamily:'Helvetica-Bold'}}>PLEASE email completed BOL to: bol@mphunited.com</Text>
          </View>
        )}

        {/* Contact / Notes Row */}
        {!!order.appointment_notes&&(
          <View style={S.noteRow}>
            <View style={S.noteL}>
              <Text style={S.val}>{order.appointment_notes}</Text>
            </View>
            <View style={S.noteR}/>
          </View>
        )}

        {/* Customer Order Information */}
        <Text style={S.secLbl}>CUSTOMER ORDER INFORMATION</Text>
        <View style={S.th}>
          <Text style={[S.thTxt,S.d3]}>DESCRIPTION</Text>
          <Text style={[S.thTxt,S.d1]}># OF PACKAGES</Text>
          <Text style={[S.thTxt,S.d1]}>WEIGHT</Text>
          <Text style={[S.thTxt,S.d15]}>PALLET/SLIP (circle one)</Text>
          <Text style={[S.thTxt,S.d2]}>ADDITIONAL SHIPPER INFO</Text>
        </View>
        {splitLoads.map((l,i)=>{
          const name = bolDescription(l.description)
          const wt = weightMap[name]
          return (
            <View key={l.id} style={[S.tr,{backgroundColor:i%2===0?WHITE:'#FAFAFA'}]}>
              <Text style={[S.td,S.d3]}>{name||'—'}</Text>
              <Text style={[S.td,S.d1]}>{fmtQty(l.qty)}</Text>
              <Text style={[S.td,S.d1]}>{wt!=null?`${wt} lbs`:'--'}</Text>
              <Text style={[S.td,S.d15]}>Y    N</Text>
              <Text style={[S.td,S.d2]}></Text>
            </View>
          )
        })}
        <View style={[S.tr,{backgroundColor:WHITE,minHeight:14}]}><Text style={[S.td,S.d3]}></Text><Text style={[S.td,S.d1]}></Text><Text style={[S.td,S.d1]}></Text><Text style={[S.td,S.d15]}></Text><Text style={[S.td,S.d2]}></Text></View>
        <View style={[S.tr,{backgroundColor:'#FAFAFA',minHeight:14}]}><Text style={[S.td,S.d3]}></Text><Text style={[S.td,S.d1]}></Text><Text style={[S.td,S.d1]}></Text><Text style={[S.td,S.d15]}></Text><Text style={[S.td,S.d2]}></Text></View>
        <View style={S.totRow}>
          <Text style={S.totLbl}>GRAND TOTAL</Text>
          <View style={S.totRest}/>
        </View>

        {/* Carrier Information */}
        <Text style={S.secLbl}>CARRIER INFORMATION</Text>
        <View style={S.cthRow}>
          <Text style={[S.cthTxt,S.hu]}>HANDLING UNIT</Text>
          <Text style={[S.cthTxt,S.pkg]}>PACKAGE</Text>
          <Text style={[S.cthTxt,S.wt]}></Text>
          <Text style={[S.cthTxt,S.hm]}></Text>
          <Text style={[S.cthTxt,S.cDesc]}>COMMODITY DESCRIPTION</Text>
          <Text style={[S.cthTxt,S.nmfc]}>NMFC NO.</Text>
          <Text style={[S.cthTxt,S.cls]}>CLASS</Text>
        </View>
        <View style={S.cthRow}>
          <Text style={[S.cthTxt,S.d1]}>QTY</Text>
          <Text style={[S.cthTxt,{flex:1}]}>TYPE</Text>
          <Text style={[S.cthTxt,S.d1]}>QTY</Text>
          <Text style={[S.cthTxt,{flex:1}]}>TYPE</Text>
          <Text style={[S.cthTxt,S.wt]}>WEIGHT</Text>
          <Text style={[S.cthTxt,S.hm]}>HM(X)</Text>
          <Text style={[S.cthTxt,S.cDesc,{fontSize:6}]}>Commodities requiring special or additional care in handling</Text>
          <Text style={[S.cthTxt,S.nmfc]}>NMFC NO.</Text>
          <Text style={[S.cthTxt,S.cls]}>CLASS</Text>
        </View>
        {[0,1,2].map(i=>(
          <View key={i} style={S.ctr}>
            <View style={[S.d1]}><Text style={S.ctd}></Text></View>
            <View style={[{flex:1}]}><Text style={S.ctd}></Text></View>
            <View style={[S.d1]}><Text style={S.ctd}></Text></View>
            <View style={[{flex:1}]}><Text style={S.ctd}></Text></View>
            <View style={[S.wt]}><Text style={S.ctd}></Text></View>
            <View style={[S.hm]}><Text style={S.ctd}></Text></View>
            <View style={[S.cDesc]}><Text style={S.ctd}></Text></View>
            <View style={[S.nmfc]}><Text style={S.ctd}></Text></View>
            <View style={[S.cls]}><Text style={S.ctd}></Text></View>
          </View>
        ))}
        <View style={{borderTopWidth:0.5,borderTopColor:BORDER,borderTopStyle:'solid'}}>
          <Text style={S.legal}>Where the rate is dependent on value, shippers are required to state specifically in writing the agreed or declared value of the property as follows: "The agreed or declared value of the property is specifically stated by the shipper to be not exceeding _______________ per _______________."</Text>
        </View>

        {/* Legal Notice */}
        <View style={S.notice}>
          <Text style={S.noticeTx}>Note: Liability limitation for loss or damage in this shipment may be applicable. See 49 USC § 14706(c)(1)(A) and (B).</Text>
        </View>

        {/* Signatures */}
        <View style={S.sigRow}>
          <View style={S.sigC}>
            <Text style={S.sigLbl}>SHIPPER SIGNATURE / DATE</Text>
            <Text style={S.sigTxt}>Received, subject to individually determined rates or contracts that have been agreed upon in writing between the carrier and shipper, if applicable, otherwise to the rates, classifications, and rules that have been established.</Text>
            <Text style={{fontSize:8,color:NAVY,marginTop:24}}>Signature:</Text>
            <Text style={{fontSize:8}}>{' '}</Text>
            <Text style={{fontSize:8,color:NAVY}}>______________________________</Text>
          </View>
          <View style={S.sigCR}>
            <Text style={S.sigLbl}>CARRIER SIGNATURE / PICKUP DATE</Text>
            <Text style={S.sigTxt}>Trailer Loaded:  □ By shipper  □ By driver</Text>
            <Text style={S.sigTxt}>Freight Counted:  □ By shipper  □ By driver/pallets  □ By driver/pieces</Text>
            <Text style={{fontSize:8,color:NAVY,marginTop:24}}>Signature:</Text>
            <Text style={{fontSize:8}}>{' '}</Text>
            <Text style={{fontSize:8,color:NAVY}}>______________________________</Text>
          </View>
          <View style={S.sigCR}>
            <Text style={S.sigLbl}>CONSIGNEE SIGNATURE / RECEIVED DATE</Text>
          </View>
        </View>

      </Page>
    </Document>
  )
}
