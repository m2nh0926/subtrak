import { Wallet, CalendarDays, Repeat, PiggyBank } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { useDashboard, useExpiringCards } from "@/lib/hooks";

const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(Math.round(n)) + "원";

export default function Dashboard() {
  const { data, isLoading } = useDashboard();
  const { data: expiringCards } = useExpiringCards(60);

  if (isLoading || !data) return <p className="py-8 text-center text-muted-foreground">불러오는 중...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">대시보드</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="월간 총 비용" value={fmt(data.total_monthly_cost)} />
        <StatCard icon={CalendarDays} label="연간 총 비용" value={fmt(data.total_yearly_cost)} />
        <StatCard icon={Repeat} label="활성 구독 수" value={`${data.active_count}개`} />
        <StatCard icon={PiggyBank} label="해지 절약 누적액" value={fmt(data.total_savings_from_cancellations)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category PieChart */}
        <Card>
          <CardHeader><CardTitle>카테고리별 지출</CardTitle></CardHeader>
          <CardContent>
            {data.category_breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.category_breakdown} dataKey="total_amount" nameKey="category_name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                      {data.category_breakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => fmt(Number(val))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.category_breakdown.map((c) => (
                    <div key={c.category_name} className="flex items-center gap-2 text-sm">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                      <span>{c.category_name}</span>
                      <span className="text-muted-foreground ml-auto">{c.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card>
          <CardHeader><CardTitle>다음 결제 예정</CardTitle></CardHeader>
          <CardContent>
            {data.upcoming_payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">예정된 결제 없음</p>
            ) : (
              <div className="space-y-3">
                {data.upcoming_payments.slice(0, 8).map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.subscription_name}</p>
                      <p className="text-xs text-muted-foreground">{p.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{fmt(p.amount)}</span>
                      <Badge variant={p.days_until <= 3 ? "destructive" : "secondary"}>
                        D-{p.days_until}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiring cards warning */}
      {expiringCards && expiringCards.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader><CardTitle className="text-yellow-800">카드 만료 임박</CardTitle></CardHeader>
          <CardContent>
            {expiringCards.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2">
                <span className="font-medium">{c.name} (*{c.card_last_four})</span>
                <span className="text-sm text-yellow-700">만료일: {c.expiry_date} | 연결된 구독 {c.subscription_count}개</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
