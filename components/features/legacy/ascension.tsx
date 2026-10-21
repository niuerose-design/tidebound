'use client';
/** v3.398 승천 카드: 조건 · 지금 받는 배율 · 받는 보상 · 유지 · 초기화와 확인 창. 설계는 docs/balance-rebirth.md 8·11·14절. 환생 50회부터(또는 한 번이라도 승천했으면) 보입니다. */
import { Crown } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { StatBar, ConfirmAction, formatExact } from '@/components/ui/game';
import { ASCENSION, ASCENSION_RESEARCH, ascensionOf, ascensionRequirement, ascensionMastery, ascensionVow, lifetimeRebirths } from '@/game/data/ascension';
import { researchById } from '@/game/data/economy';
import { ODDS, oddsPercent } from '@/game/data/odds';
import { achievementRefund } from '@/game/systems/actions/lifecycle';
import { Card, Note, Ledger } from './parts';

const fmt = formatExact;
export function AscensionPanel({ s, send, busy }: { s: State; send: (a: Action) => void; busy: boolean }) {
    const n = ascensionOf(s), need = ascensionRequirement(s), ready = s.rebirths >= need;
    if (!n && s.rebirths < 50) return null;
    const next = { ...s, ascension: n + 1 }, refund = achievementRefund(s);
    const auto = Object.entries(ASCENSION_RESEARCH).map(([id, rank]) => `${researchById(id)?.name || id}${rank > 1 ? ` ${rank}` : ''}`).join(' · ');
    const log = (s.ascensionLog || []).slice(-5).reverse();
    return <Card className="border-gold-ink/40">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
            <div className="grid gap-2">
                <span className="eyebrow">ASCENSION · {n + 1}번째 승천</span>
                <h2 className="font-display text-l font-bold">{ready ? '환생의 끝에 닿았습니다. 숙련을 들고 처음부터 다시 오를 수 있습니다' : `환생 ${need}회에 승천이 열립니다`}</h2>
                <StatBar value={Math.min(s.rebirths, need)} max={need} tone="warn" label={`환생 ${fmt(s.rebirths)} / ${need}회`} showText={false}/>
                <Note>승천할 때마다 필요한 환생 횟수가 오릅니다({ASCENSION.requirements.join(' → ')}). 환생은 {ASCENSION.rebirthCap}회까지이고, {ASCENSION.researchLockAt}회부터는 세계석 연구를 살 수 없습니다.{n > 0 && ` 지금 ${n}승천 · 숙련 ×${ascensionMastery(s)} · 서약 보상 ×${ascensionVow(s).toFixed(1)} · 누적 환생 ${fmt(lifetimeRebirths(s))}회.`}</Note>
            </div>
            <div className="grid justify-items-center gap-2 rounded-m bg-surface-1 p-4 text-center"><span className="text-xs text-ink-3">승천 후 숙련 배율</span><strong className="inline-flex items-center gap-1 font-num text-2xl text-gold-ink"><Crown size={24}/>×{ascensionMastery(next)}</strong>
                <ConfirmAction label="승천하기" variant="default" className="bg-gold-ink text-surface-0 hover:bg-gold-ink/90" title={`${n + 1}번째 승천을 할까요?`} confirmLabel="승천" disabled={busy || !ready || !!s.dungeon}
                    description={`되돌릴 수 없습니다. 환생 횟수·레벨·골드·세계석·세계석 연구·SP·정수·장비(유물 포함, 칠흑 제외)·도감·스킬 한계 돌파와 극한 단계(전용 연출은 유지)·무릉도장 기록이 처음으로 돌아갑니다. 계정 금고의 세계석·정수도 모두 사라집니다(다른 분신이 넣은 몫 포함). 결투와 이번 주 무릉도장 기록판에서도 바로 빠집니다. 직업·스킬 숙련, 업적, 계급장, 칭호, 기록은 남고 업적 보상 세계석 ${fmt(refund.pearls)} · SP ${refund.sp}를 다시 받습니다.`}
                    onConfirm={() => send({ type: 'ascend' })}/>
            </div>
        </div>
        <Ledger gain={[
            [`숙련 획득 ×${ascensionMastery(s)} → ×${ascensionMastery(next)}`, `승천 1회당 +${ASCENSION.masteryPer * 100}%, ${ASCENSION.masteryCap}회까지. 숙련의 까미 당첨분에도 곱합니다.`],
            [`서약 보상 ×${ascensionVow(s).toFixed(1)} → ×${ascensionVow(next).toFixed(1)}`, `하드코어·힘의 길·절제 보상의 보너스 부분에 곱합니다(${ASCENSION.vowCap}회까지).`],
            [`업적 보상 다시 지급 · 세계석 ${fmt(refund.pearls)} · SP ${refund.sp}`, '받은 업적의 영구 효과(능력치·AP)는 그대로 남습니다.'],
            ['편의 연구 자동 해제', `${auto}. 서약은 1단계가 바로 열립니다.`],
            ['초반 가속 · 까미·누리', `환생 ${ASCENSION.earlyExpUntil}회 전까지 경험치 ×${ASCENSION.earlyExp}(새싹의 축복 대신). 까미·누리가 사냥터 난이도 0부터 나옵니다.`],
            ...(!n ? [['행운의 편지 6~10단계', `오프라인 확률 ×0.75 · 까미 ‘중’ ${oddsPercent(ODDS.mimic.letterMid, '당첨 확률 상승')} · 편지 수신인.`] as [string, string]] : []),
        ]} kept={['직업 숙련 · 숙달 · 직업 단련 · 해금한 직업', '스킬 숙련(성장 레벨) · 계승 · 배운 스킬', '업적과 그 영구 효과 · 계급장 · 칭호', '기록(누적 처치·환생 기록·결투 전적·스타포스 기록 등)', '칠흑 장신구(별 · 각성 · 착용 그대로) · 칠흑 격파 기록 · 보스 코어', '분신 슬롯 · 길드 · 해커 · 설정']}
            reset={['환생 횟수 · 레벨 · 직업(초보자) · 능력치 배분', '골드 · 세계석 · 세계석 연구 · SP · 정수', '스킬 한계 돌파 · 극한 단계(전용 연출은 유지) · SP로 올린 스킬 단계', '장비(유물 포함, 칠흑 제외) · 몬스터·장비 도감', '무릉도장(최고층은 승천 기록에 남음) · 계정 금고의 세계석 · 정수 · 서약', '계정 보너스(이 캐릭터의 기록으로 다시 채움)']}/>
        {log.length > 0 && <Note>승천 기록: {log.map(x => `${x.n}승천 · 환생 ${x.rebirths}회 · 무릉도장 ${x.abyssBest}층`).join(' / ')}</Note>}
    </Card>;
}
