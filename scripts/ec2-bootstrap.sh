#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "--- [EC2 1/4] Checking swap space (2GB swap for smooth Docker builds) ---"
if ! sudo swapon --show | grep -q '/swapfile'; then
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  fi
  echo "2GB swap enabled."
else
  echo "Swap already active."
fi

echo "--- [EC2 2/4] Installing Docker Engine & Compose v2 if missing ---"
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl openssl
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo systemctl enable --now docker
  sudo usermod -aG docker "$USER" || true
  echo "Docker installed successfully."
else
  echo "Docker already installed: $(docker --version)"
fi

cd ~/sa_zalo_ott_service

if [ ! -f .env ]; then
  echo "--- [EC2 3/4] Generating production .env with strong 256-bit JWT secret ---"
  cp .env.example .env
  JWT_SECRET=$(openssl rand -hex 32)
  sed -i "s|AUTH_JWT_SECRET=.*|AUTH_JWT_SECRET=${JWT_SECRET}|" .env
else
  echo "--- [EC2 3/4] Keeping existing production .env ---"
fi

echo "--- [EC2 4/4] Building & starting Docker Compose production stack ---"
sudo docker builder prune --all --force
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml build chatter-backend
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml build chatter-ui
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml build chatter-mobile
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build

echo "--- [EC2] Waiting for GraphQL health check ---"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1/graphql -H 'Content-Type: application/json' -d '{"query":"{ health }"}' | grep -q '"ok"'; then
    echo "GraphQL health check PASSED!"
    break
  fi
  sleep 2
done

sudo docker compose ps
