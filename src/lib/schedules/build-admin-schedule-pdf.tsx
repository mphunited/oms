// src/lib/schedules/build-admin-schedule-pdf.tsx
// Admin/Owner schedule PDF — includes pricing (buy/sell), grouped by vendor.
// Columns: Vendor, Salesperson/CSR, MPH PO, Customer PO, Description, Qty,
//          Ship Date, Appt. Time, P/N, Customer, Freight, Ship To, Buy, PO Notes

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { ScheduleOrderRow } from "./fetch-schedule-data";
import { formatScheduleDate } from "./date-utils";

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  vendorGroup: {
    marginBottom: 12,
  },
  vendorLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#00205B",
    backgroundColor: "#EEF2FF",
    padding: "3 5",
    marginBottom: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#00205B",
    padding: "3 2",
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

// Column widths — must sum to ~100% of usable width
const COL = {
  mph_po:      "9%",
  cust_po:     "8%",
  salesperson: "8%",
  description: "16%",
  qty:         "4%",
  ship_date:   "7%",
  appt:        "6%",
  pn:          "6%",
  customer:    "9%",
  freight:     "6%",
  ship_to:     "10%",
  buy:         "5%",
  po_notes:    "6%",
};

// ─── Helper ───────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

interface AdminSchedulePdfProps {
  startDate: string;
  endDate: string;
  orders: ScheduleOrderRow[];
  generatedAt: string;
}

export function AdminSchedulePdf({
  startDate,
  endDate,
  orders,
  generatedAt,
}: AdminSchedulePdfProps) {
  // Group by vendor
  const grouped = new Map<string, ScheduleOrderRow[]>();
  for (const order of orders) {
    const key = order.vendorName;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(order);
  }

  const vendorGroups = Array.from(grouped.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>MPH United — Admin Shipping Schedule</Text>
          <Text style={styles.headerSub}>
            {formatScheduleDate(startDate)} — {formatScheduleDate(endDate)}
            {"   "}|{"   "}
            {orders.length} shipment{orders.length !== 1 ? "s" : ""}
            {"   "}|{"   "}
            Generated {generatedAt}
          </Text>
        </View>

        {/* Vendor Groups */}
        {vendorGroups.map(([vendorName, vendorOrders]) => (
          <View key={vendorName} style={styles.vendorGroup} wrap={false}>
            <Text style={styles.vendorLabel}>
              {vendorName} — {vendorOrders.length} shipment{vendorOrders.length !== 1 ? "s" : ""}
            </Text>

            {/* Table header */}
            <View style={styles.tableHeader}>
              {[
                { label: "MPH PO",      w: COL.mph_po },
                { label: "Cust PO",     w: COL.cust_po },
                { label: "Sales/CSR",   w: COL.salesperson },
                { label: "Description", w: COL.description },
                { label: "Qty",         w: COL.qty },
                { label: "Ship Date",   w: COL.ship_date },
                { label: "Appt",        w: COL.appt },
                { label: "P/N",         w: COL.pn },
                { label: "Customer",    w: COL.customer },
                { label: "Freight",     w: COL.freight },
                { label: "Ship To",     w: COL.ship_to },
                { label: "Buy",         w: COL.buy },
                { label: "PO Notes",    w: COL.po_notes },
              ].map(({ label, w }) => (
                <Text
                  key={label}
                  style={[styles.tableHeaderCell, { width: w }]}
                >
                  {label}
                </Text>
              ))}
            </View>

            {/* Rows */}
            {vendorOrders.map((o, i) => (
              <View
                key={o.id}
                style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.cell, { width: COL.mph_po }]}>{o.order_number}</Text>
                <Text style={[styles.cell, { width: COL.cust_po }]}>{o.customer_po ?? "—"}</Text>
                <Text style={[styles.cell, { width: COL.salesperson }]}>
                  {(() => {
                    const salesFirst = (o.salespersonName ?? "").split(" ")[0] || "";
                    const csrFirst = (o.csrName ?? "").split(" ")[0] || "";
                    const csr2First = (o.csr2Name ?? "").split(" ")[0] || "";
                    const csrDisplay = csr2First ? `${csrFirst} / ${csr2First}` : csrFirst;
                    return [salesFirst, csrDisplay].filter(Boolean).join(" / ") || "—";
                  })()}
                </Text>
                <Text style={[styles.cell, { width: COL.description }]}>{o.description ?? "—"}</Text>
                <Text style={[styles.cell, { width: COL.qty }]}>{o.qty ?? "—"}</Text>
                <Text style={[styles.cell, { width: COL.ship_date }]}>{fmtDate(o.ship_date)}</Text>
                <Text style={[styles.cell, { width: COL.appt }]}>{fmtAppt(o.appointment_time)}</Text>
                <Text style={[styles.cell, { width: COL.pn }]}>{o.part_number ?? "—"}</Text>
                <Text style={[styles.cell, { width: COL.customer }]}>{o.customerName}</Text>
                <Text style={[styles.cell, { width: COL.freight }]}>{o.freight_carrier ?? "—"}</Text>
                <Text style={[styles.cell, { width: COL.ship_to }]}>{fmtShipTo(o.shipTo)}</Text>
                <Text style={[styles.cell, { width: COL.buy }]}>
                  {o.buy ? `$${parseFloat(o.buy).toFixed(2)}` : "—"}
                </Text>
                <Text style={[styles.cell, { width: COL.po_notes }]}>{o.po_notes ?? "—"}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>MPH United — CONFIDENTIAL — Admin Use Only</Text>
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
