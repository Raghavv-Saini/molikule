package db

import (
	"database/sql"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib" // registers "pgx" driver for database/sql
)

// New opens a PostgreSQL connection pool using the provided DSN.
// It uses pgx's database/sql-compatible stdlib adapter so the returned
// *sql.DB satisfies the SQLC-generated DBTX interface.
func New(dsn string) (*sql.DB, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

// EnsureUsersTable creates the application-managed users table if it is absent.
// It intentionally does not touch purchase_records, which is populated externally.
func EnsureUsersTable(db *sql.DB) error {
	const query = `
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL    PRIMARY KEY,
    employee_id   VARCHAR(6)   UNIQUE NOT NULL,
    name          VARCHAR(255),
    password_hash TEXT         NOT NULL,
    role          VARCHAR(20)  NOT NULL,
    created_at    TIMESTAMP    DEFAULT NOW(),
    updated_at    TIMESTAMP    DEFAULT NOW()
);`

	if _, err := db.Exec(query); err != nil {
		return fmt.Errorf("failed to ensure users table exists: %w", err)
	}

	return nil
}
