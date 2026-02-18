import { PiggyBank, TrendingDown, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { useCancellationLogs, useSavingsSummary } from "@/lib/hooks";

const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(Math.round(n)) + "원";

export default function Cancellations() {
  const { data: summary } = useSavingsSummary();
  const { data: logs, isLoading } = useCancellationLogs();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">해지 내역</h2>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Hash} label="총 해지 건수" value={`${summary.cancellation_count}건`} />
          <StatCard icon={TrendingDown} label="월간 절약액" value={fmt(summary.total_monthly_savings)} />
          <StatCard icon={PiggyBank} label="누적 절약액 (연간)" value={fmt(summary.total_cumulative_savings)} />
        </div>
      )}

      {summary && summary.total_monthly_savings > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-bold text-green-700">매월 {fmt(summary.total_monthly_savings)} 절약 중!</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>해지 이력</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground text-center py-4">불러오는 중...</p>}
          {logs && logs.length === 0 && <EmptyState title="해지 내역이 없습니다" description="구독을 해지하면 여기에 기록됩니다" />}
          <div className="space-y-4">
            {logs?.map((log) => (
              <div key={log.id} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                <div>
                  <p className="font-medium text-sm">{log.subscription_name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(log.cancelled_at).toLocaleDateString("ko-KR")}</p>
                  {log.reason && <p className="text-xs text-muted-foreground mt-1">사유: {log.reason}</p>}
                </div>
                {log.savings_per_month && (
                  <p className="text-sm font-semibold text-green-600">월 {fmt(log.savings_per_month)} 절약</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
