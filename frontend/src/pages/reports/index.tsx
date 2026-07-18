import { useState, useMemo } from "react";
import {
  useGetReportSummary,
  useGetRevenueReport,
  useGetPaymentMethods,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Users,
  BarChart2,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function toLocalDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  momo: "MoMo",
  card: "Card",
  bank: "Bank",
  delivery: "Delivery",
};

const PAYMENT_COLORS = [
  "hsl(var(--primary))",
  "hsl(262 80% 60%)",
  "hsl(190 90% 40%)",
  "hsl(43 96% 56%)",
  "hsl(347 77% 50%)",
  "hsl(215 25% 35%)",
];

// ── Period presets ─────────────────────────────────────────────────────────────

type Preset = "today" | "7d" | "30d" | "90d" | "custom";

interface DateRange {
  from: string;
  to: string;
}

const PRESETS: { id: Preset; label: string; days: number | null }[] = [
  { id: "today", label: "Today", days: 0 },
  { id: "7d",    label: "7 days", days: 7 },
  { id: "30d",   label: "30 days", days: 30 },
  { id: "90d",   label: "90 days", days: 90 },
  { id: "custom", label: "Custom", days: null },
];

function presetToRange(preset: Preset, custom: DateRange): DateRange {
  const today = new Date();
  switch (preset) {
    case "today":
      return { from: toLocalDate(today), to: toLocalDate(today) };
    case "7d":
      return { from: toLocalDate(addDays(today, -7)), to: toLocalDate(today) };
    case "30d":
      return { from: toLocalDate(addDays(today, -30)), to: toLocalDate(today) };
    case "90d":
      return { from: toLocalDate(addDays(today, -90)), to: toLocalDate(today) };
    default:
      return custom;
  }
}

function groupByForPreset(preset: Preset): "day" | "week" | "month" {
  if (preset === "today") return "day";
  if (preset === "7d") return "day";
  if (preset === "30d") return "day";
  return "week";
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  icon: Icon,
  loading,
  sub,
}: {
  title: string;
  value: string | null;
  icon: React.ElementType;
  loading: boolean;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value ?? "—"}</div>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const today = new Date();
  const [preset, setPreset] = useState<Preset>("30d");
  const [custom, setCustom] = useState<DateRange>({
    from: toLocalDate(addDays(today, -30)),
    to: toLocalDate(today),
  });

  const range = useMemo(() => presetToRange(preset, custom), [preset, custom]);
  const groupBy = groupByForPreset(preset);

  const { data: summary, isLoading: loadingSummary } = useGetReportSummary({
    from: range.from,
    to: range.to,
  });

  const { data: revenue, isLoading: loadingRevenue } = useGetRevenueReport({
    from: range.from,
    to: range.to,
    groupBy,
  });

  const { data: paymentStats, isLoading: loadingPayments } = useGetPaymentMethods({
    from: range.from,
    to: range.to,
  });

  const totalPaymentRevenue = paymentStats?.reduce((s, p) => s + p.revenue, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground">Sales analytics and revenue breakdown</p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border overflow-hidden">
            {PRESETS.filter((p) => p.id !== "custom").map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  preset === p.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Custom date inputs */}
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={preset === "custom" ? custom.from : range.from}
              max={preset === "custom" ? custom.to : range.to}
              onChange={(e) => {
                setPreset("custom");
                setCustom((c) => ({ ...c, from: e.target.value }));
              }}
              className="rounded-md border bg-card px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-muted-foreground text-sm">–</span>
            <input
              type="date"
              value={preset === "custom" ? custom.to : range.to}
              min={preset === "custom" ? custom.from : range.from}
              onChange={(e) => {
                setPreset("custom");
                setCustom((c) => ({ ...c, to: e.target.value }));
              }}
              className="rounded-md border bg-card px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={summary ? fmt(summary.totalRevenue) : null}
          icon={DollarSign}
          loading={loadingSummary}
        />
        <MetricCard
          title="Total Sales"
          value={summary?.totalSales.toString() ?? null}
          icon={ShoppingBag}
          loading={loadingSummary}
        />
        <MetricCard
          title="Avg Order Value"
          value={summary ? fmt(summary.avgOrderValue) : null}
          icon={TrendingUp}
          loading={loadingSummary}
        />
        <MetricCard
          title="Unique Customers"
          value={summary?.uniqueCustomers.toString() ?? null}
          icon={Users}
          loading={loadingSummary}
          sub="with a recorded name"
        />
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          {loadingRevenue ? (
            <Skeleton className="h-64 w-full" />
          ) : revenue && revenue.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="period"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString(undefined, {
                        month: "short",
                        day: groupBy === "month" ? undefined : "numeric",
                      })
                    }
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={fmtShort}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [fmt(value), "Revenue"]}
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString(undefined, { dateStyle: "medium" })
                    }
                  />
                  <Bar
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              No sales data for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPayments ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : paymentStats && paymentStats.length > 0 ? (
            <div className="space-y-3">
              {paymentStats.map((stat, i) => {
                const pct = totalPaymentRevenue > 0 ? (stat.revenue / totalPaymentRevenue) * 100 : 0;
                return (
                  <div key={stat.method} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }}
                        />
                        <span className="font-medium">
                          {PAYMENT_LABELS[stat.method] ?? stat.method}
                        </span>
                        <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                          {stat.count} {stat.count === 1 ? "sale" : "sales"}
                        </Badge>
                      </div>
                      <span className="tabular-nums font-medium">{fmt(stat.revenue)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: PAYMENT_COLORS[i % PAYMENT_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
              No payment data for this period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
