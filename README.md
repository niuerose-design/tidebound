# 판게아 RPG (구 TIDEBOUND)

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
4. 배포하면 첫 요청 때 필요한 테이블을 자동으로 만듭니다.
5. `vercel.json`에서 `main` 브랜치만 자동 배포하도록 막아 두었습니다. 작업 브랜치의 미리보기 배포가 필요하면 `"**": false` 줄을 지우면 됩니다.

로그인은 아이디(영문 소문자·숫자·밑줄 3~20자)와 비밀번호(8자 이상)입니다. 비밀번호는 PBKDF2-SHA256으로 해시해 저장하고, 세션은 30일 HttpOnly 쿠키입니다.

## 검증

- `pnpm lint`: 린트(경고도 실패로 처리)
- `pnpm test`: 게임 규칙 테스트 (`tests/*.test.mjs`, 순서는 `tests/run.mjs`)
- `pnpm checks` (`-- --fast`로 긴 시뮬레이션 제외, 이름 일부로 골라 실행 가능): `scripts/check-*.mjs` 밸런스 · 성장 · 직업 점검을 한꺼번에
- `node scripts/check-equivalence.mjs`: 같은 상태·난수의 결과 지문 (리팩터링 전후 비교). `check-turn-hash.mjs`: 기준 몸 90가지 × 400턴 세이브 해시 · 턴 시간(엔진 · 능력치 계산 리팩터링 전후 비교)
- `node scripts/audit-rewards.mjs [분]`: 사냥터 · 던전별 시간당 보상 표(판단용, 통과/실패 없음)
- `node scripts/check-research.mjs`: 세계석 연구 효과(연구 0 ↔ 산 단계 ↔ +5단계의 사냥 · 보스 비교, `docs/research-review.md`). 10~20분
- 운영 도구 웹 페이지 `/admin`: Vercel 환경 변수 `TIDEBOUND_ADMIN_KEY`(12자 이상)를 넣으면 켜집니다. 모험가 이름·아이디로 찾아 이번 생 초기화를 미리 보기 → 적용. 같은 기능을 Actions 탭 '이번 생 초기화' 워크플로로도 실행할 수 있습니다(시크릿 `DATABASE_URL` 필요).
- `DATABASE_URL=... node scripts/reset-life.mjs <아이디> [--slot 2] [--yes]` 또는 `... reset-life.mjs --name <모험가 이름> [--yes]`: 특정 유저의 이번 생만 처음 상태로(환생 횟수·세계석·연구·유물·도감 유지, `--yes` 없이는 미리 보기)
- `DATABASE_URL=... node scripts/reset-data.mjs chat`: 채팅만 초기화. `... reset-data.mjs all --yes`: 계정 포함 전부 초기화(되돌릴 수 없음, `--yes` 없이는 미리 보기)
- `node scripts/e2e-api.mjs <주소>`: 가입·로그인·게임·랭킹 API 흐름
- GitHub Actions: `main` 푸시와 PR마다 린트·테스트·빌드(타입 검사 포함)·비밀 유출 검사·API 흐름을 실행합니다. `screens-request` 브랜치에 푸시하면 화면 스크린샷을 `screenshots` 브랜치에 저장합니다.

## 판게아 전기 — 턴제 전술 모드 (`/tactics`)

본편과 별개로 돌아가는 턴제 전술 RPG입니다(설계 입력: `pangaea-srpg-kit` 브리프). 10개 장 · 동료 14명 · 클래스 28종, 캐주얼/클래식 영구 사망 선택, 장당 되감기, 전투 중 새로고침 복구를 갖추고 있으며 기록은 브라우저 `localStorage`에만 저장됩니다(서버 · 본편 세이브와 분리).

