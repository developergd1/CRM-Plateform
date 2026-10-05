# 🏢 Growth India — Enterprise Platform

Complete Enterprise Client Management System (CMS), Human Resources & Payroll Management (HRM), and Workforce Operations Platform built with Next.js, TypeScript, Tailwind CSS, Prisma ORM, and MongoDB Atlas.

---

## ☁️ Render Deployment Guide (Deploy on Render)

### 1. Render Dashboard Setup:
1. Go to [Render Dashboard](https://dashboard.render.com/) aur **New +** -> **Web Service** select karein.
2. Apna GitHub repository connect karein: `developergd1/CRM-Plateform`
3. Settings enter karein:
   - **Name:** `growth-india-platform`
   - **Region:** Singapore / Oregon / Frankfurt
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm run start`
   - **Plan:** Free / Starter

### 2. Environment Variables in Render:
Render ke **Environment** tab me ye variables add karein:

| Key | Value / Example |
| :--- | :--- |
| `DATABASE_URL` | `mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/growth_india_crm?retryWrites=true&w=majority` |
| `JWT_SECRET` | `growth-india-secure-jwt-secret-key-2026-production` |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_NAME` | `Growth India Platform` |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` |

---

## ⚡ Vercel Deployment Guide (Deploy on Vercel)

1. [Vercel Dashboard](https://vercel.com/dashboard) me jaakar **Add New...** -> **Project** select karein.
2. `developergd1/CRM-Plateform` repository import karein.
3. Framework Preset: **Next.js** (automatically detected via `vercel.json`).
4. **Environment Variables** configure karein:
   - `DATABASE_URL`: Aapka MongoDB connection string.
   - `JWT_SECRET`: Secret key.
   - `NODE_ENV`: `production`
5. Click **Deploy**. Vercel will automatically build and deploy the project with zero configuration.

---

## 🚀 Local Setup Guide

1. Clone & Install:
```powershell
git clone https://github.com/developergd1/CRM-Plateform.git
cd CRM-Plateform
npm install
```

2. Generate Prisma Client:
```powershell
npx prisma generate
```

3. Run Development Server:
```powershell
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.
