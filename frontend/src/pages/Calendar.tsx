import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCalendarMonth } from "@/lib/hooks";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday, isSameDay,
} from "date-fns";
import { ko } from "date-fns/locale";

const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(Math.round(n)) + "원";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function Calendar() {
  const [current, setCurrent] = useState(new Date());
  const year = current.getFullYear();
  const month = current.getMonth() + 1;
  const { data: cal, isLoading } = useCalendarMonth(year, month);

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const prev = () => setCurrent(new Date(year, month - 2, 1));
  const next = () => setCurrent(new Date(year, month, 1));

  const eventsForDay = (day: Date) =>
    cal?.events.filter((e) => isSameDay(new Date(e.date), day)) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">캘린더</h2>
        {cal && <Badge variant="outline" className="text-base">이번 달 총 {fmt(cal.total_amount)}</Badge>}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
            <CardTitle>{format(current, "yyyy년 M월", { locale: ko })}</CardTitle>
            <Button variant="ghost" size="sm" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-center text-muted-foreground py-8">불러오는 중...</p>}

          <div className="grid grid-cols-7 gap-px">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {days.map((day) => {
              const events = eventsForDay(day);
              const inMonth = isSameMonth(day, current);
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-20 p-1 border rounded-md ${!inMonth ? "opacity-30" : ""} ${isToday(day) ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="text-xs font-medium mb-1">{format(day, "d")}</div>
                  <div className="space-y-0.5">
                    {events.slice(0, 3).map((e, i) => (
                      <div key={i} className="text-[10px] leading-tight truncate px-1 py-0.5 rounded bg-primary/10 text-primary">
                        {e.subscription_name}
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{events.length - 3}개</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {cal && cal.events.length > 0 && (
        <Card>
          <CardHeader><CardTitle>이번 달 결제 예정</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cal.events.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{e.date}</span>
                    <span className="font-medium">{e.subscription_name}</span>
                  </div>
                  <span className="font-bold">{fmt(e.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
