// v3.215 스토리 ‘모험 일지’: 장면 표 형식, 이정표마다 열림, 처음 보는 세이브는 한 줄로 묶어 알림, 환생 · 승천해도 유지.
import { assert, test, act, newState } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';
const { load } = loadGame();
const { STORY, STORY_CHAPTERS, STORY_PARTS } = await load('data/story');
const { syncStory } = await load('systems/story');
const { ONYX_BOSSES, ONYX_ITEMS } = await load('data/onyx');

test('v3.215 story table: unique ids, valid chapters, 2~6 lines, every chapter has scenes', () => {
    assert.equal(new Set(STORY.map(x => x.id)).size, STORY.length);
    for (const x of STORY) { assert.ok(x.chapter >= 0 && x.chapter < STORY_CHAPTERS.length, x.id); assert.ok(x.lines.length >= 2 && x.lines.length <= 6, x.id); assert.ok(x.hint && x.title, x.id); }
    for (let i = 0; i < STORY_CHAPTERS.length; i++) assert.ok(STORY.some(x => x.chapter === i), `chapter ${i}`);
    assert.deepEqual(STORY_PARTS.flatMap(p => p.chapters).sort((a, b) => a - b), STORY_CHAPTERS.map((_, i) => i), 'parts cover every chapter once');
    const fresh = newState(0); delete fresh.story;
    assert.deepEqual(STORY.filter(x => x.when(fresh)).map(x => x.id), [], 'a brand-new adventurer has no scenes yet');
});

test('v3.215 story: first kill opens the first scene with one log line, later milestones open on the next action', () => {
    const s = newState(0);
    act(s, { type: 'sync' }, 1000);
    assert.deepEqual(s.story, {}, 'nothing yet');
    s.kills = 1; const logs = s.logs.length;
    act(s, { type: 'sync' }, 2000);
    assert.equal(s.story.awake, 2000);
    assert.ok(s.logs.slice(logs).some(l => l.text.includes('『선착장에서 눈을 뜨다』')));
    s.book = { ...(s.book || {}), grottoWarden: 1 };
    act(s, { type: 'sync' }, 3000);
    assert.equal(s.story.mushmom, 3000); assert.equal(s.story.awake, 2000, 'opened time is kept');
});

test('v3.215 story: an old save opens everything it already passed in one summary line, kept through rebirth and ascension', () => {
    const s = newState(0); delete s.story; s.kills = 500; s.rebirths = 12; s.book = { grottoWarden: 3, magmaKraken: 1 };
    const lines = []; const fresh = syncStory(s, 5000, t => lines.push(t));
    for (const id of ['awake', 'henesys', 'rebirth1', 'rebirth5', 'rebirth10', 'mushmom', 'balrog']) assert.ok(s.story[id], id);
    assert.ok(fresh.length > 5); assert.equal(lines.length, 1); assert.match(lines[0], /지난 모험 \d+편/);
    const kept = { ...s.story };
    s.level = 100; act(s, { type: 'rebirth' }, 6000);
    for (const id of Object.keys(kept)) assert.equal(s.story[id], kept[id], `rebirth keeps ${id}`);
    s.rebirths = 100; delete s.dungeon; act(s, { type: 'ascend' }, 7000);
    for (const id of Object.keys(kept)) assert.equal(s.story[id], kept[id], `ascension keeps ${id}`);
    assert.equal(s.story.ascend, 7000, 'first ascension scene opens right after ascending');
});

test('v3.216 story part 2: no ascension gate except the finale, onyx = all 9 (8 accessories + grimoire core) owned, Mu Lung 50 · 100', () => {
    const s = newState(0); s.kills = 1; s.wins = 1; s.guildMember = { id: 'g1' }; s.market = { holdings: {} }; s.abyssBest = 100;
    s.bossCores = { grotto: 5 }; s.onyxBook = Object.fromEntries(ONYX_BOSSES.map(b => [b.id, 1]));
    act(s, { type: 'sync' }, 9000);
    for (const id of ['core', 'coreFull', 'abyss50', 'abyss100', 'duel', 'guild', 'market', 'onyx']) assert.ok(s.story[id], id);
    for (const id of ['onyxAll', 'general', 'clone', 'ascend']) assert.equal(s.story[id], undefined, `${id} still locked (killing every onyx boss is not collecting the accessories)`);
    for (const d of ONYX_ITEMS) s.inventory.push({ id: `o-${d.id}`, name: d.id, slot: 'charm', rarity: 6, power: 1, level: 1, onyx: d.id });
    act(s, { type: 'sync' }, 9200);
    assert.equal(s.story.onyxAll, undefined, 'eight accessories without the grimoire core are not all nine');
    s.bossCores.onyxGrimoire = { rank: 0, attrs: [] };
    s.account = { slot: 2, slots: [] };
    act(s, { type: 'sync' }, 9500);
    assert.ok(s.story.onyxAll, 'all 9 onyx owned'); assert.ok(s.story.clone, 'second adventurer slot');
    const ascensionGated = STORY.filter(x => x.when({ ...newState(0), ascension: 1 }) && !x.when(newState(0)));
    assert.deepEqual(ascensionGated.map(x => x.id).filter(id => !['awake', 'shell', 'henesys', 'perion', 'ellinia', 'kerning', 'rebirth1', 'rebirth5', 'rebirth10', 'rebirth50'].includes(id)), ['ascend'], 'only the finale needs an ascension');
    assert.equal(STORY.at(-1).id, 'ascend', 'the ascension scene is last');
});

test('v3.216 story art: every chapter has an SVG banner fallback, image paths only for files in the manifest', async () => {
    const { storyArtSrc } = await load('data/art');
    const { STORY_ART } = await load('data/art-manifest');
    for (const key of [...STORY.map(x => x.id), ...STORY_CHAPTERS.map((_, i) => `chapter-${i}`)]) assert.equal(storyArtSrc(key), STORY_ART[key] ? `/art/story/${key}.${STORY_ART[key]}` : null, key);
    const src = (await import('node:fs')).readFileSync('components/game/story-art.tsx', 'utf8');
    const banners = src.slice(src.indexOf('const BANNERS'), src.indexOf('];', src.indexOf('const BANNERS')));
    assert.equal((banners.match(/\/\/ 제\d장/g) || []).length, STORY_CHAPTERS.length, 'one SVG banner per chapter');
});

test('v3.217 story art: every scene has its own SVG illustration and chapters start folded', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('components/game/story-scenes.tsx', 'utf8');
    const ids = [...src.slice(src.indexOf('export const SCENE_ART')).matchAll(/^ {4}(\w+): id =>/gm)].map(m => m[1]);
    assert.deepEqual([...ids].sort(), STORY.map(x => x.id).sort(), 'one SVG per scene, no strays');
    assert.match(fs.readFileSync('components/game/story-panel.tsx', 'utf8'), /defaultOpen=\{false\}/, 'chapters start folded');
});
