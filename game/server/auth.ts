/** 아이디·비밀번호 계정과 세션. 비밀번호는 PBKDF2-SHA256(무작위 salt)으로만 저장합니다. */
import { db } from './db';

export const SESSION_COOKIE = 'tb_session';
const SESSION_DAYS = 30, ITERATIONS = 120_000;
export class AuthError extends Error { constructor(message: string, public status = 400) { super(message); } }

const hex = (buf: ArrayBuffer | Uint8Array) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const randomHex = (bytes: number) => hex(crypto.getRandomValues(new Uint8Array(bytes)));
async function hashPassword(password: string, salt: string) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: ITERATIONS }, key, 256);
    return hex(bits);
}
function safeEqual(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

export function normalizeUsername(raw: unknown) {
    const name = String(raw ?? '').trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(name)) throw new AuthError('아이디는 영문 소문자·숫자·밑줄 3~20자입니다.');
    return name;
}
function checkPassword(raw: unknown) {
    const pw = String(raw ?? '');
    if (pw.length < 8 || pw.length > 100) throw new AuthError('비밀번호는 8~100자입니다.');
    return pw;
}
export async function signUp(username: unknown, password: unknown) {
    const name = normalizeUsername(username), pw = checkPassword(password), salt = randomHex(16);
    const id = `acct_${randomHex(12)}`;
    const ok = await db().createAccount({ id, username: name, pass_hash: await hashPassword(pw, salt), salt, created_at: Date.now() });
    if (!ok) throw new AuthError('이미 사용 중인 아이디입니다.', 409);
    return startSession(id);
}
export async function logIn(username: unknown, password: unknown) {
    const name = normalizeUsername(username), pw = checkPassword(password);
    const account = await db().getAccountByName(name);
    // 존재하지 않는 아이디도 같은 시간이 걸리도록 해시를 계산합니다.
    const candidate = await hashPassword(pw, account?.salt || 'no-account-salt');
    if (!account || !safeEqual(candidate, account.pass_hash)) throw new AuthError('아이디 또는 비밀번호가 올바르지 않습니다.', 401);
    return startSession(account.id);
}
async function startSession(accountId: string) {
    const token = randomHex(32), expires = Date.now() + SESSION_DAYS * 86400_000;
    await db().createSession(token, accountId, expires);
    return { token, expires, accountId };
}
export async function logOut(token: string | null) { if (token) await db().deleteSession(token); }
export function readSessionToken(req: Request) {
    const cookie = req.headers.get('cookie') || '';
    const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([a-f0-9]{64})`));
    return m ? m[1] : null;
}
export async function accountFromRequest(req: Request) {
    const token = readSessionToken(req);
    return token ? db().getSessionAccount(token, Date.now()) : null;
}
export function sessionCookie(token: string, expires: number, secure: boolean) {
    return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expires).toUTCString()}${secure ? '; Secure' : ''}`;
}
export function clearSessionCookie(secure: boolean) {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}
