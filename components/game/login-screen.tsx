'use client';
import { useState } from 'react';
import { Anchor } from 'lucide-react';

/** 아이디·비밀번호 로그인/가입 화면. */
export function LoginScreen({ onSubmit }: { onSubmit: (mode: 'signup' | 'login', username: string, password: string) => Promise<void> }) {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [username, setUsername] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
    const [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'signup' && password !== confirm) { setError('비밀번호 확인이 일치하지 않습니다.'); return; }
        setBusy(true); setError('');
        try { await onSubmit(mode, username, password); }
        catch (err) { setError(err instanceof Error ? err.message : '로그인에 실패했습니다.'); }
        finally { setBusy(false); }
    };
    return <div className="loading-screen login-screen">
        <Anchor size={48}/>
        <h1>TIDEBOUND · 심연의 낚시꾼</h1>
        <p>{mode === 'login' ? '아이디와 비밀번호로 항해를 이어가세요.' : '새 낚시꾼의 아이디와 비밀번호를 정하세요.'}</p>
        <form className="panel login-form" onSubmit={submit}>
            <label>아이디<input name="username" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="영문 소문자·숫자·밑줄 3~20자" required/></label>
            <label>비밀번호<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상" required/></label>
            {mode === 'signup' && <label>비밀번호 확인<input name="confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required/></label>}
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="primary" type="submit" disabled={busy}>{busy ? '확인 중…' : mode === 'login' ? '로그인' : '가입하고 시작'}</button>
            <button className="text-button" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>{mode === 'login' ? '처음이라면 가입하기' : '이미 계정이 있다면 로그인'}</button>
        </form>
        <small className="login-note">비밀번호는 복구할 수 없으니 잊지 않도록 보관하세요.</small>
    </div>;
}
