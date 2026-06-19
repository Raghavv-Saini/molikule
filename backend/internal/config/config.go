package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// Config holds the application configuration loaded from environment variables.
type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
}

// New loads configuration from environment variables and returns a Config.
// It attempts to load a .env file from the working directory first (dev convenience);
// if no .env file is present it falls back to the process environment silently.
// It returns a descriptive error if any required variable is missing.
func New() (*Config, error) {
	// Load .env if present; ignore the error so production (no .env file) works fine.
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("required environment variable DATABASE_URL is not set")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, fmt.Errorf("required environment variable JWT_SECRET is not set")
	}

	port := os.Getenv("PORT")
	if port == "" {
		return nil, fmt.Errorf("required environment variable PORT is not set")
	}

	return &Config{
		DatabaseURL: dbURL,
		JWTSecret:   jwtSecret,
		Port:        port,
	}, nil
}
