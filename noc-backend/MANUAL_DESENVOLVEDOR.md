# NOC Visual — Manual do Desenvolvedor

**Guia técnico de manutenção e evolução do sistema**

---

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    USUÁRIO (NOC)                    │
│         Navegador → login.html → index.html         │
└────────────────────┬────────────────────────────────┘
                     │ HTTP + JWT Bearer Token
┌────────────────────▼────────────────────────────────┐
│              API — FastAPI (porta 8000)             │
│              noc-backend/app/main.py                │
└──────────┬──────────────────────────┬───────────────┘
           │ SQLAlchemy async         │
┌──────────▼──────────┐   ┌──────────▼───────────────┐
│   PostgreSQL DB     │   │   Worker de Ping          │
│   (Docker :5432)    │   │   noc-backend/worker/     │
└─────────────────────┘   └──────────────────────────-┘
```

---

## Estrutura de Arquivos

```
NOC_PROJECT/
├── noc-backend/
│   ├── app/
│   │   ├── config.py            → Lê variáveis do .env
│   │   ├── database.py          → Engine async + session factory
│   │   ├── main.py              → FastAPI app, CORS, lifespan
│   │   ├── core/
│   │   │   └── security.py      → Hash bcrypt + geração/validação JWT
│   │   ├── models/
│   │   │   ├── device.py        → Tabela devices
│   │   │   ├── ping_log.py      → Tabela ping_logs
│   │   │   ├── alert.py         → Tabela alerts
│   │   │   ├── link.py          → Tabela links
│   │   │   └── user.py          → Tabela usuarios
│   │   ├── routers/
│   │   │   ├── auth.py          → POST /auth/login, GET /auth/me
│   │   │   ├── devices.py       → CRUD /devices
│   │   │   ├── alerts.py        → GET+resolve /alerts
│   │   │   ├── ping_logs.py     → GET /ping-logs/{id}
│   │   │   ├── links.py         → CRUD /links
│   │   │   └── status.py        → GET /status/summary
│   │   └── schemas/
│   │       ├── auth.py          → Pydantic LoginEntrada/TokenSaida/UsuarioSaida
│   │       ├── device.py        → Pydantic DeviceCreate/Out/Update
│   │       ├── ping_alert.py    → Pydantic PingLogOut/AlertOut
│   │       └── link.py          → Pydantic LinkCreate/LinkOut
│   ├── worker/
│   │   ├── main.py              → Entrypoint do worker
│   │   ├── monitor.py           → Loop de monitoramento + alertas
│   │   └── pinger.py            → Ping ICMP via icmplib
│   ├── scripts/
│   │   ├── criar_usuario.py     → Cria usuário admin inicial
│   │   ├── seed.py              → Carga inicial de dispositivos
│   │   ├── setup.sh             → Instalação em Linux
│   │   ├── noc-api.service      → Systemd: API
│   │   └── noc-worker.service   → Systemd: Worker
│   ├── .env                     → Variáveis de ambiente (não commitar)
│   ├── .env.example             → Template do .env
│   └── requirements.txt
│
└── noc-frontend/
    ├── index.html               → HTML principal (protegido por JWT)
    ├── login.html               → Tela de login
    ├── css/
    │   ├── reset.css            → Reset básico
    │   ├── layout.css           → Estrutura topbar/main/painéis
    │   ├── components.css       → Botões, listas, popups, stats
    │   ├── map.css              → Mapa, icons, legend, breakpanel
    │   ├── modals.css           → Modais de cadastro
    │   ├── animations.css       → Keyframes
    │   └── login.css            → Estilos exclusivos da tela de login
    └── js/
        ├── auth.js              → Gerencia token JWT (salvar/recuperar/logout)
        ├── login.js             → Lógica da tela de login
        ├── api.js               → Camada HTTP (injeta token em todas as requests)
        ├── state.js             → Estado global (nodes, links, alerts)
        ├── map.js               → Leaflet init, tiles, busca
        ├── nodes.js             → Icons, popups, showDetail, simulações
        ├── links.js             → Polylines, rompimento, restaurar
        ├── ui.js                → renderElemList, updateStats, renderAlerts, toolbox
        ├── monitoring.js        → Canvas de latência, toggle monitoramento
        ├── modals.js            → Modal cadastro/edição + modal enlace
        ├── storage.js           → Export/Import JSON
        └── main.js              → DOMContentLoaded, polling, CRUD backend
