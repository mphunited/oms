// src/lib/schedules/build-vendor-schedule-pdf.tsx
// Vendor schedule PDF — NO pricing. Used for both per-vendor and Frontline schedules.
// Vendor columns: Vendor, Sales/CSR, MPH PO, Customer PO, Description, Qty,
//                 Ship Date, Appt. Time, P/N, Customer, Freight, Ship To, PO Notes
// Frontline columns: Vendor, Sales/CSR, MPH PO, Customer PO, Description, Qty,
//                    Ship Date, Appt. Time, Customer, Ship To

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ScheduleOrderRow } from "./fetch-schedule-data";
import { formatScheduleDate } from "./date-utils";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 7,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 24,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#00205B",
  },
  headerSub: {
    fontSize: 8,
    color: "#555555",
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#00205B",
    padding: "3 2",
    marginTop: 6,
  },
  tableHeaderCell: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    padding: "3 2",
    minHeight: 16,
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  cell: {
    fontSize: 7,
    color: "#1f2937",
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: "#9ca3af",
  },
});

// Vendor schedule columns
const VENDOR_COL = {
  vendor:      "8%",
  salesperson: "8%",
  mph_po:      "9%",
  cust_po:     "8%",
  description: "18%",
  qty:         "4%",
  ship_date:   "7%",
  appt:        "6%",
  pn:          "7%",
  customer:    "8%",
  freight:     "6%",
  ship_to:     "9%",
  po_notes:    "6%",
};

