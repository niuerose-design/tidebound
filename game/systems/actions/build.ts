/** 빌드: 전직, 스킬 장착·습득·계승·강화, 능력치 배분, 편성 저장 */
import { SPECIALIZATIONS, specializationFits } from '../../data/specializations';
import { stats, clampVitals } from '../stats';
import type { Attribute } from '../../types';
import { JOBS } from '../../data/classes';
import { SKILLS } from '../../data/skills';
import { emptyAttributes } from '../../data/progression';
import { canUse, skillBlockReason, canChangeJob, trimLoadout, validLoadout, skillCost, grantJobSkills, canSpendSkill, canInheritSkill, skillLevel, skillMastery } from '../progression';
import type { ActionHandlers } from './types';
import { addLog, endRun } from '../state';

export const buildActions: ActionHandlers = {
    specialize(s, { a, id }) {
        if (s.running || s.dungeon) throw Error('낚시를 멈추고 던전에서 나온 뒤 특화를 바꾸세요.');
        const sk = SKILLS.find(x => x.id === id), spec = SPECIALIZATIONS.find(x => x.id === a.value);
        if (!sk || !canUse(s, id)) throw Error('사용 가능한 스킬을 선택하세요.');
        if (a.value !== 'none' && (!spec || !specializationFits(sk, spec) || skillMastery(s, id) < 1 || (spec.dungeon && !s.bossResearchClaims?.[spec.dungeon]))) throw Error('실전 숙련 1단계와 해당 보스 연구가 필요합니다.');
        s.skillSpecializations ??= {};
        if (a.value === 'none') delete s.skillSpecializations[id]; else s.skillSpecializations[id] = spec!.id;
        addLog(s, `${sk.name} · ${spec?.name || '기본형'} 선택 · 변경 비용 없음`);
    },
    job(s, { id, now }) {
        // 문 시간 판정은 요청 시각(서버 now)으로 합니다.
        if (!canChangeJob(s, id, now))
            throw Error('레벨·능력치·선행 직업 숙련·문 조건을 확인하세요.');
        // A class change is a safe combat boundary. Discard only the
        // unfinished encounter (and any dungeon reward), then apply the
        // new class with the current HP/MP ratio intact.
        const hadCombat = s.running || !!s.dungeon || !!s.enemy || s.recovery > 0;
        const old = stats(s);
        if (hadCombat) {
            const fromDungeon = !!s.dungeon;
            s.running = false;
            s.dungeon = null;
            s.enemy = null;
            s.recovery = 0;
            s.effects = {};
            s.playerStun = 0;
            s.cooldowns = {};
            s.lastTick = now;
            endRun(s, fromDungeon ? '전직으로 던전 정리 · 멈춤' : '전직으로 전투 정리 · 멈춤');
            addLog(s, fromDungeon ? '전직을 위해 진행 중인 던전을 보상 없이 정리하고 귀환했습니다.' : '전직을 위해 진행 중인 전투를 정리했습니다. 현재 입질은 사라집니다.');
        }
        s.job = id;
        if (!s.unlockedJobs.includes(id))
            s.unlockedJobs.push(id);
        grantJobSkills(s);
        trimLoadout(s);
        const next = stats(s);
        const hpRatio = old.hp > 0 ? s.hp / old.hp : 1;
        const manaRatio = old.mana > 0 ? s.mana / old.mana : 1;
        s.hp = Math.min(next.hp, Math.max(1, Math.floor(hpRatio * next.hp)));
        s.mana = Math.min(next.mana, Math.max(0, Math.floor(manaRatio * next.mana)));
        s.enemy = null;
        s.effects = {};
        s.playerStun = 0;
        s.cooldowns = {};
        addLog(s, `${JOBS.find(j => j.id === id)!.name}(으)로 전직했습니다. 숙달 스킬을 계승할 수 있습니다.`);
    },
    skill(s, { id }) {
        if (s.skills.includes(id)) {
            const nextSkills = s.skills.filter(x => x !== id);
            if (!validLoadout(s, nextSkills))
                throw Error('이 스킬을 빼면 AP가 부족합니다. 다른 스킬을 먼저 해제하세요.');
            s.skills = nextSkills;
        }
        else {
            if (!canUse(s, id))
                throw Error(skillBlockReason(s, id) || '사용할 수 없는 스킬입니다.');
            if (!validLoadout(s, [...s.skills, id]))
                throw Error('총 장착 AP 한도를 초과합니다.');
            s.skills.push(id);
        }
        clampVitals(s);
    },
    learn(s, { id }) {
        if (!canSpendSkill(s, id))
            throw Error('전직으로 얻고 현재 사용할 수 있는 스킬만 강화할 수 있습니다. 최대 레벨도 확인하세요.');
        const sk = SKILLS.find(x => x.id === id)!;
        const cost = skillCost();
        if (s.sp < cost)
            throw Error('SP가 부족합니다. 보스 첫 정복 연구 또는 최종 도감 연구에서 얻을 수 있습니다.');
        s.sp -= cost;
        s.skillSpent[id] = (s.skillSpent[id] || 0) + cost;
        s.learned[id] = skillLevel(sk, s.learned[id], skillMastery(s, id)) + 2;
        addLog(s, `${sk.name} 강화 Lv.${s.learned[id] - 1} · SP -${cost}`, 'skill');
    },
    inheritSkill(s, { id }) {
        if (!canInheritSkill(s, id))
            throw Error('전직으로 얻은 미계승 스킬만 SP로 계승할 수 있습니다.');
        const cost = skillCost();
        if (s.sp < cost)
            throw Error('계승에는 1 SP가 필요합니다. 장착 승리로 무료 계승할 수도 있습니다.');
        s.sp -= cost;
        s.skillSpent[id] = (s.skillSpent[id] || 0) + cost;
        s.skillInheritances[id] = true;
        addLog(s, `${SKILLS.find(x => x.id === id)!.name} SP 계승 · 다른 직업에서도 장착 가능`, 'skill');
    },
    resetSkills(s) {
        if (s.running || s.dungeon)
            throw Error('전투를 멈춘 뒤 초기화하세요.');
        s.sp += Object.values(s.skillSpent).reduce((sum, n) => sum + n, 0);
        s.skillSpent = {};
        s.skillInheritances = {};
        s.learned = Object.fromEntries(Object.keys(s.learned).map(id => [id, 1]));
        trimLoadout(s);
        s.cooldowns = {};
        clampVitals(s);
    },
    attribute(s, { a, id }) {
        if (!['str', 'dex', 'int', 'vit', 'wis', 'luk'].includes(id))
            throw Error('알 수 없는 능력치입니다.');
        const amount = a.value === 'max' ? s.statPoints : Number(a.value || '1');
        if (!Number.isInteger(amount) || amount < 1 || (a.value !== 'max' && ![1, 5, 10].includes(amount)) || s.statPoints < amount)
            throw Error('능력치 포인트가 부족합니다.');
        s.attributes[id as Attribute] += amount;
        s.statPoints -= amount;
    },
    resetAttributes(s) {
        if (s.running)
            throw Error('전투를 멈춘 뒤 재분배하세요.');
        s.statPoints += Object.values(s.attributes).reduce((sum, n) => sum + n, 0);
        s.attributes = emptyAttributes();
        clampVitals(s);
    },
    savePreset(s, { a, id }) {
        if (!['1', '2', '3'].includes(id))
            throw Error('저장 칸을 확인하세요.');
        s.presets[id] = { name: (a.value || `편성 ${id}`).slice(0, 20), skills: [...s.skills] };
    },
    loadPreset(s, { id }) {
        const preset = s.presets[id];
        if (!preset || !validLoadout(s, preset.skills))
            throw Error('현재 직업·레벨·AP로 불러올 수 없는 편성입니다.');
        s.skills = [...preset.skills];
        clampVitals(s);
    },
    skillUp(s, { id }) {
        const index = s.skills.indexOf(id);
        if (index > 0) {
            [s.skills[index - 1], s.skills[index]] = [s.skills[index], s.skills[index - 1]];
        }
    },
};
