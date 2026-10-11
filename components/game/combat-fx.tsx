'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { Meter, short } from './shared';
import { MonsterArt } from './art';
import { StatusBadges } from './combat-status';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { variantById } from '@/game/data/variants';
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
import type { CSSProperties, ReactNode } from 'react';
import type { Log, State } from '@/game/types';
import { skillById } from '@/game/data/skills';
import { combatFxBatch, combatFxSkipped, type CombatFx } from '@/game/systems/combat-feedback';
import { FOE_FX } from '@/game/data/foe-fx';

/** 연출을 띄워 두는 시간(마지막 타격 뒤). */
const FX_HOLD_MS = 1500;
/** 장면 연출(각성기 · 일곱 인 해방 · 보스 스킬 · 도트 퍼니셔)은 2.4~2.6초짜리라 그 길이만큼 붙잡아 둡니다. 이보다 짧으면 애니메이션 도중에 DOM이 지워집니다. */
const SCENE_HOLD_MS = 2700;
/** v3.248 3초짜리 전용 연출(전탄발사)은 조금 더 붙잡아 둡니다. */
const LONG_SCENE = new Set(['genesisRune']), LONG_HOLD_MS = 3300;
const holdFor = (fx: CombatFx) => fx.actor === 'player' && !!fx.skillId && LONG_SCENE.has(fx.skillId) ? LONG_HOLD_MS : fx.finale || fx.extreme || fx.skillId === 'endOfAll' || (fx.actor === 'player' && (ultimateOf(fx.skillId) || AZ_ULT[sceneOf(fx) ?? ''])) || (fx.actor === 'enemy' && !!fx.skillId && !!FOE_FX[fx.skillId]) ? SCENE_HOLD_MS : FX_HOLD_MS;
/** ‘×N 연속’ 카운터: 몇 번째 연속인지와 누가 연속으로 행동했는지. */
export type CombatCombo = { count: number; actor: 'player' | 'enemy' };
/**
 * 새 전투 로그의 연출. 재생 버퍼가 타격마다 로그를 한 줄씩 드러내므로 박자마다 이어 붙이고, 각 묶음은 제 시간이 지나면 지웁니다.
 * 한꺼번에 많이 들어오면(밀린 턴 건너뛰기) 최근 6개만 보여 줍니다(v3.275부터 잘린 수는 띄우지 않음).
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
        // v3.275 배지는 실제 연속 행동(×2 이상)만. 밀린 기록을 따라잡느라 건너뛴 연출 수는 내부 사정이라 띄우지 않습니다(전에는 ‘내 연속 행동 ×1’처럼 떠 헷갈림).
        const next: CombatCombo | null = longest && (longest.chain || 0) > 1 ? { count: longest.chain!, actor: longest.actor } : null;
        lastId.current = latest;
        if (!batch.length) return;
        const ids = new Set(batch.map(fx => fx.id));
        setEffects(prev => cut ? batch : [...prev.filter(fx => !ids.has(fx.id)), ...batch].slice(-6));
        if (next) setCombo(next);
        const timer = window.setTimeout(() => {
            timers.current.delete(timer);
            setEffects(prev => prev.filter(fx => !ids.has(fx.id)));
            if (next) setCombo(v => v === next ? null : v);
        }, batch.at(-1)!.delay + Math.max(...batch.map(holdFor)));
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
/** 상대 카드 위의 연출. 기본 공격은 체력바 숫자만, 스킬은 궤적·충격파·파편·섬광, 天은 일곱 글자 고리까지 띄웁니다. ‘×N 연속’은 연속으로 행동한 쪽 카드에 붙습니다.
 * v3.195 연속 배지는 행동한 쪽이 같으면 타격마다 다시 만들지 않고 그대로 두며, 숫자가 바뀔 때만 숫자가 살짝 튑니다(전에는 묶음마다 깜박였습니다). */
export function CombatFxOverlay({ effect, combo = null }: { effect: CombatFx[]; combo?: CombatCombo | null }) {
    return <div className="tide-fx-layer" aria-hidden="true">{combo && <div key={`combo-${combo.actor}`} className={`tide-fx-combo tide-fx-combo-${combo.actor}`}><small>{combo.actor === 'player' ? '내 연속 행동' : '상대 연속 행동'}</small><strong key={combo.count}>×{combo.count.toLocaleString()}</strong></div>}{effect.filter(fx => !fx.basic && fx.status !== '행동 불가' && !owScene(fx)).map(fx => fx.actor === 'enemy' ? <div key={fx.id} className={`monster-skill-cue monster-skill-${fx.kind}`} style={fxStyle(fx.delay)}><small>몬스터 스킬</small><strong>{fx.title}</strong></div> : <div key={fx.id} className={`tide-fx tide-fx-${fx.kind} tide-fx-${fx.variant} tide-fx-target-${fx.target} ${fx.critical ? 'critical' : ''} ${fx.finale ? 'finale' : ''} ${(fx.tier || 0) >= 4 ? `tier-${Math.min(5, fx.tier!)}` : ''} ${fx.extreme ? 'extreme' : ''}`} style={fxStyle(fx.delay)}>
        {fx.extreme && <><i className="tide-fx-extreme-halo"/><i className="tide-fx-extreme-halo late"/><b className="tide-fx-extreme-mark">極</b></>}<i className="tide-fx-flash"/>{(fx.tier || 0) >= 4 && <i className="tide-fx-big"/>}<i className="tide-fx-trail"/>{fx.gamble === undefined && <><i className="tide-fx-ring"/><i className="tide-fx-ring tide-fx-shock"/></>}
        {fx.kind !== 'miss' && fragmentsFor(fx).map((glyph, i, all) => <i key={i} className="tide-fx-fragment" style={fxStyle(fx.delay + (i >= 6 ? 90 : 0), { '--fx-x': `${Math.cos(i * 2 * Math.PI / all.length) * (i >= 6 ? 128 : 88)}px`, '--fx-y': `${Math.sin(i * 2 * Math.PI / all.length) * (i >= 6 ? 72 : 52)}px`, '--fx-rotate': `${i * 41}deg` })}>{glyph}</i>)}
        {fx.finale && <i className="tide-fx-heaven">天</i>}
        <div className="tide-fx-caption"><strong>{fx.title}</strong>{fx.extreme && <small className="tide-fx-extreme-tag">極限突破</small>}{fx.status && STATUS_GLYPHS[fx.kind] && <small>{fx.status}</small>}</div>
    </div>)}</div>;
}

