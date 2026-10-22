'use client';
/** v3.400 모험 도움말(새 토대): 주제는 FoldSection, 규칙 카드 · 상태이상 · 능력치 · 전투 흐름은 토큰 카드. 내용(문구 · 수식)은 옛 guide-panel 그대로입니다. */
import { catalogNow } from '@/game/data/catalog';
import type { State } from '@/game/types';
import { VARIANTS } from '@/game/data/variants';
import { SectionHeader } from '@/components/ui/game';
import { AttributesTopic } from './topics/attributes';
import { CombatTopic } from './topics/combat';
import { StatusTopic } from './topics/status';
import { SkillsTopic } from './topics/skills';
import { JobsTopic } from './topics/jobs';
import { HuntingTopic } from './topics/hunting';
import { AltarTopic } from './topics/altar';
import { GrowthTopic } from './topics/growth';
import { SaveTopic } from './topics/save';

/** v3.413 주제별 파일로 나눴습니다(topics/*.tsx · parts.tsx). 화면 구조와 문구는 그대로입니다. */
export function HelpScreen({ s }: { s?: State }) {
    // v3.49 정보 비공개(10.2-7)가 켜져 있으면 드롭·등급·정수·변종·칠흑 확률과 공식을 뺍니다. 전투 수치는 그대로.
    const swarm = VARIANTS.find(v => v.id === 'swarm')!, secret = catalogNow().secret;
    return <div className="grid gap-4 text-ink-1">
        <SectionHeader as="h1" eyebrow="ADVENTURER'S MANUAL" title="모험 도움말" description="주제는 모두 접혀 있습니다. 제목을 누르면 펼치고 다시 누르면 접습니다."/>
        <AttributesTopic/>
        <CombatTopic/>
        <StatusTopic/>
        <SkillsTopic/>
        <JobsTopic/>
        <HuntingTopic s={s} secret={secret} swarm={swarm}/>
        <AltarTopic secret={secret}/>
        <GrowthTopic s={s} secret={secret}/>
        <SaveTopic/>
    </div>;
}
