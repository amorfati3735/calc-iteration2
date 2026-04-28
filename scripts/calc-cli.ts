#!/usr/bin/env tsx
/**
 * calc-cli — CLI for interacting with the Firebase Realtime Database
 * that powers this app, using only the public REST API (no admin SDK
 * needed). Reads credentials from .env.local.
 *
 * Usage:
 *   pnpm cli login [email] [password]
 *   pnpm cli whoami
 *   pnpm cli summary
 *   pnpm cli list-spends [--month YYYY-MM] [--limit N]
 *   pnpm cli add-spend <amount> [--note "..."] [--tag eat-out] [--date YYYY-MM-DD] [--type SPENT|EARNED]
 *   pnpm cli delete-spend <id>
 *   pnpm cli list-debts [--unsettled]
 *   pnpm cli settle-debt <id>
 *   pnpm cli list-friends
 *   pnpm cli list-sessions [--limit N]
 *   pnpm cli export [--out path.json]
 *   pnpm cli import-gpay <path/to/gpay_statement.md> [--year 2025] [--tag gpay] [--dry-run] [--no-skip-credits]
 *   pnpm cli raw-get <path>
 *   pnpm cli raw-set <path> <json>
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';

// ----------------------- env loading ------------------------------------
const ROOT = path.resolve(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), '..');
const envPath = path.join(ROOT, '.env.local');
const envFallback = path.join(ROOT, '.env');
const env: Record<string, string> = {};
for (const p of [envFallback, envPath]) {
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const API_KEY = env.VITE_FIREBASE_API_KEY;
const DB_URL  = env.VITE_FIREBASE_DATABASE_URL?.replace(/\/+$/, '');
if (!API_KEY || !DB_URL) {
  console.error('[calc-cli] Missing VITE_FIREBASE_API_KEY / VITE_FIREBASE_DATABASE_URL in .env.local');
  process.exit(2);
}

// ----------------------- session storage --------------------------------
const STATE_DIR  = path.join(os.homedir(), '.config', 'calc-cli');
const STATE_FILE = path.join(STATE_DIR, 'auth.json');
type AuthState = { uid: string; email: string; idToken: string; refreshToken: string; expiresAt: number };
function loadAuth(): AuthState | null {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return null; }
}
function saveAuth(a: AuthState) {
  fs.mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(STATE_FILE, JSON.stringify(a, null, 2), { mode: 0o600 });
}
function clearAuth() { try { fs.unlinkSync(STATE_FILE); } catch {} }

async function refreshIfNeeded(a: AuthState): Promise<AuthState> {
  if (Date.now() < a.expiresAt - 60_000) return a;
  const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(a.refreshToken)}`,
  });
  if (!r.ok) throw new Error(`refresh failed: ${await r.text()}`);
  const j = await r.json() as any;
  const next: AuthState = {
    ...a,
    idToken: j.id_token,
    refreshToken: j.refresh_token,
    expiresAt: Date.now() + Number(j.expires_in) * 1000,
  };
  saveAuth(next);
  return next;
}

async function getAuth(): Promise<AuthState> {
  const a = loadAuth();
  if (!a) {
    console.error('[calc-cli] not logged in. Run: pnpm cli login');
    process.exit(1);
  }
  return refreshIfNeeded(a);
}

// ----------------------- firebase REST helpers --------------------------
async function dbGet(p: string, idToken: string): Promise<any> {
  const url = `${DB_URL}/${p}.json?auth=${idToken}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${p}: ${r.status} ${await r.text()}`);
  return r.json();
}
async function dbPut(p: string, body: any, idToken: string) {
  const r = await fetch(`${DB_URL}/${p}.json?auth=${idToken}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PUT ${p}: ${r.status} ${await r.text()}`);
  return r.json();
}
async function dbPatch(p: string, body: any, idToken: string) {
  const r = await fetch(`${DB_URL}/${p}.json?auth=${idToken}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH ${p}: ${r.status} ${await r.text()}`);
  return r.json();
}
async function dbDelete(p: string, idToken: string) {
  const r = await fetch(`${DB_URL}/${p}.json?auth=${idToken}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`DELETE ${p}: ${r.status} ${await r.text()}`);
  return true;
}

// ----------------------- arg parsing ------------------------------------
function parseFlags(argv: string[]) {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { flags[k] = next; i++; }
      else flags[k] = true;
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

function ask(prompt: string, opts: { silent?: boolean } = {}): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (opts.silent) {
      // best-effort password masking
      const stdin = process.stdin as any;
      const onData = (c: Buffer) => {
        const s = c.toString();
        if (s === '\n' || s === '\r' || s === '\u0004') stdin.removeListener('data', onData);
        else process.stdout.write('*');
      };
      stdin.on('data', onData);
    }
    rl.question(prompt, (ans) => { rl.close(); if (opts.silent) process.stdout.write('\n'); resolve(ans); });
  });
}

// ----------------------- commands ---------------------------------------
async function cmdLogin(args: string[]) {
  let email = args[0];
  let password = args[1];
  if (!email)    email    = await ask('email: ');
  if (!password) password = await ask('password: ', { silent: true });
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    console.error('login failed:', err?.error?.message || r.status);
    process.exit(1);
  }
  const j = await r.json() as any;
  const a: AuthState = {
    uid: j.localId, email: j.email,
    idToken: j.idToken, refreshToken: j.refreshToken,
    expiresAt: Date.now() + Number(j.expiresIn) * 1000,
  };
  saveAuth(a);
  console.log(`✓ logged in as ${a.email} (uid: ${a.uid})`);
}

async function cmdWhoami() {
  const a = loadAuth();
  if (!a) { console.log('not logged in.'); return; }
  console.log(`${a.email}  uid=${a.uid}  expires_in=${Math.max(0, Math.round((a.expiresAt - Date.now())/1000))}s`);
}

async function cmdLogout() { clearAuth(); console.log('logged out.'); }

async function cmdSummary() {
  const a = await getAuth();
  const data = await dbGet(`users/${a.uid}`, a.idToken) || {};
  const spends = data.spendEntries ? Object.values(data.spendEntries) as any[] : [];
  const debts  = data.debtTransactions ? Object.values(data.debtTransactions) as any[] : [];
  const friends = data.friends ? Object.values(data.friends) as any[] : [];
  const sessions = data.studySessions ? Object.values(data.studySessions) as any[] : [];

  const now = new Date();
  const monthTotal = spends.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + (e.type === 'SPENT' ? e.amount : -e.amount), 0);

  const owedToMe   = debts.filter(d => !d.settled && d.direction === 'LENT').reduce((s, d) => s + d.amountValue, 0);
  const iOwe       = debts.filter(d => !d.settled && d.direction === 'PAID').reduce((s, d) => s + d.amountValue, 0);
  const studyMin   = Math.round(sessions.reduce((s, x) => s + (x.durationMs || 0), 0) / 60000);

  console.log(`user        : ${a.email}`);
  console.log(`spends      : ${spends.length}  (this month total: ${monthTotal})`);
  console.log(`debts       : ${debts.length}   (owed to me: ${owedToMe} | I owe: ${iOwe})`);
  console.log(`friends     : ${friends.length}`);
  console.log(`sessions    : ${sessions.length}  (total study min: ${studyMin})`);
}

async function cmdListSpends(flags: any) {
  const a = await getAuth();
  let spends = Object.values((await dbGet(`users/${a.uid}/spendEntries`, a.idToken)) || {}) as any[];
  if (flags.month) {
    const [y, m] = String(flags.month).split('-').map(Number);
    spends = spends.filter(e => { const d = new Date(e.date); return d.getFullYear() === y && d.getMonth() + 1 === m; });
  }
  spends.sort((a, b) => b.date - a.date);
  if (flags.limit) spends = spends.slice(0, Number(flags.limit));
  for (const s of spends) {
    const d = new Date(s.date).toISOString().slice(0, 10);
    const sign = s.type === 'EARNED' ? '+' : '-';
    console.log(`${d}  ${sign}${String(s.amount).padStart(7)}  ${(s.tag || '-').padEnd(10)}  ${s.note}  [${s.id.slice(0,8)}]`);
  }
  console.log(`(${spends.length} entries)`);
}

async function cmdAddSpend(args: string[], flags: any) {
  const a = await getAuth();
  const amount = parseFloat(args[0]);
  if (!isFinite(amount)) { console.error('amount required'); process.exit(2); }
  const id = crypto.randomUUID();
  const entry = {
    id,
    amount,
    note: (flags.note as string) || '...',
    tag: (flags.tag as string) || undefined,
    date: flags.date ? new Date(String(flags.date)).getTime() : Date.now(),
    type: (flags.type as string) === 'EARNED' ? 'EARNED' : 'SPENT',
  };
  Object.keys(entry).forEach(k => (entry as any)[k] === undefined && delete (entry as any)[k]);
  await dbPut(`users/${a.uid}/spendEntries/${id}`, entry, a.idToken);
  console.log(`✓ added ${entry.type} ${entry.amount} (${id.slice(0,8)})`);
}

async function cmdDeleteSpend(args: string[]) {
  const a = await getAuth();
  const id = args[0]; if (!id) { console.error('id required'); process.exit(2); }
  await dbDelete(`users/${a.uid}/spendEntries/${id}`, a.idToken);
  console.log(`✓ deleted spend ${id}`);
}

async function cmdListDebts(flags: any) {
  const a = await getAuth();
  let debts = Object.values((await dbGet(`users/${a.uid}/debtTransactions`, a.idToken)) || {}) as any[];
  if (flags.unsettled) debts = debts.filter(d => !d.settled);
  debts.sort((a, b) => b.date - a.date);
  for (const d of debts) {
    const dt = new Date(d.date).toISOString().slice(0, 10);
    const status = d.settled ? '[settled]' : '[open]   ';
    console.log(`${dt} ${status} ${d.direction.padEnd(4)} ${String(d.amountValue).padStart(7)}  ${d.friendName.padEnd(20)}  ${d.note}  [${d.id.slice(0,8)}]`);
  }
  console.log(`(${debts.length} debts)`);
}

async function cmdSettleDebt(args: string[]) {
  const a = await getAuth();
  const id = args[0]; if (!id) { console.error('id required'); process.exit(2); }
  await dbPatch(`users/${a.uid}/debtTransactions/${id}`, { settled: true }, a.idToken);
  console.log(`✓ settled ${id}`);
}

async function cmdListFriends() {
  const a = await getAuth();
  const friends = Object.values((await dbGet(`users/${a.uid}/friends`, a.idToken)) || {}) as any[];
  for (const f of friends) console.log(`${f.name}  (last active: ${new Date(f.lastActive).toISOString().slice(0,10)})`);
  console.log(`(${friends.length} friends)`);
}

async function cmdListSessions(flags: any) {
  const a = await getAuth();
  let sessions = Object.values((await dbGet(`users/${a.uid}/studySessions`, a.idToken)) || {}) as any[];
  sessions.sort((a, b) => b.startedAt - a.startedAt);
  if (flags.limit) sessions = sessions.slice(0, Number(flags.limit));
  for (const s of sessions) {
    const d = new Date(s.startedAt).toISOString().slice(0, 10);
    const min = Math.round((s.durationMs || 0) / 60000);
    console.log(`${d}  ${String(min).padStart(4)}min  ${(s.subject || '-').padEnd(12)}  ${s.note || s.name || ''}  [${s.id.slice(0,8)}]`);
  }
  console.log(`(${sessions.length} sessions)`);
}

async function cmdExport(flags: any) {
  const a = await getAuth();
  const data = await dbGet(`users/${a.uid}`, a.idToken);
  const out = String(flags.out || `calc_export_${new Date().toISOString().slice(0,10)}.json`);
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(`✓ exported to ${out}`);
}

async function cmdRawGet(args: string[]) {
  const a = await getAuth();
  const p = args[0]; if (!p) { console.error('path required'); process.exit(2); }
  console.log(JSON.stringify(await dbGet(p, a.idToken), null, 2));
}

async function cmdRawSet(args: string[]) {
  const a = await getAuth();
  const p = args[0]; const json = args[1];
  if (!p || !json) { console.error('path + json required'); process.exit(2); }
  const body = JSON.parse(json);
  console.log(JSON.stringify(await dbPut(p, body, a.idToken), null, 2));
}

// ----------------------- gpay markdown import --------------------------
type ParsedTxn = { date: number; amount: number; vendor: string; type: 'SPENT' | 'EARNED' };

const MONTHS: Record<string, number> = {
  JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11,
};

/**
 * Parses the GPay markdown statement format with rows of:
 *   | **DD-Mon** | Vendor | debit |  |  |
 *   |            | Vendor |  | credit |  |
 * Year inference: walks chronologically; when month index drops it bumps year.
 */
