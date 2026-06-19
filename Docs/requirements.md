# Requirements Document

## Introduction

**Molikule** is a proof-of-concept internal Supply Chain Analytics Dashboard for use on a company LAN. The application enables authenticated employees to search purchasing records and view aggregated analytics summaries. It has no internet dependency, uses a static PostgreSQL database pre-populated before the app runs, and is built for simplicity, maintainability, and performance.

Tech stack: Go 1.24+ / Fiber / PostgreSQL / SQLC (backend), React / TypeScript / Vite / TanStack Query / TanStack Table (frontend).

**Architecture philosophy:** The backend must be flat and simple. Handlers, middleware, and database access should be straightforward and easy to follow without deep Go expertise. Avoid unnecessary abstractions, layering, or enterprise patterns — a developer unfamiliar with the codebase should be able to read a handler file and immediately understand what it does.

---

## Glossary

- **System**: The Molikule Supply Chain Analytics Dashboard application as a whole.
- **Backend**: The Go/Fiber HTTP API server.
- **Frontend**: The React/TypeScript/Vite single-page application.
- **Authenticator**: The backend component responsible for validating credentials and issuing JWTs.
- **JWT**: JSON Web Token used as the bearer credential for all protected API calls.
- **Admin**: A user with role `admin` who has full access including user management.
- **User**: An authenticated employee with role `user` who can search and view dashboard data.
- **Employee_ID**: A 6-digit numeric string that uniquely identifies an employee and serves as the login username.
- **Password_Hash**: A bcrypt hash of a user's password; never stored or transmitted as plain text.
- **Search_Handler**: The backend component that processes search requests, applies filters, and returns paginated results with summaries.
- **Search_Form**: The frontend component that collects and validates search filter inputs.
- **Summary_Card**: The frontend component that displays aggregated metrics computed by the backend for the current search.
- **Results_Table**: The frontend component that displays the paginated list of purchase records.
- **Paginator**: The backend/frontend logic that divides result sets into pages and returns the requested page.
- **Purchase_Record**: A single row in the `purchase_records` table representing one purchasing transaction.
- **Material_Code**: An exactly 8-digit numeric string identifying a material.
- **Vendor_Code**: An exactly 8-digit numeric string identifying a vendor.
- **Plant_Code**: An exactly 4-character alphanumeric string identifying a plant.
- **SQLC**: The code-generation tool used to produce strongly-typed Go database access code from SQL queries.
- **Role_Guard**: The backend middleware that enforces role-based access control on protected endpoints.
- **Protected_Route**: A frontend wrapper component that redirects unauthenticated users to the login page.

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As an employee, I want to log in with my Employee ID and password, so that I can securely access the dashboard.

#### Acceptance Criteria

1. THE Authenticator SHALL accept an Employee_ID (exactly 6 numeric digits) and a plaintext password as login credentials.
2. WHEN a login request is received with a valid Employee_ID and correct password, THE Authenticator SHALL return a signed JWT containing the user's ID, Employee_ID, name, and role.
3. IF a login request is received with an invalid Employee_ID format, an unrecognised Employee_ID, or an incorrect password, THEN THE Authenticator SHALL return an HTTP 401 response with a generic error message that does not distinguish between incorrect ID and incorrect password.
4. THE Authenticator SHALL hash all passwords using bcrypt before storage and SHALL compare login passwords against the stored bcrypt hash only; plain-text passwords SHALL never be stored or logged.
5. WHEN a valid JWT is included in an API request, THE Backend SHALL grant access to protected resources according to the user's role.
6. IF a request arrives at a protected endpoint without a JWT or with an invalid or expired JWT, THEN THE Backend SHALL return an HTTP 401 response.
7. THE Frontend SHALL store the JWT in memory or browser local storage and SHALL attach it as a Bearer token in the `Authorization` header of every protected API request.
8. THE Protected_Route SHALL redirect any unauthenticated user to the Login page before rendering a protected page.

---

### Requirement 2: Change Password

**User Story:** As an authenticated employee, I want to change my own password, so that I can maintain account security.

#### Acceptance Criteria

1. WHEN an authenticated user submits a change-password request with their current password and a new password, THE Authenticator SHALL verify the current password against the stored bcrypt hash before applying the change.
2. IF the current password provided does not match the stored hash, THEN THE Authenticator SHALL return an HTTP 400 response with an error message.
3. WHEN the current password is verified successfully, THE Authenticator SHALL hash the new password with bcrypt and persist the updated hash.
4. THE Backend SHALL enforce that a user may only change their own password via the `POST /api/auth/change-password` endpoint; changing another user's password SHALL require Admin role and use the `PUT /api/users/:id/password` endpoint.

---

### Requirement 3: User Management (Admin Only)

