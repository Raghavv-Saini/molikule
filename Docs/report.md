# Molikule Supply Chain Analytics Dashboard - Final Submission Report

## Submission Overview

This report documents the work completed for the Molikule Supply Chain Analytics Dashboard, an internal web application built for company LAN usage. The project was developed as part of my final submission for the firm.

I joined the project on **2 June** and completed the final implementation and submission work on **30 June**.

The application is designed to help authenticated employees search purchasing records, review supply chain data, compare vendors, and view aggregated analytics from a PostgreSQL database through a secure browser-based dashboard.

## Problem Statement

The supply chain management team had historical purchasing data from SAP ECC, but the data could not be accessed or analysed efficiently for day-to-day decision making. Finding relevant purchase records, comparing vendors, reviewing order costs, and checking material-level history required a more direct and searchable interface.

Another concern was that SAP ECC may be decommissioned soon. Because of this, relying only on ECC for historical purchase analysis created operational risk for the team.

The existing ECC-based data access was also not expected to be directly compatible with the newer SAP S/4HANA ERP environment. This created a need for an independent analytics layer where exported or migrated purchase data could be stored, searched, and analysed without depending on the older ECC system.

Molikule was built to address this gap by providing a dedicated internal dashboard for supply chain purchase analytics, backed by PostgreSQL and accessible through a secure web interface.

## Project Objective

The goal of this project was to build a simple, maintainable, and practical internal analytics dashboard for purchase record analysis. The application needed to:

- Allow employees to securely log in.
- Restrict administrative actions to admin users.
- Search purchase records by material, vendor, plant, and date range.
- Display paginated and sortable purchase records.
- Show useful analytics summaries for searched data.
- Compare vendors for a selected material.
- Run on a company LAN without requiring internet access at runtime.
- Use a PostgreSQL database populated from Excel purchase data.
- Provide clear deployment and migration documentation.

## Technology Stack

| Layer | Technology Used |
|---|---|
| Backend | Go |
| Backend Framework | Fiber |
| Database | PostgreSQL |
| Database Access | SQLC generated query code |
| Authentication | JWT with bcrypt password hashing |
| Frontend | React with TypeScript |
| Frontend Build Tool | Vite |
| Server State | TanStack Query |
| Tables | TanStack Table |
| HTTP Client | Axios |
| Data Migration | Python, pandas, openpyxl, psycopg2 |

## Application Architecture

The application follows a straightforward three-part architecture:

```text
Browser Frontend -> Go/Fiber API Server -> PostgreSQL Database
```

The backend exposes JSON APIs under `/api`, validates JWT tokens for protected routes, executes SQLC-generated database queries, and returns search results with analytics summaries.

The frontend is a React single-page application that handles login, dashboard search, result display, user management, route protection, and automatic logout when tokens expire.

The database stores purchase records and application users. Purchase data is loaded separately using the Excel-to-PostgreSQL migration script.

## Backend Work Completed

### 1. API Server

I built the backend API using Go and Fiber. The server handles application startup, environment configuration, database connection setup, API routing, authentication middleware, and static frontend serving.

The backend is organized into clear packages:

- `cmd/server` for application startup.
- `internal/auth` for login and password handling.
- `internal/users` for admin-only user management.
- `internal/search` for purchase record search and analytics.
- `internal/middleware` for JWT and role protection.
- `internal/config` for environment configuration.
- `internal/db` for database connection setup.
- `internal/models` for shared response helpers.
- `db` for SQLC-generated database code.
- `sql` for migrations and query definitions.

### 2. Authentication

I implemented secure employee authentication using:

- Employee ID based login.
- Bcrypt password verification.
- JWT token generation.
- JWT expiry after 8 hours.
- Protected backend routes.
- Role-based access control.

The login API returns a signed token and user details. All protected APIs require an `Authorization: Bearer <token>` header.

### 3. Role-Based Access Control

