import { Users, Repeat, Wallet, TrendingUp, Crown, FolderOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { useAdminDashboard } from "@/lib/hooks";

const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(Math.round(n)) + "원";
const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function AdminDashboard() {
  const { data, isLoading, error } = useAdminDashboard();

  if (isLoading) return <p className="py-8 text-center text-muted-foreground">불러오는 중...</p>;
  if (error) return <p className="py-8 text-center text-red-500">관리자 권한이 필요합니다.</p>;
  if (!data) return null;

  const { user_summary, subscription_stats, top_services, top_cards, category_stats, recent_users } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Crown className="h-6 w-6 text-yellow-500" />
        <h2 className="text-2xl font-bold">관리자 대시보드</h2>
      </div>

      {/* User & Subscription Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="전체 회원 수" value={`${user_summary.total_users}명`} />
        <StatCard icon={TrendingUp} label="이번 달 신규 가입" value={`${user_summary.new_users_this_month}명`} />
        <StatCard icon={Repeat} label="활성 구독 수 (전체)" value={`${subscription_stats.active_subscriptions}개`} />
        <StatCard icon={Wallet} label="전체 월 구독 비용" value={fmt(subscription_stats.total_monthly_revenue)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services Chart */}
        <Card>
          <CardHeader><CardTitle>인기 구독 서비스 TOP 10</CardTitle></CardHeader>
          <CardContent>
            {top_services.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={top_services} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" tickFormatter={(v) => `${v}명`} />
                  <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) =>
                      [`${value}명`, "구독자 수"]
                    }
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Card Type Distribution */}
        <Card>
          <CardHeader><CardTitle>카드 종류별 분포</CardTitle></CardHeader>
          <CardContent>
            {top_cards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={top_cards} dataKey="count" nameKey="card_type" cx="50%" cy="50%" innerRadius={50} outerRadius={90}>
                      {top_cards.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`${val}개`, "카드 수"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 min-w-[120px]">
                  {top_cards.map((c, i) => (
                    <div key={c.card_type} className="flex items-center gap-2 text-sm">
                      <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="truncate">{c.card_type || "미지정"}</span>
                      <span className="text-muted-foreground ml-auto">{c.count}개</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Stats */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FolderOpen className="h-5 w-5" />카테고리별 통계</CardTitle></CardHeader>
          <CardContent>
            {category_stats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>
            ) : (
              <div className="space-y-3">
                {category_stats.map((cat) => (
                  <div key={cat.category_name} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{cat.category_name}</p>
                      <p className="text-xs text-muted-foreground">구독 {cat.subscription_count}개</p>
                    </div>
                    <span className="text-sm font-semibold">{fmt(cat.total_monthly_amount)}/월</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />최근 가입 회원</CardTitle></CardHeader>
          <CardContent>
            {recent_users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">가입 회원 없음</p>
            ) : (
              <div className="space-y-3">
                {recent_users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">구독 {u.subscription_count}개</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(u.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-indigo-700">{user_summary.total_users}</p>
              <p className="text-xs text-indigo-500">전체 회원</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-700">{subscription_stats.total_subscriptions}</p>
              <p className="text-xs text-indigo-500">전체 구독</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-700">{fmt(subscription_stats.avg_monthly_per_user)}</p>
              <p className="text-xs text-indigo-500">인당 평균 구독비</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-700">{fmt(subscription_stats.total_monthly_revenue)}</p>
              <p className="text-xs text-indigo-500">전체 월 비용</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
