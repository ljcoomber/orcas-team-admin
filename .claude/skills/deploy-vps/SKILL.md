---
name: deploy-vps
description: Deploy NanoClaw to a VPS (DigitalOcean or similar). Guides through provisioning, installation, secret transfer, and service setup. Trigger on "deploy to vps", "deploy to server", "set up server", or "host nanoclaw".
allowed-tools: Bash, Read, WebFetch, WebSearch
---

# Deploy NanoClaw to a VPS

Deploys NanoClaw to a Linux VPS (DigitalOcean, Hetzner, Linode, or similar).

## Prerequisites

- A VPS provisioned and accessible via SSH (see Step 1)
- The repo already working locally with WhatsApp authenticated
- SSH key access to the server (password auth is fine but keys are better)

---

## Step 1 — Provision the server

**Recommended: DigitalOcean $12/month Basic Droplet**
- 2 vCPU, 2 GB RAM, 50 GB SSD, Ubuntu 24.04 LTS
- 1 GB RAM is too tight once Docker is running agent containers
- No inbound ports needed — WhatsApp connects outbound

**Alternatives:**
- Hetzner CX22 (~€4/month, 2 vCPU, 4 GB RAM) — better value in Europe
- Vultr Regular Performance $12 — similar spec to DO

Ask the user for their server's IP address and SSH user before continuing.

---

## Step 2 — Install dependencies on the server

SSH in and run:

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js v22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Add your user to the docker group (no sudo needed for docker)
sudo usermod -aG docker $USER
newgrp docker

# Verify
node --version   # should be v22.x
docker --version
```

---

## Step 3 — Clone and build

```bash
# Clone the repo
git clone <YOUR_REPO_URL> ~/nanoclaw
cd ~/nanoclaw

# Install host dependencies
npm install

# Build TypeScript
npm run build

# Build the agent container image (this takes a few minutes)
./container/build.sh
```

---

## Step 4 — Transfer secrets

Run these from your **local machine** (not the server):

```bash
SERVER=user@YOUR_SERVER_IP

# Transfer secrets
scp .env $SERVER:~/nanoclaw/
scp credentials.json $SERVER:~/nanoclaw/
scp token.json $SERVER:~/nanoclaw/

# Transfer WhatsApp auth (avoids re-scanning QR code)
scp -r store/auth $SERVER:~/nanoclaw/store/
```

If WhatsApp auth transfer fails or you prefer a clean auth:
```bash
# On the server, run once interactively to scan QR
cd ~/nanoclaw && npm run dev
# Scan QR from WhatsApp on your phone, then Ctrl+C
```

---

## Step 5 — Set up systemd service

On the server:

```bash
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/nanoclaw.service << 'EOF'
[Unit]
Description=NanoClaw WhatsApp Agent
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=%h/nanoclaw
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
EOF

# Enable lingering so service starts on boot without login
sudo loginctl enable-linger $USER

# Reload and start
systemctl --user daemon-reload
systemctl --user enable nanoclaw
systemctl --user start nanoclaw

# Check it's running
systemctl --user status nanoclaw
journalctl --user -u nanoclaw -f
```

---

## Step 6 — Verify

```bash
# Watch logs
journalctl --user -u nanoclaw -f

# Check Docker containers are spawning
docker ps

# Send a test message on WhatsApp to the bot
```

---

## Useful commands (on the server)

```bash
# Restart after code changes
cd ~/nanoclaw && git pull && npm run build && systemctl --user restart nanoclaw

# Rebuild agent container after Dockerfile changes
cd ~/nanoclaw && ./container/build.sh && systemctl --user restart nanoclaw

# View logs
journalctl --user -u nanoclaw -n 100
journalctl --user -u nanoclaw -f   # live tail

# Stop/start
systemctl --user stop nanoclaw
systemctl --user start nanoclaw
```

---

## Notes

- Chromium and all browser automation deps are **inside the Docker container** — nothing special needed on the host
- The `.env` file contains `ANTHROPIC_API_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID`, and Gmail credential paths — keep it out of git
- Gmail credential paths in `.env` should match where you put `credentials.json` and `token.json` on the server (e.g. `/home/user/nanoclaw/credentials.json`)
- If the server IP changes, WhatsApp may flag the session — you may need to re-authenticate
- Consider setting up automatic security updates: `sudo apt-get install -y unattended-upgrades`
