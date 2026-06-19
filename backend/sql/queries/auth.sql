-- name: GetUserByEmployeeID :one
SELECT id, employee_id, name, password_hash, role, created_at, updated_at
FROM users
WHERE employee_id = $1;

-- name: UpdatePasswordHash :exec
UPDATE users
SET password_hash = $1,
    updated_at    = NOW()
WHERE id = $2;
