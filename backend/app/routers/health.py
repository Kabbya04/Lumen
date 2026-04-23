from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    settings = get_settings()
    return {"status": "ok", "version": settings.APP_VERSION}


@router.get("/version")
async def version() -> dict[str, str]:
    settings = get_settings()
    return {"version": settings.APP_VERSION}
