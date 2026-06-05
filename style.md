# CALC — Design System & Style Guide

> **Philosophy**: Monochrome brutalist + notebook aesthetic. Single accent color scheme on neutral backgrounds. ASCII art / kaomoji as visual decoration. Graph-paper / dot-grid background motif. Everything is flat, bordered, and intentionally unpolished.

---

## 1. Color Palette

### Core Tokens (CSS Custom Properties)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg` | `#EDEBF2` (warm off-white) | `#0D0B1A` (near-black) | Page / card backgrounds |
| `--ink` | `#2B00D4` (deep purple-blue) | `#C4B5FD` (soft lavender) | Text, borders, accents |
| `--grid` | `rgba(43, 0, 212, 0.05)` | `rgba(196, 181, 253, 0.05)` | Grid overlay lines/dots |

### Semantic Usage

- `bg-ink text-bg` — Primary buttons, FAB, active states
- `bg-transparent text-ink border border-ink` — Secondary/outline buttons
- `bg-bg text-ink border border-ink` — Cards, modals, inputs
- `border-ink/{10,20,30,40}` — Dividers, input underlines, subtle borders
- `bg-ink/{5,10}` — Subtle fills, progress track, disabled surfaces
- `text-ink/60` — Muted/secondary text

### Chart Accent Colors (Analytics)

- `#FF3366` — Vibrant pink/red
- `#00E5FF` — Cyan
- `#FFD500` — Yellow
- `#B000FF` — Purple
- `#00FF66` — Neon green
- `#FF6B00` — Orange

### Special Inline Color

- `#2c7a3d` — Green accent (study day headers, left border)

---

## 2. Typography

### Font Families

| Role | Value |
|---|---|
| `--font-mono` | `"JetBrains Mono", ui-monospace, SFMono-Regular, monospace` |
| `--font-sans` | `"JetBrains Mono", ui-monospace, SFMono-Regular, monospace` (uses mono as body!) |
| `--font-display` | `"Space Grotesk", sans-serif` |

Import: `JetBrains Mono:wght@400;700` + `Space Grotesk:wght@600` from Google Fonts.

### Font Sizes (Tailwind scale)

| Size | Usage |
|---|---|
| `9px` (`text-[9px]`) | Archive labels, metadata, hints |
| `10px` (`text-[10px]`) | Labels (AMOUNT, TAG, DATE), section headers, tab buttons |
| `11px` (`text-[11px]`) | Tag chips, back button |
| `12px` (`text-xs`) | Sub-labels, stat values, friend card meta |
| `14px` (`text-sm`) | Input text, descriptions, sub-headers |
| `16px` (`text-base`) | Primary input text, button labels |
| `18px` (`text-lg`) | Buttons, kaomoji display |
| `20px` (`text-xl`) | Balance amounts |
| `24px` (`text-2xl`) | Friend detail name, loading state |
| `30px` (`text-3xl`) | Amount input unit label |
| `36px` (`text-4xl`) | Month total, login title, timer |
| `clamp(3rem, 14vw, 4.5rem)` | Timer display, amount input |
| `7rem` (`text-[7rem]`) | Timer (large screens via `sm:`) |

### Font Weights

| Weight | Usage |
|---|---|
| `400` (font-normal) | Body default |
| `600` (font-semibold) | Tab buttons |
| `700` (font-bold) | Labels, amounts, buttons, tags |
| `900` (font-black) | Large display numbers, amount inputs |

### Letter Spacing

| Class | Usage |
|---|---|
| `tracking-tighter` | Large display numbers, timer |
| `tracking-wider` | Subject tags |
| `tracking-widest` | Uppercase labels, tab buttons, section headers |
| `tracking-[0.2em]` | Sheet form titles |
| `tracking-[0.3em]` | Auth header |
| `tracking-[0.05em]` | LOG AS SPENT button |

### Text Transforms

- `uppercase` — All labels, subject names, friend names, button text
- `italic` — Note content in NOTE-type sessions

