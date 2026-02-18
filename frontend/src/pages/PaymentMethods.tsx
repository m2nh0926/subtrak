import { Link } from "react-router-dom";
import { Plus, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { usePaymentMethods } from "@/lib/hooks";

const typeLabel: Record<string, string> = { credit: "신용", debit: "체크", bank_transfer: "이체" };

export default function PaymentMethods() {
  const { data: methods, isLoading } = usePaymentMethods();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">결제수단</h2>
        <Link to="/cards/new"><Button><Plus className="mr-2 h-4 w-4" />카드 추가</Button></Link>
      </div>

      {isLoading && <p className="text-center text-muted-foreground py-8">불러오는 중...</p>}
      {methods && methods.length === 0 && <EmptyState title="등록된 결제수단이 없습니다" description="카드를 추가해보세요" />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {methods?.map((m) => {
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
    </div>
  );
}
