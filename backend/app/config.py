from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "SubTrak"
    DEBUG: bool = True
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/subtrak"
    DISCORD_WEBHOOK_URL: str = ""

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Logo.dev
    LOGO_DEV_TOKEN: str = ""

    # Codef
    CODEF_CLIENT_ID: str = ""
    CODEF_CLIENT_SECRET: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
