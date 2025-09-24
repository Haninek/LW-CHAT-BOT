# 🚂 Railway Deployment Guide

## Quick Deploy to Railway

This UW Wizard project is **Railway-ready**! Just push to GitHub and deploy.

### 📋 Prerequisites
- GitHub account
- Railway account (free)

### 🚀 One-Click Deploy

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Railway deployment setup"
   git push origin main
   ```

2. **Deploy on Railway**:
   - Go to [Railway.app](https://railway.app)
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Railway will automatically detect and deploy!

### 🔧 Configuration Files

This project includes all necessary Railway config files:

- **`railway.json`** - Railway deployment settings
- **`nixpacks.toml`** - Build configuration (Python 3.11 + Node.js 20)
- **`Procfile`** - Process management
- **`server/requirements.txt`** - Python dependencies (updated with aiohttp)

### 🌐 What Railway Does Automatically

1. **Detects** Python + Node.js project
2. **Installs** Python 3.11 and Node.js 20
3. **Runs** `pip install -r server/requirements.txt`
4. **Runs** `npm install && npm run build` in web directory
5. **Builds** frontend and copies to server/static
6. **Starts** FastAPI server on assigned PORT
7. **Provides** PostgreSQL database (optional)

### 📊 Environment Variables

Railway automatically provides:
- `PORT` - Assigned port
- `DATABASE_URL` - PostgreSQL connection (if database added)

Optional variables you can set:
```bash
DEBUG=false                    # Production mode
OPENAI_API_KEY=sk-...         # AI features
AWS_ACCESS_KEY_ID=AKIA...     # File storage
AWS_SECRET_ACCESS_KEY=...     # File storage
DOCUSIGN_WEBHOOK_SECRET=...   # E-signatures
CHERRY_API_KEY=...            # SMS
```

### 🏗️ Architecture

**Production Setup**:
- Backend: FastAPI server (Python 3.11)
- Frontend: React built into static files
- Database: PostgreSQL (Railway managed)
- Storage: Local filesystem (upgradeable to S3)
- Cache: Memory-based (upgradeable to Redis)

**Endpoints**:
- `/` - Frontend React app
- `/api/*` - Backend API
- `/docs` - API documentation (if DEBUG=true)

### 🔄 Development vs Production

| Feature | Development | Production (Railway) |
|---------|-------------|---------------------|
| Database | SQLite | PostgreSQL |
| Cache | Memory | Memory/Redis |
| Static Files | Vite dev server | Served by FastAPI |
| Debug Mode | ON | OFF |
| Hot Reload | ON | OFF |

### 🛠️ Local Testing Before Deploy

Run the deployment script to test locally:

```bash
python deploy.py
```

This will:
- ✅ Create required directories
- ✅ Install all dependencies  
- ✅ Build frontend
- ✅ Verify everything works

### 🚨 Troubleshooting

**Build Fails?**
- Check that `server/requirements.txt` includes all dependencies
- Verify `web/package.json` is valid
- Ensure Python 3.11+ compatible code

**App Won't Start?**
- Verify `server/main.py` exists
- Check environment variables in Railway dashboard
- Review Railway build logs

**Database Issues?**
- Add PostgreSQL service in Railway
- `DATABASE_URL` will be auto-provided
- App falls back to SQLite if not available

### 🎯 Success Indicators

✅ **Railway Build Success**: Green checkmark in Railway dashboard  
✅ **Health Check**: `/api/healthz` returns 200  
✅ **Frontend**: React app loads at root URL  
✅ **API**: `/docs` shows interactive API documentation  

### 📞 Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Project Issues**: Check Railway logs in dashboard
- **Local Issues**: Run `python deploy.py` to diagnose

---

**🎉 That's it! Your UW Wizard is now live on Railway!**
