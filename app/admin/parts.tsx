'use client';
import { kstIso } from '@/game/data/time';
import { format, formatDuration } from '@/components/game/shared';
import { Button } from '@/components/ui/button';
import { FoldSection } from '@/components/ui/game';
import { field as fieldCls } from '@/components/features/shop/parts';
import { cn } from '@/lib/utils';
import type { AdminSp, AdminPlayer, EventRow, Tab } from './types';
/** v3.413 운영자 페이지 공용 조각(page.tsx 에서 분리): 카드 · 버튼 · 타일 · 접이 · 막대 · SP 내역 · 서식 함수 · 탭 설명. */
export const card = 'rounded-l border border-line bg-surface-2 shadow-1';
export const Primary = (p: React.ComponentProps<typeof Button>) => <Button type="submit" size="sm" {...p} className={cn('bg-accent text-accent-ink hover:bg-accent/90 pointer-coarse:min-h-11', p.className)}/>;
export const Sm = (p: React.ComponentProps<typeof Button>) => <Button type="button" size="sm" variant="outline" {...p} className={cn('pointer-coarse:min-h-11', p.className)}/>;
/** v3.207 특정 모험가 수입 칸: 골드 · 경험치 · 숙련(시간별 막대 색). */
export const INCOME_KINDS = [['gold', '골드', '#e7be71'], ['exp', '경험치', '#8fd0ff'], ['mastery', '숙련', '#b99cff']] as const;
/** 큰 골드: 1.2조 · 3.4억 · 5.6만. */
export const big = (v: number) => v >= 1e12 ? `${(v / 1e12).toFixed(2)}조` : v >= 1e8 ? `${(v / 1e8).toFixed(2)}억` : v >= 1e4 ? `${(v / 1e4).toFixed(1)}만` : String(Math.round(v));
/** 운영 페이지 소식 테스트 종류(server/news.ts NEWS_SAMPLES와 같은 순서). */
export const NEWS_KINDS: [string, string][] = [['onyx', '칠흑 장신구'], ['ascend', '승천'], ['tier5', '5차 전직'], ['abyss', '무릉도장 50층'], ['star22', '22성 강화'], ['general', '진급(하사)'], ['onyxAwaken', '칠흑 각성'], ['core', '보스 코어'], ['coreAwaken', '코어 완전 각성'], ['hacker', '해커 전직(빨간 줄)'], ['god', '제단 · 신 깨어남'], ['raid', '제단 · 월드보스 출현']];
export const BLESS_NAMES: Record<string, string> = { gold: '풍요의 축복', exp: '성장의 축복', mimic: '까미의 축복', nuri: '누리의 축복' };
/** v27.32 통계 카드 한 칸. */
export const Tile = ({ label, value, note }: { label: string; value: string; note?: string }) => <div className={cn(card, 'grid gap-0.5 p-3')}><div className="text-xs text-ink-3">{label}</div><div className="font-num text-l font-bold">{value}</div>{note && <div className="text-xs text-ink-3">{note}</div>}</div>;
/** 화살표로 접었다 펴는 칸. note는 접혀 있어도 제목 옆에 보입니다. */
export function Fold({ title, note, open = true, children }: { title: string; note?: React.ReactNode; open?: boolean; children: React.ReactNode }) {
    return <FoldSection title={title} summary={note} defaultOpen={open}><div className="grid gap-2 text-s">{children}</div></FoldSection>;
}
/** 탭 설명(접힌 ‘도움말’에 들어갑니다). */
export const HELP: Record<Tab, string> = {
    life: '이름이나 아이디로 찾아 골드·세계석을 조정하거나 이번 생을 초기화합니다. 초기화는 레벨·골드·일반 장비·직업·능력치·진행 중 던전만 되돌리고, 환생 횟수·세계석·연구·유물·도감·스킬 성장은 그대로 둡니다.',
    events: '기간 동안 모든 모험가에게 배율을 겁니다(겹치면 곱함). 배율을 모두 1로 두면 이름만 배너 공지로 뜹니다.',
    closures: '점검할 사냥터·던전의 입장을 막습니다. 안에 있던 모험가는 다음 동기화 때 보상 없이 나옵니다(사냥터는 더 앞의 열린 곳으로). 서버마다 최대 30초 걸립니다.',
    stats: '모든 세이브를 읽어 집계합니다(불러올 때만 계산). 활동은 마지막 저장 시각 기준입니다.',
    news: '기록판 ‘소식’ 탭에 실제와 같은 줄을 올려 봅니다. 모두에게 보이므로 기본으로 [테스트]를 붙입니다. 아래 ‘지우기’로 소식 · 전체 채팅 · 길드 채팅을 통째로 지울 수 있습니다(되돌릴 수 없음).',
    market: '증권거래소 장 폐쇄(켜면 풀 때까지 매수 · 매도 막힘)와 서킷브레이커(정한 시간 동안만 막힘, 끝나면 저절로 재개)를 겁니다. 시세는 계산식이라 계속 흐르고, 막는 것은 거래입니다. 사유는 유저 화면에 그대로 보입니다. 다른 서버에는 최대 30초 뒤 반영됩니다.',
    income: '사냥으로 번 골드 · 처치 경험치 · 현재 직업 숙련을 플레이 1시간 단위로 기록합니다. 시간당 값은 최근 3시간 평균이고, 1시간을 못 채웠으면 추정(≈)합니다. 판매·환불과 누리 보너스 경험치는 빠지고, 경험치 기록은 환생하면 새로 쌓입니다. 모험가를 검색하면 경험치·숙련도 함께 보입니다.',
};
export const muted = 'text-ink-3';
export const rowItem = 'flex items-center justify-between gap-2.5 border-t border-line px-2.5 py-2';
/** 막대 목록: 가장 큰 값을 100%로 봅니다. */
export function Bars({ title, rows, total }: { title: string; rows: { label: string; count: number }[]; total: number }) {
    const max = Math.max(1, ...rows.map(r => r.count));
    return <div className={cn(card, 'grid gap-2 p-3.5')}><h2 className="font-display text-s font-bold">{title}</h2>{!rows.length && <p className="text-s text-ink-3">없습니다.</p>}
        <div className="grid gap-1.5">{rows.map(r => <div key={r.label} className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-2 text-s">
            <span className="truncate">{r.label}</span>
            <span className="h-2.5 rounded-full bg-surface-0"><span className="block h-full rounded-full bg-accent" style={{ width: `${r.count / max * 100}%` }}/></span>
            <span className="min-w-[72px] text-right font-num text-ink-2">{format(r.count)}{total ? <small className="text-ink-3"> ({Math.round(r.count / total * 100)}%)</small> : null}</span></div>)}</div></div>;
}
export const MULTS = [['exp', '경험치'], ['gold', '골드'], ['drop', '장비 드롭'], ['mastery', '숙련'], ['mimic', '까미 출현'], ['nuri', '누리 출현']] as const;
/** datetime-local(한국 시간으로 입력) → ISO. */
export const kstToIso = (v: string) => v ? `${v}:00+09:00` : '';
export const isoToKst = (iso: string) => kstIso(Date.parse(iso)).slice(0, 16);
/** 진행 중 · 시작 전 · 종료됨(목록을 불러온 시각 기준). */
export const phase = (e: EventRow, at: number) => e.live ? ' · 진행 중' : Date.parse(e.from) > at ? ' · 시작 전' : ' · 종료됨';
export const when = (e: EventRow) => `${isoToKst(e.from).replace('T', ' ')} ~ ${isoToKst(e.until).replace('T', ' ')} (한국 시간)`;
export const mults = (e: EventRow) => MULTS.filter(([k]) => (e[k] ?? 1) !== 1).map(([k, label]) => `${label} ×${e[k]}`).join(' · ') || '배율 없음(공지)';
export const field = fieldCls;
const sum = (xs: { sp: number }[]) => xs.reduce((a, x) => a + x.sp, 0);
/** v27.28 SP 내역: 받은 연구·안 받은 연구·쓴 곳·남은 기록. */
export function SpDetail({ sp }: { sp: AdminSp }) {
    const got = sp.research.filter(r => r.claimed), waiting = sp.research.filter(r => !r.claimed);
    return <div className="mt-2 grid gap-1 border-t border-line pt-2 text-s">
        <div><b>보유 SP {sp.have}</b> <span className="text-ink-3">· 스킬에 쓴 SP {sum(sp.spentSkills)} · 한계돌파에 쓴 SP {sum(sp.limitBreaks)}</span></div>
        <div>보스 첫 정복 연구 받음: {got.length ? got.map(r => `${r.name}(+${r.sp})`).join(', ') : '없음'}</div>
        <div>정복했지만 아직 안 받음: {waiting.length ? <b className="text-gold-ink">{waiting.map(r => `${r.name}(+${r.sp})`).join(', ')}</b> : '없음'}</div>
        {sp.spentSkills.length > 0 && <div className="text-ink-3">강화·계승: {sp.spentSkills.map(x => `${x.name} ${x.sp}`).join(', ')}</div>}
        {sp.limitBreaks.length > 0 && <div className="text-ink-3">한계돌파: {sp.limitBreaks.map(x => `${x.name} ${x.sp}`).join(', ')}</div>}
        <div className="text-ink-3">최근 기록의 SP 줄{sp.logs.length ? '' : ': 없음(기록은 최근 70줄만 남습니다)'}</div>
        {sp.logs.length > 0 && <ul className="list-disc pl-4 text-ink-3">{sp.logs.map((t, i) => <li key={i}>{t}</li>)}</ul>}
    </div>;
}
export const line = (p: AdminPlayer) => `${p.name} · ${brief(p)}`;
export const brief = (p: AdminPlayer) => `Lv.${p.level} ${p.job} · ${p.rank} · 환생 ${p.rebirths}회 · 세계석 ${p.pearls} · SP ${p.sp.have} · 골드 ${p.gold.toLocaleString()}${p.inDungeon ? ' · 던전 진행 중' : ''}`;
/** v27.63 환생 시간: 이번 생 경과 · 평균 환생 시간. */
export const lifeLine = (p: AdminPlayer) => [p.lifeMs !== null ? `이번 생 ${formatDuration(p.lifeMs)}${p.lifePartial ? '(업데이트 이후)' : ''}` : '', p.paceMs !== null ? `평균 환생 ${formatDuration(p.paceMs)}` : ''].filter(Boolean).join(' · ');

/** 탭 차례와 이름. */
export const TABS: [Tab, string][] = [['life', '모험가 관리'], ['events', '서버 이벤트'], ['closures', '입장 관리'], ['stats', '통계'], ['income', '사냥 수입'], ['news', '소식 테스트'], ['market', '증권거래소']];
/** v3.190 소식 · 채팅 전체 지우기 범위. 되돌릴 수 없으므로 확인창을 거칩니다. */
export const CLEAR_SCOPES: [string, string, string][] = [['news', '소식 전체 지우기', '기록판 ‘소식’ 탭의 모든 줄(모험가 소식 · 제단 · 해커 공지 · 운영 공지)'], ['global', '전체 채팅 지우기', '전체 채팅의 모든 줄'], ['guild', '길드 채팅 모두 지우기', '모든 길드의 길드 채팅'], ['all', '소식 · 채팅 모두 지우기', '소식 · 전체 채팅 · 모든 길드 채팅']];
/** 반응형 격자: 칸 최소 폭(px)만 받습니다. */
export const grid = (min: number) => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap: 10 }) as const;
