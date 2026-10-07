'use client';
/** v27.88 통계: 세이브에 쌓인 기록을 한 화면에 모아 보여 줍니다(계산만, 상태는 바꾸지 않음). */
import type { State } from '@/game/types';
import { Heading, Fold, format } from './shared';
import { RebirthHistory, formatDuration } from './rebirth-history';
import { FISH, PLACES, PLAIN_DUNGEONS } from '@/game/data/world';
import { PROGRESSION } from '@/game/data/progression';
import { bookStage } from '@/game/systems/book';
import { BALANCE } from '@/game/data/balance';
import { LiveRatesCard } from './live-rates-card';

type Row = [label: string, value: string];
function Block({ title, rows, note }: { title: string; rows: Row[]; note?: string }) {
    return <Fold id={`stats:${title}`} title={title} note={note} className="panel stats-block">
        <ul className="bonus-grid">{rows.map(([label, value]) => <li key={label}><span>{label}</span><strong>{value}</strong></li>)}</ul>
    </Fold>;
}
const sum = (o?: Record<string, number>) => Object.values(o || {}).reduce((a, n) => a + (n || 0), 0);

export function Stats({ s }: { s: State }) {
    const discovered = FISH.filter(f => (s.book[f.id] || 0) > 0).length, complete = FISH.filter(f => (s.book[f.id] || 0) >= PROGRESSION.fishComplete).length;
    // v3.95 도감과 같은 기준(연구 단계, 몬스터마다 최대 6)으로 셉니다.
    const research = FISH.reduce((a, f) => a + bookStage(s, f.id), 0);
    const variants = Object.values(s.variantBook || {}).reduce((a, row) => a + sum(row as Record<string, number>), 0);
    const clears = PLAIN_DUNGEONS.map(d => [d.name, s.clears?.[d.id] || 0] as const);
    const rg = s.randomGameStats;
    const duels = s.wins + s.losses;
    return <>
        <Heading eyebrow="STATISTICS" title="통계" description="지금까지 쌓은 모험의 기록입니다."/>
        <Fold id="stats:live" title="실시간 효율" className="stats-fold-plain"><LiveRatesCard s={s}/></Fold>
        <Block title="모험" rows={[
            ['사냥 시간(부재중 정산 포함)', formatDuration(s.playMs || 0)],
            ['누적 처치', `${format(s.kills)}마리`],
            ['쓰러짐', `${format(s.deaths)}회`],
            ['환생', `${format(s.rebirths)}회`],
            ['최고 레벨', `Lv.${Math.max(s.peakLevel || 0, s.level)}`],
            ['지금 레벨', `Lv.${s.level}`],
        ]}/>
        <Block title="재화" rows={[
            ['골드', `${format(Math.floor(s.gold))} G`],
            ['세계석', format(s.pearls)],
            ['정수', format(s.essence || 0)],
            ['SP', format(s.sp)],
        ]}/>
        <Block title="던전" rows={[
            ['던전 정복 합계', `${format(clears.reduce((a, [, n]) => a + n, 0))}회`],
            ['무릉도장 최고 층', `${format(s.abyssBest || 0)}층`],
            ['랜덤게임 최고 웨이브', rg ? `${format(rg.best)}웨이브` : '기록 없음'],
            ['랜덤게임 입장 · 받고 나감', rg ? `${format(rg.runs)}회 · ${format(rg.cashed)}회` : '기록 없음'],
            ...clears.map(([name, n]) => [name, `${format(n)}회`] as Row),
        ]}/>
        <Block title="도감 · 변종" rows={[
            ['발견한 몬스터', `${discovered} / ${FISH.length}종`],
            ['완성한 몬스터', `${complete} / ${FISH.length}종`],
            ['몬스터 연구 단계 합계', `${format(research)} / ${format(FISH.length * BALANCE.bookMilestones.length)}`],
            ['변종 처치', `${format(variants)}마리`],
            ['황금 개체 처치', `${format(sum(s.goldenBook))}마리`],
        ]}/>
        <Block title="사냥터 최고 난이도" note="사냥터마다 처치한 가장 높은 난이도" rows={PLACES.map(st => [st.name, `${s.tideBest?.[st.id] || 0}`] as Row)}/>
        <Block title="결투" rows={[
            ['레이팅', format(s.rating)],
            ['전적', duels ? `${format(s.wins)}승 ${format(s.losses)}패 (승률 ${Math.round(s.wins / duels * 100)}%)` : '기록 없음'],
        ]}/>
        <Fold id="stats:rebirths" title="환생 기록" className="stats-fold-plain"><RebirthHistory s={s}/></Fold>
    </>;
}