export function parseGpayMarkdown(md: string, baseYear: number, opts: { skipCredits?: boolean } = {}): ParsedTxn[] {
  const lines = md.split(/\r?\n/);
  const out: ParsedTxn[] = [];
  let currentDate: { day: number; month: number; year: number } | null = null;
  let lastMonth = -1;
  let year = baseYear;

  const cleanCell = (s: string) => s.trim().replace(/^\*\*|\*\*$/g, '').replace(/\*\*/g, '').trim();
  const parseAmount = (s: string) => {
    const cleaned = cleanCell(s).replace(/[, ]/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '–') return NaN;
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : NaN;
  };

  for (const raw of lines) {
    if (!raw.includes('|')) continue;
    const cells = raw.split('|').slice(1, -1).map(c => c);
    if (cells.length < 3) continue;
    const c0 = cleanCell(cells[0] || '');
    const c1 = cleanCell(cells[1] || '');
    const c2 = cells[2] || '';
    const c3 = cells[3] || '';

    // Header / separator rows
    if (/^Date$/i.test(c0) || /^[-: ]+$/.test(c0)) continue;

    // Date column present (e.g. "01-Oct" or empty when continuation)
    let date = currentDate;
    if (c0) {
      const m = c0.match(/^(\d{1,2})[-\s]([A-Za-z]{3})/);
      if (m) {
        const day = parseInt(m[1], 10);
        const month = MONTHS[m[2].toUpperCase()];
        if (!isNaN(day) && month != null) {
          if (lastMonth !== -1 && month < lastMonth) year += 1;
          lastMonth = month;
          currentDate = { day, month, year };
          date = currentDate;
        }
      } else if (/^\d/.test(c0)) {
        // Some rows might contain summary like "💸 50+60 = **110**" — skip
        continue;
      }
    }
    if (!date) continue;

    // Vendor / amount cells
    const vendor = c1;
    if (!vendor || /^💸|^💰/.test(vendor)) continue;
    const debit  = parseAmount(c2);
    const credit = parseAmount(c3);

    if (isFinite(debit) && debit > 0) {
      out.push({
        date: new Date(date.year, date.month, date.day, 12, 0, 0).getTime(),
        amount: debit, vendor,
        type: 'SPENT',
      });
    } else if (isFinite(credit) && credit > 0 && !opts.skipCredits) {
      out.push({
        date: new Date(date.year, date.month, date.day, 12, 0, 0).getTime(),
        amount: credit, vendor,
        type: 'EARNED',
      });
    }
  }
  return out;
}

