// v3.183 보스 몬스터 스킬 배경 연출: 보스 성향이 쓰는 모든 몬스터 스킬에 연출 표가 있어야 합니다.
import { assert, test } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';

const { load } = loadGame(), { FOE_FX } = await load('game/data/foe-fx.js'), enc = await load('game/data/encounters.js'), { skillById } = await load('game/data/skills.js'), { MONSTERS } = await load('game/data/world.js');

test('Foe fx: every enemy skill a boss can use has a scene effect', () => {
    const used = new Set();
    for (const f of MONSTERS) for (const sk of enc.foeSkills(f.id, 200, true)) used.add(sk);
    for (const sk of enc.ENEMY_SKILLS) used.add(sk.id);
    assert(used.size >= 20, `boss skills collected: ${used.size}`);
    for (const id of used) assert(FOE_FX[id], `missing foe fx for ${id}`);
    for (const [id, fx] of Object.entries(FOE_FX)) {
        const sk = enc.ENEMY_SKILLS.find(x => x.id === id) ?? skillById(id);
        assert(sk, `foe fx for unknown skill ${id}`);
        assert(fx.kind && fx.glyphs.length === 8, `foe fx ${id} needs a kind and 8 glyphs`);
        assert(!!fx.perHit === !!(sk.extraAttacks), `foe fx ${id} perHit must match extraAttacks`);
    }
});
