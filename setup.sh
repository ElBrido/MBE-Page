#!/bin/bash

echo "🚀 Starting MBE Hosting Platform Setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16.x or higher."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed. Please install PostgreSQL 12.x or higher."
    echo "   Installation guide: https://www.postgresql.org/download/"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "✏️  Please edit .env file with your configuration before starting the server."
    echo ""
    echo "Required configurations:"
    echo "  - Database credentials (DB_HOST, DB_USER, DB_PASSWORD)"
    echo "  - Stripe API keys (STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY)"
    echo "  - Pterodactyl API key and URL"
    echo "  - Generate secure random strings for ENCRYPTION_KEY and SESSION_SECRET"
    echo ""
    echo "To generate random strings, you can use:"
    echo "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
else
    echo "✅ .env file exists"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your .env file"
echo "2. Set up PostgreSQL database"
echo "3. Run: npm start"
echo ""
echo "For development with auto-reload:"
echo "  npm run dev"
echo ""
echo "📖 See README.md for detailed instructions"
