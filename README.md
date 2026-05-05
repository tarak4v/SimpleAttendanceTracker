# Simple Attendance Tracker

A Next.js app to manage house-help profiles and daily attendance.

## Supabase Integration

This project now stores app data in Supabase.

Data stored in Supabase:
- House helps
- Attendance records

### 1. Create Supabase Tables

Run the SQL in `supabase/schema.sql` inside your Supabase SQL editor.

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your project values:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Note: keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.

### 3. Optional CSV Migration

If you already have local CSV data in the `data/` folder, import it into Supabase with:

```bash
npm run migrate:csv-to-supabase
```

What it imports:
- `data/househelps.csv`
- `data/attendance.csv`
- any monthly files like `data/attendance-2026-05.csv`

The migration uses upserts, so rerunning it is safe.

## Run Locally

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
npm run start
```
