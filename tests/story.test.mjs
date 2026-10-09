// v3.215 스토리 ‘모험 일지’: 장면 표 형식, 이정표마다 열림, 처음 보는 세이브는 한 줄로 묶어 알림, 환생 · 승천해도 유지.
import { assert, test, act, newState } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';
const { load } = loadGame();
const { STORY, STORY_CHAPTERS } = await load('data/story');
const { syncStory } = await load('systems/story');

test('v3.215 story table: unique ids, valid chapters, 2~6 lines, every chapter has scenes', () => {
    assert.equal(new Set(STORY.map(x => x.id)).size, STORY.length);
    for (const x of STORY) { assert.ok(x.chapter >= 0 && x.chapter < STORY_CHAPTERS.length, x.id); assert.ok(x.lines.length >= 2 && x.lines.length <= 6, x.id); assert.ok(x.hint && x.title, x.id); }
    for (let i = 0; i < STORY_CHAPTERS.length; i++) assert.ok(STORY.some(x => x.chapter === i), `chapter ${i}`);
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
