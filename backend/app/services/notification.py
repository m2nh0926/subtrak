import httpx


async def send_discord_webhook(webhook_url: str, title: str, description: str, color: int = 0x6366F1) -> bool:
    if not webhook_url:
        return False
    payload = {
        "embeds": [
            {
                "title": title,
                "description": description,
                "color": color,
            }
        ]
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(webhook_url, json=payload)
            return resp.status_code == 204
        except httpx.HTTPError:
            return False
