#!/usr/bin/env python3
"""
Railway Deployment Setup Script for UW Wizard
Run this locally before pushing to Railway
"""

import os
import subprocess
import sys

def run_command(cmd, description=""):
    """Run a command and handle errors"""
    print(f"📋 {description}")
    print(f"🔧 Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Error: {result.stderr}")
        return False
    
    print(f"✅ Success: {description}")
    return True

def main():
    print("🚀 UW Wizard - Railway Deployment Setup")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists("server/main.py"):
        print("❌ Error: Please run this script from the project root directory")
        sys.exit(1)
    
    # Create necessary directories
    print("\n📁 Creating required directories...")
    os.makedirs("data/contracts", exist_ok=True)
    os.makedirs("data/uploads", exist_ok=True)
    print("✅ Directories created")
    
    # Build frontend locally to test
    print("\n🏗️ Building frontend...")
    if not run_command("cd web && npm install", "Installing frontend dependencies"):
        sys.exit(1)
    
    if not run_command("cd web && npm run build", "Building frontend for production"):
        sys.exit(1)
    
    # Test backend dependencies
    print("\n🐍 Checking backend dependencies...")
    if not run_command("cd server && pip install -r requirements.txt", "Installing backend dependencies"):
        sys.exit(1)
    
    print("\n🎉 Deployment setup complete!")
    print("\n📝 Next steps:")
    print("1. Commit and push your changes to GitHub")
    print("2. Connect your GitHub repo to Railway")
    print("3. Railway will automatically detect the configuration files:")
    print("   - railway.json (deployment config)")
    print("   - nixpacks.toml (build config)")
    print("   - Procfile (process config)")
    print("\n🔧 Railway will automatically:")
    print("   - Install Python 3.11 and Node.js 20")
    print("   - Install backend dependencies")
    print("   - Build the frontend")
    print("   - Serve the app on the assigned port")
    print("\n🌐 Your app will be available at: https://your-app-name.railway.app")
    print("\n📋 Environment variables to set in Railway (optional):")
    print("   - DEBUG=false (for production)")
    print("   - DATABASE_URL (Railway provides this for PostgreSQL)")
    print("   - OPENAI_API_KEY (for AI features)")
    print("   - AWS credentials (for S3 storage)")

if __name__ == "__main__":
    main()
