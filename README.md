# CALC

Brutalist expense & debt tracker. Personal use, cross-device sync via Firebase.

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in Firebase config values
npm run dev
```

## Firebase

1. Create project at [console.firebase.google.com](https://console.firebase.google.com/)
2. Enable Auth (Email/Password) + Realtime Database
3. Add your user in Auth → Users
4. Set DB rules: read/write locked to `auth.uid`
5. Copy web app config to `.env.local`

## Deploy to Vercel

Push to GitHub → Import in Vercel → Add `VITE_FIREBASE_*` env vars → Deploy.

See [DOCUMENTATION.md](DOCUMENTATION.md) for full architecture docs.
