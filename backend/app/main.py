from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import health


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    _ = get_settings()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="Lumen API",
        version=settings.APP_VERSION,
        lifespan=lifespan,
    )

    origins = settings.cors_origin_list
    if origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    application.include_router(health.router)
    return application


app = create_app()
