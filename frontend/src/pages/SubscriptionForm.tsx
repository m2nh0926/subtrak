import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSubscription, useCreateSubscription, useUpdateSubscription, useCategories, usePaymentMethods, useLogoSearch, useSubscriptionPresets } from "@/lib/hooks";
import type { SubscriptionPreset } from "@/lib/types";

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SubscriptionForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: existing } = useSubscription(Number(id) || 0);
  const categories = useCategories();
  const paymentMethods = usePaymentMethods();
  const presets = useSubscriptionPresets();
  const create = useCreateSubscription();
  const update = useUpdateSubscription();

  const [form, setForm] = useState({
    name: "", amount: "", currency: "KRW", billing_cycle: "monthly",
    billing_day: "", next_payment_date: "", start_date: new Date().toISOString().slice(0, 10),
    category_id: "", payment_method_id: "", cancel_url: "", cancel_method: "", notes: "", logo_url: "",
  });

  const [selectedPreset, setSelectedPreset] = useState<SubscriptionPreset | null>(null);
  const [presetSearch, setPresetSearch] = useState("");

  const filteredPresets = presets.data?.filter((p) =>
    p.name.toLowerCase().includes(presetSearch.toLowerCase())
  ) ?? [];

  const applyPreset = (preset: SubscriptionPreset, planIdx: number) => {
    const plan = preset.plans[planIdx];
    const matchingCategory = categories.data?.find((c) => c.name === preset.category);
    setForm((prev) => ({
      ...prev,
      name: preset.name,
      amount: String(plan.amount),
      billing_cycle: preset.billing_cycle,
      notes: plan.plan !== "기본" ? plan.plan : "",
      category_id: matchingCategory ? String(matchingCategory.id) : prev.category_id,
    }));
    setSelectedPreset(null);
    setPresetSearch("");
  };

  const debouncedName = useDebounce(form.name, 500);
  const { data: logoResult } = useLogoSearch(debouncedName);

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name, amount: String(existing.amount), currency: existing.currency,
        billing_cycle: existing.billing_cycle, billing_day: existing.billing_day ? String(existing.billing_day) : "",
        next_payment_date: existing.next_payment_date, start_date: existing.start_date,
        category_id: existing.category_id ? String(existing.category_id) : "",
        payment_method_id: existing.payment_method_id ? String(existing.payment_method_id) : "",
        cancel_url: existing.cancel_url ?? "", cancel_method: existing.cancel_method ?? "",
        notes: existing.notes ?? "", logo_url: existing.logo_url ?? "",
      });
    }
  }, [existing, isEdit]);

  // Auto-fill logo when found and not manually set
  useEffect(() => {
    if (logoResult?.logo_url && !form.logo_url && !isEdit) {
      setForm((prev) => ({ ...prev, logo_url: logoResult.logo_url }));
    }
  }, [logoResult, form.logo_url, isEdit]);

  const set = useCallback((key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value })), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name, amount: Number(form.amount), currency: form.currency,
      billing_cycle: form.billing_cycle, billing_day: form.billing_day ? Number(form.billing_day) : null,
      next_payment_date: form.next_payment_date, start_date: form.start_date,
      category_id: form.category_id ? Number(form.category_id) : null,
      payment_method_id: form.payment_method_id ? Number(form.payment_method_id) : null,
      cancel_url: form.cancel_url || null, cancel_method: form.cancel_method || null,
      notes: form.notes || null, logo_url: form.logo_url || null,
    };
    if (isEdit) {
      await update.mutateAsync({ id: Number(id), ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    navigate("/subscriptions");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader><CardTitle>{isEdit ? "구독 수정" : "새 구독 추가"}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isEdit && (
              <div className="space-y-2">
                <label className="text-sm font-medium">서비스 프리셋으로 빠른 입력</label>
                <Input
                  value={presetSearch}
                  onChange={(e) => { setPresetSearch(e.target.value); setSelectedPreset(null); }}
                  placeholder="서비스명 검색 (넷플릭스, 스포티파이...)"
                />
                {presetSearch && filteredPresets.length > 0 && !selectedPreset && (
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {filteredPresets.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                        onClick={() => setSelectedPreset(p)}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.category}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedPreset && (
                  <div className="border rounded-md p-3 bg-accent/30 space-y-2">
                    <p className="text-sm font-medium">{selectedPreset.name} — 요금제 선택</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPreset.plans.map((plan, i) => (
                        <Button
                          key={i}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applyPreset(selectedPreset, i)}
                        >
                          {plan.plan} · ₩{plan.amount.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {presetSearch && filteredPresets.length === 0 && (
                  <p className="text-xs text-muted-foreground">일치하는 프리셋이 없습니다. 아래에 직접 입력하세요.</p>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium">서비스명 *</label>
              <div className="flex gap-3 items-center">
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} required className="flex-1" />
                {form.logo_url && <img src={form.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain border" />}
              </div>
              {logoResult && !form.logo_url && (
                <button
                  type="button"
                  className="text-xs text-primary underline mt-1"
                  onClick={() => set("logo_url", logoResult.logo_url)}
                >
                  로고 자동 설정: {logoResult.source}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">금액 *</label>
                <Input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium">결제 주기</label>
                <select className="w-full h-10 rounded-md border border-input px-3 text-sm" value={form.billing_cycle} onChange={(e) => set("billing_cycle", e.target.value)}>
                  <option value="monthly">월간</option>
                  <option value="yearly">연간</option>
                  <option value="weekly">주간</option>
                  <option value="quarterly">분기별</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">결제일 (매월)</label>
                <Input type="number" min="1" max="31" value={form.billing_day} onChange={(e) => set("billing_day", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">다음 결제일 *</label>
                <Input type="date" value={form.next_payment_date} onChange={(e) => set("next_payment_date", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">시작일 *</label>
                <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium">카테고리</label>
                <select className="w-full h-10 rounded-md border border-input px-3 text-sm" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                  <option value="">선택 안 함</option>
                  {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">결제수단</label>
              <select className="w-full h-10 rounded-md border border-input px-3 text-sm" value={form.payment_method_id} onChange={(e) => set("payment_method_id", e.target.value)}>
                <option value="">선택 안 함</option>
                {paymentMethods.data?.map((p) => <option key={p.id} value={p.id}>{p.name} {p.card_last_four ? `(*${p.card_last_four})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">로고 URL</label>
              <Input value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="자동으로 검색되거나 직접 입력" />
            </div>
            <div>
              <label className="text-sm font-medium">해지 URL</label>
              <Input value={form.cancel_url} onChange={(e) => set("cancel_url", e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-medium">해지 방법</label>
              <textarea className="w-full min-h-20 rounded-md border border-input px-3 py-2 text-sm" value={form.cancel_method} onChange={(e) => set("cancel_method", e.target.value)} placeholder="해지 절차를 기록하세요..." />
            </div>
            <div>
              <label className="text-sm font-medium">메모</label>
              <textarea className="w-full min-h-16 rounded-md border border-input px-3 py-2 text-sm" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={create.isPending || update.isPending}>{isEdit ? "저장" : "추가"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>취소</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