const SEAL_GLYPHS = ['無', '虛', '斬', '血', '縛', '刹', '魂'];
/** v27.24 5차 궁극기 전용 장면 연출(v3.196 비숍 4차 엔젤레이도 씀). kind는 battle.css의 .ult-<kind>, glyphs는 파편 글자. v3.47 title이 없으면 스킬 이름(비밀 직업 스킬은 카탈로그로 받은 이름). */
const ULTIMATES: Record<string, { kind: string; title?: string; glyphs: string[] }> = {
    braveSlash: { kind: 'slash', title: '소드 오브 버닝 소울', glyphs: ['╱', '·', '╱', '·', '╱', '·', '╱', '·'] },
    oceanWrath: { kind: 'wave', title: '썬더 브레이크', glyphs: ['≈', '∿', '≈', '∿', '≈', '∿', '≈', '∿'] },
    // v3.196 인피니티 플레임 서클: 불덩이 8개(파편)가 불 고리 위를 공전하다 조여들어 터집니다. 파편 글자는 CSS가 숨기고 불덩이로 그립니다.
    genesis: { kind: 'flamecircle', title: '인피니티 플레임 서클', glyphs: ['●', '●', '●', '●', '●', '●', '●', '●'] },
    // v3.196 엔젤레이(비숍 4차): 전에 인피니티 플레임 서클이 쓰던 빛기둥 + 수평 섬광 + 별 파편 장면을 그대로 받습니다.
    tidalBlessing: { kind: 'light', title: '엔젤레이', glyphs: ['✦', '✧', '★', '✦', '✧', '★', '✦', '✧'] },
    // v3.132 중독 + 화상을 함께 거는 포이즌 노바: 독 고리와 불 고리가 겹쳐 터집니다.
    doomMark: { kind: 'nova', title: '포이즌 노바', glyphs: ['●', '✹', '◌', '▴', '●', '✹', '◌', '▴'] },
    redApocalypse: { kind: 'blood', title: '디멘션 소드', glyphs: ['▾', '●', '▾', '●', '▾', '●', '▾', '●'] },
    worldTentacle: { kind: 'tentacle', glyphs: ['◣', '◥', '◣', '◥', '◣', '◥', '◣', '◥'] },
    // v3.280 나이트로드 쿼드러플 스로우: 내 손에서 거대한 표창 넷이 돌며 날아가 몬스터에 박힙니다(전에는 공용 각성 빛).
    heavenlyDice: { kind: 'shuriken', title: '쿼드러플 스로우', glyphs: ['✦', '✧', '✦', '✧', '✦', '✧', '✦', '✧'] },
    // v3.280 팬텀 파이널 컷: 몬스터 앞에 거대한 카드가 서고, 대각선 일섬에 두 쪽으로 갈라집니다.
    allOrNothing: { kind: 'cardcut', title: '파이널 컷', glyphs: ['♠', '♦', '♣', '♥', '♠', '♦', '♣', '♥'] },
    jackpotStrike: { kind: 'jackpot', title: '조커', glyphs: ['◉', '✦', '◉', '✦', '◉', '✦', '◉', '✦'] },
    frozenTime: { kind: 'time', glyphs: ['◴', '◷', '◶', '◵', '◴', '◷', '◶', '◵'] },
    // v3.173 5차 전용 연출 1: 키네시스 싸이킥 토네이도. 보랏빛 염력 소용돌이가 솟고, 파편이 나선으로 끌려 올라갑니다.
    infiniteChant: { kind: 'psy', glyphs: ['◈', '⌁', '✧', '◇', '◈', '⌁', '✧', '◇'] },
    // 2: 데몬슬레이어 데몬 베인. 핏빛 대검이 내리꽂히고 바닥 충격 고리와 기절 별 · 핏방울이 튑니다.
    heavenSplit: { kind: 'demon', glyphs: ['★', '▾', '✶', '▾', '★', '▾', '✶', '▾'] },
    // 3: 보우마스터 퀴버 풀버스트. 화살 비가 왼쪽에서 쏟아져 꽂히고 출혈 고리가 번집니다.
    trenchPierce: { kind: 'quiver', glyphs: ['➶', '▾', '➹', '➶', '▾', '➹', '➶', '▾'] },
    // 4: 스트라이커 교룡연격. 푸른 용의 궤적이 휘감고 충격 고리가 세 번 터집니다(추가타 2회).
    oceanCombo: { kind: 'dragonfist', glyphs: ['≈', '✦', '≈', '✦', '≈', '✦', '≈', '✦'] },
    // 5: 바이퍼 하울링 피스트. 거대한 주먹이 날아들고 울부짖음의 동심원이 퍼집니다.
    limitlessFist: { kind: 'howl', glyphs: ['◠', '◡', '≈', '◠', '◡', '≈', '◠', '◡'] },
    // 6: 일리움 그라비티 코어. 보랏빛 중력 핵이 오그라들며 네 구슬(추가타 4회)이 공전하고 부식 거품이 빨려 듭니다.
    grandTransmutation: { kind: 'gravity', glyphs: ['◍', '☣', '◌', '◍', '☣', '◌', '◍', '☣'] },
    // 7: 에반 조디악 레이. 별자리 고리가 돌고 하늘에서 빛줄기가 내려꽂힙니다.
    aeonRecall: { kind: 'zodiac', glyphs: ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏'] },
    // 8: 팔라딘 마이티 묠니르. 번개 망치가 내리치고 땅이 갈라지며 약화 화살이 떨어집니다.
    bastionQuake: { kind: 'mjolnir', glyphs: ['ϟ', '▽', 'ϟ', '✦', 'ϟ', '▽', 'ϟ', '✦'] },
    // 9: 비숍 피스메이커. 부드러운 성광 기둥이 내려오고 치유의 십자 · 꽃잎이 떠오릅니다.
    oceanOfLife: { kind: 'peace', glyphs: ['✚', '❀', '✦', '✚', '❀', '✦', '✚', '❀'] },
    // 10: 카데나 체인아츠: 메일스트롬. 쇠사슬 고리가 휘감아 돌고 사슬이 가로지릅니다.
    worldStill: { kind: 'chain', glyphs: ['⛓', '◌', '⛓', '✦', '⛓', '◌', '⛓', '✦'] },
    // 11: 제논 메가 스매셔. v3.245부터 전용 연출(XenonFx)로 그립니다. 여기 항목은 장면 유지 시간(SCENE_HOLD_MS) 판정용으로 남깁니다.
    aberrantSurge: { kind: 'laser', glyphs: ['◇', '✦', '◇', '✧', '◇', '✦', '◇', '✧'] },
    // 12: 메카닉 메탈아머 전탄발사. v3.248부터 전용 연출(MechFx)로 그립니다. 여기 항목은 장면 유지 시간(SCENE_HOLD_MS) 판정용으로 남깁니다.
    genesisRune: { kind: 'barrage', glyphs: ['▲', '✦', '★', '▲', '✦', '★', '▲', '✦'] },
    // 13: 섀도어 소닉 블로우. 음파 호가 왼쪽에서 밀려오고 동전이 튑니다.
    hoardCrush: { kind: 'sonic', glyphs: ['◉', '◠', '◉', '◠', '◉', '◠', '◉', '◠'] },
    // 14: 캡틴 불릿 파티. 총알 궤적이 휩쓸고 총구 섬광이 연달아 번쩍입니다.
    goldenStorm: { kind: 'bullet', glyphs: ['●', '✦', '●', '✦', '●', '✦', '●', '✦'] },
    // 15: 패스파인더 레이븐 템페스트. 검은 깃털 폭풍이 휘몰아치고 고대 문양 고리가 돕니다.
    galaxyFall: { kind: 'raven', glyphs: ['◆', '✧', '◆', '✦', '◆', '✧', '◆', '✦'] },
    // 16: 와일드헌터 재규어 스톰. 세 줄 발톱 자국이 연달아 그어지고 발자국이 찍힙니다.
    titanFell: { kind: 'jaguar', glyphs: ['╱', '✦', '╱', '·', '╱', '✦', '╱', '·'] },
    // 17: 엔젤릭버스터 그랜드 피날레. 무대 조명 두 줄기가 교차하며 쓸고 음표가 떠오릅니다.
    sirenSong: { kind: 'finale', glyphs: ['♪', '♫', '✦', '♪', '♫', '✦', '♪', '♫'] },
    // 18: 칼리 보이드 버스트. 검은 공허 구체가 부풀어 터지고 저주 문양 고리가 돕니다.
    doomCurse: { kind: 'void', glyphs: ['☠', '✺', '◌', '☠', '✺', '◌', '☠', '✺'] },
    // 19: 다크나이트 궁그닐 디센트. 거대한 창이 하늘에서 내리꽂히고 어둠의 충격이 번집니다.
    dragonGodSpear: { kind: 'gungnil', glyphs: ['★', '▾', '✶', '▾', '★', '▾', '✶', '▾'] },
    // 20: 카이저 파이널 피규레이션. 용의 날개가 펼쳐지고 내려찍는 일격이 땅을 울립니다.
    worldBearerSlam: { kind: 'kaiser', glyphs: ['✦', '★', '✦', '▴', '✦', '★', '✦', '▴'] },
    // 21: 루미너스 진리의 문. 빛의 문이 열리며 안에서 빛이 쏟아집니다.
    seaOfLightDescent: { kind: 'gate', glyphs: ['✦', '✧', '✦', '✧', '✦', '✧', '✦', '✧'] },
    // 22: 호영 선기: 분신 둔갑 태을선인. 팔괘 결계가 돌고 부적이 내려옵니다.
    divineWard: { kind: 'sage', glyphs: ['符', '✦', '☯', '✧', '符', '✦', '☯', '✧'] },
    // 23: 아크 인피니티 스펠. 진홍 무한 문양이 타오르고 두 고리가 교차합니다.
    worldInversion: { kind: 'infinity', glyphs: ['✧', '◇', '✧', '◇', '✧', '◇', '✧', '◇'] },
    // 24: 아델 인피니트. 에테르 검의 고리가 조여들며 중심에서 터집니다.
    voidCollapse: { kind: 'aether', glyphs: ['⟡', '✦', '⟡', '✧', '⟡', '✦', '⟡', '✧'] },
    // 25: 블래스터 벙커 버스터. 거대한 피스톤 건틀릿이 왼쪽에서 박히고 충격 띠가 퍼집니다.
    bunkerBuster: { kind: 'bunker', glyphs: ['▮', '✦', '▮', '✦', '▮', '✦', '▮', '✦'] },
    // 26: 라라 용맥 폭발. 땅의 기운이 솟구치고 균열이 번지며 꽃잎이 떠오릅니다.
    veinBurst: { kind: 'vein', glyphs: ['❀', '✦', '◇', '❀', '✦', '◇', '❀', '✦'] },
    // 27: 아란 매하 디스차지. 얼음 창 '마하'가 크게 휘둘러지고 얼음 파편이 튑니다.
    mahaDischarge: { kind: 'maha', glyphs: ['❄', '✦', '❄', '✧', '❄', '✦', '❄', '✧'] },
    // 28: 듀얼블레이드 카르마 퓨리. 참격 네 줄이 엇갈려 연달아 그어집니다(추가타 3회).
    karmaFury: { kind: 'karma', glyphs: ['╱', '╲', '╱', '╲', '╱', '╲', '╱', '╲'] },
    // 29: 배틀메이지 그림 리퍼. 죽음의 낫이 내리 휘둘러지고 해골 기운이 번집니다.
    grimReaper: { kind: 'reaper', glyphs: ['☠', '✺', '◌', '☠', '✺', '◌', '☠', '✺'] },
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
 * v3.245 제논 메가 스매셔 전용 연출(이계 연출과 같은 장면 좌표): ① 하이브리드 코어 충전 게이지(여섯 능력치 칸 · 0 → 100%)와 코어로 모이는 입자
 * → ② 육각 포신 전개 · 표적 잠금 → ③ 화면을 가르는 대형 빔(섬광 · 흔들림) → ④ 관통 폭발 · 육각 파편 · 전용 타이틀. 약 2.5초.
 */
const XEN_CELLS = ['STR', 'DEX', 'INT', 'VIT', 'WIS', 'LUK'];
function XenonFx({ fx, boss }: { fx: CombatFx; boss: boolean }) {
    const i = (n: number, extra: Record<string, string | number> = {}) => fxStyle(fx.delay, { '--i': n, ...extra });
    return <div className={`scene-fx xen-fx ${boss ? 'xen-boss' : ''} ${fx.critical ? 'critical' : ''}`} style={fxStyle(fx.delay)}>
        <i className="scene-fx-dark"/><i className="xen-grid"/>
        <div className="xen-gauge"><small>HYBRID CORE · CHARGE</small>
            <div className="xen-cells">{XEN_CELLS.map((c, n) => <b key={c} style={i(n)}><span>{c}</span></b>)}</div>
            <strong className="xen-pct"/></div>
        <i className="xen-core"/>{Array.from({ length: 12 }, (_, n) => <i key={`p${n}`} className="xen-mote" style={i(n, { '--ang': `${n * 30}deg` })}/>)}
        {Array.from({ length: 3 }, (_, n) => <i key={`h${n}`} className="xen-barrel" style={i(n)}/>)}
        <i className="xen-lock"><b>LOCK ON</b></i>
        <i className="xen-whiteout"/><i className="xen-beam glow"/><i className="xen-beam"/><i className="xen-beam core"/>
        <i className="xen-ring"/><i className="xen-ring late"/>{Array.from({ length: 10 }, (_, n) => <i key={`s${n}`} className="xen-shard" style={i(n, { '--ang': `${n * 36 + 8}deg` })}/>)}
        <strong className="xen-title">MEGA SMASHER<small>메가 스매셔 · 반드시 명중</small></strong>
    </div>;
}
/**
 * v3.248 메카닉 메탈아머 전탄발사 전용 연출(메카물 문법): ① 시네마틱 레터박스 · 흰 명조 타이틀 카드(검은 화면)
 * → ② 경고 패널 · 기체 눈 컷인 · 집중선 → ③ 만화 컷 패널 셋(해치 개방 · 발사 섬광 · 표적 다중 잠금)
 * → ④ 화면 전체를 메우는 탄막(방출한 충전 중첩 × 6줄) · 연쇄 섬광 → 흑백 반전 임팩트 프레임 → 십자 폭발 기둥 → ⑤ 굵은 타이틀. 약 3초.
 */
const MECH_PER_STACK = 3;
const mechSpot = (n: number) => { const a = n * 2.39996, r = 8 + (n * 29 % 36); return [Math.round(Math.cos(a) * r * 1.3), Math.round(Math.sin(a) * r * .8)]; };
function MechFx({ fx, boss }: { fx: CombatFx; boss: boolean }) {
    const stacks = Math.max(1, Math.min(8, fx.charged || 5)), count = stacks * MECH_PER_STACK;
    const at = (n: number, ms: number, extra: Record<string, string | number> = {}) => fxStyle(fx.delay, { '--i': n, '--t': `${Math.round(ms)}ms`, ...extra });
    return <div className={`scene-fx mech-fx ${boss ? 'mech-boss' : ''} ${fx.critical ? 'critical' : ''}`} style={fxStyle(fx.delay, { '--stacks': stacks })}>
        <i className="scene-fx-dark"/><i className="mech-speed"/>
        <div className="mech-card"><small>METAL ARMOR · 第五次</small><strong>전탄발사</strong><i/><em>FULL BURST · CHARGE ×{stacks}</em></div>
        <i className="mech-alert left"><b>WARNING · 全弾発射 · WARNING · 全弾発射</b></i><i className="mech-alert right"><b>EMERGENCY · {count} MISSILES · EMERGENCY</b></i>
        <i className="mech-cutin"><b/><b/></i>
        {/* ③ 1.15 → 1.62초: 만화 컷처럼 화면을 비스듬한 패널 셋으로 — 해치 개방 · 발사 섬광 · 표적 다중 잠금 */}
        <div className="mech-panel a"><div className="mech-hatches">{Array.from({ length: 18 }, (_, n) => <b key={n} style={at(n, 1180 + (n % 6) * 35 + Math.floor(n / 6) * 50)}/>)}</div><span>HATCH OPEN</span></div>
        <div className="mech-panel b">{Array.from({ length: 10 }, (_, n) => <i key={n} className="mech-flare" style={at(n, 1250 + n * 30, { '--y': `${8 + n * 9}%` })}/>)}<span>FIRE</span></div>
        <div className="mech-panel c"><i className="mech-reticle"/>{Array.from({ length: 9 }, (_, n) => { const [x, y] = mechSpot(n); return <i key={n} className="mech-tag" style={at(n, 1350 + n * 25, { '--jx': `${x * 1.6}px`, '--jy': `${y * 1.6}px` })}/>; })}<span>LOCK ×{count}</span></div>
        {/* ④ 1.6 → 2.05초: 화면 전체를 메우는 탄막(중첩 × 6줄) · 표적 연쇄 섬광 */}
        {Array.from({ length: count * 2 }, (_, n) => <i key={`r${n}`} className="mech-tracer" style={at(n, 1600 + (n * 37 % (count * 2)) * (420 / (count * 2)), { '--y': `${6 + (n * 53) % 88}%`, '--w': `${90 + (n * 29) % 140}px` })}/>)}
        {Array.from({ length: Math.min(count, 16) }, (_, n) => { const [x, y] = mechSpot(n); return <i key={`b${n}`} className="mech-boom" style={at(n, 1650 + n * 24, { '--jx': `${x * 1.3}px`, '--jy': `${y * 1.3}px` })}/>; })}
        <i className="mech-impact"/><i className="mech-cross"/><i className="mech-cross h"/><i className="mech-ring"/><i className="mech-ring late"/>
        {Array.from({ length: 14 }, (_, n) => <i key={`d${n}`} className="mech-debris" style={at(n, 2100, { '--ang': `${n * 360 / 14 + 8}deg` })}/>)}
        <i className="mech-bar"/><i className="mech-bar low"/>
        <strong className="mech-title">FULL BURST!!<small>메탈아머 전탄발사 · {count}발</small></strong>
    </div>;
}
/**
 * v3.183 보스 몬스터 스킬의 배경 연출. 몬스터 자리(오른쪽)에서 왼쪽으로 향하게 그려 내 스킬과 방향이 구분됩니다.
 * 카드 쪽은 손대지 않습니다(‘몬스터 스킬’ 알림 · HP 바 숫자 그대로). 추가타가 있는 기술은 타격 수만큼 .foe-hit를 HP 바 숫자와 같은 박자(160ms)로 반복합니다.
 */
function FoeFx({ fx }: { fx: CombatFx }) {
    const foe = FOE_FX[fx.skillId!], hits = Math.max(1, fx.hits.filter(h => !h.miss).length);
    return <div className={`scene-fx scene-fx-foe foe-${foe.kind}`} style={fxStyle(fx.delay, { '--hits': hits })}>
        <i className="scene-fx-dark"/><i className="scene-fx-flash"/><i className="foe-a"/><i className="foe-b"/>
        {foe.perHit && Array.from({ length: hits }, (_, i) => <i key={i} className="foe-hit" style={fxStyle(fx.delay + i * 160, { '--i': i })}/>)}
        {foe.glyphs.map((g, i) => <b key={i} className="foe-frag" style={fxStyle(fx.delay + i * 60, { '--i': i })}>{g}</b>)}
        <strong className="foe-title"><small>BOSS</small>{fx.title}</strong>
    </div>;
}
/**
 * 사냥터 배경 위의 큰 연출. 내 스킬은 배경까지 번지는 섬광과 파편, 天은 어둠 속 일곱 글자가 모여 터지는 전체 화면 연출입니다.
 * 몬스터 스킬은 상대 카드의 알림(monster-skill-cue)이 기본이고, v3.183 보스(boss)의 스킬만 전용 배경 연출(FOE_FX)을 함께 띄웁니다.
 */
export function SceneFx({ effect, boss = false, pnl = 0 }: { effect: CombatFx[]; boss?: boolean; pnl?: number }) {
    const cues = effect.filter(fx => (fx.actor === 'player' || boss && !!fx.skillId && !!FOE_FX[fx.skillId]) && !fx.basic && fx.kind !== 'miss' && fx.status !== '행동 불가');
    return <div className="scene-fx-layer" aria-hidden="true">{cues.map(fx => { const ult = ultimateOf(fx.skillId), scene = fx.actor === 'player' && (fx.essence || fx.mineSwing) ? <AzerothFx key={fx.id} fx={fx} boss={boss}/> : owScene(fx) ? <OtherworldFx key={fx.id} fx={fx} pnl={pnl} boss={boss}/> : !!AZ_ULT[sceneOf(fx) ?? ''] ? <AzerothUltFx key={fx.id} fx={fx} boss={boss}/> : fx.actor === 'player' && fx.skillId === 'aberrantSurge' && !fx.finale ? <XenonFx key={fx.id} fx={fx} boss={boss}/> : fx.actor === 'player' && fx.skillId === 'genesisRune' && !fx.finale ? <MechFx key={fx.id} fx={fx} boss={boss}/> : fx.actor === 'enemy' ? <FoeFx key={fx.id} fx={fx}/> : fx.skillId === 'endOfAll' ? <PunisherFx key={fx.id} fx={fx}/> : ult && !fx.finale ? <div key={fx.id} className={`scene-fx scene-fx-ult ult-${ult.kind}`} style={fxStyle(fx.delay)}>
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
    </div> : <div key={fx.id} className={`scene-fx scene-fx-burst scene-fx-${fx.variant} scene-fx-${fx.kind} ${fx.critical ? 'critical' : ''} ${(fx.tier || 0) >= 4 ? `scene-fx-tier${Math.min(5, fx.tier!)}` : ''}`} style={fxStyle(fx.delay + sceneImpactMs(fx))}>
        {(fx.tier || 0) >= 4 && <i className="scene-fx-dark"/>}<i className="scene-fx-flash"/>{(fx.tier || 0) >= 5 && <><i className="scene-fx-slash"/><span className="scene-fx-title">{fx.title}</span></>}
        {glyphs[fx.variant].slice(0, 4).map((g, i) => <b key={i} className="scene-fx-spark" style={fxStyle(fx.delay + sceneImpactMs(fx) + i * 40, { '--fx-x': `${Math.cos(i * Math.PI / 2 + .6) * 180}px`, '--fx-y': `${Math.sin(i * Math.PI / 2 + .6) * 90}px` })}>{g}</b>)}
    </div>; return fx.extreme ? <Fragment key={fx.id}>{scene}<ExtremeFx fx={fx}/></Fragment> : scene; })}</div>;
}
/**
 * v3.231 이계 전용 연출(요원 · 트레이더). 요원은 예광탄 · 조준경 · 철갑 균열 · 섬광 · 유탄, 트레이더는 양봉 · 음봉 · 급등선 · 금화 · 손절선.
 * 쏘는 자리(왼쪽 아래)에서 몬스터 자리(62% · 48%)로 향합니다. 재장전은 탄창이 다시 들어오는 짧은 연출입니다.
 */
const OW_FX: Record<string, string> = {
    pistolBurst: 'burst', suppressFire: 'burst', fullAuto: 'burst', doubleTap: 'burst', shotgunBlast: 'shotgun', snipe: 'snipe', armorPiercer: 'ap', flashbang: 'flash', grenadeLauncher: 'grenade', deadEye: 'deadeye', tacticalNuke: 'nuke',
    buyOrder: 'buy', shortSell: 'short', leverage: 'leverage', stopLoss: 'stop', shortSqueeze: 'squeeze', circuitBreaker: 'circuit', blackSwan: 'swan',
};
/** 이계 스킬(과 재장전)은 상대 카드 대신 사냥터 배경의 몬스터 위에서만 연출합니다. */
const owScene = (fx: CombatFx) => fx.actor === 'player' && (!!fx.reload || !!fx.skillId && !!OW_FX[fx.skillId] || !!fx.essence || !!fx.mineSwing);
/** v3.247 장면 연출이 자기 큰 제목(각성기 · 天 · 5단계 · 이계 · 아제로스 · 제논 · 도트 퍼니셔 · 보스 스킬)을 띄우는지. 이런 스킬은 장면 위쪽 스킬 이름 쌓기에서 뺍니다(이름이 두 번 뜨지 않게). */
export const hasSceneTitle = (fx: CombatFx, boss: boolean) => fx.actor === 'player'
    ? owScene(fx) || fx.skillId === 'aberrantSurge' || fx.skillId === 'endOfAll' || !!ultimateOf(fx.skillId) || !!AZ_ULT[sceneOf(fx) ?? ''] || !!fx.finale || (fx.tier || 0) >= 5
    : boss && !!fx.skillId && !!FOE_FX[fx.skillId];
const OW_BURST: Record<string, number> = { pistolBurst: 2, suppressFire: 5, fullAuto: 8, doubleTap: 2 };
const owSpread = (i: number) => `${((i * 37) % 9 - 4) * .7}deg`;
function OtherworldFx({ fx, pnl, boss }: { fx: CombatFx; pnl: number; boss: boolean }) {
    const kind = fx.reload ? 'reload' : OW_FX[fx.skillId!], d = fx.delay, i = (n: number, extra: Record<string, string | number> = {}) => fxStyle(d, { '--i': n, ...extra });
    const shots = kind === 'burst' ? OW_BURST[fx.skillId!] ?? 3 : kind === 'shotgun' ? 5 : 0, swing = Math.max(-.35, Math.min(.35, pnl));
    const scale = fx.skillId === 'leverage' ? Math.max(0, 1 + swing * 2) : fx.skillId === 'blackSwan' ? 1 + Math.abs(swing) * 3 : fx.skillId === 'shortSqueeze' ? Math.max(0, 1 - swing * 2) : 1;
    return <div className={`scene-fx ow-fx ow-${kind} ${boss ? 'ow-boss' : ''} ${fx.critical ? 'critical' : ''}`} style={fxStyle(d)}>
        {(kind === 'deadeye' || kind === 'swan' || kind === 'circuit' || kind === 'nuke') && <i className="scene-fx-dark"/>}
        {shots > 0 && Array.from({ length: shots }, (_, n) => <i key={n} className="ow-tracer" style={i(n, { '--spread': kind === 'shotgun' ? `${(n - 2) * 4}deg` : owSpread(n), '--t': `${n * (kind === 'shotgun' ? 0 : 70)}ms` })}/>)}
        {shots > 0 && Array.from({ length: Math.min(shots, 4) }, (_, n) => <i key={`s${n}`} className="ow-casing" style={i(n)}/>)}
        {(kind === 'snipe' || kind === 'deadeye') && <i className="ow-scope"><b/></i>}
        {kind === 'deadeye' && <><i className="ow-scope late"><b/></i>{Array.from({ length: 3 }, (_, n) => <i key={`m${n}`} className="ow-mark" style={i(n)}/>)}
            {Array.from({ length: 3 }, (_, n) => <i key={`d${n}`} className="ow-tracer" style={i(n, { '--spread': `${(n - 1) * 2.4}deg`, '--t': `${620 + n * 170}ms` })}/>)}
            {Array.from({ length: 3 }, (_, n) => <i key={`o${n}`} className="ow-pop" style={i(n)}/>)}
            {Array.from({ length: 3 }, (_, n) => <i key={`c${n}`} className="ow-casing" style={i(n)}/>)}
            <i className="ow-ring"/><i className="ow-ring late"/>{Array.from({ length: 14 }, (_, n) => <i key={`p${n}`} className="ow-spark" style={i(n, { '--ang': `${n * 360 / 14}deg` })}/>)}</>}
        {kind === 'snipe' && <i className="ow-beam"/>}
        {kind === 'nuke' && <>{Array.from({ length: 2 }, (_, n) => <i key={`w${n}`} className="ow-warn" style={i(n)}/>)}<i className="ow-missile"/><i className="ow-whiteout late"/><i className="ow-fireball"/><i className="ow-stem"/><i className="ow-ring"/><i className="ow-ring late"/>{Array.from({ length: 16 }, (_, n) => <i key={`e${n}`} className="ow-ember" style={i(n, { '--ang': `${n * 22.5}deg` })}/>)}</>}
        {fx.overdrive && <><b className="ow-od">∞ 무한 탄창</b>{Array.from({ length: 8 }, (_, n) => <i key={`r${n}`} className="ow-round od" style={i(n)}/>)}</>}
        {kind === 'ap' && <><i className="ow-beam ap"/><i className="ow-crack"/>{Array.from({ length: 8 }, (_, n) => <i key={n} className="ow-rust" style={i(n, { '--ang': `${n * 45 + 10}deg` })}/>)}</>}
        {kind === 'flash' && <i className="ow-whiteout"/>}
        {kind === 'grenade' && <><i className="ow-nade"/><i className="ow-boom"/><i className="ow-boom late"/></>}
        {(kind === 'buy' || kind === 'squeeze') && <><i className="ow-candle bull"/><b className="ow-stamp bull">{kind === 'squeeze' ? 'SQUEEZE' : 'BUY'}</b></>}
        {(kind === 'short' || kind === 'squeeze') && <><i className="ow-arrow"/><i className="ow-candle bear"/></>}
        {kind === 'buy' && <i className="ow-aura"/>}
        {(kind === 'leverage' || kind === 'swan') && <svg className="ow-spike" viewBox="0 0 100 100" preserveAspectRatio="none"><path d={kind === 'swan' ? 'M10 30 L40 36 L60 84 L80 72 L100 50' : 'M10 72 L35 66 L52 78 L78 40 L100 50'}/></svg>}
        {(kind === 'leverage' || kind === 'swan') && Array.from({ length: 12 }, (_, n) => <i key={n} className="ow-coin" style={i(n, { '--ang': `${n * 30}deg` })}/>)}
        {kind === 'stop' && <><i className="ow-stopline"/><i className="ow-shield"/></>}
        {kind === 'circuit' && Array.from({ length: 3 }, (_, n) => <i key={n} className="ow-halt" style={i(n)}/>)}
        {kind === 'reload' && Array.from({ length: 8 }, (_, n) => <i key={n} className="ow-round" style={i(n)}/>)}
        {(fx.skillId === 'leverage' || fx.skillId === 'blackSwan' || fx.skillId === 'shortSqueeze') && <b className="ow-mult">손익 {swing >= 0 ? '+' : ''}{Math.round(swing * 100)}% → ×{scale.toFixed(2)}</b>}
        <strong className="ow-title">{kind === 'reload' ? 'RELOAD' : kind === 'deadeye' ? 'DEAD EYE' : kind === 'nuke' ? 'TACTICAL NUKE' : kind === 'swan' ? 'BLACK SWAN' : kind === 'circuit' ? 'CIRCUIT BREAKER' : kind === 'leverage' ? scale >= 1 ? 'LEVERAGE' : 'MARGIN CALL' : kind === 'snipe' && fx.critical ? 'HEADSHOT' : fx.title}</strong>
    </div>;
}
const ATTR_NAMES: Record<string, string> = { str: '힘', dex: '민첩', int: '지능', vit: '체질', wis: '정신', luk: '행운' };
/**
 * v3.246 아제로스 정수 포식자 · 세계석 광부 전용 연출(이계 연출과 같은 몬스터 좌표 --tx · --ty).
 * 정수 소모 기술: 정수가 손으로 빨려 들어와 응축 → 몬스터 위에 허공의 아가리가 열려 이빨로 물어뜯고 녹빛 정수가 튐. 포식 처치면 혼이 시전자에게 흘러와 룬 고리와 함께 능력치 +1.
 * 채굴 기술: 곡괭이가 호를 그리며 내리찍고 균열 · 먼지 · 돌조각. 채굴하면 세계석 원석이 튀어 올랐다가 위쪽(HUD)으로 날아감.
 */
function AzerothFx({ fx, boss }: { fx: CombatFx; boss: boolean }) {
    const d = fx.delay, i = (n: number, extra: Record<string, string | number> = {}) => fxStyle(d, { '--i': n, ...extra });
    if (fx.essence) return <div className={`scene-fx ow-fx az-fx az-devour ${boss ? 'ow-boss' : ''} ${fx.critical ? 'critical' : ''}`} style={fxStyle(d)}>
        <i className="scene-fx-dark"/>
        {Array.from({ length: 9 }, (_, n) => <i key={`s${n}`} className="az-stream" style={i(n, { '--x0': `${((n * 53) % 160) - 60}px`, '--y0': `${-150 - (n * 37) % 60}px` })}/>)}
        <i className="az-charge"/>
        <i className="az-maw"><i className="az-void"/><i className="az-jaw top"/><i className="az-jaw bot"/></i>
        {Array.from({ length: 12 }, (_, n) => <i key={`o${n}`} className="az-ooze" style={i(n, { '--ang': `${n * 30 + 7}deg`, '--r': `${50 + (n * 23) % 70}px` })}/>)}
        <b className="az-cost">정수 −{fx.essence.toLocaleString()}</b>
        {fx.devour && <>{Array.from({ length: 8 }, (_, n) => <i key={`w${n}`} className="az-wisp" style={i(n)}/>)}<i className="az-rune"/><b className="az-gain">{ATTR_NAMES[fx.devour] || fx.devour} +1<small>포식한 힘을 몸에 새김</small></b></>}
        <strong className="ow-title az-title">{fx.title}</strong>
    </div>;
    return <div className={`scene-fx ow-fx az-fx az-mine ${boss ? 'ow-boss' : ''} ${fx.critical ? 'critical' : ''}`} style={fxStyle(d)}>
        <i className="az-trail"/>
        <i className="az-pick"><svg viewBox="0 0 120 120" aria-hidden="true"><rect x="56" y="18" width="9" height="92" rx="4" fill="#9a6a38" transform="rotate(-38 60 64)"/><path d="M14 40 Q48 2 104 22 Q62 22 30 50 Z" fill="#c9d3da" stroke="#2b3237" strokeWidth="1.5" transform="rotate(-38 60 64)"/><path d="M14 40 L8 52 L22 46 Z" fill="#eef4f7" transform="rotate(-38 60 64)"/></svg></i>
        <i className="az-crack"/><i className="az-dust"/>
        {Array.from({ length: 10 }, (_, n) => <i key={`r${n}`} className="az-rock" style={i(n, { '--ang': `${-160 + n * 15}deg`, '--r': `${40 + (n * 29) % 70}px` })}/>)}
        {(fx.mined || 0) > 0 && <><i className="az-gem"/>{Array.from({ length: 6 }, (_, n) => <i key={`g${n}`} className="az-glint" style={i(n, { '--ang': `${n * 60}deg` })}/>)}<b className="az-mined">세계석 +{fx.mined}</b></>}
        <strong className="ow-title az-title">{(fx.mined || 0) > 0 && fx.critical ? '대박 원석!' : fx.title}</strong>
    </div>;
}
/**
 * v3.269 아제로스 5차 각성기 전용 연출(이계 연출과 같은 좌표: 쏘는 자리 --sx · --sy = 내 무기 손, 과녁 --tx · --ty = 몬스터 가운데, 땅 = 장면 아래 10px).
 * 스킬 데이터의 scene 값으로 고릅니다: assault · artillery · convoy · depot(참모 계보 5차), eclipse · judgment · shadowrain · rewind(히든 5차, 카탈로그로만 받음). 제목은 로그의 스킬 이름(fx.title).
 */
const AZ_ULT: Record<string, { impact: number }> = { assault: { impact: 760 }, artillery: { impact: 640 }, convoy: { impact: 720 }, depot: { impact: 820 }, eclipse: { impact: 1050 }, judgment: { impact: 900 }, shadowrain: { impact: 560 }, rewind: { impact: 820 } };
/** 스킬의 전용 장면 이름(Skill.scene). 비밀 스킬은 카탈로그로 받은 스킬에만 있습니다. */
const sceneOf = (fx: CombatFx) => fx.actor === 'player' && !!fx.skillId && !fx.finale ? skillById(fx.skillId)?.scene : undefined;
/** v3.269 전용 장면이 ‘맞는 순간’까지 걸리는 시간(ms). 장면 피해 숫자 · 몬스터 피격 흔들림을 이만큼 늦춰 연출과 박자를 맞춥니다. */
/** 이계 연출 중 투사체가 늦게 닿는 것(고폭 유탄은 포물선 0.55초 뒤 폭발). */
const OW_IMPACT: Record<string, number> = { grenadeLauncher: 520 };
/**
 * v3.271 일반 스킬(전용 장면이 없는 내 스킬)의 투사체 비행 시간. 재생은 한 박자에 연출 하나라 delay가 늘 0이어서, 전에는 투사체가 출발 전에 이미 끝나 보이지 않았습니다.
 * 이제 시전 → 0.28초 비행 → 닿는 순간 타격 섬광 · 피해 숫자 · 몬스터 흔들림 · 배경 섬광이 함께 뜹니다.
 */
export const CAST_TRAVEL_MS = 280;
const castTravels = (fx: CombatFx) => fx.actor === 'player' && fx.target === 'enemy' && !fx.basic && fx.hits.length > 0 && fx.status !== '행동 불가' && !hasSceneTitle(fx, false);
/** v3.280 5차 궁극기 · 각성기 장면(ULTIMATES · 각성 빛)은 공용 섬광(sceneFinaleFlash 42% × 2.4초)이 터질 때 맞습니다. 전에는 피해 숫자가 장면보다 먼저 떴습니다. */
const ULT_IMPACT_MS = 1000;
export const sceneImpactMs = (fx: CombatFx) => AZ_ULT[sceneOf(fx) ?? '']?.impact ?? (fx.actor === 'player' && !fx.reload && fx.skillId && OW_IMPACT[fx.skillId] ? OW_IMPACT[fx.skillId] : fx.actor === 'player' && !fx.finale && !owScene(fx) && fx.skillId !== 'aberrantSurge' && fx.skillId !== 'genesisRune' && fx.skillId !== 'endOfAll' && ultimateOf(fx.skillId) ? ULT_IMPACT_MS : castTravels(fx) ? CAST_TRAVEL_MS : 0);
function AzerothUltFx({ fx, boss }: { fx: CombatFx; boss: boolean }) {
    const k = sceneOf(fx)!, ult = AZ_ULT[k], d = fx.delay, i = (n: number, extra: Record<string, string | number> = {}) => fxStyle(d, { '--i': n, ...extra }), hits = Math.max(1, fx.hits.filter(h => !h.miss).length);
    return <div className={`scene-fx ow-fx az-ult az-${k} ${boss ? 'ow-boss' : ''} ${fx.critical ? 'critical' : ''}`} style={fxStyle(d, { '--hits': hits, '--impact': `${ult.impact}ms` })}>
        <i className="scene-fx-dark"/>
        {k === 'assault' && <><i className="azu-flag"><b/></i>{Array.from({ length: 3 }, (_, n) => <i key={n} className="azu-charge" style={i(n, { '--lane': `${(n - 1) * 14}px` })}/>)}{Array.from({ length: hits }, (_, n) => <i key={`h${n}`} className="azu-hit" style={i(n)}/>)}</>}
        {k === 'artillery' && <>{Array.from({ length: 5 }, (_, n) => <i key={n} className="azu-shell" style={i(n, { '--off': `${(n - 2) * 22}px` })}/>)}{Array.from({ length: 5 }, (_, n) => <i key={`b${n}`} className="azu-boom" style={i(n, { '--off': `${(n - 2) * 22}px` })}/>)}<i className="azu-dust"/></>}
        {k === 'convoy' && <><i className="azu-truck"><b/><b/></i><i className="azu-speed"/>{Array.from({ length: 6 }, (_, n) => <i key={n} className="azu-crate" style={i(n, { '--ang': `${-150 + n * 22}deg` })}/>)}<i className="azu-hit big"/></>}
        {k === 'depot' && <><i className="azu-stack"/><i className="azu-fuse"/>{Array.from({ length: 3 }, (_, n) => <i key={n} className="azu-boom chain" style={i(n, { '--off': `${(n - 1) * 30}px` })}/>)}{Array.from({ length: 12 }, (_, n) => <i key={`s${n}`} className="azu-shrap" style={i(n, { '--ang': `${n * 30 + 8}deg` })}/>)}</>}
        {k === 'eclipse' && <><i className="azu-sun"/><i className="azu-corona"/><i className="azu-blackbeam"/><i className="azu-darkring"/><i className="azu-darkring late"/></>}
        {k === 'shadowrain' && <>{Array.from({ length: 10 }, (_, n) => <i key={n} className="azu-blade" style={fxStyle(d + ((n * 7) % 10) * 55, { '--i': n, '--x': `${((n * 37) % 11 - 5) * 16}px` })}/>)}<i className="azu-shadowpool"/><b className="azu-again">ONE MORE</b></>}
        {k === 'rewind' && <><i className="azu-clock"><b className="h"/><b className="m"/></i><i className="azu-ripple"/><i className="azu-ripple late"/><i className="azu-heal"/>{Array.from({ length: 6 }, (_, n) => <i key={n} className="azu-mote" style={i(n, { '--ang': `${n * 60}deg` })}/>)}</>}
        {k === 'judgment' && <><i className="azu-sigil"/><i className="azu-pillar"/>{Array.from({ length: 8 }, (_, n) => <b key={n} className="azu-feather" style={fxStyle(d + (n * 5 % 8) * 90, { '--i': n, '--x': `${(n - 3.5) * 30}px` })}>{n % 2 ? '✝' : '✦'}</b>)}</>}
        <strong className="ow-title az-title azu-title">{fx.title}</strong>
    </div>;
}
/**
 * v3.211 극한돌파 전용 연출: 극한돌파한 스킬을 쓸 때 원래 연출 위에 겹칩니다. 진홍 · 금빛 빛기둥 세 줄이 내리꽂히고,
 * 퍼지는 고리와 가운데 ‘極’ 문장이 찍힙니다. 섬광을 끈 기기는 빛기둥이 빠집니다.
 */
function ExtremeFx({ fx }: { fx: CombatFx }) {
    return <div className="scene-fx scene-fx-extreme" style={fxStyle(fx.delay)}>
        {[0, 1, 2].map(i => <i key={i} className="ext-pillar" style={fxStyle(fx.delay + i * 70, { '--i': i })}/>)}
        <i className="ext-ring"/><b className="ext-crest">極</b>
    </div>;
}

/** v3.178 처형 연출: 빈사(체력 35% 이하) 적에게 추가 피해가 붙은 검 계열 처형기. 배경 몬스터가 반으로 갈라지고 HP 바가 베입니다. */
const EXECUTE_CLEAVE = new Set(['braveSlash', 'deadEye']);
/** v3.231 처형 연출을 늦게 시작하는 기술(ms): 데드아이는 표식 · 정밀 사격 뒤 관통선에서 갈라집니다. */
const CLEAVE_LEAD: Record<string, number> = { deadEye: 1200 };
const cleaveFx = (effect: CombatFx[]) => effect.find(fx => fx.execute && fx.actor === 'player' && !!fx.skillId && EXECUTE_CLEAVE.has(fx.skillId) && fx.hits.some(h => !h.miss));
/** 처형 연출 길이(ms): 검 0.7초 + 조각이 날아간 뒤 빈 채로 두는 시간까지. 이 동안 원본(몬스터 그림 · HP 바)은 비어 보이고, 끝나면 RESTORE_MS 동안 눈에 보이게 복구됩니다. */
const CLEAVE_MS = 2400, RESTORE_MS = 450;
type CleaveHold = { fx: CombatFx; phase: 'cut' | 'restore' };
/** v3.180 처형 연출을 효과 목록의 유지 시간(FX_HOLD_MS)과 상관없이 붙잡아 둡니다: 베기(cut) → 빈 채로 → 복구(restore) → 원본. */
function useCleave(effect: CombatFx[]): CleaveHold | null {
    const found = cleaveFx(effect);
    const [held, setHeld] = useState<CleaveHold | null>(null), [doneId, setDoneId] = useState<number | null>(null);
    // 새 처형 타격이 오면 렌더 중에 붙잡아 둡니다(이전 값과 비교하는 파생 상태). 끝난 타격(doneId)은 효과 목록에 남아 있어도 다시 잡지 않습니다. 시각은 effect 안의 타이머가 셈니다.
    // v3.231 데드아이는 마지막 관통선(1.2초 뒤)에 맞춰 갈라집니다.
    if (found && held?.fx.id !== found.id && doneId !== found.id) setHeld({ fx: { ...found, delay: found.delay + (CLEAVE_LEAD[found.skillId!] || 0) }, phase: 'cut' });
    useEffect(() => {
        if (!held) return;
        const timer = window.setTimeout(() => {
            if (held.phase === 'cut') setHeld(cur => cur?.fx.id === held.fx.id && cur.phase === 'cut' ? { fx: held.fx, phase: 'restore' } : cur);
            else { setDoneId(held.fx.id); setHeld(cur => cur?.fx.id === held.fx.id ? null : cur); }
        }, held.phase === 'cut' ? held.fx.delay + CLEAVE_MS : RESTORE_MS);
        return () => clearTimeout(timer);
    }, [held]);
    return held;
}
/** 사냥터 장면 위: 몬스터 그림의 위 · 아래 반쪽이 베인 선을 따라 벌어집니다(원본 몬스터는 CSS가 숨김). */
export function FoeCleave({ effect, enemy }: { effect: CombatFx[]; enemy: { id: string; boss?: boolean } | null }) {
    const held = useCleave(effect);
    if (!held || !enemy) return null;
    const { fx, phase } = held, boss = enemy.boss ? 'boss' : '';
    return <div key={fx.id} className="scene-foe-cleave" aria-hidden="true" style={fxStyle(fx.delay)}>
        {phase === 'cut' ? <>
            <MonsterArt id={enemy.id} boss={!!enemy.boss} size={112} className={`scene-foe scene-foe-half upper ${boss}`}/>
            <MonsterArt id={enemy.id} boss={!!enemy.boss} size={112} className={`scene-foe scene-foe-half lower ${boss}`}/>
            <i className="scene-foe-cut"/>
        </> : <MonsterArt id={enemy.id} boss={!!enemy.boss} size={112} className={`scene-foe scene-foe-restore ${boss}`}/>}
    </div>;
}
/** 상대 카드 HP 바: 검이 지나간 자리에서 HP 바 UI(라벨 · 숫자 · 막대)가 비스듬히 두 조각으로 잘려, 아래 조각이 튕겨 날아갑니다(원본 바는 CSS가 숨김). */
export function BarCleave({ effect, value, max, label }: { effect: CombatFx[]; value: number; max: number; label?: string }) {
    const held = useCleave(effect);
    if (!held) return null;
    const { fx, phase } = held;
    return <span key={fx.id} className="bar-cleave" aria-hidden="true" style={fxStyle(fx.delay)}>
        {phase === 'cut' ? <>
            <span className="bar-cleave-piece keep"><Meter value={value} max={max} label={label}/></span>
            <span className="bar-cleave-piece fly"><Meter value={value} max={max} label={label}/></span>
            <i className="bar-cleave-blade"/>
        </> : <span className="bar-cleave-piece restore"><Meter value={value} max={max} label={label}/></span>}
    </span>;
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

/**
 * v3.232 사냥터 장면 위 전투 표시: 스킬 연출(전에는 상대 카드 위) · 몬스터 스킬 알림 · 연속 배지, 몬스터 발밑 체력바(처형 베기 · 피해 숫자).
 * v3.235 던전 화면도 같은 장면을 씁니다. v3.247 체력바 아래 몬스터 이름(변종 · 무리 · 보스 표시), 내 체력바는 왼쪽 아래 캐릭터 판(SceneMe)으로 옮겼습니다.
 * v3.256 HP 숫자는 짧게(488.7만 / 1.2억, 정확한 값은 title). v3.250 info를 주면 이름을 눌러 몬스터 정보(성향 · 대응법 · 속도 · 명중률 · 회피율)를 봅니다(아래 몬스터 카드 대신).
 */
export function SceneCombatHud({ enemy, effect, combo, info }: { enemy: State['enemy']; effect: CombatFx[]; combo: CombatCombo | null; info?: ReactNode }) {
    const variant = enemy?.variant && enemy.variant !== 'swarm' ? variantById(enemy.variant) : null;
    return <>
        <CombatFxOverlay effect={effect} combo={combo}/>
        {enemy && <div className={`scene-foe-hud ${enemy.boss ? 'boss' : ''}`}><div className="player-hp-anchor"><span className="scene-foe-hp" title={`HP ${Math.ceil(enemy.hp).toLocaleString()} / ${enemy.maxHp.toLocaleString()}`}>{short(Math.ceil(enemy.hp))} / {short(enemy.maxHp)}</span><Meter value={enemy.hp} max={enemy.maxHp} color="enemy"/><BarCleave effect={effect} value={enemy.hp} max={enemy.maxHp}/></div>
            {info ? <Popover><PopoverTrigger asChild><button type="button" className="scene-foe-name" title="몬스터 정보 보기">{enemy.boss ? <small className="boss">BOSS</small> : variant ? <small className={`variant-${enemy.variant}`}>{variant.mark}<span className="vname"> {variant.name}</span></small> : enemy.swarm ? <small className="variant-swarm">≋ ×{enemy.swarm}</small> : null}<span className="scene-foe-label">{enemy.name}</span><small className="scene-foe-more">ⓘ</small></button></PopoverTrigger><PopoverContent className="status-pop game-tooltip scene-foe-pop" side="bottom" align="end">{info}</PopoverContent></Popover> : <span className="scene-foe-name">{enemy.boss ? <small className="boss">BOSS</small> : variant ? <small className={`variant-${enemy.variant}`}>{variant.mark}<span className="vname"> {variant.name}</span></small> : enemy.swarm ? <small className="variant-swarm">≋ ×{enemy.swarm}</small> : null}<span className="scene-foe-label">{enemy.name}</span></span>}
            <span className="scene-foe-status"><StatusBadges effects={enemy.effects} stun={enemy.stun} recent={effect} target="enemy"/></span>
        </div>}
    </>;
}