**User Story:** As an Admin, I want to create, delete, and manage user accounts, so that I can control who has access to the dashboard.

#### Acceptance Criteria

1. THE Role_Guard SHALL restrict `GET /api/users`, `POST /api/users`, `PUT /api/users/:id/password`, and `DELETE /api/users/:id` to requests carrying a JWT with role `admin`; all other roles SHALL receive an HTTP 403 response.
2. WHEN an Admin submits a create-user request with a unique Employee_ID, name, initial password, and role, THE Backend SHALL hash the password with bcrypt and persist the new user record.
3. IF an Admin submits a create-user request with an Employee_ID that already exists, THEN THE Backend SHALL return an HTTP 409 response with a descriptive error message.
4. WHEN an Admin submits a delete-user request for an existing user ID, THE Backend SHALL permanently remove that user record from the database.
5. IF an Admin submits a delete-user request for a user ID that does not exist, THEN THE Backend SHALL return an HTTP 404 response.
6. WHEN an Admin submits a reset-password request for an existing user ID with a new password, THE Backend SHALL hash the new password with bcrypt and update that user's stored hash.
7. THE Backend SHALL return the full list of users (excluding password hashes) in response to `GET /api/users`, ordered by Employee_ID ascending.
8. THE Frontend User_Management page SHALL display the user list, and SHALL present confirmation dialogs before executing delete or password-reset actions.
9. THE Frontend User_Management page SHALL be accessible only to authenticated users with role `admin`; other authenticated users SHALL be redirected to the Dashboard page.

---

### Requirement 4: Purchase Record Search

**User Story:** As an authenticated user, I want to search purchasing records by material, vendor, plant, and date range, so that I can analyse relevant supply chain data.

#### Acceptance Criteria

1. THE Search_Handler SHALL accept a search request containing optional fields: Material_Code, Vendor_Code, Plant_Code, start date, and end date, plus mandatory pagination parameters (page number and page size).
2. IF a search request is submitted with none of Material_Code, Vendor_Code, or Plant_Code provided, THEN THE Search_Handler SHALL return an HTTP 400 response indicating that at least one of those three filters is required.
3. IF a search request includes a Material_Code that is not exactly 8 numeric digits, THEN THE Search_Handler SHALL return an HTTP 400 response with a descriptive validation error.
4. IF a search request includes a Vendor_Code that is not exactly 8 numeric digits, THEN THE Search_Handler SHALL return an HTTP 400 response with a descriptive validation error.
5. IF a search request includes a Plant_Code that is not exactly 4 alphanumeric characters, THEN THE Search_Handler SHALL return an HTTP 400 response with a descriptive validation error.
6. WHEN a valid search request is received, THE Search_Handler SHALL query the `purchase_records` table using SQLC parameterised queries, applying only the filters that are present.
7. THE Search_Handler SHALL support all filter combinations: Material_Code only, Vendor_Code only, Plant_Code only, Material_Code + Vendor_Code, Material_Code + Plant_Code, Vendor_Code + Plant_Code, Material_Code + Vendor_Code + Plant_Code, and any of the above combined with an optional date range on `purchase_date`.
8. WHEN a date range is provided, THE Search_Handler SHALL include only Purchase_Records whose `purchase_date` falls within the inclusive range [start date, end date].
9. THE Paginator SHALL return a subset of matching records corresponding to the requested page, using server-side pagination with a default page size of 50.
10. THE Search_Handler SHALL support client-requested sorting of results by `purchase_date`, `cost`, or `net_price`, in ascending or descending order.
11. THE Search_Handler SHALL never return the entire unfiltered dataset; a filter must always be applied before querying.
12. THE Search_Form SHALL validate all inputs on the client side before submitting a request, applying the same rules as the server-side validation in criteria 2–5.

---

### Requirement 5: Search Results Display

**User Story:** As an authenticated user, I want to view search results in a paginated table, so that I can browse purchase records efficiently.

#### Acceptance Criteria

1. THE Results_Table SHALL display the following columns for each returned Purchase_Record: Plant Code, Material Code, Description, Vendor Code, Purchase Number, Purchase Date, Quantity, Unit, Net Price, Cost, Currency, Supplying Plant.
2. THE Paginator SHALL provide pagination controls showing the current page, total pages, and total record count, and SHALL allow navigation to the previous and next pages.
3. WHILE a search request is in progress, THE Frontend SHALL display a loading indicator and disable the search submit button.
4. IF a search returns zero records, THEN THE Frontend SHALL display a clear "no results found" message.
5. IF the Backend returns an error response to a search request, THEN THE Frontend SHALL display the error message to the user without crashing.
6. THE Results_Table SHALL allow the user to select a sort column (Purchase Date, Cost, Net Price) and sort direction, triggering a new search request with the updated sort parameters.

