from pydantic import BaseModel


class CodefCardOrg(BaseModel):
    """Card company info."""

    code: str
    name: str


class CodefRegisterCardRequest(BaseModel):
    """Register a card via Codef."""

    organization_code: str  # e.g. "0306" for 신한카드
    login_id: str  # Card company website login ID
    login_password: str  # Card company website login password
    birthday: str = ""  # YYMMDD (optional, for some card companies)


class CodefRegisterCardResponse(BaseModel):
    """Response after card registration."""

    connected_id: str
    bank_connection_id: int
    organization_code: str
    organization_name: str
    message: str = "카드 등록 완료"


class CodefScrapeRequest(BaseModel):
    """Request to scrape card transactions."""

    bank_connection_id: int
    months_back: int = 6


class CodefTransaction(BaseModel):
    """Normalized card transaction."""

    date: str
    time: str
    merchant: str
    amount: str
    status: str
    card_name: str
    card_no: str
    category: str


class CodefScrapeResponse(BaseModel):
    """Response with scraped transactions."""

    transactions: list[CodefTransaction]
    total_count: int


class DetectedSubscription(BaseModel):
    """Auto-detected subscription from card transactions."""

    name: str
    amount: int
    billing_cycle: str
    billing_day: int
    occurrence_count: int
    last_payment_date: str
    card_no: str
    category: str


class CodefDetectResponse(BaseModel):
    """Response with detected subscriptions."""

    detected: list[DetectedSubscription]
    total_transactions_analyzed: int


class CodefStatusResponse(BaseModel):
    """Codef API status."""

    configured: bool
    demo_mode: bool
    base_url: str
