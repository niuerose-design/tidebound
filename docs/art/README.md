# 이미지 작업 안내 (몬스터·보스 75 · 직업 계보 48 · 스킬 아이콘 512)

코드는 그림 목록(`game/data/art-manifest.ts`)에 있는 파일만 요청하고, 없으면 실루엣(몬스터)·계열 아이콘(직업)·기본 아이콘(스킬)을 그대로 씁니다. 한 장씩 채워도 됩니다.
파일을 넣거나 지운 뒤에는 꼭 `node scripts/art-manifest.mjs`를 실행해 목록을 다시 만듭니다(v27.57부터 몬스터·직업 그림도 목록 기준).

## 폴더와 파일 이름

| 대상 | 경로 | 파일 이름 | 권장 크기 |
|---|---|---|---|
| 몬스터·보스 | `public/art/monsters/` | `{몬스터 id}.png` 또는 `.webp` (예: `minnow.png`, `magmaKraken.webp`) | 원작 그림 그대로, 또는 512×512 |
| 직업 계보 | `public/art/jobs/` | `{계보 id}.png` 또는 `.webp` | 512×512, 정방형 |
| 스킬 아이콘 | `public/art/skills/` | `{스킬 id}.png`. 목록은 `docs/art/skill-icons.md` | 원작 도트 아이콘 그대로(32×32 등) |
| 스토리 삽화 | `public/art/story/` | 장 배너 `chapter-{0~5}`, 장면 `{장면 id}` (.png/.webp). 프롬프트 · 목록은 `docs/art/story-prompts.md` | 배너 1600×400, 장면 1280×720 |

- 몬스터 id는 `game/data/maple-monsters.ts`(원작 이름과 함께), 직업 계보 id는 `game/data/maple-names.ts`에 있습니다. 대소문자를 그대로 지킵니다.
- 같은 id에 png·webp가 둘 다 있으면 png를 씁니다.
- 직업 그림은 계보 단위(47장)입니다. 같은 계보의 1~5차가 한 그림을 공유합니다.

## 쓰이는 자리

| 화면 | 몬스터 | 직업 |
|---|---|---|
| 자동 사냥 장면 | 적이 나타나면 오른쪽에 112px(보스 140px), 둥실 떠오르는 애니메이션 | — |
| 도감 | 카드 머리 56px | — |
| 던전 웨이브 트랙 | 28px 아이콘 | — |
| 직업 상세 | — | 제목 왼쪽 44px |
| 계보 목록 | — | 이름 앞 30px |

구현: `components/game/art.tsx`의 `MonsterArt`·`JobArt`, 스킬은 `components/game/shared.tsx`의 `SkillIcon`. 그림이 로드되기 전과 실패 시에는 실루엣이 보이고, 로드되면 0.3초에 걸쳐 그림으로 바뀝니다. 미발견 몬스터(도감 `???`)는 그림이 있어도 실루엣만 보입니다.

## 공통 스타일 (모든 프롬프트 앞에 붙임)

영문 프롬프트는 생성기에 그대로 넣습니다. 색: 깊은 청록, 어두운 바다, 따뜻한 등불빛 강조.

**어종·보스**
```
Deep-sea fantasy creature illustration, painterly semi-realistic, dark teal underwater gradient background,
soft bioluminescent rim light, single creature centered and fully in frame, side or three-quarter view,
no text, no watermark, no border, square 1:1
```

**직업 계보**
```
Fantasy fisher character portrait, bust shot, painterly semi-realistic, dark teal palette with warm lantern highlights,
weathered sea gear, calm expression, plain dark background, no text, no watermark, no border, square 1:1
```

보스는 어종 프롬프트 끝에 `, imposing scale, faint golden glow` 를 더합니다. 희귀·영웅·전설 어종은 `, subtle magical particles` 를 더하면 등급감이 납니다.

## 실루엣(폴백) 규칙

어종마다 `game/data/art.ts`의 `MONSTER_SHAPES`에 모양 하나를 적어 둡니다(물고기·비단잉어·가오리·곰치·오징어·게·해파리·상어·복어·해마·아귀·망령·거수). 새 어종을 추가하면 이 표에도 넣어야 하며, 테스트가 빠진 어종을 잡습니다.
