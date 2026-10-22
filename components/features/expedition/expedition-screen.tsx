'use client';
/**
 * v3.405 원정대(오토배틀러) 화면(새 토대): 12라운드 · 3막, 상점 5장 → 벤치 → 보드(앞줄 · 뒷줄 4칸) → 전투. 드래그 없이 버튼만으로 390px에서도 쓰이게.
 * 틀(카드 · 탭 · 접이 · 타일 · 막대 · 버튼)은 토큰 · shadcn · 게임 키트이고, 보드 · 칸 · 상점 카드 · 시너지 칩 · 증강/상자 선택지 · 도감 격자 · 테마/피부 카드 · 진행 줄 · 전투 재생 같은
 * 판 연출 CSS(exp-board · exp-cell · exp-card · theme-* · exp-skin-* · exp-arena …)는 전투 장면처럼 예외로 옛 클래스를 그대로 씁니다. 서버 행동은 옛 expedition-panel 그대로.
 */
import { useState, type ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EXPEDITION, SEASON_REWARDS, weeklyRule, weeklyRuleById, ABYSS, DIFFICULTIES, difficultyOf, difficultyUnlocked, activeSet, nextSet, setById, setUnits } from '@/game/data/expedition';
import { weekKey, dayKey } from '@/game/data/time';
import { useNow } from '@/components/game/shared';
import { SectionHeader, FoldSection, formatExact as format } from '@/components/ui/game';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PanelProps } from '@/components/game/panel-props';
import { Card, Head, Note, Primary, Row } from './parts';
import { DiffPicker, QuestBox } from './lobby';
import { ShareBox, ThemeBox } from './style';
import { MasteryBox, SetBanner, SetMasteryBox, LinkBox } from './growth';
import { RecentBox, FeatBox, CodexBox } from './records';
import { RunView } from './run';

