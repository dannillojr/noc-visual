from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str
    APP_ENV: str = "production"
    APP_SECRET: str = "changeme"

    # Configurações de autenticação JWT
    JWT_SECRET: str = "noc_jwt_secret_local"   # Trocar em produção!
    JWT_ALGORITMO: str = "HS256"               # Algoritmo de assinatura do token
    JWT_EXPIRACAO_MINUTOS: int = 480           # Tempo de validade do token (8 horas)


    # Thresholds
    LATENCY_WARN_MS: int = 100
    LATENCY_CRIT_MS: int = 300
    PACKET_LOSS_CRIT: int = 20

    # Intervalos de ping (segundos)
    PING_INTERVAL_SERVER: int = 30
    PING_INTERVAL_RADIO: int = 30
    PING_INTERVAL_CORPORATE: int = 60
    PING_INTERVAL_POP: int = 30

    # CORS
    CORS_ORIGINS: str = "http://localhost"

    def get_cors_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    def get_ping_interval(self, device_type: str) -> int:
        mapping = {
            "server":    self.PING_INTERVAL_SERVER,
            "radio":     self.PING_INTERVAL_RADIO,
            "corporate": self.PING_INTERVAL_CORPORATE,
            "pop":       self.PING_INTERVAL_POP,
        }
        return mapping.get(device_type, 60)

    class Config:
        env_file = ".env"


settings = Settings()
