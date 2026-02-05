#!/bin/bash

# Proper Place Backend - Quick Start Script
# This script sets up and runs the backend locally

set -e  # Exit on error

echo "🚀 Proper Place Backend - Quick Start"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ from https://nodejs.org"
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed. Please install PostgreSQL from https://www.postgresql.org/download"
    echo "After installation, you can set up the database manually or continue."
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "⚙️  Setting up environment..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file (remember to update it with your database password)"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🗄️  Setting up database..."
echo ""
echo "Option 1: If PostgreSQL is running locally, run this command to create the database:"
echo "  createdb proper_place"
echo ""
echo "Option 2: Use Railway's PostgreSQL (recommended for production)"
echo ""

echo "🚀 Starting backend server in development mode..."
echo ""
echo "The server will:"
echo "  ✓ Connect to PostgreSQL"
echo "  ✓ Run database migrations"
echo "  ✓ Start listening on http://localhost:3001"
echo ""

npm run dev
