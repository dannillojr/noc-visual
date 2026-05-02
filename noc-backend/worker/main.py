"""
worker/main.py
──────────────
Entrypoint do processo separado do worker de ping.

Uso:
  sudo python -m worker.main

Ou via systemd (ver scripts/noc-worker.service)
"""

import asyncio
import logging
import sys
import os

# Garante que o projeto raiz está no path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import init_db
from worker.monitor import run_monitor

# ── Logging ───────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("noc.worker")


async def main():
    logger.info("=== NOC Worker iniciando ===")
    await init_db()
    await run_monitor()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker encerrado pelo usuário.")
