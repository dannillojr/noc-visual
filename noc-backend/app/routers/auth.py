from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import Usuario
from app.schemas.auth import LoginEntrada, TokenSaida, UsuarioSaida
from app.core.security import verificar_senha, criar_token_acesso, decodificar_token
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timezone

roteador = APIRouter(prefix="/auth", tags=["Autenticação"])

# Esquema OAuth2 — aponta para o endpoint de login
# O FastAPI usa isso para mostrar o botão "Authorize" no Swagger
oauth2_esquema = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def obter_usuario_atual(
    token: str = Depends(oauth2_esquema),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    """
    Dependency reutilizável — decodifica o token JWT e retorna o usuário logado.
    Usada em qualquer endpoint que precisar de autenticação.
    """
    # Exceção padrão para credenciais inválidas
    erro_credenciais = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Decodifica o token e extrai o login
    payload = decodificar_token(token)
    if payload is None:
        raise erro_credenciais

    login: str = payload.get("sub")
    if login is None:
        raise erro_credenciais

    # Busca o usuário no banco pelo login
    resultado = await db.execute(select(Usuario).where(Usuario.login == login))
    usuario = resultado.scalar_one_or_none()

    if usuario is None or not usuario.ativo:
        raise erro_credenciais

    return usuario

@roteador.post("/login", response_model=TokenSaida)
async def login(dados: LoginEntrada, db: AsyncSession = Depends(get_db)):
    """
    Autentica o usuário e retorna um token JWT.
    O token deve ser enviado no header Authorization: Bearer <token> em todas as requisições.
    """
    # Busca o usuário pelo login
    resultado = await db.execute(select(Usuario).where(Usuario.login == dados.login))
    usuario = resultado.scalar_one_or_none()

    # Verifica se existe e se a senha está correta
    if usuario is None or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verifica se o usuário está ativo
    if not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário desativado — contate o administrador",
        )

    # Atualiza o campo ultimo_acesso
    usuario.ultimo_acesso = datetime.now(timezone.utc)
    await db.commit()

    # Gera o token JWT com o login como identificador
    token = criar_token_acesso(dados={"sub": usuario.login})

    return TokenSaida(access_token=token)


@roteador.get("/me", response_model=UsuarioSaida)
async def meus_dados(usuario_atual: Usuario = Depends(obter_usuario_atual)):
    """
    Retorna os dados do usuário logado.
    Útil para o frontend exibir o nome do operador logado.
    """
    return usuario_atual