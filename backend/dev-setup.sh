#!/bin/bash

# Backend development script

set -e

echo "🐍 Backend Development Setup"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your settings"
fi

echo "✅ Backend setup complete!"
echo ""
echo "To start development server:"
echo "  source venv/bin/activate"
echo "  uvicorn app.main:app --reload"
