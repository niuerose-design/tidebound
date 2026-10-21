# 판게아 RPG 콘텐츠 생성 키트

몬스터·아이템·스킬·지역·스토리 장면의 고정 텍스트를 Claude로 **대량 생성 → 검수 → 병합**하기 위한 세트입니다.
claude.ai 채팅에 붙여넣어 쓰는 방식과 Claude API로 돌리는 방식 둘 다 지원합니다.

> **이 저장소의 게임에 맞춘 판입니다.** 스키마(`schemas/*.json`)는 `game/data/*.ts`의 실제 타입(MonsterDef · StageDef · DUNGEONS · Item/AffixDef · Skill · StoryScene)을 따르고,
> 게임이 읽지 않는 키트 칸은 `[미사용]`으로 표시해 남겨 두었습니다. 게임 데이터와의 대응·밸런스 공식·운영자 결정이 필요한 항목은 `STYLE_GUIDE.md` 2·6·8·9절에 있습니다.
> 게임 코드는 바꾸지 않았습니다. 이 폴더는 저장소 루트 `pnpm install` 뒤 바로 쓸 수 있습니다(API 호출만 `npm install`이 더 필요).

```
pangaea-content-kit/
├── STYLE_GUIDE.md        ← 세계관·톤·명명·길이 규칙. [ ] 칸을 먼저 채우세요
├── schemas/              ← 타입별 JSON 스키마 (monster, item, skill, area, event)
├── prompts/
│   ├── 00_system.md      ← 공통 시스템 프롬프트
│   ├── 10~50_*.md        ← 타입별 배치 생성 프롬프트
│   ├── 90_qa.md          ← 검수 프롬프트
│   └── 95_expand.md      ← 확정된 항목에서 연관 콘텐츠 파생
├── scripts/kit.mjs       ← 렌더/생성/검증/병합 CLI
├── scripts/export-game-data.mjs ← 게임 데이터(game/data) → data/<type>.json 내보내기
├── examples/             ← 스키마에 맞춘 샘플 (few-shot 예시로도 사용 가능)
└── data/                 ← 확정 데이터 (<type>.json), 원본 응답 (<type>.raw/), 밸런스 참고표(balance-reference.json)
```

## 게임 데이터와의 대응
| 키트 type | 게임 정의 | data/<type>.json 내용(내보내기 기준) |
|---|---|---|
| monster | `world.ts` MONSTERS(+`maple-monsters.ts` 이름, `encounters.ts` 성향, `art.ts` 실루엣) | 81종(일반 48 · 희귀~전설 · 던전 보스 8 · 칠흑 9 · 특별 6) |
| area | `world.ts` BASE_STAGES · HABITAT_META · DUNGEONS | 사냥터 14 + 던전 8 (무리 서식지는 첫 사냥터의 `habitat` 칸) |
| item | `maple-gear.ts` 장비 이름 표 · `gear.ts` AFFIX_POOL · `onyx.ts` ONYX_ITEMS · `economy.ts` RELICS | 장비 이름 42 · 옵션 61 · 칠흑 8 · 유물 4 |
| skill | `skills.ts` SKILLS(+확장 표, `maple-skills.ts` 이름, 서버 전용 `secret/skills.ts`) | 550개(비밀 45개는 tags에 ‘비밀’) |
| event | `story.ts` STORY(모험 일지 장면) — 선택지형 랜덤 이벤트 시스템은 게임에 없음 | 39장면, when 함수는 `trigger` 종류로 환산 |

기존 데이터를 다시 뽑으려면 `node scripts/export-game-data.mjs`(저장소 루트 `pnpm install` 필요). 내보낸 파일을 스키마로 점검: `node scripts/kit.mjs validate monster data/monster.json --fresh`.

## 0. 먼저 할 일
1. `STYLE_GUIDE.md` 9절의 `[확인 필요]` 항목(IP 정책, 다음 세계, 새 지역 자리 등)을 정하고 2·4절의 기본값을 고친다. 2절 세계관과 6절 밸런스는 코드에서 채워져 있습니다.
2. `data/<type>.json`은 게임 데이터에서 내보낸 상태입니다. 게임 데이터가 바뀌면 `node scripts/export-game-data.mjs`로 다시 뽑습니다.

## 1. claude.ai 채팅에서 쓰기 (Max 토큰 소모용)
```bash
node scripts/kit.mjs render monster \
  --var COUNT=6 --var STAGE=saltCoast --var REGION="소금바람 해안" --var LEVEL_RANGE=110~116 \
  --var N_COMMON=3 --var N_RARE=1 --var N_EPIC=1 --var N_LEGENDARY=1 --var N_BOSS=0 \
  --var THEME="조수 간만의 차가 큰 지역. 밀물/썰물에 따라 행동이 바뀌는 몬스터 절반 이상"
```
출력된 SYSTEM + USER를 채팅에 통째로 붙여넣습니다. (Node가 없으면 프롬프트 파일을 열어 `{{변수}}`를 손으로 채워도 됩니다.)
응답 JSON을 `data/monster.raw/batch01.json`으로 저장한 뒤:
```bash
node scripts/kit.mjs validate monster data/monster.raw/batch01.json   # 리포트만
node scripts/kit.mjs qa       monster data/monster.raw/batch01.json   # QA 프롬프트 렌더 → 채팅에 붙여넣기
node scripts/kit.mjs merge    monster data/monster.raw/batch01.patched.json
```