The application supports two user roles:

- `user`: can access the dashboard and search purchase data.
- `admin`: can access dashboard features and manage users.

Admin-only routes are protected on both the backend and frontend.

### 4. User Management APIs

I implemented admin user management, including:

- List users.
- Create users.
- Delete users.
- Reset user passwords.
- Store passwords only as bcrypt hashes.
- Return safe user responses without password hashes.

### 5. Search API

I implemented the search endpoint for purchase records. It supports filters for:

- Material code.
- Vendor code.
- Plant code.
- Start date.
- End date.

The search API also supports:

- Server-side pagination.
- Sorting by purchase date, cost, or net price.
- Ascending and descending sort order.
- Validation for material, vendor, and plant code formats.
- Prevention of fully unfiltered searches.

### 6. Analytics Summary API

The search response includes server-side analytics summaries. These are calculated in PostgreSQL and returned together with the current page of results.

The summary includes:

- Records found.
- Total order cost.
- Average order cost.
- Average net unit price.
- Minimum cost.
- Maximum cost.
- Purchase order count.
- Earliest purchase date.
- Latest purchase date.
- Currencies present.
- Units present.

Depending on the active filters, the API also returns:

- Material summary.
- Vendor summary.
- Plant summary.
- Vendor comparison data for material searches.

### 7. SQLC and Database Query Layer

I used SQLC to keep database access type-safe and maintainable. SQL files are organized by purpose:

- Authentication queries.
- User management queries.
- Search queries.
- Count queries.
- Summary and analytics queries.

This avoids manual SQL string handling in the application code and keeps the backend predictable.

## Frontend Work Completed

### 1. React Application Structure

I built the frontend as a React and TypeScript single-page application using Vite. The frontend is organized into:

- `pages` for Login, Dashboard, and User Management.
- `components` for reusable UI blocks.
- `services` for API calls.
- `api` for the Axios client.
- `hooks` for auth access.
- `types` for shared TypeScript interfaces.
- `utils` for local authentication storage helpers.

### 2. Login Page

The login page allows employees to sign in using their employee ID and password. On successful login, the frontend stores the JWT and user details, then routes the user into the protected dashboard.

### 3. Protected Routes

I implemented route protection so unauthenticated users cannot access application pages.

Protected routes include:

- Dashboard.
- User Management.

The User Management page is additionally restricted to admin users.

### 4. Automatic Logout on Token Expiry

I implemented a clean automatic logout flow:

- The frontend decodes the JWT expiry time.
- If a stored token is already expired when the app loads, it is cleared immediately.
- If a token is valid, the app schedules logout for the exact expiry time.
- If any API request returns `401 Unauthorized`, the stored auth state is cleared.
- Protected routes redirect the user to the login page after logout.

This ensures expired sessions do not remain active in the UI.

### 5. Dashboard

The dashboard is the main working area for users. It contains:

- Navbar with logged-in user information.
- Search form.
- Error display area.
- Summary analytics card.
- Vendor comparison section.
- Results table.
- Pagination controls.

### 6. Search Form

The search form supports:

- Material code input.
- Vendor code input.
- Plant code input.
- Start date.
- End date.
- Client-side validation.
- Loading state while a search request is running.

### 7. Summary Card

The summary card displays analytics returned by the backend. I updated the metric labels to match the final naming:

- `Average Order Cost`
- `Average Net Unit Price`

The card also displays currencies and units for the result set.

### 8. Vendor Comparison

I implemented a vendor comparison view that appears when a material search returns multiple vendors.

It compares vendors using:

- Average order cost.
- Average net unit price.
- Purchase order count.
- Record count.
- Currencies used.

This allows users to quickly compare suppliers for the same material.

### 9. Results Table

The results table displays purchase records with columns for:

- Plant code.
- Material code.
- Description.
- Vendor code.
- Purchase number.
- Purchase date.
- Quantity.
- Unit.
- Net price.
- Cost.
- Currency.
- Supplying plant.

