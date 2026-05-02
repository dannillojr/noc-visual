from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LinkCreate(BaseModel):
    """Dados enviados pelo frontend ao criar um enlace."""
    src_id:  int
    dst_id:  int
    name:    Optional[str] = None
    cap:     Optional[str] = None
    vlan:    Optional[str] = None
    notes:   Optional[str] = None
    dist_km: Optional[float] = None


class LinkOut(BaseModel):
    """Dados retornados pela API para o frontend."""
    id:         int
    src_id:     int
    dst_id:     int
    name:       Optional[str]
    cap:        Optional[str]
    vlan:       Optional[str]
    notes:      Optional[str]
    dist_km:    Optional[float]
    created_at: datetime

    model_config = {"from_attributes": True}