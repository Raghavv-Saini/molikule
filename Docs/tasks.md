# Implementation Plan: Molikule Supply Chain Analytics Dashboard

## Overview

Implement the full Molikule application — a Go/Fiber backend with PostgreSQL/SQLC and a React/TypeScript/Vite frontend — following the flat, no-abstraction architecture defined in the design. Tasks proceed from infrastructure outward: DB schema and SQLC config first, then backend handlers, then the frontend, then wiring everything together.

## Tasks

- [x] 1. Set up backend project structure and configuration
  - Initialise Go module under `backend/` with `go mod init`
  - Add dependencies: `github.com/gofiber/fiber/v2`, `github.com/golang-jwt/jwt/v5`, `golang.org/x/crypto`, `github.com/jackc/pgx/v5`, `github.com/sqlc-dev/sqlc`
  - Create `backend/internal/config/config.go` — load `DATABASE_URL`, `JWT_SECRET`, `PORT` from environment into a `Config` struct; return a descriptive error if any required variable is missing
  - Create `backend/internal/db/db.go` — open a `pgxpool.Pool` using the DSN from `Config`; expose a `New(dsn string) (*pgxpool.Pool, error)` function
  - Create `backend/internal/models/models.go` — define `ErrorResponse` struct and `SendError` helper
  - _Requirements: 12.4, 10.2_

