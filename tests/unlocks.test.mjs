// 직업 개편 2단계: ??? 계열의 숨은 조건과 숙달 규칙. v3.62 문(윤회의 문·발견의 문·운영 문 열기)을 없애고 숨은 조건만 남겼습니다(docs/concept.md 11.7).
import { newState, act, advance, strike, stats, reward, canUse, MIMIC_DATA, canChangeJob, jobRequirements, jobMastered, jobMasteryTarget, migrateState, unlocksMod as unlocks, JOBS, SKILLS, lineageOf, passiveGrowthBonus, assert, test } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';
const { progressCounts } = await loadGame().load('game/systems/progression.js');

const ready = (level = 30) => { const s = newState(0); s.level = level; s.rebirths = 1; Object.assign(s.attributes, { str: 30, dex: 30, int: 30, vit: 30, wis: 30, luk: 30 }); return s; };
const job = id => JOBS.find(j => j.id === id);

test('v3.62 hidden unlocks: record conditions (v3.200 four); an unmet one shows as ‘숨은 조건’ and refuses the job change', () => {
    assert.deepEqual(unlocks.UNLOCK_JOBS, ['undead', 'clockmaker', 'journeyman', 'rebirthFisher', 'kkamiHunter', 'nuriTracker', 'darkFollower', 'onyxAvatar', 'abyssAscetic', 'variantScholar', 'altarPilgrim', 'essenceDevourer', 'pearlMiner']);
    const s = ready();
    assert.equal(canChangeJob(s, 'undead'), false);
    assert.ok(jobRequirements(s, job('undead')).some(r => r.label === '숨은 조건' && !r.met));
    assert.throws(() => act(s, { type: 'job', id: 'undead' }, 0), /숨은 조건/);
    s.deaths = 99; assert.equal(canChangeJob(s, 'undead'), false, 'v3.199 99 deaths is not enough');
    s.deaths = 100; act(s, { type: 'job', id: 'undead' }, 0); assert.equal(s.job, 'undead');
    act(s, { type: 'job', id: 'fisher' }, 0); s.deaths = 0;
    assert.equal(canChangeJob(s, 'undead'), true, 'a job once entered ignores its hidden condition');
    assert.equal(unlocks.unlockMet({}, 'manaLeviathan'), null, 'later jobs in a ??? lineage have no hidden condition');
});

test('v3.62 hidden unlocks count play records (v3.199 100 hours · 5 mastered)', () => {
    const s = ready();
    const closed = id => assert.equal(canChangeJob(s, id), false, `${id} closed`), open = id => assert.equal(canChangeJob(s, id), true, `${id} open`);
    closed('clockmaker'); s.playMs = 99 * 3600_000; closed('clockmaker'); s.playMs = 100 * 3600_000; open('clockmaker');
    // v3.199 은월 3차는 히든이 아니라 보스 처치 기록 없이 은월 (2차) 숙련만으로 이어집니다.
    assert.equal(unlocks.unlockMet(s, 'krakenkin'), null); assert.ok(!job('krakenkin').hidden && !job('deepHorror').hidden && !job('leviathanAvatar').hidden);
    assert.equal(job('poorMonk'), undefined, 'v3.199 청빈 수도승 is gone');
    for (const id of unlocks.UNLOCK_JOBS) { const j = job(id); assert.ok(j && j.hidden && j.hint && !j.hint.includes(j.name) && !j.hint.includes('문'), id); }
});

test('v3.62 the rebirth door is gone: no draw at rebirth, the old door jobs keep only their own conditions', () => {
    const s = newState(0); s.level = 60; s.rebirths = 3;
    act(s, { type: 'rebirth' }, 0, () => { throw Error('rebirth draws no random number for a door'); });
    assert.equal(s.rebirthDoor, undefined);
    for (const id of ['voidcaller']) { assert.equal(unlocks.unlockMet({}, id), null, id); assert.ok(!job(id).hint.includes('문'), `${id} hint`); }
    // v3.200 윤회의 나그네는 히든 5차 궁극의 모험가가 되어 숨은 조건(5차 직업 3개 숙달)이 생겼습니다.
    const o = ready(); o.attributes.str = 10; o.attributes.wis = 12; assert.equal(canChangeJob(o, 'rebirthFisher'), false, 'rebirth 1 + stats is no longer enough');
    assert.equal(unlocks.unlockMet({}, 'rebirthFisher'), false); assert.ok(job('rebirthFisher').hidden && job('rebirthFisher').tier === 5 && job('rebirthFisher').signatureFree);
});

