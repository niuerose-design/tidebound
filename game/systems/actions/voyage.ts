/** 모험 진행: 사냥 시작·정지, 사냥터·던전 이동, 집중 사냥, 안내·목표 설정 */
import { skillPracticeTargets } from '../progression';
import { tideLimit, encounterTier } from '../meta';
import { STAGES, DUNGEONS, FISH , dungeonClosed, stageClosed } from '../../data/world';
import { SWARM_CAPS } from '../../data/variants';
import { JOBS } from '../../data/classes';
import { SKILLS, skillById } from '../../data/skills';
import type { ActionHandlers } from './types';
import { researchRank, salvageRate } from '../../data/economy';
import { addLog, endRun } from '../state';
import { parseRepeat, enterDungeon } from '../dungeon-run';

export const voyageActions: ActionHandlers = {
    sync() {},
    tide(s, { id }) {
        const tier = Number(id);
        if (!Number.isInteger(tier) || tier < 0 || tier > tideLimit(s) || s.dungeon)
            throw Error('사냥터 난이도 조건을 확인하세요.');
        if (tier && s.vows?.seal)
            throw Error('잠든 힘 봉인 중에는 사냥터 난이도가 0으로 고정됩니다.');
        s.tide = tier;
        s.enemy = null;
        s.effects = {};
        s.playerStun = 0;
        addLog(s, `사냥터 난이도 ${tier}단계`);
    },
    start(s, { now }) {
        s.running = true;
        s.lastTick = now;
        addLog(s, '자동 사냥을 시작했습니다.');
    },
    pause(s) {
        s.running = false;
        endRun(s, '직접 멈춤');
        addLog(s, '사냥을 잠시 멈췄습니다.');
    },
    stage(s, { id }) {
        const st = STAGES.find(x => x.id === id);
        if (!st || s.level < st.level || s.rebirths < st.rebirth)
            throw Error('아직 진입할 수 없는 사냥터입니다.');
        if (stageClosed(st.id))
            throw Error(`${st.name}은(는) 점검 중이라 입장할 수 없습니다.`);
        s.stage = id;
        s.target = null;
        s.effects = {};
        s.playerStun = 0;
        s.bestStage = Math.max(s.bestStage || 0, STAGES.indexOf(st));
        s.dungeon = null;
        s.enemy = null;
        addLog(s, `${st.name}(으)로 이동했습니다.`);
    },
    dungeon(s, { a, id, now }) {
        const d = DUNGEONS.find(x => x.id === id);
        if (!d || s.level < d.level || s.rebirths < d.rebirth)
            throw Error('던전 입장 조건을 충족하지 못했습니다.');
        if (dungeonClosed(d.id))
            throw Error(`${d.name}은(는) 점검 중이라 입장할 수 없습니다.`);
        enterDungeon(s, d.id, parseRepeat(s, d.id, a.value));
        s.running = true;
        s.lastTick = now;
    },
    leaveDungeon(s) {
        s.dungeon = null;
        s.enemy = null;
        s.running = false;
        endRun(s, '던전 귀환');
        addLog(s, '던전에서 귀환했습니다.');
    },
    target(s, { id }) {
        if (s.dungeon)
            throw Error('던전에서는 목표를 바꿀 수 없습니다.');
        const stage = STAGES.find(x => x.id === s.stage)!;
        if (id !== 'all' && !stage.fish.includes(id))
            throw Error('현재 사냥터의 몬스터를 선택하세요.');
        // v26.5 사냥터 난이도 조건이 있는 몬스터는 그 난이도부터만 집중 사냥할 수 있습니다(조용히 무작위로 빠지지 않도록 막습니다).
        const need = id === 'all' ? 0 : FISH.find(f => f.id === id)?.minTier || 0;
        if (need > encounterTier(s))
            throw Error(`${FISH.find(f => f.id === id)?.name}은(는) 사냥터 난이도 ${need}부터 나타납니다(지금 ${encounterTier(s)}).`);
        s.target = id === 'all' ? null : id;
        s.enemy = null;
    },
    offlineDismiss(s) {
        s.lastOffline = null;
    },
    autoSell(s, { a }) {
        if (!researchRank(s, 'sortingNet'))
            throw Error('선별의 눈 연구가 필요합니다.');
        s.autoSell = a.value === 'on';
    },
    doorNotice(s, { a }) {
        s.hideDoorNotice = a.value === 'off';
    },
    statConfirm(s, { a }) {
        s.skipStatConfirm = a.value === 'off';
    },
    /** v27.32 무리 최대 규모: '0'(끔)·'5'·'100'·'500'(제한 없음). 다음 출현부터 적용합니다. */
    swarmCap(s, { a }) {
        const cap = Number(a.value);
        if (!(SWARM_CAPS as readonly number[]).includes(cap))
            throw Error('무리 최대 규모는 끔·×5·×100·제한 없음 중에서 고르세요.');
        if (cap >= 500) delete s.swarmCap; else s.swarmCap = cap;
    },
    salvageMode(s, { a }) {
        if (!salvageRate(s))
            throw Error('환생 정리 연구가 필요합니다.');
        if (a.value !== 'sell' && a.value !== 'dismantle')
            throw Error('정리 방식은 판매 또는 분해입니다.');
        s.salvageMode = a.value;
    },
    rename(s, { a }) {
        const name = (a.value || '').trim();
        if (name.length < 2 || name.length > 16)
            throw Error('이름은 2~16자로 입력하세요.');
        s.name = name;
    },
    tutorial(s, { id }) {
        if (!s.tutorial) s.tutorial = {};
        if (id === 'hide') s.tutorial.hidden = true;
        else if (id === 'show') { s.tutorial.hidden = false; s.tutorial.skipped = false; }
        else if (id === 'skip') s.tutorial.skipped = true;
        else throw Error('알 수 없는 안내 설정입니다.');
    },
    growthGoal(s, { a, id }) {
        const kind = a.value;
        if (id === 'none') { s.growthGoal = null; return; }
        const valid = kind === 'skill' ? SKILLS.some(x => x.id === id) : kind === 'job' ? JOBS.some(x => x.id === id) : kind === 'dungeon' ? DUNGEONS.some(x => x.id === id) : false;
        if (!valid) throw Error('성장 목표를 확인하세요.');
        s.growthGoal = { kind: kind as 'skill' | 'job' | 'dungeon', id, ...(kind === 'skill' ? { target: Math.min(skillPracticeTargets(skillById(id)!).length, skillPracticeTargets(skillById(id)!).filter(n => (s.skillPractice[id] || 0) >= n).length + 1) } : {}) };
    },
};
