from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_VERSION: str = "0.1.0"
    CORS_ORIGINS: str = ""

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def strip_cors(cls, v: str | list[str]) -> str:
        if isinstance(v, list):
            return ",".join(v)
        return v if isinstance(v, str) else ""

    @property
    def cors_origin_list(self) -> list[str]:
        if not self.CORS_ORIGINS.strip():
            return []
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
