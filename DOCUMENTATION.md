# CALC - Brutalist Debt & Expense Tracker

A monochrome, brutalist-styled web application for tracking personal expenses and friend debts with ASCII kaomoji easter eggs. Uses Firebase Realtime Database for persistent cross-device storage.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Data Models](#data-models)
- [Firebase Schema](#firebase-schema)
- [Components](#components)
- [Hooks](#hooks)
- [Design System](#design-system)
- [Getting Started](#getting-started)
- [Firebase Setup](#firebase-setup)
- [Deployment](#deployment)

---

## Overview

**CALC** is a minimalist expense and debt tracking application with two primary functions:

1. **SPENT Tab** - Track personal expenses and income by day, organized by month
2. **CHRONICLE Tab** - Track money owed to/from friends with settlement functionality

Single-user app with Firebase email/password auth. Data syncs in realtime across devices.

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 19.0.0 |
| Build Tool | Vite | 6.2.0 |
| Styling | Tailwind CSS | 4.1.14 |
| Animation | Motion | 12.23.24 |
| Language | TypeScript | 5.8.2 |
| Backend | Firebase Realtime Database | 12.x |
| Auth | Firebase Auth (email/password) | 12.x |
| Hosting | Vercel | - |

### Font Stack
- **Display**: Space Grotesk (headings, totals)
- **Sans**: Inter (body text)
- **Mono**: JetBrains Mono (labels, amounts, codes)

---

## Architecture

### File Structure

```
calc-iteration2/
├── index.html
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Root component + entry forms
│   ├── types.ts              # TypeScript interfaces
│   ├── index.css             # Global styles + Tailwind config
│   ├── lib/
│   │   └── firebase.ts       # Firebase app init, exports db & auth
│   ├── hooks/
│   │   ├── useAuth.ts        # Auth state + login function
│   │   └── useFinanceData.ts # All CRUD ops via Firebase RTDB
│   └── components/
│       ├── LoginScreen.tsx    # Brutalist login UI
│       ├── SpentTab.tsx       # Expense tracking tab
│       └── ChronicleTab.tsx   # Debt tracking tab + FriendDetail
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Component Hierarchy

```
App
├── LoginScreen (if not authenticated)
├── Import Prompt (if localStorage data found)
├── Theme Toggle
├── SPENT Tab → SpentTab component
│   └── Day groups with expand/collapse
├── CHRONICLE Tab → ChronicleTab component
│   ├── Friend Grid (list view)
│   └── FriendDetail (detail view)
├── SpendEntryForm (bottom sheet, inline in App.tsx)
├── DebtEntryForm (bottom sheet, inline in App.tsx)
├── Floating Action Button (FAB)
└── Undo Toast + Fleeting Kaomoji overlays
```

### Data Flow

```
User Action → App handler → pushToUndo() → Firebase write
                                              ↓
Firebase RTDB ← onValue listener → useFinanceData hook → React state → UI
```

All data mutations go through Firebase. The `onValue` realtime listener automatically updates the UI on any device when data changes.

---

## Features

### 1. Expense Tracking (SPENT Tab)

- **Daily Grouping**: Expenses grouped by date, sorted newest first
- **Monthly Totals**: Auto-calculated sum for current month
- **Entry Types**: `SPENT` (adds to total) and `EARNED` (subtracts from total)
- **Tags**: Optional categorization via tags
- **Expand/Collapse**: Click day headers to show/hide entries
- **Edit**: Tap any entry to edit inline
- **Delete**: Right-click entry for deletion with confirmation

### 2. Debt Tracking (CHRONICLE Tab)

- **Friend Management**: Auto-creates friend entries when adding transactions
- **Balance Calculation**: Real-time balance per friend
  - Positive: They owe you
  - Negative: You owe them
- **Sorting Modes**: Toggle between NAME, AMOUNT, RECENT
- **Detail View**: Click friend card to see all transactions
- **Settlement**: Mark individual debts as settled (strike-through)
- **Direction Tracking**: `LENT` (they owe you) vs `PAID` (you owe them)

### 3. Undo System

- In-memory stack of last 20 states
- On undo, writes previous state back to Firebase
- Shows toast notification after destructive actions
- One-click undo available for 4 seconds

### 4. Theme System

- **Light Mode**: Warm off-white (#EFECE7) with black text
- **Dark Mode**: Dark charcoal (#151515) with cream text
- Persisted to localStorage (theme only — data is in Firebase)

### 5. Cross-Device Persistence

- All data stored in Firebase Realtime Database
- Realtime sync via `onValue` listener
- On first login, detects localStorage data and offers import
- Legacy migration from `calc_v1` format supported during import

### 6. Authentication

- Firebase email/password auth
- Single user — no signup flow
- Brutalist login screen with kaomoji

### 7. Kaomoji Easter Eggs

| Key | Kaomoji | Trigger |
|-----|---------|---------|
| LOAD | `(=^･ω･^=)` | App load |
| OWES_LOT | `(╬ಠ益ಠ)` | Balance > 5000 |
| YOU_OWE_LOT | `(´；ω；\`)` | Balance < -5000 |
| NET_ZERO | `(￣▽￣)ノ` | Balanced state |
| CONFIRM | `( •_•)>⌐■-■` / `(⌐■_■)` | On confirm actions |
| SETTLE | `(ᵔᴥᵔ)` | Settlement complete |
| EMPTY | `(´• ω •\`)` | No entries |
| ERROR | `(¬_¬)` | Error state |
| DELETE | `(╯°□°）╯︵ ┻━┻` | Deletion confirm |

---

## Data Models

### SpendEntry

```typescript
interface SpendEntry {
  id: string;           // UUID
  amount: number;       // Numeric value
  note: string;         // Description
  tag?: string;         // Optional category
  date: number;         // Unix timestamp
  type: 'SPENT' | 'EARNED';
}
```

### DebtTransaction

```typescript
interface DebtTransaction {
  id: string;           // UUID
  friendName: string;   // Friend identifier
  amountRaw: string;    // Display string (e.g., "850 INR")
  amountValue: number;  // Numeric value for calculations
  note: string;         // Description/context
  tag?: string;         // Optional category
  date: number;         // Unix timestamp
  direction: 'LENT' | 'PAID';
  settled: boolean;     // Settlement status
}
```

### Friend

```typescript
interface Friend {
  name: string;         // Unique identifier
  lastActive: number;   // Unix timestamp of last transaction
}
```

### AppState

```typescript
interface AppState {
  debtTransactions: DebtTransaction[];
  spendEntries: SpendEntry[];
  friends: Friend[];
  sortType: SortType;
}
```

---

## Firebase Schema

Data is stored under `users/{uid}/`:

```
users/
  {uid}/
    spendEntries/
      {entryId}/          → SpendEntry object
    debtTransactions/
      {txId}/             → DebtTransaction object
    friends/
      {friendKey}/        → Friend object (key = sanitized name)
    preferences/
      sortType            → 'NAME' | 'AMOUNT' | 'RECENT'
```

### Security Rules

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

---

## Components

### App (src/App.tsx)
Root component. Manages auth gate, tab switching, sheet state, undo system, kaomoji animations. Contains SpendEntryForm and DebtEntryForm inline.

### LoginScreen (src/components/LoginScreen.tsx)
Brutalist login form. Props: `onLogin`, `error`.

### SpentTab (src/components/SpentTab.tsx)
Renders expense list grouped by day. Props: `monthTotal`, `spendByDay`, `expandedDays`, `setExpandedDays`, `onEdit`, `onDelete`.

### ChronicleTab (src/components/ChronicleTab.tsx)
Renders friend grid or detail view. Contains `FriendDetail` sub-component. Props: `sortedFriends`, `debtTransactions`, `sortType`, `getFriendBalance`, `onSortCycle`, `viewState`, `onViewDetail`, `onBack`, `onSettle`, `onDelete`, `onEdit`.

### SpendEntryForm (inline in App.tsx)
Bottom sheet form for adding/editing spend entries.

### DebtEntryForm (inline in App.tsx)
Bottom sheet form for adding/editing debt transactions.

---

## Hooks

### useAuth (src/hooks/useAuth.ts)
Returns `{ user, loading, login, error }`. Wraps Firebase `onAuthStateChanged` and `signInWithEmailAndPassword`.

### useFinanceData (src/hooks/useFinanceData.ts)
Takes `uid: string | null`. Returns all data arrays + CRUD functions. Subscribes to Firebase with `onValue` for realtime updates. Detects localStorage data for import.

**Returned API:**
- `dataLoaded` — boolean
- `spendEntries`, `debtTransactions`, `friends`, `sortType` — current data
- `needsImport` — true if localStorage has data to import
- `importLocalData()` — imports localStorage data to Firebase
- `addSpend(entry)`, `updateSpend(id, entry)`, `deleteSpend(id)`
- `addDebt(t)`, `updateDebt(id, t)`, `deleteDebt(id)`, `settleDebt(id)`
- `updateSortType(sort)`

---

## Design System

### Color Palette

**Light Mode:**
- Background: `#EFECE7` (warm off-white)
- Ink: `#000000` (pure black)

**Dark Mode:**
- Background: `#151515` (dark charcoal)
- Ink: `#F5F2ED` (warm cream)

### Typography Scale

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Month Total | Space Grotesk | 900 | 3rem |
| Friend Name | Space Grotesk | 800 | - |
| Amount Input | Space Grotesk | 900 | 4.5rem |
| Day Header | Space Grotesk | - | 0.875rem |
| Entry Amount | JetBrains Mono | 700 | - |
| Labels | JetBrains Mono | 700 | 0.625rem |
| Buttons | Space Grotesk | 700 | - |

### Utility Classes

```css
.brutal-box     /* Sharp-edged bordered box */
.notebook-row   /* Horizontal row with border-bottom */
.ascii-torn     /* ASCII art divider for sheets */
.grid-overlay   /* Faint graph paper background */
.strike-through /* Line-through + opacity for settled items */
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Firebase project with Realtime Database + Auth enabled

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env.local` and fill in your Firebase config:

```bash
cp .env.example .env.local
```

### Development

```bash
npm run dev
# App runs at http://localhost:3000
```

### Production Build

```bash
npm run build      # Builds to dist/
npm run preview    # Preview production build locally
```

### Type Checking

```bash
npm run lint       # TypeScript type checking (tsc --noEmit)
```

---

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → Email/Password provider
4. Create your user account in Firebase Console → Authentication → Users → Add user
5. Enable **Realtime Database** → Create database → Start in locked mode
6. Set security rules (see [Firebase Schema](#firebase-schema) section)
7. Go to Project Settings → General → Your apps → Add web app
8. Copy the config values to `.env.local`

---

## Deployment

### Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Add all `VITE_FIREBASE_*` environment variables in Vercel dashboard
4. Deploy — Vercel auto-detects Vite

### Environment Variables (Vercel Dashboard)

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

---

## Appendix: Interactions

| Action | Trigger |
|--------|---------|
| Add Entry | Tap FAB button |
| Edit Entry | Tap entry row |
| Delete Entry | Right-click entry |
| Toggle Day | Tap day header |
| Sort Friends | Tap SORT button |
| View Friend Detail | Tap friend card |
| Return to List | Tap ← BACK |
| Settle Debt | Tap checkbox in detail view |
| Toggle Theme | Tap theme button |
| Undo | Tap UNDO in toast |

---

*Documentation for calc-iteration2 — Firebase Realtime Database backend*
