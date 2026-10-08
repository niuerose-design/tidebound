'use client';

import { useEffect, useRef, useState } from 'react';
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
import type { CSSProperties } from 'react';
import type { Log } from '@/game/types';
import { skillById } from '@/game/data/skills';
import { combatFxBatch, combatFxSkipped, type CombatFx } from '@/game/systems/combat-feedback';

/** 연출을 띄워 두는 시간(마지막 타격 뒤). */
const FX_HOLD_MS = 1500;
/** ‘×N 연속’ 카운터: 몇 번째 연속인지와 누가 연속으로 행동했는지. */
export type CombatCombo = { count: number; actor: 'player' | 'enemy' };
/**
 * 새 전투 로그의 연출. 재생 버퍼가 타격마다 로그를 한 줄씩 드러내므로 박자마다 이어 붙이고, 각 묶음은 제 시간이 지나면 지웁니다.
 * 한꺼번에 많이 들어오면(밀린 턴 건너뛰기) 최근 6개만 보여 주고 잘린 타격 수를 combo로 알립니다.
 * 연속 행동이 있으면 combo는 그 묶음에서 가장 긴 연속 번호와 그 행동의 주인입니다(‘×N 연속’을 행동한 쪽 카드에 띄움).
 */
export function useCombatFx(logs: Log[], playerName: string, enabled = true) {
    const lastId = useRef<number | null>(null), timers = useRef(new Set<number>());
    const [effects, setEffects] = useState<CombatFx[]>([]), [combo, setCombo] = useState<CombatCombo | null>(null);
    const latest = logs.at(-1)?.id ?? 0;
    useEffect(() => {
        if (lastId.current === null || latest < lastId.current) {
            lastId.current = latest;
            setEffects([]);
            setCombo(null);
            return;
        }
        if (latest === lastId.current) return;
        // v27.62 스킬 이펙트를 끈 기기: 새 로그는 읽은 것으로만 치고 연출을 만들지 않습니다(다시 켜면 그다음 타격부터).
        if (!enabled) { lastId.current = latest; return; }
        const batch = combatFxBatch(logs, lastId.current, playerName), cut = combatFxSkipped(logs, lastId.current, playerName);
        const longest = batch.reduce<CombatFx | null>((best, fx) => (fx.chain || 0) > (best?.chain || 0) ? fx : best, null);
        const next: CombatCombo | null = longest && (longest.chain || 0) > 1 ? { count: longest.chain!, actor: longest.actor } : cut ? { count: cut, actor: batch.at(-1)!.actor } : null;
        lastId.current = latest;
        if (!batch.length) return;
        const ids = new Set(batch.map(fx => fx.id));
        setEffects(prev => cut ? batch : [...prev.filter(fx => !ids.has(fx.id)), ...batch].slice(-6));
        if (next) setCombo(next);
        const timer = window.setTimeout(() => {
            timers.current.delete(timer);
            setEffects(prev => prev.filter(fx => !ids.has(fx.id)));
            if (next) setCombo(v => v === next ? null : v);
        }, batch.at(-1)!.delay + FX_HOLD_MS);
        timers.current.add(timer);
    }, [latest, logs, playerName, enabled]);
    useEffect(() => { const pending = timers.current; return () => pending.forEach(clearTimeout); }, []);
    return enabled ? { effects, combo } : NO_FX;
}
const NO_FX: { effects: CombatFx[]; combo: CombatCombo | null } = { effects: [], combo: null };

