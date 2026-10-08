/**
 * v3.18 해커 직업군 1단계(docs/concept.md 9장). 싸우는 대신 서버를 건드리며 자라는 제약 직업입니다.
 * - 해커로 있는 동안 전투(사냥·던전)를 하지 않습니다. 자동 사냥은 브루트포스(방치)로 바뀌어 비트·권한 경험치만 쌓습니다.
 * - 전용 재화 비트(bit)와 전용 성장 권한 등급. 일반 → 해커(SP·세계석 → 비트)는 허용, 해커 → 일반은 막습니다.
 * - 침투 작전: 서버가 낸 자물쇠 퍼즐을 한 칸씩 뚫는 로그라이트. 정답은 서버 키로만 만들 수 있어 세이브에 남지 않습니다.
 * - 해킹 I: 방송 탈취 · 크래킹(서버 공유 설정 hacks, 30초 캐시). v3.26 신원 조작(옛 애드가드): 해커가 고른 모험가의 순위표 정보 공개 여부를 바꿈.
 */

export const HACKER_ID = 'hacker';
export const ADGUARD_ID = 'adGuard';
/** v3.25 화이트 해커(해커 계열 2차). 해커와 같은 제약을 받고, 해킹을 되돌리고 사냥터를 패치합니다. */
export const WHITE_HACKER_ID = 'whiteHacker';
/** v3.28 블랙 해커(해커 계열 2차). 해커와 같은 제약을 받고, 해킹을 더 자주·더 비싸게 쓰되 실패하면 추적됩니다. */
export const BLACK_HACKER_ID = 'blackHacker';
export const HACKER_LINE: readonly string[] = [HACKER_ID, WHITE_HACKER_ID, BLACK_HACKER_ID];
export const FIREWALL_ID = 'firewall';
/** v3.28 블랙 해커 전용 패시브: 실패해 추적당하는 시간을 절반으로. */
export const WIPE_TRACE_ID = 'wipeTrace';
export const isHackerJob = (id: string) => HACKER_LINE.includes(id);

