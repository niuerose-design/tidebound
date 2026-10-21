import type { ChapterDef, DeploymentDef } from '../../engine/types';
import { E, G } from './helpers';
export const chapter: ChapterDef = {
    id: 'ch_03_dune_ranch', number: 3, title: '모래언덕 목장', subtitle: '조류석이 실려 간 목장을 되찾아라', recommended_level: 3, max_deploy: 6, forced_units: ['unit_serin'],
    objective: { type: 'seize', turns: null, target_pos: [11, 3], text: '세린이 마구간 안쪽을 점령하라' },
    defeat_conditions: ['세린이 쓰러진다'],
    map: { width: 14, height: 12, theme: 'plain', tiles: [
        '..F..~~~......',
        '.FF..~~=......',
        '....R.~~..##D#',
        '......~~..#T.#',
        '..S...==..#..#',
        '......~~..####',
        '.H....~~......',
        '......~~=.....',
        '..FF..~~....F.',
        '......~~....FF',
        '......~~=..C..',
        '.......~......',
    ] },
    player_spawns: [[0, 8], [1, 8], [0, 9], [1, 9], [0, 10], [1, 10], [0, 11]],
    reinforcements: [{ turn: 6, side: 'enemy', group_id: 'grp_north_riders', spawns: [[0, 0], [1, 0]], repeat_every: null, notice_text: '북쪽 모래언덕에서 기병이 달려온다' }],
    map_events: [
        { kind: 'village', pos: [1, 6], reward: 'door_key', text: '목장 일꾼이 마구간 열쇠를 쥐여 준다. 해적이 안쪽 문을 잠갔다고 한다.' },
        { kind: 'chest', pos: [11, 10], reward: 'horse_bane', text: '건초 더미 아래 상자다. 기병을 떨어뜨리는 창이 들어 있다.' },
        { kind: 'door', pos: [12, 2], reward: null, text: '마구간 안쪽 문이다. 열쇠가 있거나 도적이 열어야 한다.' },
        { kind: 'lore', pos: [4, 2], reward: null, text: '말라 버린 물통 자리다. 바다가 갈라진 뒤 목장의 샘이 말랐다고 한다.' },
    ],
    dialogue: {
        pre: [
            { speaker: 'unit_kael', text: '필경사 카엘입니다. 바다가 갈라진 밤의 기록이 해적 손에 넘어갔어요. 되찾아야 합니다.', emotion: 'neutral' },
            { speaker: 'unit_serin', text: '기록도, 조류석도 모두 여기 목장에 모인다. 해적이 뭘 하려는지 알아야겠어.', emotion: 'neutral' },
            { speaker: 'unit_tessa', text: '기병이 보여. 창을 든 기병은 검에 강하니까 브롬 도끼로 받자.', emotion: 'neutral' },
            { speaker: '도른', text: '...어촌 사람을 풀어 준 게 저 사람인가.', emotion: 'sad' },
            { speaker: '모래 이빨 가로', text: '목장은 이미 우리 거다. 물 없는 땅에 누가 오겠어.', emotion: 'smirk' },
        ],
        boss_quote: '조류석? 그 돌이 뭔지도 모르면서 찾나.',
        mid: [{ trigger: { kind: 'turn', turn: 2 }, lines: [{ speaker: 'unit_harl', text: '세린, 저 기수 완장을 뜯었어. 해적이 아닌 것 같은데. 말 걸어 봐.', emotion: 'neutral' }] }],
        post: [
            { speaker: 'unit_serin', text: '마구간은 비었다. 조류석은 벌써 실려 갔어.', emotion: 'angry' },
            { speaker: 'unit_kael', text: '장부가 남았습니다. "소금 창고 마을에서 배에 싣는다"고요.', emotion: 'neutral' },
            { speaker: 'unit_brom', text: '창고 마을이면 민가가 많다. 해적이 먼저 털 거다.', emotion: 'neutral' },
            { speaker: 'unit_serin', text: '마을 문을 지키면서 배를 막는다. 가자.', emotion: 'neutral' },
        ],
    },
    rewards: { gold: 1000, items: ['steel_lance'] },
    tags: ['평원', '점령', '영입'],
    tips: ['문(D)은 문 열쇠를 가진 유닛이 인접해서 열거나, 도적이 엽니다. 민가에서 열쇠를 얻을 수 있습니다.', '적 중에 이름이 있는 유닛은 특정 아군이 인접해 "대화"하면 합류합니다.'],
};
export const deployment: DeploymentDef = {
    id: 'dep_03_dune_ranch', chapter_id: 'ch_03_dune_ranch',
    difficulty_note: '가르치는 것: 기병의 긴 이동 거리와 문 열기. 압박 수단: 6턴 북쪽 기병 증원이 후방을 친다.',
    boss: { ...E('cls_pirate_captain', 5, [11, 3], 'steel_axe', { name: '모래 이빨 가로', items: ['iron_sword'], stat_bonus: { hp: 2, skl: 1 }, drop: 'steel_sword' }), name: '모래 이빨 가로', stance: 'boss', flavor: '목장을 차지한 해적 감독관. 이가 모래색이다.' },
    groups: [
        G('grp_dorne', '빚으로 묶인 기수. 세린이 말을 걸면 합류', 'hold', [E('cls_dune_lancer', 4, [3, 5], 'iron_lance', { name: '도른', recruitable_as: 'unit_dorne', items: ['javelin'] })]),
        G('grp_dune_riders', '동쪽 들판 기병. 강을 건너면 달려든다', 'charge_on_range', [E('cls_dune_lancer', 3, [9, 6], 'iron_lance'), E('cls_dune_lancer', 3, [10, 8], 'iron_lance'), E('cls_dune_lancer', 2, [11, 9], 'javelin')], { trigger_range: 5 }),
        G('grp_axe_watch', '요새 위 파수꾼', 'hold', [E('cls_corsair', 3, [2, 4], 'iron_axe')]),
        G('grp_bridge_guards', '다리를 지키는 수부', 'guard', [E('cls_corsair', 3, [8, 7], 'iron_axe'), E('cls_corsair', 2, [8, 10], 'hand_axe')]),
        G('grp_tower_archers', '마구간 궁수. 문 열쇠를 가졌다', 'guard', [E('cls_gull_archer', 3, [9, 2], 'iron_bow', { drop: 'door_key' }), E('cls_gull_archer', 3, [12, 4], 'iron_bow')]),
        G('grp_north_riders', '6턴 북쪽 기병. 수비 낮은 유닛을 노린다', 'target_priority', [E('cls_dune_lancer', 3, [0, 0], 'iron_lance'), E('cls_dune_lancer', 3, [1, 0], 'iron_lance')], { priority: ['healer', 'low_def', 'nearest'], reinforcement: true }),
    ],
};