- [ ] 2. Write database schema and SQLC configuration
  - [x] 2.1 Create `backend/sql/migrations/001_initial.sql`
    - Define `purchase_records` table with all columns from design (BIGSERIAL PK, VARCHAR, DATE, NUMERIC, TEXT columns)
    - Define `users` table with all columns from design (BIGSERIAL PK, employee_id UNIQUE, password_hash, role, timestamps)
    - Add all seven indexes on `purchase_records`: single-column on material_code, vendor_code, plant_code, purchase_date; composite on (material_code, vendor_code), (material_code, plant_code), (vendor_code, plant_code)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 2.2 Create `backend/sqlc.yaml`
    - Configure engine as `postgresql`, point schema at `sql/migrations/`, point queries at `sql/queries/`
    - Set output package to `db`, output directory to `db/`
    - Enable `emit_json_tags: true` and `emit_prepared_queries: false`
    - _Requirements: 8.2, 7.5_

  - [x] 2.3 Write `backend/sql/queries/auth.sql`
    - `GetUserByEmployeeID` — SELECT all user fields WHERE employee_id = $1
    - `UpdatePasswordHash` — UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2
    - _Requirements: 8.1, 1.2, 2.3_

  - [x] 2.4 Write `backend/sql/queries/users.sql`
    - `ListUsers` — SELECT id, employee_id, name, role, created_at, updated_at FROM users ORDER BY employee_id ASC
    - `CreateUser` — INSERT INTO users (employee_id, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, employee_id, name, role, created_at
    - `GetUserByID` — SELECT id, employee_id, name, role FROM users WHERE id = $1
    - `UpdateUserPasswordHash` — UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2
    - `DeleteUser` — DELETE FROM users WHERE id = $1 RETURNING id
    - _Requirements: 8.1, 3.2, 3.4, 3.6, 3.7_

  - [x] 2.5 Write `backend/sql/queries/search.sql`
    - Write parameterised SELECT queries covering all 7 filter combinations (material only, vendor only, plant only, mat+vendor, mat+plant, vendor+plant, mat+vendor+plant), each optionally intersected with a date range
    - Each query uses LIMIT/OFFSET for pagination and an ORDER BY clause accepting sort column and direction via allowed-value switch in the handler
    - _Requirements: 4.6, 4.7, 4.8, 4.9, 4.10, 4.11_

  - [x] 2.6 Write `backend/sql/queries/counts.sql`
    - Write COUNT(*) queries matching each of the 7 filter combinations in search.sql (with optional date range) for pagination metadata
    - _Requirements: 4.9, 10.5_

  - [x] 2.7 Write `backend/sql/queries/summary.sql`
    - Write aggregate queries for each filter combination returning: COUNT(*), SUM(cost), AVG(cost), AVG(net_price), MIN(cost), MAX(cost), COUNT DISTINCT purchase_no, MIN(purchase_date), MAX(purchase_date), array_agg(DISTINCT currency), array_agg(DISTINCT unit)
    - Write vendor sub-summary query (when vendor_code filter present): avg_cost, avg_net_price, last purchase cost, min cost, COUNT DISTINCT material_code, COUNT DISTINCT plant_code, COUNT DISTINCT purchase_no, currencies, units, first/last date
    - Write material sub-summary query (when material_code filter present): same structure, COUNT DISTINCT vendor_code, COUNT DISTINCT plant_code
    - Write plant sub-summary query (when plant_code filter present): same structure, COUNT DISTINCT vendor_code, COUNT DISTINCT material_code
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 2.8 Run `sqlc generate` and verify generated code compiles
    - Execute `sqlc generate` from `backend/`; confirm `db/` directory is populated with `db.go`, `models.go`, `query.sql.go`
    - Run `go build ./...` to confirm the generated code compiles with no errors
    - _Requirements: 8.3, 7.5_

- [x] 3. Implement JWT middleware
  - Create `backend/internal/middleware/auth.go`
  - Implement `RequireAuth(jwtSecret string) fiber.Handler` — parse `Authorization: Bearer <token>`, validate signature and expiry using `golang-jwt/jwt v5`, store claims (`sub`, `employee_id`, `name`, `role`) in `c.Locals("claims", claims)`; return 401 JSON on missing or invalid token
  - Implement `RequireRole(role string) fiber.Handler` — read claims from `c.Locals`, compare role field; return 403 JSON if it does not match
  - _Requirements: 1.5, 1.6, 3.1_

- [x] 4. Implement authentication handlers
  - Create `backend/internal/auth/handler.go`
  - Implement `LoginHandler(queries *db.Queries, jwtSecret string) fiber.Handler`
    - Parse and validate request body: employee_id must match `^\d{6}$`, password must be non-empty; return 400 on validation failure
    - Call `GetUserByEmployeeID`; if not found or bcrypt compare fails return generic 401 (no distinction between wrong ID vs wrong password)
    - On success: sign JWT with 8-hour expiry containing sub, employee_id, name, role; return 200 with token and user object (no password_hash)
  - Implement `ChangePasswordHandler(queries *db.Queries) fiber.Handler`
    - Require authenticated user (claims from `c.Locals`)
    - Validate current_password and new_password fields are non-empty
    - Load user by ID from claims; bcrypt compare current_password; return 400 if mismatch
    - Hash new_password with bcrypt cost 12; call `UpdatePasswordHash`; return 200
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 5. Implement user management handlers
  - Create `backend/internal/users/handler.go`
  - Implement `ListUsersHandler(queries *db.Queries) fiber.Handler`
    - Call `ListUsers`; return 200 with array of user objects (id, employee_id, name, role, created_at); no password_hash field
  - Implement `CreateUserHandler(queries *db.Queries) fiber.Handler`
    - Validate employee_id (`^\d{6}$`), name (non-empty), password (non-empty), role (must be "user" or "admin"); return 400 on failure
    - Hash password with bcrypt cost 12; call `CreateUser`; return 201 with created user object
    - On unique constraint violation return 409 with `CONFLICT` error code
  - Implement `DeleteUserHandler(queries *db.Queries) fiber.Handler`
    - Parse `:id` param as int64; call `DeleteUser`; return 204 on success
    - If `DeleteUser` returns no rows return 404
  - Implement `AdminResetPasswordHandler(queries *db.Queries) fiber.Handler`
    - Parse `:id` param; validate new_password non-empty; call `GetUserByID` (404 if not found)
    - Hash new password; call `UpdateUserPasswordHash`; return 200
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 6. Implement search handler
  - Create `backend/internal/search/handler.go`
  - Define `SearchRequest` struct with optional `material_code`, `vendor_code`, `plant_code`, `start_date`, `end_date`, and required `page` (≥1), `page_size` (1–200, default 50), `sort_by`, `sort_order`
  - Implement `SearchHandler(queries *db.Queries) fiber.Handler`
    - Parse and validate request body:
      - Return 400 if all three code fields are absent
      - Validate material_code with `^\d{8}$` if present; return 400 on mismatch
      - Validate vendor_code with `^\d{8}$` if present; return 400 on mismatch
      - Validate plant_code with `^[a-zA-Z0-9]{4}$` if present; return 400 on mismatch
      - Validate sort_by ∈ {purchase_date, cost, net_price} and sort_order ∈ {asc, desc} when provided
    - Determine active filter combination and call the corresponding `search.sql` query with LIMIT/OFFSET
    - Call matching count query to get total_records; compute total_pages = ⌈total_records / page_size⌉
    - Call matching summary query; call conditional sub-summary queries based on which filters are present
    - Assemble and return JSON: `{ summary, records, pagination }`
    - Return `summary: null` and empty `records` array (with pagination showing 0 total) when count query returns 0
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.5_

- [ ] 7. Wire backend routes and entry point
  - Create `backend/cmd/server/main.go`
    - Load config via `config.New()`; open DB pool via `db.New(cfg.DatabaseURL)`
    - Instantiate `db.New(pool)` SQLC queries object
    - Configure global Fiber error handler: log with `log/slog`, return generic 500 JSON; never expose stack traces or DB errors
    - Register routes:
      - `POST /api/auth/login` → `auth.LoginHandler`
      - `POST /api/auth/change-password` → `RequireAuth` + `auth.ChangePasswordHandler`
      - `GET /api/users` → `RequireAuth` + `RequireRole("admin")` + `users.ListUsersHandler`
      - `POST /api/users` → `RequireAuth` + `RequireRole("admin")` + `users.CreateUserHandler`
      - `PUT /api/users/:id/password` → `RequireAuth` + `RequireRole("admin")` + `users.AdminResetPasswordHandler`
      - `DELETE /api/users/:id` → `RequireAuth` + `RequireRole("admin")` + `users.DeleteUserHandler`
      - `POST /api/search` → `RequireAuth` + `search.SearchHandler`
    - Serve frontend static assets from `../frontend/dist` as fallback (SPA routing)
    - Listen on configured port
  - _Requirements: 10.1, 10.3, 10.4, 12.1, 12.3, 12.4_

- [ ] 8. Checkpoint — verify backend compiles and starts
  - Run `go build ./cmd/server/` from `backend/`; confirm binary builds with no errors
  - Manually start the binary with a test DB and confirm it listens on the configured port

- [ ] 9. Set up frontend project structure
  - Scaffold Vite + React + TypeScript project under `frontend/` (`npm create vite@latest`)
  - Add dependencies: `axios`, `@tanstack/react-query`, `@tanstack/react-table`
  - Create `frontend/src/types/index.ts` with all TypeScript interfaces from the design: `User`, `AuthState`, `SearchRequest`, `PurchaseRecord`, `VendorSummary`, `MaterialSummary`, `PlantSummary`, `SearchSummary`, `Pagination`, `SearchResponse`
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 10. Implement frontend API client and services
  - Create `frontend/src/api/client.ts`
    - Create an Axios instance with `baseURL: '/api'`
    - Add a request interceptor that reads the stored JWT from `localStorage` and attaches it as `Authorization: Bearer <token>` on every request
  - Create `frontend/src/services/auth.ts`
    - `login(employee_id, password)` — POST `/api/auth/login`, return `AuthState`
    - `changePassword(currentPassword, newPassword)` — POST `/api/auth/change-password`
  - Create `frontend/src/services/search.ts`
    - `search(params: SearchRequest)` — POST `/api/search`, return `SearchResponse`
  - Create `frontend/src/services/users.ts`
    - `listUsers()` — GET `/api/users`, return `User[]`
    - `createUser(payload)` — POST `/api/users`, return `User`
    - `deleteUser(id)` — DELETE `/api/users/:id`
    - `resetPassword(id, newPassword)` — PUT `/api/users/:id/password`
  - _Requirements: 1.7, 11.2_

- [ ] 11. Implement `useAuth` hook and `ProtectedRoute`
  - Create `frontend/src/hooks/useAuth.ts`
    - Expose `token`, `user`, `login(employee_id, password)`, `logout()` 
    - On `login`: call `auth.login`, persist JWT and user to `localStorage`, update state
    - On `logout`: clear `localStorage`, reset state
    - On mount: rehydrate from `localStorage`
  - Create `frontend/src/components/ProtectedRoute.tsx`
    - If no token in auth state, redirect to `/login` via React Router `<Navigate>`
    - Optionally accept a `requiredRole` prop; if user role does not match, redirect to `/`
  - _Requirements: 1.7, 1.8, 3.9_

- [ ] 12. Implement Login page
  - Create `frontend/src/pages/Login.tsx`
    - Render a centered login card with Employee ID and Password fields
    - Client-side validate employee_id matches `^\d{6}$` before submitting; show inline error if invalid
    - Call `useAuth().login()` on submit; display backend error message on failure
    - On success: navigate to `/`
  - _Requirements: 1.1, 11.6, 11.7_

- [ ] 13. Implement Navbar component
  - Create `frontend/src/components/Navbar.tsx`
    - Display logged-in user's name and role
    - Provide a Logout button that calls `useAuth().logout()` and navigates to `/login`
    - Show "Admin" or "User" role badge next to name
    - If user is admin, show a link/button to navigate to User Management
  - _Requirements: 11.8_

- [ ] 14. Implement SearchForm component
  - Create `frontend/src/components/SearchForm.tsx`
    - Render inputs for Material Code (8 digits), Vendor Code (8 digits), Plant Code (4 alphanumeric), Start Date, End Date
    - Client-side validate each code field on blur and on submit: material/vendor must match `^\d{8}$`, plant must match `^[a-zA-Z0-9]{4}$`; show inline error messages below each field
    - Validate at least one of material_code, vendor_code, plant_code is filled before submitting; show a form-level error if all three are empty
    - Disable submit button and show loading indicator while a search is in progress
    - Accept `onSearch` callback; call it with the validated `SearchRequest` on submit
  - _Requirements: 4.12, 5.3_

- [ ] 15. Implement SummaryCard component
  - Create `frontend/src/components/SummaryCard.tsx`
    - Accept a `summary: SearchSummary | null` prop
    - When `summary` is null, display "No data available"
    - Always display the core metrics: Records Found, Total Cost, Avg Cost, Avg Net Price, Min/Max Cost, PO Count, Earliest/Latest Date, Currencies, Units
    - When `summary.vendor_summary` is non-null, render a Vendor Summary section with all fields from `VendorSummary`
    - When `summary.material_summary` is non-null, render a Material Summary section with all fields from `MaterialSummary`
    - When `summary.plant_summary` is non-null, render a Plant Summary section with all fields from `PlantSummary`
    - Use card-style layout with labelled metric rows; no charts or icons
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_

- [ ] 16. Implement ResultsTable component
  - Create `frontend/src/components/ResultsTable.tsx`
    - Use TanStack Table v8 to define columns: Plant Code, Material Code, Description, Vendor Code, Purchase Number, Purchase Date, Quantity, Unit, Net Price, Cost, Currency, Supplying Plant
    - Accept `records: PurchaseRecord[]`, `pagination: Pagination`, `onSortChange`, `onPageChange` props
    - Render sortable column headers for Purchase Date, Cost, Net Price — clicking a header calls `onSortChange` with the new sort column and toggled direction
    - Render pagination controls: previous/next buttons, current page and total pages display, total records count
    - Show a "No results found" message when `records` is empty
  - _Requirements: 5.1, 5.2, 5.4, 5.6_

- [ ] 17. Implement Dashboard page
  - Create `frontend/src/pages/Dashboard.tsx`
    - Wrap with `<ProtectedRoute>` (redirects to login if unauthenticated)
    - Maintain search state: current `SearchRequest`, `SearchResponse`
    - Use TanStack Query `useMutation` or `useQuery` to call `search.search()`; expose `isLoading`, `isError`, `error`, `data` states
    - Render in vertical order: `<Navbar>`, `<SearchForm onSearch={...}>`, `<SummaryCard summary={data?.summary}>`, `<ResultsTable ...>` with pagination controls
    - On sort change: update `SearchRequest.sort_by` and `sort_order`, re-trigger search
    - On page change: update `SearchRequest.page`, re-trigger search
    - On error: display the `message` field from the error response below the search form
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 11.5, 11.6_

- [ ] 18. Implement UserManagement page
  - Create `frontend/src/pages/UserManagement.tsx`
    - Wrap with `<ProtectedRoute requiredRole="admin">` — non-admin authenticated users are redirected to `/`
    - Use TanStack Query `useQuery` to fetch user list via `users.listUsers()`
    - Render a table of users with columns: Employee ID, Name, Role, Created At, Actions
    - "Delete" action: show a confirmation dialog; on confirm call `users.deleteUser(id)` and invalidate the user list query
    - "Reset Password" action: show a confirmation dialog with a new-password input; on confirm call `users.resetPassword(id, newPassword)`
    - "Create User" form (or modal): fields for employee_id, name, role (select: user/admin), initial password; validate employee_id (`^\d{6}$`) and non-empty fields; on submit call `users.createUser()`; display 409 conflict error inline
    - Display backend error messages for all failed operations
  - _Requirements: 3.3, 3.5, 3.8, 3.9_

- [ ] 19. Wire frontend routing and TanStack Query provider
  - Update `frontend/src/main.tsx`
    - Wrap the app in `<QueryClientProvider client={queryClient}>` from TanStack Query
    - Set up React Router with routes:
      - `/login` → `<Login>`
      - `/` → `<Dashboard>` (protected)
      - `/users` → `<UserManagement>` (protected, admin only)
    - Add a root redirect: if authenticated and at `/login`, redirect to `/`
  - _Requirements: 11.1, 11.3_

- [ ] 20. Checkpoint — verify frontend builds and integrates with backend
  - Run `npm run build` from `frontend/`; confirm no TypeScript or build errors
  - Confirm Vite dev proxy (or built static serving from the Go binary) routes `/api/*` to the backend correctly

- [ ] 21. Configure deployment layout
  - Add a Vite `server.proxy` config in `vite.config.ts` for local development: proxy `/api` to `http://localhost:<PORT>`
  - Document the production deployment steps in a `README.md` at the repo root:
    - Run `npm run build` in `frontend/`, output goes to `frontend/dist/`
    - Run `go build ./cmd/server/` in `backend/`, produces a single binary
    - Copy `frontend/dist/` alongside the binary (or embed with `go:embed`)
    - Set environment variables `DATABASE_URL`, `JWT_SECRET`, `PORT`; run the binary
  - _Requirements: 12.3, 12.4_

- [ ] 22. Final checkpoint — end-to-end smoke check
  - Ensure `go build ./...` passes in `backend/`
  - Ensure `npm run build` passes in `frontend/`
  - Confirm all API routes are registered and middleware chains are correct in `main.go`
  - Confirm the frontend `ProtectedRoute` correctly guards Dashboard and UserManagement

## Notes

- All SQL queries are parameterised via SQLC — no string interpolation in database access code
- The search handler selects the appropriate pre-written query based on the active filter combination rather than building dynamic SQL at runtime
- Summary aggregates are computed server-side and returned in the same response as the records page; the frontend never recomputes them from the visible page
- JWT expiry is 8 hours; no refresh token mechanism is needed
- The backend binary serves the compiled frontend `dist/` as static files, so the deployment artifact is a single binary + static folder