export const HACKER = {
    /** SP·세계석 1개를 태울 때 얻는 비트(되돌릴 수 없음). */
    convert: { sp: 40, pearls: 4 },
    /** 권한 등급 g → g+1에 필요한 권한 경험치: base × g^power. */
    grade: { base: 120, power: 1.5, max: 99 },
    /** 브루트포스(방치): 틱(2초)마다. 오프라인 정산에도 같은 값. */
    brute: { bits: .02, exp: .05 },
    /** 침투 작전. */
    infil: {
        /** v3.26 3 → 5회. */
        entriesPerDay: 5,
        /** 깊이 d 노드를 뚫으면 쌓이는 보상(뽑아 나가면 전부, 추적되면 traceKeep만). */
        reward: (depth: number) => ({ bits: 4 + 3 * depth, exp: 10 + 6 * depth }),
        traceKeep: .5,
        /** 노드 종류: 홀수 깊이는 방화벽(숫자 자물쇠), 짝수 깊이는 포트 스캔. */
        /** v3.26 숫자 야구를 쉽게: 3자리는 깊이 5까지(시도 9), 4자리는 12까지(10), 그 뒤 5자리(12). */
        lock: (depth: number) => ({ digits: depth <= 5 ? 3 : depth <= 12 ? 4 : 5, tries: depth <= 5 ? 9 : depth <= 12 ? 10 : 12 }),
        /** v3.26 새 퍼즐의 시도 횟수: 수열(다음 수) · 진법 변환(2진수·16진수 → 10진수) · 암호 해독(시저 암호). v3.28 최단 경로 · 패스워드 재조합. */
        tries: { seq: 3, bin: 3, cipher: 4, path: 3, anagram: 4 },
        port: (depth: number) => { const range = depth <= 4 ? 64 : depth <= 10 ? 256 : 1024; return { range, tries: Math.ceil(Math.log2(range)) + (depth <= 4 ? 2 : depth <= 10 ? 1 : 0) }; },
    },
    /** 해킹 단계(I~X): 단계마다 필요한 권한 등급과 비트. v3.25 2단계 구현으로 V까지, v3.28 3단계로 X까지 엽니다. */
    tiers: [{ grade: 1, bits: 150 }, { grade: 4, bits: 400 }, { grade: 6, bits: 800 }, { grade: 8, bits: 1300 }, { grade: 10, bits: 2000 },
        { grade: 12, bits: 3000 }, { grade: 14, bits: 4200 }, { grade: 16, bits: 5600 }, { grade: 18, bits: 7500 }, { grade: 20, bits: 10000 }] as { grade: number; bits: number }[],
    /** 해킹 실행: 하루 횟수·지속·비용. n = 해킹 단계. */
    broadcast: { maxLength: 40, minutes: (n: number) => 30 + 3 * (n - 1), perDay: (n: number) => 1 + Math.floor(n / 3), bits: 20, exp: 40 },
    crack: { minutes: 60, perDay: (n: number) => 1 + Math.floor(n / 4), bits: 15, exp: 30 },
    /** v3.25 해킹 II 이벤트 변조: 남은 시간 ±20분×n, 배율 ±10%p×n(×1.0 아래로는 안 내려감). 이벤트당 1회, 하루 1회. */
    tamper: { minutes: (n: number) => 20 * n, rate: (n: number) => .1 * n, perDay: () => 1, bits: 30, exp: 60 },
    /** v3.25 해킹 III 서버 다운: 사냥터·던전 하나를 15분 + 5분×(n−3) 동안 새 입장 불가(첫 사냥터 제외, 이미 들어간 모험가는 계속). */
    down: { minutes: (n: number) => 15 + 5 * Math.max(0, n - 3), perDay: (n: number) => 1 + Math.floor(Math.max(0, n - 3) / 3), bits: 40, exp: 80 },
    /**
     * v3.25 해킹 IV 패킷 스니핑: 1시간 동안 서버에서 활동한 다른 모험가 1명당 권한 경험치 10×n + 비트 n(상한 1,000×n · 비트 100×n). 끝난 뒤 정산.
     * 동접 30명이면 단계 V에서 권한 1,500(등급 10→11에 필요한 3,800의 약 40%) · 비트 150. 하루 한 번 받는 후반 성장 축입니다.
     */
    sniff: { minutes: 60, perPlayer: (n: number) => 10 * n, cap: (n: number) => 1000 * n, bitsPerPlayer: (n: number) => n, bitsCap: (n: number) => 100 * n, perDay: () => 1, bits: 25, exp: 0 },
    /** v3.25 해킹 V 백도어: 제단 게이지 하나를 그 게이지 비용의 2%×(n−4)만큼 채움(기여 순위 제외). 게이지마다 하루 1회. */
    backdoor: { share: (n: number) => .02 * Math.max(1, n - 4), bits: 30, exp: 50 },
    /** v3.25 화이트 해커: 해킹 되돌리기(방송·서버 다운·이벤트 변조), 사냥터 패치(해킹 면역), 방화벽 패시브(하루 한 번 크래킹 막음). */
    white: {
        restore: { perDay: (n: number) => 1 + Math.floor(n / 3), bits: 20, exp: 50, bounty: .5 },
        patch: { minutes: 60, perDay: () => 1, bits: 20, exp: 40 },
    },
    /** v3.25 프로그램 메모리: 기본 4 + 권한 등급 5마다 1. */
    memory: (grade: number) => 4 + Math.floor(grade / 5),
    /**
     * v3.26 신원 조작(옛 애드가드): 숙련 단계 = 하루 횟수, 비트 10. v3.27 기간은 해커가 정합니다(시간, 0 = 무기한, 최대 1년).
     * v3.28 숙련 3단계(옛 2시간)부터 미끼 정보: 가린 이름·직업·레벨 자리에 ??? 대신 해커가 정한 가짜 값을 보여 줍니다(크래킹하면 진짜가 드러남).
     */
    spoof: { maxHours: 24 * 365, perDay: (level: number) => Math.max(0, level), bits: 10, exp: 20, decoyLevel: 3, decoyMaxLevel: 999 },
    /**
     * v3.27 해커끼리 견제(해커 순위 행에서). 해커만 쓰고(화이트 해커는 쓰지 않음), 각각 하루 1회. 화이트 해커 방화벽이 하루 한 번 막습니다.
     * 역추적: 대상의 오늘 침투 작전 입장 −1(대상에게 하루 최소 1회는 남김, 하루 최대 −3). 과부하: 대상의 브루트포스 비트 절반(2시간).
     */
    trace: { bits: 30, exp: 40, maxPerDay: 3 },
    overload: { bits: 40, exp: 40, minutes: 120, rate: .5 },
    /**
     * v3.28 해킹 VI 패킷 가로채기: 떠 있는 월드보스 하나에 걸어 두고, 그 보스가 쓰러지면 격파 보상 가치의 10%×(n−5)를 비트로 받습니다.
     * 보상 가치 = 골드/1,000 + 세계석×40 + SP×400(비트 환산). 보스가 쓰러지지 않고 떠나면 아무것도 받지 못합니다. 하루 1회.
     */
    intercept: { share: (n: number) => .1 * Math.max(1, n - 5), value: (r: { gold?: number; pearls: number; sp: number }) => Math.floor((r.gold || 0) / 1000 + r.pearls * 40 + r.sp * 400), perDay: () => 1, bits: 50, exp: 80 },
    /** v3.28 해킹 VII 세이브 스캠: 떠 있는 월드보스 체력 되감기(깎인 체력의 5%×(n−6) 회복) 또는 빨리감기(남은 체력의 3%×(n−6) 감소, 쓰러뜨리지는 못함). 하루 1회, 보스 한 마리(세대)당 서버 전체 1회, 소식 공지. */
    savescum: { rewind: (n: number) => .05 * Math.max(1, n - 6), forward: (n: number) => .03 * Math.max(1, n - 6), perDay: () => 1, bits: 60, exp: 100 },
    /** v3.28 해킹 VIII 봇넷: 3시간 동안 브루트포스(비트·권한)와 그동안 시작한 패킷 스니핑 정산 ×2, 오늘 침투 작전 입장 +2. 하루 1회(세이브 안에서만 계산, 서버 쓰기 없음). */
    botnet: { hours: 3, rate: 2, entries: 2, perDay: () => 1, bits: 80, exp: 60 },
    /** v3.28 해킹 IX DDoS: 서버 이벤트 하나(경험치·골드·드롭 중 선택, ×1.2, 2시간)를 강제로 엽니다. 주 1회, 서버에 하나만. */
    ddos: { kinds: ['exp', 'gold', 'drop'] as const, rate: 1.2, hours: 2, perWeek: () => 1, bits: 150, exp: 200 },
    /** v3.28 해킹 X 루트 권한: 하루 1회 오늘의 해킹 횟수를 모두 되돌림(주간 DDoS 제외) + 10분 동안 서버 전체에 ROOT 연출 + 영구 칭호 root. */
    root: { perDay: () => 1, bits: 100, exp: 300, showMinutes: 10 },
    /**
     * v3.28 블랙 해커: 하루(주) 횟수 두 배(쿨다운 절반) · 해킹 비트 두 배 · 실패 확률 35% − 3%×n(최소 5%).
     * 실패하면 비트·횟수는 쓰이고 효과는 없으며, 추적되어 소식에 이름이 공지되고 6시간 동안 해킹할 수 없습니다.
     * 대상·보스·게이지마다 걸린 1회 제한과 루트 권한(하루 1회)은 그대로입니다.
     */
    black: { cost: 2, cap: 2, fail: (n: number) => Math.max(.05, .35 - .03 * n), traceHours: 6, wipedHours: 3 },
    /**
     * v3.57 정보 해킹(해킹 I부터, 화이트 해커도 씀): 아직 모르는 비밀 조각 하나(드롭·확률 수치 · 몬스터 출현 가중치 · 히든 직업 전직 조건 · 숨은 조건)를 알아냅니다.
     * 하루 1 + 단계÷3회, 알아낸 조각은 최근 keep개까지 해킹 화면에 남습니다. 퍼뜨리기는 방송 탈취·채팅으로.
     */
    leak: { perDay: (n: number) => 1 + Math.floor(n / 3), bits: 25, exp: 40, keep: 120 },
} as const;
/** v3.25 해킹 실행 비트 비용(되돌린 해킹의 현상금 계산에도 씁니다). */
export const HACK_BITS: Record<string, number> = { broadcast: HACKER.broadcast.bits, crack: HACKER.crack.bits, tamper: HACKER.tamper.bits, down: HACKER.down.bits, ddos: HACKER.ddos.bits };
/** v3.25 해킹마다 필요한 단계. v3.28 VI~X. */
export const HACK_TIER: Record<string, number> = { broadcast: 1, crack: 1, leak: 1, tamper: 2, down: 3, sniff: 4, backdoor: 5, intercept: 6, savescum: 7, botnet: 8, ddos: 9, root: 10 };
/** v3.28 해킹 이름(공지·로그). */
export const HACK_NAMES: Record<string, string> = { broadcast: '방송 탈취', crack: '크래킹', leak: '정보 해킹', tamper: '이벤트 변조', down: '서버 다운', sniff: '패킷 스니핑', backdoor: '백도어', intercept: '패킷 가로채기', savescum: '세이브 스캠', botnet: '봇넷', ddos: 'DDoS', root: '루트 권한', trace: '역추적', overload: '과부하' };

