/**
 * v27.40 메이플 스킬 이름(3단계). 스킬 이름을 이 파일 한곳에서 덮어씁니다.
 * id·효과·수치는 그대로라 세이브·숙련·장착 기록이 유지됩니다. 정의 파일(skills.ts·expansion-*.ts)의 name은 옛 이름으로 남아 있어도
 * skills.ts가 SKILLS를 다 모은 뒤 applyMapleSkillNames()로 바꿉니다.
 *
 * 규칙: 메이플 직업으로 바꾼 계보는 그 직업의 원작 스킬 중 차수·역할(액티브/패시브, 효과)이 맞는 이름을 씁니다.
 * 곁가지·독립·히든은 그 직업의 세계관에 맞추거나 바다·낚시 단어만 바꿉니다. 여기 없는 스킬은 원래 이름을 씁니다.
 */
export const MAPLE_SKILL_NAMES: Record<string, string> = {
    // ── 공용 · 초보자 ──
    hook: '달팽이 세마리', firstAid: '응급처치', breath: '회복',

    // ── 아처 계보: 보우마스터 · 신궁 ──
    pierce: '애로우 블로우', hunt: '아이언 애로우', whaleStrike: '애로우 봄', barb: '크리티컬 샷',
    razor: '스트레이프', drift: '이베이전 부스트', tideUppercut: '샤프 킥', callousedHands: '피지컬 트레이닝',
    krakenBore: '애로우 레인', deepWeakpoint: '샤프 아이즈', needleStep: '스나이핑', afterimage: '아처 마스터리',
    abyssHarpoon: '폭풍의 시', harpoonKingEye: '보우 엑스퍼트', trenchPierce: '퀴버 풀버스트', pierceAura: '어드밴스드 퀴버', abyssalPatience: '어드밴스드 파이널 어택',

    // ── 매지션 계보: 아크메이지(썬,콜) · 요정 사제 ──
    wave: '매직 클로', spring: '마나 리커버리', maelstrom: '썬더 볼트', abyssMind: '스펠 마스터리',
    pearlPrayer: '요정의 기도', soulTide: '요정의 가호', runeCurrent: '룬 볼트', tidalScript: '룬 각인',
    lifeCurrentFlow: '마나 순환', thunderPsalm: '체인 라이트닝', overcast: '엘리멘트 앰플리피케이션',
    moonTide: '달빛 치유', tidalFate: '달의 가호', tidalCollapse: '블리자드', currentDominion: '엘리멘탈 리셋',
    oceanWrath: '썬더 브레이크', willOfSea: '아이스 에이지', tideOfAges: '익스트림 매직',

    // ── 검사 계보: 팔라딘 · 성벽 기사 · 요정 대사제 ──
    anchor: '파워 스트라이크', fortress: '리커버리', crush: '차지 블로우', ironWill: '파워 가드',
    soulShell: '요정의 축복', sanctuaryShell: '엘븐 블레싱', saintTide: '성스러운 가호',
    thornCounter: '블래스트', reefFortress: '실드 마스터리', citadelCrash: '생츄어리', livingReef: '블레싱 아머',
    bastionQuake: '마이티 묠니르', eternalReef: '엘리멘탈 포스', reefOfEons: '어드밴스드 차지',

    // ── 팬텀 계보 · 트릭스터 ──
    focus: '팬텀 인스팅트', inkTrick: '더블 피어싱', loadedHook: '컷 앤 위드', riskDividend: '럭 오브 팬텀시프',
    smokeVeil: '스모크 스크린', slipperyStep: '팬텀 섀도우', allIn: '템페스트 오브 카드', jackpot: '카르트 블랑슈',
    fateRoll: '얼티밋 드라이브', fortuneFavor: '럭 앤 쇼', jackpotStrike: '조커', divineLuck: '럭 오브 데스티니', allOrNothing: '파이널 컷',

    // ── 독립 · 히든 (바다 단어만 교체, 세계관 맞춤) ──
    // v3.170 수련 패시브(계보마다 4개 · 액티브 없음).
    driftwoodGuard: '나무 방벽', temperedSkin: '담금질한 피부', innerBreath: '내공 호흡', herbWard: '약초 방부',
    netWeave: '그물 짜기', axeArm: '도끼 팔', breachTools: '공성 도구', keenEye: '매의 눈',
    insight: '마나 통찰', flow: '마나 순환술', bookwise: '박식', stillMind: '고요한 마음',
    chartedCurrents: '지형 측량', nimbleStep: '가벼운 발', tideAlmanac: '조석 연감', rangeMark: '거리 표식',
    mercenaryCraft: '용병의 요령', patchwork: '덧댄 솜씨', twoHanded: '양손 무기 숙련', fieldRations: '야전 식량',
    bitterBrew: '쓴 달임약', sporePouch: '포자 주머니', inkSplash: '표창 세례', tarredBarbs: '역청 미늘',

    // ── 섀도어 계보 · 보물 사냥꾼 ──
    salvageSense: '픽파킷', relicToss: '메소 익스플로전', swarmSense: '무리 감지', rareSense: '메소 마스터리',
    anchorSwing: '보물 강탈', pressureSuit: '보물 사냥꾼의 감', spoilsStrike: '새비지 블로우', deepSalvage: '메소 가드',
    treasureStrike: '암살', kingsHoard: '섀도우 파트너', hoardCrush: '소닉 블로우', legendHoard: '메소 익스플로전 강화',

    // ── 제논 계보 · 태엽 기계공 · 올라운더 ──
    precision: '서플러스 서플라이', vitalSurge: '핀포인트 로켓', adaptiveCore: '하이브리드 로직', windupCast: '태엽 사출', springLoaded: '감긴 태엽',
    harmonicWeight: '올라운드 밸런스', redWake: '퍼지롭 매스커레이드', bloodEngine: '듀얼 브리드 디펜시브', lifeTorrent: '홀로그램 그래피티', hybridCore: '멀티래터럴',
    aberrantSurge: '메가 스매셔', aberrantBody: '하이브리드 디펜시브',

    // ── 루미너스 계보 ──
    oath: '플래시 샤워', balance: '라이트 블레싱', vowStrike: '라이트 리플렉션', twoSeasOath: '이퀄리브리엄',
    lightHarpoon: '아포칼립스', sanctifiedSea: '다크 크레센도', seaOfLightDescent: '진리의 문', oceanOfLight: '리버레이션 오브',

    // ── 제로 계보 ──

    // ── 캡틴 계보 · 무역상 ──
    salvageContract: '해적의 계약', coinToss: '더블 파이어', goldMemory: '건 마스터리', hagglingHook: '흥정 갈고리', portLedger: '무역 장부',
    ledgerStrike: '래피드 파이어', coinBarrage: '헤드 샷', tradeWind: '캡틴 디그니티', goldenTempest: '배틀쉽 봄버', tradeEmpire: '언위어링 넥타르',
    goldenStorm: '불릿 파티', goldenEmpire: '캡틴의 위엄',

    // ── 아델 계보 · 허공 방랑자 ──

    // ── 스트라이커 계보 · 썬더 브레이커 ──
    wakeFist: '질풍', anchorBreak: '벽력 돌파', roughLine: '라이트닝 매듭', twinHook: '선풍', surgeCombo: '벽력', flowingFists: '연속 공격',
    tsunamiRush: '태풍', stormBody: '뇌성', oceanCombo: '교룡연격', endlessCombo: '해신강림',

    // ── 은월 계보 ──
    electricBite: '귀참', galvanicScales: '여우령', tentacleBarrage: '폭류권',

    // ── 일리움 계보 · 크리스탈 연성사 ──
    rippleGlyph: '크래프트: 자벨린', currentNotes: '라이트 오브 레프', saltCatalyst: '크래프트: 오브', volatileFormula: '리액션: 디스트럭션',
    corrosiveBloom: '크래프트: 롱기누스', philosopherSalt: '소울 오브 크리스탈',
    transmute: '크리스탈 스킬: 데우스', philosopherBrine: '글로리 윙', grandTransmutation: '그라비티 코어', elixirOfDepth: '롱기누스 존',

    // ── 비숍 계보 · 견습 사제 · 치유사 ──
    greenTide: '힐', reefPulse: '홀리 애로우', symbioticCoral: '블레스', kelpPoultice: '약초 찜질', tidepoolTonic: '강장제',
    tidalRenewal: '샤이닝 레이', deepCurrentBalm: '홀리 심볼', abyssalMend: '봉합술', stillWaterVigil: '간병',
    tidalBlessing: '엔젤레이', saintWater: '홀리 워터', oceanOfLife: '피스메이커', endlessTide: '홀리 파운틴',

    // ── 카이저 계보 ──
    bellCrash: '기가 슬래셔', shellEcho: '리게인 스트렝스', greatBellToll: '윙 비트', ancientShell: '언브레이커블 윌',
    tidalToll: '인퍼널 브레스', eonShell: '드래곤 스케일', worldBearerSlam: '파이널 피규레이션', earthShell: '노바 템퍼런스', eonSlumber: '드래곤 블레이즈',

    // ── 에반 계보 · 미르 조련사 · 오닉스 드래곤 라이더 ──
    fishWhisper: '드래곤 소울', pearlLedger: '마법 잔해', echoReview: '미르와의 교감', sovereignSilence: '드래곤 브레스',
    memoryOfTides: '드래곤 링크', abyssObservation: '오닉스의 의지', borrowedTentacles: '드래곤 다이브',
    pastLifeEcho: '서클 오브 썬더', karmaRecord: '오닉스의 축복', aeonRecall: '조디악 레이', aeonLedger: '드래곤 마스터', aeonsInsight: '엘리멘탈 블래스트',

    // ── 패스파인더 계보 · 길 안내인 ──
    voyageReview: '에인션트 아처리', chronicleStudy: '렐릭 차지', dispatchDash: '길 안내 질주', swiftQuill: '빠른 발걸음',
    constellationBolt: '카디널 디스차지', starLog: '에인션트 가디언', starBolt: '트리플 임팩트', starChart: '에디셔널 디스차지',
    galaxyFall: '레이븐 템페스트', cosmicChart: '렐릭 언바운드',

    // ── 와일드헌터 계보 · 재규어 추적자 ──
    titanFieldNotes: '재규어 링크', serpentFolklore: '와일드 인스팅트', trackersSpear: '재규어 클로', huntersPatience: '사냥꾼의 인내',
    sigilShock: '서먼 재규어', weakpointThesis: '와일드 발칸', titanAnatomy: '크로스보우 엑스퍼트', weakpointCut: '소닉 붐',
    titanLore: '익스텐디드 매거진', titanFell: '재규어 스톰', apexLore: '와일드 발칸 Type X',

    // ── 히어로 계보 ──
    iaiDraw: '슬래시 블러스트', roninGrit: '전사의 기백', crossSlash: '브랜디쉬', swordForm: '콤보 어택',
    flashCut: '레이징 블로우', edgeSense: '인레이지', lanceCharge: '패닉', knightVow: '발할라',
    braveSlash: '소드 오브 버닝 소울', heroSoul: '레이지 업라이징',

    // ── 바이퍼 계보 · 브롤러 ──
    palmStrike: '서머솔트 킥', ironBody: '해적의 혼', comboFist: '플래시 피스트', qiFlow: '에너지 차지',
    jointLock: '관절 꺾기', grappleStance: '그래플링', skyBreaker: '백스핀 블로우', quakeStep: '드래곤 스트라이크', kingAura: '피스트 인레이지',
    heavenPalm: '데몬 스트라이크', unshakable: '바이퍼 비트', limitlessFist: '하울링 피스트', fistSaintAura: '드래곤의 기세',

    // ── 키네시스 계보 ──
    twinSpark: '싸이킥 포스', emberVerse: '싸이킥 스매싱', frostLance: '싸이킥 그랩', chantFocus: '싸이킥 쉴드',
    voidRay: '얼티메이트-트레인', chantReservoir: '싸이킥 드레인', stormChant: '얼티메이트-딥 임팩트', masterCadence: '마인드 브레이크',
    infiniteChant: '싸이킥 토네이도', endlessVerse: '얼티메이트-무빙 매터',

    // ── 플레임위자드 계보 ──
    manaBolt: '오비탈 플레임', arcaneStudy: '엘리멘트: 플레임', fireball: '플레임 디스차지', spellFocus: '번 앤 레스트',
    meteor: '블레이징 익스팅션', arcanePierce: '이그니션', starfall: '피닉스 드라이브', sageWisdom: '플레임 엘리멘트',
    genesis: '인피니티 플레임 서클', magusDomain: '블레이징 오비탈 플레임',

    // ── 데몬슬레이어 계보 ──
    runeEdge: '데몬 슬래시', dualTraining: '데몬 블러드', arcSlash: '데몬 트레이스', bladeChannel: '데빌 크라이',
    runeBurst: '데몬 임팩트', runeArmor: '메탈 아머', twinMoon: '서버러스', saintEdge: '블루 블러드',
    heavenSplit: '데몬 베인', celestialAura: '데몬 어웨이크닝',

    // ── 미하일 계보 ──
    // ── 아크메이지(불,독) 계보 ──
    venomDart: '포이즌 브레스', toxinLore: '매직 마스터리', toxicFang: '파이어 애로우', lethalDose: '스펠 마스터리(불,독)',
    miasma: '포이즌 미스트', plagueVessel: '이그나이트', rotBloom: '미스트 이럽션', pestilence: '익스트림 매직(불,독)',
    doomMark: '포이즌 노바', endOfAll: '도트 퍼니셔',

    // ── 칼리 계보 · 부두 인형사 ──
    curseBolt: '보이드 러시', spiritWard: '헥스 가드', hexChain: '아츠: 크레센텀', malice: '헥스 마스터리',
    pinDoll: '바늘 인형', effigyThread: '인형의 실', soulRend: '헥스: 판데모니움', sealHex: '아츠: 플러리', darkPact: '어둠의 계약',
    calamityRite: '헥스: 차크람 스플릿', omenVeil: '보이드 블리츠', doomCurse: '보이드 버스트', queenOfCurses: '헥스의 여왕',

    // ── 엔젤릭버스터 계보 · 아이돌 연습생 ──
    tempoSong: '트리니티', lullaby: '어피니티', roadSong: '드림 셰이크', discord: '소울 시커', encore: '앙코르',
    sirenChorus: '스포트라이트', harmonics: '화음', courtSerenade: '프리티 엑살테이션', tideHarmony: '팬 서비스',
    epicBallad: '슈퍼노바', legendAura: '소울 익절트', heroicVerse: '영웅의 노래', tideAnthem: '피니투라 페투치아',
    anthemAura: '노바 워리어', oceanOde: '엔젤의 축가', sirenSong: '그랜드 피날레', sirenVoice: '트리니티 퓨전', sirenAria: '엔젤릭 아리아',

    // ── 데몬어벤져 계보 · 혈무사 ──
    gashHook: '엑시드 블레이드', bloodScent: '블러드 컨트랙트', openVein: '문라이트 슬래시', trailOfRed: '디버스 블러드',
    redWaltz: '블러드 왈츠', quickCuts: '잔 베기', crimsonVerdict: '엑시드: 엑스큐션', hemorrhage: '오버휄밍 파워',
    crimsonTide: '실드 체이싱', bloodFrenzy: '포비든 컨트랙트', redApocalypse: '디멘션 소드', endlessBleed: '데몬 프렌지',

    // ── 카데나 계보 · 빙결 결박사 ──
    numbNeedle: '체인아츠: 스트로크', pressurePoints: '웨폰 버라이어티', severNerve: '체인아츠: 크러시', stillHands: '체인아츠: 터프',
    rimeShackle: '서리 족쇄', frostMist: '서리 안개', deadCalm: '서먼 커팅 시미터', numbingAura: '체인아츠: 인게이지',
    stillVerdict: '체인아츠: 테이크다운', stillAura: '웨폰 버라이어티 피니시', worldStill: '체인아츠: 메일스트롬', absoluteStill: '미스틱 스톰',

    // ── 다크나이트 계보 ──
    currentThrust: '스피어 스윕', lancerPoise: '웨폰 마스터리', dragonDive: '드래곤 버스터', wyrmScale: '하이퍼 바디',
    thunderLance: '드래곤 퓨리', stormRider: '크로스 오버 체인', leviathanCharge: '비홀더 임팩트', dragonKingAura: '비홀더',
    dragonGodSpear: '궁그닐 디센트', dragonGodScale: '다크니스 오라',

    // ── 메카닉 계보 · 캐논슈터 ──
    runeHammer: '플레임 런처', forgeRune: '메탈아머: 휴먼', plateSurge: '호밍 미사일', arcaneArmor: '메카닉 마스터리',
    resonantCannon: '마그네틱 필드', tunedFrame: '로봇 마스터리',
    resonanceBurst: '로봇 런처: RM7', harmonicPlate: '메탈아머 익스트림', genesisRune: '메탈아머 전탄발사', creatorRune: '멀티플 옵션',

    // ── 호영 계보 ──
    saltWard: '귀화부', brinedSkin: '선기: 천지인 환영', stillRipple: '금고봉', stillArmor: '선기: 극대 분신난무',
    wardBurst: '지진쇄', layeredWard: '선기: 강림 괴력난신', abyssWardArray: '산령소환', deepWard: '부적 도술',
    divineWard: '선기: 분신 둔갑 태을선인', wardOfGods: '선기: 천지인', millenniumWard: '천년 결계',

    // ── 아크 계보 · 주먹 마도사 ──
    brawnWave: '스펠 불릿', muscleMana: '컨택트 커스', refluxBurst: '플레인 차지드라이브', invertedCircuit: '스칼렛 차지드라이브',
    paradoxRupture: '거스트 차지드라이브', paradoxHeart: '어비스 차지드라이브',
    heavenEarthInversion: '그립 오브 애거니', reverseTide: '끝없는 악몽', worldInversion: '인피니티 스펠', skyInverterAura: '데빌 오브 스칼렛',

    // ── 외길 계보: 아란 · 듀얼블레이드 · 배틀메이지 · 블래스터 · 라라 · 나이트로드 ──
    logSwing: '스매시 스윙', roughHands: '폴암 마스터리', boulderToss: '파이널 블로우', strongmanGrip: '아드레날린 부스트',
    mountainCleave: '비욘더', giantsArm: '하이 디펜스',
    rapidJab: '터닝 드라이브', quickHands: '카타라 마스터리', galeTriple: '토네이도 스핀', windStep: '플래시 점프',
    afterimageFlurry: '블레이드 퓨리', shadowPace: '미러 이미징',
    pureBolt: '트리플 블로우', manaFocus: '스태프 마스터리', manaRupture: '다크 체인', arcaneVein: '오라: 블루',
    manaDetonation: '피니싱 블로우', pureCore: '다크 제네시스',
    bodySlam: '매그넘 펀치', thickBuild: '건틀렛 마스터리', massiveCharge: '더블 팡', wallOfFlesh: '실린더 버스트',
    landslide: '해머 스매시', mountainHeart: '버닝 브레이커',
    mindWave: '정기 뿌리기', calmMind: '자연의 벗', manaTide: '분출', deepMeditation: '용맥 흡수',
    voidTorrent: '산 꼬마의 놀이', emptyMind: '큰 기지개',
    luckyBreak: '럭키 세븐', luckyStreak: '헤이스트', heavenlyStrike: '어벤져', blessedHand: '크리티컬 스로우',
    fateReversal: '트리플 스로우', fatesFavor: '마크 오브 어쌔신', heavenlyDice: '쿼드러플 스로우', avatarsLuck: '스로잉 엑스퍼트',
};