test('v3.62 save migration: the open rebirth door becomes a revealed record; admin-opened doors are dropped', () => {
    const s = newState(0); s.rebirthDoor = 'voidcaller'; s.openDoors = ['undead']; s.doorsOpened = ['krakenkin'];
    migrateState(s); migrateState(s);
    assert.equal(s.rebirthDoor, undefined); assert.ok(!('openDoors' in s));
    assert.deepEqual(s.doorsOpened, ['krakenkin', 'voidcaller']);
    assert.equal(canChangeJob(s, 'undead'), false, 'an admin-opened door no longer opens anything');
});

test('Mastery rule: a mastered job can be re-entered at level 1, ignoring level, stats, mastery and hidden conditions', () => {
    const s = newState(0); s.rebirths = 1; const whaler = job('whaler');
    assert.equal(canChangeJob(s, 'whaler'), false);
    s.jobMastery.whaler = jobMasteryTarget(whaler) - 1; assert.equal(jobMastered(s, whaler), false); assert.equal(canChangeJob(s, 'whaler'), false);
    s.jobMastery.whaler = jobMasteryTarget(whaler); assert.equal(s.level, 1); assert.equal(canChangeJob(s, 'whaler'), true);
    act(s, { type: 'job', id: 'whaler' }, 0); assert.equal(s.job, 'whaler');
    s.jobMastery.undead = jobMasteryTarget(job('undead')); assert.equal(canChangeJob(s, 'undead'), true, 'mastery also ignores an unmet hidden condition');
});

test('v25.23 a met hidden condition stays met: the settlement records it and unlockMet honors it after the condition breaks', () => {
    const t = { unlockedJobs: [], deaths: 100 }; const fresh = unlocks.recordUnlocks(t);
    assert.ok(fresh.includes('undead')); assert.ok(t.doorsOpened.includes('undead'));
    t.deaths = 0; assert.equal(unlocks.unlockMet(t, 'undead'), true);
    assert.deepEqual(unlocks.recordUnlocks(t), [], 'already recorded');
    assert.equal(unlocks.unlockMet({ unlockedJobs: [] }, 'undead'), false);
    const s = ready(); s.deaths = 100; advance(s, 1000); assert.ok(s.doorsOpened.includes('undead'), 'advance records it');
});

test('v3.64 retired hidden jobs: the six jobs and their skills are gone, and old saves lose their records without compensation', () => {
    for (const id of ['barehandFisher', 'mistSwordsman', 'headwindSailor', 'sunriseAngler', 'noonDiver', 'nightHeron']) assert.equal(job(id), undefined, id);
    const s = newState(0); s.job = 'nightHeron'; s.unlockedJobs.push('nightHeron', 'noonDiver'); s.jobMastery.nightHeron = 500; s.doorsOpened = ['nightHeron', 'undead'];
    s.learned.heronStill = 3; s.skillPractice.heronStill = 900; s.skillSpent.heronStill = 2; s.skillInheritances.nightEyes = true; s.skills.push('heronStill', 'nightEyes'); s.presets = { a: { name: 'a', skills: ['heronStill', 'hookShot'] } };
    migrateState(s); migrateState(s);
    assert.equal(s.job, 'fisher'); assert.ok(!s.unlockedJobs.includes('nightHeron') && !s.unlockedJobs.includes('noonDiver'));
    assert.equal(s.jobMastery.nightHeron, undefined); assert.deepEqual(s.doorsOpened, ['undead']);
    for (const rec of [s.learned, s.skillPractice, s.skillSpent, s.skillInheritances]) assert.ok(!('heronStill' in rec) && !('nightEyes' in rec));
    assert.ok(!s.skills.includes('heronStill') && !s.skills.includes('nightEyes')); assert.deepEqual(s.presets.a.skills, ['hookShot']);
});

