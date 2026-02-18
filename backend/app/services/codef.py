class CodefClient:
    """Codef API integration stub. Requires API credentials to function."""

    def __init__(self, client_id: str = "", client_secret: str = ""):
        self.client_id = client_id
        self.client_secret = client_secret

    async def get_card_transactions(self, **kwargs):
        raise NotImplementedError(
            "Codef 연동은 API 키 설정 후 사용 가능합니다. https://codef.io 에서 API 키를 발급받으세요."
        )

    async def sync_bank_connection(self, **kwargs):
        raise NotImplementedError("Codef 연동은 API 키 설정 후 사용 가능합니다.")
