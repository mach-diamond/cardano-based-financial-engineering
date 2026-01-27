# MintMatrix Financial Instruments - Justfile
# Task automation for development workflow

# Start the backend API server
api:
    @echo "Starting backend API server on port 3005..."
    @bun run --filter @mintmatrix/backend dev

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