async function cmdImportGpay(args: string[], flags: any) {
  const file = args[0];
  if (!file) { console.error('path to gpay markdown required'); process.exit(2); }
  if (!fs.existsSync(file)) { console.error(`no such file: ${file}`); process.exit(2); }
  const md = fs.readFileSync(file, 'utf8');
  const baseYear = flags.year ? parseInt(String(flags.year), 10) : 2025;
  const skipCredits = !flags['no-skip-credits']; // default: skip credits (treat as not-spend)
  const tag = (flags.tag as string) || 'gpay';
  const dryRun = !!flags['dry-run'];

  const txns = parseGpayMarkdown(md, baseYear, { skipCredits });
  console.log(`parsed ${txns.length} transactions  (year-base ${baseYear}, ${skipCredits ? 'skipping credits' : 'with credits'})`);
  if (dryRun) {
    for (const t of txns.slice(0, 20)) {
      console.log(`  ${new Date(t.date).toISOString().slice(0,10)}  ${t.type.padEnd(6)} ${String(t.amount).padStart(8)}  ${t.vendor}`);
    }
    if (txns.length > 20) console.log(`  ... +${txns.length - 20} more`);
    console.log('(dry-run, nothing written)');
    return;
  }

  const a = await getAuth();
  const existing = Object.values((await dbGet(`users/${a.uid}/spendEntries`, a.idToken)) || {}) as any[];
  const existKey = (x: any) => `${new Date(x.date).toISOString().slice(0,10)}|${x.amount}|${(x.note || '').toLowerCase().slice(0, 40)}`;
  const existSet = new Set(existing.map(existKey));

  const batch: Record<string, any> = {};
  let added = 0, skipped = 0;
  for (const t of txns) {
    const id = crypto.randomUUID();
    const entry = {
      id,
      amount: t.amount,
      note: t.vendor,
      tag,
      date: t.date,
      type: t.type,
    };
    if (existSet.has(existKey(entry))) { skipped++; continue; }
    batch[id] = entry;
    added++;
  }
  if (added === 0) { console.log('nothing to add (all duplicates)'); return; }
  await dbPatch(`users/${a.uid}/spendEntries`, batch, a.idToken);
  console.log(`✓ imported ${added} entries, skipped ${skipped} duplicates`);
}

