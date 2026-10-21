'use client';
/**
 * v3.381 설정 화면(재설계 4단계의 첫 화면, 브리프 9절 5 · 6.2 · 6.4). 옛 설정 다이얼로그(components/game/settings-dialog.tsx)를 대신합니다.
 * 토큰 · shadcn 기본 · 게임 범용 조각만 조합하고 새 전역 CSS 를 만들지 않습니다. 주소는 #settings (view-route.ts).
 * 서버에 저장되는 항목(이름 · 자동 장치 · 확인 · 무리 규모 · 청산)은 send(action), 이 기기에만 남는 항목(연출 · 알림 · 스타캐치)은 각 localStorage 스토어입니다.
 */
import { useRef, useState, type ReactNode } from 'react';
import { HelpCircle, LogOut, ScrollText, Swords, UserRound } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SectionHeader, RARITY_KEYS, rarityVar } from '@/components/ui/game';
import { cn } from '@/lib/utils';
import { GAME_BUILD } from '@/game/data/update-log';
import { researchRank, salvageRate, autoGrades, autoMaxGrade, AUTO_RESEARCH, type AutoDevice } from '@/game/data/economy';
import { RARITIES } from '@/game/data/balance';
import { SWARM_CAPS, swarmCapOf } from '@/game/data/variants';
import { SLOT_COUNT, accountSlot, slotUnlocked, slotUnlockText } from '@/game/data/account';
import { jobById } from '@/game/data/classes';
import { dungeonById, stageById } from '@/game/data/world';
import { useSkillFx, setSkillFx, useFxGlow, setFxGlow, useSceneLootSetting, setSceneLoot } from '@/components/game/skill-fx-setting';
import { useNotices, setNotice, NOTICE_KINDS } from '@/components/game/notice-settings';
import { useStarSetting, setStarSetting } from '@/components/game/star-catch-setting';
import { BACKDROP_LABELS, HERO_LABELS, WEAPON_LABELS, setHeroImage, setSceneLook, useHeroImage, useSceneLook, type HeroKindId, type WeaponId } from '@/components/game/scene-look-setting';
import { SceneBackdrop, backdropTheme, type BackdropTheme } from '@/components/game/art';
import { MyHero } from '@/components/game/scene-stage';

type Send = (a: Action) => void;
export type SettingsScreenProps = {
    s: State; busy: boolean; send: Send;
    /** 분신(슬롯) 바꾸기. 없으면 분신 구역을 숨깁니다. */
    onSwitchSlot?: (slot: number) => Promise<void>;
    onLogout?: () => void;
    setView: (view: string) => void;
};

