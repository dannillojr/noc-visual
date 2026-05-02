from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.ping_log import PingStatus
from app.models.alert import AlertSeverity


# ─── PingLog ──────────────────────────────────────
class PingLogOut(BaseModel):
    id:          int
    device_id:   int
    latency_ms:  Optional[float]
    packet_loss: float
    status:      PingStatus
    checked_at:  datetime

    model_config = {"from_attributes": True}


# ─── Alert ────────────────────────────────────────
class AlertOut(BaseModel):
    id:          int
    device_id:   int
    message:     str
    severity:    AlertSeverity
    resolved:    bool
    resolved_at: Optional[datetime]
    created_at:  datetime

    model_config = {"from_attributes": True}
