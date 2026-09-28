# TIDEBOUND · 심연의 낚시꾼 — 원본 소스

Sites 원본 저장소에서 확보한 **편집 가능한 전체 프로젝트**입니다. 배포 JavaScript를 역변환한 복원본이 아닙니다.

- 사이트: https://tidebound-idle.niuerose.chatgpt.site/
- Sites 소스 버전: **32** (게임 패치 버전 20.0과는 별도 번호)
- 프로젝트: `appgprj_6ab89b25a2d88191b10f8d81d549465e`
- 원본 커밋: `df664907379ab980754393400bd23b44ab1324ad`
- 확인일: 2026-09-29 (한국 시간)
- 구성: React 19 + TypeScript + Vinext/Vite + Tailwind CSS + Cloudflare Workers/D1

## 설치와 실행

Node.js **22.13 이상**이 필요합니다. Windows Node 24.15.0에서 검증했습니다. 압축을 풀고 `package.json`이 있는 폴더에서 실행하세요.

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm build
pnpm db:local
pnpm dev
```

**http://localhost:5173/** 를 여세요. 이 환경에서는 `127.0.0.1` 대신 `localhost`로 접속해야 했습니다. 종료는 Ctrl+C입니다.

`pnpm db:local`은 **비어 있는 로컬 DB의 최초 생성 때 한 번만** 실행합니다. 기존 테이블이 있으면 오류가 나며, 초기화 명령은 아닙니다. 이후 실행은 `pnpm dev`만 하면 됩니다. 수정한 소스는 개발 서버에 반영됩니다. 정적 HTML만 열거나 업로드하는 방식으로는 API와 저장 기능이 실행되지 않습니다.

설치에는 인터넷이 필요합니다. 버전 재현을 위해 `pnpm-lock.yaml`을 유지하세요. 검증 환경의 pnpm 11.19.0에서 고정 잠금 파일 설치가 성공했고, 프로젝트 선언 버전은 11.25.0입니다. ChatGPT/Cloudflare 로그인이나 비밀키 없이 로컬 개발 모드로 플레이할 수 있습니다.

세이브는 `.wrangler/state`에 저장됩니다. 개발 모드 기본 사용자는 `local-preview-player`이며, 로컬 모의 로그인을 사용하면 다른 테스트 사용자로 전환될 수 있습니다. ZIP에 로컬 세이브는 포함하지 않았습니다.

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

## 검증 결과

- 고정 잠금 파일 설치, `pnpm build`, TypeScript 검사 성공.
- 로컬 DB 생성 성공. 홈 페이지와 랭킹 API HTTP 200 확인.
- 게임 API의 새 상태 생성, 시작, 다음 요청에서 상태 유지, 중지 확인.
- 전체 게임 진행과 모든 화면의 시각적 동작은 검증하지 않았습니다.
- `pnpm test`는 기존 테스트 2번째 항목에서 실패합니다. 현재 소스의 오프라인 한도는 24시간(`86400`초), 턴 간격은 2초이므로 실제 `turn`은 `43200`인데, 테스트에는 과거 2시간 기준 `3600`이 남아 있습니다. 첫 항목은 통과했고 이후 항목은 중단되어 미검증입니다. 게임 규칙이나 테스트 기대값은 변경하지 않았습니다.

## 범위와 한계

원본을 확보했으므로 난독화 해제에 따른 복원 손실은 없습니다. **운영 DB의 기존 세이브·랭킹, 계정 정보, 운영 환경변수, 인증 세션은 포함하지 않습니다.** 로컬에서는 새 게임으로 시작합니다.

`pnpm start`는 원본의 프로덕션 Worker 실행 명령입니다. 프로덕션 빌드는 개발용 사용자 우회를 허용하지 않으므로 로컬 플레이에는 `pnpm dev`를 사용하세요. 외부 호스팅에는 D1 바인딩 또는 대체 DB 어댑터와 신뢰 가능한 인증 계층이 필요합니다. 일반 인터넷 요청의 사용자 헤더를 그대로 신뢰해서는 안 됩니다. 이번 내보내기는 운영 사이트를 수정하거나 재배포하지 않았습니다.

## 원본 대비 변경

게임 코드·자산·잠금 파일은 원본 그대로 유지했습니다.

1. README를 이 안내로 교체하고 원문은 `docs/README-original-v32.md`에 보존했습니다.
2. `package.json`에 `test`, `db:local` 명령을 추가했습니다.
3. `scripts/local-db.mjs`를 추가했습니다. SQL을 로컬 D1에만 적용합니다.
4. `tests/run.mjs`의 동적 import에 `pathToFileURL()`을 적용해 Windows 경로를 지원했습니다. 테스트 논리·기대값은 그대로입니다.
5. `docs/source-provenance.json`에 원본 커밋·파일 목록, `docs/export-changes.patch`에 추적 파일 변경 내역을 기록했습니다.

인증 토큰·쿠키·비밀키, `.git`, `.env*`, `node_modules`, 빌드 산출물, 도구 캐시, 로컬 DB는 ZIP에서 제외했습니다. 기존 타사 라이선스 파일은 보존했습니다.
