# Molikule — Deployment SOP

**Version:** 1.1  
**Application:** Molikule Supply Chain Analytics Dashboard  
**Stack:** Go/Fiber (backend) · React/Vite (frontend) · PostgreSQL · Python (data migration)  
**Network requirement:** LAN only — no internet access needed at runtime

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Build Phase — Developer Machine](#2-build-phase--developer-machine)
3. [Assemble the Deployment Package](#3-assemble-the-deployment-package)
4. [Server Preparation](#4-server-preparation)
5. [Database Setup](#5-database-setup)
6. [Data Migration](#6-data-migration)
7. [Deploy the Application](#7-deploy-the-application)
8. [Run as a Service](#8-run-as-a-service)
9. [Smoke Test](#9-smoke-test)
10. [Backup & Restore](#10-backup--restore)
11. [Updating the Application](#11-updating-the-application)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

### Developer machine (where you build)

| Tool | Version | Notes |
|------|---------|-------|
| Go | 1.24+ | Required to compile the backend binary |
| Node.js | 18+ | Required to build the frontend |
| npm | bundled with Node.js | |

### Production server (where you deploy)

| Tool | Version | Notes |
|------|---------|-------|
| PostgreSQL | 14+ | Database server |
| Python | 3.6+ | Data migration only — not needed at runtime |
| pip packages | — | `psycopg2-binary`, `pandas`, `openpyxl` (migration only) |

> The Go binary and the compiled frontend are fully self-contained. No Go, Node.js, or npm is needed on the production server.

---

## 2. Build Phase — Developer Machine

All build commands are run on your **developer machine** against the project source.

### 2.1 Build the frontend

**Linux / macOS:**
```bash
cd frontend
npm install
npm run build
```

**Windows (Command Prompt):**
```cmd
cd frontend
npm install
npm run build
```

**Windows (PowerShell):**
```powershell
Set-Location frontend
npm install
npm run build
```

Output: `frontend/dist/` — a folder of static HTML/JS/CSS files.

---

### 2.2 Build the backend binary

The binary must be compiled for the **target server's OS and CPU architecture**.

> If the target server is **Linux x86-64** (most common for LAN servers), use the cross-compile commands below regardless of what OS your developer machine runs on.

#### Target: Linux x86-64 server (most common)

**Linux / macOS developer machine:**
```bash
cd backend
GOOS=linux GOARCH=amd64 go build -o molikule ./cmd/server/
```

**Windows developer machine — Command Prompt:**
```cmd
cd backend
set GOOS=linux
set GOARCH=amd64
go build -o molikule ./cmd/server/
```

**Windows developer machine — PowerShell:**
```powershell
Set-Location backend
$env:GOOS = "linux"
$env:GOARCH = "amd64"
go build -o molikule ./cmd/server/
```

---

#### Target: Linux ARM64 server (e.g. Raspberry Pi 4, AWS Graviton)

**Linux / macOS developer machine:**
```bash
cd backend
GOOS=linux GOARCH=arm64 go build -o molikule ./cmd/server/
```

**Windows developer machine — PowerShell:**
```powershell
Set-Location backend
$env:GOOS = "linux"
$env:GOARCH = "arm64"
go build -o molikule ./cmd/server/
```

---

#### Target: Windows server

**Linux / macOS developer machine:**
```bash
cd backend
GOOS=windows GOARCH=amd64 go build -o molikule.exe ./cmd/server/
```

**Windows developer machine — PowerShell:**
```powershell
Set-Location backend
go build -o molikule.exe ./cmd/server/
```

Output: `backend/molikule` (Linux) or `backend/molikule.exe` (Windows) — a single self-contained binary.

---

## 3. Assemble the Deployment Package

### Why the folder structure matters

The binary resolves the frontend path as `../frontend/dist` relative to its **working directory**. This means the binary must run from inside a subfolder (e.g. `backend/`), and `frontend/dist` must be a sibling of that subfolder at the parent level.

The required on-server layout is:

```
deploy/
├── backend/
│   └── molikule          ← run the binary from inside this folder
└── frontend/
    └── dist/             ← binary resolves this as ../frontend/dist
        ├── index.html
        └── assets/
```

### Create the package

**Linux / macOS:**
```bash
mkdir -p deploy/backend
mkdir -p deploy/frontend

cp backend/molikule deploy/backend/
cp -r frontend/dist deploy/frontend/dist
```

**Windows — Command Prompt:**
```cmd
mkdir deploy\backend
mkdir deploy\frontend

copy backend\molikule.exe deploy\backend\molikule.exe
xcopy /E /I frontend\dist deploy\frontend\dist
```

**Windows — PowerShell:**
```powershell
New-Item -ItemType Directory -Force -Path deploy\backend
New-Item -ItemType Directory -Force -Path deploy\frontend

Copy-Item backend\molikule.exe deploy\backend\molikule.exe
Copy-Item -Recurse frontend\dist deploy\frontend\dist
```

### Transfer the package to the server

**Linux / macOS — using scp:**
```bash
scp -r deploy/ user@server-ip:/opt/molikule/
```

**Windows — using scp (PowerShell or Command Prompt):**
```cmd
scp -r deploy user@server-ip:/opt/molikule/
```

Alternatively, copy via USB drive, shared network folder, or any other LAN file transfer method available.

---

## 4. Server Preparation

All following steps are run on the **production server**.

---

### Linux Server

#### 4.1 Create a dedicated system user

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin molikule
```

#### 4.2 Set up the application directory

```bash
sudo mkdir -p /opt/molikule
sudo cp -r /path/to/deploy/* /opt/molikule/
sudo chmod +x /opt/molikule/backend/molikule
sudo chown -R molikule:molikule /opt/molikule
```

#### 4.3 Create the environment file

```bash
sudo nano /opt/molikule/backend/.env
```

Add the following, filling in your actual values:

```dotenv
DATABASE_URL=postgres://molikule_user:your_db_password@localhost:5432/molikule?sslmode=disable
JWT_SECRET=replace-with-at-least-32-random-characters
PORT=8080
```

Secure the file:

```bash
sudo chown molikule:molikule /opt/molikule/backend/.env
sudo chmod 600 /opt/molikule/backend/.env
```

**Generate a strong JWT secret:**
```bash
openssl rand -base64 48
```

---

### Windows Server

#### 4.1 Set up the application directory

Open PowerShell as Administrator:

```powershell
New-Item -ItemType Directory -Force -Path C:\molikule\backend
New-Item -ItemType Directory -Force -Path C:\molikule\frontend

# Copy files from transfer location
Copy-Item deploy\backend\molikule.exe C:\molikule\backend\molikule.exe
Copy-Item -Recurse deploy\frontend\dist C:\molikule\frontend\dist
```

#### 4.2 Create the environment file

```powershell
notepad C:\molikule\backend\.env
```

Add the following:

```dotenv
DATABASE_URL=postgres://molikule_user:your_db_password@localhost:5432/molikule?sslmode=disable
JWT_SECRET=replace-with-at-least-32-random-characters
PORT=8080
```

**Generate a strong JWT secret on Windows:**
```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { [byte](Get-Random -Max 256) }))
```

---

## 5. Database Setup

### Linux Server

#### 5.1 Start PostgreSQL

```bash
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

#### 5.2 Create the database user and database

```bash
sudo -u postgres psql
```

Inside the `psql` shell:

```sql
CREATE USER molikule_user WITH PASSWORD 'your_db_password';
CREATE DATABASE molikule OWNER molikule_user;
GRANT ALL PRIVILEGES ON DATABASE molikule TO molikule_user;
\q
```

#### 5.3 Apply the schema migration

```bash
psql -U molikule_user -d molikule -f /path/to/backend/sql/migrations/001_initial.sql
```

---

### Windows Server

#### 5.1 Start PostgreSQL

PostgreSQL on Windows runs as a Windows Service. Open PowerShell as Administrator:

```powershell
Start-Service postgresql*
# Enable auto-start on boot
Set-Service -Name (Get-Service postgresql*).Name -StartupType Automatic
```

Or use the Windows Services panel (`services.msc`) and locate the PostgreSQL service.

#### 5.2 Create the database user and database

Open the PostgreSQL command prompt (installed with PostgreSQL, usually at `C:\Program Files\PostgreSQL\<version>\bin\psql.exe`):

```cmd
psql -U postgres
```

Inside the `psql` shell:

```sql
CREATE USER molikule_user WITH PASSWORD 'your_db_password';
CREATE DATABASE molikule OWNER molikule_user;
GRANT ALL PRIVILEGES ON DATABASE molikule TO molikule_user;
\q
```

#### 5.3 Apply the schema migration

```cmd
psql -U molikule_user -d molikule -f C:\path\to\backend\sql\migrations\001_initial.sql
```

---

### Create the initial admin user (Linux & Windows)

The application has no default admin account. After the server starts for the first time, insert one directly.

**Generate a bcrypt password hash:**

```bash
# Linux
python3 -c "import bcrypt; print(bcrypt.hashpw(b'your_admin_password', bcrypt.gensalt()).decode())"
```

```powershell
# Windows PowerShell (install bcrypt first: pip install bcrypt)
python -c "import bcrypt; print(bcrypt.hashpw(b'your_admin_password', bcrypt.gensalt()).decode())"
```

**Insert the admin user:**

```sql
-- Run in psql connected to the molikule database
INSERT INTO users (employee_id, name, password_hash, role)
VALUES ('ADM001', 'Admin User', '<paste_hash_here>', 'admin');
```

---

## 6. Data Migration

The data migration is a **one-time operation** to populate `purchase_records` from the Excel source file. Only re-run it if the source data changes.

### 6.1 Install Python dependencies

**Linux:**
```bash
pip install psycopg2-binary pandas openpyxl
# or with --user if needed:
pip install --user psycopg2-binary pandas openpyxl
```

**Windows:**
```cmd
pip install psycopg2-binary pandas openpyxl
```

### 6.2 Transfer migration files to the server

Copy these two files into the same working directory on the server (e.g. `/tmp/migration/` on Linux or `C:\migration\` on Windows):

```
datamigration/files/excel_to_postgres.py
datamigration/files/Materials_Database.xlsx
```

**Linux — using scp:**
```bash
scp datamigration/files/excel_to_postgres.py datamigration/files/Materials_Database.xlsx user@server-ip:/tmp/migration/
```

**Windows — using scp:**
```cmd
scp datamigration\files\excel_to_postgres.py datamigration\files\Materials_Database.xlsx user@server-ip:/tmp/migration/
```

### 6.3 Configure the migration script

Open `excel_to_postgres.py` and verify the `DB_CONFIG` block at the top matches your database credentials:

```python
DB_CONFIG = {
    "host": "localhost",
    "port": "5432",
    "user": "molikule_user",
    "password": "your_db_password",    # ← update this
    "database": "molikule",
    "table_name": "purchase_records"
}

EXCEL_FILE = "Materials_Database.xlsx"
```

### 6.4 Run the migration

**Linux:**
```bash
cd /tmp/migration
python3 excel_to_postgres.py
```

**Windows:**
```cmd
cd C:\migration
python excel_to_postgres.py
```

Expected output:

```
████████████████████████████████████████████████████████████
  Excel to PostgreSQL Migration Tool (Hardcoded)
████████████████████████████████████████████████████████████

Reading Excel file: Materials_Database.xlsx
✓ Successfully read N rows from Excel
✓ Connected to PostgreSQL (localhost:5432)

Creating table...
✓ Created table 'purchase_records'
✓ Created 4 indexes

Migrating data...
✓ Inserted N records
⚠ Skipped 0 records

✓ Migration completed successfully!
```

### 6.5 Verify the migration

**Linux:**
```bash
psql -U molikule_user -d molikule -c "SELECT COUNT(*) FROM purchase_records;"
```

**Windows:**
```cmd
psql -U molikule_user -d molikule -c "SELECT COUNT(*) FROM purchase_records;"
```

---

## 7. Deploy the Application

### 7.1 Verify the final directory structure

**Linux:**
```bash
ls -la /opt/molikule/
ls -la /opt/molikule/backend/
ls -la /opt/molikule/frontend/dist/
```

**Windows:**
```powershell
Get-ChildItem C:\molikule\ -Recurse -Depth 2
```

Expected layout (both platforms):

```
molikule/
├── backend/
│   ├── molikule        (Linux binary)  or  molikule.exe  (Windows)
│   └── .env
└── frontend/
    └── dist/
        ├── index.html
        └── assets/
```

### 7.2 Test run (manual, foreground)

Before setting up a service, do a quick sanity check.

**Linux:**
```bash
sudo -u molikule /opt/molikule/backend/molikule
```

**Windows (PowerShell, from inside the backend folder):**
```powershell
Set-Location C:\molikule\backend
.\molikule.exe
```

You should see:
```json
{"time":"...","level":"INFO","msg":"starting server","addr":":8080"}
```

Open a browser on the LAN and go to `http://server-ip:8080`. The login page should load.

Press `Ctrl+C` to stop before proceeding to the service setup.

---

## 8. Run as a Service

### Linux — systemd

#### Create the service file

```bash
sudo nano /etc/systemd/system/molikule.service
```

```ini
[Unit]
Description=Molikule Supply Chain Dashboard
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=molikule
Group=molikule
WorkingDirectory=/opt/molikule/backend
EnvironmentFile=/opt/molikule/backend/.env
ExecStart=/opt/molikule/backend/molikule
Restart=on-failure
RestartSec=5s

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/molikule

[Install]
WantedBy=multi-user.target
```

#### Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable molikule
sudo systemctl start molikule
sudo systemctl status molikule
```

#### View live logs

```bash
sudo journalctl -u molikule -f
```

---

### Windows — NSSM (Non-Sucking Service Manager)

NSSM is the simplest way to run any executable as a Windows service. It does not require internet — download it on another machine and transfer it over.

Download from: https://nssm.cc/download (get the 64-bit version)

Place `nssm.exe` somewhere on the server (e.g. `C:\tools\nssm.exe`).

#### Install the service

Open PowerShell as Administrator:

```powershell
C:\tools\nssm.exe install molikule C:\molikule\backend\molikule.exe
C:\tools\nssm.exe set molikule AppDirectory C:\molikule\backend
C:\tools\nssm.exe set molikule DisplayName "Molikule Supply Chain Dashboard"
C:\tools\nssm.exe set molikule Description "Molikule supply chain analytics server"
C:\tools\nssm.exe set molikule Start SERVICE_AUTO_START

# Point NSSM to the .env file for environment variables
C:\tools\nssm.exe set molikule AppEnvironmentExtra `
  "DATABASE_URL=postgres://molikule_user:your_db_password@localhost:5432/molikule?sslmode=disable" `
  "JWT_SECRET=your_jwt_secret" `
  "PORT=8080"

# Log stdout and stderr to files
C:\tools\nssm.exe set molikule AppStdout C:\molikule\logs\molikule.log
C:\tools\nssm.exe set molikule AppStderr C:\molikule\logs\molikule_error.log
```

Create the logs directory first:

```powershell
New-Item -ItemType Directory -Force -Path C:\molikule\logs
```

#### Start the service

```powershell
C:\tools\nssm.exe start molikule
```

Or use the Windows Services panel (`services.msc`) — find "Molikule Supply Chain Dashboard" and start it.

#### View logs

```powershell
Get-Content C:\molikule\logs\molikule.log -Wait
```

#### Stop / restart the service

```powershell
C:\tools\nssm.exe stop molikule
C:\tools\nssm.exe restart molikule
```

#### Remove the service (if needed)

```powershell
C:\tools\nssm.exe remove molikule confirm
```

---

## 9. Smoke Test

After the service is running, verify all major functions from a LAN browser.

| Test | Expected Result |
|------|----------------|
| Navigate to `http://server-ip:8080` | Login page loads |
| Login with admin credentials | Dashboard loads, no console errors |
| Run a search with filter criteria | Results table populates |
| Navigate to User Management | User list is visible (admin only) |
| Create a new user | User appears in list |
| Log out and log in as the new user | Login succeeds |
| Refresh the page on any route | Page reloads correctly (SPA routing works) |

---

## 10. Backup & Restore

### Backup the database

**Linux:**
```bash
pg_dump -U molikule_user -d molikule > /backups/molikule_$(date +%Y%m%d_%H%M%S).sql
```

**Windows PowerShell:**
```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump -U molikule_user -d molikule | Out-File "C:\backups\molikule_$ts.sql"
```

### Restore the database

**Linux:**
```bash
psql -U molikule_user -d molikule < /backups/molikule_YYYYMMDD_HHMMSS.sql
```

**Windows:**
```cmd
psql -U molikule_user -d molikule < C:\backups\molikule_YYYYMMDD_HHMMSS.sql
```

### Backup the environment file

**Linux:**
```bash
sudo cp /opt/molikule/backend/.env /backups/molikule.env.backup
```

**Windows:**
```powershell
Copy-Item C:\molikule\backend\.env C:\backups\molikule.env.backup
```

> Keep backup files in a secure location. The `.env` file contains the JWT secret and database credentials.

---

## 11. Updating the Application

1. On the developer machine, repeat steps 2 and 3 — rebuild frontend and backend, assemble a new `deploy/` package.
2. Transfer the package to the server.
3. Stop the service.
4. Replace the binary and frontend files.
5. Start the service and run the smoke test.

**Linux:**
```bash
sudo systemctl stop molikule
sudo cp deploy/backend/molikule /opt/molikule/backend/molikule
sudo rm -rf /opt/molikule/frontend/dist
sudo cp -r deploy/frontend/dist /opt/molikule/frontend/dist
sudo chown -R molikule:molikule /opt/molikule
sudo systemctl start molikule
sudo systemctl status molikule
```

**Windows PowerShell (as Administrator):**
```powershell
C:\tools\nssm.exe stop molikule
Copy-Item deploy\backend\molikule.exe C:\molikule\backend\molikule.exe -Force
Remove-Item C:\molikule\frontend\dist -Recurse -Force
Copy-Item -Recurse deploy\frontend\dist C:\molikule\frontend\dist
C:\tools\nssm.exe start molikule
```

> Only re-run the data migration (Section 6) if the source Excel data has changed.

---

## 12. Troubleshooting

### Service fails to start

**Linux:**
```bash
sudo journalctl -u molikule --no-pager -n 50
```

**Windows:**
```powershell
Get-Content C:\molikule\logs\molikule_error.log -Tail 50
```

Common causes:

| Log message | Fix |
|-------------|-----|
| `required environment variable DATABASE_URL is not set` | Check `.env` exists in the binary's working directory and is readable |
| `failed to connect to database` | Verify PostgreSQL is running and `DATABASE_URL` credentials are correct |
| `failed to ensure users table exists` | Schema migration has not been applied — run Section 5.3 |
| `bind: address already in use` | Another process is using port 8080 — change `PORT` in `.env` |

### Frontend returns 404 on page refresh

The binary's working directory must be `backend/` inside the deployment root so that `../frontend/dist` resolves correctly. Verify:

- **Linux:** `WorkingDirectory=/opt/molikule/backend` is set in the systemd unit file
- **Windows:** `AppDirectory` is set to `C:\molikule\backend` in NSSM

### Cannot connect to the database

**Linux:**
```bash
sudo systemctl status postgresql
psql "postgres://molikule_user:your_db_password@localhost:5432/molikule?sslmode=disable" -c "SELECT 1;"
```

**Windows:**
```powershell
Get-Service postgresql*
psql "postgres://molikule_user:your_db_password@localhost:5432/molikule?sslmode=disable" -c "SELECT 1;"
```

### Login returns 401 Unauthorized

- Confirm the `users` table has at least one row with a valid bcrypt hash.
- Confirm `JWT_SECRET` in `.env` is not empty.

### Migration script errors

| Error | Fix |
|-------|-----|
| `psycopg2.OperationalError: could not connect` | Verify credentials in the `DB_CONFIG` block at the top of the script |
| `table purchase_records already exists` | The script drops and recreates the table — safe to re-run |
| `Missing columns: [...]` | Excel column headers don't match — verify they match the schema exactly |

### Check which port the server is listening on

**Linux:**
```bash
sudo ss -tlnp | grep molikule
```

**Windows PowerShell:**
```powershell
netstat -ano | findstr :8080
```

---

## Quick Reference

### Linux

```bash
# Service management
sudo systemctl start molikule
sudo systemctl stop molikule
sudo systemctl restart molikule
sudo systemctl status molikule

# Live logs
sudo journalctl -u molikule -f

# Database
sudo -u postgres psql -d molikule
psql -U molikule_user -d molikule

# Rebuild (developer machine — Linux/macOS)
cd frontend && npm run build
cd backend && GOOS=linux GOARCH=amd64 go build -o molikule ./cmd/server/
```

### Windows

```powershell
# Service management (PowerShell as Administrator)
C:\tools\nssm.exe start molikule
C:\tools\nssm.exe stop molikule
C:\tools\nssm.exe restart molikule

# Live logs
Get-Content C:\molikule\logs\molikule.log -Wait

# Database
psql -U molikule_user -d molikule

# Rebuild (developer machine — PowerShell)
Set-Location frontend; npm run build
Set-Location ..\backend
$env:GOOS = "linux"; $env:GOARCH = "amd64"   # remove these two lines if targeting Windows
go build -o molikule.exe ./cmd/server/
```
