import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ExternalLink, Pencil, Trash2, Plus, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useSubscription, useCancelSubscription, usePriceHistory,
  useSubscriptionMembers, useAddSubscriptionMember, useRemoveSubscriptionMember,
} from "@/lib/hooks";

const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(Math.round(n)) + "원";
const cycleLabel: Record<string, string> = { monthly: "월간", yearly: "연간", weekly: "주간", quarterly: "분기별" };

export default function SubscriptionDetail() {
  const { id } = useParams();
  const subId = Number(id) || 0;
  const navigate = useNavigate();
  const { data: sub, isLoading } = useSubscription(subId);
  const cancel = useCancelSubscription();
  const { data: history } = usePriceHistory(subId);
  const { data: members } = useSubscriptionMembers(subId);
  const addMember = useAddSubscriptionMember();
  const removeMember = useRemoveSubscriptionMember();
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: "", email: "", share_amount: "" });

  if (isLoading || !sub) return <p className="py-8 text-center text-muted-foreground">불러오는 중...</p>;

  const handleCancel = async () => {
    await cancel.mutateAsync({ id: sub.id, reason: reason || undefined });
    setShowCancel(false);
    navigate("/subscriptions");
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    await addMember.mutateAsync({
      subId: sub.id,
      name: memberForm.name,
      email: memberForm.email || undefined,
      share_amount: memberForm.share_amount ? Number(memberForm.share_amount) : undefined,
    });
    setMemberForm({ name: "", email: "", share_amount: "" });
    setShowAddMember(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {sub.logo_url && <img src={sub.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain" />}
          <h2 className="text-2xl font-bold">{sub.name}</h2>
        </div>
        <div className="flex gap-2">
          <Link to={`/subscriptions/${sub.id}/edit`}>
            <Button variant="outline" size="sm"><Pencil className="mr-1 h-4 w-4" />수정</Button>
          </Link>
          {sub.is_active && (
            <Button variant="destructive" size="sm" onClick={() => setShowCancel(true)}>
              <Trash2 className="mr-1 h-4 w-4" />해지하기
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>기본 정보</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Row label="금액" value={`${fmt(sub.amount)} / ${cycleLabel[sub.billing_cycle] ?? sub.billing_cycle}`} />
          <Row label="상태" value={sub.is_active ? "활성" : "비활성"} />
          <Row label="자동갱신" value={sub.auto_renew ? "예" : "아니오"} />
          <Row label="다음 결제일" value={sub.next_payment_date} />
          <Row label="시작일" value={sub.start_date} />
          {sub.category_name && <Row label="카테고리" value={sub.category_name} />}
          {sub.payment_method_name && <Row label="결제수단" value={`${sub.payment_method_name} ${sub.payment_method_last_four ? `(*${sub.payment_method_last_four})` : ""}`} />}
          {sub.notes && <Row label="메모" value={sub.notes} />}
        </CardContent>
      </Card>

      {/* Price History */}
      {history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />가격 변경 이력</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm p-2 rounded-lg border">
                  <span className="text-muted-foreground">{new Date(h.changed_at).toLocaleDateString("ko-KR")}</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-muted-foreground">{fmt(h.old_amount)}</span>
                    <span>→</span>
                    <span className="font-bold">{fmt(h.new_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />가족/공유 멤버</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowAddMember(true)}><Plus className="mr-1 h-4 w-4" />멤버 추가</Button>
          </div>
        </CardHeader>
        <CardContent>
          {members && members.length === 0 && <p className="text-sm text-muted-foreground">등록된 멤버가 없습니다</p>}
          <div className="space-y-2">
            {members?.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border">
                <div>
                  <span className="text-sm font-medium">{m.name}</span>
                  {m.email && <span className="text-xs text-muted-foreground ml-2">{m.email}</span>}
                  {m.is_owner && <Badge variant="default" className="ml-2">소유자</Badge>}
                  {m.share_amount && <span className="text-xs text-muted-foreground ml-2">{fmt(m.share_amount)}</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeMember.mutate({ subId: sub.id, memberId: m.id })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {(sub.cancel_url || sub.cancel_method) && (
        <Card>
          <CardHeader><CardTitle>해지 정보</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {sub.cancel_url && (
              <div>
                <a href={sub.cancel_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline text-sm">
                  해지 페이지로 이동 <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {sub.cancel_method && (
              <div>
                <p className="text-sm font-medium mb-1">해지 방법</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sub.cancel_method}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancel Dialog */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader><DialogTitle>구독 해지</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{sub.name} 구독을 해지하시겠습니까?</p>
          <Separator />
          <div>
            <label className="text-sm font-medium">해지 사유 (선택)</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="해지 사유를 입력하세요..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(false)}>취소</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancel.isPending}>해지 확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader><DialogTitle>멤버 추가</DialogTitle></DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="text-sm font-medium">이름 *</label>
              <Input value={memberForm.name} onChange={(e) => setMemberForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium">이메일</label>
              <Input type="email" value={memberForm.email} onChange={(e) => setMemberForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">분담금</label>
              <Input type="number" value={memberForm.share_amount} onChange={(e) => setMemberForm((p) => ({ ...p, share_amount: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddMember(false)}>취소</Button>
              <Button type="submit" disabled={addMember.isPending}>추가</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="outline">{value}</Badge>
    </div>
  );
}
