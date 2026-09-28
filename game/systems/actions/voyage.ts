/** 항해 진행: 낚시 시작·정지, 낚시터·던전 이동, 집중 사냥, 안내·목표 설정 */
import { skillPracticeTargets } from '../progression';
import { swarmUnlocked, tideLimit } from '../meta';
import { STAGES, DUNGEONS, SWARM_SIZES, SWARM_UNLOCK } from '../../data/world';
import { JOBS } from '../../data/classes';
import { SKILLS } from '../../data/skills';
import type { ActionHandlers } from './types';
import { addLog, endRun } from '../state';
import { parseRepeat, enterDungeon } from '../dungeon-run';

export const voyageActions: ActionHandlers = {
    sync() {},
    tide(s, { id }) {
        const tier = Number(id);
        if (!Number.isInteger(tier) || tier < 0 || tier > tideLimit(s) || s.dungeon)
            throw Error('해역 난이도 조건을 확인하세요.');
        s.tide = tier;
        s.enemy = null;
        s.effects = {};
        s.playerStun = 0;
        addLog(s, `해역 난이도 ${tier}단계`);
    },
    start(s, { now }) {
        s.running = true;
        s.lastTick = now;
        addLog(s, '자동 낚시를 시작했습니다.');
    },
    pause(s) {
        s.running = false;
        endRun(s, '직접 멈춤');
        addLog(s, '낚시를 잠시 멈췄습니다.');
    },
    stage(s, { id }) {
        const st = STAGES.find(x => x.id === id);
        if (!st || s.level < st.level || s.rebirths < st.rebirth)
            throw Error('아직 진입할 수 없는 낚시터입니다.');
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
            throw Error('현재 낚시터의 물고기를 선택하세요.');
        s.target = id === 'all' ? null : id;
        s.enemy = null;
    },
    swarm(s, { id }) {
        const size = Number(id);
        if (!(SWARM_SIZES as readonly number[]).includes(size))
            throw Error('무리 규모를 확인하세요.');
        if (size > 1 && (s.dungeon || !s.target))
            throw Error('낚시터에서 집중 사냥할 어종을 먼저 고르세요.');
        if (size > 1 && !swarmUnlocked(s, s.target!, size))
            throw Error(`이 어종을 ${SWARM_UNLOCK[size].toLocaleString()}마리 포획하면 열립니다.`);
        s.swarm = size;
        s.enemy = null;
        addLog(s, size > 1 ? `무리 사냥 ×${size} · 전멸해야 보상을 받습니다.` : '무리 사냥을 끄고 한 마리씩 낚습니다.');
    },
    offlineDismiss(s) {
        s.lastOffline = null;
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
        s.growthGoal = { kind: kind as 'skill' | 'job' | 'dungeon', id, ...(kind === 'skill' ? { target: Math.min(skillPracticeTargets(SKILLS.find(x => x.id === id)!).length, skillPracticeTargets(SKILLS.find(x => x.id === id)!).filter(n => (s.skillPractice[id] || 0) >= n).length + 1) } : {}) };
    },
};
