from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Link(Base):
    __tablename__ = "links"

    id        = Column(Integer, primary_key=True, index=True)
    src_id    = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    dst_id    = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    name      = Column(String(200), nullable=True)   # "POP → OLT"
    cap       = Column(String(20),  nullable=True)   # "10G"
    vlan      = Column(String(100), nullable=True)   # "VLAN 100"
    notes     = Column(String(500), nullable=True)
    dist_km   = Column(Float,       nullable=True)   # distância calculada
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    src = relationship("Device", foreign_keys=[src_id])
    dst = relationship("Device", foreign_keys=[dst_id])