# sa_zalo_ott_service — Chatter OTT Messaging Service

Zalo-inspired OTT messaging web application built with **React 19 + Material UI** (`chatter-ui`), **NestJS 12 + Apollo GraphQL** (`chatter-backend`), and **MongoDB 7**.

## Documentation

- [Course Brief (Detai2026.pdf)](./docs/Detai2026.pdf)
- [Architecture Report: requirement traceability, patterns, quality attributes, ADRs (Vietnamese)](./docs/architecture-report.md)
- [Architecture Audit & MVP Implementation Plan](./PLAN.md)
- [Feature Enhancement Plan: optimization, Android APK, and 1-1 calls](./docs/feature-enhancement-plan.md)
- [System Data Model & Business Flows (Vietnamese)](./docs/system-data-flow.md)

---

## Container Architecture

```text
Browser (http://localhost:3000 or http://<EC2_PUBLIC_IP>:3000)
   │
   ▼
┌──────────────────────────────────────────────────────────┐
│  chatter-ui (nginx:alpine, container port 80)            │
│  ├─ /             → Static React 19 SPA (try_files)      │
│  ├─ /graphql      → proxy_pass http://chatter-backend:4000 │
│  ├─ /uploads      → proxy_pass http://chatter-backend:4000 │
│  └─ /socket.io/   → WebSocket upgrade → chatter-backend  │
└───────────────────────────┬──────────────────────────────┘
                            │ (Docker internal network)
                            ▼
┌──────────────────────────────────────────────────────────┐
│  chatter-backend (node:22-alpine, port 4000)             │
│  ├─ NestJS 12 + Apollo GraphQL + JWT Auth                │
│  └─ Persistent volume: backend_uploads → /app/uploads    │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  mongodb (mongo:7, port 27017)                           │
│  └─ Persistent volume: mongodb_data → /data/db           │
└──────────────────────────────────────────────────────────┘
```

Because `chatter-ui` defaults `REACT_APP_GRAPHQL_URL` to `/graphql` and reverse-proxies API, upload, and WebSocket routes through Nginx, the exact same container stack works on `localhost` and on any **AWS EC2 public IP / domain** without CORS issues or hardcoded hostnames.

---

## 1. Run Locally with Docker (Recommended)

### Prerequisites
- **Docker Desktop** (Windows / macOS) or **Docker Engine + Docker Compose v2** (Linux).

### Start the Entire Stack (Single Command)

From the repository root:

```bash
docker compose up -d --build
```

*(Optional)* If you want to customize ports or secrets before starting, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Verify Services & Access URLs

Check container health status and logs:

```bash
docker compose ps
docker compose logs -f
```

Once all three containers (`sa-zalo-mongodb`, `sa-zalo-backend`, `sa-zalo-ui`) are running/healthy:

| Service | Local URL | Notes |
| :--- | :--- | :--- |
| **Web UI (Nginx + React)** | http://localhost:3000 | Main desktop web entrypoint (`/login`, `/signup`, `/`) |
| **Mobile App (Nginx + Expo RN)** | http://localhost:3001 | Companion mobile app sharing the exact same Backend & MongoDB |
| **GraphQL API (via Nginx)** | http://localhost:3000/graphql | Proxied directly to `chatter-backend:4000` |
| **Backend Direct Endpoint** | http://localhost:4000/graphql | Direct NestJS container port (health check at `http://localhost:4000/`) |
| **MongoDB** | `mongodb://localhost:27017/sa_zalo_ott` | Persisted in Docker volume `mongodb_data` |

### Seeded Demo Accounts (Auto-Created on Startup)

When `SEED_DEMO_DATA=true` (default), the backend idempotently seeds ready-to-use demo accounts, contacts, sample 1-1 & group conversations, attachments, and 7 days of analytics events:

| Role | Email | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@chatter.vn` | `Admin@123456` | Full System Analytics Dashboard (`Thống kê`), Account & Group Management (`Quản trị hệ thống`), Chat |
| **Group Owner** | `minh.nguyen@chatter.vn` | `Password@123` | Owner of `"Nhóm Đồ Án KTPM — Zalo OTT"`, 1-1 & Group Chat, Member/Admin management |
| **Group Admin** | `lan.tran@chatter.vn` | `Password@123` | Group Admin, 1-1 & Group Chat |
| **Member** | `huy.le@chatter.vn` | `Password@123` | Group Member, 1-1 & Group Chat |

### Stop / Reset Containers

```bash
# Stop containers (preserves MongoDB data and uploads)
docker compose down

# Stop containers AND wipe database/upload volumes
docker compose down -v
```

---

## 2. Running Tests

### Option A: Run Tests via Docker (No Local Node/pnpm Required)

```bash
# Run backend unit tests (Vitest)
docker run --rm -w /app node:22-alpine sh -c "npm install -g pnpm@10 && pnpm install --no-frozen-lockfile && pnpm test" < /dev/null
```

Or mount the workspace directly:

```bash
# Backend unit tests (Vitest)
docker build --target builder -t chatter-backend-test ./chatter-backend
docker run --rm -v ./chatter-backend/test:/app/test -v ./chatter-backend/vitest.config.ts:/app/vitest.config.ts chatter-backend-test npx vitest run