/** v3.413 화면을 탭 · 판별 파일로 나눴습니다(parts · lobby · style · growth · records · run). 동작과 문구는 그대로입니다. */
export function ExpeditionScreen({ s, send, busy }: PanelProps) {
    const r = s.expedition;
    // 24단계: 화면을 탭으로 나눕니다(원정 · 과제 · 성장 · 기록 · 꾸미기). 고른 탭은 기기에 기억.
    const [tab, setTabState] = useState(() => { try { const v = localStorage.getItem('exp-tab') || 'play'; return ['play', 'quests', 'growth', 'records', 'style'].includes(v) ? v : 'play'; } catch { return 'play'; } });
    const setTab = (v: string) => { setTabState(v); try { localStorage.setItem('exp-tab', v); } catch { /* 저장 불가 */ } };
    // 23단계 소셜: 보드 공유 코드 복사 · 목표 보드 코드 입력. 연출 보상: 보드 테마.
    const [copied, setCopied] = useState('');
    const copy = async (key: string, text: string) => { try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(c => c === key ? '' : c), 1500); } catch { /* 클립보드 없음 */ } };
    // 16단계: 출발 난이도(기기에 기억). 열리지 않은 단계는 잠김.
    const unlocked = difficultyUnlocked(s.expeditionDiffClears);
    const [diff, setDiffState] = useState(() => { try { const v = Number(localStorage.getItem('exp-difficulty')); return v >= 1 && v <= DIFFICULTIES.length ? v : 1; } catch { return 1; } });
    const chosenDiff = Math.min(diff, unlocked), setDiff = (n: number) => { setDiffState(n); try { localStorage.setItem('exp-difficulty', String(n)); } catch { /* 저장 불가 */ } };
    // 11단계: 이번 주 규칙(출발 화면용, useNow는 처음엔 0이라 하이드레이션 뒤에 채워짐) · 숙련.
    const now = useNow(60_000), thisWeek = now ? weeklyRule(weekKey(now)).id : null;
    // 20단계 분기 세트: 지금 세트 · 다음 세트 · 유닛 풀 · 세트 숙련(세트가 다르면 처음부터).
    const curSet = now ? activeSet(now) : setById(undefined), upcoming = now ? nextSet(now) : undefined, pool = setUnits(curSet.id);
    const sm = s.expeditionSetMastery && s.expeditionSetMastery.set === curSet.id ? s.expeditionSetMastery : { set: curSet.id, level: 1, xp: 0, claimed: [] as number[] };
    const weekRule = thisWeek ? weeklyRuleById(thisWeek) : undefined;
    // 13단계: 과제(일일 · 주간) · 도감.
    const q = s.expeditionQuests, stale = !!(q && now && (q.day !== dayKey(now) || q.week !== weekKey(now)));
    const questDone = q ? [...q.daily, ...q.weekly].filter(x => x.done).length : 0, questAll = q ? q.daily.length + q.weekly.length : 0;
    const recent = s.expeditionRecent || [];
    const weekBanner = weekRule ? <Note tone="info">이번 주 규칙 · <b>{weekRule.name}</b> · {weekRule.desc} <small className="text-ink-3">(매주 월요일 바뀜 · 판을 시작할 때 규칙이 붙어 끝까지 유지)</small></Note> : null;

    // 18단계(모바일 정리): 소개는 한 줄로 줄이고 긴 설명은 접어 둡니다.
    const introShort = `${EXPEDITION.rounds}라운드 · 3막 오토배틀러. 유닛을 사서 보드에 놓고, 시너지를 켜고, 막 보스를 넘으세요.`;
    const intro = <><SectionHeader as="h1" eyebrow="EXPEDITION" title="원정대" description={introShort}/><FoldSection level={3} title="규칙 자세히"><p className="text-xs leading-relaxed text-ink-2">{`${EXPEDITION.rounds}라운드 · 3막 오토배틀러. 라운드마다 받는 골드로 상점에서 유닛을 사 보드에 배치하고 웨이브 · 다른 모험가의 원정대(2라운드부터)와 싸웁니다. 막 끝(4 · 8 · 12라운드)에는 보스가 나옵니다. 같은 유닛 3개는 ★이 오르고, 지역 · 역할이 겹치면 시너지가 켜집니다. 승리마다 세계석 ${EXPEDITION.pearlsPerWin}, 막 보스 +${EXPEDITION.actPearls}, 완주 +${EXPEDITION.clearPearls}. 2 · 5 · 8라운드에는 판 전체에 걸리는 증강을 고르고, 주마다 규칙이 바뀝니다. 횟수 제한은 없습니다.`}</p></FoldSection></>;
    // 9단계: 지난 시즌 정산 내역과 시즌 보상표.
    const season = s.expeditionSeasonLast ? <Note tone="gold">지난 시즌 {s.expeditionSeasonLast.season} · {s.expeditionSeasonLast.rank ? `${s.expeditionSeasonLast.rank}위` : '순위 밖'} / {s.expeditionSeasonLast.total}명 · 최고 {s.expeditionSeasonLast.wins}승 · 세계석 +{s.expeditionSeasonLast.pearls} 받음</Note> : null;
    const rewardTable = <Note>월간 순위 보상(한국 시간 매월 1일 이후 첫 출발 때 지급): {SEASON_REWARDS.map(x => `${x.label} ${x.pearls}`).join(' · ')}.</Note>;
    const questLabel = q ? `과제 ${questDone}/${questAll}` : '과제';
    const shell = (main: ReactNode) => <div className="grid gap-4 text-ink-1">{intro}
        <Tabs value={tab} onValueChange={setTab} className="grid gap-3">
            <TabsList className="w-full flex-wrap group-data-[orientation=horizontal]/tabs:h-auto [&>button]:h-auto [&>button]:min-h-9 [&>button]:pointer-coarse:min-h-11" aria-label="원정대 화면">
                <TabsTrigger value="play">{r && !r.done ? `원정 · ${r.round}R` : '원정'}</TabsTrigger>
                <TabsTrigger value="quests" className={cn(q && questDone < questAll && 'after:ml-1 after:inline-block after:size-1.5 after:rounded-full after:bg-warn')}>{questLabel}</TabsTrigger>
                <TabsTrigger value="growth">성장</TabsTrigger>
                <TabsTrigger value="records">기록</TabsTrigger>
                <TabsTrigger value="style">꾸미기</TabsTrigger>
            </TabsList>
            <TabsContent value="play" className="grid gap-3">{main}</TabsContent>
            <TabsContent value="quests"><Card aria-label="과제"><QuestBox q={q} stale={stale}/>{weekBanner}</Card></TabsContent>
            <TabsContent value="growth"><Card aria-label="성장"><Head title="성장" aside="숙련 · 특전 · 명성 · 세트 숙련 · 리그 · 본편 연결"/><MasteryBox s={s} send={send} busy={busy}/><SetMasteryBox s={s} curSet={curSet} sm={sm} now={now}/><LinkBox s={s} pool={pool} chosenDiff={chosenDiff}/></Card></TabsContent>
            <TabsContent value="records"><Card aria-label="기록"><Head title="기록" aside="최근 판 · 도전 · 도감 · 시즌"/>{recent.length ? <RecentBox s={s} copy={copy} copied={copied}/> : <Note>아직 마친 판이 없습니다.</Note>}<FeatBox s={s}/><CodexBox s={s} curSet={curSet} pool={pool}/>{season}{rewardTable}</Card></TabsContent>
            <TabsContent value="style"><Card aria-label="꾸미기"><Head title="꾸미기 · 공유" aside="보드 공유 코드 · 테마 · 유닛 피부"/><ShareBox s={s} send={send} busy={busy} copy={copy} copied={copied}/><ThemeBox s={s} send={send} busy={busy} pool={pool}/></Card></TabsContent>
        </Tabs></div>;
    if (!r || (r.done && !r.reward && r.reward !== 0)) return shell(<Card>
        {season}{weekBanner}
        <SetBanner curSet={curSet} upcoming={upcoming} now={now}/><DiffPicker s={s} busy={busy} unlocked={unlocked} chosenDiff={chosenDiff} setDiff={setDiff}/>
        <Primary size="lg" className="justify-self-start" disabled={busy} onClick={() => send({ type: 'expeditionStart', id: String(chosenDiff) })}>{difficultyOf(chosenDiff).icon} {difficultyOf(chosenDiff).name} 난이도로 원정 출발{s.expeditionBest ? ` · 최고 ${s.expeditionBest}승` : ''}</Primary>
        <Note>유닛 {pool.length}종({curSet.name} 세트) · 지역 6 · 역할 6. 보드는 앞줄 4 · 뒷줄 4칸이고 배치 수는 판 레벨로 늘어납니다(전투를 마칠 때마다 경험치 +{EXPEDITION.roundXp.base}부터 라운드마다 +{EXPEDITION.roundXp.perRound}씩 더, 상점에서 {EXPEDITION.xp} G로 더 살 수 있음). 수호 · 돌격은 앞줄, 마력 · 망령은 뒷줄이 유리합니다.</Note>
        {rewardTable}
    </Card>);
    if (r.done) return shell(<Card>
        <h2 className="font-display text-l font-bold">원정 종료{r.difficulty && r.difficulty > 1 ? ` · ${difficultyOf(r.difficulty).icon} ${difficultyOf(r.difficulty).name}` : ''} · {r.wins}승{r.cleared ? ' · 완주' : ` · ${Math.min(r.round, EXPEDITION.rounds)}라운드까지`}{r.abyss ? ` · 심연 ${r.abyss}라운드` : ''}</h2><p>세계석 +{format(r.reward || 0)}{r.cleared ? ` · 완주 +${EXPEDITION.clearPearls}` : ''}{r.acts ? ` · 막 보스 ${r.acts} × ${EXPEDITION.actPearls}` : ''}{r.abyss && Math.floor(r.abyss / ABYSS.bonusEvery) ? ` · 심연 보너스 +${Math.floor(r.abyss / ABYSS.bonusEvery) * ABYSS.bonus}` : ''}{s.expeditionBest ? ` · 최고 ${s.expeditionBest}승` : ''}</p>
        <Row><Primary disabled={busy} onClick={() => send({ type: 'expeditionStart', id: String(chosenDiff) })}>바로 다시 출발 · {difficultyOf(chosenDiff).icon} {difficultyOf(chosenDiff).name}</Primary><Button type="button" size="sm" variant="outline" className="pointer-coarse:min-h-11" disabled={busy} onClick={() => send({ type: 'expeditionClear' })}>닫기</Button></Row>
        <SetBanner curSet={curSet} upcoming={upcoming} now={now}/><DiffPicker s={s} busy={busy} unlocked={unlocked} chosenDiff={chosenDiff} setDiff={setDiff}/>{recent.length ? <RecentBox s={s} copy={copy} copied={copied}/> : null}{weekBanner}
    </Card>);
    return shell(<RunView s={s} send={send} busy={busy} r={r} copy={copy} copied={copied}/>);
}
