#!/bin/bash
# ─────────────────────────────────────────────────────────
# setup.sh — Instala o NOC Visual Backend no servidor Linux
# Testado em: Ubuntu 22.04 / Debian 12
#
# Uso:
#   chmod +x scripts/setup.sh
#   sudo ./scripts/setup.sh
# ─────────────────────────────────────────────────────────

set -e

echo "=== NOC Visual — Setup ==="

# ── 1. Dependências do sistema ────────────────────
apt-get update -q
apt-get install -y python3 python3-pip python3-venv postgresql postgresql-contrib

# ── 2. Banco de dados ─────────────────────────────
echo "Criando banco de dados..."
sudo -u postgres psql -c "CREATE USER noc_user WITH PASSWORD 'senha_segura';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE noc_db OWNER noc_user;" 2>/dev/null || true

# ── 3. Diretório da aplicação ─────────────────────
mkdir -p /opt/noc-backend
cp -r . /opt/noc-backend/
cd /opt/noc-backend

# ── 4. Virtualenv ─────────────────────────────────
python3 -m venv venv
./venv/bin/pip install --upgrade pip -q
./venv/bin/pip install -r requirements.txt -q

# ── 5. Arquivo .env ───────────────────────────────
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  EDITE /opt/noc-backend/.env com seus dados reais!"
fi

# ── 6. Usuário do sistema ─────────────────────────
useradd -r -s /bin/false noc 2>/dev/null || true
chown -R noc:noc /opt/noc-backend

# ── 7. Permissão ICMP para Python (worker sem root) ──
# Alternativa ao User=root no .service
# setcap cap_net_raw+ep $(./venv/bin/python3 -c "import sys; print(sys.executable)")

# ── 8. Systemd ────────────────────────────────────
cp scripts/noc-api.service    /etc/systemd/system/
cp scripts/noc-worker.service /etc/systemd/system/

systemctl daemon-reload
systemctl enable noc-api noc-worker
systemctl start  noc-api noc-worker

echo ""
echo "=== Instalação concluída ==="
echo "API rodando em: http://$(hostname -I | awk '{print $1}'):8000"
echo "Docs:           http://$(hostname -I | awk '{print $1}'):8000/docs"
echo ""
echo "Próximos passos:"
echo "  1. Edite /opt/noc-backend/.env com DATABASE_URL e CORS_ORIGINS reais"
echo "  2. Edite scripts/seed.py com seus IPs e coordenadas reais"
echo "  3. Execute: cd /opt/noc-backend && ./venv/bin/python scripts/seed.py"
echo "  4. Reinicie: systemctl restart noc-api noc-worker"
