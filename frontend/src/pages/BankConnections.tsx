import { useState } from "react";
import { Plus, Trash2, Building2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useBankConnections, useCreateBankConnection, useDeleteBankConnection } from "@/lib/hooks";

const KOREAN_BANKS = [
  "삼성카드", "신한카드", "현대카드", "KB국민카드", "하나카드",
  "롯데카드", "우리카드", "NH농협카드", "카카오뱅크", "토스뱅크",
  "BC카드", "씨티카드",
];

const statusLabel: Record<string, string> = { connected: "연결됨", disconnected: "연결 해제", error: "오류" };

export default function BankConnections() {
  const { data: connections, isLoading } = useBankConnections();
  const createConn = useCreateBankConnection();
  const deleteConn = useDeleteBankConnection();
  const [showAdd, setShowAdd] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountId, setAccountId] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await createConn.mutateAsync({
      institution_name: bankName,
      provider: "manual",
      account_identifier: accountId || undefined,
    });
    setBankName("");
    setAccountId("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">은행/카드 연동</h2>
        <Button onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" />연결 추가</Button>
      </div>

      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Codef 연동은 API 키 설정 후 사용 가능합니다</p>
              <p className="text-xs text-muted-foreground mt-1">
                현재는 수동 등록만 지원합니다. Codef API 키를 발급받으면 자동 동기화가 가능합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && <p className="text-muted-foreground py-8 text-center">불러오는 중...</p>}

      {connections && connections.length === 0 && (
        <p className="text-muted-foreground py-8 text-center">등록된 은행/카드 연결이 없습니다</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections?.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">{c.institution_name}</h3>
                    {c.account_identifier && <p className="text-xs text-muted-foreground">{c.account_identifier}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === "connected" ? "default" : "secondary"}>
                    {statusLabel[c.status] ?? c.status}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => deleteConn.mutate(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                <span>제공자: {c.provider === "codef" ? "Codef" : "수동"}</span>
                {c.last_synced_at && <span className="ml-3">마지막 동기화: {new Date(c.last_synced_at).toLocaleDateString("ko-KR")}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>은행/카드 연결 추가</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-sm font-medium">카드사/은행</label>
              <select className="w-full h-10 rounded-md border border-input px-3 text-sm" value={bankName} onChange={(e) => setBankName(e.target.value)} required>
                <option value="">선택</option>
                {KOREAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">계좌/카드번호 (선택)</label>
              <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="****-****-****-1234" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>취소</Button>
              <Button type="submit" disabled={createConn.isPending}>추가</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