export function SettingsScreen({ s, busy, send, onSwitchSlot, onLogout, setView }: SettingsScreenProps) {
    return <div className="mx-auto grid w-full max-w-3xl gap-6 text-ink-1">
        <SectionHeader as="h1" eyebrow="Settings" title="설정" description="바꾸는 즉시 적용되고 저장됩니다. ‘이 기기’ 표시가 있는 항목은 이 브라우저에만 남습니다."/>
        <Card id="adventurer" title="모험가" description="이름과 분신, 계정.">
            <NameRow s={s} busy={busy} send={send}/>
            {onSwitchSlot && <SlotsRow s={s} busy={busy} onSwitchSlot={onSwitchSlot}/>}
            {onLogout && <Row title="로그아웃" desc="이 기기에서 계정 연결을 끊습니다. 진행은 서버에 저장되어 있어 다시 로그인하면 이어집니다.">
                <Button type="button" variant="outline" onClick={onLogout}><LogOut/>로그아웃</Button>
            </Row>}
        </Card>
        <Card id="automation" title="사냥 자동화" description="서버에 저장되어 어느 기기에서나 같습니다.">
            {researchRank(s, 'sortingNet') > 0 && <AutoDeviceRow s={s} busy={busy} send={send} device="salvage" title="자동 분해기" verb="정수로 분해" on={!!s.autoSell} action="autoSell"/>}
            {researchRank(s, 'sortingNet') > 0 && <AutoDeviceRow s={s} busy={busy} send={send} device="vend" title="자동 판매기" verb="골드로 판매" on={!!s.autoVend} action="autoVend"/>}
            <ToggleRow title="능력치 최대 투자 확인" desc="능력치 화면의 ‘최대’ 버튼을 누를 때 확인 창을 띄웁니다. 끄면 남은 포인트를 바로 투자합니다(재분배는 무료)." checked={!s.skipStatConfirm} disabled={busy} onChange={on => send({ type: 'statConfirm', value: on ? 'on' : 'off' })}/>
            <Row title="무리 최대 규모" desc="이보다 큰 무리가 뽑히면 이 규모로 나옵니다. 큰 무리는 보상도 마리 수만큼이라 효율은 비슷하고 한 번의 전투만 길어집니다. 일반 사냥터 무리는 ×100까지이고, ×500 도전 무리는 무리 서식지에서만 나옵니다(서식지에는 적용되지 않음). ‘끔’이면 무리 대신 일반 개체가 나오고, 다른 변종(거대 · 심연 · 별빛)은 그대로 나옵니다." stack>
                <ChoiceGroup label="무리 최대 규모" value={String(swarmCapOf(s))} disabled={busy} onChange={v => send({ type: 'swarmCap', value: v })}
                    options={SWARM_CAPS.map(cap => ({ value: String(cap), label: cap === 0 ? '끔' : cap >= 100 ? '제한 없음(×100)' : `×${cap}까지` }))}/>
            </Row>
            {salvageRate(s) > 0 && <Row title="청산 방식" desc={`환생할 때 유물을 뺀 보관함 · 착용 장비 전부를 효율 ${Math.round(salvageRate(s) * 100)}%로 ${s.salvageMode === 'dismantle' ? '분해해 정수를 받습니다.' : '판매해 다음 생 시작 골드에 더합니다.'}`}>
                <ChoiceGroup label="청산 방식" value={s.salvageMode === 'dismantle' ? 'dismantle' : 'sell'} disabled={busy} onChange={v => send({ type: 'salvageMode', value: v })} options={[{ value: 'sell', label: '판매' }, { value: 'dismantle', label: '분해' }]}/>
            </Row>}
        </Card>
        <Card id="scene" title="전투 연출" description="이 기기에만 저장됩니다. 끄면 휴대폰이 덜 버벅이고 배터리를 아낍니다.">
            <SkillFxRow/>
            <FxGlowRow/>
            <SceneLootRow/>
            <SceneLookRows s={s}/>
        </Card>
        <Card id="notices" title="자동 사냥 화면 알림" description="메인 화면에 띄울 알림과 카드를 고릅니다. 꺼도 게임 진행 · 보상은 그대로이고, 같은 내용은 각 메뉴에서 볼 수 있습니다. 이 기기에만 저장됩니다.">
            <NoticeRows/>
        </Card>
        <Card id="enhance" title="강화" description="이 기기에만 저장됩니다.">
            <StarRow id="catch" title="스타캐치 미니게임" desc="수동 강화 때 좌우로 오가는 별을 가운데에서 잡으면 성공률 +10%p. 끄면 바로 강화합니다(자동 강화에는 없음)."/>
            <StarRow id="sound" title="강화 효과음" desc="스타캐치와 강화 성공 · 하락 · 파괴 효과음입니다."/>
        </Card>
        <Card id="about" title="정보" description={`판게아 RPG · OPEN BETA · v${GAME_BUILD}`}>
            <Row title="도움말 · 업데이트 내역" desc="게임 안내와 최근 바뀐 내용.">
                <Button type="button" variant="outline" onClick={() => setView('help')}><HelpCircle/>도움말</Button>
                <Button type="button" variant="outline" onClick={() => setView('updates')}><ScrollText/>업데이트 내역</Button>
            </Row>
            <Row title="판게아 전기" desc="독립 턴제 전술 모드입니다. 본편 세이브와 섞이지 않습니다.">
                <Button asChild variant="outline"><a href="/tactics"><Swords/>전기 열기</a></Button>
            </Row>
        </Card>
    </div>;
}

/* ---------- 조각 ---------- */