---

### Requirement 6: Analytics Summary Card

**User Story:** As an authenticated user, I want to see aggregated analytics for my search results, so that I can quickly understand purchasing patterns without manually analysing raw records.

#### Acceptance Criteria

1. WHEN a search returns results, THE Summary_Card SHALL always display: Records Found, Total Purchase Cost (SUM of `cost`), Average Purchase Cost (AVG of `cost`), Average Net Price (AVG of `net_price`), Lowest Cost (MIN of `cost`), Highest Cost (MAX of `cost`), Number of Purchase Orders (COUNT DISTINCT of `purchase_no`), Earliest Purchase Date, Latest Purchase Date, Currencies Present, and Units Present.
2. WHEN the search request includes a Vendor_Code filter, THE Summary_Card SHALL additionally display a Vendor Summary containing: Vendor Code, Average Purchase Cost, Average Net Price, Last Purchase Cost (cost from the most recent `purchase_date` within the filtered result set), Cheapest Purchase Cost (MIN cost within the filtered result set), Materials Supplied Count (COUNT DISTINCT of `material_code`), Plants Served Count (COUNT DISTINCT of `plant_code`), Purchase Orders Count (COUNT DISTINCT of `purchase_no`), Currencies, Units, First Purchase Date, Last Purchase Date.
3. WHEN the search request includes a Material_Code filter, THE Summary_Card SHALL additionally display a Material Summary containing: Material Code, Description, Average Purchase Cost, Average Net Price, Last Purchase Cost, Cheapest Purchase Cost, Vendor Count (COUNT DISTINCT of `vendor_code`), Plant Count (COUNT DISTINCT of `plant_code`), Purchase Orders Count (COUNT DISTINCT of `purchase_no`), Currencies, Units, First Purchase Date, Last Purchase Date.
4. WHEN the search request includes a Plant_Code filter, THE Summary_Card SHALL additionally display a Plant Summary containing: Plant Code, Average Purchase Cost, Average Net Price, Last Purchase Cost, Cheapest Purchase Cost, Vendor Count (COUNT DISTINCT of `vendor_code`), Material Count (COUNT DISTINCT of `material_code`), Purchase Orders Count (COUNT DISTINCT of `purchase_no`), Currencies, Units, First Purchase Date, Last Purchase Date.
5. WHEN the search includes multiple filters (combined search), THE Summary_Card SHALL display the metrics defined in criterion 1 plus the combined metrics: Total Purchase Cost, Average Purchase Cost, Average Net Price, Last Purchase Cost, Cheapest Purchase Cost, Purchase Order Count, Currencies, Units, First Purchase Date, Last Purchase Date, Records Found — presenting each metric only once with no duplicate information.
6. THE Backend Summary_Card query SHALL be computed server-side using SQLC and returned alongside the paginated records in a single API response; the frontend SHALL not recompute summary aggregates from the current page of records.
7. IF a search returns zero records, THEN THE Summary_Card SHALL display "No data available" rather than zero-values for all metrics.

---

### Requirement 7: Database Schema and Indexes

**User Story:** As a developer, I want the database schema and indexes to be defined in version-controlled migrations, so that the database can be reliably reproduced and queries perform acceptably for 300,000 rows.

#### Acceptance Criteria

1. THE Backend SHALL manage database schema using SQL migration files located at `backend/sql/migrations/`; schema changes SHALL only be applied by running these migration files.
2. THE `purchase_records` table SHALL contain the columns: `id` (BIGSERIAL PRIMARY KEY), `plant_code` (VARCHAR(4) NOT NULL), `material_code` (VARCHAR(8) NOT NULL), `vendor_code` (VARCHAR(8) NOT NULL), `description` (TEXT), `purchase_no` (VARCHAR(10)), `purchase_date` (DATE NOT NULL), `net_price` (NUMERIC(15,2)), `cost` (NUMERIC(15,2)), `supplying_plant` (TEXT), `quantity` (NUMERIC(15,2)), `currency` (VARCHAR(10)), `unit` (VARCHAR(20)).
3. THE `users` table SHALL contain the columns: `id` (BIGSERIAL PRIMARY KEY), `employee_id` (VARCHAR(6) UNIQUE NOT NULL), `name` (VARCHAR(255)), `password_hash` (TEXT NOT NULL), `role` (VARCHAR(20) NOT NULL), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).
4. THE Migration SHALL create the following indexes on `purchase_records`: single-column indexes on `material_code`, `vendor_code`, `plant_code`, and `purchase_date`; composite indexes on (`material_code`, `vendor_code`), (`material_code`, `plant_code`), and (`vendor_code`, `plant_code`).
5. THE Backend SHALL use SQLC for all database access; no ORM framework SHALL be used, and all SQL queries SHALL be parameterised to prevent SQL injection.

