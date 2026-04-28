import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { orders, customers, users } from '@/lib/db/schema'
import { eq, not, inArray, and, gte, lte, desc, count, sql } from 'drizzle-orm'
import { StatusBarChart } from '@/components/dashboard/status-bar-chart'
import { formatDate } from '@/lib/utils/format-date'

const INACTIVE = ['Complete', 'Cancelled', 'Canceled']

function getWeekBounds() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) }
}

function getMonthBounds() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { start, end }
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold text-[#00205B] dark:text-white">{value}</p>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const week = getWeekBounds()
  const month = getMonthBounds()

  const [
    activeResult,
    invoiceResult,
    weekResult,
    monthResult,
    statusRows,
    recentOrders,
  ] = await Promise.all([
    db.select({ count: count() }).from(orders)
      .where(not(inArray(orders.status, INACTIVE))),

    db.select({ count: count() }).from(orders)
      .where(eq(orders.status, 'Ready To Invoice')),

    db.select({ count: count() }).from(orders)
      .where(and(gte(orders.ship_date, week.start), lte(orders.ship_date, week.end))),

    db.select({ count: count() }).from(orders)
      .where(and(gte(orders.order_date, month.start), lte(orders.order_date, month.end))),

    db.select({ status: orders.status, count: count() }).from(orders)
      .where(not(inArray(orders.status, INACTIVE)))
      .groupBy(orders.status)
      .orderBy(sql`count(*) desc`),

    db.select({
      id: orders.id,
      order_number: orders.order_number,
      status: orders.status,
      ship_date: orders.ship_date,
      customer_name: customers.name,
      salesperson_name: users.name,
    })
      .from(orders)
      .leftJoin(customers, eq(orders.customer_id, customers.id))
      .leftJoin(users, eq(orders.salesperson_id, users.id))
      .orderBy(desc(orders.created_at))
      .limit(10),
  ])

  const stats = {
    active: Number(activeResult[0]?.count ?? 0),
    invoice: Number(invoiceResult[0]?.count ?? 0),
    week: Number(weekResult[0]?.count ?? 0),
    month: Number(monthResult[0]?.count ?? 0),
  }

  const chartData = statusRows.map(r => ({ status: r.status, count: Number(r.count) }))

  return (
    <div className="p-6 max-w-5xl space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Hero stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Active Orders" value={stats.active} />
        <StatCard label="Ready to Invoice" value={stats.invoice} />
        <StatCard label="Shipped This Week" value={stats.week} />
        <StatCard label="Orders This Month" value={stats.month} />
      </div>

      {/* Status distribution */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Active Orders by Status
        </h2>
        <StatusBarChart data={chartData} />
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Recent Orders
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">MPH PO</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Ship Date</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Salesperson</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map(order => (
              <tr key={order.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5">
                  <Link href={`/orders/${order.id}`} className="font-mono text-[#00205B] hover:underline dark:text-blue-300">
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-foreground">{order.customer_name ?? '—'}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{order.status}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(order.ship_date)}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{order.salesperson_name ?? '—'}</td>
              </tr>
            ))}
            {recentOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No orders yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
