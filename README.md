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

## ⚡ Vercel Deployment Guide (Deploy on Vercel)

1. [Vercel Dashboard](https://vercel.com/dashboard) me jaakar **Add New...** -> **Project** select karein.
2. `developergd1/CRM-Plateform` repository import karein.
3. Framework Preset: **Next.js** (automatically detected via `vercel.json`).
4. **Environment Variables** configure karein:
   - `DATABASE_URL`: Aapka MongoDB connection string.
   - `JWT_SECRET`: Secret key (e.g. `growth-india-crm-secure-jwt-secret-key-2026-production`).
   - `NODE_ENV`: `production`
5. Click **Deploy**. Vercel will automatically build and deploy the project with zero configuration.

---

## 🚀 Dusre Laptop Pe Chalane Ka Asaan Tarika (Other Laptop Setup)

Dusre laptop par project open karke chalane ke liye sirf ye simple steps follow karein:

### Step 1: Repository Clone Karein
```powershell
git clone https://github.com/developergd1/CRM-Plateform.git
cd CRM-Plateform
```

### Step 2: Environment File Banayein
Project root me `.env.example` file ko copy karke `.env` banayein (isme already live MongoDB Atlas database connection configured hai, jisse saara data aur users automatically load ho jayenge):
```powershell
# Windows PowerShell me:
copy .env.example .env

# Mac / Linux terminal me:
cp .env.example .env
```

### Step 3: Dependencies Install Karein
```powershell
npm install
```
*(Note: `npm install` chalate hi Prisma Client automatically generate ho jayega)*

### Step 4: Server Start Karein
```powershell
npm run dev
```
Aur browser me open karein:
* 👥 **Client & Employee Portal:** [`http://localhost:3000`](http://localhost:3000)
* 👑 **Admin Console Gateway:** [`http://localhost:3000/growthIndia`](http://localhost:3000/growthIndia)

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
* **Email / ID:** `admin@growthindia.co` / `GI-EMP-000001`
* **Password:** `Admin@123`
