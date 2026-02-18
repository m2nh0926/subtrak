import { useState } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useSharingPlatforms, useSharedSubscriptions, useCreateSharedSubscription,
  useDeleteSharedSubscription, useSubscriptions,
} from "@/lib/hooks";

const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(Math.round(n)) + "원";
const statusLabel: Record<string, string> = { active: "활성", matching: "매칭 중", ended: "종료" };

export default function SharingPlatforms() {
  const { data: platforms } = useSharingPlatforms();
  const { data: shared, isLoading } = useSharedSubscriptions();
  const { data: subs } = useSubscriptions({ is_active: true });
  const createShared = useCreateSharedSubscription();
  const deleteShared = useDeleteSharedSubscription();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    subscription_id: "", platform_id: "", my_role: "파티원",
    monthly_share_cost: "", total_members: "1", party_status: "active",
    deposit_paid: "", platform_fee: "", notes: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await createShared.mutateAsync({
      subscription_id: Number(form.subscription_id),
      platform_id: Number(form.platform_id),
      my_role: form.my_role,
      monthly_share_cost: Number(form.monthly_share_cost),
      total_members: Number(form.total_members),
      party_status: form.party_status,
      deposit_paid: form.deposit_paid ? Number(form.deposit_paid) : null,
      platform_fee: form.platform_fee ? Number(form.platform_fee) : null,
      external_id: null,
      notes: form.notes || null,
    });
    setShowAdd(false);
    setForm({ subscription_id: "", platform_id: "", my_role: "파티원", monthly_share_cost: "", total_members: "1", party_status: "active", deposit_paid: "", platform_fee: "", notes: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">구독 공유</h2>
        <Button onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" />공유 추가</Button>
      </div>

      {platforms && platforms.length > 0 && (
        <Card>
          <CardHeader><CardTitle>공유 플랫폼</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {platforms.map((p) => (
                <a key={p.id} href={p.url ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-accent transition-colors">
                  <span className="font-medium text-sm">{p.name}</span>
                  {p.url && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-muted-foreground py-8 text-center">불러오는 중...</p>}

      {shared && shared.length === 0 && (
        <p className="text-muted-foreground py-8 text-center">등록된 공유 구독이 없습니다</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shared?.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{s.subscription_name}</h3>
                  <p className="text-sm text-muted-foreground">{s.platform_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.party_status === "active" ? "default" : "secondary"}>
                    {statusLabel[s.party_status] ?? s.party_status}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => deleteShared.mutate(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">내 역할</span><span>{s.my_role}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">월 분담금</span><span className="font-bold">{fmt(s.monthly_share_cost)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">전체 인원</span><span>{s.total_members}명</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>공유 구독 추가</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-sm font-medium">구독 서비스</label>
              <select className="w-full h-10 rounded-md border border-input px-3 text-sm" value={form.subscription_id} onChange={(e) => set("subscription_id", e.target.value)} required>
                <option value="">선택</option>
                {subs?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">공유 플랫폼</label>
              <select className="w-full h-10 rounded-md border border-input px-3 text-sm" value={form.platform_id} onChange={(e) => set("platform_id", e.target.value)} required>
                <option value="">선택</option>
                {platforms?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">내 역할</label>
                <select className="w-full h-10 rounded-md border border-input px-3 text-sm" value={form.my_role} onChange={(e) => set("my_role", e.target.value)}>
                  <option value="파티장">파티장</option>
                  <option value="파티원">파티원</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">월 분담금</label>
                <Input type="number" value={form.monthly_share_cost} onChange={(e) => set("monthly_share_cost", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">전체 인원</label>
                <Input type="number" min="1" value={form.total_members} onChange={(e) => set("total_members", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">상태</label>
                <select className="w-full h-10 rounded-md border border-input px-3 text-sm" value={form.party_status} onChange={(e) => set("party_status", e.target.value)}>
                  <option value="active">활성</option>
                  <option value="matching">매칭 중</option>
                  <option value="ended">종료</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>취소</Button>
              <Button type="submit" disabled={createShared.isPending}>추가</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
