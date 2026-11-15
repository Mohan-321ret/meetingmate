# JW Meeting Assistant - Linux & Tailscale Production Deployment Guide

## 1. Architecture & Security Philosophy

The production backend is designed to run 24/7 on a private home server (e.g. Ubuntu 22.04/24.04 LTS, Debian 12, or Raspberry Pi 4/5 4GB+).

**Key Tenet: Zero Exposure to the Public Internet.**
- The application binds to your private **Tailscale** interface (`100.x.y.z`).
- No public router port forwarding (NAT/WAN) is required or permitted.
- Family members access the server securely from Android/iOS phones via encrypted WireGuard tunnels.

---

## 2. Server Prerequisites & User Creation

### Step 1: Create Dedicated System User
Run as root on your server:
```bash
sudo useradd -r -s /usr/sbin/nologin -d /opt/jw-meetingmate -m meetingmate
```

### Step 2: Prepare Application Directory Tree
```bash
sudo mkdir -p /opt/jw-meetingmate/backend/data
sudo mkdir -p /var/log/jw-meetingmate
sudo mkdir -p /var/backups/jw-meetingmate

sudo chown -R meetingmate:meetingmate /opt/jw-meetingmate
sudo chown -R meetingmate:meetingmate /var/log/jw-meetingmate
sudo chown -R meetingmate:meetingmate /var/backups/jw-meetingmate
```

---

## 3. Tailscale Installation & Network Lockdown

### Step 1: Install Tailscale on the Server
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh --accept-routes
```
Find your server's private Tailscale IP:
```bash
tailscale ip -4
# Example output: 100.85.120.45
```

### Step 2: Lock Down Linux Firewall (UFW)
Ensure UFW allows traffic strictly over the Tailscale interface (`tailscale0`):
```bash
# Allow SSH and Backend only over Tailscale
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow in on tailscale0 to any port 22 proto tcp
sudo ufw allow in on tailscale0 to any port 8000 proto tcp
sudo ufw enable
```

---

## 4. Deploying Backend Code & Dependencies

### Step 1: Clone Repository into `/opt/jw-meetingmate`
```bash
cd /opt/jw-meetingmate
sudo git clone <repo-url> .
```

### Step 2: Create Python Virtual Environment
```bash
cd /opt/jw-meetingmate/backend
sudo -u meetingmate python3 -m venv .venv
sudo -u meetingmate /opt/jw-meetingmate/backend/.venv/bin/pip install --upgrade pip
sudo -u meetingmate /opt/jw-meetingmate/backend/.venv/bin/pip install -r requirements.txt
```

### Step 3: Configure Production `.env`
```bash
sudo cp .env.production.example .env
sudo chown meetingmate:meetingmate .env
sudo chmod 600 .env
```
Edit `/opt/jw-meetingmate/backend/.env` with your editor:
- Set your `GROQ_API_KEY=gsk_...`
- Set `HOST=0.0.0.0` or your exact Tailscale IP `100.85.120.45`
- Keep `APP_DEBUG=false` and `APP_ENV=production`

---

## 5. Installing Systemd Service

### Step 1: Install Unit File
```bash
sudo cp /opt/jw-meetingmate/backend/deploy/jw-meetingmate.service /etc/systemd/system/
sudo systemctl daemon-reload
```

### Step 2: Enable & Start Service
```bash
sudo systemctl enable jw-meetingmate.service
sudo systemctl start jw-meetingmate.service
```

### Step 3: Verify Service Health
```bash
sudo systemctl status jw-meetingmate.service
```
Expected output:
```
● jw-meetingmate.service - JW Meeting Assistant FastAPI Backend Service
     Loaded: loaded (/etc/systemd/system/jw-meetingmate.service; enabled; vendor preset: enabled)
     Active: active (running) since Sun 2026-11-15 19:00:00 UTC; 5s ago
   Main PID: 14820 (gunicorn)
      Tasks: 5 (limit: 4915)
     Memory: 185.4M
     CGroup: /system.slice/jw-meetingmate.service
             ├─14820 /opt/jw-meetingmate/backend/.venv/bin/python ... gunicorn ...
             ├─14822 /opt/jw-meetingmate/backend/.venv/bin/python ... uvicorn.workers.UvicornWorker ...
             └─14823 /opt/jw-meetingmate/backend/.venv/bin/python ... uvicorn.workers.UvicornWorker ...
```

---

## 6. Configuring Automated Log Rotation

Install the logrotate configuration to prevent log files from exhausting disk space:

```bash
sudo cp /opt/jw-meetingmate/backend/deploy/logrotate.conf /etc/logrotate.d/jw-meetingmate
sudo chmod 644 /etc/logrotate.d/jw-meetingmate
```

Test log rotation syntax:
```bash
sudo logrotate -d /etc/logrotate.d/jw-meetingmate
```

---

## 7. Connecting React Native Mobile App

In the mobile app's **Settings Screen**:
1. Enter your server's Tailscale IP: `http://100.85.120.45:8000`
2. Tap **Test Backend Connection**.
3. The app will ping `GET /api/v1/health` and display a green "Connected" badge with active node details.