```

---

## Banco de Dados

### Tabelas

**devices**
| Campo | Tipo | Descrição |
|---|---|---|
| id | int PK | Auto incremento |
| name | varchar(120) | Nome do dispositivo |
| ip_address | varchar(45) | IP (IPv4) |
| type | enum | `pop`, `radio`, `server`, `corporate` |
| location_name | varchar(200) | Endereço físico |
| latitude | float | Coordenada Y |
| longitude | float | Coordenada X |
| priority | int | 1 (crítico) a 10 (baixo) |
| enabled | bool | False = pausar monitoramento |
| notes | varchar(500) | Observações livres |
| status | enum | `online`, `offline`, `warn`, `unknown` |
| created_at | timestamptz | Automático |
| updated_at | timestamptz | Automático no update |

**ping_logs**
| Campo | Tipo | Descrição |
|---|---|---|
| id | int PK | |
| device_id | int FK | Referência a devices |
| latency_ms | float | Null se sem resposta |
| packet_loss | float | 0.0 a 100.0 |
| status | enum | `online`, `offline`, `warn` |
| checked_at | timestamptz | Quando foi verificado |

**alerts**
| Campo | Tipo | Descrição |
|---|---|---|
| id | int PK | |
| device_id | int FK | Referência a devices |
| message | varchar(500) | Texto do alerta |
| severity | enum | `info`, `warning`, `critical` |
| resolved | bool | False = ativo |
| resolved_at | timestamptz | Quando foi resolvido |
| created_at | timestamptz | Quando foi gerado |

**links**
| Campo | Tipo | Descrição |
|---|---|---|
| id | int PK | |
| src_id | int FK | Device origem |
| dst_id | int FK | Device destino |
| name | varchar(200) | "POP → OLT" |
| cap | varchar(20) | Capacidade "10G" |
| vlan | varchar(100) | VLAN/Circuito |
| notes | varchar(500) | Observações |
| dist_km | float | Distância calculada |
| created_at | timestamptz | |

**usuarios**
| Campo | Tipo | Descrição |
|---|---|---|
| id | int PK | |
| nome | varchar(100) | Nome de exibição |
| login | varchar(50) | Login único |
| senha_hash | varchar(200) | Hash bcrypt — nunca senha pura |
| ativo | bool | False = usuário desativado |
| admin | bool | True = administrador |
| criado_em | timestamptz | |
| ultimo_acesso | timestamptz | Atualizado a cada login |

---

## Autenticação JWT

O sistema usa JWT (JSON Web Token) para autenticação.

### Fluxo

```
1. Usuário envia login + senha → POST /auth/login
2. API valida credenciais no banco (bcrypt)
3. API retorna access_token (JWT assinado)
4. Frontend salva o token no localStorage
5. Todas as requisições seguintes enviam: Authorization: Bearer <token>
6. Token expira após JWT_EXPIRACAO_MINUTOS (padrão: 480 = 8h)
7. Com token expirado → API retorna 401 → frontend redireciona para login
```

### Configurações no .env

```env
JWT_SECRET=chave_secreta_longa_e_aleatoria
JWT_ALGORITMO=HS256
JWT_EXPIRACAO_MINUTOS=480
```

> ⚠️ O `JWT_SECRET` deve ser uma string longa e aleatória em produção.
> Gere com: `python -c "import secrets; print(secrets.token_hex(32))"`

### Criar o primeiro usuário admin

```powershell
# Rodar uma única vez após subir a API pela primeira vez
python -m scripts.criar_usuario
```

> ⚠️ Edite o login e senha padrão no script antes de rodar em produção.

### Proteger novos endpoints

Todo endpoint novo deve incluir a dependency de autenticação:

```python
from app.models.user import Usuario
from app.routers.auth import obter_usuario_atual

