# PhotoVideo.ae — Development Commands
.PHONY: dev stop build install logs clean setup-aws

# Start local development (Docker)
dev:
	docker compose up -d
	@echo "✅ Dev running:"
	@echo "  Frontend:  http://localhost:3000"
	@echo "  Strapi:    http://localhost:1337/admin"
	@echo "  DB:        localhost:5432"

# Stop all containers
stop:
	docker compose down

# View logs
logs:
	docker compose logs -f

logs-strapi:
	docker compose logs -f strapi

logs-frontend:
	docker compose logs -f frontend

# Install dependencies locally (without Docker)
install:
	cd backend && npm install
	cd frontend && npm install

# Build for production
build:
	cd backend && npm run build
	cd frontend && npm run build

# Setup backend .env
setup-backend-env:
	cp backend/.env.example backend/.env
	@echo "⚠️  Edit backend/.env with your credentials!"

# Setup frontend .env
setup-frontend-env:
	cp frontend/.env.example frontend/.env.local
	@echo "⚠️  Edit frontend/.env.local with your credentials!"

# AWS infrastructure setup (run locally with AWS CLI)
setup-aws:
	bash infrastructure/scripts/setup-aws.sh

# Deploy to production (run on server)
deploy:
	bash infrastructure/scripts/deploy.sh

# Clean Docker volumes (⚠️ deletes DB data!)
clean:
	docker compose down -v
	@echo "⚠️  All volumes removed!"

# Type check frontend
type-check:
	cd frontend && npm run type-check

# Generate Strapi types
strapi-types:
	cd backend && npm run strapi ts:generate-types
