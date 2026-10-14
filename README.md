# FitTrack

Native iOS app + shareable web PWA (coach access).

## iOS (SwiftUI)

```bash
open FitTrack/FitTrack.xcodeproj
```

See details in the Xcode project under `FitTrack/`.

## Web (coach + Home Screen app)

```bash
cd web
cp .env.example .env.local   # add Supabase keys
npm install
npm run dev
```

Full setup: **[web/README.md](web/README.md)**

Flow:
1. You create an account and invite your coach
2. Coach accepts the link and can view your stats (read-only)
3. Both of you can train in the same web app
4. On iPhone: Safari → Share → **Add to Home Screen**
