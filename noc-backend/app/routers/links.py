from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.link import Link
from app.models.user import Usuario
from app.schemas.link import LinkCreate, LinkOut
from app.routers.auth import obter_usuario_atual  # dependency de autenticação

router = APIRouter(prefix="/links", tags=["links"])


# ── GET /links/ ───────────────────────────────────
# Retorna todos os enlaces salvos no banco
@router.get("/", response_model=List[LinkOut])
async def list_links(
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),  # ← exige token válido
):
    result = await db.execute(select(Link).order_by(Link.created_at))
    return result.scalars().all()


# ── POST /links/ ──────────────────────────────────
# Frontend chama isso ao criar um enlace novo
@router.post("/", response_model=LinkOut, status_code=201)
async def create_link(
    payload: LinkCreate,
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),  # ← exige token válido
):
    # Evita duplicata: mesmo src+dst já cadastrado
    existing = await db.execute(
        select(Link).where(
            Link.src_id == payload.src_id,
            Link.dst_id == payload.dst_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Enlace já existe entre esses dois dispositivos")

    link = Link(**payload.model_dump())
    db.add(link)
    await db.flush()
    await db.refresh(link)
    return link


# ── DELETE /links/{id} ────────────────────────────
# Frontend chama isso ao remover um enlace
@router.delete("/{link_id}", status_code=204)
async def delete_link_db(
    link_id: int,
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),  # ← exige token válido
):
    result = await db.execute(select(Link).where(Link.id == link_id))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Enlace não encontrado")
    await db.delete(link)