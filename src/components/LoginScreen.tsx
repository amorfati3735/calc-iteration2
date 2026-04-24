import { useState } from 'react';

export function LoginScreen({ onLogin, error }: { onLogin: (email: string, password: string) => void; error: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 font-sans">
      <div className="grid-overlay" />
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center space-y-2">
          <div className="text-[10px] tracking-[0.3em] font-mono font-bold opacity-40">AUTHENTICATE</div>
          <div className="text-4xl font-display font-black">CALC</div>
          <div className="text-lg font-mono opacity-30">(=^･ω･^=)</div>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">EMAIL</div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border-b-2 border-ink bg-transparent outline-none py-3 text-sm font-mono"
              placeholder="you@email.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <div className="text-[10px] opacity-40 font-mono font-bold tracking-widest px-1">PASSWORD</div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onLogin(email, password)}
              className="w-full border-b-2 border-ink bg-transparent outline-none py-3 text-sm font-mono"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
        </div>
        {error && <div className="text-xs font-mono text-center opacity-70">{error}</div>}
        <button
          onClick={() => onLogin(email, password)}
          className="w-full bg-ink text-bg py-4 font-display text-base font-bold border-2 border-ink tracking-widest active:scale-[0.97] transition-transform"
        >
          ENTER
        </button>
      </div>
    </div>
  );
}