// Frontline schedule columns (no P/N, no Freight label — Frontline already knows they're the carrier)
const FRONTLINE_COL = {
  vendor:      "10%",
  salesperson: "9%",
  mph_po:      "10%",
  cust_po:     "9%",
  description: "20%",
  qty:         "5%",
  ship_date:   "8%",
  appt:        "7%",
  customer:    "11%",
  ship_to:     "11%",
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y.slice(2)}`;
}

function fmtAppt(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtShipTo(shipTo: Record<string, string> | null): string {
  if (!shipTo) return "—";
  const parts = [shipTo.city, shipTo.state].filter(Boolean);
  return parts.join(", ") || shipTo.street || "—";
}

interface VendorSchedulePdfProps {
  startDate: string;
  endDate: string;
  orders: ScheduleOrderRow[];
  vendorName: string;      // "Frontline" for frontline schedule
  isFrontline: boolean;
  generatedAt: string;
}

export function VendorSchedulePdf({
  startDate,
  endDate,
  orders,
  vendorName,
  isFrontline,
  generatedAt,
}: VendorSchedulePdfProps) {
  const title = isFrontline
    ? "MPH United — Frontline Shipping Schedule"
    : `MPH United — ${vendorName} Shipping Schedule`;

  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub}>
            {formatScheduleDate(startDate)} — {formatScheduleDate(endDate)}
            {"   "}|{"   "}
            {orders.length} shipment{orders.length !== 1 ? "s" : ""}
            {"   "}|{"   "}
            Generated {generatedAt}
          </Text>
        </View>

        {isFrontline ? (
          <>
            <View style={styles.tableHeader}>
              {[
                { label: "Vendor",      w: FRONTLINE_COL.vendor },
                { label: "Sales/CSR",   w: FRONTLINE_COL.salesperson },
                { label: "MPH PO",      w: FRONTLINE_COL.mph_po },
                { label: "Cust PO",     w: FRONTLINE_COL.cust_po },
                { label: "Description", w: FRONTLINE_COL.description },
                { label: "Qty",         w: FRONTLINE_COL.qty },
                { label: "Ship Date",   w: FRONTLINE_COL.ship_date },
                { label: "Appt",        w: FRONTLINE_COL.appt },
                { label: "Customer",    w: FRONTLINE_COL.customer },
                { label: "Ship To",     w: FRONTLINE_COL.ship_to },
              ].map(({ label, w }) => (
                <Text key={label} style={[styles.tableHeaderCell, { width: w }]}>
                  {label}
                </Text>
              ))}
            </View>
            {orders.map((o, i) => (
              <View key={o.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.cell, { width: FRONTLINE_COL.vendor }]}>{o.vendorName}</Text>
                <Text style={[styles.cell, { width: FRONTLINE_COL.salesperson }]}>
                  {[o.salespersonName, o.csrName].filter(Boolean).join(" / ") || "—"}
                </Text>
                <Text style={[styles.cell, { width: FRONTLINE_COL.mph_po }]}>{o.order_number}</Text>
                <Text style={[styles.cell, { width: FRONTLINE_COL.cust_po }]}>{o.customer_po ?? "—"}</Text>
                <Text style={[styles.cell, { width: FRONTLINE_COL.description }]}>{o.description ?? "—"}</Text>
                <Text style={[styles.cell, { width: FRONTLINE_COL.qty }]}>{o.qty ?? "—"}</Text>
                <Text style={[styles.cell, { width: FRONTLINE_COL.ship_date }]}>{fmtDate(o.ship_date)}</Text>
                <Text style={[styles.cell, { width: FRONTLINE_COL.appt }]}>{fmtAppt(o.appointment_time)}</Text>
                <Text style={[styles.cell, { width: FRONTLINE_COL.customer }]}>{o.customerName}</Text>
                <Text style={[styles.cell, { width: FRONTLINE_COL.ship_to }]}>{fmtShipTo(o.shipTo)}</Text>
              </View>
            ))}
          </>
        ) : (
          <>
            <View style={styles.tableHeader}>
              {[
                { label: "Vendor",      w: VENDOR_COL.vendor },
                { label: "Sales/CSR",   w: VENDOR_COL.salesperson },
                { label: "MPH PO",      w: VENDOR_COL.mph_po },
                { label: "Cust PO",     w: VENDOR_COL.cust_po },
                { label: "Description", w: VENDOR_COL.description },
                { label: "Qty",         w: VENDOR_COL.qty },
                { label: "Ship Date",   w: VENDOR_COL.ship_date },
                { label: "Appt",        w: VENDOR_COL.appt },
                { label: "P/N",         w: VENDOR_COL.pn },
                { label: "Customer",    w: VENDOR_COL.customer },
                { label: "Freight",     w: VENDOR_COL.freight },
                { label: "Ship To",     w: VENDOR_COL.ship_to },
                { label: "PO Notes",    w: VENDOR_COL.po_notes },
              ].map(({ label, w }) => (
                <Text key={label} style={[styles.tableHeaderCell, { width: w }]}>
                  {label}
                </Text>
              ))}
            </View>
            {orders.map((o, i) => (
              <View key={o.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.cell, { width: VENDOR_COL.vendor }]}>{o.vendorName}</Text>
                <Text style={[styles.cell, { width: VENDOR_COL.salesperson }]}>
                  {[o.salespersonName, o.csrName].filter(Boolean).join(" / ") || "—"}
                </Text>
                <Text style={[styles.cell, { width: VENDOR_COL.mph_po }]}>{o.order_number}</Text>
                <Text style={[styles.cell, { width: VENDOR_COL.cust_po }]}>{o.customer_po ?? "—"}</Text>
                <Text style={[styles.cell, { width: VENDOR_COL.description }]}>{o.description ?? "—"}</Text>
                <Text style={[styles.cell, { width: VENDOR_COL.qty }]}>{o.qty ?? "—"}</Text>
                <Text style={[styles.cell, { width: VENDOR_COL.ship_date }]}>{fmtDate(o.ship_date)}</Text>
                <Text style={[styles.cell, { width: VENDOR_COL.appt }]}>{fmtAppt(o.appointment_time)}</Text>
                <Text style={[styles.cell, { width: VENDOR_COL.pn }]}>{o.part_number ?? "—"}</Text>
                <Text style={[styles.cell, { width: VENDOR_COL.customer }]}>{o.customerName}</Text>
                <Text style={[styles.cell, { width: VENDOR_COL.freight }]}>{o.freight_carrier ?? "—"}</Text>
                <Text style={[styles.cell, { width: VENDOR_COL.ship_to }]}>{fmtShipTo(o.shipTo)}</Text>
                <Text style={[styles.cell, { width: VENDOR_COL.po_notes }]}>{o.po_notes ?? "—"}</Text>
              </View>
            ))}
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>MPH United</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