function Card({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) {
    return <section aria-labelledby={`settings-${id}`} className="grid gap-2 rounded-l border border-line bg-surface-2 p-4 shadow-1 sm:p-5">
        <SectionHeader as="h2" title={<span id={`settings-${id}`}>{title}</span>} description={description}/>
        <div className="grid">{children}</div>
    </section>;
}
/** 한 줄: 제목 · 설명 | 조작. stack 이면 조작이 아래 줄 전체로. */
function Row({ title, desc, children, device, stack, htmlFor }: { title: ReactNode; desc?: ReactNode; children?: ReactNode; device?: boolean; stack?: boolean; htmlFor?: string }) {
    const Title = htmlFor ? 'label' : 'div';
    return <div className={cn('flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line/60 py-3 first:border-t-0', stack && 'flex-col items-stretch')}>
        <div className={cn('min-w-0', stack ? 'basis-auto' : 'flex-1 basis-64')}>
            <Title htmlFor={htmlFor} className="flex items-center gap-2 text-m font-semibold text-ink-1">{title}{device && <span className="rounded-s bg-surface-3 px-1.5 py-0.5 text-xs font-medium text-ink-3">이 기기</span>}</Title>
            {desc && <p className="mt-1 text-s leading-relaxed text-ink-3">{desc}</p>}
        </div>
        {children && <div className={cn('flex shrink-0 flex-wrap items-center gap-2', stack && 'w-full')}>{children}</div>}
    </div>;
}
function ToggleRow({ title, desc, checked, onChange, disabled, device }: { title: string; desc?: ReactNode; checked: boolean; onChange: (on: boolean) => void; disabled?: boolean; device?: boolean }) {
    const id = `toggle-${title.replace(/\s+/g, '-')}`;
    return <Row title={title} desc={desc} device={device} htmlFor={id}>
        <span className="w-9 text-right font-num text-xs text-ink-3" aria-hidden>{checked ? '켜짐' : '꺼짐'}</span>
        <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange}/>
    </Row>;
}
function ChoiceGroup({ label, options, value, onChange, disabled }: { label: string; options: { value: string; label: string; title?: string; disabled?: boolean; style?: React.CSSProperties; mark?: boolean }[]; value: string | string[]; onChange: (v: string) => void; disabled?: boolean }) {
    const picked = (v: string) => Array.isArray(value) ? value.includes(v) : value === v;
    return <div role="group" aria-label={label} className="flex flex-wrap gap-2">{options.map(o => <button key={o.value} type="button" aria-pressed={picked(o.value)} disabled={disabled || o.disabled} title={o.title} style={o.style}
        className={cn('min-h-9 rounded-m border px-3 text-s font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50',
            picked(o.value) ? 'border-accent bg-accent-soft text-ink-1' : 'border-line bg-surface-1 text-ink-2 hover:bg-surface-3')}
        onClick={() => onChange(o.value)}>{o.label}{o.mark && !picked(o.value) ? ' ·' : ''}</button>)}</div>;
}

/* ---------- 모험가 ---------- */

function NameRow({ s, busy, send }: { s: State; busy: boolean; send: Send }) {
    const [name, setName] = useState(s.name);
    const trimmed = name.trim(), can = trimmed.length >= 2 && trimmed !== s.name;
    return <Row title="모험가 이름" desc="2~16자. 순위표 · 길드 · 결투에 이 이름이 보입니다." htmlFor="settings-name" stack>
        <form className="flex w-full flex-wrap gap-2" onSubmit={e => { e.preventDefault(); if (can && !busy) send({ type: 'rename', value: trimmed }); }}>
            <input id="settings-name" className="h-10 min-w-0 flex-1 basis-48 rounded-m border border-line bg-surface-0 px-3 text-m text-ink-1 outline-none placeholder:text-ink-3 focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/40" value={name} maxLength={16} autoComplete="off" onChange={e => setName(e.target.value)}/>
            <Button type="submit" disabled={busy || !can}><UserRound/>이름 바꾸기</Button>
        </form>
    </Row>;
}
function SlotsRow({ s, busy, onSwitchSlot }: { s: State; busy: boolean; onSwitchSlot: (slot: number) => Promise<void> }) {
    const [error, setError] = useState(''), [switching, setSwitching] = useState(false);
    const current = accountSlot(s), slots = s.account?.slots || [];
    const pick = async (slot: number) => {
        setSwitching(true); setError('');
        try { await onSwitchSlot(slot); } catch (e) { setError(e instanceof Error ? e.message : '슬롯을 바꾸지 못했습니다.'); } finally { setSwitching(false); }
    };
    return <Row title="분신" desc="슬롯마다 다른 모험가를 키웁니다. 모든 슬롯의 기록을 합친 계정 보너스가 각 캐릭터에 적용되고, 쉬는 슬롯은 다음에 들어올 때 부재중 정산을 받습니다." stack>
        <ul className="grid w-full gap-2">{Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).map(slot => {
            const info = slot === current ? { name: s.name, job: s.job, level: s.level, rebirths: s.rebirths } : slots.find(x => x.slot === slot);
            const open = slotUnlocked(s.account, slot), job = info ? jobById(info.job)?.name || info.job : '';
            return <li key={slot} className={cn('flex min-h-11 items-center gap-3 rounded-m border border-line bg-surface-1 px-3 py-2', slot === current && 'border-accent/60', !open && 'opacity-70')}>
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-3 font-num text-xs text-ink-2" aria-hidden>{slot}</span>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-s font-semibold text-ink-1">{info ? info.name : open ? '새 모험가' : '잠김'}</div>
                    <div className="text-xs text-ink-3">{info ? `Lv.${info.level} ${job} · 환생 ${info.rebirths}회` : open ? '처음부터 새로 시작합니다' : slotUnlockText(slot)}</div>
                </div>
                {slot === current ? <span className="rounded-s bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">플레이 중</span>
                    : <Button type="button" size="sm" variant="outline" disabled={busy || switching || !open} onClick={() => pick(slot)}>{info ? '이어하기' : '시작'}</Button>}
            </li>; })}</ul>
        {error && <p className="text-s text-danger" role="alert">{error}</p>}
    </Row>;
}

