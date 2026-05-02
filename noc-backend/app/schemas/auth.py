from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class LoginEntrada(BaseModel):
    """Dados recebidos no corpo da requisição de login."""
    login: str
    senha: str


class TokenSaida(BaseModel):
    """Resposta retornada após login bem-sucedido."""
    access_token: str
    token_type: str = "bearer"  # Padrão OAuth2


class UsuarioSaida(BaseModel):
    """Dados públicos do usuário — nunca expor senha_hash."""
    id: int
    nome: str
    login: str
    ativo: bool
    admin: bool
    criado_em: datetime
    ultimo_acesso: Optional[datetime] = None

    class Config:
        from_attributes = True  # Permite converter ORM → Pydantic