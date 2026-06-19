package auth

import (
	"database/sql"
	"errors"
	"regexp"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"molikule/backend/db"
	"molikule/backend/internal/middleware"
	"molikule/backend/internal/models"
)

var employeeIDRegex = regexp.MustCompile(`^\d{6}$`)

// loginRequest is the expected JSON body for the login endpoint.
type loginRequest struct {
	EmployeeID string `json:"employee_id"`
	Password   string `json:"password"`
}

// loginResponse is the JSON body returned on successful login.
type loginResponse struct {
	Token string   `json:"token"`
	User  userInfo `json:"user"`
}

type userInfo struct {
	ID         int64  `json:"id"`
	EmployeeID string `json:"employee_id"`
	Name       string `json:"name"`
	Role       string `json:"role"`
}

// changePasswordRequest is the expected JSON body for the change-password endpoint.
type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// LoginHandler validates credentials and returns a signed JWT on success.
func LoginHandler(queries *db.Queries, jwtSecret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req loginRequest
		if err := c.BodyParser(&req); err != nil {
			return models.SendError(c, fiber.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		}

		// Validate employee_id format and password presence.
		if !employeeIDRegex.MatchString(req.EmployeeID) {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR", "employee_id must be exactly 6 digits")
		}
		if req.Password == "" {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR", "password must not be empty")
		}

		user, err := queries.GetUserByEmployeeID(c.Context(), req.EmployeeID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return models.SendError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "invalid credentials")
			}
			return models.SendError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "invalid credentials")
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			return models.SendError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "invalid credentials")
		}

		// Build JWT claims.
		claims := middleware.Claims{
			Sub:        strconv.FormatInt(user.ID, 10),
			EmployeeID: user.EmployeeID,
			Name:       user.Name.String,
			Role:       user.Role,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(8 * time.Hour)),
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		signed, err := token.SignedString([]byte(jwtSecret))
		if err != nil {
			return models.SendError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "could not sign token")
		}

		return c.Status(fiber.StatusOK).JSON(loginResponse{
			Token: signed,
			User: userInfo{
				ID:         user.ID,
				EmployeeID: user.EmployeeID,
				Name:       user.Name.String,
				Role:       user.Role,
			},
		})
	}
}

// ChangePasswordHandler allows an authenticated user to update their password.
func ChangePasswordHandler(queries *db.Queries) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals("claims").(*middleware.Claims)
		if !ok || claims == nil {
			return models.SendError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		}

		var req changePasswordRequest
		if err := c.BodyParser(&req); err != nil {
			return models.SendError(c, fiber.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		}

		if req.CurrentPassword == "" {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR", "current_password must not be empty")
		}
		if req.NewPassword == "" {
			return models.SendError(c, fiber.StatusBadRequest, "VALIDATION_ERROR", "new_password must not be empty")
		}

		userID, err := strconv.ParseInt(claims.Sub, 10, 64)
		if err != nil {
			return models.SendError(c, fiber.StatusBadRequest, "BAD_REQUEST", "invalid user ID in token")
		}

		user, err := queries.GetUserByEmployeeID(c.Context(), claims.EmployeeID)
		if err != nil {
			return models.SendError(c, fiber.StatusBadRequest, "BAD_REQUEST", "user not found")
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
			return models.SendError(c, fiber.StatusBadRequest, "BAD_REQUEST", "current password is incorrect")
		}

		newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
		if err != nil {
			return models.SendError(c, fiber.StatusBadRequest, "BAD_REQUEST", "could not hash new password")
		}

		if err := queries.UpdatePasswordHash(c.Context(), db.UpdatePasswordHashParams{
			PasswordHash: string(newHash),
			ID:           userID,
		}); err != nil {
			return models.SendError(c, fiber.StatusBadRequest, "BAD_REQUEST", "could not update password")
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "password updated successfully",
		})
	}
}
