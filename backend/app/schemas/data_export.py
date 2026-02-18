from typing import Literal

from pydantic import BaseModel


class ImportResult(BaseModel):
    total_rows: int
    imported: int
    skipped: int
    errors: list[str]


ExportFormat = Literal["csv", "xlsx"]
