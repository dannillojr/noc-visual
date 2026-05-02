from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class DeviceType(str, enum.Enum):
    server    = "server"
    radio     = "radio"
    corporate = "corporate"
    pop       = "pop"


class DeviceStatus(str, enum.Enum):
    online  = "online"
    offline = "offline"
    warn    = "warn"
    unknown = "unknown"


class Device(Base):
    __tablename__ = "devices"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(120), nullable=False)
    ip_address    = Column(String(45), nullable=False)          # IPv4 ou IPv6
    type          = Column(SAEnum(DeviceType), nullable=False)
    location_name = Column(String(200), nullable=True)          # ex: "Sede Cidade A"
    latitude      = Column(Float, nullable=True)
    longitude     = Column(Float, nullable=True)
    priority      = Column(Integer, default=5)                  # 1 (crítico) → 10 (baixo)
    enabled       = Column(Boolean, default=True)               # pausar monitoramento
    notes         = Column(String(500), nullable=True)
    status        = Column(SAEnum(DeviceStatus), default=DeviceStatus.unknown)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    # Relacionamentos
    ping_logs = relationship("PingLog", back_populates="device",
                             cascade="all, delete-orphan", lazy="dynamic")
    alerts    = relationship("Alert", back_populates="device",
                             cascade="all, delete-orphan", lazy="dynamic")
