import httpx

KOREAN_SERVICES: dict[str, str] = {
    "넷플릭스": "netflix.com", "netflix": "netflix.com",
    "유튜브 프리미엄": "youtube.com", "youtube": "youtube.com", "youtube premium": "youtube.com",
    "스포티파이": "spotify.com", "spotify": "spotify.com",
    "디즈니플러스": "disneyplus.com", "disney+": "disneyplus.com",
    "왓챠": "watcha.com", "watcha": "watcha.com",
    "웨이브": "wavve.com", "wavve": "wavve.com",
    "티빙": "tving.com", "tving": "tving.com",
    "쿠팡플레이": "coupangplay.com", "coupang play": "coupangplay.com",
    "네이버플러스": "naver.com", "naver+": "naver.com",
    "멜론": "melon.com", "melon": "melon.com",
    "애플뮤직": "apple.com", "apple music": "apple.com",
    "chatgpt": "openai.com", "챗gpt": "openai.com",
    "노션": "notion.so", "notion": "notion.so",
    "슬랙": "slack.com", "slack": "slack.com",
    "피그마": "figma.com", "figma": "figma.com",
    "카카오": "kakao.com",
    "링키드": "linkid.pw",
    "피클플러스": "pickle.plus",
    "microsoft 365": "microsoft.com", "ms365": "microsoft.com",
    "canva": "canva.com", "캔바": "canva.com",
}


async def search_logo(service_name: str, api_token: str | None = None) -> dict:
    name_lower = service_name.lower().strip()
    domain = KOREAN_SERVICES.get(name_lower)
    if domain:
        if api_token:
            return {"logo_url": f"https://img.logo.dev/{domain}?token={api_token}&size=128&format=png", "source": "builtin+logo.dev"}
        return {"logo_url": f"https://www.google.com/s2/favicons?domain={domain}&sz=128", "source": "builtin+google"}
    if api_token:
        url = f"https://img.logo.dev/{name_lower}.com?token={api_token}&size=128&format=png"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.head(url, timeout=5)
                if resp.status_code == 200:
                    return {"logo_url": url, "source": "logo.dev"}
            except httpx.HTTPError:
                pass
    fallback = f"https://www.google.com/s2/favicons?domain={name_lower}.com&sz=128"
    return {"logo_url": fallback, "source": "google"}