/* ---------- 자동화 ---------- */

/** v3.35 자동 분해기 · 자동 판매기: 켜고 끄기 + 처리할 등급(1단계 희귀~전설, 2단계 고대까지). 한 등급은 한 장치에만. */
function AutoDeviceRow({ s, busy, send, device, title, verb, on, action }: { s: State; busy: boolean; send: Send; device: AutoDevice; title: string; verb: string; on: boolean; action: 'autoSell' | 'autoVend' }) {
    const max = autoMaxGrade(researchRank(s, AUTO_RESEARCH[device])), mine = autoGrades(s, device), other = autoGrades(s, device === 'salvage' ? 'vend' : 'salvage'), otherName = device === 'salvage' ? '판매기' : '분해기';
    const id = `toggle-${action}`;
    return <>
        <Row title={title} htmlFor={id} desc={`고른 등급의 드롭을 바로 ${verb}합니다. 자동 ${otherName}와 함께 켤 수 있고, 한 등급은 한쪽에만 고를 수 있습니다(같은 등급이면 분해가 먼저). 태초 · 칠흑 · 잠금 장비 · 유물과 장비 도감에 아직 등록하지 않은 종류는 남깁니다.${max < 5 ? ` 연구 2단계에서 ${RARITIES[4].name} · ${RARITIES[5].name}도 고를 수 있습니다.` : ''}`}>
            <span className="w-9 text-right font-num text-xs text-ink-3" aria-hidden>{on ? '켜짐' : '꺼짐'}</span>
            <Switch id={id} checked={on} disabled={busy} onCheckedChange={v => send({ type: action, value: v ? 'on' : 'off' })}/>
        </Row>
        <div className="-mt-1 pb-3"><ChoiceGroup label={`${title} 등급`} value={mine.map(String)} disabled={busy} onChange={v => send({ type: 'autoGrade', id: device, value: v })}
            options={RARITIES.slice(1, 6).map((r, i) => { const g = i + 1; return { value: String(g), label: r.name, disabled: g > max, mark: other.includes(g), style: { color: rarityVar(RARITY_KEYS[g]) }, title: g > max ? '연구 2단계 필요' : other.includes(g) ? `자동 ${otherName}에서 고른 등급(누르면 이쪽으로 옮김)` : undefined }; })}/></div>
    </>;
}

/* ---------- 연출 · 알림 · 강화 (이 기기) ---------- */

