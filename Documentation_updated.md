# CALC - Documentation

A brutalist personal finance tracker with expense tracking, study session logging, and friend debt management. Cross-device sync via Firebase Realtime Database.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Data Models](#data-models)
- [Firebase Schema](#firebase-schema)
- [Firebase Setup](#firebase-setup)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Components](#components)
- [Hooks](#hooks)
- [Design System](#design-system)
- [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your Firebase config values
# (see Firebase Setup section)

# Start development server
npm run dev
```

App runs at `http://localhost:3000`

---

## Features

### SPENT Tab — Expense Tracking

- **Daily grouping**: Entries grouped by date, newest first
- **Monthly totals**: Auto-calculated sum for current month
- **Entry types**: `SPENT` (adds to total) and `EARNED` (subtracts)
- **Tags**: Optional categorization (e.g., "eat-out", "snacks", "misc")
- **Expand/collapse**: Tap day headers to show/hide entries
- **Sparkline chart**: Last 7 days spending visualization
- **Budget tracking**: Progressive daily/weekly/monthly budget goals
- **Archive view**: Past months grouped by month-year

### FOCUS Tab — Study Session Tracking

- **Live timer**: Real-time session duration display
- **Subject tracking**: Log study sessions by subject
- **Distraction counter**: Track interruptions during sessions
- **Daily goal**: Set daily study time target (in minutes)
- **Custom subjects**: Define your own subject list
- **Pause/resume**: Session pause functionality
- **Today pill**: Top-right display showing daily progress vs goal

### ANALYTICS Tab — Spending Analytics

- **Tag breakdown**: Pie/bar chart of spending by tag
- **Monthly totals**: Current month spending summary
- **Color-coded tags**: Vibrant colors for each category

### CHRONICLE Tab — Friend Debt Tracking

- **Friend management**: Auto-creates friends from transactions
- **Balance calculation**: Real-time balance per friend
  - Positive: They owe you (LENT)
  - Negative: You owe them (PAID)
- **Sorting modes**: NAME, AMOUNT, RECENT
- **Detail view**: All transactions per friend
- **Settlement**: Mark debts as settled (strike-through)
- **Direction tracking**: `LENT` vs `PAID`

### Settings (CFG Button)

- **Monthly budget**: Set spending limit
- **Custom tags**: Define expense categories
- **Daily study goal**: Minutes per day target
- **Custom subjects**: Study subject list
- **Grid style**: Lines or dots background pattern

### Theme System

- **Light mode**: Warm off-white with dark text
- **Dark mode**: Dark charcoal with light text
- Persisted to localStorage

### Undo System

- In-memory stack of last 20 states
- Writes previous state to Firebase on undo
- Toast notification after destructive actions

### Authentication

- Firebase email/password auth
- Single user — no signup flow
- Data locked to authenticated user UID

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 19.0.0 |
| Build Tool | Vite | 6.2.0 |
| Styling | Tailwind CSS | 4.1.14 |
| Animation | Motion | 12.23.24 |
| Language | TypeScript | ~5.8.2 |
| Database | Firebase Realtime Database | 12.x |
| Auth | Firebase Auth | 12.x |
| Icons | lucide-react | 0.546.0 |
| Fonts | Space Grotesk, Inter, JetBrains Mono | Google Fonts |

---

## Project Structure

```
src/
├── main.tsx              # React entry point
├── App.tsx               # Root component, state management, forms
├── index.css             # Global styles, Tailwind config, CSS variables
├── types.ts              # TypeScript interfaces
├── lib/
│   ├── firebase.ts       # Firebase initialization
│   └── sparkline.ts     # Sparkline chart utility
├── hooks/
│   ├── useAuth.ts       # Authentication state + login
│   ├── useFinanceData.ts # Expense/debt CRUD + Firebase sync
│   └── useStudyData.ts  # Study session CRUD + Firebase sync
└── components/
    ├── LoginScreen.tsx  # Authentication screen
    ├── SpentTab.tsx     # Expense tracking tab
    ├── FocusTab.tsx     # Study session tab
    ├── AnalyticsTab.tsx # Spending analytics
    ├── ChronicleTab.tsx # Friend debt tracking
    └── SidebarConfig.tsx # Settings sidebar
```

---

## Architecture

### Component Hierarchy

```
App
├── LoginScreen (if not authenticated)
├── Import Prompt (if localStorage data detected)
├── Branding + Theme Toggle [CFG] [CALC]
├── TodayPill (FOCUS tab only)
├── Tab Content
│   ├── SpentTab
│   ├── FocusTab
│   ├── AnalyticsTab
│   └── ChronicleTab
├── FAB (+) button
├── Back button
├── Tab Bar
├── Sheet (bottom sheet forms)
│   ├── SpendEntryForm
│   ├── StudySessionForm
│   └── DebtEntryForm
├── Undo Toast
├── Fleeting Kaomoji
└── SidebarConfig
```

### Data Flow

```
User Action
    ↓
App handler (e.g., handleAddSpend)
    ↓
pushToUndo() → Save state to undo stack
    ↓
Firebase write (set/ref/update)
    ↓
Firebase Realtime Database
    ↓
onValue listener → React state update
    ↓
UI re-render
```

All data mutations go through Firebase. The `onValue` realtime listener automatically updates UI on any device when data changes.

### Hotkey Bindings

When FOCUS tab is active and no input is focused:
- **Space**: Start/resume session
- **Enter**: Stop session

---

## Data Models

### SpendEntry

```typescript
interface SpendEntry {
  id: string;           // UUID
  amount: number;       // Numeric value (positive for SPENT, negative for EARNED)
  note: string;         // Description
  tag?: string;         // Optional category
  date: number;        // Unix timestamp (ms)
  type: 'SPENT' | 'EARNED';
  linkedDebtId?: string; // Optional link to debt transaction
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
  date: number;        // Unix timestamp (ms)
  direction: 'LENT' | 'PAID';  // They owe you / You owe them
  settled: boolean;    // Settlement status
  linkedSpendId?: string; // Optional link to spend entry
}
```

### StudySession

```typescript
interface StudySession {
  id: string;           // UUID
  subject: string;     // Subject name
  name?: string;       // Optional session name
  note?: string;       // Optional notes
  startedAt: number;   // Unix timestamp (ms)
  endedAt: number;    // Unix timestamp (ms)
  durationMs: number; // Actual study time (ms)
  pausedMs: number;    // Total paused duration (ms)
  distractions: number; // Interruptions count
}
```

### RunningSession

```typescript
interface RunningSession {
  id: string;           // UUID
  subject: string;     // Subject name
  name?: string;       // Optional session name
  note?: string;       // Optional notes
  startedAt: number;   // Unix timestamp (ms)
  pausedAt?: number;  // If paused, timestamp of pause
  pausedMs: number;    // Accumulated paused duration
  distractions: number; // Interruptions count
}
```

### Friend

```typescript
interface Friend {
  name: string;        // Unique identifier (sanitized key)
  lastActive: number;  // Unix timestamp of last transaction
}
```

### App Preferences

```typescript
interface Preferences {
  monthlyBudget?: number;      // Monthly spending limit
  customTags?: string[];       // Expense categories
  dailyStudyGoalMin?: number;   // Daily study target (minutes)
  customSubjects?: string[];   // Study subject list
  sortType?: SortType;        // 'NAME' | 'AMOUNT' | 'RECENT'
}
```

### SortType

```typescript
type SortType = 'NAME' | 'AMOUNT' | 'RECENT';
// - NAME: Alphabetical by friend name
// - AMOUNT: By absolute balance amount
// - RECENT: By last active timestamp
```

---

## Local Storage Import

On first login, the app checks for legacy localStorage data (`calc_v2`). If found, prompts to import to Firebase:

```typescript
const STORAGE_KEY = 'calc_v2';
// Checks if localStorage has spendEntries or debtTransactions
// Shows import prompt if data exists
```

### AppState

The root state interface combining all data:

```typescript
interface AppState {
  debtTransactions: DebtTransaction[];
  spendEntries: SpendEntry[];
  friends: Friend[];
  sortType: SortType;
  studySessions?: StudySession[];
  runningSession?: RunningSession | null;
  preferences?: {
    monthlyBudget?: number;
    customTags?: string[];
    dailyStudyGoalMin?: number;
    customSubjects?: string[];
  };
}
```

### Direction

```typescript
type Direction = 'LENT' | 'PAID';
// - LENT: You lent money (they owe you)
// - PAID: You paid (you owe them)
```

---

## Firebase Schema

Data stored under `users/{uid}/`:

```
users/
  {uid}/
    spendEntries/
      {entryId}/          → SpendEntry object
    debtTransactions/
      {txId}/             → DebtTransaction object
    friends/
      {friendKey}/        → Friend object
    studySessions/
      {sessionId}/        → StudySession object
    runningSession/       → RunningSession object (only one)
    preferences/
      sortType            → 'NAME' | 'AMOUNT' | 'RECENT'
      monthlyBudget       → number
      customTags          → string[]
      dailyStudyGoalMin   → number
      customSubjects      → string[]
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

## Firebase Setup

1. **Create Project**: Go to [Firebase Console](https://console.firebase.google.com/) and create a new project

2. **Enable Authentication**:
   - Build → Authentication → Get Started
   - Sign-in method → Email/Password → Enable
   - No need to enable "Email link" for passwordless

3. **Create User**:
   - Users → Add user
   - Enter your email and a password
   - Note: This is your login credential

4. **Enable Realtime Database**:
   - Build → Realtime Database → Create database
   - Start in **Locked mode** (default)
   - Set rules as shown above

5. **Get Config**:
   - Project Settings (gear icon) → General → Your apps
   - Select web app (</> icon)
   - Copy all config values to `.env.local`

---

## Deployment

### Vercel (Recommended)

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<username>/calc.git
git push -u origin main

# 2. Import to Vercel
# https://vercel.com/new → Import Git Repository

# 3. Add environment variables
# Settings → Environment Variables
# Add all VITE_FIREBASE_* variables from your .env.local
```

Vercel auto-detects Vite. Deploy completes in ~1 minute.

### Environment Variables Required

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

## Components

### App (src/App.tsx)

Root component. Manages:
- Authentication state
- Tab switching
- Sheet/modal state
- Undo system
- Kaomoji animations
- Theme and grid preferences
- Contains form components inline

### LoginScreen (src/components/LoginScreen.tsx)

Brutalist login form with kaomoji.

**Props:**
- `onLogin: (email: string, password: string) => void`
- `error?: string | null`

### SpentTab (src/components/SpentTab.tsx)

Expense tracking tab with:
- Sparkline visualization
- Daily grouping with expand/collapse
- Archive view for past months
- Budget calculations

**Props:**
- `monthTotal: number`
- `spendByDay: [string, SpendEntry[]][]`
- `expandedDays: Record<string, boolean>`
- `setExpandedDays: React.Dispatch<React.SetStateAction<Record<string, boolean>>>`
- `onEdit: (id: string) => void`
- `onDelete: (id: string) => void`
- `monthlyBudget: number`

### FocusTab (src/components/FocusTab.tsx)

Study session tracking with:
- LiveTimer component (real-time ticker)
- TodayPill component (daily progress)
- Session controls (start/pause/resume/stop)
- Session history grouped by day

**Props:**
- `studySessions: StudySession[]`
- `runningSession: RunningSession | null`
- `dailyStudyGoalMin: number`
- `customSubjects: string[]`
- `onStart: (subject: string, name?: string, note?: string) => void`
- `onPause: () => void`
- `onResume: () => void`
- `onStop: () => void`
- `onDiscard: () => void`
- `onIncrementDistraction: () => void`
- `onUpdateRunning: (patch: Partial<RunningSession>) => void`
- `onEditSession: (id: string) => void`
- `onDeleteSession: (id: string) => void`

### AnalyticsTab (src/components/AnalyticsTab.tsx)

Spending analytics with tag breakdown.

**Props:**
- `spendEntries: SpendEntry[]`
- `customTags: string[]`

### ChronicleTab (src/components/ChronicleTab.tsx)

Friend debt tracking with:
- Friend grid/list view
- Detail view with all transactions
- Settlement functionality

**Props:**
- `sortedFriends: Friend[]`
- `debtTransactions: DebtTransaction[]`
- `sortType: SortType`
- `getFriendBalance: (name: string) => number`
- `onSortCycle: () => void`
- `viewState: { type: 'LIST' | 'DETAIL'; id?: string }`
- `onViewDetail: (name: string) => void`
- `onBack: () => void`
- `onSettle: (id: string) => void`
- `onDelete: (id: string) => void`
- `onEdit: (id: string) => void`

### SidebarConfig (src/components/SidebarConfig.tsx)

Settings sidebar accessible via [CFG] button.

---

## Hooks

### useAuth (src/hooks/useAuth.ts)

Authentication state management.

```typescript
const { user, loading, login, error } = useAuth();

// Returns:
// - user: Firebase User | null
// - loading: boolean
// - login: (email: string, password: string) => Promise<void>
// - error: string | null
```

### useFinanceData (src/hooks/useFinanceData.ts)

Expense and debt CRUD with Firebase sync.

```typescript
const {
  dataLoaded,
  spendEntries,
  debtTransactions,
  friends,
  sortType,
  needsImport,
  importLocalData,
  addSpend,
  updateSpend,
  deleteSpend,
  addDebt,
  updateDebt,
  deleteDebt,
  settleDebt,
  updateSortType,
  monthlyBudget,
  customTags,
  updatePreferences,
} = useFinanceData(uid);
```

### useStudyData (src/hooks/useStudyData.ts)

Study session CRUD with Firebase sync.

```typescript
const {
  studyLoaded,
  studySessions,
  runningSession,
  dailyStudyGoalMin,
  customSubjects,
  startSession,
  pauseSession,
  resumeSession,
  stopSession,
  discardSession,
  updateRunning,
  incrementDistraction,
  updateSession,
  deleteSession,
  updateStudyPreferences,
} = useStudyData(uid);
```

---

### Sparkline (src/lib/sparkline.ts)

Returns ASCII block characters representing data trends.

```typescript
const sparkline = getSparkline([100, 250, 180, 300, 220]);
// Returns: "▂▃▄▇▃" etc.
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.0.0 | UI framework |
| react-dom | 19.0.0 | React DOM rendering |
| firebase | 12.12.1 | Firebase SDK |
| motion | 12.23.24 | Animations |
| lucide-react | 0.546.0 | Icons |
| tailwindcss | 4.1.14 | Styling |
| vite | 6.2.0 | Build tool |
| typescript | ~5.8.2 | Type safety |

---

## Design System

### Color Palette

**Light Mode:**
- Background: `#EDEBF2` (warm lavender-white)
- Ink: `#2B00D4` (vivid purple)
- Grid: `rgba(43, 0, 212, 0.05)`

**Dark Mode:**
- Background: `#0D0B1A` (deep violet-black)
- Ink: `#C4B5FD` (soft lavender)
- Grid: `rgba(196, 181, 253, 0.05)`

### Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Totals | Space Grotesk | 900 | 3-7rem |
| Friend Names | Space Grotesk | 800 | - |
| Input Amount | Space Grotesk | 900 | 4.5rem |
| Day Headers | Space Grotesk | 600 | 0.875rem |
| Entry Amounts | JetBrains Mono | 700 | - |
| Labels | JetBrains Mono | 700 | 0.625rem |
| Buttons | Space Grotesk | 700 | - |

### CSS Utilities

- `.grid-overlay` — Graph paper background (20px grid)
- `.dot-grid` — Dot pattern variant
- `.washi-grain` — Subtle noise texture (light mode only)
- `.strike-through` — Settled item styling

---

## Keyboard Shortcuts

**Global (FOCUS tab only, when no input focused):**

| Key | Action |
|-----|--------|
| Space | Start/Resume session |
| Enter | Stop session |

---

## Scripts

```bash
npm run dev      # Start dev server on port 3000
npm run build   # Production build to dist/
npm run preview # Preview production build
npm run clean   # Remove dist/ folder
npm run lint    # TypeScript type checking
```

---

## Kaomoji Reference

| Kaomoji | Trigger |
|--------|---------|
| `(=^･ω･^=)` | App load |
| `(╬ಠ益ಠ)` | Balance > 5000 (they owe lot) |
| `(´；ω；\`)` | Balance < -5000 (you owe lot) |
| `(￣▽￣)ノ` | Balanced state |
| `( •_•)>⌐■-■` | Confirm action |
| `( ⌐■_■)` | Action complete |
| `(ᵔᴥᵔ)` | Session/DEBT settled |
| `(´• ω •\`)` | Empty state |
| `(¬_¬)` | Error state |
| `(╯°□°）╯︵ ┻━┻` | Deletion confirm |

---

*Documentation for calc-iteration2 — Firebase-powered personal finance tracker*