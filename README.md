# SplitMate 

A beautiful, full-stack expense tracking and settlement application designed for roommates and groups. SplitMate handles everything from tracking daily expenses and scanning receipts to calculating complex group debts and sending automated email reminders.

## 🚀 Features

- **Room Management:** Create dedicated rooms for different groups (e.g., "Apartment 4B", "Goa Trip") and invite members via shareable codes.
- **Advanced Expense Tracking:** Add expenses, split them equally or selectively among specific members, and attach receipt photos.
- **Receipt Scanning (OCR):** Upload a photo of a receipt and the app automatically extracts the amount and title using browser-side OCR.
- **Debt Simplification Engine:** An algorithm that calculates the absolute minimum number of transactions required to settle all debts in a group.
- **Recurring Expenses:** Automate weekly or monthly bills (like Rent or WiFi) so they log themselves.
- **Budget Alerts:** Set a monthly spending limit for a room and get visual warnings when approaching or exceeding the budget.
- **Analytics & Reporting:** View beautiful charts breaking down spending by category, monthly trends, and member contributions. Export data to PDF or Excel.
- **User Profiles & Security:** Upload custom avatars, manage personal details, and utilize a secure "Forgot Password" flow with real email delivery.
- **Progressive Web App (PWA):** Installable on mobile devices with a sleek, dark-mode supported, mobile-first design.

## 🛠 Tech Stack

- **Frontend:** React + Vite, Tailwind CSS, React Router, Chart.js, Tesseract.js (OCR)
- **Backend:** Node.js + Express, Prisma (ORM), PostgreSQL
- **Security:** JWT Authentication, bcrypt password hashing
- **Integrations:** Cloudinary (persistent image storage), Nodemailer (automated emails)

---

## 💻 Local Development Setup

### 1. Set up PostgreSQL
Create a local database (or use a hosted one like Neon/Supabase):
```bash
createdb splitmate
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
```
Edit your `.env` file to include your database connection string and a JWT secret.

Push the schema and start the server:
```bash
npx prisma db push
npm run dev
```
The API runs at `http://localhost:5000`. 

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
The app runs at `http://localhost:5173`. 

---

## ☁️ Cloud Deployment Ready

SplitMate is structurally prepared for standard cloud deployments (like Vercel for the frontend and Render for the backend). 

**Production Configurations Supported:**
- **Connection Pooling:** Fully supports Supabase/Neon connection poolers for serverless scalability (via `DATABASE_URL` and `DIRECT_URL`).
- **Cloudinary:** Add your `CLOUDINARY_URL` to `.env` to automatically switch from local disk storage to persistent cloud image hosting.
- **SMTP Emails:** Add your SMTP credentials (like Resend or SendGrid) to send real password reset emails instead of local terminal logs.

See `backend/.env.example` for all production configuration options.
