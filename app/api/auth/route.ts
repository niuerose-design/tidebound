import { failure, checkOrigin, readJson, ApiError, switchSlot } from '@/game/server/store';
import { signUp, logIn, logOut, readSessionToken, accountFromRequest, sessionCookie, clearSessionCookie, readSlot, slotCookie } from '@/game/server/auth';
export const dynamic = 'force-dynamic';
const secure = (req: Request) => new URL(req.url).protocol === 'https:';
/** 현재 로그인 여부와 캐릭터 슬롯. */
export async function GET(req: Request) { try {
    const account = await accountFromRequest(req);
    return Response.json({ loggedIn: !!account, slot: account ? readSlot(req) : 0 }, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }
/** { action: 'signup' | 'login' | 'logout', username, password } · { action: 'slot', slot: 1~3 } 캐릭터 슬롯 전환 */
export async function POST(req: Request) { try {
    checkOrigin(req);
    const body = await readJson(req);
    if (body.action === 'logout') {
        await logOut(readSessionToken(req));
        return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie(secure(req)) } });
    }
    if (body.action === 'slot') {
        const account = await accountFromRequest(req);
        if (!account) throw new ApiError('플레이하려면 로그인이 필요합니다.', 401);
        const slot = Number(body.slot);
        const summary = await switchSlot(account, slot, Date.now());
        return Response.json({ ok: true, slot, slots: summary.slots }, { headers: { 'Set-Cookie': slotCookie(slot, secure(req)), 'Cache-Control': 'no-store' } });
    }
    if (body.action !== 'signup' && body.action !== 'login')
        throw new ApiError('올바르지 않은 요청입니다.');
    const session = body.action === 'signup' ? await signUp(body.username, body.password) : await logIn(body.username, body.password);
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    headers.append('Set-Cookie', sessionCookie(session.token, session.expires, secure(req)));
    headers.append('Set-Cookie', slotCookie(1, secure(req)));
    return Response.json({ ok: true }, { headers });
}
catch (e) {
    return failure(e);
} }
