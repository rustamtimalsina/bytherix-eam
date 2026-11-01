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

    cors_origins: list[str] = ["http://localhost:3000"]

    # Login rate limiting (counts FAILED attempts inside the sliding window)
    login_max_failures_per_email: int = 5
    login_max_failures_per_ip: int = 20
    login_lockout_window_minutes: int = 15


@lru_cache
def get_settings() -> Settings:
    return Settings()
