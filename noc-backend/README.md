# NOC Visual — Sistema de Monitoramento de Rede

Sistema interno de monitoramento de rede para ISP. Desenvolvido com FastAPI + PostgreSQL + JavaScript puro + Leaflet.

---

## Funcionalidades

- Mapa interativo com tema dark (Leaflet)
- Ping ICMP real via worker Python assíncrono
- Alertas automáticos (offline, instável, restauração)
- Enlaces visuais entre dispositivos persistidos no banco
- Gráfico de latência em tempo real
- Autenticação JWT (login, token, logout)
- Export/Import JSON
- Simulação de falha para treinamento

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.11 + FastAPI |
| Banco | PostgreSQL 15 (Docker) |
| ORM | SQLAlchemy 2.0 async |
| Worker | asyncio + icmplib |
| Frontend | HTML + CSS + JavaScript puro + Leaflet |
| Auth | JWT (python-jose + passlib + bcrypt) |

---

## Estrutura de Arquivos

```
NOC_PROJECT/
├── noc-backend/
│   ├── app/
│   │   ├── config.py            ← Configurações (lê do .env)
│   │   ├── database.py          ← Conexão PostgreSQL async
│   │   ├── main.py              ← Entrypoint FastAPI
│   │   ├── core/
│   │   │   └── security.py      ← Hash bcrypt + JWT
│   │   ├── models/
│   │   │   ├── device.py        ← Tabela devices
│   │   │   ├── ping_log.py      ← Tabela ping_logs
│   │   │   ├── alert.py         ← Tabela alerts
│   │   │   ├── link.py          ← Tabela links
│   │   │   └── user.py          ← Tabela usuarios
│   │   ├── routers/
│   │   │   ├── auth.py          ← POST /auth/login, GET /auth/me
│   │   │   ├── devices.py       ← CRUD /devices
│   │   │   ├── alerts.py        ← GET/resolve /alerts
│   │   │   ├── ping_logs.py     ← GET /ping-logs/{id}
│   │   │   ├── links.py         ← CRUD /links
│   │   │   └── status.py        ← GET /status/summary
│   │   └── schemas/
│   │       ├── auth.py          ← Pydantic login/token/usuario
│   │       ├── device.py        ← Pydantic DeviceCreate/Out/Update
│   │       ├── ping_alert.py    ← Pydantic PingLogOut/AlertOut
│   │       └── link.py          ← Pydantic LinkCreate/LinkOut
│   ├── worker/
│   │   ├── main.py              ← Entrypoint do worker
│   │   ├── monitor.py           ← Loop de monitoramento + alertas
│   │   └── pinger.py            ← Ping ICMP via icmplib
│   ├── scripts/
│   │   ├── criar_usuario.py     ← Cria usuário admin inicial
│   │   ├── seed.py              ← Carga inicial de dispositivos
│   │   ├── setup.sh             ← Instalação completa no servidor
│   │   ├── noc-api.service      ← Systemd: API
│   │   └── noc-worker.service   ← Systemd: Worker
│   ├── .env.example             ← Template de configuração
│   └── requirements.txt
│
└── noc-frontend/
    ├── index.html               ← Dashboard principal (protegido por JWT)
    ├── login.html               ← Tela de login
    ├── css/
    │   ├── reset.css
    │   ├── layout.css
    │   ├── components.css
    │   ├── map.css
    │   ├── modals.css
    │   ├── animations.css
    │   └── login.css            ← Estilos da tela de login
    └── js/
        ├── auth.js              ← Gerencia token JWT
        ├── login.js             ← Lógica da tela de login
        ├── api.js               ← Chamadas HTTP (injeta token automaticamente)
        ├── state.js             ← Estado global
        ├── map.js               ← Leaflet + camadas
        ├── nodes.js             ← Markers, popups, ícones
        ├── links.js             ← Polylines + persistência banco
        ├── ui.js                ← Listas, alertas, stats, toolbox
        ├── monitoring.js        ← Canvas latência
        ├── modals.js            ← Modal cadastro/edição
        ├── storage.js           ← Export/Import JSON
        └── main.js              ← Init + polling + CRUD backend
```

---

## Instalação — Desenvolvimento (Windows)

### 1. Pré-requisitos

- Python 3.11.9
- Docker Desktop
- Node não necessário

### 2. Banco de dados

```powershell
docker run -d --name noc-postgres `
  -e POSTGRES_USER=noc_user `
  -e POSTGRES_PASSWORD=noc123 `
  -e POSTGRES_DB=noc_db `
  -p 5432:5432 postgres:15
```

