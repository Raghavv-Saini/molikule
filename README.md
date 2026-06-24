# Molikule — Supply Chain Analytics Dashboard

Molikule is an internal supply chain analytics dashboard for company LAN use. Authenticated employees can search purchasing records and view aggregated analytics. It has no internet dependency at runtime.

**Stack:** Go 1.24+ / Fiber / PostgreSQL / SQLC (backend) · React / TypeScript / Vite / TanStack Query / TanStack Table (frontend)

---

## Project Structure

```
molikule/
├── backend/          # Go/Fiber API server
│   ├── cmd/server/   # Entry point (main.go)
│   ├── internal/     # Handlers, middleware, config, DB pool
│   ├── db/           # SQLC-generated Go code (do not edit)
│   └── sql/          # Migrations and query files
├── frontend/         # React/TypeScript/Vite SPA
│   └── src/          # Pages, components, services, hooks, types
└── datamigration/    # One-time Excel → PostgreSQL migration script
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Go | 1.24+ |
| Node.js | 18+ |
| PostgreSQL | 14+ |
| sqlc | Latest (`go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`) |

---

## Environment Variables

The backend reads the following environment variables at startup. Copy `backend/.env.example` to `backend/.env` and fill in the values:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/molikule?sslmode=disable
JWT_SECRET=replace-with-a-long-random-secret
PORT=8080
```

- **`DATABASE_URL`** — PostgreSQL connection string. The database must already exist and the `purchase_records` table must be pre-populated via the data migration script before starting the server.
- **`JWT_SECRET`** — Secret used to sign and verify JWTs. Use a minimum of 32 random characters.
- **`PORT`** — Port the HTTP server listens on.

---

## Database Setup

1. Create the database:
   ```bash
   createdb molikule
   ```

2. Apply the schema migration:
   ```bash
   psql "$DATABASE_URL" -f backend/sql/migrations/001_initial.sql
   ```

3. Populate `purchase_records` using the data migration script (see `datamigration/files/README.md`).

The `users` table is created automatically by the server on first startup if it doesn't exist.

---

## Local Development

### Backend

```bash
cd backend
cp .env.example .env   # fill in your values
go run ./cmd/server/
```

### Frontend

The Vite dev server proxies all `/api` requests to `http://localhost:8080` (the Go server). Start the frontend dev server in a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Production Build

### 1. Build the frontend

```bash
cd frontend
npm install
npm run build
# Output: frontend/dist/
```

### 2. Build the backend binary

```bash
cd backend
go build -o molikule ./cmd/server/
# Output: backend/molikule (single binary)
```

### 3. Assemble the deployment artifact

The backend binary serves the compiled frontend from `../frontend/dist` relative to the binary's working directory. Keep the `dist/` folder next to the binary when deploying:

```
deploy/
├── molikule          # compiled Go binary
└── frontend/
    └── dist/         # compiled React SPA (copy of frontend/dist/)
```

You can also embed the frontend assets directly into the binary (see the `go:embed` section below).

### 4. Set environment variables and run

```bash
export DATABASE_URL="postgres://user:password@db-host:5432/molikule?sslmode=disable"
export JWT_SECRET="your-long-random-secret"
export PORT=8080

# From the deploy/ directory (so the binary finds ../frontend/dist):
cd deploy
./molikule
```

The server will listen on the configured port and serve both the API and the frontend SPA.

---

## Optional: Embed Frontend into the Binary

To produce a truly single-file deployment, you can embed the frontend assets into the Go binary using `go:embed`. In `backend/cmd/server/main.go`, replace the `filesystem.New` static file handler with an embedded FS:

```go
import "embed"

//go:embed all:../../frontend/dist
var frontendDist embed.FS
```

Then update the Fiber static handler to use `frontendDist`. With embedding, no separate `frontend/dist/` folder is needed alongside the binary.

---

## Regenerating SQLC Code

If you modify any SQL query files under `backend/sql/queries/` or the schema in `backend/sql/migrations/`, regenerate the Go database code:

```bash
cd backend
sqlc generate
```

The generated files in `backend/db/` are committed to the repository. Do not edit them by hand.

---

## Running Tests

```bash
cd backend
go test ./...
```

---

## API Overview

All endpoints are under `/api`. Protected routes require an `Authorization: Bearer <token>` header.

| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | `/api/auth/login` | No | — |
| POST | `/api/auth/change-password` | Yes | user, admin |
| GET | `/api/users` | Yes | admin |
| POST | `/api/users` | Yes | admin |
| PUT | `/api/users/:id/password` | Yes | admin |
| DELETE | `/api/users/:id` | Yes | admin |
| POST | `/api/search` | Yes | user, admin |

JWT tokens expire after 8 hours. There is no refresh token mechanism — users log in again at the start of their session.
