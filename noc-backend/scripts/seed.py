"""
scripts/seed.py
───────────────
Popula o banco com os primeiros dispositivos reais da provedor.
Edite os dados abaixo antes de executar.

Uso:
  python scripts/seed.py
"""

import asyncio
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal, init_db
from app.models.device import Device, DeviceType, DeviceStatus

# ── EDITE AQUI: seus dispositivos reais ──────────
DEVICES = [
    # ── Servidores internos ──
    dict(
        name="Servidor PPPoE",
        ip_address="192.168.0.1",       # <-- troque pelo IP real
        type=DeviceType.server,
        location_name="Sede Principal",
        latitude=-5.1234,               # <-- coordenadas reais
        longitude=-38.5678,
        priority=1,
        notes="Servidor de autenticação PPPoE principal",
    ),
    dict(
        name="Servidor Auth / RADIUS",
        ip_address="192.168.0.2",
        type=DeviceType.server,
        location_name="Sede Principal",
        latitude=-5.1235,
        longitude=-38.5679,
        priority=1,
    ),
    dict(
        name="Servidor Backup",
        ip_address="192.168.0.3",
        type=DeviceType.server,
        location_name="Sede Principal",
        latitude=-5.1236,
        longitude=-38.5680,
        priority=2,
    ),

    # ── Rádios entre cidades ──
    dict(
        name="Rádio Cidade A → Cidade B",
        ip_address="10.0.0.1",
        type=DeviceType.radio,
        location_name="Torre Cidade A",
        latitude=-5.2000,
        longitude=-38.6000,
        priority=2,
        notes="MikroTik SXT 5G — 5.8GHz",
    ),
    dict(
        name="Rádio Cidade B → Cidade C",
        ip_address="10.0.0.2",
        type=DeviceType.radio,
        location_name="Torre Cidade B",
        latitude=-5.2500,
        longitude=-38.6500,
        priority=2,
        notes="Ubiquiti AirMax — 5.8GHz",
    ),

    # ── Clientes corporativos ──
    dict(
        name="Hospital Municipal",
        ip_address="10.10.1.1",
        type=DeviceType.corporate,
        location_name="Hospital Municipal — Rua X, nº 100",
        latitude=-5.1800,
        longitude=-38.5900,
        priority=1,
        notes="Contrato crítico — alerta imediato",
    ),
    dict(
        name="Prefeitura",
        ip_address="10.10.2.1",
        type=DeviceType.corporate,
        location_name="Prefeitura Municipal",
        latitude=-5.1700,
        longitude=-38.5800,
        priority=1,
    ),

    # ── POPs ──
    dict(
        name="POP Centro",
        ip_address="172.16.0.1",
        type=DeviceType.pop,
        location_name="POP Centro — Rua Y",
        latitude=-5.1500,
        longitude=-38.5600,
        priority=1,
    ),
]


async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        for data in DEVICES:
            device = Device(**data)
            db.add(device)
        await db.commit()
        print(f"✅ {len(DEVICES)} dispositivos inseridos com sucesso.")


if __name__ == "__main__":
    asyncio.run(seed())
