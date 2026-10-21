import type { ChapterDef, DeploymentDef } from '../../engine/types';
import { E, G } from './helpers';
export const chapter: ChapterDef = {
    id: 'ch_05_harbor', number: 5, title: '항구 탈환', subtitle: '검은 돛의 선장을 쓰러뜨려라', recommended_level: 6, max_deploy: 8, forced_units: ['unit_serin'],
    objective: { type: 'boss', turns: null, target_pos: null, text: '선장 바라크를 쓰러뜨려라' },
    defeat_conditions: ['세린이 쓰러진다'],
    map: { width: 16, height: 13, theme: 'coast', tiles: [
        '~~~~~~~~~~~~~~~~',
        '~~~~.....~~~~~~~',
        '~~~..S...~~~~~~~',
        '~~H........=..~~',
        '~..##D##....=.~~',
        '~..#C.C#......~~',
        '~..#####.R....~~',
        '~.........##D#~~',
        '~...F.....#T.#.~',
        '~.....F...####.~',
        '~..............~',
        '~.......FF.....~',
        '~~~~~~~~~~~~~~~~',
    ] },
    player_spawns: [[1, 10], [2, 10], [3, 10], [1, 11], [2, 11], [3, 11], [4, 10], [4, 11], [1, 9]],
    reinforcements: [
        { turn: 4, side: 'enemy', group_id: 'grp_boat_landing', spawns: [[4, 1], [5, 1]], repeat_every: null, notice_text: '북쪽 부두에 해적이 내렸다' },
        { turn: 7, side: 'enemy', group_id: 'grp_east_boats', spawns: [[14, 8], [14, 9]], repeat_every: null, notice_text: '동쪽 방파제로 배가 닿았다' },
    ],
    map_events: [
        { kind: 'village', pos: [2, 3], reward: 'coral_dust', text: '부두 노동자가 산호 가루 주머니를 건넨다. 팔이 굵어지는 약이라고 한다.' },
        { kind: 'chest', pos: [4, 5], reward: 'tide_seal', text: '창고 상자에 조류 문양이 찍힌 증표가 들어 있다. 가문의 물건이다.' },
        { kind: 'chest', pos: [6, 5], reward: 'elixir', text: '선장의 개인 상자다. 영약 한 병이 들어 있다.' },
        { kind: 'door', pos: [5, 4], reward: null, text: '창고 문이다. 안에 상자 둘이 있다.' },
        { kind: 'door', pos: [12, 7], reward: null, text: '선장실 문이다. 문지기가 열쇠를 가졌다.' },
        { kind: 'lore', pos: [9, 6], reward: null, text: '부서진 배의 용골이다. 바다가 갈라지던 날 항구로 밀려왔다고 한다.' },
    ],
    dialogue: {
        pre: [
            { speaker: 'unit_gerda', text: '늙은이를 가둬 두고 문을 지키게 하다니. 자물쇠를 비틀고 나왔다. 네가 세린이냐.', emotion: 'neutral' },
            { speaker: 'unit_serin', text: '게르다 수문장... 아버지 이야기는 들었습니다. 앞에 서 주시겠습니까.', emotion: 'neutral' },
            { speaker: 'unit_gerda', text: '서른 해 선 자리다. 하루 더 서지.', emotion: 'neutral' },
            { speaker: 'unit_pim', text: '선장실은 문이 잠겼어. 문지기가 열쇠를 갖고 있던데, 나도 열 수 있고.', emotion: 'smirk' },
            { speaker: '검은 돛 바라크', text: '조류 지킴이의 아이가 여기까지. 돌은 벌써 회랑으로 갔다. 너는 여기서 끝이야.', emotion: 'angry' },
        ],
        boss_quote: '바다를 가른 것이 누구인지 알고나 덤벼라.',
        mid: [{ trigger: { kind: 'boss_hp', ratio: 0.5 }, lines: [{ speaker: '검은 돛 바라크', text: '...왕이 깨어나면 너희 해안은 없어진다. 그게 약속이었어.', emotion: 'angry' }] }],
        post: [
            { speaker: 'unit_serin', text: '왕이라니. 바라크는 누구에게 조류석을 바친 거지.', emotion: 'neutral' },
            { speaker: 'unit_kael', text: '기록 일부를 되찾았습니다. "회랑의 왕좌에 앉은 자가 바다를 갈랐다"고 적혀 있어요.', emotion: 'shocked' },
            { speaker: 'unit_gerda', text: '회랑으로 가려면 안개늪을 건너야 한다. 늪은 길이 매일 바뀐다.', emotion: 'neutral' },
            { speaker: 'unit_serin', text: '바람을 부르는 사람이 필요하겠군. 항구의 돛 수리공을 찾아간다.', emotion: 'neutral' },
        ],
    },
    rewards: { gold: 1500, items: ['mend_staff'] },
    tags: ['항구', '보스', '문'],
    tips: ['보스 목표: 다른 적을 다 쓰러뜨릴 필요 없이 보스만 쓰러뜨리면 승리입니다.', '상자(C) 위에 서서 상자 열쇠를 쓰거나, 도적 핌이 열면 아이템을 얻습니다.'],
};
export const deployment: DeploymentDef = {
    id: 'dep_05_harbor', chapter_id: 'ch_05_harbor',
    difficulty_note: '가르치는 것: 잠긴 문과 열쇠 관리. 압박 수단: 4턴 북쪽 부두, 7턴 동쪽 방파제 증원이 뒤를 끊는다.',
    boss: { ...E('cls_pirate_captain', 8, [11, 8], 'steel_axe', { name: '검은 돛 바라크', items: ['steel_sword', 'vulnerary'], stat_bonus: { hp: 4, str: 1, def: 2 }, drop: 'far_staff' }), name: '검은 돛 바라크', stance: 'boss', flavor: '검은 돛을 올린 해적단의 선장.' },
    groups: [
        G('grp_pier_axes', '부두를 막는 수부', 'charge_on_range', [E('cls_corsair', 5, [6, 8], 'iron_axe'), E('cls_corsair', 5, [9, 10], 'steel_axe'), E('cls_corsair', 4, [8, 11], 'hand_axe')], { trigger_range: 4 }),
        G('grp_dock_archers', '요새와 창고 지붕의 궁수', 'guard', [E('cls_gull_archer', 5, [5, 2], 'iron_bow'), E('cls_gull_archer', 5, [9, 5], 'steel_bow')]),
        G('grp_brutes', '선장실 앞 중갑. 문지기가 열쇠를 가졌다', 'hold', [E('cls_reef_brute', 5, [8, 7], 'iron_axe'), E('cls_reef_brute', 5, [12, 6], 'steel_axe', { drop: 'door_key' })]),
        G('grp_bridge_riders', '동쪽 다리 기병', 'charge_on_range', [E('cls_dune_lancer', 5, [12, 3], 'iron_lance'), E('cls_dune_lancer', 5, [13, 5], 'javelin')], { trigger_range: 5 }),
        G('grp_sea_mages', '해적단에 붙은 필경사', 'guard', [E('cls_ember_scribe', 5, [10, 4], 'fire_tome')]),
        G('grp_boat_landing', '4턴 북쪽 부두 상륙', 'target_priority', [E('cls_corsair', 5, [4, 1], 'iron_axe'), E('cls_corsair', 5, [5, 1], 'iron_axe')], { priority: ['healer', 'low_def', 'nearest'], reinforcement: true }),
        G('grp_east_boats', '7턴 동쪽 방파제 상륙', 'aggressive', [E('cls_corsair', 6, [14, 8], 'steel_axe'), E('cls_gull_archer', 5, [14, 9], 'iron_bow')], { reinforcement: true }),
    ],
};