---

### Requirement 8: SQLC Query Organisation

**User Story:** As a developer, I want database queries organised into separate SQL files per domain, so that the codebase is easy to navigate and maintain.

#### Acceptance Criteria

1. THE Backend SQL queries directory (`backend/sql/queries/`) SHALL contain separate SQL files for: authentication queries, user management queries, search/filter queries, count queries, and summary aggregation queries.
2. THE SQLC configuration file (`backend/sqlc.yaml`) SHALL be present and SHALL reference all query files and the schema migrations.
3. WHEN SQLC code generation is run, THE Backend SHALL produce strongly-typed Go structs and query functions with no manual type assertions needed for database access.

---

### Requirement 9: Excel Data Migration

> **Note:** The migration script is handled externally by the user and is outside the scope of the Molikule application. The PostgreSQL `purchase_records` table is assumed to be fully populated before Molikule starts. The application has no dependency on the migration process at runtime.

---

### Requirement 10: API Structure and Error Handling

**User Story:** As a developer, I want the backend API to follow a consistent structure with proper error handling, so that the frontend can reliably interpret responses.

#### Acceptance Criteria

1. THE Backend SHALL expose the following endpoints: `POST /api/auth/login`, `POST /api/auth/change-password`, `GET /api/users`, `POST /api/users`, `PUT /api/users/:id/password`, `DELETE /api/users/:id`, `POST /api/search`.
2. THE Backend SHALL return JSON responses for all endpoints; error responses SHALL include a machine-readable `error` field and a human-readable `message` field.
3. IF an unhandled server error occurs, THEN THE Backend SHALL return an HTTP 500 response with a generic message and SHALL log the detailed error server-side; internal stack traces or database error messages SHALL not be included in the HTTP response body.
4. THE Backend SHALL validate all incoming request bodies and return HTTP 400 with field-level error details for validation failures before attempting any database query.
5. THE `POST /api/search` endpoint SHALL return a single JSON object containing three keys: `summary` (aggregated metrics object), `records` (array of Purchase_Records for the current page), and `pagination` (object with `page`, `pageSize`, `totalRecords`, `totalPages`).

---

### Requirement 11: Frontend Application Structure

**User Story:** As a developer, I want the frontend organised into well-defined pages and reusable components, so that the UI is easy to maintain and extend.

#### Acceptance Criteria

1. THE Frontend SHALL contain the following pages: `Login`, `Dashboard`, and `UserManagement`, located under `frontend/src/pages/`.
2. THE Frontend SHALL contain the following reusable components: `SearchForm`, `SummaryCard`, `ResultsTable`, `Navbar`, and `ProtectedRoute`, located under `frontend/src/components/`.
3. THE Frontend SHALL use TanStack Query for all server-state management and SHALL not implement any manual caching layer.
4. THE Frontend SHALL use TanStack Table for the Results_Table to manage column definitions, sorting state, and pagination state.
5. THE Frontend Dashboard page SHALL render in the following vertical order: Search_Form at the top, Summary_Card below the Search_Form, Results_Table below the Summary_Card, and pagination controls below the Results_Table.
6. THE Frontend SHALL display a professional, corporate-style UI using cards and tables; no charts, animations, dark mode, or decorative widgets SHALL be included.
7. THE Frontend SHALL be responsive for laptop screen widths; layouts SHALL not break at standard laptop resolutions (1280px and above).
8. THE Navbar SHALL display the logged-in user's name and role, and SHALL provide a logout button that clears the stored JWT and redirects to the Login page.

---

### Requirement 12: Project Structure and Deployment

**User Story:** As a developer, I want the project laid out in a defined structure with clean separation of concerns, so that the codebase is easy to navigate and the application is straightforward to deploy on the company LAN.

#### Acceptance Criteria

1. THE Backend source code SHALL be organised under `backend/` with subpackages: `cmd/server/` (entry point), `internal/auth/`, `internal/users/`, `internal/dashboard/`, `internal/search/`, `internal/middleware/`, `internal/db/`, `internal/config/`, `internal/models/`.
2. THE Frontend source code SHALL be organised under `frontend/` with subdirectories: `src/pages/`, `src/components/`, `src/services/`, `src/hooks/`, `src/types/`, `src/api/`.
3. THE System SHALL have no external internet dependencies at runtime; all backend dependencies SHALL be vendored or resolved from a local module cache, and the frontend build output SHALL be self-contained static assets.
4. THE Backend configuration (database DSN, JWT secret, server port) SHALL be loaded from environment variables or a configuration file at startup; hardcoded credentials SHALL not appear in source code.
