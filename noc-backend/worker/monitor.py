"""
monitor.py
──────────
Loop de monitoramento. Para cada device habilitado:
  1. Faz o ping
  2. Salva PingLog
  3. Atualiza status do Device
  4. Gera/resolve Alertas conforme regras
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.device import Device, DeviceStatus
from app.models.ping_log import PingLog, PingStatus
from app.models.alert import Alert, AlertSeverity
from worker.pinger import ping_host, PingResult

logger = logging.getLogger("noc.monitor")


# ── Helpers de status ─────────────────────────────

def _ping_status(result: PingResult) -> PingStatus:
    if not result.is_alive:
        return PingStatus.offline
    if (result.latency_ms and result.latency_ms >= settings.LATENCY_CRIT_MS) \
            or result.packet_loss >= settings.PACKET_LOSS_CRIT:
        return PingStatus.warn
    if result.latency_ms and result.latency_ms >= settings.LATENCY_WARN_MS:
        return PingStatus.warn
    return PingStatus.online


def _device_status(ping_st: PingStatus) -> DeviceStatus:
    mapping = {
        PingStatus.online:  DeviceStatus.online,
        PingStatus.offline: DeviceStatus.offline,
        PingStatus.warn:    DeviceStatus.warn,
    }
    return mapping[ping_st]


# ── Gerenciamento de alertas ──────────────────────

async def _handle_alerts(db: AsyncSession, device: Device, ping_st: PingStatus, result: PingResult):
    """Cria alerta se piorou, resolve alerta se melhorou."""

    # Busca alerta ativo mais recente para este device
    res = await db.execute(
        select(Alert)
        .where(Alert.device_id == device.id, Alert.resolved == False)
        .order_by(Alert.created_at.desc())
        .limit(1)
    )
    active_alert: Optional[Alert] = res.scalar_one_or_none()

    # ── Situação CRÍTICA / WARN: criar alerta se não existe ──
    if ping_st in (PingStatus.offline, PingStatus.warn):
        if not active_alert:
            if ping_st == PingStatus.offline:
                msg      = f"{device.name} ({device.ip_address}) está OFFLINE — sem resposta ao ping"
                severity = AlertSeverity.critical
            else:
                lat_info = f"latência {result.latency_ms:.0f}ms" if result.latency_ms else ""
                loss_info = f"perda {result.packet_loss:.0f}%" if result.packet_loss > 0 else ""
                detail = " | ".join(filter(None, [lat_info, loss_info]))
                msg      = f"{device.name} ({device.ip_address}) instável — {detail}"
                severity = AlertSeverity.warning

            new_alert = Alert(device_id=device.id, message=msg, severity=severity)
            db.add(new_alert)
            logger.warning(f"[ALERTA] {msg}")

    # ── Situação ONLINE: resolver alerta ativo se havia ──
    elif ping_st == PingStatus.online and active_alert:
        active_alert.resolved    = True
        active_alert.resolved_at = datetime.now(timezone.utc)
        logger.info(f"[RESOLVIDO] {device.name} voltou online. Alerta #{active_alert.id} resolvido.")


# ── Ciclo de um dispositivo ───────────────────────

async def check_device(device_id: int, ip: str, device_type: str):
    """Executa um ciclo completo de verificação para um device."""
    result = await ping_host(ip)
    ping_st = _ping_status(result)

    async with AsyncSessionLocal() as db:
        # Verifica se o device ainda existe ANTES de salvar qualquer coisa
        res = await db.execute(select(Device).where(Device.id == device_id))
        device = res.scalar_one_or_none()

        if not device:
            logger.warning(f"Device id={device_id} não encontrado no banco — ignorando ping")
            return

        # Salva log
        log = PingLog(
            device_id=device_id,
            latency_ms=result.latency_ms,
            packet_loss=result.packet_loss,
            status=ping_st,
        )
        db.add(log)

        # Atualiza status do device
        device.status = _device_status(ping_st)
        await _handle_alerts(db, device, ping_st, result)

        await db.commit()

    logger.debug(
        f"[PING] {ip} | status={ping_st.value} "
        f"| lat={result.latency_ms}ms | loss={result.packet_loss}%"
    )


# ── Agendamento individual por device ────────────

async def monitor_device_loop(device_id: int, ip: str, device_type: str):
    """Loop infinito para um único device, respeitando o intervalo configurado."""
    interval = settings.get_ping_interval(device_type)
    logger.info(f"Iniciando monitoramento: id={device_id} ip={ip} intervalo={interval}s")

    while True:
        try:
            await check_device(device_id, ip, device_type)
        except Exception as e:
            logger.exception(f"Erro no check_device id={device_id}: {e}")
        await asyncio.sleep(interval)


# ── Entry point do monitor ────────────────────────

async def run_monitor():
    """
    Carrega todos os devices habilitados do banco e lança uma task
    assíncrona para cada um. Re-sincroniza a lista a cada 5 minutos
    (para pegar devices adicionados/removidos sem reiniciar o worker).
    """
    tasks: dict[int, asyncio.Task] = {}

    while True:
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                select(Device).where(Device.enabled == True)
            )
            devices = res.scalars().all()
            current_ids = {d.id for d in devices}

        # Cancela tasks de devices removidos/desabilitados
        for dev_id in list(tasks.keys()):
            if dev_id not in current_ids:
                tasks[dev_id].cancel()
                del tasks[dev_id]
                logger.info(f"Device id={dev_id} removido do monitoramento")

        # Cria tasks para novos devices
        for d in devices:
            if d.id not in tasks or tasks[d.id].done():
                tasks[d.id] = asyncio.create_task(
                    monitor_device_loop(d.id, d.ip_address, d.type.value),
                    name=f"monitor-{d.id}",
                )

        logger.info(f"Monitorando {len(tasks)} dispositivos ativos")
        await asyncio.sleep(300)   # re-sincroniza a cada 5 minutos