function fxStyle(delay: number, extra: Record<string, string | number> = {}): CSSProperties {
    return { '--fx-delay': `${delay}ms`, ...extra } as CSSProperties;
}
import type { CombatFxVariant, CombatFxKind } from '@/game/systems/combat-feedback';
/** v25.20 갈래별 파편 글자. 궤적·색은 battle.css의 .tide-fx-<갈래>가 맡습니다. */
const glyphs: Record<CombatFxVariant, string[]> = {
    pierce: ['➤', '·', '─', '·', '➤', '─'], slash: ['╱', '╲', '╱', '·', '╲', '·'], quake: ['▲', '▪', '▲', '▪', '▲', '▪'], bite: ['◣', '◥', '◣', '·', '◥', '·'],
    wave: ['≈', '∿', '≈', '·', '∿', '≈'], lightning: ['ϟ', '·', 'ϟ', '·', 'ϟ', '✦'], fire: ['🔥', '✦', '·', '🔥', '·', '✦'], frost: ['❄', '·', '✧', '❄', '·', '✧'],
    star: ['✦', '✧', '★', '·', '✦', '✧'], gold: ['◉', '✦', '◉', '·', '◉', '✦'], song: ['♪', '♫', '♪', '·', '♫', '♪'], ward: ['⬡', '·', '⬡', '·', '⬡', '·'],
    heal: ['✚', '·', '✚', '·', '❀', '·'], curse: ['☠', '·', '✺', '·', '☠', '·'], arcane: ['✧', '·', '◇', '·', '✦', '◇'], impact: ['✦', '·', '╱', '·', '╲', '✧'], glyph: ['無', '虛', '斬', '血', '縛', '刹'],
    venom: ['●', '·', '◌', '●', '·', '◌'], ink: ['●', '◍', '·', '●', '·', '◍'], bone: ['☠', '·', '✕', '·', '☠', '✕'], time: ['◴', '◷', '◶', '◵', '·', '◴'],
};

/** v27.22 상태이상 피격 전용 파편: 기절은 별, 출혈은 핏방울, 중독은 거품, 화상은 불티, 침묵은 지워진 음표, 감속은 모래시계, 약화는 아래 화살, 가속은 위 화살. */
const STATUS_GLYPHS: Partial<Record<CombatFxKind, string[]>> = {
    stun: ['★', '·', '✶', '·', '★', '✶'], bleed: ['▾', '·', '●', '▾', '·', '●'], poison: ['●', '◌', '·', '●', '·', '◌'], burn: ['✹', '·', '▴', '✹', '·', '▴'],
    silence: ['♪', '✕', '·', '♪', '✕', '·'], slow: ['⧗', '·', '≈', '⧗', '·', '≈'], weaken: ['▽', '·', '▽', '·', '▽', '·'], haste: ['▲', '·', '▲', '·', '▲', '·'], corrode: ['☣', '·', '◌', '☣', '·', '◌'],
};
/** 4차는 9개, 5차는 12개 파편(바깥 고리 추가). 상태이상 피격은 상태별 파편을 씁니다. */
const fragmentsFor = (fx: CombatFx) => { const base = STATUS_GLYPHS[fx.kind] ?? glyphs[fx.variant]; const n = (fx.tier || 0) >= 5 ? 12 : (fx.tier || 0) >= 4 ? 9 : 6; return Array.from({ length: n }, (_, i) => base[i % base.length]); };
/** 상대 카드 위의 연출. 기본 공격은 체력바 숫자만, 스킬은 궤적·충격파·파편·섬광, 天은 일곱 글자 고리까지 띄웁니다. ‘×N 연속’은 연속으로 행동한 쪽 카드에 붙습니다. */
export function CombatFxOverlay({ effect, combo = null }: { effect: CombatFx[]; combo?: CombatCombo | null }) {
    return <div className="tide-fx-layer" aria-hidden="true">{combo && <div key={`combo-${effect[0]?.id}`} className={`tide-fx-combo tide-fx-combo-${combo.actor}`}><small>{combo.actor === 'player' ? '내 연속 행동' : '상대 연속 행동'}</small><strong>×{combo.count.toLocaleString()}</strong> 연속</div>}{effect.filter(fx => !fx.basic && fx.status !== '행동 불가').map(fx => fx.actor === 'enemy' ? <div key={fx.id} className={`monster-skill-cue monster-skill-${fx.kind}`} style={fxStyle(fx.delay)}><small>몬스터 스킬</small><strong>{fx.title}</strong></div> : <div key={fx.id} className={`tide-fx tide-fx-${fx.kind} tide-fx-${fx.variant} tide-fx-target-${fx.target} ${fx.critical ? 'critical' : ''} ${fx.finale ? 'finale' : ''} ${(fx.tier || 0) >= 4 ? `tier-${Math.min(5, fx.tier!)}` : ''}`} style={fxStyle(fx.delay)}>
        <i className="tide-fx-flash"/>{(fx.tier || 0) >= 4 && <i className="tide-fx-big"/>}<i className="tide-fx-trail"/>{fx.gamble === undefined && <><i className="tide-fx-ring"/><i className="tide-fx-ring tide-fx-shock"/></>}
        {fx.kind !== 'miss' && fragmentsFor(fx).map((glyph, i, all) => <i key={i} className="tide-fx-fragment" style={fxStyle(fx.delay + (i >= 6 ? 90 : 0), { '--fx-x': `${Math.cos(i * 2 * Math.PI / all.length) * (i >= 6 ? 128 : 88)}px`, '--fx-y': `${Math.sin(i * 2 * Math.PI / all.length) * (i >= 6 ? 72 : 52)}px`, '--fx-rotate': `${i * 41}deg` })}>{glyph}</i>)}
        {fx.finale && <i className="tide-fx-heaven">天</i>}
        <div className="tide-fx-caption"><strong>{fx.title}</strong>{fx.status && STATUS_GLYPHS[fx.kind] && <small>{fx.status}</small>}</div>
    </div>)}</div>;
}