# Frontend unit tests (Jest + React Testing Library)
docker build --target builder -t chatter-ui-test ./chatter-ui
docker run --rm -e CI=true chatter-ui-test npx react-scripts test --watchAll=false
```

### Option B: Run Tests Locally with Node.js (v22+) & pnpm

1. Enable `pnpm` (or install via `npm install -g pnpm`):
   ```bash
   corepack enable
   ```
2. **Backend Tests (`chatter-backend`):**
   ```bash
   cd chatter-backend
   cp .env.example .env
   pnpm install
   pnpm test          # Unit tests (Vitest)
   pnpm test:e2e      # E2E acceptance tests (needs MongoDB, see below)
   ```
   The e2e suite starts the whole app and covers every requirement in the course brief
   (accounts, groups, 1-1 and group chat with all 5 message kinds, real-time delivery, statistics).
   It uses MongoDB at `mongodb://localhost:27017` (override with `E2E_MONGODB_URL`), creates its own
   `chatter_e2e_<timestamp>` database, and drops it when finished.
3. **Frontend Tests (`chatter-ui`):**
   ```bash
   cd chatter-ui
   pnpm install
   pnpm test --watchAll=false
   ```

### Continuous Integration & Weekly Cloud Release (GitHub Actions)

| Workflow | Runs | What it does |
| :--- | :--- | :--- |
| [CI](./.github/workflows/ci.yml) | Every push and pull request | Backend lint, unit tests, e2e tests (MongoDB service container), build; frontend type check, tests, build; Docker image build |
| [Weekly release](./.github/workflows/weekly-release.yml) | Fridays 10:00 Vietnam time, or manually from the Actions tab | Re-runs CI, deploys to AWS EC2, fails if the live `/graphql` health check does not pass, then creates a `release-YYYY-Www` GitHub Release |

One-time setup for the weekly release: create the EC2 instance (see section 3), then add the repository secrets
`EC2_HOST` (public IP or DNS) and `EC2_SSH_KEY` (contents of the `.pem` file) under
**Settings → Secrets and variables → Actions**. Scheduled runs only happen on the default branch (`main`).

---

## 3. Deploying on AWS EC2 (Automated & Manual Guides)

### Option A: Fully Automated 1-Command AWS Provisioning & Deployment (Windows PowerShell)

Once you have configured AWS CLI (`aws configure`), run from the repository root:

```powershell
# Automatically creates VPC Security Group, SSH Key Pair, Free-Tier Ubuntu 24.04 EC2 instance,
# 2GB swap, Docker Engine, and deploys the full production stack on ports 80 & 3000:
powershell -ExecutionPolicy Bypass -File .\scripts\provision-and-deploy-ec2.ps1 -Region ap-southeast-1
```

If you already have a running Ubuntu EC2 instance and `.pem` key:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-to-ec2.ps1 -HostIp <EC2_PUBLIC_IP> -KeyPath <PATH_TO_KEY.pem>
```

To provision with an existing EC2 Key Pair and matching local PEM file:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\provision-and-deploy-ec2.ps1 -Region ap-southeast-1 -KeyName khaing2000 -KeyFile C:\Users\Lenovo\Downloads\khaing2000.pem
```

When your class demo is finished and you want to tear down all AWS resources (`$0` ongoing cost):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\destroy-ec2.ps1 -Region ap-southeast-1
```

---

### Option B: Manual Step-by-Step Guide (Ubuntu EC2 Console)

### Step 1: Launch EC2 Instance & Configure Security Group
1. Launch an **Ubuntu Server 24.04 LTS** EC2 instance:
   - **Recommended Instance Type:** `t3.small` or `t3.medium` (2 vCPU, 2–4 GB RAM) with **20 GB gp3** storage. *(If using a 1 GB RAM Free Tier `t2.micro` / `t3.micro`, enable a 2 GB swap file in Step 2 below before building.)*
2. Configure the EC2 **Security Group Inbound Rules**:
   - **SSH (`TCP 22`):** Source = `My IP`
   - **Custom TCP (`TCP 3000`):** Source = `0.0.0.0/0` *(default UI + Nginx reverse proxy port)*
   - **HTTP (`TCP 80`):** Source = `0.0.0.0/0` *(optional — if you set `UI_PORT=80` in `.env`)*
   - **Important:** Do **not** expose `27017` (MongoDB) or `4000` (Backend) publicly in your EC2 Security Group; Nginx inside `chatter-ui` routes `/graphql`, `/uploads`, and `/socket.io/` to `chatter-backend:4000` over Docker's private internal network.

### Step 2: Install Docker & Docker Compose on Ubuntu EC2

SSH into your EC2 instance and run:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git

# Add Docker's official GPG key & APT repository
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow ubuntu user to run docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```

*(Optional — Recommended for `t2.micro` / `t3.micro` / `t3.small` instances to prevent out-of-memory during TypeScript/Webpack builds):*

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Step 3: Configure Environment & Start Containers on EC2

```bash
git clone <YOUR_REPO_URL> sa_zalo_ott_service
cd sa_zalo_ott_service

# Create production .env with a strong 256-bit JWT secret
cp .env.example .env
sed -i "s|AUTH_JWT_SECRET=.*|AUTH_JWT_SECRET=$(openssl rand -hex 32)|" .env

# Optional: serve directly on HTTP port 80 instead of 3000
# sed -i "s|UI_PORT=3000|UI_PORT=80|" .env

# Build and start all containers in detached mode
docker compose up -d --build

# Verify all containers are healthy
docker compose ps
```

Open **`http://<EC2_PUBLIC_IP>:3000`** (or **`http://<EC2_PUBLIC_IP>`** if `UI_PORT=80`) in your browser to register, log in, and start conversations.
