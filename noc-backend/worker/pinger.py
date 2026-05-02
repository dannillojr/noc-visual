"""
pinger.py
─────────
Executa pings reais usando icmplib (ICMP puro, sem subprocess).
Requer execução como root OU com cap_net_raw:

  sudo python -m worker.main
  # OU
  sudo setcap cap_net_raw+ep $(which python3)
"""

import asyncio
import logging
from typing import Optional
from dataclasses import dataclass

from icmplib import async_ping, NameLookupError, SocketPermissionError

logger = logging.getLogger("noc.pinger")


@dataclass
class PingResult:
    ip:          str
    is_alive:    bool
    latency_ms:  Optional[float]  # None se sem resposta
    packet_loss: float            # 0.0 a 100.0


async def ping_host(ip: str, count: int = 4, timeout: float = 1.0) -> PingResult:
    """
    Executa ping ICMP assíncrono em um host.
    
    Args:
        ip:      Endereço IP ou hostname
        count:   Quantidade de pacotes enviados
        timeout: Timeout por pacote em segundos
    
    Returns:
        PingResult com os dados do resultado
    """
    try:
        host = await async_ping(
            address=ip,
            count=count,
            interval=0.2,   # 200ms entre pacotes
            timeout=timeout,
            privileged=True,  # usa ICMP raw socket
        )
        latency = round(host.avg_rtt, 2) if host.is_alive else None
        loss    = round(host.packet_loss * 100, 1)

        return PingResult(
            ip=ip,
            is_alive=host.is_alive,
            latency_ms=latency,
            packet_loss=loss,
        )

    except SocketPermissionError:
        logger.error(
            "Sem permissão para ICMP raw socket. "
            "Execute como root ou: sudo setcap cap_net_raw+ep $(which python3)"
        )
        # Retorna como desconhecido para não gerar falso alarme
        return PingResult(ip=ip, is_alive=False, latency_ms=None, packet_loss=100.0)

    except NameLookupError:
        logger.warning(f"Falha ao resolver hostname: {ip}")
        return PingResult(ip=ip, is_alive=False, latency_ms=None, packet_loss=100.0)

    except Exception as e:
        logger.exception(f"Erro inesperado ao pingar {ip}: {e}")
        return PingResult(ip=ip, is_alive=False, latency_ms=None, packet_loss=100.0)