const SEAL_GLYPHS = ['無', '虛', '斬', '血', '縛', '刹', '魂'];
/** v27.24 5차 궁극기 전용 장면 연출. kind는 battle.css의 .ult-<kind>, glyphs는 파편 글자. v3.47 title이 없으면 스킬 이름(비밀 직업 스킬은 카탈로그로 받은 이름). */
const ULTIMATES: Record<string, { kind: string; title?: string; glyphs: string[] }> = {
    braveSlash: { kind: 'slash', title: '소드 오브 버닝 소울', glyphs: ['╱', '·', '╱', '·', '╱', '·', '╱', '·'] },
    oceanWrath: { kind: 'wave', title: '썬더 브레이크', glyphs: ['≈', '∿', '≈', '∿', '≈', '∿', '≈', '∿'] },
    genesis: { kind: 'light', title: '인피니티 플레임 서클', glyphs: ['✦', '✧', '★', '✦', '✧', '★', '✦', '✧'] },
    // v3.132 중독 + 화상을 함께 거는 포이즌 노바: 독 고리와 불 고리가 겹쳐 터집니다.
    doomMark: { kind: 'nova', title: '포이즌 노바', glyphs: ['●', '✹', '◌', '▴', '●', '✹', '◌', '▴'] },
    redApocalypse: { kind: 'blood', title: '디멘션 소드', glyphs: ['▾', '●', '▾', '●', '▾', '●', '▾', '●'] },
    worldTentacle: { kind: 'tentacle', glyphs: ['◣', '◥', '◣', '◥', '◣', '◥', '◣', '◥'] },
    jackpotStrike: { kind: 'jackpot', title: '조커', glyphs: ['◉', '✦', '◉', '✦', '◉', '✦', '◉', '✦'] },
    frozenTime: { kind: 'time', glyphs: ['◴', '◷', '◶', '◵', '◴', '◷', '◶', '◵'] },
    // v3.172 5차 전용 연출 1: 키네시스 싸이킥 토네이도. 보랏빛 염력 소용돌이가 솟고, 파편이 나선으로 끌려 올라갑니다.
    infiniteChant: { kind: 'psy', glyphs: ['◈', '⌁', '✧', '◇', '◈', '⌁', '✧', '◇'] },
    // 2: 데몬슬레이어 데몬 베인. 핏빛 대검이 내리꽂히고 바닥 충격 고리와 기절 별 · 핏방울이 튑니다.
    heavenSplit: { kind: 'demon', glyphs: ['★', '▾', '✶', '▾', '★', '▾', '✶', '▾'] },
    // 3: 보우마스터 퀴버 풀버스트. 화살 비가 왼쪽에서 쏟아져 꽂히고 출혈 고리가 번집니다.
    trenchPierce: { kind: 'quiver', glyphs: ['➶', '▾', '➹', '➶', '▾', '➹', '➶', '▾'] },
    // 4: 스트라이커 교룡연격. 푸른 용의 궤적이 휘감고 충격 고리가 세 번 터집니다(추가타 2회).
    oceanCombo: { kind: 'dragonfist', glyphs: ['≈', '✦', '≈', '✦', '≈', '✦', '≈', '✦'] },
    // 5: 바이퍼 하울링 피스트. 거대한 주먹이 날아들고 울부짖음의 동심원이 퍼집니다.
    limitlessFist: { kind: 'howl', glyphs: ['◠', '◡', '≈', '◠', '◡', '≈', '◠', '◡'] },
};
/** v3.86 전용 연출이 없는 각성기의 기본 장면(스킬 이름을 제목으로). */
const AWAKEN_FX = { kind: 'light', glyphs: ['✦', '·', '✧', '·', '✦', '·', '✧', '·'] };
const ultimateOf = (id?: string) => id ? ULTIMATES[id] ?? (skillById(id)?.awaken ? AWAKEN_FX : undefined) : undefined;
/**
 * v3.132 도트 퍼니셔 전용 장면. 추가타 수로 모션이 달라집니다: 0회는 독·불 구체 한 발(어둠 없음),
 * 일부(2~3회)는 표식이 하나씩 날아와 박히고, 최대(4회)는 어둠 속에서 네 표식이 동시에 모여 십자로 터지며 기절 별이 돕니다.
 * 표식은 HP 바 숫자(타격마다 160ms)와 같은 박자로 꽂힙니다.
 */
