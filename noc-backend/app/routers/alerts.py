from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.alert import Alert, AlertSeverity
from app.models.user import Usuario
from app.schemas.ping_alert import AlertOut
from app.routers.auth import obter_usuario_atual  # dependency de autenticação

router = APIRouter(prefix="/alerts", tags=["alerts"])


# ── GET /alerts/ ──────────────────────────────────
@router.get("/", response_model=List[AlertOut])
async def list_alerts(
    resolved:  Optional[bool] = Query(default=False, description="False = apenas ativos"),
    severity:  Optional[AlertSeverity] = Query(default=None),
    device_id: Optional[int] = Query(default=None),
    limit:     int = Query(default=100, le=500),
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),  # ← exige token válido
):
    q = select(Alert).order_by(Alert.created_at.desc()).limit(limit)

    if resolved is not None:
        q = q.where(Alert.resolved == resolved)
    if severity:
        q = q.where(Alert.severity == severity)
    if device_id:
        q = q.where(Alert.device_id == device_id)

    result = await db.execute(q)
    return result.scalars().all()


# ── POST /alerts/{id}/resolve ─────────────────────
@router.post("/{alert_id}/resolve", response_model=AlertOut)
async def resolve_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),  # ← exige token válido
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")

    alert.resolved    = True
    alert.resolved_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(alert)
    return alert