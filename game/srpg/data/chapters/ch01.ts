import type { ChapterDef, DeploymentDef } from '../../engine/types';
import { E, G } from './helpers';
export const chapter: ChapterDef = {
    id: 'ch_01_salt_watchtower', number: 1, title: '소금 망루', subtitle: '해적에게 빼앗긴 망루를 되찾아라', recommended_level: 1, max_deploy: 3, forced_units: ['unit_serin'],
    objective: { type: 'seize', turns: null, target_pos: [9, 4], text: '세린이 망루 꼭대기를 점령하라' },
    defeat_conditions: ['세린이 쓰러진다'],
    map: { width: 12, height: 12, theme: 'coast', tiles: [
        '~~~~~~~~~~~~',
        '~..........~',
        '~..F.....R.~',
        '~.FF...##.#~',
        '~......#.T#~',
        '~.S....#..#~',
        '~......####~',
        '~..~~=~~...~',
        '~...~=~..F.~',
        '~H......FFC~',
        '~..........~',
        '~~~~~~~~~~~~',
    ] },
    player_spawns: [[2, 10], [3, 10], [4, 10], [3, 9], [4, 9]],
    reinforcements: [{ turn: 4, side: 'enemy', group_id: 'grp_east_boats', spawns: [[10, 10], [9, 10]], repeat_every: null, notice_text: '동쪽 바다에서 배가 닿았다' }],
    map_events: [
        { kind: 'village', pos: [1, 9], reward: 'chest_key', text: '어부가 문틈으로 녹슨 열쇠를 내민다. 해적이 숲 너머에 상자를 숨겼다고 한다.' },
        { kind: 'chest', pos: [10, 9], reward: 'shell_cutter', text: '해적이 숨겨둔 상자다. 소금기에 절어 자물쇠가 쉽게 부서진다.' },
        { kind: 'lore', pos: [9, 2], reward: null, text: '무너진 등대 터다. 바다가 갈라지기 전에는 밤마다 불이 켜졌다고 한다.' },
    ],
    dialogue: {
        pre: [
            { speaker: '병사', text: '망루에 해적 깃발이 올랐습니다. 어촌 사람들은 집에 갇혀 있고요.', emotion: 'shocked' },
            { speaker: 'unit_serin', text: '망루를 되찾지 못하면 이 해안은 밤마다 털린다. 다리는 하나, 동쪽 기슭은 멀다. 서두르자.', emotion: 'neutral' },
            { speaker: 'unit_harl', text: '내가 앞장설게. 테사는 뒤에서 쏘고.', emotion: 'happy' },
            { speaker: '???', text: '꼬마들이 나룻배 타고 왔나. 껍질 두른 놈들, 다리 막아.', emotion: 'smirk' },
        ],
        boss_quote: '이 망루에서 내려다보는 바다는 내 거다.',
        mid: [{ trigger: { kind: 'reinforcement', group: 'grp_east_boats' }, lines: [{ speaker: '병사', text: '동쪽 바다에 배입니다! 뒤가 막힙니다!', emotion: 'shocked' }] }],
        post: [
            { speaker: 'unit_serin', text: '망루는 돌아왔다. 깃발은 내리고, 등대 불은... 아직 켤 수 없군.', emotion: 'neutral' },
            { speaker: '병사', text: '해적 두목의 품에서 이게 나왔습니다. 가라앉은 회랑의 지도 같습니다.', emotion: 'neutral' },
            { speaker: 'unit_tessa', text: '회랑? 바다가 갈라지던 날 가라앉았다는 그 길?', emotion: 'shocked' },
            { speaker: 'unit_serin', text: '해적이 왜 회랑을... 다음 썰물에 갯벌을 건너 본다.', emotion: 'neutral' },
        ],
    },
    rewards: { gold: 800, items: ['vulnerary'] },
    tags: ['튜토리얼', '해안', '점령'],
    tips: ['유닛을 누르면 파란 칸(이동)과 빨간 칸(공격)이 보입니다. 파란 칸을 누르면 이동하고, 그 자리에서 할 행동을 고릅니다.', '공격 전에 뜨는 예측 창에서 피해·명중·필살을 확인하세요. 상대의 반격도 함께 보입니다.', '세린이 망루 꼭대기(왕좌 칸)에 서면 "점령"으로 장을 끝냅니다.'],
};
export const deployment: DeploymentDef = {
    id: 'dep_01_salt_watchtower', chapter_id: 'ch_01_salt_watchtower',
    difficulty_note: '가르치는 것: 다리 하나로 병목을 만들어 중갑을 한 명씩 상대하는 법. 압박 수단: 4턴 동쪽 증원이 후방 궁수를 노린다.',
    boss: { ...E('cls_pirate_captain', 2, [9, 4], 'iron_axe', { name: '갯바위 돌프', drop: 'vulnerary' }), name: '갯바위 돌프', stance: 'boss', flavor: '망루를 제 집처럼 쓰는 해적 두목.' },
    groups: [
        G('grp_bridge_block', '다리 북단을 막는 중갑 저지선', 'hold', [E('cls_reef_brute', 1, [5, 6], 'iron_axe')]),
        G('grp_field_blades', '다리를 건너면 달려드는 기동대', 'charge_on_range', [E('cls_corsair', 1, [4, 3], 'iron_axe'), E('cls_corsair', 1, [6, 4], 'iron_axe')], { trigger_range: 4 }),
        G('grp_tower_guard', '망루 안에서 두목을 지키는 궁수', 'guard', [E('cls_gull_archer', 1, [8, 5], 'iron_bow', { drop: 'iron_sword' })]),
        G('grp_east_boats', '4턴 동쪽 상륙. 후방을 노린다', 'target_priority', [E('cls_corsair', 1, [10, 10], 'iron_axe'), E('cls_corsair', 1, [9, 10], 'iron_axe')], { priority: ['healer', 'low_def', 'nearest'], reinforcement: true }),
    ],
};
