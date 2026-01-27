# MintMatrix Financial Instruments - Justfile
# Task automation for development workflow

# Database configuration (override with environment variables)
DB_HOST := env_var_or_default("DB_HOST", "localhost")
DB_PORT := env_var_or_default("DB_PORT", "5432")
DB_NAME := env_var_or_default("DB_NAME", "fintech-test-suite")
DB_USER := env_var_or_default("DB_USER", "postgres")

# ============ Database ============

# Create the database (run once)
db-create:
    @echo "Creating database '{{DB_NAME}}'..."
    @psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_USER}} -c "CREATE DATABASE \"{{DB_NAME}}\";" || echo "Database may already exist"
    @echo "Database created!"

# Run database migrations/schema setup
db-migrate:
    @echo "Running migrations on '{{DB_NAME}}'..."
    @psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_USER}} -d "{{DB_NAME}}" -f apps/backend/src/db/schema.sql
    @echo "Migrations complete!"

# Reset database (drop and recreate tables)
db-reset:
    @echo "Resetting database '{{DB_NAME}}'..."
    @psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_USER}} -d "{{DB_NAME}}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    @just db-migrate
    @echo "Database reset complete!"

# Connect to database CLI
db-cli:
    @psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_USER}} -d "{{DB_NAME}}"

# Drop the database entirely
db-drop:
    @echo "Dropping database '{{DB_NAME}}'..."
    @psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_USER}} -c "DROP DATABASE IF EXISTS \"{{DB_NAME}}\";"
    @echo "Database dropped!"

# ============ Servers ============

# Start the backend API server
api:
    @echo "Starting backend API server on port 3005..."
    @cd apps/backend && bun --watch src/index.ts

# Start the frontend dev server
www:
    @echo "Starting frontend dev server on port 3001..."
    @bun run --filter @mintmatrix/web dev

# Start the documentation dev server
docs:
    @echo "Starting documentation dev server..."
    @bun run --filter docs dev

# Start all dev servers (in parallel)
dev:
    @echo "Starting MintMatrix development servers..."
    @just -j 3 api www docs

# Format all code
fmt:
    @echo "Formatting code..."
    @bun run format

# Build all projects
build:
    @echo "Building all projects..."
    @bun run build

# Lint all projects
lint:
    @echo "Linting code..."
    @bun run lint

# Run all tests
test:
    @echo "Running tests..."
    @bun run test

# Run unit tests
test-unit:
    @echo "Running unit tests..."
    @bun run test:unit

# Run integration tests
test-integration:
    @echo "Running integration tests..."
    @bun run test:integration

# Clean all node_modules and build artifacts
clean:
    @echo "Cleaning node_modules and build artifacts..."
    @bun run clean
    @echo "Clean complete!"

# Show all available commands
help:
    @just --list
