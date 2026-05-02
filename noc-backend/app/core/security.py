from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

# Contexto de criptografia — usamos bcrypt como algoritmo de hash de senha
# O bcrypt é seguro pois é lento por design, dificultando ataques de força bruta
contexto_senha = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verificar_senha(senha_plana: str, senha_hash: str) -> bool:
    """Compara a senha digitada pelo usuário com o hash salvo no banco."""
    return contexto_senha.verify(senha_plana, senha_hash)

def gerar_hash_senha(senha: str) -> str:
    """
    Gera o hash bcrypt de uma senha.
    Nunca salvamos a senha pura no banco.
    O bcrypt tem limite de 72 bytes — senhas maiores são truncadas automaticamente aqui.
    """
    # Bcrypt aceita no máximo 72 bytes — truncamos para evitar erro
    senha_bytes = senha.encode("utf-8")[:72]
    senha_truncada = senha_bytes.decode("utf-8", errors="ignore")
    return contexto_senha.hash(senha_truncada)

def criar_token_acesso(dados: dict, expira_em: Optional[timedelta] = None) -> str:
    """
    Gera um token JWT assinado com os dados do usuário.
    O token expira após o tempo configurado em JWT_EXPIRE_MINUTES.
    """
    payload = dados.copy()

    # Define o tempo de expiração — usa o padrão do .env se não informado
    expiracao = datetime.now(timezone.utc) + (
        expira_em or timedelta(minutes=settings.JWT_EXPIRACAO_MINUTOS)
    )
    payload.update({"exp": expiracao})

    # Assina o token com a chave secreta e o algoritmo definidos no .env

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITMO)

def decodificar_token(token: str) -> Optional[dict]:
    """
    Decodifica e valida um token JWT.
    Retorna o payload (dados do usuário) se válido, ou None se inválido/expirado.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITMO],
        )
        return payload
    except JWTError:
        # Token inválido, adulterado ou expirado
        return None