### Line Heights

- `leading-none` — Timer, amount input (large numbers)
- `leading-normal` — Default body

---

## 3. Spacing

### Padding

| Class | Usage |
|---|---|
| `px-1 py-1` | Chips, small labels |
| `px-2 py-1` | Tag/subject chips, friend cards |
| `px-2 py-1.5` | Header buttons (CFG, CALC) |
| `px-3 py-1.5` | Theme/Config toggle buttons |
| `px-3 py-2` | Back button |
| `px-4 py-3` | Import prompt bar |
| `p-4` | Archive blocks, kaomoji toast, brutal-box |
| `px-4 pt-24 pb-40` | Main app container |
| `p-5 sm:p-6` | Sheet form |
| `p-6` | Sidebar, quick note modal |

### Margin

| Class | Usage |
|---|---|
| `space-y-1` | Label + input pairs |
| `space-y-2` | Tag groups, day groups |
| `space-y-4` | Section blocks, auth form |
| `space-y-5 sm:space-y-7` | Sheet form sections |
| `space-y-6` | Analytics bars, archive months |
| `space-y-8` | Main tab content, sidebar |
| `space-y-12` | Analytics container |
| `gap-1.5` | Tag chips, scramble dots |
| `gap-2` | Theme toggle, tag input |
| `gap-3` | Import prompt |
| `gap-4` | Friend cards grid, session controls |
| `gap-6` | Date/Time grid |

### Sizing

| Class | Usage |
|---|---|
| `w-14 h-14` | FAB buttons |
| `w-64` | Sidebar width |
| `max-w-xs` | Login form |
| `max-w-sm` | Import prompt, quick note |
| `max-w-lg` | Main app container |
| `max-w-[460px]` | Tab bar width |
| `w-[92%]` | Tab bar relative width |

---

## 4. Border & Shadow

### Border Width

| Style | Usage |
|---|---|
| `border` / `border-2` | Cards, inputs, buttons, tags |
| `border-b` | Input underlines, section dividers |
| `border-b-2` | Auth inputs, sidebar title |
| `border-b-4` | Amount input underline |
| `border-t` | Sheet top edge |
| `border-r-2` | Sidebar right edge |
| `border-dashed` | Archive toggle, month blocks |
| `border-dotted` | Notebook row leaders, archive dividers |

### Border Radius

| Value | Usage |
|---|---|
| `rounded-xl` | Tab bar |
| `rounded-full` | Scramble dots |
| `hand-ruled-border` | Section day cards (0.5/1.5/1/0.5px, jagged) |
| No radius (default) | Everything else — buttons, cards, inputs |

### Shadow

| Class | Usage |
|---|---|
| `shadow-[4px_4px_0_var(--ink)]` | FAB (resting) |
| `shadow-[6px_6px_0_var(--ink)]` | FAB (hover) |
| `shadow-[8px_8px_0px_0px_var(--ink)]` | Undo toast |
| `shadow-[8px_8px_0px_rgba(43,0,212,0.1)]` | Quick note modal |
| `shadow-[0_8px_30px_rgba(43,0,212,0.1)]` | Tab bar |

> Rule: Hard pixel offsets, no blur (except tab bar). Matches brutalist aesthetic.

---

## 5. Layout

### Grid Patterns

- `grid grid-cols-2 gap-4` — Friend cards (2-column grid)
- `grid grid-cols-3 gap-2` — Session controls
- `grid grid-cols-2 gap-2` — Subject totals

### Flex Patterns

- `flex justify-between items-baseline` — Notebook rows, headers
- `flex items-center gap-2` — Input + button combos
- `flex items-baseline gap-2` — Amount row, progress display
- `flex-wrap gap-1.5` — Tag chips
- `flex-1` — Input fields (fill available)
- `flex-shrink-0` — Fixed elements (unit labels, date columns)

### Z-Index Stack