@router.get("/novo-endpoint")
async def meu_endpoint(
    db: AsyncSession = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),  # ← exige token válido
):
    ...
```

---

## Tipos de Dispositivo (IMPORTANTE)

O banco aceita exatamente **4 tipos**. O frontend deve enviar sempre um destes valores:

| Valor no banco | Exibição na UI | Uso |
|---|---|---|
| `pop` | POP | Ponto de presença |
| `radio` | RB / OLT | Rádio, bridge, OLT, equipamento de transmissão |
| `server` | Servidor | Servidores internos da empresa |
| `corporate` | Corporativo | Clientes com contrato prioritário |

> ⚠️ Qualquer outro valor causará erro 422 na API.

---

## Como subir o ambiente de desenvolvimento (Windows)

```powershell
# Terminal 1 — Banco
docker start noc-postgres

# Terminal 2 — API
cd NOC_PROJECT\noc-backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3 — Worker (precisa ser Administrador para ICMP)
cd NOC_PROJECT\noc-backend
venv\Scripts\activate
python -m worker.main

# Terminal 4 — Frontend
cd NOC_PROJECT\noc-frontend
python -m http.server 3000
```

Acessos:
- Dashboard: http://localhost:3000 (redireciona para login)
- Login:     http://localhost:3000/login.html
- API Docs:  http://localhost:8000/docs
- Health:    http://localhost:8000/health

---

## Como fazer deploy em produção (Linux)

```bash
# Banco no Docker
docker run -d --name noc-postgres --restart always \
  -e POSTGRES_USER=noc_user -e POSTGRES_PASSWORD=SENHA_FORTE \
  -e POSTGRES_DB=noc_db -p 5432:5432 postgres:15

# Copia arquivos
cp -r noc-backend/ /opt/noc-backend/
cd /opt/noc-backend
python3.11 -m venv venv
./venv/bin/pip install -r requirements.txt

# Configura .env
cp .env.example .env
nano .env   # ajusta DATABASE_URL, CORS_ORIGINS e JWT_SECRET

# Cria o usuário admin inicial
./venv/bin/python -m scripts.criar_usuario

# Systemd
cp scripts/noc-api.service    /etc/systemd/system/
cp scripts/noc-worker.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now noc-api noc-worker

# Frontend — nginx
cp -r noc-frontend/ /var/www/html/noc/
# Em index.html e login.html: window.NOC_API_BASE = 'http://IP_DO_SERVIDOR:8000'
```

---

## API — Referência rápida

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| POST | /auth/login | ❌ público | Autentica e retorna JWT |
| GET | /auth/me | ✅ JWT | Dados do usuário logado |
| GET | /devices | ✅ JWT | Lista todos os dispositivos |
| POST | /devices | ✅ JWT | Cadastra dispositivo |
| PUT | /devices/{id} | ✅ JWT | Edita dispositivo |
| DELETE | /devices/{id} | ✅ JWT | Remove dispositivo |
| GET | /alerts | ✅ JWT | Lista alertas |
| POST | /alerts/{id}/resolve | ✅ JWT | Resolve alerta |
| GET | /ping-logs/{id} | ✅ JWT | Histórico de pings |
| GET | /links | ✅ JWT | Lista enlaces |
| POST | /links | ✅ JWT | Cria enlace |
| DELETE | /links/{id} | ✅ JWT | Remove enlace |
| GET | /status/summary | ✅ JWT | Resumo para topbar |
| GET | /health | ❌ público | Health check |

Documentação interativa completa: `http://[servidor]:8000/docs`

---

## Manutenção Comum

