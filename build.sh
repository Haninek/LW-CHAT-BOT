#!/bin/bash
# Railway build script for UW Wizard

echo "🏗️ Building UW Wizard for Railway..."

# Check current directory
echo "📍 Current directory: $(pwd)"
ls -la

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r server/requirements.txt

# Install Node.js dependencies and build frontend
echo "🎨 Building frontend..."
cd web
echo "📍 In web directory: $(pwd)"
npm install
npm run build

echo "📍 Checking build output..."
ls -la dist/ || echo "❌ No dist directory found"

# Copy frontend build to server static directory
echo "📁 Setting up static files..."
cd ..
mkdir -p server/static

if [ -d "web/dist" ] && [ "$(ls -A web/dist)" ]; then
    echo "✅ Copying frontend files from web/dist to server/static"
    cp -r web/dist/* server/static/
    echo "📁 Files in server/static:"
    ls -la server/static/
else
    echo "❌ No frontend dist files found"
    echo "📁 Contents of web directory:"
    ls -la web/ || echo "web directory not found"
fi

echo "✅ Build complete!"