| Value | Layer |
|---|---|
| `z-0` | Grid overlay backgrounds |
| `z-30` | Branding bar, TodayPill, import prompt |
| `z-40` | FAB, tab bar, sheet backdrop |
| `z-50` | Sheet content, sidebar backdrop |
| `z-[60]` | Sidebar panel, fleeting kaomoji |
| `z-[100]` | Undo toast |

### Fixed Positions

| Pattern | Element |
|---|---|
| `fixed top-4 left-1/2 -translate-x-1/2` | Branding bar |
| `fixed bottom-0 left-0 right-0` | Bottom sheet |
| `fixed bottom-6 left-1/2 -translate-x-1/2` | Tab bar |
| `fixed bottom-24 right-8` | FAB |
| `fixed top-0 bottom-0 left-0` | Sidebar |
| `fixed inset-0` | Overlays/modals |

---

## 6. Components

### FAB
- 56×56px (`w-14 h-14`), `bg-ink text-bg`
- `text-3xl` (+ symbol)
- Hard shadow, `hover:scale-105 active:scale-95`
- `transition-all`

### Tab Bar
- Fixed bottom, `w-[92%] max-w-[460px]`, centered
- `rounded-xl border border-ink/30`, `bg-bg/80 backdrop-blur-md`
- Soft shadow
- Tabs: `py-5 text-[10px] tracking-widest font-display font-semibold`
- Active: `underline underline-offset-8 scale-110`

### Primary Button (CTA)
- Full width, `bg-ink text-bg`, `py-4 sm:py-5`
- `font-display text-lg sm:text-xl font-bold border-2 border-ink`
- `tracking-widest`, `active:scale-[0.97]`

### Secondary / Outline Button
- `bg-transparent text-ink`, same border
- `py-3 sm:py-4`
- `hover:bg-ink hover:text-bg transition-colors`
- Reduced opacity (`opacity-60`) for de-emphasized actions

### Tag Chip Selector
- `px-2 py-1 border border-ink text-[11px] font-mono`
- Active: `bg-ink text-bg`
- Inactive: `bg-transparent text-ink`
- `transition-colors`

### Input Fields
- **Amount**: `border-b-4 border-ink`, `text-[clamp(3rem,14vw,4.5rem)] font-display font-black`, transparent bg
- **Text**: `w-full border-b border-ink bg-transparent outline-none py-2.5 text-base`
- **Auth**: `border-b-2 border-ink py-3 text-sm font-mono`
- All inputs: `outline-none`, `bg-transparent`, hide number spinners

### Brutal-Box (Card)
```css
.brutal-box {
  border: 1px solid var(--ink);
  padding: 1rem;
  background: var(--bg);
  position: relative;
}
```

### Bottom Sheet
- `fixed bottom-0 left-0 right-0 z-50`
- `bg-bg border-t border-ink`, `max-w-lg mx-auto`
- ASCII torn edge: `^/^/^/^/^/` across top border
- `max-h-[88dvh]`, `transition-transform duration-300 ease-out`
- Backdrop: `bg-ink/10 backdrop-blur-[2px]`

### Modals (Quick Note, etc.)
- `bg-bg border border-ink p-6`
- `shadow-[8px_8px_0px_rgba(43,0,212,0.1)]`
- `w-[90%] max-w-sm`
- `transition-transform duration-200`

### Toast / Notification
- Undo toast: `bg-ink text-bg border-2 border-bg shadow-[8px_8px_0px_0px_var(--ink)]`
- Fixed bottom-center, `transition-all duration-300`
- Import prompt: `bg-ink text-bg px-4 py-3`, `pop-in` animation

### Progress Bar
- Track: `h-[3px] bg-ink/10`, Fill: `bg-ink transition-all`
- Analytics bars: `h-4 bg-ink/10 border border-ink`, fill `transition-all duration-1000 ease-out`

---

## 7. Animations

