import type { ChapterDef, DeploymentDef } from '../../engine/types';
import { E, G } from './helpers';
export const chapter: ChapterDef = {
    id: 'ch_08_lighthouse_ruin', number: 8, title: '등대 폐허', subtitle: '썰물이 올 때까지 10턴을 버텨라', recommended_level: 10, max_deploy: 9, forced_units: ['unit_serin'],
    objective: { type: 'survive', turns: 10, target_pos: null, text: '10턴 동안 살아남아라' },
    defeat_conditions: ['세린이 쓰러진다'],
    map: { width: 16, height: 14, theme: 'ruin', tiles: [
        '~~~~~~~~~~~~~~~~',
        '~~~~~~..~~~~~~~~',
        '~~~~R..R.~~~~~~~',
        '~~~..###...~~~~~',
        '~~..R#T#R...~~~~',
        '~...R#D#....~~~~',
        '~.....R.......~~',
        '~..F.........F.~',
        '~.....R....R...~',
        '~...FF...F.....~',
        '~.........S...~~',
        '~..R.....~~~..~~',
        '~.......~~~~...~',
        '~~~~~~~~~~~~~~~~',
    ] },
    player_spawns: [[5, 6], [6, 6], [7, 6], [5, 7], [6, 7], [7, 7], [5, 8], [6, 8], [7, 8]],
    reinforcements: [
        { turn: 2, side: 'enemy', group_id: 'grp_sea_landing', spawns: [[1, 12], [4, 12]], repeat_every: 2, repeat_until: 8, notice_text: '남쪽 모래톱에 해적이 올라온다' },
        { turn: 3, side: 'enemy', group_id: 'grp_north_wisps', spawns: [[3, 1], [12, 1]], repeat_every: 3, repeat_until: 9, notice_text: '바다 위에 푸른 불이 떠오른다' },
        { turn: 6, side: 'enemy', group_id: 'grp_east_wave', spawns: [[14, 7], [14, 8]], repeat_every: null, notice_text: '동쪽 물가에서 갑옷이 걸어 나온다' },
    ],
    map_events: [
        { kind: 'door', pos: [6, 5], reward: null, text: '등대 문이다. 안은 왕좌처럼 단단한 돌바닥이라 지키기 좋다.' },
        { kind: 'lore', pos: [4, 2], reward: null, text: '등대 기록의 한 장이 바위에 눌려 있다. "왕좌의 돌이 빠지면 바다가 닫힌다."' },
        { kind: 'recruit_talk', pos: [8, 2], reward: null, text: '잿빛 로브의 노인이 묶여 있다. 카엘이 기록의 한 줄을 외우면 믿을 것이다.' },
    ],
    dialogue: {
        pre: [
            { speaker: 'unit_kael', text: '저기... 잿빛 현자님이 묶여 있습니다. 기록을 쓴 분이에요.', emotion: 'shocked' },
            { speaker: '검은 잿더미 베르', text: '현자는 내 것이다. 회랑의 문을 여는 법을 토해 낼 때까지.', emotion: 'angry' },
            { speaker: 'unit_serin', text: '썰물까지 10턴. 사방에서 온다. 등대 벽을 등지고 원을 만든다.', emotion: 'neutral' },
            { speaker: 'unit_gerda', text: '좋은 자리다. 문 하나, 벽 셋. 여기서 늙은이가 할 일이 있군.', emotion: 'neutral' },
        ],
        boss_quote: '잿더미에서 다시 피는 건 불뿐이다.',
        mid: [{ trigger: { kind: 'turn', turn: 5 }, lines: [{ speaker: 'unit_wen', text: '바람이 바뀌었어요. 물이 빠지기 시작해요. 반은 왔어요!', emotion: 'happy' }] }, { trigger: { kind: 'turn', turn: 9 }, lines: [{ speaker: 'unit_harl', text: '한 턴만 더! 버텨!', emotion: 'angry' }] }],
        post: [
            { speaker: 'unit_sol', text: '내 글을 외우는 아이라니. 그럼 마지막 장도 같이 쓰자.', emotion: 'happy' },
            { speaker: 'unit_sol', text: '회랑의 문은 조류석 셋이 모여야 열린다. 해적이 이미 둘을 바쳤다. 마지막 하나는 세린, 네 목에 있다.', emotion: 'neutral' },
            { speaker: 'unit_serin', text: '...그래서 아버지가 나를 보냈던 건가.', emotion: 'sad' },
            { speaker: 'unit_sol', text: '왕은 네 돌을 기다린다. 가지 않으면 바다는 영영 갈라진 채다. 가면 왕과 싸워야 한다.', emotion: 'neutral' },
            { speaker: 'unit_serin', text: '간다. 회랑 어귀로.', emotion: 'neutral' },
        ],
    },
    rewards: { gold: 2000, items: ['light_tome', 'elixir'] },
    tags: ['폐허', '생존', '영입'],
};
export const deployment: DeploymentDef = {
    id: 'dep_08_lighthouse_ruin', chapter_id: 'ch_08_lighthouse_ruin',
    difficulty_note: '가르치는 것: 지형을 등진 원형 진. 압박 수단: 2턴마다 남쪽, 3턴마다 북쪽, 6턴 동쪽 증원이 겹친다.',
    boss: { ...E('cls_ash_sage', 10, [10, 10], 'ember_tome', { name: '검은 잿더미 베르', items: ['thunder_tome', 'vulnerary'], stat_bonus: { hp: 4, mag: 2, res: 2 }, drop: 'light_tome' }), name: '검은 잿더미 베르', stance: 'hold', flavor: '해적단에 붙은 배교한 현자.' },
    groups: [
        G('grp_cliff_axes', '서쪽 벼랑의 수부', 'hold', [E('cls_corsair', 8, [2, 5], 'steel_axe'), E('cls_reef_brute', 8, [2, 4], 'steel_axe')]),
        G('grp_east_knights', '동쪽 기사. 가까워지면 달려든다', 'charge_on_range', [E('cls_drowned_knight', 8, [13, 6], 'steel_lance'), E('cls_drowned_knight', 8, [12, 8], 'iron_lance')], { trigger_range: 5 }),
        G('grp_wisps', '떠도는 도깨비불', 'aggressive', [E('cls_bog_wisp', 8, [1, 10], 'dark_tome'), E('cls_bog_wisp', 8, [13, 11], 'dark_tome')]),
        G('grp_south_axes', '남쪽 모래톱 선발대', 'charge_on_range', [E('cls_corsair', 8, [3, 11], 'iron_axe'), E('cls_corsair', 8, [7, 12], 'hand_axe')], { trigger_range: 4 }),
        G('grp_boss_guard', '베르를 지키는 필경사', 'guard', [E('cls_ember_scribe', 8, [9, 10], 'fire_tome'), E('cls_ember_scribe', 8, [11, 9], 'fire_tome')]),
        G('grp_sea_landing', '2턴부터 2턴마다 남쪽 상륙', 'aggressive', [E('cls_corsair', 9, [1, 12], 'steel_axe'), E('cls_corsair', 9, [4, 12], 'iron_axe')], { reinforcement: true }),
        G('grp_north_wisps', '3턴부터 3턴마다 북쪽 도깨비불', 'target_priority', [E('cls_bog_wisp', 9, [3, 1], 'dark_tome'), E('cls_bog_wisp', 9, [12, 1], 'dark_tome')], { priority: ['low_res', 'healer', 'nearest'], reinforcement: true }),
        G('grp_east_wave', '6턴 동쪽 기사', 'aggressive', [E('cls_drowned_knight', 9, [14, 7], 'steel_lance'), E('cls_drowned_knight', 9, [14, 8], 'javelin')], { reinforcement: true }),
    ],
    allies: [E('cls_ash_sage', 3, [8, 2], 'ember_tome', { name: '솔', recruitable_as: 'unit_sol', items: ['thunder_tome'] })],
};
