// 자동 생성 파일: node scripts/art-manifest.mjs 가 public/art/{skills,monsters,jobs,onyx,story} 를 훑어 다시 씁니다. 손으로 고치지 마세요.
/** 아이콘 이미지가 있는 스킬 id. 없는 스킬은 기본 아이콘을 씁니다(없는 파일을 요청하지 않음). */
export const SKILL_ART: ReadonlySet<string> = new Set<string>([]);
/** 그림이 있는 몬스터 id → 확장자. 없는 몬스터는 실루엣(없는 파일을 요청하지 않음). */
export const MONSTER_ART: Readonly<Record<string, 'png' | 'webp'>> = {"expNuri":"webp","masteryMimic":"webp"};
/** 그림이 있는 직업 계보 id → 확장자. 없으면 계열 아이콘. */
export const JOB_ART: Readonly<Record<string, 'png' | 'webp'>> = {"apprentice":"webp","bard":"webp","bellTurtle":"webp","bloodAngler":"webp","bossNaturalist":"webp","brawnFisher":"webp","brawnMage":"webp","bulkyFisher":"webp","chantNovice":"webp","currentScholar":"webp","darkFollower":"webp","defense-independent":"webp","fishWhisperer":"webp","fisher":"webp","hacker":"webp","harpoon":"webp","hybrid-independent":"webp","kkamiHunter":"webp","krakenkin":"webp","luckyAngler":"webp","magic-independent":"webp","manaDevotee":"webp","martialArtist":"webp","nerveNeedler":"webp","nimbleAngler":"webp","nuriTracker":"webp","onyxAvatar":"webp","paladin":"webp","physical-independent":"webp","poisoner":"webp","relicScavenger":"webp","restraint":"webp","ronin":"webp","runesmith":"webp","saltWarden":"webp","salvageMerchant":"webp","seagrassKeeper":"webp","shaman":"webp","spellbladeNovice":"webp","squidJester":"webp","staff":"webp","status-independent":"webp","stillAngler":"webp","support-independent":"webp","tidalBrawler":"webp","tide":"webp","tideLancer":"webp","voidcaller":"webp","voyageScribe":"webp","wander":"webp","wanderer":"webp","warden":"webp","zero":"webp"};
/** v3.14 그림이 있는 칠흑 장신구(보스 id) → 확장자. 없으면 SVG 그림. */
export const ONYX_ART: Readonly<Record<string, 'png' | 'webp'>> = {"onyxBlackMage":"png","onyxDunkel":"png","onyxDusk":"png","onyxHilla":"png","onyxLucid":"png","onyxSeren":"png","onyxWill":"png"};
/** v3.216 그림이 있는 스토리 삽화(장 배너 chapter-N · 장면 id) → 확장자. 없으면 장 배너는 SVG, 장면은 그림 없이. */
export const STORY_ART: Readonly<Record<string, 'png' | 'webp'>> = {};
