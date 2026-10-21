/**
 * 전기(戰記) 모드 — 턴제 전술 RPG의 자료형. 엔진은 UI에 의존하지 않는 순수 함수로만 구성됩니다.
 * 좌표는 [x, y]로 x가 열(가로), y가 행(세로)입니다. tiles[y][x]가 그 칸입니다.
 */
export type Stat = 'hp' | 'str' | 'mag' | 'skl' | 'spd' | 'lck' | 'def' | 'res';
export const STATS: Stat[] = ['hp', 'str', 'mag', 'skl', 'spd', 'lck', 'def', 'res'];
export const STAT_NAMES: Record<Stat, string> = { hp: '체력', str: '힘', mag: '마력', skl: '기술', spd: '속도', lck: '운', def: '수비', res: '저항' };
export type Stats = Record<Stat, number>;
export type WeaponType = 'sword' | 'lance' | 'axe' | 'bow' | 'fire' | 'wind' | 'thunder' | 'light' | 'dark' | 'staff' | 'dagger' | 'claw';
export type MoveType = 'infantry' | 'cavalry' | 'armored' | 'flying';
export type Side = 'player' | 'enemy' | 'ally';
export type Pos = [number, number];

export type ClassRank = 'base' | 'advanced' | 'special';
/** 클래스 고유 규칙(브리프 6절 class_skill_hint를 실제 규칙으로 옮긴 것). */
export type ClassSkill =
    | 'none'
    | 'forest_guard'   // 숲·폐허에서 방어 시 수비 +2
    | 'water_edge'     // 물가(~)에 인접하면 회피 +15
    | 'low_hp_rage'    // 체력 절반 이하면 힘 +3
    | 'anti_flier'     // 비행 유닛에 위력 ×2(무기 효과와 별개)
    | 'first_strike'   // 공격받을 때 반격을 먼저 함
    | 'shell_wall'     // 인접한 아군마다 수비 +1(최대 +3)
    | 'canto'          // 공격 뒤 남은 이동력으로 이동
    | 'steal_lock'     // 상자·문을 열쇠 없이 염
    | 'mend_aura'      // 턴 시작에 인접 아군 체력 5 회복
    | 'bridge_fury'    // 다리 위에서 공격 시 필살 +15
    | 'mountain_eye'   // 산·봉우리 위에서 명중 +20
    | 'pack_hunter';   // 같은 적을 노리는 인접 아군마다 명중 +10

export interface ClassDef {
    id: string;
    name: string;
    rank: ClassRank;
    side: Side | 'both';
    move: number;
    move_type: MoveType;
    weapons: WeaponType[];
    range: [number, number];
    base_stats: Stats;
    caps: Stats;
    growth_mods: Stats;
    promotes_to: string[];
    promotion_bonus: Partial<Stats> | null;
    skill: ClassSkill;
    skill_text: string;
    flavor: string;
    description: string;
    /** 맵 토큰에 보이는 한 글자. */
    glyph: string;
    tags: string[];
}

export type Role = 'lord' | 'frontline' | 'cavalry' | 'flier' | 'archer' | 'mage' | 'healer' | 'thief' | 'armored' | 'support';
export type RecruitMethod = 'auto' | 'talk' | 'visit' | 'survive' | 'choice';
export interface UnitDef {
    id: string;
    name: string;
    class_id: string;
    role: Role;
    join_chapter: number;
    join_level: number;
    recruit: { method: RecruitMethod; talk_with: string | null; condition_text: string };
    base_mods: Stats;
    growths: Stats;
    personal_skill: ClassSkill;
    personal_skill_text: string;
    affinity: 'fire' | 'water' | 'earth' | 'wind' | 'light' | 'dark';
    portrait_hint: string;
    flavor: string;
    bio: string;
    lines: { join: string; levelup: string[]; critical: string[]; retreat: string; death: string };
    supports: { with: string; theme: string }[];
    /** 합류 시 들고 오는 아이템 id. */
    start_items: string[];
    tags: string[];
}

export type ItemKind = 'weapon' | 'vulnerary' | 'key' | 'door_key' | 'promote' | 'boost';
export interface ItemDef {
    id: string;
    name: string;
    kind: ItemKind;
    price: number;
    uses: number;
    desc: string;
    /** 무기만. */
    weapon?: { type: WeaponType; might: number; hit: number; crit: number; range: [number, number]; magic: boolean; effective: MoveType[]; heal?: number; rank: 'E' | 'D' | 'C' | 'B' | 'A' };
    /** 소비·강화: 회복량 또는 올리는 능력치. */
    heal?: number;
    boost?: Partial<Stats>;
    /** 상점에서 파는지. */
    shop: boolean;
}

export interface ItemInstance { id: string; uses: number; /** 고유 번호(교환·장착 구분). */ n: number }

/** 로스터에 있는 유닛(전투 밖 상태). 적은 전투 안에서만 만들어집니다. */
export interface Unit {
    uid: string;
    defId: string | null;
    name: string;
    classId: string;
    side: Side;
    level: number;
    exp: number;
    stats: Stats;
    growths: Stats;
    items: ItemInstance[];
    /** items의 index. 무기가 없으면 -1. */
    equipped: number;
    status: 'alive' | 'retreated' | 'dead';
    /** 총 격파 수(기록). */
    kills: number;
    boss?: boolean;
    /** 적 전용: 처치 시 떨어뜨리는 아이템 id. */
    drop?: string | null;
    /** 적 전용: 대화로 영입 가능하면 그 유닛 정의 id. */
    recruitableAs?: string | null;
    /** 개인 스킬(플레이어 유닛). */
    skill: ClassSkill;
}

