package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"molikule/backend/internal/models"
)

// Claims holds the custom JWT claims stored in the token payload.
type Claims struct {
	Sub        string `json:"sub"`
	EmployeeID string `json:"employee_id"`
	Name       string `json:"name"`
	Role       string `json:"role"`
	jwt.RegisteredClaims
}

// RequireAuth returns a Fiber middleware that validates the JWT in the
// Authorization: Bearer <token> header. On success the parsed Claims are
// stored in c.Locals("claims", claims) so downstream handlers can read them.
// A 401 JSON response is returned for any missing, malformed, or expired token.
func RequireAuth(jwtSecret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return models.SendError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "missing authorization header")
		}

		const bearerPrefix = "Bearer "
		if !strings.HasPrefix(authHeader, bearerPrefix) {
			return models.SendError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "authorization header must use Bearer scheme")
		}

		tokenStr := strings.TrimPrefix(authHeader, bearerPrefix)
		if tokenStr == "" {
			return models.SendError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "missing token")
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			// Enforce HMAC signing method to prevent algorithm confusion attacks.
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.NewError(fiber.StatusUnauthorized, "unexpected signing method")
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			return models.SendError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "invalid or expired token")
		}

		c.Locals("claims", claims)
		return c.Next()
	}
}

// RequireRole returns a Fiber middleware that enforces a specific role on the
// authenticated user. It must be placed after RequireAuth in the middleware
// chain so that claims are already available in c.Locals. Returns 403 if the
// user's role does not match the required role.
func RequireRole(role string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals("claims").(*Claims)
		if !ok || claims == nil {
			// This should only happen if RequireRole is used without RequireAuth.
			return models.SendError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		}

		if claims.Role != role {
			return models.SendError(c, fiber.StatusForbidden, "FORBIDDEN", "insufficient permissions")
		}

		return c.Next()
	}
}
