# FitMemory Deployment Guide (Vercel)

## 1) Prerequisites
- MongoDB Atlas cluster (recommended for Vercel)
- GitHub repository with this project

## 2) Environment Variables
Create a `.env.local` for local dev and configure the same in Vercel Project Settings → Environment Variables.

Required:
- MONGODB_URI = your MongoDB Atlas connection string (e.g. mongodb+srv://.../fitmemory?retryWrites=true&w=majority)
- NEXT_PUBLIC_SITE_URL = your production URL (e.g. https://your-app.vercel.app)

Optional:
- OPENAI_API_KEY (if used)

## 3) Local Development
```bash
pnpm i   # or npm i / yarn
pnpm dev # runs next dev
```

## 4) GitHub → Vercel
1. Push your code to GitHub (main branch)
2. In Vercel, import the repository
3. Set the Environment Variables listed above
4. Deploy

No `next export` is required (App Router + API Routes run on serverless functions).

## 5) MongoDB Notes
- The app reads `process.env.MONGODB_URI`. In production this must be set (localhost is not used in prod).
- The connection uses retries and serverless-safe settings.

## 6) Backup/Import/Export
- Backup endpoint: `GET /api/backup`
- Export all data: `GET /api/export`
- Import data: `POST /api/import` with JSON body

## 7) Smoke Tests After Deploy
- Open `/features` to verify services
- Check `/api/streak-status`, `/api/analytics`, `/api/month-streak`, `/api/goals`, `/api/tomorrow-workout`

## 8) Common Issues
- TopologyDescription Unknown / logicalSessionTimeoutMinutes null: ensure `MONGODB_URI` is set to Atlas (not localhost) in Vercel.
- Hydration mismatches: dynamic time/date is rendered client-side only.