test('v3.135 Night Walker lineage retired: only 망인 (undead) remains in the 제약 lineage; old saves move to 망인 and lose the deleted jobs\' and skills\' records', () => {
    for (const id of ['skeleton', 'bonecaster', 'soulHarvester', 'lichKing', 'deathEmperor']) assert.equal(job(id), undefined, id);
    for (const id of ['marrowGuard', 'ossuaryRite', 'harvestEcho', 'soulTax', 'soulTyranny', 'undyingThrone', 'soulReap', 'undeathThrone']) assert.equal(SKILLS.find(x => x.id === id), undefined, id);
    assert.equal(job('undead').name, '망인'); assert.equal(lineageOf(job('undead')), 'restraint');
    assert.deepEqual(SKILLS.filter(x => x.job === 'undead').map(x => x.name), ['무덤파기', '죽지않은 영혼']);
    const s = newState(0); s.job = 'deathEmperor'; s.unlockedJobs.push('undead', 'skeleton', 'lichKing', 'deathEmperor'); s.jobMastery.lichKing = 900; s.jobMastery.undead = 300;
    s.learned.soulReap = 2; s.skillPractice.soulReap = 5000; s.skillInheritances.undeathThrone = true; s.learned.graveHook = 1; s.skills.push('soulReap', 'graveHook'); s.presets = { a: { name: 'a', skills: ['soulTyranny', 'hookShot'] } };
    migrateState(s); migrateState(s);
    assert.equal(s.job, 'undead'); assert.ok(s.unlockedJobs.includes('undead') && !s.unlockedJobs.some(id => ['skeleton', 'lichKing', 'deathEmperor'].includes(id)));
    assert.equal(s.jobMastery.lichKing, undefined); assert.equal(s.jobMastery.undead, 300, 'the 망인 record stays');
    assert.ok(!('soulReap' in s.learned) && !('soulReap' in s.skillPractice) && !('undeathThrone' in s.skillInheritances)); assert.equal(s.learned.graveHook, 1);
    assert.ok(!s.skills.includes('soulReap')); assert.deepEqual(s.presets.a.skills, ['hookShot']);
});

test('v3.137 망인: job mastery ten million; 죽지않은 영혼 AP 6 → 4 → 2 → −3 at 1M · 4M · 10M practice with no flat minus; only strong job penalties remain', async () => {
    const { apUsed, effectiveSkill } = await loadGame().load('game/systems/progression.js');
    const j = job('undead'); assert.equal(j.masteryTarget, 1e7); assert.deepEqual(j.penalties, { accuracy: -0.08 }); assert.ok(['hp', 'attack', 'magic', 'defense', 'resist'].every(k => j[k] <= .8), 'every multiplier penalty is strong');
    const sk = SKILLS.find(x => x.id === 'boneLegacy'); assert.ok(!Object.values(sk.bonus || {}).some(n => n < 0) && sk.levelEffects.every(l => !Object.values(l.bonus || {}).some(n => n < 0)), 'no flat minus on the passive');
    const ap = n => { const s = newState(0); s.level = 40; s.job = 'undead'; s.learned.boneLegacy = 1; s.skills = ['boneLegacy']; s.skillPractice.boneLegacy = n; return apUsed(s); };
    assert.deepEqual([0, 999_999, 1e6, 4e6, 9_999_999, 1e7].map(ap), [6, 6, 4, 2, 2, -3]);
    assert.equal(effectiveSkill(sk, 1, 3).penaltyRelief, 1, 'the last stage relieves every penalty');
});

