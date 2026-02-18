import csv
import io
from datetime import date
from decimal import Decimal

from fastapi import UploadFile
from openpyxl import Workbook
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import Subscription
from app.schemas.data_export import ImportResult

EXPORT_COLUMNS = ["name", "amount", "currency", "billing_cycle", "next_payment_date", "start_date", "is_active", "notes"]


def export_subscriptions_csv(subscriptions: list) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(EXPORT_COLUMNS)
    for s in subscriptions:
        writer.writerow([s.name, str(s.amount), s.currency, s.billing_cycle, str(s.next_payment_date), str(s.start_date), s.is_active, s.notes or ""])
    return output.getvalue()


def export_subscriptions_xlsx(subscriptions: list) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "구독 목록"
    ws.append(EXPORT_COLUMNS)
    for s in subscriptions:
        ws.append([s.name, float(s.amount), s.currency, s.billing_cycle, str(s.next_payment_date), str(s.start_date), s.is_active, s.notes or ""])
    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()


async def import_subscriptions_from_file(file: UploadFile, user_id: int, db: AsyncSession) -> ImportResult:
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    total = 0
    imported = 0
    skipped = 0
    errors: list[str] = []
    for row in reader:
        total += 1
        try:
            name = row.get("name", "").strip()
            if not name:
                skipped += 1
                errors.append(f"행 {total}: 이름이 비어있습니다")
                continue
            sub = Subscription(
                user_id=user_id,
                name=name,
                amount=Decimal(row.get("amount", "0")),
                currency=row.get("currency", "KRW"),
                billing_cycle=row.get("billing_cycle", "monthly"),
                next_payment_date=date.fromisoformat(row.get("next_payment_date", str(date.today()))),
                start_date=date.fromisoformat(row.get("start_date", str(date.today()))),
                is_active=row.get("is_active", "True").lower() in ("true", "1", "yes"),
                notes=row.get("notes") or None,
            )
            db.add(sub)
            imported += 1
        except Exception as e:
            skipped += 1
            errors.append(f"행 {total}: {str(e)}")
    await db.flush()
    return ImportResult(total_rows=total, imported=imported, skipped=skipped, errors=errors)
