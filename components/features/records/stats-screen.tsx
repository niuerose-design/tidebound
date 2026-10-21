'use client';
/** v3.399 통계(새 토대): 세이브에 쌓인 기록을 접는 구역으로 모아 보여 줍니다(계산만, 상태는 바꾸지 않음). */
import type { State } from '@/game/types';
import { SectionHeader, FoldSection, KeyValueList, formatExact } from '@/components/ui/game';
import { formatDuration } from '@/components/game/shared';
import { LiveRatesCard } from '@/components/game/live-rates-card';
import { RebirthHistory } from '@/components/features/legacy';
import { MONSTERS, BASE_STAGES, PLAIN_DUNGEONS } from '@/game/data/world';
import { PROGRESSION } from '@/game/data/progression';
import { bookStage } from '@/game/systems/book';
import { BALANCE } from '@/game/data/balance';

const fmt = formatExact;
type Row = [label: string, value: string];
function Block({ title, rows, note, open }: { title: string; rows: Row[]; note?: string; open?: boolean }) {
    return <FoldSection title={title} summary={note} defaultOpen={open}><KeyValueList columns={2} items={rows.map(([key, value]) => ({ key, value }))}/></FoldSection>;
}
const sum = (o?: Record<string, number>) => Object.values(o || {}).reduce((a, n) => a + (n || 0), 0);

export function StatsScreen({ s }: { s: State }) {
    const discovered = MONSTERS.filter(f => (s.book[f.id] || 0) > 0).length, complete = MONSTERS.filter(f => (s.book[f.id] || 0) >= PROGRESSION.monsterComplete).length;
    // v3.95 도감과 같은 기준(연구 단계, 몬스터마다 최대 6)으로 셉니다.
    const research = MONSTERS.reduce((a, f) => a + bookStage(s, f.id), 0);
    const variants = Object.values(s.variantBook || {}).reduce((a, row) => a + sum(row as Record<string, number>), 0);
    const clears = PLAIN_DUNGEONS.map(d => [d.name, s.clears?.[d.id] || 0] as const);
    const duels = s.wins + s.losses;
    return <div className="grid gap-4 text-ink-1">
        <SectionHeader as="h1" eyebrow="STATISTICS" title="통계" description="지금까지 쌓은 모험의 기록입니다."/>
        <FoldSection title="실시간 효율" defaultOpen><LiveRatesCard s={s}/></FoldSection>
        <Block title="모험" open rows={[
            ['사냥 시간(부재중 정산 포함)', formatDuration(s.playMs || 0)],
            ['누적 처치', `${fmt(s.kills)}마리`],
            ['쓰러짐', `${fmt(s.deaths)}회`],
            ['환생', `${fmt(s.rebirths)}회`],
            ['최고 레벨', `Lv.${Math.max(s.peakLevel || 0, s.level)}`],
            ['지금 레벨', `Lv.${s.level}`],
        ]}/>
        <Block title="재화" rows={[
            ['골드', `${fmt(Math.floor(s.gold))} G`],
            ['세계석', fmt(s.pearls)],
            ['정수', fmt(s.essence || 0)],
            ['SP', fmt(s.sp)],
        ]}/>
        <Block title="던전" rows={[
            ['던전 정복 합계', `${fmt(clears.reduce((a, [, n]) => a + n, 0))}회`],
            ['무릉도장 최고 층', `${fmt(s.abyssBest || 0)}층`],
            ...clears.map(([name, n]) => [name, `${fmt(n)}회`] as Row),
        ]}/>
        <Block title="도감 · 변종" rows={[
            ['발견한 몬스터', `${discovered} / ${MONSTERS.length}종`],
            ['완성한 몬스터', `${complete} / ${MONSTERS.length}종`],
            ['몬스터 연구 단계 합계', `${fmt(research)} / ${fmt(MONSTERS.length * BALANCE.bookMilestones.length)}`],
            ['변종 처치', `${fmt(variants)}마리`],
            ['황금 개체 처치', `${fmt(sum(s.goldenBook))}마리`],
        ]}/>
        <Block title="사냥터 최고 난이도" note="사냥터마다 처치한 가장 높은 난이도" rows={BASE_STAGES.map(st => [st.name, `${s.tideBest?.[st.id] || 0}`] as Row)}/>
        <Block title="결투" rows={[
            ['레이팅', fmt(s.rating)],
            ['전적', duels ? `${fmt(s.wins)}승 ${fmt(s.losses)}패 (승률 ${Math.round(s.wins / duels * 100)}%)` : '기록 없음'],
        ]}/>
        <FoldSection title="환생 기록"><RebirthHistory s={s}/></FoldSection>
    </div>;
}