export type Stance = 'hold' | 'guard' | 'aggressive' | 'charge_on_range' | 'target_priority' | 'flee' | 'boss';
export type Priority = 'healer' | 'low_hp' | 'low_def' | 'low_res' | 'lord' | 'nearest' | 'highest_damage';

export interface BattleUnit extends Unit {
    x: number; y: number;
    hp: number;
    acted: boolean;
    groupId: string | null;
    stance: Stance;
    home: Pos | null;
    priority: Priority[] | null;
    fleeTargets: Pos[] | null;
    /** 도적이 목표물을 다 처리하고 탈출 중. */
    escaping?: boolean;
    /** 이번 전투에 얻은 경험치 합(결과 화면). */
    gained: number;
    /** 클래스에서 복사(전투 중 바뀌지 않음). */
    moveType: MoveType;
    move: number;
}

export type ObjectiveType = 'rout' | 'seize' | 'boss' | 'defend' | 'escape' | 'survive';
export interface Line { speaker: string; text: string; emotion?: 'neutral' | 'angry' | 'sad' | 'happy' | 'shocked' | 'smirk' | null }
export type MapEventKind = 'village' | 'chest' | 'door' | 'recruit_talk' | 'trap' | 'lore';
export interface MapEvent { kind: MapEventKind; pos: Pos; reward: string | null; gold?: number; text: string }
export interface Reinforcement { turn: number; side: 'enemy' | 'ally'; group_id: string; spawns: Pos[]; repeat_every: number | null; repeat_until?: number; notice_text: string }

export interface ChapterDef {
    id: string;
    number: number;
    title: string;
    subtitle: string;
    recommended_level: number;
    max_deploy: number;
    forced_units: string[];
    objective: { type: ObjectiveType; turns: number | null; target_pos: Pos | null; text: string };
    defeat_conditions: string[];
    map: { width: number; height: number; tiles: string[]; theme: string };
    player_spawns: Pos[];
    reinforcements: Reinforcement[];
    map_events: MapEvent[];
    dialogue: { pre: Line[]; boss_quote: string | null; mid: { trigger: MidTrigger; lines: Line[] }[]; post: Line[] };
    rewards: { gold: number; items: string[] };
    /** 이 장을 깨면 자동 합류하는 유닛(join_chapter가 이 장인 auto 유닛). */
    tags: string[];
    /** 튜토리얼 안내(1~2장). */
    tips?: string[];
}
export type MidTrigger = { kind: 'turn'; turn: number } | { kind: 'reinforcement'; group: string } | { kind: 'boss_hp'; ratio: number } | { kind: 'boss_engage' };

export interface DeployUnit { class_id: string; level: number; pos: Pos; weapon: string; items?: string[]; name?: string | null; recruitable_as?: string | null; drop?: string | null; stat_bonus?: Partial<Stats> | null }
export interface DeployGroup { id: string; role_note: string; stance: Exclude<Stance, 'boss'>; trigger_range: number | null; priority: Priority[] | null; flee_targets: Pos[] | null; is_reinforcement: boolean; units: DeployUnit[] }
export interface DeploymentDef {
    id: string;
    chapter_id: string;
    difficulty_note: string;
    boss: (DeployUnit & { name: string; stance: 'hold' | 'guard' | 'aggressive' | 'boss'; flavor: string }) | null;
    groups: DeployGroup[];
    /** 아군(NPC) 유닛: 민가 주민 등. 초기 배치. */
    allies?: DeployUnit[];
}

export type Mode = 'casual' | 'classic';
export type Phase = 'player' | 'enemy' | 'ally';

export interface LogEntry { turn: number; text: string; kind: 'info' | 'combat' | 'event' | 'turn' | 'levelup' | 'loss' }

export interface Battle {
    chapterId: string;
    mode: Mode;
    seed: number;
    rng: number;
    turn: number;
    phase: Phase;
    units: BattleUnit[];
    /** 현재 맵(문 열림 · 민가 파괴 반영). */
    tiles: string[];
    status: 'playing' | 'won' | 'lost';
    lostReason?: string;
    rewindsLeft: number;
    log: LogEntry[];
    /** 방문·개방한 좌표("x,y"). */
    used: string[];
    /** 발동한 증원(group_id + 턴). */
    spawned: string[];
    /** 그룹별 돌격 전환. */
    triggered: string[];
    /** 발동한 중간 대사(인덱스). */
    firedMid: number[];
    /** 영입(대화)된 유닛 정의 id. */
    recruited: string[];
    /** 전투 중 얻은 아이템(결과 화면으로). */
    loot: string[];
    gold: number;
    /** 보스와 교전했는지(보스 대사). */
    bossMet: boolean;
    /** 이번 전투에서 쓰러진 플레이어 유닛 uid. */
    fallen: string[];
    /** 탈출 목표를 지나간 유닛. */
    escaped: string[];
    /** 전투 중 지금 플레이어 턴의 시작 스냅샷은 UI(state)가 보관합니다. */
    uidSeq: number;
    itemSeq: number;
    /** UI에 보여 줄 대기 중 대사. */
    pending: Line[];
    pendingNotice: string | null;
    /** 마지막 전투 결과(연출용). */
    lastCombat: CombatResult | null;
}

export interface Strike { attacker: string; defender: string; hit: boolean; crit: boolean; dmg: number; heal?: boolean }
export interface CombatResult { strikes: Strike[]; attacker: string; defender: string; expA: number; expD: number; killed: string | null; levelUps: { uid: string; name: string; gains: Partial<Stats>; line: string }[]; drop?: string | null }
export interface Forecast {
    atk: { hp: number; dmg: number; hit: number; crit: number; doubles: boolean; heal?: number };
    def: { hp: number; dmg: number | null; hit: number | null; crit: number | null; doubles: boolean };
    triangle: -1 | 0 | 1;
}
