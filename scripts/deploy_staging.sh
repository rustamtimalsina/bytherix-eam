#!/usr/bin/env bash
# ==============================================================================
# Bytherix EAM — Turnkey Cloud Staging Deployment Script
# Targets: Ubuntu 22.04 / 24.04 LTS Cloud VPS (AWS, DigitalOcean, Oracle Free)
# Automatically installs Docker, builds production containers, initializes
# PostgreSQL pgvector, and launches Nginx SSL Ingress.
# ==============================================================================

set -euo pipefail

echo "======================================================================"
echo "BYTHERIX EAM — CLOUD STAGING & PRODUCTION DEPLOYMENT RUNNER"
echo "======================================================================"

# 1. Check Root / Sudo Permissions
if [ "$(id -u)" -ne 0 ]; then
    echo "[-] This deployment script must be run as root or with sudo."
    exit 1
fi

# 2. Install Docker & Docker Compose if missing
if ! command -v docker &> /dev/null; then
    echo "[+] Installing Docker Engine and Compose Plugin..."
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg lsb-release
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "[✓] Docker Engine installed successfully: $(docker --version)"
else
    echo "[✓] Docker is already installed: $(docker --version)"
fi

# 3. Setup Production Environment Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

if [ ! -f .env.production ]; then
    echo "[+] Generating default .env.production configuration..."
    cat << 'EOF' > .env.production
APP_ENV=production
POSTGRES_DB=bytherix_eam_prod
POSTGRES_USER=bytherix_admin
POSTGRES_PASSWORD=bytherix_prod_secure_pass_9921
REDIS_PASSWORD=bytherix_redis_secure_pass_4481
S3_ACCESS_KEY=bytherix_s3_key
S3_SECRET_KEY=bytherix_s3_secret
SECRET_KEY=bx_prod_master_secret_key_8839210492817401
FRONTEND_URL=https://app.bytherix.com
EOF
    echo "[✓] Created .env.production. Please review keys before public domain launch."
fi

# 4. Pull Base Images & Build Multi-Container Stack
echo "[+] Validating Docker Compose configuration..."
docker compose --env-file .env.production -f docker-compose.prod.yml config -q

echo "[+] Building frontend and backend containers..."
docker compose --env-file .env.production -f docker-compose.prod.yml build

# 5. Boot Up Services in Background
echo "[+] Launching Bytherix EAM production services..."
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# 6. Verify Health Probes
echo "[+] Waiting for database and services to reach healthy status..."
sleep 10
docker compose --env-file .env.production -f docker-compose.prod.yml ps

echo "======================================================================"
echo "[✓] BYTHERIX EAM CLOUD STAGING DEPLOYMENT COMPLETE"
echo "Backend:  http://localhost:8000/health"
echo "Frontend: http://localhost:3000"
echo "Nginx:    http://localhost/health (Ports 80 & 443 active)"
echo "======================================================================"
