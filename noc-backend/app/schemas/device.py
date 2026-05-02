from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.models.device import DeviceType, DeviceStatus


# ── Base ──────────────────────────────────────────
class DeviceBase(BaseModel):
    name:          str
    ip_address:    str
    type:          DeviceType
    location_name: Optional[str] = None
    latitude:      Optional[float] = None
    longitude:     Optional[float] = None
    priority:      int = 5
    enabled:       bool = True
    notes:         Optional[str] = None

    @field_validator("priority")
    @classmethod
    def priority_range(cls, v):
        if not (1 <= v <= 10):
            raise ValueError("priority deve ser entre 1 e 10")
        return v


# ── Create (entrada POST) ─────────────────────────
class DeviceCreate(DeviceBase):
    pass


# ── Update (entrada PUT) ──────────────────────────
class DeviceUpdate(BaseModel):
    name:          Optional[str] = None
    ip_address:    Optional[str] = None
    type:          Optional[DeviceType] = None
    location_name: Optional[str] = None
    latitude:      Optional[float] = None
    longitude:     Optional[float] = None
    priority:      Optional[int] = None
    enabled:       Optional[bool] = None
    notes:         Optional[str] = None
    status:        Optional[DeviceStatus] = None


# ── Response (saída GET) ──────────────────────────
class DeviceOut(DeviceBase):
    id:         int
    status:     DeviceStatus
    created_at: datetime

    # Campos extras calculados em runtime (opcionais, injetados pelo router)
    last_latency:     Optional[float] = None
    last_packet_loss: Optional[float] = None
    last_checked:     Optional[datetime] = None

    model_config = {"from_attributes": True}