function PunisherFx({ fx }: { fx: CombatFx }) {
    const follows = Math.max(0, fx.hits.length - 1), stage = follows === 0 ? 'none' : follows >= (skillById('endOfAll')?.dotFinisher?.maxHits ?? 4) ? 'full' : 'part';
    return <div className={`scene-fx scene-fx-punisher pun-${stage}`} style={fxStyle(fx.delay, { '--hits': follows })}>
        {stage !== 'none' && <i className="scene-fx-dark"/>}<i className="scene-fx-flash"/><i className="pun-core"/>
        {Array.from({ length: follows }, (_, i) => <b key={i} className={`pun-mark ${i % 2 ? 'burn' : 'poison'}`} style={fxStyle(fx.delay + 160 * (i + 1), { '--i': i, '--ang': `${i * 360 / Math.max(1, follows) - 90}deg` })}>{i % 2 ? '✹' : '●'}</b>)}
        {stage === 'full' && <><i className="pun-cross"/><i className="pun-cross late"/>{['★', '✶', '★'].map((g, i) => <b key={g + i} className="pun-star" style={fxStyle(fx.delay + 800, { '--i': i })}>{g}</b>)}</>}
        <strong className="pun-title">{stage === 'full' ? '도트 퍼니셔 · 퍼니시' : stage === 'part' ? `도트 퍼니셔 ×${follows + 1}` : '도트 퍼니셔'}</strong>
    </div>;
}
/**
 * 사냥터 배경 위의 큰 연출. 내 스킬은 배경까지 번지는 섬광과 파편(v25.21 타원 고리 제거), 天은 어둠 속 일곱 글자가 모여 터지는 전체 화면 연출입니다.
 * 몬스터 스킬은 상대 카드의 알림(monster-skill-cue)으로 충분하므로 배경에는 띄우지 않습니다.
 */
export function SceneFx({ effect }: { effect: CombatFx[] }) {
    const cues = effect.filter(fx => fx.actor === 'player' && !fx.basic && fx.kind !== 'miss' && fx.status !== '행동 불가');
    return <div className="scene-fx-layer" aria-hidden="true">{cues.map(fx => { const ult = ultimateOf(fx.skillId); return fx.skillId === 'endOfAll' ? <PunisherFx key={fx.id} fx={fx}/> : ult && !fx.finale ? <div key={fx.id} className={`scene-fx scene-fx-ult ult-${ult.kind}`} style={fxStyle(fx.delay)}>
        <i className="scene-fx-dark"/><i className="scene-fx-flash"/><i className="ult-a"/><i className="ult-b"/>
        {ult.glyphs.map((g, i) => <b key={i} className="ult-frag" style={fxStyle(fx.delay + i * 70, { '--i': i })}>{g}</b>)}
        <strong className="ult-title">{ult.title ?? skillById(fx.skillId)?.name}</strong>
    </div> : fx.finale ? <div key={fx.id} className="scene-fx scene-fx-finale" style={fxStyle(fx.delay)}>
        <i className="scene-fx-dark"/><i className="scene-fx-flash"/><i className="scene-fx-slash"/><i className="scene-fx-ring"/><i className="scene-fx-ring late"/>
        {SEAL_GLYPHS.map((g, i) => <b key={g} className="scene-fx-seal" style={fxStyle(fx.delay + i * 70, { '--seal-angle': `${i * 360 / 7 - 90}deg` })}>{g}</b>)}
        <strong className="scene-fx-heaven">天</strong>
        <span className="scene-fx-title">일곱 인 해방</span>
    </div> : fx.gamble !== undefined ? <div key={fx.id} className={`scene-fx scene-fx-dice ${fx.gamble >= 1.8 ? 'high' : fx.gamble < .6 ? 'low' : 'mid'}`} style={fxStyle(fx.delay)}>
        <i className="scene-fx-flash"/>
        <b className="scene-fx-dice-faces">{(fx.dice || [Math.min(6, Math.max(1, Math.round(fx.gamble * 3.5)))]).map((f, i) => <span key={i} style={fxStyle(fx.delay + i * 90)}>{DICE_FACES[f - 1]}</span>)}</b>
        <span className="scene-fx-dice-mult">×{fx.gamble.toFixed(2)}</span>
        <strong className="scene-fx-dice-line">{fx.gamble >= 1.8 ? '이게 실력이지~' : fx.gamble < .6 ? '좆망겜이네~' : '굴릴 만하네~'}</strong>
    </div> : <div key={fx.id} className={`scene-fx scene-fx-burst scene-fx-${fx.variant} scene-fx-${fx.kind} ${fx.critical ? 'critical' : ''} ${(fx.tier || 0) >= 4 ? `scene-fx-tier${Math.min(5, fx.tier!)}` : ''}`} style={fxStyle(fx.delay)}>
        {(fx.tier || 0) >= 4 && <i className="scene-fx-dark"/>}<i className="scene-fx-flash"/>{(fx.tier || 0) >= 5 && <><i className="scene-fx-slash"/><span className="scene-fx-title">{fx.title}</span></>}
        {glyphs[fx.variant].slice(0, 4).map((g, i) => <b key={i} className="scene-fx-spark" style={fxStyle(fx.delay + i * 40, { '--fx-x': `${Math.cos(i * Math.PI / 2 + .6) * 180}px`, '--fx-y': `${Math.sin(i * Math.PI / 2 + .6) * 90}px` })}>{g}</b>)}
    </div>; })}</div>;
}

