package main

import (
	"log/slog"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"

	sqlcdb "molikule/backend/db"
	"molikule/backend/internal/auth"
	"molikule/backend/internal/config"
	internaldb "molikule/backend/internal/db"
	"molikule/backend/internal/middleware"
	"molikule/backend/internal/models"
	"molikule/backend/internal/search"
	"molikule/backend/internal/users"

	"net/http"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// ── Load configuration ────────────────────────────────────────────────────
	cfg, err := config.New()
	if err != nil {
		logger.Error("failed to load configuration", "error", err)
		os.Exit(1)
	}

	// ── Open database connection pool ─────────────────────────────────────────
	pool, err := internaldb.New(cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// ── Ensure application-managed tables exist ───────────────────────────────
	if err := internaldb.EnsureUsersTable(pool); err != nil {
		logger.Error("failed to ensure users table exists", "error", err)
		os.Exit(1)
	}

	// ── Instantiate SQLC queries object ───────────────────────────────────────
	queries := sqlcdb.New(pool)

	// ── Configure Fiber app ───────────────────────────────────────────────────
	app := fiber.New(fiber.Config{
		// Global error handler: log internally, never expose DB errors or stack traces.
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			logger.Error("unhandled request error",
				"method", c.Method(),
				"path", c.Path(),
				"error", err.Error(),
			)
			return models.SendError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "an internal error occurred")
		},
	})

	// ── Register API routes ───────────────────────────────────────────────────
	requireAuth := middleware.RequireAuth(cfg.JWTSecret)
	requireAdmin := middleware.RequireRole("admin")

	api := app.Group("/api")

	// Auth routes
	api.Post("/auth/login", auth.LoginHandler(queries, cfg.JWTSecret))
	api.Post("/auth/change-password", requireAuth, auth.ChangePasswordHandler(queries))

	// User management routes (admin only)
	api.Get("/users", requireAuth, requireAdmin, users.ListUsersHandler(queries))
	api.Post("/users", requireAuth, requireAdmin, users.CreateUserHandler(queries))
	api.Put("/users/:id/password", requireAuth, requireAdmin, users.AdminResetPasswordHandler(queries))
	api.Delete("/users/:id", requireAuth, requireAdmin, users.DeleteUserHandler(queries))

	// Search route
	api.Post("/search", requireAuth, search.SearchHandler(queries))

	// ── Serve frontend static assets (SPA fallback) ───────────────────────────
	// Serves compiled React app from ../frontend/dist.
	// Any request that doesn't match an API route will fall through to the SPA,
	// enabling client-side routing to work correctly.
	app.Use("/", filesystem.New(filesystem.Config{
		Root:         http.Dir("../frontend/dist"),
		Browse:       false,
		Index:        "index.html",
		NotFoundFile: "index.html",
	}))

	// ── Start server ──────────────────────────────────────────────────────────
	addr := ":" + cfg.Port
	logger.Info("starting server", "addr", addr)

	if err := app.Listen(addr); err != nil {
		logger.Error("server stopped unexpectedly", "error", err)
		os.Exit(1)
	}
}