### 3. Backend

```powershell
cd noc-backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edite o .env com suas configurações
```

### 4. Criar o usuário admin

```powershell
# Com a API rodando (passo 5), rode em outro terminal:
python -m scripts.criar_usuario
```

> ⚠️ Edite o login e senha no script antes de rodar em produção.

### 5. Subir os serviços

```powershell
# Terminal 1 — Banco
docker start noc-postgres

# Terminal 2 — API
cd noc-backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3 — Worker (rodar como Administrador para ICMP)
cd noc-backend
venv\Scripts\activate
python -m worker.main

# Terminal 4 — Frontend
cd noc-frontend
python -m http.server 3000
```

### 6. Acessar

| Serviço | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| Login | http://localhost:3000/login.html |
| API Docs | http://localhost:8000/docs |
| Health | http://localhost:8000/health |

---

## Instalação — Produção (Linux)

```bash
# Banco
docker run -d --name noc-postgres --restart always \
  -e POSTGRES_USER=noc_user -e POSTGRES_PASSWORD=SENHA_FORTE \
  -e POSTGRES_DB=noc_db -p 5432:5432 postgres:15

# Backend
cp -r noc-backend/ /opt/noc-backend/
cd /opt/noc-backend
python3.11 -m venv venv
./venv/bin/pip install -r requirements.txt

# Configurar .env
cp .env.example .env
nano .env   # ajustar DATABASE_URL, CORS_ORIGINS e JWT_SECRET

# Criar usuário admin
./venv/bin/python -m scripts.criar_usuario

# Systemd
cp scripts/noc-api.service    /etc/systemd/system/
cp scripts/noc-worker.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now noc-api noc-worker

# Frontend — configurar IP da API
# Em index.html e login.html: window.NOC_API_BASE = 'http://IP_DO_SERVIDOR:8000'
cp -r noc-frontend/ /var/www/html/noc/
```

---

## Configuração — `.env`

```env
# Banco de dados
DATABASE_URL=postgresql+asyncpg://noc_user:senha@localhost:5432/noc_db

# Geral
APP_ENV=production
APP_SECRET=troque_para_chave_aleatoria_longa

# JWT — gere com: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=troque_para_chave_aleatoria_longa
JWT_ALGORITMO=HS256
JWT_EXPIRACAO_MINUTOS=480

# Thresholds de alerta
LATENCY_WARN_MS=100
LATENCY_CRIT_MS=300
PACKET_LOSS_CRIT=20

# Intervalos de ping (segundos)
PING_INTERVAL_SERVER=30
PING_INTERVAL_RADIO=30
PING_INTERVAL_CORPORATE=60
PING_INTERVAL_POP=30

# CORS
CORS_ORIGINS=http://localhost:3000
```

---

## API — Endpoints

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| POST | /auth/login | ❌ | Autentica e retorna JWT |
| GET | /auth/me | ✅ | Dados do usuário logado |
| GET | /devices | ✅ | Lista dispositivos |
| POST | /devices | ✅ | Cadastra dispositivo |
| PUT | /devices/{id} | ✅ | Edita dispositivo |
| DELETE | /devices/{id} | ✅ | Remove dispositivo |
| GET | /alerts | ✅ | Lista alertas |
| POST | /alerts/{id}/resolve | ✅ | Resolve alerta |
| GET | /ping-logs/{id} | ✅ | Histórico de pings |
| GET | /links | ✅ | Lista enlaces |
| POST | /links | ✅ | Cria enlace |
| DELETE | /links/{id} | ✅ | Remove enlace |
| GET | /status/summary | ✅ | Resumo para topbar |
| GET | /health | ❌ | Health check |
| GET | /docs | ❌ | Swagger UI |

---

## Permissão ICMP para o Worker

O ping ICMP real requer permissão de raw socket.

**Opção A — mais simples:** Worker roda como root (padrão no `.service`)

**Opção B — mais seguro:** Dar cap_net_raw ao Python
```bash
sudo setcap cap_net_raw+ep /opt/noc-backend/venv/bin/python3
# Então mude User=noc no noc-worker.service
```

---

## Próximas Implementações

- [ ] Limpeza automática de ping_logs (30 dias)
- [ ] Monitoramento de ONUs via SNMP (ZTE ZXA10 C610)
- [ ] Tela de administração de usuários
- [ ] Notificações WhatsApp/Telegram
- [ ] Relatório de disponibilidade (uptime %)
