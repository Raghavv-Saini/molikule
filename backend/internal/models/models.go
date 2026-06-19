package models

import "github.com/gofiber/fiber/v2"

// ErrorResponse is the standard JSON error body returned for all error responses.
// The Error field is a machine-readable code; the Message field is human-readable.
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// SendError writes a JSON error response with the given HTTP status code,
// machine-readable error code, and human-readable message.
func SendError(c *fiber.Ctx, status int, code, msg string) error {
	return c.Status(status).JSON(ErrorResponse{
		Error:   code,
		Message: msg,
	})
}
