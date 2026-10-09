import { session, checkOrigin, mutate, failure, actionBody, ApiError, syncAbyssBoard, syncAccount, syncDuelSeason, afterAscend } from '@/game/server/store';
import { syncGuild } from '@/game/server/guild';
import { syncAltarStatus } from '@/game/server/altar';
import { syncHackFeed } from '@/game/server/hacks';
import { syncCrew, flushCrew, type CrewApply } from '@/game/server/crews';
import { buildCatalog } from '@/game/server/secrecy';
import { trimLogs } from '@/game/systems/log-delta';
import { announceHacker } from '@/game/server/hacks';
import { postPlayerNews } from '@/game/server/news';
import { collectNews, type NewsEvent } from '@/game/systems/news';
import { vaultAfterAscend } from '@/game/server/vault';
import { addLog } from '@/game/systems/state';
import { marketFeed } from '@/game/systems/market';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) { try {
    checkOrigin(req);
    const { account, slot, id } = await session(req), a = await actionBody(req);
    // v3.18 해킹 실행은 서버 공유 설정에 써야 해서 /api/hack에서만 받습니다.
    if (a.type === 'hackRun') throw new ApiError('해킹은 해킹 화면에서 실행하세요.');
    try {
        let announce = '';
        let crewFlush: CrewApply | null | undefined;
        let news: NewsEvent[] = [];
        const out = await mutate(id, a, async s => { const now = Date.now(); announce = s.jobAnnounce || ''; delete s.jobAnnounce; news = collectNews(s, now); if (a.type === 'ascend') { await afterAscend(account, id, now); const gone = await vaultAfterAscend(account, slot, now); if (gone) addLog(s, `계정 금고에 이 캐릭터가 넣은 칠흑 장신구 ${gone}개도 함께 사라졌습니다.`, 'system'); } await syncAccount(account, slot, s, now); await syncGuild(account, s, now); await syncDuelSeason(id, s, now); await syncAbyssBoard(id, s, now); await syncAltarStatus(s, now, id); await syncHackFeed(s, id, now); await syncCrew(id, s, now);
            // v3.32 합동 작전 기여는 침투 작전이 끝난 뒤 한 번만 올리고, 저장 충돌로 다시 돌면 세이브 변화만 다시 적용합니다.
            if (crewFlush === undefined) crewFlush = await flushCrew(id, s, now);
            crewFlush?.(s); });
        // v3.26 해커 계열 전직 알림(익명, 채팅에 빨간 줄).
        if (announce) await announceHacker(announce, Date.now());
        // v3.39 모험가 소식(칠흑·승천·5차 전직·무릉도장·22성·장성 진급). 저장이 끝난 뒤 한 번만 올립니다.
        if (news.length) await postPlayerNews(id, out.state, news, Date.now());
        // v27.62 동기화는 클라이언트가 가진 마지막 로그 뒤의 로그만 보냅니다(log-delta.ts). v3.92 다른 행동도 같게(키가 없거나 못 찾으면 전체).
        const trimmed = trimLogs(out.state.logs, (a as { logKey?: unknown }).logKey);
        // v3.43 정보 비공개 카탈로그(docs/concept.md 10장). 화면은 단계마다 비밀 표 대신 이것을 읽게 됩니다.
        // v3.44 화면이 가진 카탈로그 키(catalogKey)와 같으면 다시 보내지 않습니다(비밀 직업 표가 커서).
        const catalog = await buildCatalog(out.state, Date.now(), (a as { catalogKey?: unknown }).catalogKey);
        // v3.212 증권거래소(공유 시장): 화면이 거래소를 보고 있을 때만(marketKnown) 가진 틱 뒤의 시세를 얹습니다. 시세는 인스턴스 메모리에서 나눠 쓰고, 새 틱이 없으면 아무것도 붙이지 않습니다.
        const marketKnown = (a as { marketKnown?: unknown }).marketKnown, market = marketKnown !== undefined ? marketFeed(marketKnown, Date.now()) : null;
        const extra = { ...(catalog ? { catalog } : {}), ...(market ? { market } : {}) };
        return Response.json(trimmed ? { ...out, state: { ...out.state, logs: trimmed.logs }, logDelta: trimmed.delta, ...extra } : { ...out, ...extra }, { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (e) {
        if (e instanceof ApiError)
            throw e;
        if (e instanceof Error && !/Database|database/i.test(e.message))
            throw new ApiError(e.message);
        throw e;
    }
}
catch (e) {
    return failure(e);
} }
