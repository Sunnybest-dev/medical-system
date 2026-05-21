# Quick Deployment Guide - Render & Railway

## Option 1: Deploy on Render (Recommended)

### Step 1: Prepare Your Code
1. Upload your project to GitHub (create a new repository)
2. Make sure `render.yaml` and `requirements_simple.txt` are in your project root

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign up with GitHub
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render will auto-detect Django and use the `render.yaml` config
5. Click "Create Web Service"
6. Your app will be live at: `https://your-app-name.onrender.com`

**No API keys needed!** The medical APIs (FDA, RxNav) are free and public.

---

## Option 2: Deploy on Railway

### Step 1: Prepare Your Code
1. Upload your project to GitHub
2. Make sure `railway.json` and `requirements_simple.txt` are in your project root

### Step 2: Deploy on Railway
1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-deploy using the `railway.json` config
5. Your app will be live at: `https://your-app-name.up.railway.app`

---

## Quick Setup Commands

If you want to test locally first:

```bash
# Install dependencies
pip install -r requirements_simple.txt

# Run migrations
python manage.py migrate

# Create admin user
python manage.py createsuperuser

# Start server
python manage.py runserver
```

## Features Included

✅ **Symptom Checker** - AI-powered symptom analysis
✅ **Drug Database** - Real-time FDA drug information
✅ **User Management** - Registration, login, profiles
✅ **Admin Panel** - Manage symptoms, drugs, rules
✅ **Medical Reports** - Track user consultations
✅ **API Integration** - FDA & RxNav APIs (no keys required)
✅ **Responsive Design** - Works on mobile & desktop

## Default Login

- **Admin:** admin@medical.com / admin123
- **User:** Create new account via registration

## Live Demo URLs

After deployment, your medical system will be accessible at:
- **Render:** `https://your-app-name.onrender.com`
- **Railway:** `https://your-app-name.up.railway.app`

Both platforms provide free hosting with automatic HTTPS and global CDN!