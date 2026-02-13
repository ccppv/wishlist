#!/bin/bash

# Frontend development script

set -e

echo "⚛️  Frontend Development Setup"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo "Dependencies already installed"
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local from .env.local.example..."
    cp .env.local.example .env.local
    echo "⚠️  Please edit .env.local file with your settings"
fi

echo "✅ Frontend setup complete!"
echo ""
echo "To start development server:"
echo "  npm run dev"
echo ""
echo "Frontend will be available at http://localhost:3000"
