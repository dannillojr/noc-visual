from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.device import Device
from app.models.ping_log import PingLog
from app.models.user import Usuario
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceOut
from app.routers.auth import obter_usuario_atual  # dependency de autenticação

router = APIRouter(prefix="/devices", tags=["devices"])


# ── GET /devices/ ─────────────────────────────────
@router.get("/", response_model=List[DeviceOut])
async def list_devices(
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),  # ← exige token válido
):
    result = await db.execute(select(Device).order_by(Device.priority, Device.name))
    devices = result.scalars().all()

    # Enriquecer com último ping de cada device (1 query extra por device, aceitável no MVP)
    out = []
    for d in devices:
        last_ping = await _get_last_ping(db, d.id)
        device_out = DeviceOut.model_validate(d)
        if last_ping:
            device_out.last_latency     = last_ping.latency_ms
            device_out.last_packet_loss = last_ping.packet_loss
            device_out.last_checked     = last_ping.checked_at
        out.append(device_out)

    return out


# ── GET /devices/{id} ─────────────────────────────
@router.get("/{device_id}", response_model=DeviceOut)
async def get_device(
    device_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),  # ← exige token válido
):
    device = await _get_or_404(db, device_id)
    last_ping = await _get_last_ping(db, device_id)
    device_out = DeviceOut.model_validate(device)
    if last_ping:
        device_out.last_latency     = last_ping.latency_ms
        device_out.last_packet_loss = last_ping.packet_loss
        device_out.last_checked     = last_ping.checked_at
    return device_out


# ── POST /devices/ ────────────────────────────────
@router.post("/", response_model=DeviceOut, status_code=status.HTTP_201_CREATED)
async def create_device(
    payload: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),  # ← exige token válido
):
    device = Device(**payload.model_dump())
    db.add(device)
    await db.flush()   # gera o ID sem commitar ainda
    await db.refresh(device)
    return DeviceOut.model_validate(device)


# ── PUT /devices/{id} ────────────────────────────
@router.put("/{device_id}", response_model=DeviceOut)
async def update_device(
    device_id: int,
    payload: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),  # ← exige token válido
):
    device = await _get_or_404(db, device_id)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)
    await db.flush()
    await db.refresh(device)
    return DeviceOut.model_validate(device)


# ── DELETE /devices/{id} ─────────────────────────
@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(
    device_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),  # ← exige token válido
):
    device = await _get_or_404(db, device_id)
    await db.delete(device)


# ── Helpers ──────────────────────────────────────
async def _get_or_404(db: AsyncSession, device_id: int) -> Device:
    """Busca dispositivo pelo ID ou retorna 404 se não encontrado."""
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    return device


async def _get_last_ping(db: AsyncSession, device_id: int):
    """Retorna o registro mais recente de ping para o dispositivo."""
    result = await db.execute(
        select(PingLog)
        .where(PingLog.device_id == device_id)
        .order_by(PingLog.checked_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()