// ----------------------- main -------------------------------------------
async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { flags, positional } = parseFlags(rest);
  try {
    switch (cmd) {
      case 'login':         await cmdLogin(positional); break;
      case 'logout':        await cmdLogout(); break;
      case 'whoami':        await cmdWhoami(); break;
      case 'summary':       await cmdSummary(); break;
      case 'list-spends':   await cmdListSpends(flags); break;
      case 'add-spend':     await cmdAddSpend(positional, flags); break;
      case 'delete-spend':  await cmdDeleteSpend(positional); break;
      case 'list-debts':    await cmdListDebts(flags); break;
      case 'settle-debt':   await cmdSettleDebt(positional); break;
      case 'list-friends':  await cmdListFriends(); break;
      case 'list-sessions': await cmdListSessions(flags); break;
      case 'export':        await cmdExport(flags); break;
      case 'import-gpay':   await cmdImportGpay(positional, flags); break;
      case 'raw-get':       await cmdRawGet(positional); break;
      case 'raw-set':       await cmdRawSet(positional); break;
      case 'help':
      case '--help':
      case undefined:
        printHelp(); break;
      default:
        console.error(`unknown command: ${cmd}`); printHelp(); process.exit(2);
    }
  } catch (e: any) {
    console.error('[calc-cli] error:', e?.message || e);
    process.exit(1);
  }
}

function isDirectInvocation(): boolean {
  try {
    const here = new URL(import.meta.url).pathname;
    const main = process.argv[1] ? path.resolve(process.argv[1]) : '';
    return here === main;
  } catch { return true; }
}

function printHelp() {
  console.log(`calc-cli — interact with the calc Firebase backend

usage: pnpm cli <command> [args]

  login [email] [pw]              authenticate, persists token in ~/.config/calc-cli/
  logout                          drop saved token
  whoami                          show current user
  summary                         totals across all data
  list-spends [--month YYYY-MM]   list spend entries
  add-spend <amount> [--note] [--tag] [--date] [--type SPENT|EARNED]
  delete-spend <id>
  list-debts [--unsettled]
  settle-debt <id>
  list-friends
  list-sessions [--limit N]
  export [--out file.json]
  import-gpay <file.md> [--year 2025] [--tag gpay] [--dry-run] [--no-skip-credits]
  raw-get <path>
  raw-set <path> <json>
`);
}

if (isDirectInvocation()) main();