test('v3.198 망인 skills: 무덤파기 hits and drains; 죽지않은 영혼 shows only 쓸모없음 but keeps its real effect', async () => {
    const { strike } = await import('./harness.mjs'), D = await loadGame().load('game/systems/skill-description.js');
    const grave = SKILLS.find(x => x.id === 'graveHook'); assert.equal(grave.name, '무덤파기'); assert.ok(!grave.statusOnly && grave.effect === 'drain' && grave.damageType === 'physical');
    const base = { hp: 1e6, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 1000, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const a = { name: 'A', stats: { ...base }, hp: 5e5, mana: 1000, skills: ['graveHook'], cooldowns: {}, stun: 0, effects: {}, ranks: { graveHook: 1 }, mastery: {}, practice: {} }, b = { name: 'B', stats: { ...base }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects: {} };
    strike(a, b, () => 0); assert.ok(b.hp < 1e6, 'it hits'); assert.ok(a.hp > 5e5, 'and drains back');
    const soul = SKILLS.find(x => x.id === 'boneLegacy'); assert.equal(soul.name, '죽지않은 영혼');
    assert.deepEqual(D.skillEffectLines(soul, 3), ['쓸모없음']); assert.equal(D.skillBrief(soul), '쓸모없음'); assert.ok(D.skillGrowthStages(soul).every(r => r.effects.join() === '쓸모없음'));
    assert.equal(soul.levelEffects.at(-1).penaltyRelief, 1, 'the real effect is unchanged');
});

test('v3.64 deaths-count growth (v3.163: the fallen angler is gone, the dark knight keeps the device)', () => {
    const sk = SKILLS.find(x => x.id === 'stormRider');
    const s = newState(0); s.deaths = 0; const none = passiveGrowthBonus(s, sk, progressCounts(s)).attack || 0;
    s.deaths = 50; assert.equal(progressCounts(s).deaths, 50); assert.ok((passiveGrowthBonus(s, sk, progressCounts(s)).attack || 0) > none);
});

test('v3.220 Azeroth hidden lineages: kkami 100 · nuri 100 · every region dungeon 100 (Mu Lung excluded) · onyx bosses 100 in total; their passives count those records', () => {
    const s = ready(70);
    const closed = id => assert.equal(unlocks.unlockMet(s, id), false, `${id} closed`), open = id => assert.equal(unlocks.unlockMet(s, id), true, `${id} open`);
    s.book.masteryMimic = 99; closed('kkamiHunter'); s.book.masteryMimic = 100; open('kkamiHunter');
    s.book.expNuri = 99; closed('nuriTracker'); s.book.expNuri = 100; open('nuriTracker');
    const regions = ['grotto', 'kelpCatacomb', 'cemetery', 'caldera', 'temple', 'ventCathedral', 'starSanctum'];
    for (const id of regions) s.clears[id] = 100;
    s.clears.starSanctum = 99; closed('darkFollower'); s.clears.starSanctum = 100; open('darkFollower');
    assert.equal(s.clears.abyss, undefined, 'Mu Lung is not needed');
    s.onyxBook = { a: 60, b: 39 }; closed('onyxAvatar'); s.onyxBook.b = 40; open('onyxAvatar');
    const c = progressCounts(s);
    assert.deepEqual([c.kkami, c.nuri, c.dungeonBoss, c.onyx], [100, 100, 700, 100]);
    s.clears.abyss = 50; assert.equal(progressCounts(s).dungeonBoss, 700, 'Mu Lung floors are not region clears');
    for (const id of unlocks.UNLOCK_JOBS.slice(-4)) { assert.equal(lineageOf(job(id)), id, `${id} is its own lineage`); assert.ok(SKILLS.some(sk => sk.job === id && (sk.perCount?.length || sk.mineGrowth)), `${id} has a record passive`); }
});

test('v3.221 까미 사냥꾼: 황금 올가미는 까미(대왕 포함)에게만 · 최대 체력 40% 고정 피해 · 반드시 명중 · 로또 상향 표식; 직업이면 까미 ×1.5; 패시브 치명타 300회 +300%p', () => {
    const base = { hp: 1e6, attack: 100, magic: 100, defense: 500, resist: 0, crit: 0, accuracy: 0, evasion: 0.9, speed: 10, mana: 1000, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const hunter = (job = 'kkamiHunter') => ({ name: 'A', job, stats: { ...base }, hp: 1e6, mana: 1000, skills: ['goldenSnare'], cooldowns: {}, stun: 0, effects: {}, ranks: { goldenSnare: 1 }, mastery: {}, practice: {} });
    const foe = foeId => ({ name: 'B', foe: true, foeId, stats: { ...base }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects: {} });
    for (const id of ['grotto', undefined]) { const ev = []; strike(hunter(), foe(id), () => 0, ev); assert.ok(!ev.some(e => e.skillId === 'goldenSnare'), `${id}: not fired on other foes`); }
    for (const id of ['masteryMimic', 'kingMimic']) {
        const b = foe(id), ev = []; strike(hunter(), b, () => 0.99, ev);
        const hit = ev.find(e => e.skillId === 'goldenSnare');
        assert.ok(hit && hit.total === 400000 && !hit.hits[0].critical, `${id}: 40% of max hp, fixed, no crit, sure hit through 90% evasion`);
        assert.equal(b.effects.jackpotUp, 0.25, `${id}: marked`);
    }
    // 까미 사냥꾼 계보 전용(궁극의 모험가는 예외): 다른 직업은 계승을 마쳐도 장착 · 사용할 수 없습니다.
    { const o = ready(70); o.skillInheritances = { goldenSnare: 1 }; o.learned.goldenSnare = 1;
      o.job = 'fisher'; assert.equal(canUse(o, 'goldenSnare'), false, 'another job cannot use it even inherited');
      o.job = 'rebirthFisher'; assert.equal(canUse(o, 'goldenSnare'), true, '궁극의 모험가 is the exception');
      o.job = 'kkamiHunter'; assert.equal(canUse(o, 'goldenSnare'), true); }
    // 표식이 남은 까미: 로또 소(rng 0) → 중으로 상향.
    const s = ready(70); s.enemy = { id: MIMIC_DATA.id, name: '숙련의 까미', hp: 0, maxHp: 1, attack: 1, defense: 0, level: 70, exp: 1, gold: 1, effects: { jackpotUp: 1 } };
    reward(s, () => 0);
    assert.ok(s.logs.some(l => l.text.includes('황금 올가미 · 숙련 로또 소 → 중')), 'jackpot moved up a tier');
    assert.equal(job('kkamiHunter').mimicFind, 0.5);
    // 패시브: 까미 300회면 치명타 +300%p → 100%를 넘은 몫이 극 치명타로(100%p마다 +5%).
    const p = ready(70); Object.assign(p.attributes, { dex: 80, luk: 60 }); p.job = 'kkamiHunter'; p.unlockedJobs.push('kkamiHunter'); p.skills = ['kkamiLedger']; p.learned.kkamiLedger = 1;
    const sc0 = stats(p).superCrit; p.book.masteryMimic = 300; const sc300 = stats(p).superCrit;
    assert.ok(stats(p).crit === 1 && sc300 - sc0 >= 0.1 && sc300 - sc0 <= 0.15 + 1e-9, `superCrit ${sc0} → ${sc300}`);
});

test('v3.221 Azeroth rules: rank badge required (4th tier 하사 · 칠흑의 화신 상사) and mastery ×10 over the Maple World curve', () => {
    const want = { kkamiHunter: '하사', nuriTracker: '하사', darkFollower: '하사', onyxAvatar: '상사' };
    for (const [id, rank] of Object.entries(want)) {
        const s = ready(70); s.book.masteryMimic = 100; s.book.expNuri = 100; s.onyxBook = { a: 100 };
        for (const d of ['grotto', 'kelpCatacomb', 'cemetery', 'caldera', 'temple', 'ventCathedral', 'starSanctum']) s.clears[d] = 100;
        assert.ok(jobRequirements(s, job(id)).some(r => r.label === `계급장 ${rank} 이상` && !r.met), `${id} needs ${rank}`);
    }
    // 같은 차수 메이플 월드 직업(아델 4차 · 5차)의 숙달 목표 · 스킬 마지막 숙련 단계의 10배.
    for (const [id, ref] of [['kkamiHunter', 'voidSovereign'], ['onyxAvatar', 'voidIncarnate']]) {
        assert.equal(job(id).masteryTarget, job(ref).masteryTarget * 10, `${id} mastery target`);
        const last = j => Math.max(...SKILLS.filter(sk => sk.job === j).map(sk => sk.masteryMilestones.at(-1)));
        assert.equal(last(id), last(ref) * 10, `${id} skill milestones`);
    }
});

test('v3.221 누리 추적자: 하얀 발자국은 누리(대왕 포함)에게만 · 최대 체력 40% 고정 피해 · 경험치 로또 상향 표식 · 계보 전용(궁극의 모험가 예외); 직업이면 누리 ×1.5; 패시브 관통 300회 +30%p', () => {
    const base = { hp: 1e6, attack: 100, magic: 100, defense: 0, resist: 500, crit: 0, accuracy: 0, evasion: 0.9, speed: 10, mana: 1000, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const tracker = () => ({ name: 'A', job: 'nuriTracker', stats: { ...base }, hp: 1e6, mana: 1000, skills: ['whiteTrail'], cooldowns: {}, stun: 0, effects: {}, ranks: { whiteTrail: 1 }, mastery: {}, practice: {} });
    const foe = foeId => ({ name: 'B', foe: true, foeId, stats: { ...base }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects: {} });
    for (const id of ['masteryMimic', 'grotto']) { const ev = []; strike(tracker(), foe(id), () => 0, ev); assert.ok(!ev.some(e => e.skillId === 'whiteTrail'), `${id}: not fired`); }
    for (const id of ['expNuri', 'kingNuri']) {
        const b = foe(id), ev = []; strike(tracker(), b, () => 0.99, ev);
        assert.equal(ev.find(e => e.skillId === 'whiteTrail')?.total, 400000, `${id}: 40% fixed, sure hit`); assert.equal(b.effects.jackpotUp, 0.25);
    }
    const o = ready(70); o.skillInheritances = { whiteTrail: 1 }; o.learned.whiteTrail = 1;
    o.job = 'fisher'; assert.equal(canUse(o, 'whiteTrail'), false); o.job = 'rebirthFisher'; assert.equal(canUse(o, 'whiteTrail'), true);
    // 발자국이 남은 누리: 로또 소(rng 0) → 중.
    const s = ready(60); s.enemy = { id: 'expNuri', name: '경험의 누리', hp: 0, maxHp: 1, attack: 1, defense: 0, level: 60, exp: 1, gold: 1, effects: { jackpotUp: 1 } };
    reward(s, () => 0);
    assert.ok(s.logs.some(l => l.text.includes('하얀 발자국 · 경험치 로또 소 → 중')) && s.logs.some(l => l.text.includes('경험의 누리 · 중당첨')), 'exp jackpot moved up a tier');
    assert.equal(job('nuriTracker').nuriFind, 0.5);
    const p = ready(70); Object.assign(p.attributes, { int: 80, wis: 60 }); p.job = 'nuriTracker'; p.unlockedJobs.push('nuriTracker'); p.skills = ['nuriChronicle']; p.learned.nuriChronicle = 1;
    const pen0 = stats(p).penetration; p.book.expNuri = 300; const pen300 = stats(p).penetration;
    assert.ok(pen300 - pen0 > 0.25 && pen300 - pen0 <= 0.3 + 1e-9, `penetration ${pen0} → ${pen300}`);
});

test('v3.221 어둠의 추종자: 어둠의 의식은 지역 보스 코어 수 비례 자기 버프(3 · 5 · 7 단계), 공명 30%, 패시브는 코어 수 · 각성(무릉도장 코어 제외)', async () => {
    const C = await loadGame().load('game/systems/combat.js'), BC = await loadGame().load('game/data/boss-core.js');
    const sk = SKILLS.find(x => x.id === 'shadowRite');
    const at = n => C.withCoreBuff(sk, n);
    assert.equal(at(0).selfBuff.damageMultiplier, 1); assert.equal(at(0).selfBuff.turns, 4);
    assert.equal(at(3).selfBuff.turns, 6); assert.ok(!at(3).wardTurns && !at(3).extraTurn);
    assert.equal(at(5).wardTurns, 2); assert.ok(!at(5).extraTurn);
    const top = at(7); assert.ok(Math.abs(top.selfBuff.damageMultiplier - 1.49) < 1e-9 && Math.abs(top.selfBuff.stats.dotBonus - 0.49) < 1e-9 && Math.abs(top.selfBuff.stats.healBonus - 0.49) < 1e-9 && top.extraTurn && top.wardTurns === 2);
    // 전투: 피해 없이 버프 · 면역 · 추가 행동.
    const base = { hp: 1e6, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 1000, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const me = { name: 'A', job: 'darkFollower', cores: 7, stats: { ...base }, hp: 1e6, mana: 1000, skills: ['shadowRite'], cooldowns: {}, stun: 0, effects: {}, ranks: { shadowRite: 1 }, mastery: {}, practice: {} };
    const foe = { name: 'B', foe: true, stats: { ...base }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects: {} }, ev = [];
    strike(me, foe, () => 0, ev);
    const cast = ev.find(e => e.skillId === 'shadowRite');
    assert.ok(cast && cast.total === 0 && foe.hp === 1e6 && cast.extraTurn, 'no damage, extra action at 7 cores');
    assert.equal(me.effects.buffs.lordShadow.damageMultiplier, 1.49); assert.equal(me.effects.immune.stun, 2);
    // 공명: 어둠의 추종자는 끼지 않은 지역 코어 30%, 무릉도장 코어는 10% 그대로.
    const cores = { bossCores: { grotto: { rank: 0, attrs: [] }, abyssMugong: { rank: 0, attrs: [] } }, coreSlot: undefined };
    assert.equal(BC.coreStats(cores, 0.3).hp, 2000 * 0.3); assert.ok(Math.abs(BC.coreStats(cores, 0.3).penetration - 0.15 * 0.1) < 1e-9, 'abyss core keeps 10%');
    assert.equal(job('darkFollower').coreResonance, 0.3);
    // 패시브 기록: 지역 코어만 셉니다.
    const s = ready(70); s.bossCores = { grotto: { rank: 2, attrs: [] }, temple: { rank: 5, attrs: [] }, abyssMugong: { rank: 5, attrs: [] } };
    const c = progressCounts(s); assert.deepEqual([c.cores, c.coreRanks], [2, 7]);
    assert.equal(job('darkFollower').subRole, 'borderCore'); assert.equal(job('darkFollower').attack, job('darkFollower').magic, 'no physical tilt');
});

test('v3.221 칠흑의 화신: 칠흑 일식은 물리 · 마법 중 높은 쪽 · 끼고 있는 칠흑 장신구 형태, 출현 ×1.5 · 120턴, 패시브는 마나 · 공격/방어 배율(체력 제외)', () => {
    const base = { hp: 1e7, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 1000, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const me = (stats, onyx) => ({ name: 'A', job: 'onyxAvatar', ...(onyx ? { onyx } : {}), stats: { ...base, ...stats }, hp: 1e7, mana: 1000, skills: ['onyxEclipse'], cooldowns: {}, stun: 0, effects: {}, ranks: { onyxEclipse: 1 }, mastery: {}, practice: {} });
    const foe = () => ({ name: 'B', foe: true, prey: true, stats: { ...base }, hp: 1e7, skills: [], cooldowns: {}, stun: 0, effects: {} });
    const cast = (a, b = foe()) => { const ev = []; strike(a, b, () => 0.5, ev, false, false, { id: 'onyxEclipse', index: 0, count: 1, kind: 'awaken' }); return { ev: ev.find(e => e.skillId === 'onyxEclipse'), b, a }; };
    const phys = cast(me({ attack: 1000, magic: 100 })), mag = cast(me({ attack: 100, magic: 1000 }));
    assert.equal(phys.ev.damageType, 'physical'); assert.equal(mag.ev.damageType, 'magic');
    assert.equal(phys.ev.total, mag.ev.total, 'a magic build loses nothing against a physical build');
    assert.ok(cast(me({}, 'onyxWill')).b.stun > 0, '윌: stun');
    assert.ok(cast(me({}, 'onyxLucid')).b.effects.weaken > 0, '루시드: weaken');
    assert.equal(cast(me({}, 'onyxBlackMage')).a.effects.buffs.genesis.damageMultiplier, 1.3, '검은 마법사: damage buff');
    assert.equal(cast(me({}, 'onyxDunkel')).a.effects.buffs.commanderBeat.stats.chainBonus, 0.3, '듄켈: chain buff');
    assert.equal(cast(me({}, 'onyxDusk')).a.effects.buffs.duskFear.stats.thorns, 0.3, '더스크: thorns buff');
    // v3.223 진 힐라: 힐러 규칙의 예외로 최대 체력 20% 회복, 체력이 가득해도 피해가 줄지 않습니다.
    { const a = me({}, 'onyxHilla'); a.hp = 1e5; cast(a); assert.equal(a.hp, 1e5 + 2e6, '진 힐라: heals 20% of max hp'); }
    assert.equal(cast(me({}, 'onyxHilla')).ev.total, cast(me({})).ev.total, '진 힐라: no idle-heal damage cut at full hp');
    assert.ok(cast(me({}, 'onyxSeren')).ev.total > cast(me({})).ev.total * 1.4, '세렌: +50% to bosses');
    assert.equal(job('onyxAvatar').onyxFind, 0.5); assert.equal(job('onyxAvatar').onyxTurns, 120);
    // 패시브: 칠흑 각성을 올려도 체력은 그대로, 공격은 오릅니다.
    const p = ready(70); Object.assign(p.attributes, { str: 70, int: 70 }); p.job = 'onyxAvatar'; p.unlockedJobs.push('onyxAvatar'); p.skills = ['onyxHeart']; p.learned.onyxHeart = 1;
    p.inventory.push({ id: 'o1', name: 'x', slot: 'charm', rarity: 5, level: 70, power: 1, onyx: 'onyxDusk', onyxRank: 0, affixes: [] }, { id: 'o2', name: 'y', slot: 'charm', rarity: 5, level: 70, power: 1, onyx: 'onyxSeren', onyxRank: 0, affixes: [] });
    const c = progressCounts(p); assert.deepEqual([c.onyxOwned, c.onyxRanks], [2, 0]);
    const before = stats(p); p.inventory.forEach(i => { i.onyxRank = 5; }); const after = stats(p);
    assert.equal(progressCounts(p).onyxRanks, 10);
    assert.equal(after.hp, before.hp, 'combatScale leaves hp alone'); assert.ok(after.attack > before.attack && after.magic > before.magic);
    assert.ok(SKILLS.find(s => s.id === 'onyxHeart').bonus.mana > 0 && !SKILLS.find(s => s.id === 'onyxHeart').bonus.hp && !SKILLS.find(s => s.id === 'fallenLords').bonus.hp, 'mana instead of max hp');
});

test('v3.230 아제로스 3계보: 무릉도장 50층 · 변종 1,000 · 신 도전 100이 조건; 직업마다 무릉 주화 ×1.5 · 변종 · 황금 ×1.5 · 신 도전 간격 절반; 기록 비례 패시브', async () => {
    const L = loadGame(), V = await L.load('data/variants'), A = await L.load('data/altar');
    const s = ready();
    assert.equal(unlocks.unlockMet(s, 'abyssAscetic'), false); s.abyssBest = 50; assert.equal(unlocks.unlockMet(s, 'abyssAscetic'), true);
    s.variantBook = { minnow: { giant: 900 } }; s.goldenBook = { minnow: 99 }; assert.equal(unlocks.unlockMet(s, 'variantScholar'), false);
    s.goldenBook.minnow = 100; assert.equal(unlocks.unlockMet(s, 'variantScholar'), true);
    s.altar = { tries: 99 }; assert.equal(unlocks.unlockMet(s, 'altarPilgrim'), false); s.altar.tries = 100; assert.equal(unlocks.unlockMet(s, 'altarPilgrim'), true);
    const c = progressCounts(s); assert.equal(c.abyssBest, 50); assert.equal(c.altar, 100);
    assert.equal(job('abyssAscetic').abyssCoinScale, 1.5); assert.equal(job('variantScholar').variantRate, .5); assert.equal(job('altarPilgrim').altarCooldownScale, .5);
    const v = newState(0); v.book.minnow = 50; const base = V.variantChances(v).giant; v.job = 'variantScholar'; assert.ok(Math.abs(V.variantChances(v).giant / base - 1.5) < 1e-9 || V.variantChances(v).giant === 1);
    assert.equal(A.altarCooldownMs({ job: 'altarPilgrim' }), A.ALTAR.challengeCooldownMs / 2); assert.equal(A.altarCooldownMs({ job: 'hero' }), A.ALTAR.challengeCooldownMs);
    for (const id of ['abyssAscetic', 'variantScholar', 'altarPilgrim']) { const j = job(id); assert.ok(j.hidden && j.masteryBoost === .1 && SKILLS.filter(sk => sk.job === id).length === 2, id); }
});
