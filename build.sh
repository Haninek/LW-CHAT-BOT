#!/bin/bash
# Railway build script for UW Wizard

echo "🏗️ Building UW Wizard for Railway..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r server/requirements.txt

# Install Node.js dependencies and build frontend
echo "🎨 Building frontend..."
cd web
npm install
npm run build

# Copy frontend build to server static directory
echo "📁 Setting up static files..."
cd ..
mkdir -p server/static
cp -r web/dist/* server/static/ 2>/dev/null || echo "No dist files found"

echo "✅ Build complete!"
