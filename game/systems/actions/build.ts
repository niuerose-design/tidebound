/** 빌드: 전직, 스킬 장착·습득·계승·강화, 능력치 배분, 편성 저장 */
import { stats, clampVitals } from '../stats';
import { unlockedTitles } from '../../data/titles';
import type { Attribute } from '../../types';
import { jobById } from '../../data/classes';
import { skillById } from '../../data/skills';
import { emptyAttributes } from '../../data/progression';
import { canUse, skillBlockReason, canChangeJob, trimLoadout, validLoadout, skillCost, grantJobSkills, canSpendSkill, canInheritSkill, skillLevel, skillMastery, limitBreakNext } from '../progression';
import type { ActionHandlers } from './types';
import { addLog, endRun } from '../state';

/** v27.70 즐겨찾기·숨김 목록 상한(스킬 수보다 넉넉히). */
const SKILL_MARK_MAX = 400;
/** 쉼표 구분 id 문자열 → 실제 스킬 id만, 중복 없이. */
const skillIdList = (value: string) => [...new Set(value.split(',').map(x => x.trim()).filter(x => skillById(x)))].slice(0, SKILL_MARK_MAX);

export const buildActions: ActionHandlers = {
    job(s, { id, now }) {
        // 문 시간 판정은 요청 시각(서버 now)으로 합니다.
        if (!canChangeJob(s, id))
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
            addLog(s, fromDungeon ? '전직을 위해 진행 중인 던전을 보상 없이 정리하고 귀환했습니다.' : '전직을 위해 진행 중인 전투를 정리했습니다. 현재 몬스터는 사라집니다.');
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
        addLog(s, `${jobById(id)!.name}(으)로 전직했습니다. 숙달 스킬을 계승할 수 있습니다.`);
    },
    /** v26.1 칭호 장착: id가 'auto'면 자동, 'none'이면 해제, 그 외에는 얻은 칭호만. */
    title(s, { id }) {
        if (id === 'auto') { delete s.title; return; }
        if (id === 'none') { s.title = null; return; }
        if (!unlockedTitles(s).some(t => t.id === id)) throw Error('아직 얻지 못한 칭호입니다.');
        s.title = id;
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
        const sk = skillById(id)!;
        const cost = skillCost();
        if (s.sp < cost)
            throw Error('SP가 부족합니다. 보스 첫 정복 연구 또는 최종 도감 연구에서 얻을 수 있습니다.');
        s.sp -= cost;
        s.skillSpent[id] = (s.skillSpent[id] || 0) + cost;
        s.learned[id] = skillLevel(sk, s.learned[id], skillMastery(s, id)) + 2;
        addLog(s, `${sk.name} 강화 Lv.${s.learned[id] - 1} · SP -${cost}`, 'skill');
    },
    /** v27.6 한계돌파: 숙련 완료 + 실전 숙련 배수 + SP. 환생해도 남습니다. */
    limitBreak(s, { id }) {
        const next = limitBreakNext(s, id);
        if (!next.ok) throw Error(next.reason);
        s.sp -= next.sp;
        s.limitBreaks ??= {};
        s.limitBreaks[id] = next.stage;
        addLog(s, `${skillById(id)!.name} 한계돌파 ${next.stage}단계 · SP -${next.sp}`, 'skill');
    },
    inheritSkill(s, { id }) {
        if (!canInheritSkill(s, id))
            throw Error('전직으로 얻은 미계승 스킬만 SP로 계승할 수 있습니다.');
        const cost = skillCost();
        if (s.sp < cost)
            throw Error('계승에는 1 SP가 필요합니다. 장착 처치로 무료 계승할 수도 있습니다.');
        s.sp -= cost;
        s.skillSpent[id] = (s.skillSpent[id] || 0) + cost;
        s.skillInheritances[id] = true;
        addLog(s, `${skillById(id)!.name} SP 계승 · 다른 직업에서도 장착 가능`, 'skill');
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
    /**
     * v27.70 즐겨찾기 토글(id). value가 있으면 목록 전체를 그 값(쉼표 구분 id)으로 바꿉니다(브라우저에만 있던 즐겨찾기를 세이브로 옮길 때 한 번).
     * 즐겨찾기한 스킬은 숨김에서 빠집니다. 게임 규칙에는 쓰지 않는 화면 편의 설정입니다.
     */
    pinSkill(s, { a, id }) {
        if (a.value !== undefined) { s.skillPins = skillIdList(a.value); s.skillHidden = (s.skillHidden || []).filter(x => !s.skillPins!.includes(x)); return; }
        if (!skillById(id)) throw Error('없는 스킬입니다.');
        const pins = s.skillPins || [];
        s.skillPins = pins.includes(id) ? pins.filter(x => x !== id) : [...pins, id].slice(-SKILL_MARK_MAX);
        if (s.skillPins.includes(id) && s.skillHidden?.includes(id)) s.skillHidden = s.skillHidden.filter(x => x !== id);
    },
    /** v27.70 숨기기 토글(id). 숨긴 스킬은 즐겨찾기에서 빠집니다. 장착·사용 판정과는 무관합니다. */
    hideSkill(s, { id }) {
        if (!skillById(id)) throw Error('없는 스킬입니다.');
        const hidden = s.skillHidden || [];
        s.skillHidden = hidden.includes(id) ? hidden.filter(x => x !== id) : [...hidden, id].slice(-SKILL_MARK_MAX);
        if (s.skillHidden.includes(id) && s.skillPins?.includes(id)) s.skillPins = s.skillPins.filter(x => x !== id);
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
    /** v25.3 편성 전체를 한 번에: 끌어서 순서를 바꾸거나 추천 편성을 적용합니다. 모두 사용 가능하고 AP 안이어야 합니다. */
    setSkills(s, { a }) {
        const ids = [...new Set((a.value || '').split(',').map(x => x.trim()).filter(Boolean))];
        for (const id of ids) if (!canUse(s, id)) throw Error(skillBlockReason(s, id) || '사용할 수 없는 스킬이 있습니다.');
        if (!validLoadout(s, ids)) throw Error('총 장착 AP 한도를 초과합니다.');
        s.skills = ids;
        clampVitals(s);
    },
    /** 같은 종류(액티브끼리·패시브끼리)에서 한 칸 앞으로. 액티브는 앞에 있을수록 먼저 판정합니다. */
    skillUp(s, { id }) {
        const index = s.skills.indexOf(id), type = skillById(id)?.type;
        for (let j = index - 1; j >= 0; j--) {
            if (skillById(s.skills[j])?.type !== type) continue;
            [s.skills[j], s.skills[index]] = [s.skills[index], s.skills[j]];
            break;
        }
    },
};
