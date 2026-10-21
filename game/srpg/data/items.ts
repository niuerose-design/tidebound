import type { ItemDef, MoveType, WeaponType } from '../engine/types';
const W = (id: string, name: string, type: WeaponType, might: number, hit: number, crit: number, range: [number, number], uses: number, price: number, rank: 'E' | 'D' | 'C' | 'B' | 'A', desc: string, opts: { effective?: MoveType[]; heal?: number; shop?: boolean } = {}): ItemDef => ({
    id, name, kind: 'weapon', price, uses, desc, shop: opts.shop ?? true,
    weapon: { type, might, hit, crit, range, magic: ['fire', 'wind', 'thunder', 'light', 'dark'].includes(type), effective: opts.effective ?? [], heal: opts.heal, rank },
});
export const ITEMS: ItemDef[] = [
    // 검
    W('iron_sword', '철검', 'sword', 5, 90, 0, [1, 1], 40, 400, 'E', '가볍고 다루기 쉬운 검. 도끼에 강하고 창에 약하다.'),
    W('steel_sword', '강철검', 'sword', 8, 75, 0, [1, 1], 30, 700, 'D', '무겁지만 한 번 들어가면 깊다.'),
    W('silver_sword', '은검', 'sword', 12, 80, 0, [1, 1], 20, 1500, 'C', '은빛 날이 갑각을 가른다.', { shop: false }),
    W('shell_cutter', '껍질 가르개', 'sword', 7, 85, 10, [1, 1], 25, 900, 'D', '갑각류의 관절을 노리게 벼린 짧은 검. 중갑에 2배 위력.', { effective: ['armored'], shop: false }),
    W('tide_blade', '조류검', 'sword', 10, 90, 15, [1, 1], 30, 0, 'B', '조류 지킴이의 가문에 전해진 검. 세린만 쓴다.', { shop: false }),
    // 창
    W('iron_lance', '철창', 'lance', 7, 80, 0, [1, 1], 40, 450, 'E', '길이가 곧 안전이다. 검에 강하고 도끼에 약하다.'),
    W('steel_lance', '강철창', 'lance', 10, 70, 0, [1, 1], 30, 750, 'D', '무게로 밀어붙이는 창.'),
    W('javelin', '투창', 'lance', 6, 65, 0, [1, 2], 20, 600, 'D', '던지면 2칸 밖에도 닿는다. 궁수와 마법사에게 반격할 수 있다.'),
    W('silver_lance', '은창', 'lance', 14, 75, 0, [1, 1], 20, 1600, 'C', '은빛 창끝. 늪의 무엇이든 꿰뚫는다.', { shop: false }),
    W('horse_bane', '기수 사냥창', 'lance', 8, 75, 0, [1, 1], 20, 1000, 'D', '기병에 2배 위력.', { effective: ['cavalry'], shop: false }),
    // 도끼
    W('iron_axe', '철도끼', 'axe', 8, 75, 0, [1, 1], 40, 400, 'E', '거칠지만 무겁다. 창에 강하고 검에 약하다.'),
    W('steel_axe', '강철도끼', 'axe', 11, 65, 0, [1, 1], 30, 700, 'D', '한 번 맞으면 서 있기 어렵다.'),
    W('hand_axe', '손도끼', 'axe', 7, 60, 0, [1, 2], 20, 600, 'D', '던지면 2칸 밖에도 닿는다.'),
    W('reef_hammer', '암초 망치', 'axe', 13, 60, 5, [1, 1], 25, 1200, 'C', '암초를 깨던 망치. 중갑에 2배 위력.', { effective: ['armored'], shop: false }),
    // 활
    W('iron_bow', '철활', 'bow', 6, 85, 0, [2, 2], 40, 450, 'E', '2칸 떨어진 적만 쏜다. 비행 유닛에 2배 위력.', { effective: ['flying'] }),
    W('steel_bow', '강철활', 'bow', 9, 70, 0, [2, 2], 30, 750, 'D', '시위가 뻣뻣한 만큼 세다. 비행 유닛에 2배 위력.', { effective: ['flying'] }),
    W('long_bow', '장궁', 'bow', 7, 75, 0, [2, 3], 20, 1100, 'C', '3칸 밖에서도 쏜다. 비행 유닛에 2배 위력.', { effective: ['flying'], shop: false }),
    // 마법
    W('fire_tome', '불씨서', 'fire', 5, 90, 0, [1, 2], 40, 500, 'E', '저항을 뚫는 불. 바람에 강하고 번개에 약하다.'),
    W('ember_tome', '잉걸불서', 'fire', 8, 80, 0, [1, 2], 30, 900, 'D', '재가 될 때까지 태운다.'),
    W('wind_tome', '돌풍서', 'wind', 3, 100, 0, [1, 2], 40, 500, 'E', '약하지만 빗나가지 않는다. 비행 유닛에 2배 위력. 번개에 강하고 불에 약하다.', { effective: ['flying'] }),
    W('gale_tome', '질풍서', 'wind', 6, 90, 5, [1, 2], 30, 900, 'D', '비행 유닛에 2배 위력.', { effective: ['flying'] }),
    W('thunder_tome', '번개서', 'thunder', 6, 80, 5, [1, 2], 35, 550, 'E', '필살이 잘 터진다. 불에 강하고 바람에 약하다.'),
    W('light_tome', '새벽빛서', 'light', 4, 95, 5, [1, 2], 30, 800, 'D', '어둠에 2배 위력은 없지만 빗나가지 않는다.', { shop: false }),
    W('dark_tome', '늪어둠서', 'dark', 8, 70, 0, [1, 2], 30, 0, 'D', '늪에서 건진 책. 적만 쓴다.', { shop: false }),
    W('drowned_tome', '익사의 서', 'dark', 12, 75, 5, [1, 2], 20, 0, 'B', '가라앉은 회랑의 마법.', { shop: false }),
    // 지팡이
    W('heal_staff', '치유 지팡이', 'staff', 0, 100, 0, [1, 1], 30, 600, 'E', '인접 아군 체력을 마력+10 회복한다.', { heal: 10 }),
    W('mend_staff', '회복 지팡이', 'staff', 0, 100, 0, [1, 1], 20, 1000, 'D', '인접 아군 체력을 마력+20 회복한다.', { heal: 20 }),
    W('far_staff', '원격 치유 지팡이', 'staff', 0, 100, 0, [1, 3], 15, 1500, 'C', '3칸 안의 아군 체력을 마력+10 회복한다.', { heal: 10, shop: false }),
    // 단검
    W('iron_dagger', '철단검', 'dagger', 4, 95, 10, [1, 1], 40, 400, 'E', '짧고 빠르다. 상성이 없다.'),
    W('throw_dagger', '투척 단검', 'dagger', 3, 85, 5, [1, 2], 25, 650, 'D', '2칸 밖에도 닿는다.'),
    W('mist_dagger', '안개 단검', 'dagger', 8, 90, 20, [1, 1], 25, 1300, 'C', '안개 추적자의 단검. 필살이 높다.', { shop: false }),
    // 몬스터
    W('claw', '발톱', 'claw', 6, 80, 5, [1, 1], 99, 0, 'E', '몬스터의 발톱.', { shop: false }),
    W('spine_claw', '가시 발톱', 'claw', 9, 75, 10, [1, 1], 99, 0, 'D', '가시등갑 게의 집게.', { shop: false }),
    W('tongue', '긴 혀', 'claw', 5, 85, 0, [1, 2], 99, 0, 'E', '늪 두꺼비의 혀. 2칸 밖에서 감는다.', { shop: false }),
    // 소비 · 강화
    { id: 'vulnerary', name: '상비약', kind: 'vulnerary', price: 300, uses: 3, heal: 10, desc: '체력 10 회복. 3회 쓸 수 있다.', shop: true },
    { id: 'elixir', name: '영약', kind: 'vulnerary', price: 900, uses: 3, heal: 99, desc: '체력을 모두 회복한다. 3회.', shop: true },
    { id: 'door_key', name: '문 열쇠', kind: 'door_key', price: 300, uses: 1, desc: '인접한 문을 연다.', shop: true },
    { id: 'chest_key', name: '상자 열쇠', kind: 'key', price: 300, uses: 1, desc: '서 있는 칸의 상자를 연다.', shop: true },
    { id: 'tide_seal', name: '조류의 증표', kind: 'promote', price: 2500, uses: 1, desc: '10레벨 이상의 기본 클래스를 상급 클래스로 승급시킨다.', shop: true },
    { id: 'salt_fruit', name: '소금 열매', kind: 'boost', price: 1500, uses: 1, boost: { hp: 5 }, desc: '체력 최대치 +5.', shop: false },
    { id: 'coral_dust', name: '산호 가루', kind: 'boost', price: 1500, uses: 1, boost: { str: 2 }, desc: '힘 +2.', shop: false },
    { id: 'gale_feather', name: '돌풍 깃털', kind: 'boost', price: 1500, uses: 1, boost: { spd: 2 }, desc: '속도 +2.', shop: false },
    { id: 'shell_plate', name: '등갑 조각', kind: 'boost', price: 1500, uses: 1, boost: { def: 2 }, desc: '수비 +2.', shop: false },
    { id: 'moon_pearl', name: '달빛 진주', kind: 'boost', price: 1500, uses: 1, boost: { res: 2, lck: 2 }, desc: '저항 +2, 운 +2.', shop: false },
];
export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export const itemDef = (id: string): ItemDef => { const d = ITEM_MAP[id]; if (!d) throw Error(`unknown item ${id}`); return d; };
export const SHOP_ITEMS = ITEMS.filter(i => i.shop);
export const WEAPON_NAMES: Record<WeaponType, string> = { sword: '검', lance: '창', axe: '도끼', bow: '활', fire: '불', wind: '바람', thunder: '번개', light: '빛', dark: '어둠', staff: '지팡이', dagger: '단검', claw: '발톱' };
