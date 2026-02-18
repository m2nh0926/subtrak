import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CreditCard, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { usePaymentMethods, useCardSubscriptions, useMigratePaymentMethod } from "@/lib/hooks";

const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(Math.round(n)) + "원";

export default function PaymentMethodDetail() {
  const { id } = useParams();
  const pmId = Number(id) || 0;
  const { data: methods } = usePaymentMethods();
  const { data: subs, isLoading } = useCardSubscriptions(pmId);
  const migrate = useMigratePaymentMethod();
  const pm = methods?.find((m) => m.id === pmId);
  const [showMigrate, setShowMigrate] = useState(false);
  const [targetPmId, setTargetPmId] = useState("");
  const [selectedSubs, setSelectedSubs] = useState<number[]>([]);

  if (!pm) return <p className="py-8 text-center text-muted-foreground">불러오는 중...</p>;

  const otherMethods = methods?.filter((m) => m.id !== pmId && m.is_active) ?? [];

  const handleMigrate = async () => {
    await migrate.mutateAsync({
      oldId: pmId,
      newId: Number(targetPmId),
      subscriptionIds: selectedSubs.length > 0 ? selectedSubs : undefined,
    });
    setShowMigrate(false);
    setTargetPmId("");
    setSelectedSubs([]);
  };

  const toggleSub = (subId: number) => {
    setSelectedSubs((prev) => prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">{pm.name}</h2>
            {pm.card_last_four && <p className="text-muted-foreground">**** {pm.card_last_four}</p>}
          </div>
        </div>
        {subs && subs.length > 0 && otherMethods.length > 0 && (
          <Button variant="outline" onClick={() => setShowMigrate(true)}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />결제수단 일괄 변경
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>카드 교체 체크리스트</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">이 카드로 결제 중인 구독 목록입니다. 카드를 교체할 때 아래 항목들의 결제수단을 변경하세요.</p>
          {isLoading && <p className="text-muted-foreground">불러오는 중...</p>}
          {subs && subs.length === 0 && <p className="text-sm text-muted-foreground">연결된 구독이 없습니다</p>}
          <div className="space-y-3">
            {subs?.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <input type="checkbox" className="h-4 w-4 rounded" />
                <div className="flex-1">
                  <Link to={`/subscriptions/${s.id}`} className="font-medium text-sm hover:underline">{s.name}</Link>
                  <p className="text-xs text-muted-foreground">{fmt(s.amount)}</p>
                </div>
                <Badge variant="outline">결제수단 변경 필요</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Migrate Dialog */}
      <Dialog open={showMigrate} onOpenChange={setShowMigrate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>결제수단 일괄 변경</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {pm.name}에서 다른 결제수단으로 구독을 일괄 이동합니다.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">변경할 결제수단</label>
              <select className="w-full h-10 rounded-md border border-input px-3 text-sm" value={targetPmId} onChange={(e) => setTargetPmId(e.target.value)}>
                <option value="">선택</option>
                {otherMethods.map((m) => <option key={m.id} value={m.id}>{m.name} {m.card_last_four ? `(*${m.card_last_four})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">이동할 구독 (선택하지 않으면 전체 이동)</label>
              <div className="max-h-48 overflow-y-auto space-y-2 mt-2">
                {subs?.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedSubs.includes(s.id)} onChange={() => toggleSub(s.id)} className="h-4 w-4 rounded" />
                    {s.name} ({fmt(s.amount)})
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMigrate(false)}>취소</Button>
            <Button onClick={handleMigrate} disabled={!targetPmId || migrate.isPending}>일괄 변경</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
