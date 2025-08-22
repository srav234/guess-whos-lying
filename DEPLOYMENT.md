# 🚀 Deployment Guide for Lying Game

This guide will walk you through deploying your social deduction game to the web using:
- **Frontend (React) → Vercel**
- **Backend (Express + Socket.io) → Render**

## 📋 Prerequisites

1. ✅ GitHub repository with your code
2. ✅ Vercel account (free at [vercel.com](https://vercel.com))
3. ✅ Render account (free at [render.com](https://render.com))
4. ✅ Node.js installed locally for testing

## 🔧 Step 1: Deploy Backend to Render

### 1.1 Push Your Code to GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 1.2 Deploy to Render

1. **Go to [render.com](https://render.com) and sign up/login**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name**: `lying-game-backend` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

5. **Add Environment Variables:**
   - **Key**: `NODE_ENV` → **Value**: `production`
   - **Key**: `PORT` → **Value**: `10000`
   - **Key**: `FRONTEND_URL` → **Value**: `https://your-frontend-domain.vercel.app` (we'll get this after deploying frontend)

6. **Click "Create Web Service"**
7. **Wait for deployment to complete**
8. **Copy your Render URL** (e.g., `https://lying-game-backend.onrender.com`)

## 🌐 Step 2: Deploy Frontend to Vercel

### 2.1 Deploy to Vercel

1. **Go to [vercel.com](https://vercel.com) and sign up/login**
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project:**
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

5. **Add Environment Variables:**
   - **Key**: `REACT_APP_BACKEND_URL` → **Value**: Your Render backend URL (e.g., `https://lying-game-backend.onrender.com`)

6. **Click "Deploy"**
7. **Wait for deployment to complete**
8. **Copy your Vercel URL** (e.g., `https://lying-game.vercel.app`)

### 2.2 Update Backend with Frontend URL

1. **Go back to Render dashboard**
2. **Find your backend service**
3. **Go to "Environment" tab**
4. **Update the `FRONTEND_URL` variable** with your Vercel frontend URL
5. **Redeploy the service**

## 🔄 Step 3: Test Your Deployment

1. **Open your Vercel frontend URL**
2. **Create a new game room**
3. **Test the game functionality**
4. **Verify Socket.io connections work**

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure `FRONTEND_URL` is set correctly in Render
2. **Socket Connection Failed**: Check that your backend URL is correct in Vercel environment variables
3. **Build Failures**: Ensure all dependencies are in `package.json`

### Debug Steps:

1. **Check Render logs** for backend errors
2. **Check Vercel build logs** for frontend errors
3. **Verify environment variables** are set correctly
4. **Test locally** with production URLs

## 📱 Custom Domain (Optional)

### Vercel Custom Domain:
1. **Go to your Vercel project settings**
2. **Click "Domains"**
3. **Add your custom domain**
4. **Update DNS records as instructed**

### Render Custom Domain:
1. **Go to your Render service settings**
2. **Click "Custom Domains"**
3. **Add your custom domain**
4. **Update DNS records as instructed**

## 🔒 Security Notes

- ✅ Environment variables are encrypted
- ✅ CORS is properly configured
- ✅ Health check endpoint is available
- ✅ Production builds are optimized

## 📊 Monitoring

- **Vercel**: Built-in analytics and performance monitoring
- **Render**: Built-in logs and uptime monitoring
- **Consider**: Adding error tracking (Sentry, LogRocket)

## 🎉 You're Live!

Your social deduction game is now accessible worldwide! Share the link with friends and start playing.

---

**Need Help?** Check the troubleshooting section or refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Socket.io Documentation](https://socket.io/docs)
