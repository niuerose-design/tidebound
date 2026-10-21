'use client';
/** v3.408 아이디 · 비밀번호 로그인/가입 화면(새 토대). 검사 규칙과 onSubmit 계약은 옛 login-screen 그대로. */
import { useState } from 'react';
import { Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { field } from '@/components/features/shop/parts';
import { cn } from '@/lib/utils';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="grid gap-1.5 text-s text-ink-3">{label}{children}</label>;

export function LoginScreen({ onSubmit }: { onSubmit: (mode: 'signup' | 'login', username: string, password: string, playerName?: string) => Promise<void> }) {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [username, setUsername] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [playerName, setFisherName] = useState('');
    const [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'signup' && password !== confirm) { setError('비밀번호 확인이 일치하지 않습니다.'); return; }
        if (mode === 'signup' && (playerName.trim().length < 2 || playerName.trim().length > 16)) { setError('모험가 이름은 2~16자로 입력하세요.'); return; }
        setBusy(true); setError('');
        try { await onSubmit(mode, username, password, mode === 'signup' ? playerName.trim() : undefined); }
        catch (err) { setError(err instanceof Error ? err.message : '로그인에 실패했습니다.'); }
        finally { setBusy(false); }
    };
    const input = cn(field, 'h-11 text-m');
    return <div className="grid justify-items-center gap-4 px-4 py-16 text-center text-ink-1 sm:py-24">
        <Leaf size={48} className="text-gold-ink"/>
        <span className="rounded-full border border-gold-ink/55 px-3 py-1 text-xs font-semibold tracking-[.3em] text-gold-ink">OPEN BETA</span>
        <h1 className="font-display text-xl font-bold">판게아 RPG</h1>
        <p className="max-w-md text-s text-ink-2">{mode === 'login' ? '아이디와 비밀번호로 모험을 이어가세요.' : '로그인용 아이디·비밀번호와, 게임에서 보일 모험가 이름을 정하세요.'}</p>
        <form className="grid w-full max-w-sm gap-3 rounded-l border border-line bg-surface-2 p-5 text-left shadow-1" onSubmit={submit}>
            <Field label="아이디"><input className={input} name="username" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="영문 소문자·숫자·밑줄 3~20자" required/></Field>
            <Field label="비밀번호"><input className={input} name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상" required/></Field>
            {mode === 'signup' && <Field label="비밀번호 확인"><input className={input} name="confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required/></Field>}
            {mode === 'signup' && <Field label="모험가 이름"><input className={input} name="playerName" autoComplete="nickname" value={playerName} maxLength={16} onChange={e => setFisherName(e.target.value)} placeholder="채팅·랭킹에 보이는 이름 · 2~16자" required/><small className="text-xs leading-relaxed text-ink-3">아이디는 로그인에만 쓰이고, 다른 모험가에게는 이 이름이 보입니다. 나중에 설정에서 바꿀 수 있습니다.</small></Field>}
            {error && <p className="text-s text-danger" role="alert">{error}</p>}
            <Button type="submit" size="lg" className="bg-accent text-accent-ink hover:bg-accent/90" disabled={busy}>{busy ? '확인 중…' : mode === 'login' ? '로그인' : '가입하고 시작'}</Button>
            <Button type="button" variant="ghost" size="sm" className="text-accent pointer-coarse:min-h-11" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>{mode === 'login' ? '처음이라면 가입하기' : '이미 계정이 있다면 로그인'}</Button>
        </form>
        <small className="text-xs text-ink-3">비밀번호는 복구할 수 없으니 잊지 않도록 보관하세요.</small>
    </div>;
}
