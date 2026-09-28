# TIDEBOUND · 심연의 낚시꾼

ChatGPT Sites에서 시작한 프로젝트를 Next.js + Vercel 배포 구조로 옮긴 저장소입니다.

- 구성: React 19 + TypeScript + Next.js + Tailwind CSS, 저장소는 Neon Postgres(배포) / 로컬 파일(개발)
- 출발점: ChatGPT Sites 소스 v32(게임 v20.0), 원본 커밋 `df66490`. 원본 README는 `docs/README-original-v32.md`, 원본 파일 목록은 `docs/source-provenance.json`

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

로그인은 아이디(영문 소문자·숫자·밑줄 3~20자)와 비밀번호(8자 이상)입니다. 비밀번호는 PBKDF2-SHA256으로 해시해 저장하고, 세션은 30일 HttpOnly 쿠키입니다.

## 검증

- `pnpm test`: 게임 규칙 테스트
- `node scripts/check-equivalence.mjs`: 같은 상태·난수의 결과 지문 (리팩터링 전후 비교)
- `node scripts/check-balance.mjs`, `check-progression-pace.mjs`, `check-active-routing.mjs`, `check-combat-depth.mjs`: 밸런스 점검
- `node scripts/check-all-rounder.mjs`, `check-swarm.mjs`: 만능 항해사 · 무리 사냥 검증
- `node scripts/e2e-api.mjs <주소>`: 가입·로그인·게임·랭킹 API 흐름
- GitHub Actions: 푸시마다 테스트·빌드·타입 검사·API 흐름을 실행합니다. `screens-request` 브랜치에 푸시하면 화면 스크린샷을 `screenshots` 브랜치에 저장합니다.

## 주요 폴더

| 경로 | 내용 |
| --- | --- |
| `app/` | 페이지, 스타일, 게임·랭킹·결투 API |
| `components/game/` | 낚시, 직업, 스킬, 성장, 길드 UI |
| `components/ui/` | 공용 UI 컴포넌트 |
| `game/data/` | 물고기·직업·스킬·경제·밸런스 |
| `game/systems/` | 전투·성장·환생·장비·길드 로직 |
| `game/server/` | 사용자 식별, 서버 저장, 동시 요청 처리 |
| `db/`, `drizzle/` | DB 스키마와 초기 생성 SQL |
| `public/` | 배경 이미지와 아이콘 |
| `tests/`, `scripts/` | 테스트, 콘텐츠 내보내기, 실행 도구 |
| `docs/` | 설계 문서, 원본 README, 내보내기 기록 |
| `build/`, `vendor/` | 개발 플러그인과 라이선스 |
| `.openai/hosting.json` | 원본 프로젝트 ID와 논리 DB 바인딩. 비밀키 아님 |

물고기·낚시터는 `game/data/world.ts`, 직업은 `game/data/classes.ts`, 스킬은 `game/data/skills.ts`, 기본 밸런스는 `game/data/balance.ts`에서 수정합니다. 자세한 편집 지도는 `docs/README-original-v32.md`를 참고하세요. 원본 README에는 과거 밸런스 설명이 남아 있으므로 실제 소스 값이 우선합니다.