/** v3.25 프로그램: 스킬 대신 메모리 한도 안에서 장착하는 해커의 빌드. 비트로 한 번 사면 영구. */
export type ProgramId = 'portScanner' | 'rootkit' | 'cryptoMiner' | 'exploitKit' | 'avEvasion';
export const PROGRAMS: { id: ProgramId; name: string; desc: string; memory: number; bits: number }[] = [
    { id: 'portScanner', name: '포트 스캐너', desc: '침투 작전 노드마다 시도 +1', memory: 2, bits: 120 },
    { id: 'rootkit', name: '루트킷', desc: '방송 탈취 서명과 해킹 공지에서 이름을 ???로 숨김', memory: 2, bits: 150 },
    { id: 'cryptoMiner', name: '크립토 마이너', desc: '브루트포스 비트 +30%', memory: 3, bits: 200 },
    { id: 'exploitKit', name: '익스플로잇 킷', desc: '서버 다운 지속 +20%', memory: 3, bits: 250 },
    { id: 'avEvasion', name: '백신 회피', desc: '추적당했을 때 회수하는 보상 50% → 75%', memory: 3, bits: 250 },
];
export const programById = (id: string) => PROGRAMS.find(p => p.id === id);

/** 권한 등급 g에서 다음 등급까지 필요한 경험치. */
export const gradeNeed = (grade: number) => Math.round(HACKER.grade.base * Math.max(1, grade) ** HACKER.grade.power);

/** 신원 조작(옛 애드가드) 2단계에서 고를 수 있는 공개 항목. */
export const PRIVACY_FIELDS = ['job', 'level', 'gear', 'skills', 'title', 'guild'] as const;
export type PrivacyField = typeof PRIVACY_FIELDS[number];
export const PRIVACY_LABELS: Record<PrivacyField, string> = { job: '직업', level: '레벨', gear: '장비', skills: '장착 스킬', title: '칭호', guild: '길드' };

/** v3.44 해커 계열 직업(해커·화이트 해커·블랙 해커)은 비밀 직업이라 game/secret/jobs.ts로 옮겼습니다(서버 전용). */

/** v3.47 해커 계열 스킬(신원 조작·방화벽·흔적 지우기)도 비밀 직업의 스킬이라 game/secret/skills.ts로 옮겼습니다(서버 전용). id는 위 상수로 씁니다. */
