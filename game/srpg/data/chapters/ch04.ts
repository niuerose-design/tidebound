import type { ChapterDef, DeploymentDef } from '../../engine/types';
import { E, G } from './helpers';
export const chapter: ChapterDef = {
    id: 'ch_04_salt_village', number: 4, title: '소금 창고 마을', subtitle: '8턴 동안 마을 문을 지켜라', recommended_level: 4, max_deploy: 7, forced_units: ['unit_serin'],
    objective: { type: 'defend', turns: 8, target_pos: [7, 6], text: '8턴 동안 마을 문을 사수하라' },
    defeat_conditions: ['세린이 쓰러진다', '적이 마을 문(왕좌 칸)을 차지한다'],
    map: { width: 14, height: 13, theme: 'village', tiles: [
        '####..~~~.####',
        '#C.#..~~~..H.#',
        '#..D..~=~....#',
        '#..#......F..#',
        '......S...FF..',
        '....R.........',
        '..H....T......',
        '..........R...',
        '......#D#.....',
        '.FF...#.#..F..',
        '.F....#C#.....',
        '......###...H.',
        '..............',
    ] },
    player_spawns: [[6, 6], [8, 6], [7, 5], [7, 7], [6, 7], [8, 7], [6, 5], [8, 5]],
    reinforcements: [
        { turn: 2, side: 'enemy', group_id: 'grp_thieves', spawns: [[13, 4], [13, 8]], repeat_every: null, notice_text: '동쪽 길로 도적이 들어왔다' },
        { turn: 3, side: 'enemy', group_id: 'grp_boat_wave', spawns: [[4, 0], [5, 0]], repeat_every: 2, repeat_until: 7, notice_text: '북쪽 선착장에 해적이 내렸다' },
        { turn: 5, side: 'enemy', group_id: 'grp_west_riders', spawns: [[0, 4], [0, 5]], repeat_every: null, notice_text: '서쪽 들판에서 기병이 나타났다' },
    ],
    map_events: [
        { kind: 'village', pos: [11, 1], reward: 'steel_axe', text: '창고지기가 벽에 걸린 도끼를 내준다. 해적이 오기 전에 가져가라고 한다.' },
        { kind: 'village', pos: [2, 6], reward: 'vulnerary', text: '노파가 약병을 건넨다. 손자가 창고에 갇혀 있다며 울먹인다.' },
        { kind: 'village', pos: [12, 11], reward: null, text: '빈집인 줄 알았던 집 안에서 회색 머리 아이가 튀어나온다. 자물쇠 따는 솜씨를 자랑한다.' },
        { kind: 'chest', pos: [1, 1], reward: 'gale_feather', text: '창고 구석 상자다. 깃털 하나가 바람처럼 가볍다.' },
        { kind: 'chest', pos: [7, 10], reward: 'steel_sword', text: '소금 창고 안쪽 상자다. 기름칠한 검이 들어 있다.' },
        { kind: 'door', pos: [3, 2], reward: null, text: '서쪽 창고 문이다.' },
        { kind: 'door', pos: [7, 8], reward: null, text: '남쪽 소금 창고 문이다.' },
    ],
    dialogue: {
        pre: [
            { speaker: 'unit_serin', text: '해적 배가 오늘 밤 조류석을 싣는다. 마을 문을 8턴만 버티면 썰물이 와서 배가 못 뜬다.', emotion: 'neutral' },
            { speaker: 'unit_dorne', text: '동쪽 길로 도적이 올 거다. 민가를 먼저 턴다. 민가에 먼저 가야 한다.', emotion: 'neutral' },
            { speaker: 'unit_mio', text: '문을 비우면 안 되지만, 민가 사람들을 버릴 수도 없어요.', emotion: 'sad' },
            { speaker: 'unit_serin', text: '둘로 나눈다. 문은 브롬과 내가, 민가는 빠른 사람이.', emotion: 'neutral' },
        ],
        boss_quote: null,
        mid: [{ trigger: { kind: 'reinforcement', group: 'grp_thieves' }, lines: [{ speaker: 'unit_tessa', text: '도적이야! 민가로 가기 전에 잡아야 해.', emotion: 'shocked' }] }, { trigger: { kind: 'turn', turn: 6 }, lines: [{ speaker: 'unit_harl', text: '물이 빠지기 시작했어. 조금만 더!', emotion: 'happy' }] }],
        post: [
            { speaker: 'unit_serin', text: '썰물이다. 배는 뜨지 못한다. 조류석은 아직 창고에 있어.', emotion: 'happy' },
            { speaker: 'unit_kael', text: '장부에 다음 행선지가 있습니다. 항구예요. 해적 선장이 직접 와 있답니다.', emotion: 'neutral' },
            { speaker: 'unit_brom', text: '항구 문은 게르다 할멈이 지키던 곳인데. 살아 있을까.', emotion: 'neutral' },
            { speaker: 'unit_serin', text: '확인하러 간다. 항구를 되찾는다.', emotion: 'neutral' },
        ],
    },
    rewards: { gold: 1200, items: ['door_key', 'chest_key'] },
    tags: ['마을', '방어', '도적'],
    tips: ['방어 목표: 적이 왕좌 칸에 서면 패배합니다. 턴 수가 지나면 승리입니다.', '도적은 민가로 달려가 털어 버립니다. 민가는 아군이 먼저 "방문"해야 보상을 받습니다.'],
};
export const deployment: DeploymentDef = {
    id: 'dep_04_salt_village', chapter_id: 'ch_04_salt_village',
    difficulty_note: '가르치는 것: 지키는 싸움과 민가 우선순위. 압박 수단: 2턴마다 북쪽 선착장 증원, 5턴 서쪽 기병.',
    boss: null,
    groups: [
        G('grp_north_boats', '북쪽 선착장 선발대', 'charge_on_range', [E('cls_corsair', 3, [5, 1], 'iron_axe'), E('cls_corsair', 3, [9, 1], 'iron_axe'), E('cls_gull_archer', 3, [10, 1], 'iron_bow')], { trigger_range: 3 }),
        G('grp_east_lancers', '동쪽 기병. 세린을 노린다', 'target_priority', [E('cls_dune_lancer', 4, [12, 4], 'iron_lance'), E('cls_dune_lancer', 3, [12, 7], 'javelin')], { priority: ['lord', 'nearest'] }),
        G('grp_south_axes', '남쪽에서 올라오는 수부', 'aggressive', [E('cls_corsair', 3, [3, 11], 'iron_axe'), E('cls_corsair', 4, [10, 12], 'steel_axe'), E('cls_reef_brute', 3, [0, 12], 'iron_axe')]),
        G('grp_thieves', '2턴 동쪽 도적. 민가를 턴다', 'flee', [E('cls_salt_thief', 3, [13, 4], 'iron_dagger'), E('cls_salt_thief', 3, [13, 8], 'iron_dagger')], { flee_targets: [[11, 1], [12, 11], [2, 6]], reinforcement: true }),
        G('grp_boat_wave', '3턴부터 2턴마다 북쪽 상륙', 'aggressive', [E('cls_corsair', 4, [4, 0], 'iron_axe'), E('cls_corsair', 4, [5, 0], 'hand_axe')], { reinforcement: true }),
        G('grp_west_riders', '5턴 서쪽 기병. 치유사를 노린다', 'target_priority', [E('cls_dune_lancer', 4, [0, 4], 'iron_lance'), E('cls_dune_lancer', 4, [0, 5], 'iron_lance')], { priority: ['healer', 'low_def', 'nearest'], reinforcement: true }),
    ],
};
