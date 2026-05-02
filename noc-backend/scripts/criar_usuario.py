"""
Script para criar o usuário administrador inicial do NOC.
Rodar uma única vez antes de ativar a autenticação.

Uso:
    python -m scripts.criar_usuario
"""
import asyncio
from app.database import AsyncSessionLocal
from app.models.user import Usuario
from app.core.security import gerar_hash_senha


async def criar_admin():
    # ── Defina aqui o login e senha do administrador ──
    nome  = "Administrador NOC"
    login = "admin"
    senha = "noc@2026"          # Troque em produção!
    # ─────────────────────────────────────────────────

    async with AsyncSessionLocal() as sessao:
        # Verifica se o usuário já existe para não duplicar
        from sqlalchemy import select
        resultado = await sessao.execute(
            select(Usuario).where(Usuario.login == login)
        )
        usuario_existente = resultado.scalar_one_or_none()

        if usuario_existente:
            print(f"⚠️  Usuário '{login}' já existe no banco. Nenhuma ação feita.")
            return

        # Cria o novo usuário com senha hasheada
        novo_usuario = Usuario(
            nome=nome,
            login=login,
            senha_hash=gerar_hash_senha(senha),
            ativo=True,
            admin=True,
        )

        sessao.add(novo_usuario)
        await sessao.commit()
        print(f"✅  Usuário '{login}' criado com sucesso!")
        print(f"    Login: {login}")
        print(f"    Senha: {senha}")
        print(f"    ⚠️  Troque a senha após o primeiro acesso em produção!")


if __name__ == "__main__":
    asyncio.run(criar_admin())