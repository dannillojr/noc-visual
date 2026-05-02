from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class PingStatus(str, enum.Enum):
    online  = "online"
    offline = "offline"
    warn    = "warn"


class PingLog(Base):
    __tablename__ = "ping_logs"

    id          = Column(Integer, primary_key=True, index=True)
    device_id   = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True)
    latency_ms  = Column(Float, nullable=True)       # None = sem resposta
    packet_loss = Column(Float, nullable=False, default=100.0)  # %
    status      = Column(SAEnum(PingStatus), nullable=False)
    checked_at  = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    device = relationship("Device", back_populates="ping_logs")