### Ver logs em tempo real (produção)
```bash
journalctl -fu noc-api     # logs da API
journalctl -fu noc-worker  # logs do worker de ping
```

### Limpar histórico de ping antigo (manutenção mensal)
```sql
-- Mantém apenas os últimos 30 dias
DELETE FROM ping_logs WHERE checked_at < NOW() - INTERVAL '30 days';
```

### Resolver todos os alertas pendentes manualmente
```sql
UPDATE alerts SET resolved = true, resolved_at = NOW() WHERE resolved = false;
```

### Ver dispositivos offline agora
```sql
SELECT name, ip_address, type, status FROM devices WHERE status = 'offline';
```

### Pausar monitoramento de um dispositivo sem remover
```bash
# Via API (necessário enviar token JWT no header)
curl -X PUT http://localhost:8000/devices/ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"enabled": false}'
```

### Adicionar novos dispositivos em lote
Edite `scripts/seed.py` com os novos IPs e execute:
```bash
./venv/bin/python scripts/seed.py
```

---

## Pontos de Atenção para Manutenção

### Frontend — js/auth.js
- O token JWT é salvo no `localStorage` com a chave `noc_token`
- O objeto `auth` é carregado antes de qualquer outro script
- Se o token expirar, `api.js` detecta o 401 e chama `auth.fazerLogout()` automaticamente

### Frontend — js/api.js
- O token é injetado automaticamente em **todas** as requisições via header `Authorization: Bearer`
- O `API_BASE` é definido em `index.html` e `login.html` via `window.NOC_API_BASE`

### Frontend — js/map.js
- O centro padrão do mapa está configurado para o Ceará. Ajuste `setView` para sua cidade.

### Backend — app/core/security.py
- Usamos `bcrypt` versão `4.0.1` — não atualizar para versões superiores (incompatível com `passlib`)
- O `JWT_SECRET` deve ser longo e aleatório em produção

### Backend — worker/pinger.py
- O worker usa `icmplib` que requer permissão de raw socket (root ou cap_net_raw)
- No Windows em desenvolvimento: rodar terminal como Administrador
- Em produção Linux: `noc-worker.service` usa `User=root` por padrão

### Backend — worker/monitor.py
- A re-sincronização da lista de devices ocorre a cada **5 minutos**
- Dispositivos novos entram no monitoramento em até 5 min sem reiniciar o worker
- A lógica de alerta cria **1 alerta por evento** e resolve automaticamente quando o device volta

---

## Dependências Python

```
fastapi==0.109.2
uvicorn[standard]==0.27.1
sqlalchemy==2.0.25
asyncpg==0.29.0
alembic==1.13.1
pydantic==2.6.1
pydantic-settings==2.1.0
icmplib==3.0.3
python-dotenv==1.0.1
httpx==0.26.0
python-jose[cryptography]   ← JWT
passlib[bcrypt]             ← hash de senha
bcrypt==4.0.1               ← versão compatível com passlib
```

> ⚠️ Não usar Python 3.14 — asyncpg e pydantic-core não têm wheels prontos. Usar Python 3.11.9.

---

## Roadmap — Próximas Funcionalidades

### Alta prioridade
- [ ] Limpeza automática de ping_logs (rotina diária, manter 30 dias)
- [ ] Monitoramento de ONUs via SNMP — ZTE ZXA10 C610

### Média prioridade
- [ ] Tela de administração de usuários (trocar senha, criar/desativar)
- [ ] Notificação sonora no navegador quando device cai
- [ ] Página de histórico de alertas com filtros
- [ ] Rate limiting na API
- [ ] HTTPS com certificado auto-assinado

### Baixa prioridade (futuro)
- [ ] Dashboard de métricas do servidor
- [ ] Relatório de disponibilidade (uptime %)
- [ ] Integração Telegram/WhatsApp
- [ ] API RouterOS MikroTik
- [ ] Topologia FTTH completa (CTO, CEO, ONUs)
