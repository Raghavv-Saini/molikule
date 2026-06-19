-- name: ListUsers :many
SELECT id, employee_id, name, role, created_at, updated_at
FROM users
ORDER BY employee_id ASC;

-- name: CreateUser :one
INSERT INTO users (employee_id, name, password_hash, role)
VALUES ($1, $2, $3, $4)
RETURNING id, employee_id, name, role, created_at;

-- name: GetUserByID :one
SELECT id, employee_id, name, role
FROM users
WHERE id = $1;

-- name: UpdateUserPasswordHash :exec
UPDATE users
SET password_hash = $1,
    updated_at    = NOW()
WHERE id = $2;

-- name: DeleteUser :one
DELETE FROM users
WHERE id = $1
RETURNING id;