const DAMAGE_ICON = { physical: '⚔', magic: '✦', split: '⚔✦', fixed: '⚡' } as const;
/** HP 바 위 숫자: 실제로 깎인 값만 한 번씩. 물리·마법·복합은 색과 아이콘, 치명·빗나감·흡혈·지속 피해는 실제 결과로 표시합니다. */
export function CombatBarEffect({ effect, target }: { effect: CombatFx[]; target: 'player' | 'enemy' }) {
    return <span className="bar-fx-layer" aria-hidden="true">{effect.flatMap(fx => {
        const hit = fx.target === target && fx.hits.length > 0;
        const self = fx.actor === target;
        return [
            self && fx.dot && <span key={`${fx.id}-dot`} className="bar-fx bar-fx-bleed" style={fxStyle(fx.delay)}><b>{fx.dot.name} −{fx.dot.value.toLocaleString()}</b></span>,
            hit && <span key={`${fx.id}-hit`} className={`bar-fx bar-fx-${fx.kind} dmg-${fx.damageType} ${fx.basic ? 'basic' : ''}`} style={fxStyle(fx.delay)}>{fx.hits.map((part, i) => <b key={i} className={`${part.critical ? 'critical' : ''} ${part.superCritical ? 'super' : ''} ${part.miss ? 'miss' : ''}`} style={fxStyle(fx.delay + i * 160)}>{part.miss ? (i ? '추가타 빗나감' : '빗나감') : `${DAMAGE_ICON[fx.damageType]} −${part.value.toLocaleString()}${part.superCritical ? ' 극치명' : part.critical ? ' 치명' : ''}`}</b>)}</span>,
            self && fx.healing > 0 && <span key={`${fx.id}-heal`} className="bar-fx bar-fx-heal" style={fxStyle(fx.delay + 150)}><b>+{fx.healing.toLocaleString()} 회복</b></span>,
            self && fx.drained > 0 && <span key={`${fx.id}-drain`} className="bar-fx bar-fx-heal drain" style={fxStyle(fx.delay + 300)}><b>+{fx.drained.toLocaleString()} 흡혈</b></span>,
            fx.endured && (fx.endured.self ? self : fx.target === target) && <span key={`${fx.id}-endure`} className="bar-fx bar-fx-heal endure" style={fxStyle(fx.delay + 320)}><b>無 · 체력 1로 버팀{fx.endured.heal ? ` +${fx.endured.heal.toLocaleString()}` : ''}</b></span>,
        ];
    })}</span>;
}

export function PlayerHitEffect({ effect }: { effect: CombatFx[] }) {
    return <CombatBarEffect effect={effect} target="player"/>;
}
