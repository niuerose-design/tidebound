import type { ChapterDef, DeploymentDef } from '../../engine/types';
import { E, G } from './helpers';
export const chapter: ChapterDef = {
    id: 'ch_07_storm_bridge', number: 7, title: '폭풍 전야의 다리', subtitle: '가라앉은 기사들이 다리를 막는다', recommended_level: 9, max_deploy: 9, forced_units: ['unit_serin'],
    objective: { type: 'rout', turns: null, target_pos: null, text: '적을 모두 쓰러뜨려라' },
    defeat_conditions: ['세린이 쓰러진다'],
    map: { width: 18, height: 14, theme: 'coast', tiles: [
        '~~~~~~~~~~~~~~~~~~',
        '~....F..~~~..R...~',
        '~.H.....~~~......~',
        '~.......~~~..FF..~',
        '~..S....====.....~',
        '~.......~~~......~',
        '~.FF....~~~...S..~',
        '~.......~~~......~',
        '~.......====.....~',
        '~....F..~~~..F...~',
        '~.......~~~......~',
        '~..R....~~~....C.~',
        '~.......~~~......~',
        '~~~~~~~~~~~~~~~~~~',
    ] },
    player_spawns: [[2, 8], [3, 8], [4, 8], [2, 9], [3, 9], [4, 9], [2, 10], [3, 10], [4, 10]],
    reinforcements: [
        { turn: 5, side: 'enemy', group_id: 'grp_rear_boats', spawns: [[1, 1], [2, 1]], repeat_every: null, notice_text: '서쪽 기슭에 해적 나룻배가 닿았다' },
        { turn: 8, side: 'enemy', group_id: 'grp_knight_wave', spawns: [[16, 1], [16, 12]], repeat_every: null, notice_text: '물속에서 갑옷이 걸어 나온다' },
    ],
    map_events: [
        { kind: 'village', pos: [2, 2], reward: 'long_bow', text: '다리지기의 집이다. 3칸 밖까지 닿는 장궁을 맡긴다.' },
        { kind: 'chest', pos: [15, 11], reward: 'reef_hammer', text: '기사단의 보급 상자다. 암초를 깨던 망치가 들어 있다.' },
        { kind: 'lore', pos: [13, 1], reward: null, text: '다리 동쪽 비석이다. 회랑 기사단의 이름이 물에 씻겨 읽히지 않는다.' },
        { kind: 'lore', pos: [3, 11], reward: null, text: '서쪽 초소 터다. 폭풍 전날 밤 다리지기가 마지막으로 불을 켠 곳이다.' },
    ],
    dialogue: {
        pre: [
            { speaker: 'unit_ragna', text: '내륙 영주의 전령 라그나다. 영주는 해안에서 손을 뗐다. 나는 아직이다.', emotion: 'neutral' },
            { speaker: 'unit_serin', text: '손이 하나 더 늘었군. 다리는 둘이다. 북쪽과 남쪽, 양쪽 다 막혀 있어.', emotion: 'neutral' },
            { speaker: 'unit_dorne', text: '저건 사람이 아니다. 갑옷만 걸어 다닌다. 창을 들었어.', emotion: 'shocked' },
            { speaker: 'unit_brom', text: '창이면 도끼다. 내가 간다.', emotion: 'neutral' },
            { speaker: '녹슨 투구', text: '...조류석... 왕에게... 돌아간다...', emotion: 'neutral' },
        ],
        boss_quote: '...바다는... 다시... 닫히지 않는다...',
        mid: [{ trigger: { kind: 'reinforcement', group: 'grp_knight_wave' }, lines: [{ speaker: 'unit_gerda', text: '물속에서 올라온다. 다리를 등지고 싸워라!', emotion: 'angry' }] }],
        post: [
            { speaker: 'unit_serin', text: '갑옷 안이 비어 있었어. 회랑의 기사단이 이렇게 된 건가.', emotion: 'sad' },
            { speaker: 'unit_ragna', text: '폭풍이 온다. 다리 건너 등대 폐허에서 밤을 나야 한다.', emotion: 'neutral' },
            { speaker: 'unit_kael', text: '폐허에 잿빛 현자가 잡혀 있다는 소문입니다. 기록을 쓴 바로 그분이요.', emotion: 'shocked' },
            { speaker: 'unit_serin', text: '구한다. 밤이 지나고 썰물이 올 때까지 버티면서.', emotion: 'neutral' },
        ],
    },
    rewards: { gold: 1800, items: ['tide_seal'] },
    tags: ['다리', '전멸', '기병'],
};
export const deployment: DeploymentDef = {
    id: 'dep_07_storm_bridge', chapter_id: 'ch_07_storm_bridge',
    difficulty_note: '가르치는 것: 두 다리 중 어디로 병력을 나눌지. 압박 수단: 8턴 양쪽 기슭에서 가라앉은 기사가 걸어 나온다.',
    boss: { ...E('cls_drowned_knight', 9, [14, 6], 'steel_lance', { name: '녹슨 투구', items: ['javelin'], stat_bonus: { hp: 4, def: 2, res: 2 }, drop: 'silver_lance' }), name: '녹슨 투구', stance: 'boss', flavor: '물에서 올라온 기사단장의 갑옷.' },
    groups: [
        G('grp_bridge_north', '북쪽 다리 끝 중갑', 'hold', [E('cls_reef_brute', 7, [12, 4], 'steel_axe')]),
        G('grp_bridge_south', '남쪽 다리 끝 중갑', 'hold', [E('cls_reef_brute', 7, [12, 8], 'steel_axe', { drop: 'vulnerary' })]),
        G('grp_knights', '동쪽 기슭의 가라앉은 기사. 다리를 건너면 달려든다', 'charge_on_range', [E('cls_drowned_knight', 7, [15, 3], 'iron_lance'), E('cls_drowned_knight', 7, [15, 9], 'iron_lance'), E('cls_drowned_knight', 7, [13, 10], 'javelin')], { trigger_range: 6 }),
        G('grp_archers', '다리 끝을 겨누는 궁수', 'guard', [E('cls_gull_archer', 7, [12, 3], 'steel_bow'), E('cls_gull_archer', 7, [12, 9], 'iron_bow')]),
        G('grp_west_scouts', '서쪽 기슭의 척후. 바로 달려든다', 'aggressive', [E('cls_corsair', 6, [6, 2], 'iron_axe'), E('cls_corsair', 6, [6, 12], 'hand_axe')]),
        G('grp_mages', '동쪽 기슭의 마법사', 'guard', [E('cls_ember_scribe', 7, [14, 12], 'ember_tome')]),
        G('grp_rear_boats', '5턴 서쪽 나룻배. 치유사를 노린다', 'target_priority', [E('cls_corsair', 7, [1, 1], 'steel_axe'), E('cls_corsair', 7, [2, 1], 'iron_axe')], { priority: ['healer', 'low_def', 'nearest'], reinforcement: true }),
        G('grp_knight_wave', '8턴 양쪽 기슭의 기사', 'aggressive', [E('cls_drowned_knight', 8, [16, 1], 'steel_lance'), E('cls_drowned_knight', 8, [16, 12], 'steel_lance')], { reinforcement: true }),
    ],
};
