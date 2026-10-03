# TIDEBOUND · 심연의 낚시꾼

ChatGPT Sites에서 시작한 프로젝트를 Next.js + Vercel 배포 구조로 옮긴 저장소입니다.

- 구성: React 19 + TypeScript + Next.js + Tailwind CSS, 저장소는 Neon Postgres(배포) / 로컬 파일(개발)
- 출발점: ChatGPT Sites 소스 v32(게임 v20.0), 원본 커밋 `df66490`

## 설치와 실행

Node.js **22.13 이상**, pnpm 11이 필요합니다.

```sh
corepack enable        # package.json의 pnpm 버전을 사용
pnpm install --frozen-lockfile
pnpm dev               # http://localhost:5173
```

로컬 개발은 DB 없이 `.data/dev-db.json` 파일에 계정·세이브를 저장합니다. 처음 접속하면 아이디·비밀번호로 가입하세요.

## 배포 (Vercel)

1. Vercel에서 이 GitHub 저장소를 Import합니다. 프레임워크는 Next.js로 자동 인식됩니다.
2. 프로젝트의 Storage에서 **Neon Postgres**를 추가해 연결합니다. `DATABASE_URL`(또는 `POSTGRES_URL`)이 자동으로 설정됩니다.
3. 환경 변수 `ENABLE_EXPERIMENTAL_COREPACK=1`을 추가해 package.json의 pnpm 버전을 쓰게 합니다.
4. 배포하면 첫 요청 때 필요한 테이블(players · rankings · accounts · sessions)을 자동으로 만듭니다.
5. `vercel.json`에서 `main` 브랜치만 자동 배포하도록 막아 두었습니다. 작업 브랜치의 미리보기 배포가 필요하면 `"**": false` 줄을 지우면 됩니다.

로그인은 아이디(영문 소문자·숫자·밑줄 3~20자)와 비밀번호(8자 이상)입니다. 비밀번호는 PBKDF2-SHA256으로 해시해 저장하고, 세션은 30일 HttpOnly 쿠키입니다.

## 검증

- `pnpm lint`: 린트(경고도 실패로 처리)
- `pnpm test`: 게임 규칙 테스트 (`tests/*.test.mjs`, 순서는 `tests/run.mjs`)
- `node scripts/check-equivalence.mjs`: 같은 상태·난수의 결과 지문 (리팩터링 전후 비교)
- `node scripts/check-balance.mjs`, `check-progression-pace.mjs`, `check-active-routing.mjs`, `check-combat-depth.mjs`: 밸런스 점검
- `node scripts/check-all-rounder.mjs`, `check-expedition.mjs`, `check-recovery.mjs`: 팔방 항해사 · 던전 도달 · 회복률 검증
- `DATABASE_URL=... node scripts/clear-chat.mjs`: 채팅 기록 전부 삭제(베타 전 정리). 로컬은 `TIDEBOUND_DEV_DB` 경로를 씁니다
- 운영 도구 웹 페이지 `/admin`: Vercel 환경 변수 `TIDEBOUND_ADMIN_KEY`(12자 이상)를 넣으면 켜집니다. 낚시꾼 이름·아이디로 찾아 이번 생 초기화를 미리 보기 → 적용. 같은 기능을 Actions 탭 '이번 생 초기화' 워크플로로도 실행할 수 있습니다(시크릿 `DATABASE_URL` 필요).
- `DATABASE_URL=... node scripts/reset-life.mjs <아이디> [--slot 2] [--yes]` 또는 `... reset-life.mjs --name <낚시꾼 이름> [--yes]`: 특정 유저의 이번 생만 처음 상태로(환생 횟수·진주·연구·유물·도감 유지, `--yes` 없이는 미리 보기)
- `DATABASE_URL=... node scripts/reset-data.mjs chat`: 채팅만 초기화. `... reset-data.mjs all --yes`: 계정 포함 전부 초기화(되돌릴 수 없음, `--yes` 없이는 미리 보기)
- `node scripts/e2e-api.mjs <주소>`: 가입·로그인·게임·랭킹 API 흐름
- GitHub Actions: 푸시마다 린트·테스트·빌드·타입 검사·API 흐름을 실행합니다. `screens-request` 브랜치에 푸시하면 화면 스크린샷을 `screenshots` 브랜치에 저장합니다.

## 주요 폴더

| 경로 | 내용 |
| --- | --- |
| `app/` | 페이지, 게임·랭킹·결투 API. 스타일은 `app/styles/*.css`를 `globals.css`가 순서대로 불러옵니다 |
| `components/game/` | 화면별 컴포넌트(`*-panel.tsx`), 전투 화면(`battle-*.tsx`), 공용(`shared.tsx`, `confirm-button.tsx`, `panel-props.ts`) |
| `components/ui/` | 실제로 쓰는 shadcn 부품만(대화창·팝오버·진행 막대·사이드바·표·탭·툴팁과 그 의존 부품). 새 부품은 `components.json` 설정으로 추가합니다 |
| `game/data/` | 물고기·직업·스킬·경제·밸런스 |
| `game/systems/` | 전투·성장·환생·장비·길드 로직. `engine.ts`는 진입점(act), 턴 진행은 `turn.ts`, 적 등장·보상은 `encounter.ts`, 던전 반복은 `dungeon-run.ts` |
| `game/systems/actions/` | 행동 처리기: 항해(voyage) · 빌드(build) · 도감(collection) · 장비(items) · 환생(lifecycle) |
| `game/server/` | 사용자 식별, 서버 저장, 동시 요청 처리 |
| `public/` | 배경 이미지와 아이콘 |
| `tests/`, `scripts/` | 테스트, 점검·내보내기 도구. 공용 로더는 `scripts/lib/game-modules.mjs`, 시뮬레이션 도우미는 `scripts/lib/sim.mjs` |

물고기·낚시터는 `game/data/world.ts`, 직업은 `game/data/classes.ts`, 스킬은 `game/data/skills.ts`, 기본 밸런스는 `game/data/balance.ts`에서 수정합니다. 패치 기록은 `game/data/update-log.ts`에 최근 큰 패치만 남깁니다.
