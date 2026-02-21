import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, CreditCard, Trash2, Search, Download, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import {
  usePaymentMethods,
  useCodefStatus,
  useCodefCardCompanies,
  useCodefRegisterCard,
  useCodefDetect,
  useCodefImport,
  useCodefDeleteConnection,
} from "@/lib/hooks";
import type { DetectedSubscription } from "@/lib/types";

const typeLabel: Record<string, string> = { credit: "신용", debit: "체크", bank_transfer: "이체" };
const statusLabel: Record<string, string> = { connected: "연결됨", disconnected: "연결 해제", error: "오류" };
const billingCycleLabel: Record<string, string> = { monthly: "월", yearly: "년", weekly: "주" };

export default function PaymentMethods() {
  const { data: methods, isLoading } = usePaymentMethods();
  const { data: codefStatus } = useCodefStatus();
  const { data: cardCompanies } = useCodefCardCompanies();
  const registerCard = useCodefRegisterCard();
  const detectSubs = useCodefDetect();
  const importSubs = useCodefImport();
  const deleteCodefConn = useCodefDeleteConnection();

  const [showCodefRegister, setShowCodefRegister] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [birthday, setBirthday] = useState("");
  const [cardNo, setCardNo] = useState("");
  const [cardPassword, setCardPassword] = useState("");
  const [registerError, setRegisterError] = useState("");

  const selectedOrgConfig = cardCompanies?.find((c) => c.code === selectedOrg);
  const requiredFields = selectedOrgConfig?.required_fields ?? [];
  const optionalFields = selectedOrgConfig?.optional_fields ?? [];
  const allFields = [...requiredFields, ...optionalFields];
  const orgNotes = selectedOrgConfig?.notes ?? "";

  const [showDetect, setShowDetect] = useState(false);
  const [detectingConnId, setDetectingConnId] = useState<number | null>(null);
  const [detectedSubs, setDetectedSubs] = useState<DetectedSubscription[]>([]);
  const [selectedSubs, setSelectedSubs] = useState<Set<number>>(new Set());
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);

  const isCodefConfigured = codefStatus?.configured ?? false;

  const handleCodefRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    try {
      await registerCard.mutateAsync({
        organization_code: selectedOrg,
        login_id: loginId,
        login_password: loginPw,
        birthday: birthday || undefined,
        card_no: cardNo || undefined,
        card_password: cardPassword || undefined,
      });
      setSelectedOrg(""); setLoginId(""); setLoginPw(""); setBirthday(""); setCardNo(""); setCardPassword("");
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
    } catch (_) { void _; }
  };

  const handleImport = async () => {
    if (!detectingConnId || selectedSubs.size === 0) return;
    const subsToImport = detectedSubs
      .filter((_, i) => selectedSubs.has(i))
      .map((s) => ({ name: s.name, amount: s.amount, billing_cycle: s.billing_cycle, billing_day: s.billing_day }));
    try {
      await importSubs.mutateAsync({ bank_connection_id: detectingConnId, subscriptions: subsToImport });
      setShowDetect(false);
    } catch (_) { void _; }
  };

  const toggleSub = (idx: number) => {
    setSelectedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const codefMethods = methods?.filter((m) => m.bank_connection_id != null) ?? [];
  const manualMethods = methods?.filter((m) => m.bank_connection_id == null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">결제수단</h2>
        <div className="flex gap-2">
          {isCodefConfigured && (
            <Button onClick={() => setShowCodefRegister(true)}>
              <CreditCard className="mr-2 h-4 w-4" />Codef 카드 등록
            </Button>
          )}
          <Link to="/cards/new">
            <Button variant="outline"><Plus className="mr-2 h-4 w-4" />수동 추가</Button>
          </Link>
        </div>
      </div>

      {isCodefConfigured ? (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Codef API 연동 활성화</p>
                <p className="text-xs text-muted-foreground mt-1">
                  카드사 로그인 정보로 카드를 등록하면 구독 내역을 자동으로 불러올 수 있습니다.
                  {codefStatus?.demo_mode && " (데모 모드)"}
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

      {isLoading && <p className="text-center text-muted-foreground py-8">불러오는 중...</p>}
      {methods && methods.length === 0 && (
        <EmptyState title="등록된 결제수단이 없습니다" description="카드를 추가해보세요" />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {codefMethods.map((m) => (
          <Card key={m.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                   <CreditCard className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">{m.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {m.card_last_four ? `**** ${m.card_last_four}` : "Codef 연동"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={m.bank_connection_status === "connected" ? "default" : "secondary"}>
                    {statusLabel[m.bank_connection_status ?? ""] ?? m.bank_connection_status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => m.bank_connection_id && deleteCodefConn.mutate(m.bank_connection_id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => m.bank_connection_id && handleDetect(m.bank_connection_id)}
                >
                  <Search className="mr-1.5 h-3.5 w-3.5" />구독 탐색
                </Button>
              </div>
              {m.bank_connection_last_synced_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  마지막 동기화: {new Date(m.bank_connection_last_synced_at).toLocaleString("ko-KR")}
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {manualMethods.map((m) => {
          const isExpiring = m.expiry_date && new Date(m.expiry_date) <= new Date(Date.now() + 60 * 86400000);
          return (
            <Link key={m.id} to={`/cards/${m.id}`}>
              <Card className={`hover:shadow-md transition-shadow cursor-pointer ${isExpiring ? "border-yellow-500" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <CreditCard className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">{m.name}</h3>
                      {m.card_last_four && <p className="text-sm text-muted-foreground">**** {m.card_last_four}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{typeLabel[m.card_type] ?? m.card_type}</Badge>
                    {!m.is_active && <Badge variant="secondary">비활성</Badge>}
                    {isExpiring && <Badge variant="destructive">만료 임박</Badge>}
                  </div>
                  {m.expiry_date && <p className="text-xs text-muted-foreground mt-2">만료일: {m.expiry_date}</p>}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Dialog open={showCodefRegister} onOpenChange={setShowCodefRegister}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Codef 카드 등록</DialogTitle>
            <DialogDescription>카드사 로그인 정보로 카드를 등록합니다.</DialogDescription>
          </DialogHeader>
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
            {orgNotes && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-md">
                ⚠ {orgNotes}
              </div>
            )}
            <div>
              <label className="text-sm font-medium">카드사 로그인 ID</label>
              <Input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="카드사 홈페이지 아이디" required />
            </div>
            <div>
              <label className="text-sm font-medium">카드사 로그인 비밀번호</label>
              <Input type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} placeholder="카드사 홈페이지 비밀번호" required />
            </div>
            {allFields.includes("cardNo") && (
              <div>
                <label className="text-sm font-medium">
                  카드번호{requiredFields.includes("cardNo") && <span className="text-red-500 ml-1">*</span>}
                </label>
                <Input
                  value={cardNo}
                  onChange={(e) => setCardNo(e.target.value)}
                  placeholder="카드번호 (숫자만 입력)"
                  required={requiredFields.includes("cardNo")}
                />
              </div>
            )}
            {allFields.includes("cardPassword") && (
              <div>
                <label className="text-sm font-medium">
                  카드 비밀번호{requiredFields.includes("cardPassword") && <span className="text-red-500 ml-1">*</span>}
                </label>
                <Input
                  type="password"
                  value={cardPassword}
                  onChange={(e) => setCardPassword(e.target.value)}
                  placeholder="카드 비밀번호 (숫자 4자리)"
                  required={requiredFields.includes("cardPassword")}
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">
                생년월일{requiredFields.includes("birthDate") ? <span className="text-red-500 ml-1">*</span> : " (선택)"}
              </label>
              <Input
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                placeholder="YYMMDD (예: 900101)"
                required={requiredFields.includes("birthDate")}
              />
            </div>
            {registerError && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">{registerError}</div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCodefRegister(false); setRegisterError(""); setCardNo(""); setCardPassword(""); }}>취소</Button>
              <Button type="submit" disabled={registerCard.isPending}>
                {registerCard.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                등록
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetect} onOpenChange={(open) => { if (!open) setShowDetect(false); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>구독 탐색 결과</DialogTitle>
            <DialogDescription>카드 사용 내역에서 반복 결제 패턴을 탐색합니다.</DialogDescription>
          </DialogHeader>

          {detectSubs.isPending && (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-3">카드 사용 내역을 분석 중...</p>
            </div>
          )}

          {detectSubs.isError && (
            <div className="text-sm text-red-500 bg-red-50 p-4 rounded-md">
              <p className="font-medium">거래 내역을 불러오는 데 실패했습니다.</p>
              <p className="mt-1 text-xs">
                {(detectSubs.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                  || "Codef 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요."}
              </p>
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
                      selectedSubs.has(idx) ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
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
