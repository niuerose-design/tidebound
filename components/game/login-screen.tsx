'use client';
import { useState } from 'react';
import { Leaf } from 'lucide-react';

/** 아이디·비밀번호 로그인/가입 화면. */
export function LoginScreen({ onSubmit }: { onSubmit: (mode: 'signup' | 'login', username: string, password: string, fisherName?: string) => Promise<void> }) {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [username, setUsername] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [fisherName, setFisherName] = useState('');
    const [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'signup' && password !== confirm) { setError('비밀번호 확인이 일치하지 않습니다.'); return; }
        if (mode === 'signup' && (fisherName.trim().length < 2 || fisherName.trim().length > 16)) { setError('모험가 이름은 2~16자로 입력하세요.'); return; }
        setBusy(true); setError('');
        try { await onSubmit(mode, username, password, mode === 'signup' ? fisherName.trim() : undefined); }
        catch (err) { setError(err instanceof Error ? err.message : '로그인에 실패했습니다.'); }
        finally { setBusy(false); }
    };
    return <div className="loading-screen login-screen">
        <Leaf size={48}/>
        <span className="beta-badge">OPEN BETA</span>
        <h1>판게아 RPG</h1>
        <p>{mode === 'login' ? '아이디와 비밀번호로 모험을 이어가세요.' : '로그인용 아이디·비밀번호와, 게임에서 보일 모험가 이름을 정하세요.'}</p>
        <form className="panel login-form" onSubmit={submit}>
            <label>아이디<input name="username" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="영문 소문자·숫자·밑줄 3~20자" required/></label>
            <label>비밀번호<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상" required/></label>
            {mode === 'signup' && <label>비밀번호 확인<input name="confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required/></label>}
            {mode === 'signup' && <label>모험가 이름<input name="fisherName" autoComplete="nickname" value={fisherName} maxLength={16} onChange={e => setFisherName(e.target.value)} placeholder="채팅·랭킹에 보이는 이름 · 2~16자" required/><small className="login-hint">아이디는 로그인에만 쓰이고, 다른 모험가에게는 이 이름이 보입니다. 나중에 설정에서 바꿀 수 있습니다.</small></label>}
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="primary" type="submit" disabled={busy}>{busy ? '확인 중…' : mode === 'login' ? '로그인' : '가입하고 시작'}</button>
            <button className="text-button" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>{mode === 'login' ? '처음이라면 가입하기' : '이미 계정이 있다면 로그인'}</button>
        </form>
        <small className="login-note">비밀번호는 복구할 수 없으니 잊지 않도록 보관하세요.</small>
    </div>;
}
