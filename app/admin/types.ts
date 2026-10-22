/** v3.413 운영자 페이지 서버 응답 형(page.tsx 에서 분리). server/admin.ts 의 결과 모양과 같습니다. */
export type AdminSp = { have: number; research: { name: string; sp: number; claimed: boolean }[]; spentSkills: { name: string; sp: number }[]; limitBreaks: { name: string; sp: number }[]; logs: string[] };
export type AdminPlayer = { id: string; username: string; slot: number; name: string; level: number; job: string; rank: string; rebirths: number; pearls: number; gold: number; sp: AdminSp; inDungeon: boolean; revision: number; updatedAt: number; lastRebirthAt: number | null; lifeMs: number | null; lifePartial: boolean; paceMs: number | null };
export type RebirthPace = { recent: { day: number; week: number }; measured: number; real: { avg: number; median: number }; play: { avg: number; median: number }; byCount: { label: string; count: number; real: number; play: number }[]; latest: { name: string; n: number; at: number; realMs: number; playMs: number; level: number; partial: boolean }[] };
export type Preview = { before: AdminPlayer; after: AdminPlayer };
export type EventRow = { id: string; name: string; from: string; until: string; exp?: number; gold?: number; drop?: number; mastery?: number; mimic?: number; nuri?: number; live: boolean; disabled?: boolean };
export type EventList = { code: EventRow[]; extra: EventRow[]; banner: string; at: number };
export type ClosureRow = { id: string; name: string; closed: boolean; locked: boolean };
export type ClosureList = { stages: ClosureRow[]; dungeons: ClosureRow[] };
/** v27.73 문 개방: ??? 직업 하나와 그 문 이름·힌트·운영자가 열어 둔 여부. */
export type Tab = 'life' | 'events' | 'closures' | 'stats' | 'news' | 'income' | 'market';
/** v3.213 증권거래소 운영(server/market-config.ts adminMarket). */
export type MarketAdmin = { control: { closed: boolean; haltUntil: number; reason: string }; tick: number; stocks: { id: string; name: string; risk: string; base: number; price: number; change: number }[] };
/** v3.58 사냥 골드 수입 통계(server/admin.ts adminIncome). */
export type IncomeRate = { perHour: number; hours: number; estimated: boolean; earned: number };
export type IncomeRow = { id: string; name: string; username: string; rebirths: number; ascension: number; level: number; place: string; tide: number; perHour: number; hours: number; estimated: boolean; gold: number; earned: number; running: boolean; updatedAt: number; exp?: IncomeRate; mastery?: IncomeRate };
export type IncomeData = { at: number; measured: number; recent: number; median: number; byRebirth: { label: string; count: number; median: number; max: number }[]; top: IncomeRow[]; picked: (IncomeRow & { log: { ago: number; gold: number; exp?: number; mastery?: number }[] })[] };
export type NewsRow = { id: number; name: string; text: string; at: number; hacker: boolean };
export type Count = { name: string; count: number };
export type Bucket = { label: string; count: number };
export type Balance = { godDepth: number; reached: number; god: { tries: number; wins: number; players: number; best: number }; offline: { settled: number; capped: number }; abyss: Bucket[] };
export type Stats = { rebirthPace: RebirthPace; balance: Balance; altar: { gen: number; godAlive: boolean; throne: string; points: number; titheGold: number }; at: number; accounts: number; saves: number; active: { hour: number; day: number; week: number }; running: number; inDungeon: number; level: { avg: number; max: number; buckets: Bucket[] }; rebirths: { avg: number; max: number; buckets: Bucket[] }; stages: Count[]; dungeons: Count[]; jobs: Count[]; totals: { kills: number; playHours: number; gold: number; pearls: number; sp: number }; medians: { gold: number; pearls: number }; abyssBest: number; limitBreakers: number; inGuild: number; top: { name: string; level: number; rebirths: number; abyss: number }[]; ranks: { dist: { name: string; count: number }[]; top: string; perks: { name: string; count: number; avg: number; max: number }[]; freePoints: number } };
