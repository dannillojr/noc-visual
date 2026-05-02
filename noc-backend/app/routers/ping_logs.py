from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.ping_log import PingLog
from app.models.user import Usuario
from app.schemas.ping_alert import PingLogOut
from app.routers.auth import obter_usuario_atual  # dependency de autenticação

router = APIRouter(prefix="/ping-logs", tags=["ping-logs"])


# ── GET /ping-logs/{device_id} ────────────────────
@router.get("/{device_id}", response_model=List[PingLogOut])
async def get_ping_logs(
    device_id: int,
    limit: int = Query(default=60, le=1440, description="Últimos N registros (max 1440 = 12h a 30s)"),
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),  # ← tipagem correta
):
    result = await db.execute(
        select(PingLog)
        .where(PingLog.device_id == device_id)
        .order_by(PingLog.checked_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return list(reversed(logs))  # ordem cronológica para o frontend plotar o gráfico