| 경로 | 내용 |
| --- | --- |
| `game/srpg/engine/` | 순수 함수 엔진: 난수(`rng.ts`), 지형(`terrain.ts`), 이동 범위(`grid.ts`), 유닛 생성 · 레벨업 · 승급(`unit.ts`), 전투 계산(`combat.ts`), 상태 전이(`battle.ts`), 적 AI(`ai.ts`) |
| `game/srpg/data/` | 클래스 · 아이템 · 유닛 · 장(맵 · 대사 · 이벤트 · 증원)과 적 배치(`chapters/ch01~ch10.ts`) |
| `game/srpg/state/campaign.ts` | 세이브(로스터 · 창고 · 골드 · 클리어 기록)와 베이스 행동(상점 · 장비 · 승급) |
| `components/tactics/` | 제목 · 베이스 · 출격 준비 · 전투 · 결과 화면. 스타일은 `app/styles/tactics.css` |
| `tools/tactics-art/`, `public/art/tactics/` | 블렌더(bpy)로 렌더한 입체 보기 스프라이트(지형 14종 · 클래스 28종 × 편)와 생성 스크립트. 그림이 없으면 캔버스가 절차적으로 그립니다 |
| `tests/tactics.test.mjs` | 엔진 공식 · AI 태세 · 승패 · 캠페인 · 10개 장 자동 플레이(결정론) 테스트 |

화면은 `docs/ui-hig.md`(애플 HIG 기준: 손가락 기기 44pt 터치, 글자 11px 이상, 대비 4.5:1, 키보드 초점, 안전 영역, 화면마다 으뜸 버튼 하나, 되돌릴 수 없는 동작은 확인 창)를 따릅니다.

새 장을 추가하려면 `game/srpg/data/chapters/`에 파일을 만들고 `index.ts`에 등록합니다. `tests/tactics.test.mjs`가 맵 치수 · 경로 · 민가/상자 이벤트 · 적 좌표 · 증원 그룹 대응을 검사합니다.

## 주요 폴더

| 경로 | 내용 |
| --- | --- |
| `app/` | 페이지와 API(게임 · 계정 · 랭킹 · 결투 · 길드 · 제단 · 채팅 · 운영). 스타일은 `app/styles/*.css`를 `globals.css`가 순서대로 불러옵니다 |
| `components/game/` | 화면별 컴포넌트(`*-panel.tsx`), 전투 화면(`battle-*.tsx`), 공용(`shared.tsx`, `confirm-button.tsx`, `panel-props.ts`) |
| `components/ui/` | 실제로 쓰는 shadcn 부품만(대화창·팝오버·진행 막대·사이드바·표·탭·툴팁과 그 의존 부품). 새 부품은 `components.json` 설정으로 추가합니다 |
| `game/data/` | 몬스터·사냥터·직업·스킬·경제·밸런스 |
| `game/systems/` | 전투·성장·환생·장비·길드 로직. `engine.ts`는 진입점(act), 턴 진행은 `turn.ts`, 적 등장·보상은 `encounter.ts`, 던전 반복은 `dungeon-run.ts` |
| `game/systems/actions/` | 행동 처리기: 항해(voyage) · 빌드(build) · 도감(collection) · 장비(items) · 환생(lifecycle) · 던전 상점(dungeon-shop) · 해커(hacker) |
| `game/server/` | 사용자 식별, 서버 저장, 동시 요청 처리 |
| `public/` | 배경 이미지와 아이콘 |
| `tests/`, `scripts/` | 테스트, 점검 · 운영 도구. 공용 로더는 `scripts/lib/game-modules.mjs`, 시뮬레이션 도우미는 `scripts/lib/sim.mjs`, 기준 몸은 `scripts/lib/reference-body.mjs`, 점검용 몸의 세계석 연구 단계는 `scripts/lib/research-budget.mjs`(그 환생까지 벌 수 있는 세계석으로 산 단계) |

몬스터·사냥터는 `game/data/world.ts`, 직업은 `game/data/classes.ts`, 스킬은 `game/data/skills.ts`, 기본 밸런스는 `game/data/balance.ts`에서 수정합니다. 패치 기록은 `game/data/update-log.ts`에 최근 큰 패치만 남깁니다.
