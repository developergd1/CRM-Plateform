# 🏢 Growth India CRM & Employee Platform

Complete Enterprise CRM, Client Management, and Employee Operations Platform built with Next.js, TypeScript, Tailwind CSS, Prisma ORM, and SQLite.

---

## 🚀 Quick Start Guide

### 1. One-Time Setup (Setup Instructions)

```powershell
# Dependencies install karein
npm install

# Database generate aur push karein
npm run prisma:generate
npm run prisma:push

# Clean production administrator seed karein
npm run prisma:seed
```

---

## 💻 Server Run Karne Ke Commands (Commands to Start Server)

### 🔹 Local Development Server
1. Terminal me command run karein:
   ```powershell
   npm run dev
   ```
2. Portals access karein:
   - 👥 **Client & Employee Portal:** [`http://localhost:3000`](http://localhost:3000)
   - 👑 **Admin Console Gateway:** [`http://localhost:3000/growthIndia`](http://localhost:3000/growthIndia)

---

## 🔑 Platform Access & Credentials

### 🛡️ Platform Administrator Portal (`/growthIndia`)
* **URL:** `http://localhost:3000/growthIndia`
* **Email / Employee ID:** `admin@growthindia.in` / `GI-EMP-000001`
* **Password:** `Admin@123`
* **Privileges:** Client Onboarding, Employee Management, Auto ID & Credential Generation, Block / Unblock Control, Security Audit Logs.

### 🏢 Client & Employee Portal (`/`)
* **URL:** `http://localhost:3000/`
* **Access:** Clients & Employees dynamically created and onboarded via the Administrator Console.

---

## 🛠️ NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Local development server start karta hai (`localhost:3000`) |
| `npm run build` | Next.js production build test karta hai |
| `npm run start` | Production server start karta hai |
| `npm run prisma:generate` | Prisma client generate karta hai |
| `npm run prisma:push` | Database schema synchronize karta hai |
| `npm run prisma:seed` | Official clean database seed initialize karta hai |

---

## 🔒 Security & Architecture Features
* **Isolated Portals:** Public portal (`/`) and Admin Console (`/growthIndia`) have separated authentication gateways.
* **Role-Based Access Control (RBAC):** `ADMIN`, `CLIENT`, `EMPLOYEE` isolation.
* **Audit Trail:** Immutable logging of block/unblock actions, password updates, and credential assignments.
