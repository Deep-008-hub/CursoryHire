# CursoryHire — AI-Powered Recruitment Platform

## Stack
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: FastAPI + Python
- **AI**: Google Gemini 2.5 Flash
- **Database**: Supabase (PostgreSQL)
- **OTP**: Email (Gmail SMTP) + SMS (Twilio)

## Quick Start (Windows)

### 1. Clone & setup backend
```bash
cd cursoryhire/backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment
Copy `.env.example` to `.env` and fill in your keys.

### 3. Setup database
- Go to https://supabase.com → New project
- Open SQL Editor → paste contents of `backend/db/schema.sql` → Run

### 4. Start backend
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

### 5. Start frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173
