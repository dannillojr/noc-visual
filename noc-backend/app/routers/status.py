from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.device import Device, DeviceStatus
from app.models.alert import Alert
from app.models.user import Usuario
from app.routers.auth import obter_usuario_atual  # dependency de autenticação

router = APIRouter(prefix="/status", tags=["status"])


@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),  # ← exige token válido
):
    """
    Retorna um resumo geral para o topbar do dashboard:
    total de dispositivos, quantos online, offline, warn e alertas ativos.
    Requer autenticação.
    """
    # Contagem por status
    counts_result = await db.execute(
        select(Device.status, func.count(Device.id))
        .where(Device.enabled == True)
        .group_by(Device.status)
    )
    counts = {row[0]: row[1] for row in counts_result.all()}

    # Alertas ativos (não resolvidos)
    alert_count_result = await db.execute(
        select(func.count(Alert.id)).where(Alert.resolved == False)
    )
    active_alerts = alert_count_result.scalar()

    # Total de dispositivos habilitados
    total_result = await db.execute(
        select(func.count(Device.id)).where(Device.enabled == True)
    )
    total = total_result.scalar()

    return {
        "total":         total,
        "online":        counts.get(DeviceStatus.online, 0),
        "offline":       counts.get(DeviceStatus.offline, 0),
        "warn":          counts.get(DeviceStatus.warn, 0),
        "unknown":       counts.get(DeviceStatus.unknown, 0),
        "active_alerts": active_alerts,
    }