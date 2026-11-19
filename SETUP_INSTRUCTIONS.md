# 🚀 Quick Setup Instructions - AromaHerbal

## For Local Development (Current Branch)

### Step 1: Start Backend (Terminal 1)
```powershell
cd backend
npm run dev
```

**Expected output:**
```
---------------------------------------
 Aroma Workflow Backend
---------------------------------------
Environment: development
API:         http://localhost:5000/api
Health:      http://localhost:5000/api/health
---------------------------------------
```

### Step 2: Start Frontend (Terminal 2)
```powershell
cd frontend
npm run dev
```

**Expected output:**
```
Local:   http://127.0.0.1:5174
```

### Step 3: Open App in Browser
Navigate to: **http://127.0.0.1:5174**

✅ **You're good to go!**

---

## What's Configured

### Frontend Environment Files Created
- ✅ `frontend/.env.development` → Points to local backend (http://localhost:5000/api)
- ✅ `frontend/.env.production` → Points to deployed backend (https://aromaherbal.onrender.com/api)

### Backend CORS Updated
- ✅ `backend/src/app.js` → Now accepts requests from both local and deployed origins

### Vite Configuration
- ✅ `frontend/vite.config.js` → Automatically loads environment-specific .env files

---

## How It Works

**During Development (npm run dev):**
- Frontend automatically loads `.env.development`
- `VITE_API_BASE_URL=http://localhost:5000/api`
- All API calls go to your local backend

**During Build (npm run build):**
- Frontend automatically loads `.env.production`
- `VITE_API_BASE_URL=https://aromaherbal.onrender.com/api`
- Built bundle uses deployed backend on Render

---

## Merge to Main (No Changes Needed)

When you're ready to merge:
1. Push your branch
2. Create a pull request
3. Merge to main
4. CI/CD automatically:
   - Runs `npm run build` (loads `.env.production`)
   - Deploys to Render
   - Frontend connects to deployed backend ✅

---

## Database Note

Both environments use the **same MongoDB database** in the cloud:
```
MONGODB_URI=mongodb+srv://aromaherbal12_db_user:fTKTo7Eh5Xrg7sQ2@cluster0.ll2rzam.mongodb.net/aroma-workflow
```

This is intentional - all data is shared between local dev and production.

---

## Troubleshooting

### ❌ "CORS policy: origin not allowed"
**Solution:** Backend wasn't restarted after CORS changes
```powershell
# Kill backend (Ctrl+C) and restart
cd backend
npm run dev
```

### ❌ "Cannot reach http://localhost:5000/api"
**Solution:** Backend not running
- Check Terminal 1 - is `npm run dev` running?
- If not, start it: `cd backend && npm run dev`

### ❌ "Cannot reach database"
**Solution:** MongoDB Atlas connectivity issue
- Check `.env` has correct `MONGODB_URI`
- Verify your IP is whitelisted in MongoDB Atlas
- Check internet connection

---

## Files Modified

1. ✅ `frontend/.env.development` - NEW
2. ✅ `frontend/.env.production` - NEW
3. ✅ `frontend/vite.config.js` - UPDATED (added comments)
4. ✅ `backend/src/app.js` - UPDATED (multi-origin CORS)

---

## Questions?

See `ENVIRONMENT_SETUP.md` for detailed documentation.

**Happy coding!** 🎉
