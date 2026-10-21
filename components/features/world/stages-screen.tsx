'use client';
/** v3.395 사냥터(새 토대): 월드맵 · 난이도 카드 · 지역별 접는 장소 카드. 서버 행동(stage · tide · target)은 전과 같습니다. */
import { useState } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { STAGES, REGIONS, HABITAT, closedIn, CLOSED_NOTE } from '@/game/data/world';
import { regionSignature } from '@/game/data/variants';
import { catalogNow } from '@/game/data/catalog';
import { levelGateOk, tideLimit } from '@/game/systems/meta';
import { onyxBossFor } from '@/game/data/onyx';
import { mimicStageMultiplier } from '@/game/data/mimic';
import { SectionHeader, FoldSection } from '@/components/ui/game';
import { WorldMap } from '@/components/game/world-map';
import { TidePanel } from '@/components/features/battle/tide-panel';
import { cn } from '@/lib/utils';
import { PlaceCard, Badge, RegionProgress, RegionResearchLine } from './parts';

type Send = (a: Action) => void;
const KEY = 'tidebound:stage-regions';

export function StagesScreen({ s, send, busy }: { s: State; send: Send; busy: boolean }) {
    // 사냥터와 던전은 동시에 돌지 않습니다. 던전 탐험 중에는 현재 사냥터 표시를 지우고 이동을 막습니다(전투 레일과 같은 규칙).
    // v3.49 정보 비공개가 켜져 있으면 무리 규모 비율·까미 출현 배율을 숨깁니다.
    const inDungeon = !!s.dungeon, secret = catalogNow().secret;
    // v27.80 지역별 접기·펴기: 처음에는 지금 사냥터가 있는 지역만 펼칩니다. 고른 상태는 이 브라우저에만 기억합니다.
    const [openRegions, setOpenRegions] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } });
    const toggle = (region: string, open: boolean) => setOpenRegions(prev => { const next = { ...prev, [region]: open }; try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 저장소를 못 쓰면 이번 화면에서만 기억 */ } return next; });
    return <div className="grid gap-5 text-ink-1">
        <SectionHeader as="h1" eyebrow="WORLD MAP" title="사냥터" description="더 먼 곳, 더 강한 몬스터. 오늘의 사냥터를 선택하세요."/>
        {/* v3.368 월드맵: 메이플 월드 · 코프룰루 구역을 나눠 그린 지도에서 바로 입장합니다. */}
        <WorldMap s={s} send={send} busy={busy}/>
        {/* v25.9 환생 전에는 올릴 차수가 없으므로 난이도 카드를 숨깁니다. */}
        {tideLimit(s) > 0 && <TidePanel s={s} send={send} busy={busy}/>}
        {inDungeon && <p className="rounded-m border border-warn/50 bg-warn/10 px-3 py-2 text-s">던전 탐험 중에는 사냥이 멈춰 있고 사냥터를 바꿀 수 없습니다. 던전에서 귀환하거나 반복이 끝나면 사냥터로 돌아옵니다.</p>}
        {/* v27.34 지역별로 묶어 보여 줍니다. 지역마다 접고 펼 수 있고, 무리 서식지가 지역 끝에 붙습니다. 번호는 전체 순서 그대로입니다. */}
        {REGIONS.map(region => { const places = STAGES.filter(st => st.region === region), here = places.some(st => st.id === s.stage), sig = regionSignature(region);
            return <FoldSection key={region} title={<span className="inline-flex items-center gap-2">{region}{here && <Badge>현재 지역</Badge>}</span>} summary={`${places.filter(st => !st.habitat).length}곳 · 무리 서식지${sig.length ? ` · 대표 변종 ${sig.map(v => `${v.mark} ${v.name}`).join('·')}` : ''}`}
                defaultOpen={openRegions[region] ?? here} onOpenChange={open => toggle(region, open)} extra={<RegionResearchLine s={s} region={region}/>}>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{places.map(st => { const i = STAGES.indexOf(st);
                    const closed = closedIn(s, 'stages', st.id), locked = closed || !levelGateOk(s, st.level) || s.rebirths < st.rebirth;
                    const current = s.stage === st.id && !inDungeon;
                    return <PlaceCard key={st.id} as="button" index={i} locked={locked} tone={st.tone} disabled={busy || locked || inDungeon} onClick={() => send({ type: 'stage', id: st.id })}
                        className={cn(current && 'border-accent/70 bg-accent-soft', st.habitat && 'border-dashed')}
                        state={current ? <Badge>현재 사냥터</Badge> : <ArrowUpRight size={16} className="text-ink-3"/>}
                        eyebrow={<span className="inline-flex items-center gap-1"><MapPin size={11}/>{closed ? CLOSED_NOTE : st.subtitle}</span>} title={st.place} description={st.description}
                        foot={<>
                            <span>Lv. {st.level}+{st.rebirth ? ` · 환생 ${st.rebirth}회` : ''}{(st.fit ?? 0) > st.rebirth ? <em className={cn('not-italic', s.rebirths >= st.fit! ? 'text-ok' : 'text-warn')} title="기준 몸 측정: 난이도 0에서 무리 없이 사냥할 수 있는 환생(도움말 ‘사냥터’)"> · 적정 환생 {st.fit}</em> : null}</span>
                            <span>{st.habitat ? `${st.monsters.length}종 · ${secret ? `무리 ×${HABITAT.sizes[0]}·×${HABITAT.sizes[1]}` : `무리 ×${HABITAT.sizes[0]} ${Math.round((1 - HABITAT.bigChance) * 100)}% · ×${HABITAT.sizes[1]} ${Math.round(HABITAT.bigChance * 100)}%`} 확정 · 까미·누리 없음${onyxBossFor(st.region) ? ` · 칠흑 보스 ${onyxBossFor(st.region)!.name}` : ''}` : `${st.monsters.length}종 서식${secret ? '' : ` · 까미 ×${mimicStageMultiplier(i).toFixed(2)}`}`}</span>
                            {st.habitat ? <span className="text-warn">고위험 고보상 · 처치 한 번에 마리 수만큼 보상·도감 · ×500은 보상 1.5배</span> : <RegionProgress s={s} id={st.id}/>}
                        </>}/>;
                })}</div>
            </FoldSection>; })}
    </div>;
}
