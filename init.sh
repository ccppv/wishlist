#!/bin/bash

# Project initialization script

set -e

echo "🚀 Wishlist Application - Initialization"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo ""
    echo "❌ Docker daemon is not running!"
    echo ""
    echo "Please start Docker Desktop:"
    echo "  1. Open Docker Desktop application"
    echo "  2. Wait for it to fully start (whale icon in menu bar)"
    echo "  3. Run this script again"
    echo ""
    exit 1
fi

echo "✅ Docker daemon is running"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    
    # Generate random secret key
    SECRET_KEY=$(openssl rand -hex 32)
    
    # Update .env with generated secret
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/change-me-to-a-random-secret-key-at-least-32-characters-long/$SECRET_KEY/" .env
    else
        # Linux
        sed -i "s/change-me-to-a-random-secret-key-at-least-32-characters-long/$SECRET_KEY/" .env
    fi
    
    echo "✅ .env file created with random SECRET_KEY"
    echo "⚠️  Please review and update database password in .env"
else
    echo "✅ .env file already exists"
fi
echo ""

# Create backend .env
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env file..."
    cp backend/.env.example backend/.env
    echo "✅ backend/.env file created"
fi
echo ""

# Create frontend .env.local
if [ ! -f frontend/.env.local ]; then
    echo "📝 Creating frontend/.env.local file..."
    cp frontend/.env.local.example frontend/.env.local
    echo "✅ frontend/.env.local file created"
fi
echo ""

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x backend/dev-setup.sh
chmod +x frontend/dev-setup.sh
echo "✅ Scripts are now executable"
echo ""

# Build containers
echo "🏗️  Building Docker containers..."
docker-compose build
echo "✅ Containers built successfully"
echo ""

# Start services
echo "🚀 Starting services..."
docker-compose up -d
echo "✅ Services started"
echo ""

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations
echo "📦 Running database migrations..."
docker-compose exec -T backend alembic upgrade head
echo "✅ Migrations completed"
echo ""

echo "========================================"
echo "✅ Initialization Complete!"
echo "========================================"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo "   Health:    http://localhost:8000/health"
echo ""
echo "📚 Useful commands:"
echo "   make logs          - View all logs"
echo "   make logs-backend  - View backend logs"
echo "   make logs-frontend - View frontend logs"
echo "   make down          - Stop all services"
echo "   make restart       - Restart services"
echo "   make help          - Show all available commands"
echo ""
echo "🎉 Happy coding!"
