"""
Codef API integration service.

API Flow:
1. Get OAuth token (client_credentials grant)
2. Create connectedId (register user's card credentials)
3. Use connectedId to fetch card transaction history
4. Parse transactions to detect recurring subscriptions

Environments:
- Demo: https://development.codef.io
- Production: https://api.codef.io
- Sandbox (fixed responses): https://sandbox.codef.io

Token URL: https://oauth.codef.io/oauth/token
"""

import base64
import json
import logging
import urllib.parse
from collections import defaultdict
from datetime import datetime, timedelta

import httpx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding as asym_padding

from app.config import settings

logger = logging.getLogger(__name__)

# Codef environment URLs
CODEF_SANDBOX_URL = "https://sandbox.codef.io"
CODEF_DEV_URL = "https://development.codef.io"
CODEF_PROD_URL = "https://api.codef.io"
CODEF_TOKEN_URL = "https://oauth.codef.io/oauth/token"

# Codef 카드사 조직코드 (businessType: CD)
# 출처: https://developer.codef.io/products/card/overview (2024-12-19 업데이트)
# 씨티카드(0307): 2022년 한국 소비자금융 철수 → 사용자 요청으로 제외
# 광주카드(0316), 수협카드(0320), 제주카드(0321): 아이디 로그인 미지원(인증서만) → 제외
CARD_ORGS: dict[str, str] = {
    "0301": "KB국민카드",
    "0302": "현대카드",
    "0303": "삼성카드",
    "0304": "NH농협카드",
    "0305": "BC카드",
    "0306": "신한카드",
    "0309": "우리카드",  # 주의: 0312 아님 (공식 문서 확인)
    "0311": "롯데카드",
    "0313": "하나카드",  # 주의: 0309 아님 (공식 문서 확인)
    "0315": "전북카드",
}

# Reverse mapping: name -> code
CARD_ORG_BY_NAME: dict[str, str] = {v: k for k, v in CARD_ORGS.items()}

CARD_FIELD_CONFIG: dict[str, dict] = {
    "0301": {
        "required": ["id", "password"],
        "optional": ["birthDate", "cardNo", "cardPassword"],
        "notes": "카드소지확인 인증 시 cardNo(전체), cardPassword(앞 2자리) 필요",
    },
    "0302": {
        "required": ["id", "password", "cardNo", "cardPassword"],
        "optional": ["birthDate"],
        "notes": "카드번호 + 비밀번호 4자리 필수 (25.10.30~). 비밀번호 3회 오류 시 계정 잠김!",
    },
    "0303": {
        "required": ["id", "password"],
        "optional": ["birthDate"],
        "notes": "비밀번호 5회 오류 시 잠김",
    },
    "0304": {
        "required": ["id", "password"],
        "optional": ["birthDate"],
        "notes": "비밀번호 5회 오류 시 잠김",
    },
    "0305": {
        "required": ["id", "password"],
        "optional": ["birthDate"],
        "notes": "",
    },
    "0306": {
        "required": ["id", "password"],
        "optional": ["birthDate"],
        "notes": "비밀번호 5회 오류 시 잠김",
    },
    "0309": {
        "required": ["id", "password"],
        "optional": ["birthDate"],
        "notes": "비밀번호 5회 오류 시 잠김. 제한 직전 시 주민등록번호 추가 입력 필요",
    },
    "0311": {
        "required": ["id", "password"],
        "optional": ["birthDate"],
        "notes": "비밀번호 5회 오류 시 잠김",
    },
    "0313": {
        "required": ["id", "password"],
        "optional": ["birthDate"],
        "notes": "",
    },
    "0315": {
        "required": ["id", "password"],
        "optional": ["birthDate"],
        "notes": "비밀번호 5회 오류 시 잠김",
    },
}

CARD_MAX_MONTHS: dict[str, int] = {
    "0302": 3,
    "0305": 9,
    "0306": 6,
    "0311": 6,
    "0313": 18,
    "0315": 48,
}


def rsa_encrypt(plaintext: str, public_key_str: str) -> str:
    """Encrypt plaintext using RSA public key (PKCS1v15 padding).

    Codef requires password fields to be RSA-encrypted with the issued publicKey.
    The publicKey from Codef is a base64-encoded DER SubjectPublicKeyInfo (X.509).
    """
    der_bytes = base64.b64decode(public_key_str.strip())
    public_key = serialization.load_der_public_key(der_bytes)
    encrypted = public_key.encrypt(  # type: ignore[union-attr]
        plaintext.encode("utf-8"),
        asym_padding.PKCS1v15(),
    )
    return base64.b64encode(encrypted).decode("utf-8")