| Name | Keyframes | When used |
|---|---|---|
| `pop-in` | `0%: opacity 0, scale 0.92, translateY 6px` → `100%: opacity 1, scale 1, translateY 0`. 220ms, cubic-bezier(.2,.8,.2,1) | Import prompt, appearing elements |
| `skeleton-pulse` | `0%/100%: opacity 0.45` → `50%: opacity 0.85`. 1.4s, ease-in-out, infinite | Loading states |
| Sheet | `translate-y` transition, 300ms, ease-out | Bottom sheet open/close |
| Sidebar | `translate-x` transition, 300ms, ease-out | Sidebar slide |
| Buttons | `hover:scale-105 active:scale-95`, transition-all | Interactive feedback |
| Analytics bars | `transition-all duration-1000 ease-out` | Bar fill animation |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` — all transitions/animations → 0.01ms | Accessibility |

---

## 8. Grid Overlays

```css
/* Lines mode */
background-image: linear-gradient(var(--grid) 1px, transparent 1px),
                  linear-gradient(90deg, var(--grid) 1px, transparent 1px);
background-size: 20px 20px;

/* Dots mode */
background-image: radial-gradient(circle, var(--ink) 1.5px, transparent 1.5px);
background-size: 20px 20px;
background-repeat: repeat;
opacity: 0.15;
```

- `fixed inset-0`, `pointer-events: none`, `z-index: 0`
- Persisted toggle via `localStorage('calc_grid')` — `'lines'` or `'dots'`

---

## 9. Theme

- Toggled via `document.documentElement.classList.toggle('dark')`
- Persisted in `localStorage('calc_theme')`
- Hotkey: `B` key
- Meta `theme-color` updated on toggle

---

## 10. Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| `max-width: 380px` | Compact sheet padding, reduced gap, smaller amount font |
| `max-width: 480px` | Smaller amount font, tap highlight transparent |
| `min-width: 640px` (`sm:`) | Larger padding, fonts, gaps throughout |
| `min-width: 768px` | Desktop-first assumptions (default tab to Focus) |

---

## 11. Scrollbar

```css
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--ink); border-radius: 0; }
```

---

## 12. Notebook Row Pattern

```css
.notebook-row {
  border-bottom: 1px solid var(--ink);
}
.notebook-dots {
  flex-grow: 1;
  border-bottom: 1px dotted var(--ink);
  margin: 0 1rem;
}
```

---

## 13. ASCII / Kaomoji Decoration

Used for loading states, empty states, errors, confirmations, and decorative section dividers. Each state has a custom ASCII face. Section dividers use `^/^/^/^/^/` torn-edge pattern on sheet top borders.

---

## 14. SCSS / Design Tokens Reference

```scss
:root {
  --bg: #EDEBF2;
  --ink: #2B00D4;
  --grid: rgba(43, 0, 212, 0.05);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

.dark {
  --bg: #0D0B1A;
  --ink: #C4B5FD;
  --grid: rgba(196, 181, 253, 0.05);
}

// Fonts
--font-mono: 'JetBrains Mono', ui-monospace, monospace;
--font-display: 'Space Grotesk', sans-serif;
```

---

## 15. Design Principles (for agents)

1. **Brutalist first** — everything has a visible border, hard shadows, no rounding (except tab bar).
2. **Mono chrome** — single `--ink` accent color, varied by opacity only. No secondary palette.
3. **Flat shadows** — hard pixel offsets, never blurred (tab bar is the single exception).
4. **All caps labels** — every label is uppercase with wide tracking.
5. **Mono body** — JetBrains Mono serves as both code and body font. Space Grotesk only for display.
6. **Borders as dividers** — never use background color changes to separate sections; use `border-b` with `--ink` instead.
7. **Grid background** — pages always have a dot-grid or line-grid overlay as texture.
8. **Mobile-first** — single-column, bottom FAB, bottom tab bar, bottom sheets.
9. **`max-width: 640px` app** — content never exceeds `max-w-lg` (512px) with occasional `max-w-sm` modals.
10. **No rounding on interactive elements** — buttons, inputs, cards are all square-cornered.
