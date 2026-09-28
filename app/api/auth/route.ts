import { failure, checkOrigin, readJson, ApiError } from '@/game/server/store';
import { signUp, logIn, logOut, readSessionToken, accountFromRequest, sessionCookie, clearSessionCookie } from '@/game/server/auth';
export const dynamic = 'force-dynamic';
const secure = (req: Request) => new URL(req.url).protocol === 'https:';
/** 현재 로그인 여부. */
export async function GET(req: Request) { try {
    return Response.json({ loggedIn: !!(await accountFromRequest(req)) }, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }
/** { action: 'signup' | 'login' | 'logout', username, password } */
export async function POST(req: Request) { try {
    checkOrigin(req);
    const body = await readJson(req);
    if (body.action === 'logout') {
        await logOut(readSessionToken(req));
        return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie(secure(req)) } });
    }
    if (body.action !== 'signup' && body.action !== 'login')
        throw new ApiError('올바르지 않은 요청입니다.');
    const session = body.action === 'signup' ? await signUp(body.username, body.password) : await logIn(body.username, body.password);
    return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie(session.token, session.expires, secure(req)), 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }
