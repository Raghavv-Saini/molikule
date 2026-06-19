package users

import (
	"database/sql"
	"errors"
	"regexp"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"

	"molikule/backend/db"
	"molikule/backend/internal/models"
)

var employeeIDRegex = regexp.MustCompile(`^\d{6}$`)

// userResponse is the JSON shape returned for a user — no password_hash field.
type userResponse struct {
	ID         int64   `json:"id"`
	EmployeeID string  `json:"employee_id"`
	Name       string  `json:"name"`
	Role       string  `json:"role"`
	CreatedAt  *string `json:"created_at,omitempty"`
}

// createUserRequest is the expected JSON body for the create-user endpoint.
type createUserRequest struct {
	EmployeeID string `json:"employee_id"`
	Name       string `json:"name"`
	Password   string `json:"password"`
	Role       string `json:"role"`
}

// resetPasswordRequest is the expected JSON body for the admin reset-password endpoint.
type resetPasswordRequest struct {
	NewPassword string `json:"new_password"`
}

// isUniqueViolation reports whether err is a PostgreSQL unique-constraint violation.
// We check for SQLSTATE 23505 in the error string because the standard database/sql
// driver wraps the underlying error as a string message.
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "23505") ||
		strings.Contains(err.Error(), "duplicate key") ||
		strings.Contains(err.Error(), "unique constraint")
}

// ListUsersHandler returns all users ordered by employee_id ascending.
// Password hashes are never included in the response.
func ListUsersHandler(queries *db.Queries) fiber.Handler {
	return func(c *fiber.Ctx) error {
		rows, err := queries.ListUsers(c.Context())
		if err != nil {
			return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "could not retrieve users")
		}

		// Build response slice — convert nullable fields to plain strings.
		users := make([]userResponse, 0, len(rows))
		for _, row := range rows {
			u := userResponse{
				ID:         row.ID,
				EmployeeID: row.EmployeeID,
				Name:       row.Name.String,
				Role:       row.Role,
			}
			if row.CreatedAt.Valid {
				ts := row.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
				u.CreatedAt = &ts
			}
			users = append(users, u)
		}

		return c.Status(fiber.StatusOK).JSON(users)
	}
}

// CreateUserHandler creates a new user account.
// Validates employee_id format, name, password, and role before inserting.
// Returns 409 if the employee_id already exists.
func CreateUserHandler(queries *db.Queries) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req createUserRequest
		if err := c.BodyParser(&req); err != nil {
			return models.SendError(c, fiber.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		}

		// Validate fields.
		if !employeeIDRegex.MatchString(req.EmployeeID) {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR", "employee_id must be exactly 6 numeric digits")
		}
		if req.Name == "" {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR", "name must not be empty")
		}
		if req.Password == "" {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR", "password must not be empty")
		}
		if req.Role != "user" && req.Role != "admin" {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR", `role must be "user" or "admin"`)
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
		if err != nil {
			return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "could not hash password")
		}

		created, err := queries.CreateUser(c.Context(), db.CreateUserParams{
			EmployeeID:   req.EmployeeID,
			Name:         sql.NullString{String: req.Name, Valid: true},
			PasswordHash: string(hash),
			Role:         req.Role,
		})
		if err != nil {
			if isUniqueViolation(err) {
				return models.SendError(c, fiber.StatusConflict, "CONFLICT", "an account with that employee_id already exists")
			}
			return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "could not create user")
		}

		resp := userResponse{
			ID:         created.ID,
			EmployeeID: created.EmployeeID,
			Name:       created.Name.String,
			Role:       created.Role,
		}
		if created.CreatedAt.Valid {
			ts := created.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
			resp.CreatedAt = &ts
		}

		return c.Status(fiber.StatusCreated).JSON(resp)
	}
}

// DeleteUserHandler permanently removes a user by ID.
// Returns 204 on success, 404 if the ID does not exist.
func DeleteUserHandler(queries *db.Queries) fiber.Handler {
	return func(c *fiber.Ctx) error {
		idParam := c.Params("id")
		userID, err := strconv.ParseInt(idParam, 10, 64)
		if err != nil {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR", "id must be a valid integer")
		}

		_, err = queries.DeleteUser(c.Context(), userID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return models.SendError(c, fiber.StatusNotFound, "NOT_FOUND", "user not found")
			}
			return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "could not delete user")
		}

		return c.SendStatus(fiber.StatusNoContent)
	}
}

// AdminResetPasswordHandler allows an admin to set a new password for any user.
// Returns 404 if the target user does not exist.
func AdminResetPasswordHandler(queries *db.Queries) fiber.Handler {
	return func(c *fiber.Ctx) error {
		idParam := c.Params("id")
		userID, err := strconv.ParseInt(idParam, 10, 64)
		if err != nil {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR", "id must be a valid integer")
		}

		var req resetPasswordRequest
		if err := c.BodyParser(&req); err != nil {
			return models.SendError(c, fiber.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		}

		if req.NewPassword == "" {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR", "new_password must not be empty")
		}

		// Confirm the user exists before touching the password.
		_, err = queries.GetUserByID(c.Context(), userID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return models.SendError(c, fiber.StatusNotFound, "NOT_FOUND", "user not found")
			}
			return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "could not retrieve user")
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
		if err != nil {
			return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "could not hash password")
		}

		if err := queries.UpdateUserPasswordHash(c.Context(), db.UpdateUserPasswordHashParams{
			PasswordHash: string(hash),
			ID:           userID,
		}); err != nil {
			return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "could not update password")
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "password updated successfully",
		})
	}
}
