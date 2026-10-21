import type { ChapterDef, DeploymentDef } from '../../engine/types';
import { E, G } from './helpers';
export const chapter: ChapterDef = {
    id: 'ch_06_fog_mire', number: 6, title: '안개늪', subtitle: '길이 바뀌는 늪을 건너 동쪽 기슭으로', recommended_level: 7, max_deploy: 8, forced_units: ['unit_serin'],
    objective: { type: 'escape', turns: null, target_pos: [15, 2], text: '세린이 동쪽 기슭(탈출 지점)에 도달하라' },
    defeat_conditions: ['세린이 쓰러진다'],
    map: { width: 16, height: 14, theme: 'swamp', tiles: [
        '~~~~~~~~~~~~~~~~',
        '~~~..F~~~~F...~~',
        '~~...F~~~..F.=..',
        '~..~~~~~~..~~~.~',
        '~..F..~~..F.~~.~',
        '~.....S...R..=.~',
        '~.~~~..~~~..~~~~',
        '~.~~..F.~~....~~',
        '~...F.~~~...F..~',
        '~~~..~~..~~....~',
        '~H..~.....F.~..~',
        '~...~~..~~~~~..~',
        '~......F.......~',
        '~~~~~~~~~~~~~~~~',
    ] },
    player_spawns: [[1, 12], [2, 12], [3, 12], [1, 11], [2, 11], [3, 11], [2, 10], [3, 10]],
    reinforcements: [{ turn: 3, side: 'enemy', group_id: 'grp_rising_wisps', spawns: [[4, 6], [9, 9]], repeat_every: 2, repeat_until: 9, notice_text: '늪 위에 도깨비불이 떠올랐다' }],
    map_events: [
        { kind: 'village', pos: [1, 10], reward: 'moon_pearl', text: '늪지기 노인이 달빛 진주를 내준다. 어둠을 조금 밀어낸다고 한다.' },
        { kind: 'lore', pos: [10, 5], reward: null, text: '늪에 반쯤 잠긴 돌기둥이다. 회랑으로 이어지던 길의 이정표였다.' },
    ],
    dialogue: {
        pre: [
            { speaker: 'unit_wen', text: '바람이면 늪 위도 걸을 수 있어요. 거의. 물은 못 건너니까 다리를 찾아야 해요.', emotion: 'neutral' },
            { speaker: 'unit_serin', text: '동쪽 기슭까지 간다. 싸움보다 걷는 게 먼저다. 다 잡을 필요는 없어.', emotion: 'neutral' },
            { speaker: 'unit_tessa', text: '저기 하늘에... 연 기수? 리오야! 리오가 왜 해적 쪽에.', emotion: 'shocked' },
            { speaker: 'unit_gerda', text: '새를 볼모로 잡혔겠지. 말을 걸어 봐라.', emotion: 'neutral' },
        ],
        boss_quote: null,
        mid: [{ trigger: { kind: 'reinforcement', group: 'grp_rising_wisps' }, lines: [{ speaker: 'unit_mio', text: '도깨비불이에요. 마법이라 갑옷이 소용없어요. 저항 높은 사람이 받아요.', emotion: 'shocked' }] }],
        post: [
            { speaker: 'unit_serin', text: '늪을 건넜다. 뒤에 남은 불빛은 따라오지 못한다.', emotion: 'neutral' },
            { speaker: 'unit_wen', text: '동쪽 기슭 너머에 긴 다리가 있어요. 폭풍이 오고 있고요.', emotion: 'neutral' },
            { speaker: 'unit_kael', text: '다리 건너가 옛 등대 폐허입니다. 기록의 나머지가 거기 있을 겁니다.', emotion: 'neutral' },
            { speaker: 'unit_serin', text: '폭풍이 오기 전에 다리를 건넌다.', emotion: 'neutral' },
        ],
    },
    rewards: { gold: 1400, items: ['gale_tome'] },
    tags: ['늪', '탈출', '영입'],
    tips: ['탈출 목표: 세린이 목표 칸에 서서 "탈출"하면 승리합니다. 다른 유닛도 함께 빠져나간 것으로 칩니다.', '물(~)은 비행 유닛만 건넙니다. 도깨비불은 물 위에 떠 있어 보병이 닿지 못하니 활·마법으로 떨어뜨리세요.'],
};
export const deployment: DeploymentDef = {
    id: 'dep_06_fog_mire', chapter_id: 'ch_06_fog_mire',
    difficulty_note: '가르치는 것: 싸우지 않고 지나가는 판단. 압박 수단: 2턴마다 늪에서 솟는 도깨비불이 느린 유닛을 따라온다.',
    boss: null,
    groups: [
        G('grp_bog_toads', '숲에 숨은 두꺼비', 'guard', [E('cls_mire_toad', 6, [6, 7], 'tongue'), E('cls_mire_toad', 6, [12, 8], 'tongue'), E('cls_mire_toad', 6, [10, 10], 'tongue'), E('cls_mire_toad', 5, [7, 12], 'tongue')]),
        G('grp_wisps', '물 위를 떠도는 도깨비불', 'aggressive', [E('cls_bog_wisp', 6, [8, 3], 'dark_tome'), E('cls_bog_wisp', 6, [6, 9], 'dark_tome'), E('cls_bog_wisp', 6, [12, 4], 'dark_tome')]),
        G('grp_fen_archers', '요새와 돌기둥의 궁수', 'guard', [E('cls_gull_archer', 6, [6, 5], 'iron_bow'), E('cls_gull_archer', 6, [10, 5], 'steel_bow')]),
        G('grp_lio', '볼모 잡힌 연 기수. 테사가 말을 걸면 합류', 'hold', [E('cls_kite_rider', 6, [10, 4], 'iron_lance', { name: '리오', recruitable_as: 'unit_lio', items: ['javelin'] })]),
        G('grp_rear_blades', '남쪽 기슭의 검사', 'charge_on_range', [E('cls_shore_blade', 6, [9, 12], 'steel_sword'), E('cls_shore_blade', 6, [13, 12], 'iron_sword', { drop: 'vulnerary' })], { trigger_range: 4 }),
        G('grp_rising_wisps', '3턴부터 2턴마다 솟는 도깨비불', 'aggressive', [E('cls_bog_wisp', 6, [4, 6], 'dark_tome'), E('cls_bog_wisp', 6, [9, 9], 'dark_tome')], { reinforcement: true }),
    ],
};
