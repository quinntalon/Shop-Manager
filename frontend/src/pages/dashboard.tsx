import { 
  useGetDashboardSummary, 
  useGetSalesByDay, 
  useGetTopProducts, 
  useGetLowStockProducts,
  getGetDashboardSummaryQueryKey,
  getGetSalesByDayQueryKey,
  getGetTopProductsQueryKey,
  getGetLowStockProductsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, PackageX, ShoppingBag } from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });
  const { data: daily, isLoading: loadingDaily } = useGetSalesByDay({
    query: { queryKey: getGetSalesByDayQueryKey() }
  });
  const { data: topProducts, isLoading: loadingTop } = useGetTopProducts({
    query: { queryKey: getGetTopProductsQueryKey() }
  });
  const { data: lowStock, isLoading: loadingLow } = useGetLowStockProducts({
    query: { queryKey: getGetLowStockProductsQueryKey() }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your store's performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Today's Revenue" 
          value={summary ? `₵${summary.todayRevenue.toFixed(2)}` : null} 
          icon={DollarSign} 
          loading={loadingSummary} 
        />
        <MetricCard 
          title="This Week" 
          value={summary ? `₵${summary.weekRevenue.toFixed(2)}` : null} 
          icon={TrendingUp} 
          loading={loadingSummary} 
        />
        <MetricCard 
          title="Total Sales Today" 
          value={summary?.totalSalesToday.toString()} 
          icon={ShoppingBag} 
          loading={loadingSummary} 
        />
        <MetricCard 
          title="Low Stock Items" 
          value={summary?.lowStockCount.toString()} 
          icon={PackageX} 
          loading={loadingSummary} 
          alert={summary?.lowStockCount ? summary.lowStockCount > 0 : false}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {loadingDaily ? (
              <Skeleton className="h-[300px] w-full" />
            ) : daily && daily.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `₵${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`₵${value.toFixed(2)}`, 'Revenue']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No recent sales data
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTop ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : topProducts && topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.slice(0, 5).map((product) => (
                  <div key={product.productId} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{product.productName}</p>
                      <p className="text-xs text-muted-foreground">{product.totalQuantity} sold</p>
                    </div>
                    <div className="font-medium">₵{product.totalRevenue.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
                No products sold yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  loading,
  alert = false 
}: { 
  title: string; 
  value?: string | null; 
  icon: React.ElementType; 
  loading: boolean;
  alert?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${alert ? 'text-destructive' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className={`text-2xl font-bold ${alert ? 'text-destructive' : ''}`}>
            {value || "0"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