It also supports sorting and server-side pagination.

### 10. Admin User Management

I built an admin-only user management page with:

- User listing.
- Create user form.
- Role selection.
- Password reset dialog.
- Delete confirmation dialog.
- Inline validation and error handling.

## Data Migration Work Completed

The project includes a data migration folder for importing purchase records from Excel into PostgreSQL.

I updated and documented the migration script so it:

- Reads `Materials_Database.xlsx`.
- Validates required Excel columns.
- Converts dates from `dd.mm.yyyy`.
- Enforces 6-digit vendor codes.
- Creates the `purchase_records` table.
- Creates indexes for common search patterns.
- Inserts purchase records into PostgreSQL.
- Logs all major stages in the terminal.
- Shows progress for larger files.
- Rolls back when migration fails.

I also updated the migration README and quickstart documentation to match the actual behavior of the script.

## Database Design

The main application data is stored in two database areas:

### Purchase Records

The `purchase_records` table stores imported purchasing transactions. Important fields include:

- Plant code.
- Material code.
- Vendor code.
- Description.
- Purchase number.
- Purchase date.
- Net price.
- Cost.
- Supplying plant.
- Quantity.
- Currency.
- Unit.

### Users

The `users` table stores application users with:

- Employee ID.
- Name.
- Password hash.
- Role.
- Created and updated timestamps.

Passwords are never stored as plain text.

## Security Features

The application includes the following security measures:

- JWT authentication for protected APIs.
- 8-hour token expiry.
- Automatic frontend logout when token expires.
- Backend rejection of missing, invalid, or expired tokens.
- Bcrypt password hashing.
- Role-based access control.
- Admin-only user management.
- No password hashes returned to the frontend.
- Input validation before database queries.
- Parameterised SQL through SQLC.

## Documentation Completed

I created and updated documentation for:

- Project requirements.
- System design.
- Deployment SOP.
- Root project README.
- Data migration README.
- Data migration quickstart guide.
- Final submission report.

These documents are intended to help the firm understand, run, maintain, and extend the application.

## Deployment Readiness

The application is designed for company LAN deployment.

The backend can be built as a Go binary. The frontend can be built into static assets using Vite. The backend can serve the frontend build and expose API routes from the same server.

The runtime requirements are:

- PostgreSQL database.
- Backend environment variables.
- Compiled backend binary.
- Built frontend assets.
- Pre-populated purchase records table.

No internet access is required at runtime.

## Testing and Verification

During development, I verified the application using:

- Frontend production builds with `npm run build`.
- TypeScript compilation.
- Backend structure and route validation.
- Manual review of API flows.
- Search and summary logic review.
- Migration script syntax checks.
- Documentation consistency checks.

Recent frontend builds completed successfully after the final UI and authentication changes.

## Final Deliverables

The final submission includes:

- Go/Fiber backend API.
- React/TypeScript frontend.
- PostgreSQL schema and SQLC queries.
- Authentication and role-based access control.
- Admin user management.
- Search dashboard.
- Analytics summary cards.
- Vendor comparison view.
- Results table with sorting and pagination.
- Automatic logout on token expiry.
- Excel-to-PostgreSQL migration utility.
- Deployment and project documentation.

## Project Timeline

| Date | Milestone |
|---|---|
| 2 June | Joined the project and began implementation work |
| June development period | Built backend APIs, database structure, frontend dashboard, authentication, search, analytics, and admin tools |
| 30 June | Completed final implementation, documentation, and submission preparation |

## Conclusion

Molikule was completed as an internal supply chain analytics dashboard for secure LAN-based use. The final application provides authenticated access, role-based administration, powerful purchasing search, server-side analytics, vendor comparison, and documented data migration support.

The project is structured to be simple to understand, easy to deploy, and maintainable for future developers who may extend the system after submission.
