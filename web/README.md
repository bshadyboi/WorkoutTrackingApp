# FitTrack Web (PWA)

Shareable training app with login. Athletes log workouts / daily nutrition+sleep. Coaches accept an invite and view athlete stats **read-only**. Add to iPhone Home Screen like an app.

## Setup (about 10 minutes)

### 1. Create a free Supabase project
1. Go to [supabase.com](https://supabase.com) → New project  
2. **Project Settings → API** → copy **Project URL** and **anon public** key  
3. **SQL Editor** → paste and run `supabase/schema.sql`

### 4. Auth settings
**Authentication → Providers → Email** → enable Email  
**Authentication → URL Configuration**:
- Site URL: `http://localhost:3000` (later your Vercel URL)
- Redirect URLs: `http://localhost:3000/auth/callback` and `https://YOUR_DOMAIN/auth/callback`

Optional: turn **off** “Confirm email” while testing so signup works immediately.

### 3. Env file
```bash
cd web
cp .env.example .env.local
```
Fill in:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## How you + coach use it

1. **You** sign up → Home → **Invite** → copy link  
2. Text coach the link  
3. **Coach** opens link → signs up / signs in → Accept invite  
4. Coach opens **Coach** tab → taps your name → sees your sessions, protein, sleep, lift history  
5. Coach can also use **Train** / **Daily** for himself  

### Add to Home Screen (iPhone)
Safari → Share → **Add to Home Screen**

## Deploy (Vercel)
1. Push repo to GitHub  
2. Import `web/` as the root (or set Root Directory to `web`)  
3. Add the same env vars  
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL  
5. Update Supabase Site URL + redirect URLs to match  

## What’s included
- Email/password auth  
- 5-day Upper/Lower workout library (auto-seeded)  
- Live set logging with previous weights  
- Daily nutrition / sleep / steps log  
- Coach invite + read-only athlete dashboard  
- PWA manifest for Home Screen  

Native FitTrack iOS app stays in `/FitTrack` — this web app is the shareable layer.
