import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Download, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { useSubscriptions, useImportSubscriptions } from "@/lib/hooks";
import api from "@/lib/api";

const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(Math.round(n)) + "원";
const cycleLabel: Record<string, string> = { monthly: "월", yearly: "년", weekly: "주", quarterly: "분기" };

export default function Subscriptions() {
  const [showActive, setShowActive] = useState(true);
  const { data: subs, isLoading } = useSubscriptions(showActive ? { is_active: true } : undefined);
  const importMutation = useImportSubscriptions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async (format: "csv" | "xlsx") => {
    const res = await api.get(`/data/export/subscriptions?format=${format}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importMutation.mutateAsync(file);
    alert(`가져오기 완료: ${result.imported}건 성공, ${result.skipped}건 건너뜀`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">구독 관리</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}><Download className="mr-1 h-4 w-4" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}><Download className="mr-1 h-4 w-4" />Excel</Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />가져오기
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <Link to="/subscriptions/new">
            <Button><Plus className="mr-2 h-4 w-4" />구독 추가</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant={showActive ? "default" : "outline"} size="sm" onClick={() => setShowActive(true)}>활성</Button>
        <Button variant={!showActive ? "default" : "outline"} size="sm" onClick={() => setShowActive(false)}>전체</Button>
      </div>

      {isLoading && <p className="text-muted-foreground py-8 text-center">불러오는 중...</p>}

      {subs && subs.length === 0 && <EmptyState title="구독이 없습니다" description="새 구독을 추가해보세요" />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subs?.map((s) => (
          <Link key={s.id} to={`/subscriptions/${s.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {s.logo_url && <img src={s.logo_url} alt="" className="h-8 w-8 rounded object-contain" />}
                    <div>
                      <h3 className="font-semibold">{s.name}</h3>
                      <p className="text-lg font-bold text-primary">{fmt(s.amount)}<span className="text-sm font-normal text-muted-foreground">/{cycleLabel[s.billing_cycle] ?? s.billing_cycle}</span></p>
                    </div>
                  </div>
                  {!s.is_active && <Badge variant="secondary">비활성</Badge>}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>다음 결제: {s.next_payment_date}</span>
                  {s.category_name && (
                    <Badge variant="outline" style={{ borderColor: s.category_color ?? undefined }}>
                      {s.category_name}
                    </Badge>
                  )}
                </div>
                {s.payment_method_name && (
                  <p className="text-xs text-muted-foreground mt-2">{s.payment_method_name} {s.payment_method_last_four ? `(*${s.payment_method_last_four})` : ""}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
