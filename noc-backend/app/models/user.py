from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Usuario(Base):
    """
    Tabela de usuários do sistema NOC.
    Armazena as credenciais de acesso ao painel.
    """
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Nome de exibição do usuário (ex: "Danilo NOC")
    nome: Mapped[str] = mapped_column(String(100), nullable=False)

    # Login único — usado para autenticar
    login: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    # Senha armazenada como hash bcrypt — nunca em texto puro
    senha_hash: Mapped[str] = mapped_column(String(200), nullable=False)

    # Controle de acesso — False = usuário desativado sem precisar deletar
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Administrador — futuramente pode controlar permissões extras
    admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Timestamps automáticos
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    ultimo_acesso: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,  # Null até o primeiro login
    )