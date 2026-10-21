'use client';
/** v3.398 서약: 이번 생 서약, 다음 생 서약 예약(nextVow). 문구는 전과 같습니다. */
import type { State, Action } from '@/game/types';
import { VOW_IDS, VOW_NAMES, LEVELED_VOWS, type VowId, vowUnlocked, vowBoost, breathBonus, ROUGH, RESTRAINT } from '@/game/systems/vows';
import { ChoiceChips } from '@/components/ui/game';
import { cn } from '@/lib/utils';
import { Card, Note, Toggle } from './parts';

export const VOW_TEXT: Record<VowId, (s: State) => string> = {
    breath: (s: State) => `쓰러지면 이번 생을 처음부터 다시 시작(환생 횟수·세계석 변화 없음, 서약 해제). 한 번도 쓰러지지 않고 환생하면 환생 세계석 +${Math.round(breathBonus(s) * 100)}%.`,
    rough: (s: State) => `단계(1·2·3)마다 사냥터 난이도 하한 ${ROUGH.floor.join('·')}(미만이면 보상 꺼짐), 장비 능력치 -${ROUGH.gear.map(n => n * 100).join('·')}%, 처치 후 회복·흡혈·체력 재생 -${ROUGH.heal.map(n => n * 100).join('·')}%. 보상: 골드·장비 드롭 확률 ×(1 + ${Math.round(50 * vowBoost(s, 'rough'))}% × 단계), 드롭 상한 뒤에 곱합니다.`,
    restraint: (s: State) => `단계(1·2·3)마다 장착 AP -${RESTRAINT.ap.join('·')}, 액티브·패시브 장착 각각 최대 ${RESTRAINT.slots.join('·')}개. 보상: 경험치 ×${RESTRAINT.exp.map(n => (1 + n * vowBoost(s, 'restraint')).toFixed(1)).join('·')}(다른 경험치 배율과 곱연산).`,
};
export function VowPanel({ s, send, busy }: { s: State; send: (a: Action) => void; busy: boolean }) {
    const now = s.vows, next = s.nextVows || {}, leveled = (id: VowId) => (LEVELED_VOWS as readonly string[]).includes(id);
    return <Card title="서약" aside="제약을 걸고 고유 보상을 받습니다 · 세계석 연구 유틸 탭에서 해금">
        <Note>모든 서약은 다음 생에 걸리고(환생할 때 적용), 이번 생 도중에는 바꿀 수 없습니다.</Note>
        {now && VOW_IDS.some(id => now[id]) && <p className="rounded-m bg-accent-soft px-3 py-2 text-s"><strong>이번 생 서약</strong> · {VOW_IDS.filter(id => now[id]).map(id => leveled(id) ? `${VOW_NAMES[id]} ${now[id]}단계` : VOW_NAMES[id]).join(' · ')}</p>}
        <div className="grid gap-3 lg:grid-cols-3">{VOW_IDS.map(id => {
            const open = vowUnlocked(s, id), level = Number(next[id]) || 0;
            return <article className={cn('grid content-start gap-2 rounded-m border border-line bg-surface-1 p-3', !open && 'opacity-70')} key={id}>
                <h3 className="text-s font-semibold">{VOW_NAMES[id]}</h3><p className="text-xs leading-relaxed text-ink-2">{VOW_TEXT[id](s)}</p>
                {!open ? <Note>세계석 연구에서 해금 (환생 5회)</Note> : leveled(id)
                    ? <><Note>다음 생에 걸기 · {level ? `${level}단계 예약` : '꺼짐'}{now?.[id] ? ` · 이번 생 ${now[id]}단계 적용 중` : ''}</Note>
                        <ChoiceChips label={`${VOW_NAMES[id]} 단계`} value={String(level)} disabled={busy} onChange={v => send({ type: 'nextVow', id, value: v })} options={[0, 1, 2, 3].map(n => ({ value: String(n), label: n ? `${n}단계` : '끔' }))}/></>
                    : <Toggle on={!!next[id]} label={['다음 생에 걸기 · 켜짐', '다음 생에 걸기 · 꺼짐']} disabled={busy} className="justify-self-start" onClick={() => send({ type: 'nextVow', id, value: next[id] ? 'off' : 'on' })}/>}
            </article>;
        })}</div>
    </Card>;
}
