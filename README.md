# 🏢 Growth India CRM & Employee Platform

Complete Enterprise CRM, Client Management, and Employee Operations Platform built with Next.js, TypeScript, Tailwind CSS, Prisma ORM, and MongoDB Atlas.

---

## ☁️ Render Deployment Guide (Deploy on Render)

### 1. Render Dashboard Setup:
1. Go to [Render Dashboard](https://dashboard.render.com/) aur **New +** -> **Web Service** select karein.
2. Apna GitHub repository connect karein: `developergd1/CRM-Plateform`
3. Settings enter karein:
   - **Name:** `growth-india-crm` (or any name)
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
| `JWT_SECRET` | `growth-india-crm-secure-jwt-secret-key-2026-production` |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_NAME` | `Growth India CRM & Employee Platform` |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` |

---

## 🚀 Local Quick Start Guide

### 1. One-Time Setup:
```powershell
# Dependencies install karein
npm install

# Database generate karein
npm run prisma:generate

# Clean production administrator seed karein
npm run prisma:seed
```

---

## 💻 Server Run Karne Ke Commands

### 🔹 Local Development Server:
```powershell
npm run dev
```

* 👥 **Client & Employee Portal:** [`http://localhost:3000`](http://localhost:3000)
* 👑 **Admin Console Gateway:** [`http://localhost:3000/growthIndia`](http://localhost:3000/growthIndia)

---

## 🔑 Default Credentials

### 🛡️ Platform Administrator Portal (`/growthIndia`):
* **Email / ID:** `admin@growthindia.in` / `GI-EMP-000001`
* **Password:** `Admin@123`
