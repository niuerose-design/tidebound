/**
 * v27.38 메이플 직업 이름(2-1단계), v27.39 남은 직업(2-2단계). 직업·계보 이름을 이 파일 한곳에서 덮어씁니다.
 * id는 그대로라 세이브·숙련·도감 기록이 유지됩니다. 정의 파일(classes.ts·expansion-*.ts)의 name은 옛 이름으로 남아 있어도
 * classes.ts가 JOBS를 다 모은 뒤 applyMapleNames()로 바꿉니다.
 *
 * 규칙: 모험가는 원작의 차수별 이름, 차수별 이름이 없는 직업은 ‘직업 (N차)’, 5차는 ‘4차 이름 (5차)’.
 * 갈라지는 허브 1차(검사·매지션·아처·해적)만 원작 1차 이름을 받고, 나머지 1차는 지금 이름을 유지합니다.
 */
/** 원작에 차수별 이름이 없는 직업: ids는 그 계보의 직업 id. 이름은 ‘직업 (N차)’(N = 직업 차수). */
const BY_TIER: { cls: string; ids: string[] }[] = [
    { cls: '루미너스', ids: ['paladin', 'holyKnight', 'holyCommander', 'lightOcean'] },
    { cls: '카이저', ids: ['bellTurtle', 'bellWarden', 'eonTurtle', 'worldTurtle'] },
    { cls: '데몬슬레이어', ids: ['spellbladeNovice', 'spellblade', 'runeKnight', 'swordSaint', 'celestialBlade'] },
    { cls: '데몬어벤져', ids: ['bloodAngler', 'gashTracker', 'crimsonExecutioner', 'bloodSeaLord', 'crimsonAvatar'] },
    { cls: '플레임위자드', ids: ['apprentice', 'mage', 'archmage', 'sage', 'grandMagus'] },
    { cls: '키네시스', ids: ['chantNovice', 'twinCaster', 'tripleCaster', 'chantMaster', 'thousandChants'] },
    { cls: '일리움', ids: ['currentScholar', 'saltAlchemist', 'brineSavant', 'abyssTransmuter', 'grandAlchemist'] },
    { cls: '에반', ids: ['fishWhisperer', 'pearlBroker', 'abyssArchivist', 'samsaraArchivist', 'aeonChronicler'] },
    { cls: '호영', ids: ['saltWarden', 'stillWarden', 'wardKeeper', 'abyssWarder', 'wardDeity'] },
    { cls: '패스파인더', ids: ['voyageScribe', 'chronicleNavigator', 'starCartographer', 'starNavigator', 'routeDeity'] },
    { cls: '와일드헌터', ids: ['bossNaturalist', 'speciesChronicler', 'titanScholar', 'titanAnatomist', 'beastKing'] },
    { cls: '팬텀', ids: ['squidJester', 'gambler', 'highRoller', 'fateGambler', 'luckDeity'] },
    { cls: '스트라이커', ids: ['tidalBrawler', 'twinAngler', 'surgeFighter', 'tsunamiBrawler', 'oceanFist'] },
    { cls: '은월', ids: ['stormEel'] },
    { cls: '제논', ids: ['wanderer', 'chimera', 'bloodTide', 'abyssHybrid', 'aberrantKing'] },
    { cls: '메카닉', ids: ['runesmith', 'arcArtificer', 'resonanceEngineer', 'resonanceMaster', 'runeCreator'] },
    { cls: '아크', ids: ['brawnMage', 'inverseMage', 'paradoxCaster', 'paradoxSage', 'skyInverter'] },
    { cls: '엔젤릭버스터', ids: ['bard', 'minstrel', 'legendBard', 'balladKing', 'siren'] },
    { cls: '칼리', ids: ['shaman', 'hexer', 'warlock', 'calamityShrine', 'curseQueen'] },
    { cls: '카데나', ids: ['nerveNeedler', 'nerveSeverer', 'silenceWarden', 'stillLord', 'silenceDeity'] },
    // v27.39 2-2단계: 외길 계보
    { cls: '아란', ids: ['brawnFisher', 'mightyStrongman', 'colossus', 'titanArm'] },
    { cls: '블래스터', ids: ['bulkyFisher', 'hulkingBrute', 'mountainBody', 'ironBastion'] },
    { cls: '배틀메이지', ids: ['manaDevotee', 'arcaneSeeker', 'pureMagus', 'archMagus'] },
    { cls: '라라', ids: ['stillAngler', 'meditantAdept', 'voidMind', 'voidSage'] },
];
/** 원작 차수별 이름을 그대로 쓰는 직업(모험가)과 허브 1차. */
const NAMED: Record<string, string> = {
    fisher: '초보자',
    // 허브 1차
    warden: '검사', tide: '매지션', harpoon: '아처', martialArtist: '해적',
    // 히어로 (낭인 1차는 유지)
    swordsman: '파이터', bladeMaster: '크루세이더', knight: '히어로', hero: '히어로 (5차)',
    // 팔라딘
    bulwark: '페이지', brineThorn: '나이트', coralCitadel: '팔라딘', abyssBastion: '팔라딘 (5차)',
    // 다크나이트
    tideLancer: '스피어맨', seaDragoon: '드래곤나이트', stormDragoon: '버서커', abyssDragonLord: '다크나이트', seaDragonGod: '다크나이트 (5차)',
    // 아크메이지(썬,콜)
    tempest: '위자드(썬,콜)', stormScribe: '메이지(썬,콜)', currentLord: '아크메이지(썬,콜)', oceanWill: '아크메이지(썬,콜) (5차)',
    // 아크메이지(불,독) (독술사 1차는 유지)
    venomAssassin: '위자드(불,독)', plagueDoctor: '메이지(불,독)', plagueLord: '아크메이지(불,독)', apostle: '아크메이지(불,독) (5차)',
    // 비숍 (해초 돌봄꾼 1차는 유지)
    reefMedic: '클레릭', tideHealer: '프리스트', tideSaint: '비숍', lifeOcean: '비숍 (5차)',
    // 보우마스터 · 신궁(3차까지)
    whaler: '헌터', krakenSlayer: '레인저', abyssHarpooner: '보우마스터', seaPiercer: '보우마스터 (5차)',
    corsair: '사수', needleDancer: '저격수',
    // 섀도어 (난파선 수집가 1차는 유지)
    rareTracker: '시프', treasureDiver: '시프마스터', treasureKing: '섀도어', seaTreasury: '섀도어 (5차)',
    // 나이트로드 (4차 없이 5차로 이어지는 계보)
    luckyAngler: '로그(나이트로드)', fortunate: '어쌔신', fortuneChild: '허밋', fortuneAvatar: '나이트로드',
    // 듀얼블레이드 (4차 없이 5차로 이어지는 계보)
    nimbleAngler: '세미듀어러', galeDancer: '듀어러', shadowRunner: '듀얼마스터', phantomBlade: '듀얼블레이드',
    // 바이퍼
    fistMaster: '인파이터', fistKing: '버커니어', tideWarGod: '바이퍼', fistSaint: '바이퍼 (5차)',
    // 캡틴 (인양 상인 1차는 유지)
    memoryMerchant: '건슬링거', tradePrince: '발키리', seaTradeKing: '캡틴', goldEmperor: '캡틴 (5차)',
    // ── v27.39 2-2단계 ──
    // 갈래가 시작되는 1차: 원작 1차 이름(갈래)
    ronin: '검사(히어로)', poisoner: '매지션(불,독)', seagrassKeeper: '매지션(비숍)', relicScavenger: '로그(섀도어)', salvageMerchant: '해적(캡틴)',
    // 곁가지: 그 직업의 세계관으로
    oracle: '요정 사제', lunarOracle: '달빛 사제', coralSaint: '요정 대사제', runeSwell: '룬 위자드', tideMender: '마나 조율사',
    echoTamer: '미르 조련사', abyssMimic: '오닉스 드래곤 라이더',
    lineBreaker: '썬더 브레이커', grappler: '브롤러', stormHunter: '크로스보우맨', reefBrawler: '근접 아처',
    clockworkAngler: '태엽 기계공', allRounder: '올라운더',
    inkMime: '트릭스터', wreckDiver: '보물 사냥꾼', harborBroker: '무역상', logbookRunner: '길 안내인', beastTracker: '재규어 추적자', tidalSinger: '아이돌 연습생',
    shoreApothecary: '견습 사제', deepCaretaker: '치유사',
    // 독립 1차: 바다·낚시 단어만 교체
    netWeaver: '그물 사냥꾼', oathAngler: '맹세의 전사', barbSkirmisher: '척후병', wakeRunner: '질주자', sapper: '엔지니어', tideSurveyor: '지도 제작자',
    bubbleMage: '버블 매지션', stillwaterBinder: '봉인술사', driftwoodHermit: '숲의 은둔자', scaleKnight: '견습 기사', lifeTender: '생명지기',
    ambiAngler: '양손 무기 수련생', inkThrower: '표창 투척수',
    // ??? 히든 직업 이름은 v3.44부터 game/secret/jobs.ts(서버 전용)에 있습니다.
};
/** 직업 id → 메이플 이름. 차수(tier)가 있어야 ‘(N차)’를 붙일 수 있어 직업 목록을 받아 만듭니다. */
export function mapleJobNames(jobs: { id: string; tier: number }[]): Record<string, string> {
    const out: Record<string, string> = { ...NAMED };
    const tierOf = new Map(jobs.map(j => [j.id, j.tier]));
    for (const { cls, ids } of BY_TIER) for (const id of ids) {
        const tier = tierOf.get(id);
        if (tier !== undefined) out[id] = `${cls} (${tier}차)`;
    }
    return out;
}
/** 계보 id → 계보 이름. 없는 계보는 원래 이름을 씁니다. */
export const MAPLE_LINEAGE_NAMES: Record<string, string> = {
    harpoon: '아처 계보', tidalBrawler: '스트라이커 계보', ronin: '히어로 계보', martialArtist: '바이퍼 계보',
    tide: '매지션 계보', currentScholar: '일리움 계보', fishWhisperer: '에반 계보', chantNovice: '키네시스 계보', apprentice: '플레임위자드 계보',
    warden: '검사 계보', seagrassKeeper: '비숍 계보',
    poisoner: '아크메이지(불,독) 계보', shaman: '칼리 계보', bloodAngler: '데몬어벤져 계보', nerveNeedler: '카데나 계보',
    fisher: '초보자', wanderer: '제논 계보', spellbladeNovice: '데몬슬레이어 계보', tideLancer: '다크나이트 계보', runesmith: '메카닉 계보',
    squidJester: '팬텀 계보', relicScavenger: '섀도어 계보', salvageMerchant: '캡틴 계보', voyageScribe: '패스파인더 계보', bossNaturalist: '와일드헌터 계보', bard: '엔젤릭버스터 계보',
    paladin: '루미너스 계보', bellTurtle: '카이저 계보', saltWarden: '호영 계보', brawnMage: '아크 계보', luckyAngler: '나이트로드 · 행운 외길', nimbleAngler: '듀얼블레이드 · 기민 외길',
    brawnFisher: '아란 · 근력 외길', bulkyFisher: '블래스터 · 체질 외길', manaDevotee: '배틀메이지 · 지능 외길', stillAngler: '라라 · 정신 외길',
};
