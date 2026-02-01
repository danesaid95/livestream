.PHONY: help install dev dev-tools build start stop logs clean test lint migrate seed

# Default target
help:
	@echo "Livestream Platform - Development Commands"
	@echo ""
	@echo "Usage: make [command]"
	@echo ""
	@echo "Commands:"
	@echo "  install      Install all dependencies"
	@echo "  dev          Start development environment (backend + postgres + redis)"
	@echo "  dev-tools    Start development environment with admin tools (pgAdmin, Redis Commander)"
	@echo "  build        Build the production image"
	@echo "  start        Start production containers"
	@echo "  stop         Stop all containers"
	@echo "  logs         View container logs"
	@echo "  clean        Remove all containers and volumes"
	@echo "  test         Run tests"
	@echo "  lint         Run linter"
	@echo "  migrate      Run database migrations"
	@echo "  seed         Seed the database"
	@echo "  shell        Open a shell in the backend container"

# Install dependencies
install:
	cd backend && npm install

# Start development environment
dev:
	docker-compose up --build

# Start development with admin tools (pgAdmin, Redis Commander)
dev-tools:
	docker-compose --profile tools up --build

# Build production image
build:
	docker-compose -f docker-compose.prod.yml build

# Start production containers
start:
	docker-compose -f docker-compose.prod.yml up -d

# Stop all containers
stop:
	docker-compose down
	docker-compose -f docker-compose.prod.yml down

# View logs
logs:
	docker-compose logs -f backend

# Clean up everything
clean:
	docker-compose down -v --rmi local
	docker-compose -f docker-compose.prod.yml down -v --rmi local

# Run tests
test:
	docker-compose exec backend npm run test

# Run tests with coverage
test-cov:
	docker-compose exec backend npm run test:cov

# Run linter
lint:
	docker-compose exec backend npm run lint

# Run database migrations
migrate:
	docker-compose exec backend npm run migration:run

# Generate a new migration
migrate-gen:
	@read -p "Migration name: " name; \
	docker-compose exec backend npm run migration:generate src/database/migrations/$$name

# Seed the database
seed:
	docker-compose exec backend npm run seed

# Open shell in backend container
shell:
	docker-compose exec backend sh

# Check container status
status:
	docker-compose ps

# Restart backend only
restart-backend:
	docker-compose restart backend

# View PostgreSQL logs
logs-db:
	docker-compose logs -f postgres

# View Redis logs
logs-redis:
	docker-compose logs -f redis

# Connect to PostgreSQL CLI
psql:
	docker-compose exec postgres psql -U postgres -d livestream

# Connect to Redis CLI
redis-cli:
	docker-compose exec redis redis-cli
