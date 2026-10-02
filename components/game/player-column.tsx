'use client';
import { tutorialActive } from './growth-goals';
import { TutorialCard } from './guidance-panels';
import { tutorialEarly } from '@/game/systems/guidance';
import { Anchor, BookOpen, ChevronRight, Flag, Heart, Shield, ShoppingBag, Swords, Target, Trophy, Users, Zap } from 'lucide-react';
import { goalSummary } from '@/game/systems/progress';
import { Meter, SlotIcon, format } from './shared';
import { xpNeeded, SLOTS, RARITIES } from '@/game/data/balance';
import { jobById } from '@/game/data/classes';
import { stats, power } from '@/game/systems/stats';
import { StatusBadges } from './combat-status';
import type { State, Action } from '@/game/types';
export function Player({ s, busy, send, setView }: {
    s: State;
    busy: boolean;
    send: (a: Action) => void;
    setView: (v: string) => void;
}) {
    const a = stats(s);
    return <aside className="player-column">
    <div className="panel player-panel">
    <div className="section-title">
    <h2>나의 낚시꾼</h2>
    <span className="micro">CHARACTER</span>
    </div>
    <div className="player-avatar">
    <Anchor size={36}/>
    <span>{s.level}</span>
    </div>
    <div className="combatant-name character-name"><h3>{s.name}</h3><StatusBadges effects={s.effects} stun={s.playerStun}/></div>
    <p className="job-label">{jobById(s.job)?.name} · 환생 {s.rebirths}회</p>
    <p className="guild-label"><Users size={14}/>{s.guildMember?.name ? `길드 · ${s.guildMember.name}` : '무소속'}</p>
    <div className="combat-power">
    <span>전투력</span>
    <strong>{format(power(a))}</strong>
    </div>
    <Meter value={s.hp} max={a.hp} label="체력"/>
    <Meter value={s.mana} max={a.mana} label="마나" color="mana"/>
    <Meter value={s.exp} max={xpNeeded(s.level)} label="경험치" color="gold"/>
    <div className="stat-grid">
    <div>
    <Swords />
    <span>물리 공격</span>
    <b>{a.attack}</b>
    </div>
    <div>
    <Shield />
    <span>물리 방어</span>
    <b>{a.defense}</b>
    </div>
    <div>
    <Heart />
    <span>최대 체력</span>
    <b>{a.hp}</b>
    </div>
    <div>
    <Target />
    <span>치명타</span>
    <b>{Math.round(a.crit * 100)}%</b>
    </div>
    <div>
    <Zap />
    <span>마법 공격</span>
    <b>{a.magic}</b>
    </div>
    <div>
    <Shield />
    <span>마법 방어</span>
    <b>{a.resist}</b>
    </div>
    </div>
    <button className="text-button build-link" onClick={() => setView('character')}>능력치 배분 · 남은 {s.statPoints}P <ChevronRight size={14}/>
    </button>
    <div className="section-title equipment-title">
    <h2>착용 장비</h2>
    <button aria-label="장비 보관함 열기" className="icon-button" onClick={() => setView('inventory')}>
    <ChevronRight size={17}/>
    </button>
    </div>
    <div className="mini-equipment">{Object.entries(SLOTS).map(([id, label]) => {
            const item = s.equipment[id];
            return <button key={id} onClick={() => setView('inventory')}>
            <div className="mini-slot" style={{ color: item ? RARITIES[item.rarity].color : undefined }}>
            <SlotIcon slot={id} size={19}/>
            </div>
            <span>
            <small>{label}</small>
            <strong style={{ color: item ? RARITIES[item.rarity].color : undefined }}>{item?.name || '빈 슬롯'}</strong>
            </span>
            </button>;
        })}</div>
    <div className="section-title shortcut-title">
    <h2><Zap size={15}/> 빠른 이동</h2>
    </div>
    <div className="battle-stage-list battle-shortcut-list">
        {(s.daily || s.weekly) && <button type="button" className="battle-stage-button" onClick={() => setView('voyage')}><span className="battle-stage-index"><Flag size={13}/></span><span><strong>목표 · 업적</strong><small>오늘 {goalSummary(s.daily).done}/{goalSummary(s.daily).total} · 주간 {goalSummary(s.weekly).done}/{goalSummary(s.weekly).total}</small></span><ChevronRight size={13}/></button>}
        {([['skills', '스킬 편성', Zap], ['inventory', '장비 보관함', ShoppingBag], ['book', '도감 연구', BookOpen], ['ranking', '랭킹 · 결투', Trophy]] as const).map(([id, name, Icon]) => <button type="button" key={id} className="battle-stage-button" onClick={() => setView(id)}><span className="battle-stage-index"><Icon size={13}/></span><span><strong>{name}</strong></span><ChevronRight size={13}/></button>)}
    </div>
    </div>
    {tutorialActive(s) && !tutorialEarly(s) && <TutorialCard s={s} send={send} busy={busy} setView={setView}/>}
    </aside>;
}