function SkillFxRow() {
    const on = useSkillFx();
    return <ToggleRow device title="스킬 이펙트" desc="전투 화면의 스킬 연출 · 피해 숫자 · 체력 막대 반짝임입니다. HP와 전투 기록은 그대로 보입니다. 처음에는 모바일은 꺼짐 · 데스크톱은 켜짐입니다." checked={on} onChange={setSkillFx}/>;
}
function FxGlowRow() {
    const on = useFxGlow(), fx = useSkillFx();
    return <ToggleRow device title="섬광 효과" desc={`스킬 연출 중 배경과 상대 카드가 원형으로 밝아졌다 퍼지는 섬광과, 4차 이상 스킬의 큰 원형 폭발광입니다. 눈이 부시면 끄세요. 투사체 · 파편 · 고리 · 어두워지는 연출은 그대로입니다.${fx ? '' : ' 스킬 이펙트가 꺼져 있어 지금은 섬광도 나오지 않습니다.'} 처음에는 꺼짐입니다.`} checked={on} onChange={setFxGlow}/>;
}
function SceneLootRow() {
    const on = useSceneLootSetting();
    return <ToggleRow device title="몬스터 쪽 보상 알림" desc="몬스터를 쓰러뜨리면 그 자리에 경험치 · 골드 · 숙련 · 획득한 것이 떠오릅니다. 켜 두면 캐릭터 옆 전투 기록에는 전투 줄만 나오고, 끄면 보상 줄이 전투 기록으로 돌아옵니다. 움직임 줄이기를 켠 기기에서는 알림이 뜨지 않아 전투 기록에 나옵니다. 처음에는 켜짐입니다." checked={on} onChange={setSceneLoot}/>;
}
/** v3.268 전투 장면 꾸미기: 배경 · 캐릭터 모양 · 무기 · 직접 올린 그림(이 기기에만 저장)과 작은 미리보기. */
function SceneLookRows({ s }: { s: State }) {
    const look = useSceneLook(), image = useHeroImage(), file = useRef<HTMLInputElement>(null), [error, setError] = useState('');
    const st = stageById(s.stage), d = dungeonById(s.dungeon?.id);
    const auto = backdropTheme(d ? d.name : st?.region, st?.name), job = jobById(s.job);
    const upload = async (f: File | null | undefined) => { if (!f) return; setError(await setHeroImage(f) ?? ''); if (file.current) file.current.value = ''; };
    const select = 'h-10 w-full rounded-m border border-line bg-surface-0 px-2 text-s text-ink-1 outline-none focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/40 disabled:opacity-50';
    return <Row device title="전투 장면 꾸미기" desc="전투 장면의 배경과 내 캐릭터 모습을 고릅니다. ‘자동’은 지금처럼 사냥터 · 직업으로 고릅니다. 그림을 올리면 캐릭터 대신 그 그림이 서고(160×220 안으로 줄여 저장), 요원 · 트레이더 · 해커 · 광부 · 포식자 · 두건 신비가 모양은 전용 그림이라 무기를 고르지 않습니다." stack>
        <div className="grid w-full gap-4 sm:grid-cols-[1fr_200px]">
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs text-ink-3">배경<select className={select} value={look.backdrop} onChange={e => setSceneLook({ backdrop: e.target.value as BackdropTheme | 'auto' })}>
                    <option value="auto">자동 · 사냥터별 (지금: {BACKDROP_LABELS[auto]})</option>
                    {(Object.keys(BACKDROP_LABELS) as BackdropTheme[]).map(t => <option key={t} value={t}>{BACKDROP_LABELS[t]}</option>)}
                </select></label>
                <label className="grid gap-1 text-xs text-ink-3">캐릭터 모양<select className={select} value={look.hero} disabled={!!image} onChange={e => setSceneLook({ hero: e.target.value as HeroKindId | 'auto' })}>
                    <option value="auto">자동 · 직업별</option>
                    {(Object.keys(HERO_LABELS) as HeroKindId[]).map(k => <option key={k} value={k}>{HERO_LABELS[k]}</option>)}
                </select></label>
                <label className="grid gap-1 text-xs text-ink-3">무기<select className={select} value={look.weapon} disabled={!!image} onChange={e => setSceneLook({ weapon: e.target.value as WeaponId | 'auto' })}>
                    <option value="auto">자동 · 직업별</option>
                    {(Object.keys(WEAPON_LABELS) as WeaponId[]).map(w => <option key={w} value={w}>{WEAPON_LABELS[w]}</option>)}
                </select></label>
                <div className="grid gap-1 text-xs text-ink-3">내 그림
                    <input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={e => upload(e.target.files?.[0])}/>
                    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => file.current?.click()}>{image ? '바꾸기' : '그림 올리기'}</Button>{image && <Button type="button" variant="ghost" onClick={() => { setHeroImage(null); setError(''); }}>지우기</Button>}</div>
                </div>
            </div>
            <div className="scene-look-preview battle-scene w-full sm:w-[200px]" aria-label="미리보기">
                <SceneBackdrop theme={look.backdrop === 'auto' ? auto : look.backdrop} fixed/>
                <div className="scene-look-hero"><MyHero s={s} job={job}/></div>
            </div>
        </div>
        {error && <p className="text-s text-danger" role="alert">{error}</p>}
    </Row>;
}
function NoticeRows() {
    const show = useNotices();
    return <>{NOTICE_KINDS.map(k => <ToggleRow key={k.id} title={k.label} desc={k.desc} checked={show(k.id)} onChange={on => setNotice(k.id, on)}/>)}</>;
}
function StarRow({ id, title, desc }: { id: 'catch' | 'sound'; title: string; desc: string }) {
    const on = useStarSetting(id);
    return <ToggleRow device title={title} desc={desc} checked={on} onChange={on => setStarSetting(id, on)}/>;
}
