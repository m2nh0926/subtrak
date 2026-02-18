import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreatePaymentMethod } from "@/lib/hooks";

export default function PaymentMethodForm() {
  const navigate = useNavigate();
  const create = useCreatePaymentMethod();
  const [form, setForm] = useState({ name: "", card_last_four: "", card_type: "credit", expiry_date: "", notes: "" });

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      name: form.name, card_type: form.card_type,
      card_last_four: form.card_last_four || null,
      expiry_date: form.expiry_date || null,
      notes: form.notes || null,
    });
    navigate("/cards");
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader><CardTitle>새 결제수단 추가</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">카드 이름 *</label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="신한 딥드림" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">끝 4자리</label>
                <Input maxLength={4} value={form.card_last_four} onChange={(e) => set("card_last_four", e.target.value)} placeholder="1234" />
              </div>
              <div>
                <label className="text-sm font-medium">유형</label>
                <select className="w-full h-10 rounded-md border border-input px-3 text-sm" value={form.card_type} onChange={(e) => set("card_type", e.target.value)}>
                  <option value="credit">신용카드</option>
                  <option value="debit">체크카드</option>
                  <option value="bank_transfer">계좌이체</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">만료일</label>
              <Input type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">메모</label>
              <textarea className="w-full min-h-16 rounded-md border border-input px-3 py-2 text-sm" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={create.isPending}>추가</Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>취소</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
