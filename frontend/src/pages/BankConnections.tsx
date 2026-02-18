import { useState } from "react";
import { Plus, Trash2, Building2, CreditCard, Search, Download, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useBankConnections, useCreateBankConnection, useDeleteBankConnection,
  useCodefStatus, useCodefCardCompanies, useCodefRegisterCard,
  useCodefDetect, useCodefImport, useCodefDeleteConnection,
} from "@/lib/hooks";
import type { DetectedSubscription } from "@/lib/types";

const statusLabel: Record<string, string> = { connected: "연결됨", disconnected: "연결 해제", error: "오류" };
const billingCycleLabel: Record<string, string> = { monthly: "월", yearly: "년", weekly: "주" };

export default function BankConnections() {
  const { data: connections, isLoading } = useBankConnections();
  const { data: codefStatus } = useCodefStatus();
  const { data: cardCompanies } = useCodefCardCompanies();
  const createConn = useCreateBankConnection();
  const deleteConn = useDeleteBankConnection();
  const registerCard = useCodefRegisterCard();
  const detectSubs = useCodefDetect();
  const importSubs = useCodefImport();
  const deleteCodefConn = useCodefDeleteConnection();

  // Manual add dialog
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountId, setAccountId] = useState("");

  // Codef register dialog
  const [showCodefRegister, setShowCodefRegister] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [birthday, setBirthday] = useState("");
  const [registerError, setRegisterError] = useState("");

  // Detection dialog
  const [showDetect, setShowDetect] = useState(false);
  const [detectingConnId, setDetectingConnId] = useState<number | null>(null);
  const [detectedSubs, setDetectedSubs] = useState<DetectedSubscription[]>([]);
  const [selectedSubs, setSelectedSubs] = useState<Set<number>>(new Set());
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);

  const isCodefConfigured = codefStatus?.configured ?? false;

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await createConn.mutateAsync({
      institution_name: bankName,
      provider: "manual",
      account_identifier: accountId || undefined,
    });
    setBankName("");
    setAccountId("");
    setShowManualAdd(false);
  };

  const handleCodefRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    try {
      await registerCard.mutateAsync({
        organization_code: selectedOrg,
        login_id: loginId,
        login_password: loginPw,
        birthday: birthday || undefined,
      });
      setSelectedOrg("");
      setLoginId("");
      setLoginPw("");
      setBirthday("");
      setShowCodefRegister(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setRegisterError(axiosErr?.response?.data?.detail || "카드 등록에 실패했습니다");
    }
  };

  const handleDetect = async (connId: number) => {
    setDetectingConnId(connId);
    setShowDetect(true);
    setDetectedSubs([]);
    setSelectedSubs(new Set());
    setTotalAnalyzed(0);

    try {
      const result = await detectSubs.mutateAsync({ bank_connection_id: connId, months_back: 6 });
      setDetectedSubs(result.detected);
      setTotalAnalyzed(result.total_transactions_analyzed);
      setSelectedSubs(new Set(result.detected.map((_, i) => i)));
    } catch {
      // Error handled by mutation
    }
  };

  const handleImport = async () => {
    if (!detectingConnId || selectedSubs.size === 0) return;
    const subsToImport = detectedSubs
      .filter((_, i) => selectedSubs.has(i))
      .map((s) => ({ name: s.name, amount: s.amount, billing_cycle: s.billing_cycle, billing_day: s.billing_day }));
    try {
      await importSubs.mutateAsync({ bank_connection_id: detectingConnId, subscriptions: subsToImport });
      setShowDetect(false);
    } catch {
      // Error handled by mutation
    }
  };

  const toggleSub = (idx: number) => {
    setSelectedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const codefConnections = connections?.filter((c) => c.provider === "codef") ?? [];
  const manualConnections = connections?.filter((c) => c.provider !== "codef") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">카드 연동</h2>
        <div className="flex gap-2">
          {isCodefConfigured && (
            <Button onClick={() => setShowCodefRegister(true)}>
              <CreditCard className="mr-2 h-4 w-4" />Codef 카드 등록
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowManualAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />수동 추가
          </Button>
        </div>
      </div>

      {/* Codef Status Banner */}
      {isCodefConfigured ? (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Codef API 연동 활성화</p>
                <p className="text-xs text-muted-foreground mt-1">
                  카드사 로그인 정보로 카드를 등록하면 구독 내역을 자동으로 불러올 수 있습니다.
                  {codefStatus?.sandbox_mode && " (샌드박스 모드)"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Codef API 미설정</p>
                <p className="text-xs text-muted-foreground mt-1">
                  현재는 수동 등록만 지원합니다. 관리자가 Codef API 키를 설정하면 자동 동기화가 가능합니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-muted-foreground py-8 text-center">불러오는 중...</p>}

      {/* Codef Connections */}
      {codefConnections.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Codef 연동 카드</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {codefConnections.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">{c.institution_name}</h3>
                        <p className="text-xs text-muted-foreground">Codef 연동</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={c.status === "connected" ? "default" : "secondary"}>
                        {statusLabel[c.status] ?? c.status}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => deleteCodefConn.mutate(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDetect(c.id)}>
                      <Search className="mr-1.5 h-3.5 w-3.5" />구독 탐색
                    </Button>
                  </div>
                  {c.last_synced_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      마지막 동기화: {new Date(c.last_synced_at).toLocaleString("ko-KR")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Manual Connections */}
      {manualConnections.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">수동 등록 카드</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {manualConnections.map((c) => (
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
                      <Badge variant="outline">수동</Badge>
                      <Button variant="ghost" size="sm" onClick={() => deleteConn.mutate(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {connections && connections.length === 0 && (
        <p className="text-muted-foreground py-8 text-center">등록된 카드가 없습니다</p>
      )}

      {/* Manual Add Dialog */}
      <Dialog open={showManualAdd} onOpenChange={setShowManualAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>수동 카드 추가</DialogTitle></DialogHeader>
          <form onSubmit={handleManualAdd} className="space-y-4">
            <div>
              <label className="text-sm font-medium">카드사/은행</label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="예: 삼성카드" required />
            </div>
            <div>
              <label className="text-sm font-medium">카드번호 (선택)</label>
              <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="****-****-****-1234" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowManualAdd(false)}>취소</Button>
              <Button type="submit" disabled={createConn.isPending}>추가</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Codef Register Dialog */}
      <Dialog open={showCodefRegister} onOpenChange={setShowCodefRegister}>
        <DialogContent>
          <DialogHeader><DialogTitle>Codef 카드 등록</DialogTitle></DialogHeader>
          <form onSubmit={handleCodefRegister} className="space-y-4">
            <div>
              <label className="text-sm font-medium">카드사 선택</label>
              <select
                className="w-full h-10 rounded-md border border-input px-3 text-sm"
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                required
              >
                <option value="">카드사를 선택하세요</option>
                {cardCompanies?.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">카드사 로그인 ID</label>
              <Input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="카드사 홈페이지 아이디" required />
            </div>
            <div>
              <label className="text-sm font-medium">카드사 로그인 비밀번호</label>
              <Input type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} placeholder="카드사 홈페이지 비밀번호" required />
            </div>
            <div>
              <label className="text-sm font-medium">생년월일 (선택)</label>
              <Input value={birthday} onChange={(e) => setBirthday(e.target.value)} placeholder="YYMMDD (예: 900101)" />
            </div>
            {registerError && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">{registerError}</div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCodefRegister(false); setRegisterError(""); }}>취소</Button>
              <Button type="submit" disabled={registerCard.isPending}>
                {registerCard.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                등록
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detection / Import Dialog */}
      <Dialog open={showDetect} onOpenChange={(open) => { if (!open) setShowDetect(false); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>구독 탐색 결과</DialogTitle></DialogHeader>

          {detectSubs.isPending && (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-3">카드 사용 내역을 분석 중...</p>
            </div>
          )}

          {detectSubs.isError && (
            <div className="text-sm text-red-500 bg-red-50 p-4 rounded-md">
              거래 내역을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.
            </div>
          )}

          {!detectSubs.isPending && detectedSubs.length === 0 && totalAnalyzed > 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                {totalAnalyzed}건의 거래 내역을 분석했지만 반복 결제 패턴을 찾지 못했습니다.
              </p>
            </div>
          )}

          {detectedSubs.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {totalAnalyzed}건의 거래에서 {detectedSubs.length}개의 구독을 발견했습니다.
                가져올 항목을 선택하세요.
              </p>

              <div className="space-y-2">
                {detectedSubs.map((sub, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSubs.has(idx)
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => toggleSub(idx)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubs.has(idx)}
                      onChange={() => toggleSub(idx)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{sub.name}</span>
                        <span className="font-semibold">₩{sub.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{billingCycleLabel[sub.billing_cycle] ?? sub.billing_cycle} 결제</span>
                        <span>매월 {sub.billing_day}일</span>
                        <span>{sub.occurrence_count}회 결제됨</span>
                        <span>마지막: {sub.last_payment_date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDetect(false)}>취소</Button>
                <Button onClick={handleImport} disabled={selectedSubs.size === 0 || importSubs.isPending}>
                  {importSubs.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Download className="mr-2 h-4 w-4" />
                  {selectedSubs.size}개 가져오기
                </Button>
              </DialogFooter>

              {importSubs.isSuccess && importSubs.data && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm">
                  <p className="font-medium text-green-800">
                    {importSubs.data.imported}개 구독 등록 완료
                    {importSubs.data.skipped > 0 && `, ${importSubs.data.skipped}개 건너뜀`}
                  </p>
                  {importSubs.data.details.map((d, i) => (
                    <p key={i} className="text-green-700 text-xs mt-1">{d}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
