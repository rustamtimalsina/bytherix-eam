
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Reads values from environment variables and the .env file.

    If a required value is missing, the application refuses to start.
    This prevents the application from running with an invalid configuration.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    app_name: str = "Bytherix EAM"
    environment: str = "development"

    # Database
    database_url: str

    # Security / JWT
    secret_key: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Email / SMTP Configuration
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str = "noreply@bytherix.com"
    smtp_from_name: str = "Bytherix EAM"
    smtp_use_tls: bool = True

    # Frontend
    frontend_url: str = "http://localhost:3000"

    # General API Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 120

    # Login Rate Limiting
    # Failed attempts are tracked independently by email and IP.
    login_max_failures_per_email: int = 5
    login_max_failures_per_ip: int = 20
    login_lockout_window_minutes: int = 15


@lru_cache
def get_settings() -> Settings:
    return Settings()