**한 세션에서 토큰을 많이 쓰는 권장 루틴(이 게임의 데이터 구조 기준)**
1. 새 지역 1곳 = 사냥터 2곳 + 던전 1곳 (`area`, COUNT=3, 첫 사냥터에 `habitat`) → 지역 4곳이면 4회
2. 사냥터마다 `95_expand.md`로 몬스터 4~6종(common 3 + 희귀 1~3) + 지역 방문 장면 1개 → 8회
3. 던전 보스 몬스터(boss) 4종 + boss_kill 장면 4개 → `95_expand.md` 4회
4. 직업 하나당 스킬 6~8개(액티브 4 + 패시브 3, 상태이상 → 조건부 추가 피해 쌍 포함) × 직업 수 (`skill`)
5. 옵션 10개 또는 칠흑 장신구(새 지역마다 1개) (`item`, KIND=affix/onyx)
6. 각 배치마다 QA 1회
→ 지역 4곳 기준 사냥터 8 · 던전 4 · 몬스터 40~50 · 장면 12 · 스킬 직업당 7, 왕복 25~30회 정도입니다. 장비 이름은 등급당 1칸뿐이라 대량 생성 대상이 아닙니다(STYLE_GUIDE 9절 Q6).

## 2. API로 자동 실행
```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
# 선택: export PANGAEA_MODEL=claude-sonnet-5-5   (최신 모델 ID는 docs.claude.com 참고)
node scripts/kit.mjs run monster --var COUNT=40 --var TIER=3 ...   # 생성 + 즉시 검증, data/monster.raw/ 에 저장
node scripts/kit.mjs qa  monster data/monster.raw/<file>.json --api # QA 호출 → .qa.json, .patched.json
node scripts/kit.mjs merge monster data/monster.raw/<file>.patched.json
```
배치 하나가 수십 개 항목이면 응답이 길어지므로 `max_tokens`는 16000으로 잡혀 있습니다. 더 큰 배치는 COUNT를 나누세요(40~50개 단위 권장).

## 3. 변수 목록
| 프롬프트 | 필수 변수 |
|---|---|
| monster | COUNT, STAGE(사냥터 id), REGION, LEVEL_RANGE, N_COMMON, N_RARE, N_EPIC, N_LEGENDARY, N_BOSS, THEME |
| item | COUNT, KIND(gear·affix·onyx·relic), RARITY, SET_NAME, N_FLAT, N_PERCENT, N_RULE, BOSS, THEME (kind에 따라 일부만 의미 있음, 나머지는 `-`) |
| skill | COUNT, JOB(직업 id), TIER(차수), LINEAGE, TREE, N_ACTIVE, N_PASSIVE, DAMAGE_TYPES, THEME |
| area | COUNT, REGION, N_STAGE, N_DUNGEON, LEVEL_RANGE, REBIRTH, PREV_AREA, THEME |
| event | COUNT, CHAPTER, TRIGGERS, THEME |
| 95_expand | SEED(확정 항목 JSON), N_MON, N_EVT, N_SKILL |

`EXISTING`은 `data/<type>.json`에서 자동으로 채워집니다(이름·id·태그만). 직접 넘기려면 `--var EXISTING="..."`.
빈 변수는 렌더 시 `[주의]`로 알려주고, `run`은 중단합니다.

## 4. 검증기가 자동으로 잡는 것
- 스키마 위반(필드 누락/추가, enum(profile·shape·effect·trigger.kind…), 길이, id camelCase 패턴)
- 기존 데이터·같은 배치 내 id/이름/첫 문장 중복(몬스터 lore · 스토리 첫 줄 · 옵션 설명 · 패시브 desc 기준. 액티브 desc는 자동 생성이라 제외)
- 이름에 영문, "당신" 사용, 이모지
논리 불일치(lore 묘사 ↔ profile 성향, 상태이상 쌍이 맞지 않는 damageBonusCondition)와 IP 정책(STYLE_GUIDE 4절)은 QA 프롬프트가 담당합니다.
기존 게임 데이터 자체는 이 규칙을 완전히 지키지 않습니다(특별 몬스터 lore 70자, 1자 이름 ‘윌’·‘힐’, 스토리 1곳의 ‘당신’ 등). `validate --fresh`로 보면 그 목록이 나옵니다.

## 5. 게임에 넣을 때
`data/<type>.json`이 최종 산출물입니다. 종류별로 어느 파일에 들어가고 무엇을 함께 고쳐야 하는지는 `STYLE_GUIDE.md` 8절 표를 보세요.
몬스터 능력치·경험치·골드는 레벨 공식이 정하므로 `stats`는 늘 null이고, 희귀 몬스터의 `spawnWeight`는 서버 전용 `game/secret/odds.ts`에 넣습니다.
