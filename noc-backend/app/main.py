from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
from app.routers import devices, alerts, ping_logs, status, links, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: cria tabelas se não existirem
    await init_db()
    yield
    # Shutdown: nada necessário por enquanto


app = FastAPI(
    title="NOC Visual — API",
    description="Backend de monitoramento de rede para ISP",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────
# Na rede interna isso é tranquilo — ajuste as origens no .env
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────
app.include_router(devices.router)
app.include_router(alerts.router)
app.include_router(ping_logs.router)
app.include_router(status.router)
app.include_router(links.router)
app.include_router(auth.roteador)


@app.get("/health")
async def health():
    return {"status": "ok"}
