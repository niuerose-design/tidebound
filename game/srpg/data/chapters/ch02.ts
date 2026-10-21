import type { ChapterDef, DeploymentDef } from '../../engine/types';
import { E, G } from './helpers';
export const chapter: ChapterDef = {
    id: 'ch_02_fog_flats', number: 2, title: '안개 갯벌', subtitle: '썰물 사이에 해적의 잔당을 쫓아라', recommended_level: 2, max_deploy: 5, forced_units: ['unit_serin'],
    objective: { type: 'rout', turns: null, target_pos: null, text: '적을 모두 쓰러뜨려라' },
    defeat_conditions: ['세린이 쓰러진다'],
    map: { width: 13, height: 12, theme: 'coast', tiles: [
        '~~~~~~~~~~~~~',
        '~~..F.....~~~',
        '~...FF..R..~~',
        '~.........F.~',
        '~~~=~~~..F..~',
        '~.......S...~',
        '~.FF..~~~=~~~',
        '~.F.......H.~',
        '~......F....~',
        '~....FF.....~',
        '~.........~~~',
        '~~~~~~~~~~~~~',
    ] },
    player_spawns: [[1, 10], [2, 10], [1, 9], [2, 9], [1, 8], [2, 8]],
    reinforcements: [{ turn: 5, side: 'enemy', group_id: 'grp_tide_boats', spawns: [[11, 9], [11, 8]], repeat_every: null, notice_text: '동쪽 갯벌로 나룻배가 들어왔다' }],
    map_events: [
        { kind: 'village', pos: [10, 7], reward: 'javelin', text: '갯벌 끝 오두막의 노인이 투창을 건넨다. 멀리서 찌르는 법을 아느냐고 묻는다.' },
        { kind: 'lore', pos: [8, 2], reward: null, text: '물에 반쯤 잠긴 돌무더기다. 옛 회랑으로 가는 길표였다고 한다.' },
    ],
    dialogue: {
        pre: [
            { speaker: 'unit_brom', text: '벌목장이 탔다. 도끼만 남았다. 같이 가겠다.', emotion: 'neutral' },
            { speaker: 'unit_mio', text: '다친 분이 많다고 들어서요. 약은 충분히 챙겨 왔어요.', emotion: 'neutral' },
            { speaker: 'unit_serin', text: '고맙다. 해적 잔당이 갯벌 북쪽 숲으로 숨었다. 숲에 선 적은 잘 맞지 않으니 끌어내서 친다.', emotion: 'neutral' },
            { speaker: 'unit_harl', text: '도끼 든 놈들이 많네. 검이 도끼에 강하니까 내가 나설게.', emotion: 'happy' },
            { speaker: '갈고리 멜', text: '망루를 잃었다고 바다까지 잃은 건 아니지. 두꺼비들, 일어나.', emotion: 'smirk' },
        ],
        boss_quote: '갯벌에서 나를 쫓아? 발부터 빠질걸.',
        mid: [{ trigger: { kind: 'turn', turn: 3 }, lines: [{ speaker: 'unit_tessa', text: '숲 속 두꺼비는 활로 잘 안 맞아. 가까이 끌어내자.', emotion: 'neutral' }] }],
        post: [
            { speaker: 'unit_serin', text: '갯벌은 조용해졌다. 멜의 품에도 같은 지도가 있었어.', emotion: 'neutral' },
            { speaker: 'unit_brom', text: '해적이 회랑에 뭘 묻어 둔 건가.', emotion: 'neutral' },
            { speaker: 'unit_mio', text: '지도 뒷면에 글이 있어요. "조류석을 모래언덕 목장으로."', emotion: 'shocked' },
            { speaker: 'unit_serin', text: '조류석... 가문의 돌이다. 목장으로 간다.', emotion: 'angry' },
        ],
    },
    rewards: { gold: 900, items: ['iron_sword'] },
    tags: ['튜토리얼', '해안', '전멸'],
    tips: ['숲(F)에 선 유닛은 회피 +20, 수비 +1입니다. 적이 숲에 있으면 명중이 크게 떨어지니 평지로 끌어내세요.', '무기 상성: 검은 도끼에, 도끼는 창에, 창은 검에 강합니다. 우세하면 명중 +15, 위력 +1.', '미오의 지팡이는 인접한 아군을 회복하고 경험치를 얻습니다. 공격은 못 하니 앞에 세우지 마세요.'],
};
export const deployment: DeploymentDef = {
    id: 'dep_02_fog_flats', chapter_id: 'ch_02_fog_flats',
    difficulty_note: '가르치는 것: 숲 지형과 검-도끼 상성. 압박 수단: 5턴 동쪽 나룻배가 뒤를 친다.',
    boss: { ...E('cls_pirate_captain', 3, [4, 1], 'iron_axe', { name: '갈고리 멜', items: ['iron_sword'], drop: 'hand_axe' }), name: '갈고리 멜', stance: 'boss', flavor: '갈고리 손으로 유명한 잔당의 우두머리.' },
    groups: [
        G('grp_mud_axes', '갯벌 가운데 저지선. 다가오면 달려든다', 'charge_on_range', [E('cls_corsair', 2, [5, 7], 'iron_axe'), E('cls_corsair', 1, [8, 9], 'iron_axe')], { trigger_range: 3 }),
        G('grp_fen_toads', '숲에 숨은 두꺼비. 사거리 안에 들어오면 혀를 뻗는다', 'guard', [E('cls_mire_toad', 2, [6, 9], 'tongue'), E('cls_mire_toad', 2, [7, 8], 'tongue')]),
        G('grp_north_archer', '요새 위 궁수', 'guard', [E('cls_gull_archer', 2, [8, 5], 'iron_bow')]),
        G('grp_fog_blades', '북동쪽 검사. 다리를 건너면 움직인다', 'charge_on_range', [E('cls_shore_blade', 2, [9, 3], 'iron_sword'), E('cls_shore_blade', 2, [11, 5], 'iron_sword', { drop: 'vulnerary' })], { trigger_range: 5 }),
        G('grp_tide_boats', '5턴 동쪽 상륙. 수비 낮은 유닛을 노린다', 'target_priority', [E('cls_corsair', 2, [11, 9], 'iron_axe'), E('cls_corsair', 2, [11, 8], 'hand_axe')], { priority: ['low_def', 'healer', 'nearest'], reinforcement: true }),
    ],
};