class CodefClient:
    """Codef API client with token management and card operations."""

    def __init__(
        self,
        client_id: str | None = None,
        client_secret: str | None = None,
        use_demo: bool = True,
    ):
        self.client_id = client_id or settings.CODEF_CLIENT_ID
        self.client_secret = client_secret or settings.CODEF_CLIENT_SECRET
        self.base_url = CODEF_DEV_URL if use_demo else CODEF_PROD_URL
        self._access_token: str | None = None
        self._token_expires_at: datetime | None = None

    @property
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    async def _get_token(self) -> str:
        """Get or refresh OAuth2 access token (client_credentials grant)."""
        if (
            self._access_token
            and self._token_expires_at
            and datetime.now() < self._token_expires_at
        ):
            return self._access_token

        if not self.is_configured:
            raise ValueError("Codef API credentials not configured")

        auth_str = f"{self.client_id}:{self.client_secret}"
        auth_header = base64.b64encode(auth_str.encode()).decode()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                CODEF_TOKEN_URL,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": f"Basic {auth_header}",
                },
                data="grant_type=client_credentials&scope=read",
            )

        if response.status_code != 200:
            logger.error(f"Codef token error: {response.status_code} {response.text}")
            raise Exception(f"Codef 토큰 발급 실패: {response.status_code}")

        data = response.json()
        self._access_token = data["access_token"]
        expires_in = data.get("expires_in", 604799)
        self._token_expires_at = datetime.now() + timedelta(seconds=expires_in - 3600)

        logger.info("Codef access token issued successfully")
        assert self._access_token is not None
        return self._access_token

    async def _api_request(self, path: str, body: dict) -> dict:
        """Make authenticated request to Codef API.

        All Codef requests: POST, body is JSON URL-encoded, Bearer token.
        Matches official codef-python sample: urllib.parse.quote(json.dumps(body))
        """
        token = await self._get_token()
        url = f"{self.base_url}{path}"
        raw_json = json.dumps(body)
        encoded_body = urllib.parse.quote(raw_json)

        logger.info(f"Codef request URL: {url}")
        logger.info(f"Codef request body (raw JSON): {raw_json}")
        logger.info(f"Codef request body (encoded, first 200): {encoded_body[:200]}")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                },
                content=encoded_body,
            )

        if response.status_code == 401:
            self._access_token = None
            self._token_expires_at = None
            token = await self._get_token()

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {token}",
                    },
                    content=encoded_body,
                )

        if response.status_code != 200:
            logger.error(f"Codef API error: {response.status_code} {response.text}")
            raise Exception(f"Codef API 오류: {response.status_code}")

        decoded_text = urllib.parse.unquote_plus(response.text)
        result = json.loads(decoded_text)

        result_code = result.get("result", {}).get("code", "")
        if result_code != "CF-00000":
            msg = result.get("result", {}).get("message", "알 수 없는 오류")
            extra = result.get("result", {}).get("extraMessage", "")

            # CF-04000 is a wrapper — real error is in data.errorList
            error_detail = ""
            data = result.get("data", {})
            if isinstance(data, dict):
                error_list = data.get("errorList", [])
                if error_list:
                    for err in error_list:
                        err_code = err.get("code", "")
                        err_msg = err.get("message", "")
                        error_detail += f" [{err_code}] {err_msg}"
                    logger.error(f"Codef errorList: {error_list}")

            logger.error(
                f"Codef API business error: {result_code} - {msg} {extra}"
                f" | errorList detail:{error_detail or ' (none)'}"
            )
            full_msg = f"Codef 오류 [{result_code}]: {msg} {extra}"
            if error_detail:
                full_msg += f" (상세:{error_detail})"
            raise Exception(full_msg)

        return result

    # ========================
    # Account Management (connectedId)
    # ========================

    async def create_account(
        self,
        organization: str,
        login_type: str = "1",
        user_id: str = "",
        user_password: str = "",
        client_type: str = "P",
        birthday: str = "",
        card_no: str = "",
        card_password: str = "",
    ) -> dict:
        """Create a new connectedId by registering card credentials."""
        account_item: dict[str, str] = {
            "countryCode": "KR",
            "businessType": "CD",
            "clientType": client_type,
            "organization": organization,
            "loginType": login_type,
        }

        public_key = settings.CODEF_PUBLIC_KEY
        encrypted_pw = (
            rsa_encrypt(user_password, public_key) if public_key else user_password
        )
        encrypted_card_pw = (
            rsa_encrypt(card_password, public_key)
            if (public_key and card_password)
            else card_password
        )

        if login_type == "1":
            account_item["id"] = user_id
        account_item["password"] = encrypted_pw

        # All optional fields as empty strings per Codef spec
        account_item["birthDate"] = birthday or ""
        account_item["cardNo"] = card_no or ""
        account_item["cardPassword"] = encrypted_card_pw or ""
        account_item["identity"] = ""
        account_item["loginTypeLevel"] = ""
        account_item["clientTypeLevel"] = ""

        body = {"accountList": [account_item]}
        result = await self._api_request("/v1/account/create", body)
        return result.get("data", {})

    async def add_account(
        self,
        connected_id: str,
        organization: str,
        login_type: str = "1",
        user_id: str = "",
        user_password: str = "",
        client_type: str = "P",
        birthday: str = "",
        card_no: str = "",
        card_password: str = "",
    ) -> dict:
        """Add a card to an existing connectedId."""
        account_item: dict[str, str] = {
            "countryCode": "KR",
            "businessType": "CD",
            "clientType": client_type,
            "organization": organization,
            "loginType": login_type,
        }

        public_key = settings.CODEF_PUBLIC_KEY
        encrypted_pw = (
            rsa_encrypt(user_password, public_key) if public_key else user_password
        )
        encrypted_card_pw = (
            rsa_encrypt(card_password, public_key)
            if (public_key and card_password)
            else card_password
        )

        if login_type == "1":
            account_item["id"] = user_id
        account_item["password"] = encrypted_pw
        account_item["birthDate"] = birthday or ""
        account_item["cardNo"] = card_no or ""
        account_item["cardPassword"] = encrypted_card_pw or ""
        account_item["identity"] = ""
        account_item["loginTypeLevel"] = ""
        account_item["clientTypeLevel"] = ""

        body = {"connectedId": connected_id, "accountList": [account_item]}
        result = await self._api_request("/v1/account/add", body)
        return result.get("data", {})

    async def delete_account(
        self,
        connected_id: str,
        organization: str,
        client_type: str = "P",
        login_type: str = "1",
    ) -> dict:
        """Remove a card from a connectedId."""
        body = {
            "connectedId": connected_id,
            "accountList": [
                {
                    "countryCode": "KR",
                    "businessType": "CD",
                    "clientType": client_type,
                    "organization": organization,
                    "loginType": login_type,
                }
            ],
        }
        result = await self._api_request("/v1/account/delete", body)
        return result.get("data", {})

    async def list_accounts(self, connected_id: str) -> dict:
        """List all registered accounts for a connectedId."""
        body = {"connectedId": connected_id}
        result = await self._api_request("/v1/account/list", body)
        return result.get("data", {})

    # ========================
    # Card Data Retrieval
    # ========================

    async def get_card_approval_list(
        self,
        connected_id: str,
        organization: str,
        start_date: str,
        end_date: str,
        order_by: str = "0",
        inquiry_type: str = "1",
        card_no: str = "",
        card_password: str = "",
        card_name: str = "",
        duplicate_card_idx: str = "",
        member_store_info_type: str = "0",
    ) -> dict:
        """Get card approval/transaction history (승인내역).

        inquiry_type: "0" = 카드별 조회 (cardName+duplicateCardIdx 필요),
                      "1" = 전체조회 (default)
        card_no/card_password: 현대카드·KB 인증용
        member_store_info_type: "0" 미포함, "1" 가맹점, "2" 부가세, "3" 전체
        """
        body: dict[str, str] = {
            "connectedId": connected_id,
            "organization": organization,
            "startDate": start_date,
            "endDate": end_date,
            "orderBy": order_by,
            "inquiryType": inquiry_type,
            "memberStoreInfoType": member_store_info_type,
        }
        if card_no:
            body["cardNo"] = card_no
        if card_password:
            body["cardPassword"] = card_password
        if inquiry_type == "0":
            if card_name:
                body["cardName"] = card_name
            if duplicate_card_idx:
                body["duplicateCardIdx"] = duplicate_card_idx
        result = await self._api_request("/v1/kr/card/p/account/approval-list", body)
        return result.get("data", {})

    async def get_card_list(
        self,
        connected_id: str,
        organization: str,
    ) -> dict:
        """Get list of cards registered under the account (보유카드)."""
        body = {
            "connectedId": connected_id,
            "organization": organization,
        }
        result = await self._api_request("/v1/kr/card/p/account/card-list", body)
        return result.get("data", {})

    # ========================
    # High-level helpers
    # ========================

    async def register_card_and_get_connected_id(
        self,
        organization: str,
        card_login_id: str,
        card_login_pw: str,
        birthday: str = "",
        card_no: str = "",
        card_password: str = "",
        existing_connected_id: str | None = None,
    ) -> str:
        """Register a card and return the connectedId."""
        if existing_connected_id:
            data = await self.add_account(
                connected_id=existing_connected_id,
                organization=organization,
                user_id=card_login_id,
                user_password=card_login_pw,
                birthday=birthday,
                card_no=card_no,
                card_password=card_password,
            )
            return data.get("connectedId", existing_connected_id)
        else:
            data = await self.create_account(
                organization=organization,
                user_id=card_login_id,
                user_password=card_login_pw,
                birthday=birthday,
                card_no=card_no,
                card_password=card_password,
            )
            return data.get("connectedId", "")

    async def scrape_transactions(
        self,
        connected_id: str,
        organization: str,
        months_back: int = 6,
        card_nos: list[str] | None = None,
    ) -> list[dict]:
        """Fetch transaction history for the last N months. Returns normalized list."""
        max_months = CARD_MAX_MONTHS.get(organization, 12)
        effective_months = min(months_back, max_months)

        end_date = datetime.now().strftime("%Y%m%d")
        start_date = (datetime.now() - timedelta(days=effective_months * 30)).strftime(
            "%Y%m%d"
        )

        if effective_months != months_back:
            logger.info(
                f"Codef scrape: org={organization} period capped "
                f"{months_back}→{effective_months} months"
            )

        transactions: list[dict] = []

        try:
            data = await self.get_card_approval_list(
                connected_id=connected_id,
                organization=organization,
                start_date=start_date,
                end_date=end_date,
                order_by="1",
                inquiry_type="1",
            )
            raw_list = data.get("resList", data.get("resApprovalList", []))
            for item in raw_list:
                transactions.append(self._normalize_transaction(item))
        except Exception as e:
            logger.warning(f"Codef approval-list (전체조회) failed: {e}")

        logger.info(
            f"Codef scrape total: {len(transactions)} transactions "
            f"(org={organization}, period={effective_months}m)"
        )
        return transactions

    @staticmethod
    def _normalize_transaction(item: dict) -> dict:
        return {
            "date": item.get("resUsedDate", item.get("resApprovalDate", "")),
            "time": item.get("resUsedTime", item.get("resApprovalTime", "")),
            "merchant": item.get(
                "resMemberStoreName",
                item.get("resStoreName", item.get("resMerchantName", "")),
            ),
            "amount": item.get(
                "resUsedAmount",
                item.get("resApprovalAmount", item.get("resAmount", "0")),
            ),
            "status": item.get("resApprovalStatus", "승인"),
            "card_name": item.get("resCardName", ""),
            "card_no": item.get("resCardNo", item.get("resCardNumber", "")),
            "category": item.get("resCategory", ""),
            "raw": item,
        }

    def detect_subscriptions(self, transactions: list[dict]) -> list[dict]:
        """Detect recurring subscription patterns from transaction history."""
        merchant_txns: dict[str, list[dict]] = defaultdict(list)
        for tx in transactions:
            merchant = tx.get("merchant", "").strip()
            if not merchant:
                continue
            normalized = merchant.upper().replace(" ", "")
            merchant_txns[normalized].append(tx)

        subscriptions = []
        for _merchant_key, txns in merchant_txns.items():
            if len(txns) < 2:
                continue

            amounts: list[int] = []
            for tx in txns:
                try:
                    amt = int(str(tx["amount"]).replace(",", ""))
                    if amt > 0:
                        amounts.append(amt)
                except (ValueError, TypeError):
                    continue

            if len(amounts) < 2:
                continue

            avg_amount = sum(amounts) / len(amounts)
            if avg_amount == 0:
                continue

            consistent = all(abs(a - avg_amount) / avg_amount < 0.1 for a in amounts)
            if not consistent:
                continue

            dates: list[datetime] = []
            for tx in txns:
                date_str = tx.get("date", "")
                if len(date_str) == 8:
                    try:
                        dates.append(datetime.strptime(date_str, "%Y%m%d"))
                    except ValueError:
                        continue

            dates.sort()
            if len(dates) >= 2:
                intervals = [
                    (dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)
                ]
                avg_interval = sum(intervals) / len(intervals)
                is_monthly = 20 <= avg_interval <= 40
                is_yearly = 340 <= avg_interval <= 395
                is_weekly = 5 <= avg_interval <= 10

                if is_monthly or is_yearly or is_weekly:
                    original_name = txns[0].get("merchant", _merchant_key)
                    billing_cycle = (
                        "monthly" if is_monthly else "yearly" if is_yearly else "weekly"
                    )
                    recent_date = max(dates)

                    subscriptions.append(
                        {
                            "name": original_name,
                            "amount": int(avg_amount),
                            "billing_cycle": billing_cycle,
                            "billing_day": recent_date.day,
                            "occurrence_count": len(txns),
                            "last_payment_date": recent_date.strftime("%Y-%m-%d"),
                            "card_no": txns[0].get("card_no", ""),
                            "category": txns[0].get("category", ""),
                        }
                    )

        subscriptions.sort(key=lambda x: x["amount"], reverse=True)
        return subscriptions


# Singleton instance
codef_client = CodefClient()
