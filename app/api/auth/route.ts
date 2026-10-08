import { failure, checkOrigin, readJson, ApiError, switchSlot } from '@/game/server/store';
import { signUp, logIn, logOut, readSessionToken, accountFromRequest, sessionCookie, clearSessionCookie, readSlot, slotCookie } from '@/game/server/auth';
import { allow, clientIp } from '@/game/server/throttle';
import { newState } from '@/game/systems/engine';
import { db } from '@/game/server/db';
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
    // 베타 공개 대비: 한 IP에서 가입은 10분에 5번, 로그인 시도는 5분에 20번까지.
    if (body.action === 'signup' && !allow(`signup:${clientIp(req)}`, 5, 10 * 60 * 1000)) throw new ApiError('가입 요청이 너무 잦습니다. 잠시 뒤 다시 시도하세요.', 429);
    if (body.action === 'login' && !allow(`login:${clientIp(req)}`, 20, 5 * 60 * 1000)) throw new ApiError('로그인 시도가 너무 잦습니다. 잠시 뒤 다시 시도하세요.', 429);
    if (body.action !== 'signup' && body.action !== 'login')
        throw new ApiError('올바르지 않은 요청입니다.');
    // v26.8 가입 때 모험가 이름(2~16자)을 함께 받아 첫 캐릭터에 바로 적용합니다. 이름이 올바르지 않으면 계정을 만들기 전에 거절합니다.
    const playerName = body.action === 'signup' ? String(body.name ?? '').trim() : '';
    if (body.action === 'signup' && (playerName.length < 2 || playerName.length > 16)) throw new ApiError('모험가 이름은 2~16자로 입력하세요.');
    const session = body.action === 'signup' ? await signUp(body.username, body.password) : await logIn(body.username, body.password);
    if (body.action === 'signup') { const now = Date.now(); await db().createPlayerIfMissing(session.accountId, JSON.stringify({ ...newState(now), name: playerName }), now); }
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    headers.append('Set-Cookie', sessionCookie(session.token, session.expires, secure(req)));
    headers.append('Set-Cookie', slotCookie(1, secure(req)));
    return Response.json({ ok: true }, { headers });
}
catch (e) {
    return failure(e);
} }
