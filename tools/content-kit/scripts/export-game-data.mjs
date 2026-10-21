#!/usr/bin/env node
/**
 * 게임 데이터 → 키트 형식 내보내기.
 *   node tools/content-kit/scripts/export-game-data.mjs
 * game/data의 몬스터·사냥터·던전·장비 이름·옵션·칠흑·유물·스킬·스토리 장면을 schemas/*.json 모양으로 바꿔
 * data/<type>.json 에 씁니다(중복 방지 기준). 게임 코드는 읽기만 합니다.
 * 저장소 루트의 로더(scripts/lib/game-modules.mjs)를 쓰므로 pnpm install 뒤 저장소 어디서든 실행할 수 있습니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(KIT, '../..');
process.chdir(REPO); // 로더가 'game' 상대 경로를 읽습니다.
const { loadGame } = await import(path.join(REPO, 'scripts/lib/game-modules.mjs'));
const { load } = loadGame();

const W = await load('game/data/world.js');
const B = await load('game/data/balance.js');
const O = await load('game/data/odds.js');
const E = await load('game/data/encounters.js');
const ART = await load('game/data/art.js');
const SK = await load('game/data/skills.js');
const C = await load('game/data/classes.js');
const G = await load('game/data/gear.js');
const MG = await load('game/data/maple-gear.js');
const ONYX = await load('game/data/onyx.js');
const ECO = await load('game/data/economy.js');
const ST = await load('game/data/story.js');
const META = await load('game/systems/meta.js');
const SECRET = await load('game/secret/skills.js');
const SECRET_JOBS = await load('game/secret/jobs.js');

const tierOf = level => Math.max(1, Math.ceil(level / 10));
const camel = /^[a-z][a-zA-Z0-9]{2,30}$/;
const warn = [];

// ───────────── 몬스터 ─────────────
const stageOf = new Map();
for (const st of W.BASE_STAGES) for (const id of st.monsters) if (!stageOf.has(id)) stageOf.set(id, st);
const dungeonOf = new Map();
for (const d of W.DUNGEONS) { for (const id of d.monsters) if (!dungeonOf.has(id)) dungeonOf.set(id, d.id); dungeonOf.set(d.bossMonster, d.id); }
const onyxBoss = new Set(ONYX.ONYX_BOSSES.map(b => b.id));
const specialIds = new Set(['masteryMimic', 'expNuri', 'essenceSlime', 'kingMimic', 'kingNuri', 'kingSlime']);
const monsters = W.MONSTERS.map(f => {
    const st = stageOf.get(f.id), dg = dungeonOf.get(f.id);
    const tags = [];
    if (st) tags.push(st.region); else if (dg) tags.push('던전');
    if (f.boss) tags.push(onyxBoss.has(f.id) ? '칠흑' : '보스');
    if (specialIds.has(f.id)) tags.push('특별');
    if (f.minTier) tags.push(`난이도${f.minTier}+`);
    if (!camel.test(f.id)) warn.push(`monster id 형식: ${f.id}`);
    return {
        id: f.id, name: f.name, name_en: null, level: f.level, tier: tierOf(f.level),
        rarity: f.rarity ?? 'common', boss: !!f.boss,
        spawnWeight: f.rarity && f.rarity !== 'common' ? (O.ODDS.spawn[f.id] ?? 1) : null,
        rewardMultiplier: f.rewardMultiplier ?? null, minTier: f.minTier ?? null,
        profile: E.profileId(f.id), shape: ART.monsterShape(f.id),
        stage: st?.id ?? null, dungeon: dg ?? null,
        lore: f.lore, description: null, behavior: null, weakness: null,
        stats: { hp: f.hp, attack: f.attack, defense: f.defense, exp: f.exp, gold: f.gold },
        drops: null, tags: tags.length ? tags : ['기타'],
    };
});

// ───────────── 지역(사냥터·던전) ─────────────
const habitatByRegion = new Map(W.STAGES.filter(st => st.habitat).map(st => [st.region, st]));
const seenRegion = new Set();
const areas = [];
for (const st of W.BASE_STAGES) {
    const first = !seenRegion.has(st.region); seenRegion.add(st.region);
    const hb = first ? habitatByRegion.get(st.region) : undefined;
    areas.push({
        id: st.id, kind: 'stage', region: st.region, place: st.place, name: st.name, subtitle: st.subtitle,
        level: st.level, rebirth: st.rebirth, fit: st.fit ?? null, tier: tierOf(st.level),
        terrain: null, climate: null, description: st.description, flavor: null, lore: null, ambient_lines: null,
        monsters: [...st.monsters], monster_hints: null, tone: st.tone,
        habitat: hb ? { id: hb.id, subtitle: hb.subtitle, description: hb.description, tone: hb.tone, rebirth: hb.rebirth, signature: [...(W.REGION_SIGNATURE?.[st.region] ?? [])] } : null,
        boss: null, neighbor_hint: null, tags: [st.region, '사냥터'],
    });
}
const VAR = await load('game/data/variants.js');
for (const a of areas) if (a.habitat) a.habitat.signature = [...(VAR.REGION_SIGNATURE[a.region] ?? [])];
for (const d of W.DUNGEONS) {
    const [region, place] = d.name.includes(' · ') ? d.name.split(' · ') : ['', d.name];
    areas.push({
        id: d.id, kind: 'dungeon', region: region || '무릉도장', place, name: d.name, subtitle: 'DUNGEON',
        level: d.level, rebirth: d.rebirth, fit: null, tier: tierOf(d.level),
        terrain: null, climate: null, description: d.description, flavor: null, lore: null, ambient_lines: null,
        monsters: d.monsters.filter((id, i, arr) => !(d.id !== 'abyss' && i === arr.length - 1)), monster_hints: null, tone: '#888888',
        habitat: null,
        boss: { monster: d.bossMonster, title: d.boss, gold: d.gold, pearls: d.pearls },
        neighbor_hint: null, tags: [region || '무릉도장', '던전'],
    });
}

// ───────────── 아이템(장비 이름 · 옵션 · 칠흑 · 유물) ─────────────
const items = [];
const slotNames = { rod: '무기', coat: '방어구', cape: '망토', charm: '장신구' };
const styleIds = { physical: 'Sword', magic: 'Staff', balanced: 'Rod' };
for (let r = 0; r < 7; r++) {
    const set = MG.GEAR_SETS[r], setId = ['novice', 'maple', 'zakum', 'fafnir', 'absolab', 'arcane', 'genesis'][r];
    for (const style of ['physical', 'magic', 'balanced']) items.push({ id: `${setId}${styleIds[style]}`, kind: 'gear', name: MG.gearName('rod', r, style), name_en: null, slot: 'rod', rarity: r, style, set_name: set, tier: null, type: 'weapon', flavor: null, description: null, effect_text: null, affix: null, boss: null, stats: null, source_hint: null, tags: [set, slotNames.rod] });
    for (const [slot, suffix, type] of [['coat', 'Armor', 'armor'], ['cape', 'Cape', 'armor'], ['charm', 'Charm', 'accessory']]) items.push({ id: `${setId}${suffix}`, kind: 'gear', name: MG.gearName(slot, r), name_en: null, slot, rarity: r, style: null, set_name: set, tier: null, type, flavor: null, description: null, effect_text: null, affix: null, boss: null, stats: null, source_hint: null, tags: [set, slotNames[slot]] });
}
for (const a of G.AFFIX_POOL) {
    const tags = ['옵션', a.kind];
    if (a.retired) tags.push('폐기'); if (a.junk) tags.push('꽝'); if (a.rare) tags.push('희귀옵션'); if (a.onlyOrigin) tags.push(a.onlyOrigin);
    items.push({ id: a.id, kind: 'affix', name: a.name, name_en: null, slot: a.onlySlot ?? null, rarity: a.minRarity ?? null, style: null, set_name: null, tier: null, type: null, flavor: null, description: a.description, effect_text: null,
        affix: { stat: a.stat, kind: a.kind, base: a.base, stat2: a.stat2 ?? null, base2: a.base2 ?? null, rollBoth: a.rollBoth ?? null, weight: a.weight ?? null, minRarity: a.minRarity ?? null, onlySlot: a.onlySlot ?? null, onlyOrigin: a.onlyOrigin ?? null, uncapped: a.uncapped ?? null, fixed: a.fixed ?? null, rare: a.rare ?? null, junk: a.junk ?? null },
        boss: null, stats: null, source_hint: null, tags: tags.slice(0, 5) });
}
for (const it of ONYX.ONYX_ITEMS) items.push({ id: it.id, kind: 'onyx', name: it.name, name_en: null, slot: 'charm', rarity: 6, style: null, set_name: null, tier: null, type: 'accessory', flavor: null, description: it.desc, effect_text: null,
    affix: { stat: it.affix.stat, kind: 'rule', base: it.affix.value, stat2: it.affix.stat2 ?? null, base2: it.affix.value2 ?? null, rollBoth: null, weight: null, minRarity: 6, onlySlot: 'charm', onlyOrigin: 'onyx', uncapped: it.affix.uncapped ?? null, fixed: null, rare: null, junk: null },
    boss: it.boss, stats: null, source_hint: `${it.region} 무리 서식지 · ${ONYX.onyxById(it.boss)?.name ?? it.boss}`, tags: ['칠흑', it.region] });
for (const r of ECO.RELICS) items.push({ id: r.id, kind: 'relic', name: r.name, name_en: null, slot: r.slot, rarity: 3, style: r.style ?? null, set_name: null, tier: null, type: null, flavor: null, description: r.description, effect_text: null,
    affix: { stat: r.affix.stat, kind: 'percent', base: r.affix.value, stat2: null, base2: null, rollBoth: null, weight: null, minRarity: 3, onlySlot: r.slot, onlyOrigin: null, uncapped: null, fixed: true, rare: null, junk: null },
    boss: null, stats: null, source_hint: `환생 ${r.rebirth}회 · 세계석 ${r.cost}`, tags: ['유물', slotNames[r.slot]] });

// ───────────── 스킬 ─────────────
const jobTier = new Map(C.JOBS.map(j => [j.id, j.tier]));
const secretSkill = new Set(SECRET.SECRET_SKILLS.map(s => s.id));
const secretJob = new Set(SECRET_JOBS.SECRET_JOBS.map(j => j.id));
const lineageName = new Map(C.LINEAGES.map(l => [l.id, l.name]));
const jobDef = new Map(C.JOBS.map(j => [j.id, j]));
const KNOWN = ['id', 'name', 'desc', 'type', 'level', 'job', 'chance', 'cooldown', 'multiplier', 'cost', 'manaCost', 'damageType', 'baseStat', 'effect', 'statusTurns', 'statusOnly', 'healOnly', 'healRatio', 'drainRatio', 'extraAttacks', 'extraAttackMultiplier', 'accuracyBonus', 'penetrationBonus', 'damageBonusCondition', 'conditionalDamageBonus', 'condition', 'scaling', 'scalingAttribute', 'scalingRatio', 'scalingAttack', 'selfBuff', 'bonus', 'perCount', 'fx', 'rankEffects', 'masteryMilestones'];
const skills = SK.SKILLS.map(sk => {
    const job = sk.job ?? null, tier = job ? (jobTier.get(job) ?? 0) : 0;
    const lineage = job && jobDef.get(job) ? C.lineageOf(jobDef.get(job)) : undefined;
    const tags = [sk.type === 'active' ? '액티브' : '패시브'];
    if (lineage) tags.push(lineageName.get(lineage) ?? lineage);
    if (sk.effect) tags.push(sk.effect);
    if (secretSkill.has(sk.id) || secretJob.has(job)) tags.push('비밀');
    const mechanic = {};
    for (const [k, v] of Object.entries(sk)) if (!KNOWN.includes(k) && v !== undefined) mechanic[k] = v;
    return {
        id: sk.id, name: sk.name, name_en: null, type: sk.type, category: null, job, tier,
        chance: sk.chance, cooldown: sk.cooldown, multiplier: Math.min(8, sk.multiplier), cost: sk.cost ?? 2, manaCost: sk.manaCost ?? null,
        damageType: sk.damageType ?? null, baseStat: sk.baseStat ?? null, effect: sk.effect ?? null, statusTurns: sk.statusTurns ?? null,
        statusOnly: sk.statusOnly ?? null, healOnly: sk.healOnly ?? null, healRatio: sk.healRatio ?? null, drainRatio: sk.drainRatio ?? null,
        extraAttacks: sk.extraAttacks ?? null, extraAttackMultiplier: sk.extraAttackMultiplier ?? null, accuracyBonus: sk.accuracyBonus ?? null, penetrationBonus: sk.penetrationBonus ?? null,
        damageBonusCondition: sk.damageBonusCondition ?? null, conditionalDamageBonus: sk.conditionalDamageBonus ?? null, condition: sk.condition ?? null,
        scaling: sk.scaling ?? null, scalingAttribute: sk.scalingAttribute ?? null, scalingRatio: sk.scalingRatio ?? null, scalingAttack: sk.scalingAttack ?? null,
        selfBuff: sk.selfBuff ? { id: sk.selfBuff.id, name: sk.selfBuff.name ?? null, turns: sk.selfBuff.turns, stats: sk.selfBuff.stats ?? null, speedMultiplier: sk.selfBuff.speedMultiplier ?? null, damageMultiplier: sk.selfBuff.damageMultiplier ?? null } : null,
        bonus: sk.bonus ?? null, perCount: sk.perCount ?? null, fx: sk.fx ?? null, mechanic: Object.keys(mechanic).length ? mechanic : null,
        desc: sk.desc || null, effect_text: null, flavor: null, combo_hint: null, target: null, element: null, params: null, unlock_hint: null, tags: tags.slice(0, 5),
    };
});

// ───────────── 스토리 장면 → 이벤트 ─────────────
const storySrc = fs.readFileSync(path.join(REPO, 'game/data/story.ts'), 'utf8');
const whenOf = new Map();
for (const m of storySrc.matchAll(/id: '([a-zA-Z0-9]+)'[^\n]*?when: s => (.*?), lines:/gs)) whenOf.set(m[1], m[2].trim());
function trigger(id) {
    const w = whenOf.get(id) ?? '';
    let m;
    if (/s\.kills > 0/.test(w)) return { kind: 'first_kill', value: null };
    if ((m = w.match(/visitedStage\(s, '([a-zA-Z0-9]+)'\)/))) return { kind: 'stage_visit', value: m[1] };
    if ((m = w.match(/visited\(s, '([^']+)'\)/))) return { kind: 'region_visit', value: m[1] };
    if ((m = w.match(/reachedTier\(s, (\d+)\)/))) return { kind: 'job_tier', value: +m[1] };
    if ((m = w.match(/slain\(s, '([a-zA-Z0-9]+)'\)/))) return { kind: 'boss_kill', value: m[1] };
    if ((m = w.match(/lives\(s\) >= (\d+)/))) return { kind: 'rebirths', value: +m[1] };
    if ((m = w.match(/abyssBest \|\| 0\) >= (\d+)/))) return { kind: 'abyss_floor', value: +m[1] };
    if (/onyxCollected\(s\) >= ONYX_TOTAL/.test(w)) return { kind: 'onyx_all', value: null };
    if ((m = w.match(/onyxBook\?\.([a-zA-Z]+)/))) return { kind: 'onyx_boss', value: m[1] };
    if (/onyxBook \|\| \{\}\)\.some/.test(w)) return { kind: 'onyx_first', value: null };
    if (/cores\(s\)\.some\(r => r >= 5\)/.test(w)) return { kind: 'core_full', value: null };
    if (/cores\(s\)\.length > 0/.test(w)) return { kind: 'core', value: null };
    if ((m = w.match(/bestStar\(s\) >= (\d+)/))) return { kind: 'star', value: +m[1] };
    if (/s\.wins/.test(w)) return { kind: 'duel_win', value: null };
    if (/guildMember/.test(w)) return { kind: 'guild', value: null };
    if (/s\.market/.test(w)) return { kind: 'market', value: null };
    if ((m = w.match(/rankAtLeast\(s, '([a-z0-9]+)'\)/))) return { kind: 'rank', value: m[1] };
    if (/s\.ascension/.test(w)) return { kind: 'ascend', value: null };
    if (/account\?\.slots/.test(w)) return { kind: 'clone', value: null };
    if (/isHackerJob/.test(w)) return { kind: 'hacker', value: null };
    return { kind: 'custom', value: w.slice(0, 120) || null };
}
const events = ST.STORY.map(sc => ({
    id: sc.id, chapter: sc.chapter, title: sc.title, lines: [...sc.lines], hint: sc.hint, trigger: trigger(sc.id),
    area_filter: null, weight: null, body: null, choices: null, art_hint: null,
    tags: [ST.STORY_CHAPTERS[sc.chapter]?.split(' · ')[0] ?? `제${sc.chapter + 1}장`, trigger(sc.id).kind].slice(0, 5),
}));

// ───────────── 밸런스 참고표(STYLE_GUIDE 6절 근거) ─────────────
const levels = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110];
const balance = {
    generatedAt: new Date().toISOString().slice(0, 10),
    monsterByLevel: levels.map(l => ({ level: l, hp: Math.round(35 + l * 12 + l * l * .65), attack: Math.round(3 + l * 2.2), defense: Math.floor(l * .8), exp: W.monsterExpAt(l), gold: W.monsterGoldAt(l),
        combat: E.enemyStats({ id: '_', hp: Math.round(35 + l * 12 + l * l * .65), attack: Math.round(3 + l * 2.2), defense: Math.floor(l * .8), level: l }) })),
    tide: [0, 5, 10, 20, 30, 50, 70, 100, 200, 260].map(t => ({ tier: t, hp: +META.tierHealth(t).toFixed(2), attack: +META.tierAttack(t).toFixed(2), gold: +META.tierReward(t).toFixed(2), exp: +META.tierExp(t).toFixed(2) })),
    rarities: B.RARITIES, dropRarity: O.ODDS.drop.rarity, dropChance: { base: O.ODDS.drop.chance, cap: O.ODDS.drop.cap }, appraisal: O.ODDS.appraisal,
    spawn: O.ODDS.spawn, variant: O.ODDS.variant.chance, mimic: O.ODDS.mimic, nuri: O.ODDS.nuri, slime: O.ODDS.slime, onyx: O.ODDS.onyx,
};

// 태그는 스키마 상한(12자)에 맞춰 자릅니다.
for (const list of [monsters, areas, items, skills, events]) for (const it of list) it.tags = it.tags.map(t => [...t].slice(0, 12).join(''));

// ───────────── 쓰기 ─────────────
const out = { monster: monsters, area: areas, item: items, skill: skills, event: events };
fs.mkdirSync(path.join(KIT, 'data'), { recursive: true });
for (const [type, list] of Object.entries(out)) {
    fs.writeFileSync(path.join(KIT, 'data', `${type}.json`), JSON.stringify(list, null, 2) + '\n');
    console.error(`[export] data/${type}.json ${list.length}개`);
}
fs.writeFileSync(path.join(KIT, 'data', 'balance-reference.json'), JSON.stringify(balance, null, 2) + '\n');
console.error('[export] data/balance-reference.json');
for (const w of warn) console.error('[주의] ' + w);
