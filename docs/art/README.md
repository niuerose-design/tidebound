# 이미지 작업 안내 (어종·보스 46 · 직업 계보 47)

이미지는 외부 생성기(Midjourney, DALL·E, Stable Diffusion 등)로 만들고 아래 폴더에 넣기만 하면 됩니다.
코드는 파일이 있으면 그림을 쓰고, 없으면 실루엣(어종)·계열 아이콘(직업)을 그대로 남깁니다. 한 장씩 채워도 됩니다.

## 폴더와 파일 이름

| 대상 | 경로 | 파일 이름 | 권장 크기 |
|---|---|---|---|
| 어종·보스 | `public/art/fish/` | `{어종 id}.webp` (예: `minnow.webp`, `magmaKraken.webp`) | 512×512, 정방형 |
| 직업 계보 | `public/art/jobs/` | `{계보 id}.webp` (예: `harpoon.webp`, `brawnFisher.webp`) | 512×512, 정방형 |
| 스킬 아이콘 | `public/art/skills/` | `{스킬 id}.png` (예: `hook.png`). 목록은 `docs/art/skill-icons.md` | 원작 도트 아이콘 그대로(32×32 등) |

- id 목록은 `docs/art/fish-prompts.md`, `docs/art/job-prompts.md` 첫 열입니다. 대소문자를 그대로 지킵니다.
- 형식은 WebP(품질 80 내외, 장당 60KB 이하 권장). PNG를 쓰려면 `game/data/art.ts`의 `fishArtSrc`/`jobArtSrc`에서 확장자만 바꿉니다.
- 직업 그림은 계보 단위(47장)입니다. 직업 259개를 개별로 그리지 않고, 같은 계보의 1~5차가 한 그림을 공유합니다. 나중에 차수별로 늘리고 싶으면 `jobArtSrc`에 직업 id 우선 조회를 더하면 됩니다.

## 쓰이는 자리

| 화면 | 어종 | 직업 |
|---|---|---|
| 자동 낚시 장면 | 적이 나타나면 오른쪽에 112px(보스 140px), 둥실 떠오르는 애니메이션 | — |
| 도감 | 카드 머리 56px | — |
| 던전 웨이브 트랙 | 28px 아이콘 | — |
| 직업 상세 | — | 제목 왼쪽 44px |
| 계보 목록 | — | 이름 앞 30px |

스킬 아이콘은 파일을 넣은 뒤 `node scripts/art-manifest.mjs`를 실행해야 화면에 나옵니다(있는 파일만 요청하도록 목록을 만듭니다). 도트가 흐려지지 않게 그립니다.

구현: `components/game/art.tsx`의 `FishArt`·`JobArt`, 스킬은 `components/game/shared.tsx`의 `SkillIcon`. 이미지가 로드되기 전과 실패 시에는 실루엣이 보이고, 로드되면 0.3초에 걸쳐 그림으로 바뀝니다. 미발견 어종(도감 `???`)은 그림이 있어도 실루엣만 보입니다.

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

어종마다 `game/data/art.ts`의 `FISH_SHAPES`에 모양 하나를 적어 둡니다(물고기·비단잉어·가오리·곰치·오징어·게·해파리·상어·복어·해마·아귀·망령·거수). 새 어종을 추가하면 이 표에도 넣어야 하며, 테스트가 빠진 어종을 잡습니다.
