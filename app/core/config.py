from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Reads values from environment variables (and the .env file).

    If a required value is missing, the app refuses to start and tells you which
    one. That is intentional: fail clearly instead of running misconfigured.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Bytherix EAM"
    environment: str = "development"

    database_url: str
    secret_key: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

<<<<<<< HEAD
    cors_origins: list[str] = ["http://localhost:3000"]

    # Login rate limiting (counts FAILED attempts inside the sliding window)
    login_max_failures_per_email: int = 5
    login_max_failures_per_ip: int = 20
    login_lockout_window_minutes: int = 15
=======
    # Email / SMTP Configuration (Section 7.1 & 14.1)
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str = "noreply@bytherix.com"
    SMTP_FROM_NAME: str = "Bytherix EAM"
    SMTP_USE_TLS: bool = True
    FRONTEND_URL: str = "http://localhost:3000"

    # Rate Limiting & Brute-Force Guardrails (Sections 12 & 15)
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 120
    LOGIN_MAX_FAILED_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_SECONDS: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
>>>>>>> origin/main


@lru_cache
def get_settings() -> Settings:
    return Settings()
