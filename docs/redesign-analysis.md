# 프론트엔드 재설계 1단계 — 분석 보고

> 브리프: `PANGAEA_FRONTEND_REDESIGN_BRIEF.md`(업로드). 이 문서는 **코드를 읽고 로컬에서 잰 값**으로 0절 Q1~Q10에 답하고, 서버 CPU 원인 순위 · 화면 목록 · 세이브 포맷 · 브리프 기본값 중 안 맞는 것을 적습니다.
> 작성 2026-10-21, 기준 코드 v3.370(`main` `7a2f713`). 코드 수정 없음. 함께 만든 산출물: `docs/save-v1.schema.json`.
> 표시: **[확인]** 코드에서 확인 · **[측정]** 로컬 Node/서버에서 잰 값 · **[추정]** 근거는 있으나 운영 데이터로 확인하지 않음.

---

## 0. 요약 (먼저 읽을 것)

1. **틱(자동 사냥)은 서버가 계산합니다.** 클라이언트는 5초마다 `POST /api/game {type:'sync'}`를 보내고, 서버가 `mutate()` 안에서 지난 동기화 이후 흐른 시간을 2초 = 1턴으로 돌린 뒤(`advance()`), 세이브 전체(JSON ~31~61KB)를 돌려줍니다. **[확인]** 브리프 4·5절의 "서버가 틱을 계산하고 있었다면" 가지가 맞습니다.
2. Vercel Active CPU는 두 몫으로 나뉩니다. **(a) 턴 시뮬레이션**: 접속 중이든 아니든 게임 시간 2초마다 1턴을 서버가 돌리므로 "모험가 수 × 게임 시간 × 턴당 1.3~3.4ms"이며 **폴링 간격과 무관**합니다(약 50~65% **[추정]**). **(b) 요청 고정 비용**: 5초 폴링마다 세이브 풀기 · 파싱 · 마이그레이션 · 직렬화 2회 · gzip · 응답 4.5ms + 플랫폼 오버헤드(약 35~50%). 운영 측정(2026-10, `docs/performance.md` 6단계)은 모험가 4명이 하루 41분 ≈ 월 20시간. 따라서 **폴링 제거 · 저장 디바운스(B안)만으로는 (b)만 줄어 35~50% 절감**이고, (a)까지 없애려면 브리프대로 계산을 클라이언트로 옮겨야(A안) 하는데 그러면 3번 문제가 생깁니다. 두 가지를 잇는 C안(결정론 엔진 + 클라이언트 계산 + 서버 표본 검증)을 6절에 적었습니다.
3. **브리프의 "서버는 저장과 인증만"은 이 게임의 두 가지 설계와 정면으로 충돌합니다.** (a) 정보 비공개(v3.43~): 드롭 확률 · 비밀 직업 · 문 조건이 `game/secret/*`(server-only)에 있고 화면은 카탈로그만 받습니다. (b) 공유 세계: 제단 · 길드 · 합동 작전(crew) · 해킹(다른 모험가의 사냥터를 다운시킴) · 원정대 고스트 · 결투 · 랭킹이 **서버가 믿는 세이브**를 전제로 합니다. 클라이언트가 세이브를 만들어 올리면 이 전부가 조작 가능해집니다. 6절에 대안(서버 권위 유지 + 폴링 제거 + 클라이언트 예측 렌더)을 적었습니다.
4. 세이브 포맷은 이미 버전 필드(`version: 8`)와 마이그레이션(`game/systems/migrations.ts`, 526줄)이 있습니다. 다만 버전 번호는 거의 올리지 않고 **"플래그 · 존재 여부 검사"로 멱등 보정**하는 방식이라 브리프의 "순수 함수 배열 v1→v2→…" 체계로 바꾸는 것은 정비이지 신설이 아닙니다. 현재 포맷의 스키마는 `docs/save-v1.schema.json`(최상위 키 96개, 필수 82개)입니다.
5. 콘텐츠는 TS 상수(`game/data/*.ts`, 총 1,113줄 타입 + 수십 파일)이고 참조는 전부 **id 문자열**입니다. 레지스트리 전환 비용은 낮습니다. 콘텐츠 키트(`tools/content-kit`)의 JSON과 스키마가 이미 게임 타입에 맞춰져 있어 7절의 출발점이 됩니다.

---

## 1. Q1~Q10 답

| # | 질문 | 답 |
|---|---|---|
| Q1 | 세이브 저장 위치 | **[확인]** 서버 DB. `game/server/db.ts`: `DATABASE_URL`/`POSTGRES_URL`이 있으면 **Neon Postgres HTTP 쿼리 엔드포인트**(`neonStorage`, 쿼리 하나 = HTTPS 요청 하나), 없으면 로컬 JSON 파일(`TIDEBOUND_DEV_DB`, 기본 `.data/dev-db.json`). 운영은 Neon **[추정: 환경 변수는 못 봄]**. 테이블 `players(id, state(JSON 문자열, gzip·base64 `pack.ts`), revision, updated_at)` + `rankings` · `accounts` · `sessions` · `settings` 등. 세이브 쓰기는 `UPDATE … WHERE revision=$n`(낙관적 잠금, `store.ts:105`). 같은 인스턴스에서 90초 · 300건 `rememberRecent` 캐시(`store.ts:78`)로 연속 요청은 DB 읽기를 건너뜁니다. 클라이언트에는 세이브를 저장하지 않습니다(localStorage는 화면 설정만). |
| Q2 | 로그인 | **[확인]** 자체 구현 쿠키 세션. `POST /api/auth {action: signup\|login\|logout\|slot}` → `accounts(pass_hash, salt)`(`game/server/auth.ts` `hashPassword`), 세션 토큰 64자 → 쿠키 `tb_session`(+ 캐릭터 슬롯 쿠키 `tb_slot`). 외부 인증 없음. 가입 · 로그인은 IP 기준 속도 제한(`throttle.ts`). CSRF는 `checkOrigin`(Origin 헤더가 있으면 같은 origin만, `store.ts:69`). |
| Q3 | 틱 계산 위치 | **[확인] 서버.** `app/api/game/route.ts` → `mutate(id, a, …)`(`store.ts:86`) → 세이브 읽기 → `migrateState` → **`advance(s, now)`(`game/systems/turn.ts:168`)** → 행동 핸들러 → 저장 → 응답. `advance`는 `elapsed / turnMs(2000)` 턴을 돌리되 요청 하나에 `CATCH_UP_CHUNK=1500`턴까지(남은 턴은 `catchUpLeft`로 다음 동기화가 이어 돌림), 부재중 정산 상한 `offlineCapSeconds` 6시간 + 연구 '긴 휴식' 단계당 +6시간(최대 3단계 = 24시간). 40분 넘는 부재는 **표본 환산**(`offline-sample.ts`: 워밍업 300턴 + 측정 900턴만 실제로 돌리고 나머지는 비례). 클라이언트는 결과를 **재생**만 합니다(`REPLAY_LAG_MS`로 턴을 늦게 보여 줌). |
| Q4 | 서버에서 가장 자주 · 오래 도는 것 | 2절 표. 1위 `POST /api/game sync`(모험가당 5초마다, 전투를 보지 않으면 15초, 대기 60초). 요청 하나 = 고정 4.5ms + 턴당 1~5ms **[측정 · performance.md]**. 2위 부재중 정산(6시간 = 0.7~4초/요청). 3위 공유 정보 폴링(채팅 · 제단 · 소식 · 시세)과 그 DB 왕복. |
| Q5 | 게임 상태 위치 · 갱신 | **[확인]** React 안. `components/game/use-game.ts`의 `useState<State>` + `stateRef`. 서버 응답의 `state`로 **통째로 교체**(로그는 `logDelta`로 이어 붙임). 전역 스토어 · Context 없음. `GameShell`이 `s`를 모든 패널에 prop으로 내려 보내므로 5초마다 열린 화면 전체가 다시 그려지고, 무거운 화면은 `useMemo` · WeakMap 캐시(`performance.md` 3·8단계)로 계산만 아낍니다. 상세는 3절. |
| Q6 | 콘텐츠 형태 · 참조 | **[확인]** TS 상수 모듈. 몬스터 · 사냥터 · 던전 `game/data/world.ts`, 직업 · 계보 `classes.ts`(+ `expansion-*.ts`가 `JOBS.push`), 스킬 `skills.ts`(+ 확장 push), 장비 옵션 `gear.ts`, 유물 `economy.ts`, 칠흑 `onyx.ts`, 스토리 `story.ts`. **참조는 전부 id 문자열**(`stage.monsters: string[]`, `skill.job: string`, `job.parent: string`, 세이브의 `book[id]` · `skills[id]`). 모듈 로드 때 후처리(원작 이름 덮어쓰기 `maple-*.ts`, `finishJobs`, `applyCoreRework`, 비밀 표 `game/secret/register.ts`가 서버에서만 더함). 콘텐츠 키트(`tools/content-kit/data/*.json`)는 이 표를 내보낸 사본이며 아직 역방향(JSON → 게임)은 없습니다. |
| Q7 | 오프라인 진행 | **[확인]** 있음. 서버 `advance()`가 처리(Q3). 상한 6시간(+연구 최대 18시간), 1시간 넘게 비우면 '부재중 보정'(이벤트 배율 절반, 특별 몬스터 `offlineScale`), 40분 넘으면 표본 환산. 결과는 `s.lastOffline`로 요약 카드. **결정론적 재계산은 지금 불가**: 난수가 `Math.random`(`mutate`가 rng 미지정)이고 서버 시각 · 서버 이벤트 · 닫힘 목록(`closuresSnapshot`) · 해킹 다운이 섞입니다. 테스트 하네스만 시드 난수를 씁니다. |
| Q8 | 세이브 버전 · 과거 버전 읽기 | **[확인]** `version: SAVE_VERSION = 8`(`game/data/balance.ts:4`). `migrateState()`(`migrations.ts:370`)가 **매 요청** 세이브 읽기 직후 실행되며, 버전 번호 비교보다 "키가 있으면 지움 · 플래그가 없으면 보정 후 플래그 기록"(예 `kopruluStagesShifted`, `masteryRescaled`) 식 멱등 보정 수십 개입니다. 과거 세이브 픽스처 테스트는 없고(테스트는 `newState`에서 시작), 비용은 0.6ms/요청 **[측정]**. |
| Q9 | 화면 목록 · 상태 의존도 | 3절. 한 페이지(`app/page.tsx`) 안의 메뉴 16개 → 화면 27개 + 겹침 화면 10여 개, URL 없음(메뉴는 메모리 `view` 상태, 뒤로가기는 앱을 떠남). `s` 전체를 받는 컴포넌트 83개. |
| Q10 | 모바일 비중 · 반응형 | 비중 **[미확인]**: 분석 도구 없음(`@vercel/analytics` · gtag 없음). 반응형은 CSS 미디어 쿼리(767 · 1080 · 1250 · 1600px, `app/styles/responsive.css` 등 11개 CSS 파일 6,6xx줄)로 처리하고, 767px 이하는 하단 탭 바 5개 + 사이드바 Sheet. v3.364~3.370에서 390 · 360px 전 화면 점검과 HIG 기준(44pt · 11px · 4.5:1) 정비를 마쳤습니다(`docs/ui-hig.md`). |

---

## 2. 서버에서 실행되는 코드 경로 · 빈도 · CPU (Q3 · Q4)

### 2.1 요청 경로 (모두 `app/api/*/route.ts`, Server Action 없음, middleware/proxy 없음)

| 경로 | 호출 주체 · 빈도 | 하는 일 | DB 왕복(Neon HTTPS) |
|---|---|---|---|
| `POST /api/game` | 모든 화면. 전투 화면 **5초**(`SYNC_MS`), 다른 화면 15초, 비활성 60초, 버튼 행동마다 | `mutate`: 세이브 읽기(캐시) → 풀기(gunzip) → 파싱 → `migrateState` → **`advance`(턴 시뮬레이션)** → 행동 → 업적 · 소식 · 길드 · 제단 · 합동 작전 동기화 → 직렬화 · gzip → `UPDATE players` → `buildCatalog`(카탈로그 키가 다르면 전체 표) → 응답(세이브 전체) | 읽기 0~1(캐시) + 쓰기 1 + 부가(제단 핵심 15초 캐시, 설정 30초 캐시, 소식 · 길드는 조건부) ≈ **1~3** |
| `GET/POST /api/chat` | 채팅 패널 폴링 + 보내기 | 줄 읽기(커서 after) · 쓰기 · 도배 제한 | 1 |
| `GET /api/altar` | 제단 화면 폴링 | 제단 · 축복 · 월드보스 · 순위(캐시) | 2~3 |
| `GET/POST /api/ranking` | 랭킹 화면 · 등록 | 순위 행 · 결투 시즌 | 1~2 |
| `POST /api/duel` | 결투 · 훈련 | 서버에서 결투 시뮬레이션(`systems/duel.ts`) | 2~3 |
| `GET/POST /api/guild`, `/api/crew` | 길드 · 합동 작전 | 공유 행 읽기 · 쓰기 | 1~3 |
| `POST /api/hack`, `/api/vault` | 해커 직업 · 금고 | 공유 설정 쓰기(다른 모험가의 사냥터 다운 등) | 1~2 |
| `POST /api/auth` | 로그인 · 가입 · 로그아웃 · 슬롯 | 해시 · 세션 | 1~2 |
| `GET/POST /api/admin` | 운영 페이지(버튼 때만) | 설정 · 통계 | n |
| `GET /`(정적) | 첫 로드 | 프리렌더된 HTML(12.8KB) | 0 |

### 2.2 요청 하나의 비용 [측정]

로컬(Node 22, 이 컨테이너)에서 잰 값. Vercel vCPU는 대개 이보다 느립니다(performance.md는 1.5~2배로 봄).

| 항목 | 중반 몸(Lv.44 · 환생 3) | 후반 몸(Lv.104 · 환생 56) | 비고 |
|---|---|---|---|
| 세이브 JSON | 3.7KB(표본) · **운영 30~61KB** | 8.1KB(표본) | 운영 세이브는 로그 70줄(43%) · 가방 · 원정대 기록이 커서 더 큼 |
| 턴 하나(`tick`) | 1.13ms | 0.36ms | v3.104 · v3.130 최적화 뒤. 후반 몸이 더 싼 것은 적이 빨리 죽어 전투 분기가 짧기 때문 |
| 5초 동기화(파싱 + `advance` 2~3턴) | 3.6ms | 2.6ms | 요청 고정 비용 제외 |
| 요청 고정 비용 | ≈ **4.5ms**(풀기 1.4 + 직렬화 · 압축 2.6 + 응답 0.6, performance.md) | | 턴 0개여도 듭니다 |
| `buildCatalog` | 2.1ms | 0.5ms | 카탈로그 키가 같으면 생략(화면은 늘 보냄) |
| `migrateState` | 0.6ms | 0.6ms | 매 요청 |
| 6시간 부재중 정산 1회 | 838ms | 690ms | 표본 환산 적용. 환산이 안 되는 경우(던전 · 해커 · 표본 중 변화) 1,500턴 × 요청 여러 번 |
| 로컬 서버 end-to-end `sync` | **11~13ms**(카탈로그 키 보냄, 응답 36.8KB) / 70ms(카탈로그 포함, 87KB) | | Next.js 라우팅 · JSON · 쿠키 포함, DB는 로컬 파일 |

### 2.3 Active CPU 원인 후보 순위

운영 기준값(`docs/performance.md` 6단계, 2026-10): **모험가 4명이 하루 41분**(≈ 월 20.5시간, Hobby 4시간은 6일에 소진, Pro 16시간도 초과). 그 뒤 v3.127에서 동기화 3→5초로 늘려 요청 −40%.

전투 화면을 켜 둔 모험가 1시간의 서버 CPU **[추정, 로컬 기준]**: 요청 720개 × 4.5ms ≈ 3.2초 + 턴 1,800개 × 1.6~3.4ms ≈ 2.9~6.1초 = **6~9초/시간**(Vercel vCPU는 2~3배 느려 15~30초/시간, 운영 측정 30초/시간과 맞음). Hobby 4시간/월 ≈ 하루 8분은 **종일 켜 두는 모험가 1~2명**이면 소진됩니다.

| 순위 | 원인 | 몫 [추정] | 근거 |
|---|---|---|---|
| 1 | **턴 시뮬레이션**(`advance` → `tick`, 게임 시간 2초당 1턴, 턴당 1.3~3.4ms 기준 몸 · 0.4~1.1ms 가벼운 표본) | **50~65%** | 접속 중이든 15초 화면이든 턴 수는 같고, 탭을 숨겨도 돌아오면 그만큼 돌림. 턴 안은 `stats()`가 57~65%, 그 밖에 `syncGoals` · `syncAchievements` · `syncVoyage` · `runAutomation` · `addLog`(로그 120줄 reduce) |
| 2 | **요청 고정 비용 × 요청 수**: 5초 폴링(하루 최대 17,280요청), 버튼 행동(재련 · 옵션 연타)마다 전체 `mutate` | 20~30% | 요청당 풀기 0.45 · 파싱 0.6 · 마이그레이션 0.2 · `act(sync)` 0.84 · **직렬화 2회**(`store.ts:104` + `Response.json`) · gzip 1.0 · 응답 0.34ms |
| 3 | Next.js · Node 요청 처리 + Neon fetch 클라이언트(16~18KB base64 본문 인코딩) + 인스턴스마다 주기 읽기(설정 30초 · 제단 15초 · 해킹 30초) | 10~15% | 요청 수에 비례 |
| 4 | **환산 불가 부재중 정산**: 던전 반복 · 랜덤게임 · 해커 · 표본 중 사냥터/직업/환생 변화 · 레벨 2 이상 상승이면 1,500턴 × N요청(6시간 = 8요청 24~37초 로컬 = Vercel 60~110초, 연구 최대 24시간이면 2~6분) | 0%~지배적(모험가에 따라) | 던전을 반복 중인 채 하루 한 번 들어오는 모험가 1명 ≈ 24시간 접속한 모험가 1명 |
| 5 | 충돌 재시도(두 기기 · 두 탭 · 인스턴스 간 `rememberRecent` 불일치 → `advance` 재실행 최대 3회) | <5% | `store.ts:92-109` |
| 6 | 콜드 스타트 모듈 초기화(`finishJobs` O(J²) · `registerJobs/Skills` · `alignJobMastery` O(J×S) · `applyCoreRework` · 비밀 표 등록, 추정 100~500ms/인스턴스) | 1~5% | 하루 여러 번 배포하면 늘어남 |
| 7 | 그 외: `buildCatalog`(0.1~2ms) · 채팅 8초 폴링(열려 있을 때만) · 랭킹 100행 파싱 · 채팅 POST의 전체 세이브 파싱(이름만 읽으려고) · 시장 창(10분마다 3~10ms) · 로그인 PBKDF2 12만 회(50~150ms, 제한 있음) · 관리자 `listPlayers`(전체 세이브 풀기, 드묾) | <5% | |

**결론**: 두 몫을 따로 다뤄야 합니다. 요청 수를 줄이면(폴링 제거 · 델타 응답 · 직렬화 1회) 2 · 3 · 7이 줄어 **35~50%**, 턴 시뮬레이션(1 · 4)은 계산 위치를 옮기거나(A · C안) 턴 자체를 더 싸게 해야 줄어듭니다. 4번은 지금 당장 고칠 수 있는 '꼬리'입니다(환산 불가 조건을 줄이거나 던전 반복에도 환산 적용).

---

## 3. 화면 목록 · 상태 의존 · 동기화 때 다시 그리는 범위 (Q5 · Q9)

### 3.1 구조

- 라우트: `app/page.tsx`(게임 전체) · `app/admin/page.tsx`(운영) · `app/fx-lab/page.tsx`(연출 실험). **화면마다 URL 없음**: `GameShell`의 `view` 상태(메모리)로 메뉴를 바꾸고, 로그인 전에는 `LoginScreen`.
- 상태: `useGame()`(`components/game/use-game.ts`) 하나가 `state` · `catalog` · `market` · `busy` · 동기화 타이머 · `send(action)`을 가지며, `GameShell`이 `s`와 `send`를 모든 패널에 prop으로 전달. 전역 스토어 없음. 동기화 응답마다 `setState(새 객체)` → **`s`를 받는 모든 마운트된 컴포넌트가 다시 렌더**됩니다(React 19 자동 메모 없음, 컴파일러 미사용).
- 화면 설정(연출 세기 · 접기 · 마지막 세계 탭 등)은 `localStorage`(`scene-look-setting.ts`, `notice-settings.ts`, 패널별 키).

### 3.2 화면 목록 (사이드바 순서) — 크기는 `wc -l` 기준, 의존 필드는 파일에서 `s.xxx`로 읽는 최상위 State 키

| 화면 | 컴포넌트 | 줄 수 | 읽는 State 키(주요) | 동기화 때 다시 그리는 범위 |
|---|---|---|---|---|
| 자동 사냥(메인) | `battle-view.tsx` + `scene-stage.tsx` · `combat-fx.tsx` · `battle-rail.tsx` · `player-column.tsx` · 핫바 · 피드 | 318 + 396 + 486 + … (약 2,000) | hp · enemy · logs · running · stage · tide · skills · level · exp · gold · pearls · lastOffline · event · closed · altarStatus · account | **전부**. 턴 재생(`REPLAY`)은 로그 차분으로 프레임마다 그 줄만 처리하지만, 5초마다 `s` 교체로 장면 · HUD · 피드 · 핫바 · 캐릭터 열이 모두 렌더 |
| 사냥터 · 던전 | `stages-panel.tsx` · `world-map.tsx` · `dungeons-panel.tsx` | ~700 | stage · tide · bestStage · level · rebirths · closed · dungeon · tideBest · bossCores | 지역 목록 전체(`STAGES` 35 + 던전 10 카드) |
| 제단 | `altar-panel.tsx` | ~300 | altar · altarStatus · pearls · gold · essence | 제단 폴링과 동기화 두 경로 |
| 원정대 | `expedition-*.tsx`(5탭 · 보드 · 재생 · 상점 · 서랍) | ~1,500 | expedition* 30여 키 | 판 중에는 보드 전체 |
| 능력치 · 치장 | `build-panel.tsx` 등 | ~400 | attributes · statPoints · permanent · title · badge · rank | 전부(파생 수치 `stats(s)` 재계산, 캐시 있음) |
| 상점 · 장비 보관함 | `inventory-panel.tsx` · 상점 · 던전 주화 상점 | 325 + … | inventory(최대 100) · equipment · gold · essence · dungeonCoins · itemBook | 가방 100칸 카드 전체(교체 미리보기는 캐시) |
| 증권거래소 | `market-panel.tsx` | ~300 | market · marketPnl · gold | 시세 피드 별도 상태 |
| 스킬 · 전직 | `skills-panel.tsx` · `classes-panel.tsx` · `jobs/*` | 244 + … (약 1,200) | skills · skillSpent · jobMastery · unlockedJobs · sp · job · level · attributes | 스킬 카드 수십~수백(카탈로그 610개 중 필터), 계보 63 · 직업 292 목록 |
| 환생 · 분신 | `rebirth-panel.tsx` | 235 | rebirths · level · permanent · pearls · ascension · clones | 전부 |
| 도감 · 업적 · 스토리 | `collection-panel.tsx` · 업적 · `story-*.tsx` | 320 + … | book(161) · variantBook · goldenBook · onyxBook · achievements · story | 지역 접기(`LazyDetails`)로 펼친 지역만 |
| 통계 · 기록 | `stats-panel.tsx` 등 | ~300 | goldLog · expLog · masteryLog · kills · deaths · duelSeason | 전부 |
| 길드 | `guild-panel.tsx` | ~250 | guildMember · guildStats | 길드 폴링 |
| 랭킹 · 결투 | `rankings-panel.tsx` | 296 | duelSeason · account | 랭킹 폴링(10초, 결투 대기 1초) |
| 도움말 · 업데이트 | `guide-panel.tsx` · 업데이트 내역 | 294 + … | 거의 없음(정적) | 정적이지만 `s` prop으로 렌더는 됨 |
| 겹침 | 설정 다이얼로그 · 전직 시트 · 업데이트 내역 · 모험 안내(tutorial) · 전체 지도 · 결투 결과 · 부재중 정산 카드 · 이름 변경 · 로그인 | | | 열려 있는 동안 함께 |

(컴포넌트 전체: `components/game/*.tsx` 7,711줄 + `jobs/` 등 하위 폴더. 자세한 트리 · 메모 현황은 3.3.)

### 3.3 리렌더 범위 조사 결과 (코드 기준)

- 규모: `components/game` **69개 .tsx(7,903줄) + 11개 .ts(839줄)**, 메뉴 16개 → 화면(view) 27개, `BattleView`만 정적 import이고 나머지 26개 패널은 `next/dynamic`(첫 상태 도착 뒤 유휴 시간에 미리 로드). 한 번에 한 패널만 마운트.
- **`s`(State 전체)를 prop으로 받는 함수 컴포넌트 약 83개(50개 파일)**. 동기화마다 새 객체라 이들은 `memo`가 있어도 모두 다시 렌더됩니다. `memo` 사용 18곳 중 효과가 있는 것은 원시값 prop만 받는 `SceneLog` · `BattleLogLine` · `LogTurnDivider` · `JournalLine` · `ChatPanel` · `NewsFeed` · `HeroFigure` · `SceneBackdrop` 정도. `SkillCard`는 memo지만 `s`를 받아 매 동기화 렌더. `useMemo`는 5파일(battle-view 3 · classes-panel 4 · skills-panel 3 · expedition-replay 3 · rankings-panel 2)이고 그중 `finderJobs`(직업 전체 스캔) · `recommendLoadout(s)`는 `s`에 묶여 매 동기화 재계산. 선택자(slice 구독) 0.
- 동기화 1회 = 셸 전체 렌더 2~3회: `setState(새 state)` + 행동마다 `busy` true/false 2회 + `setCatalog` · `setNewBuild`. 셸에서 `useFeedLiveRates(s)` · `useFeedBattleRecords(s)` 효과도 매번.
- **전투 화면은 동기화 사이에도 프레임마다 렌더**: 재생 프레임 스토어(`useReplayView`)가 프레임마다 `{...state, hp, enemy, logs: logs.filter(...)}`로 새 State를 만들어 `Player` · `MobilePlayerStrip` · `BattleArena`(적 · 나 · 시전 · 피해 · 전리품 · 핫바 · HUD) · `BattleRail`(로그 filter + slice 40)을 다시 그립니다. 턴 2초 × 비트 여러 개 × 5초당 2.5턴. `WhistleButton`은 memo지만 재생 `s`를 받아 프레임마다 렌더.
- 무거운 경로 순위: (1) 전투(TSX ~1,600줄 + `battle.css` 2,574줄 339KB = 전체 CSS의 62%, `max-width` 쿼리 55개), (2) 도감(161종, 지역은 `LazyDetails`지만 던전 보스 · 칠흑 섹션은 닫혀도 DOM에 있고 `stats(s)` · `dropRate` 매 렌더), (3) 스킬 카드 전부, (4) 전직 `finderJobs`, (5) 보관함(행마다 `itemStats`, `JSON.stringify` 키), (6) 원정대 보드, (7) 로그 피드(싸다).
- 콘텐츠 표가 **브라우저에서 변경 가능한 모듈 싱글턴**입니다: `applyCatalog`가 `JOBS` · `SKILLS` · `LINEAGES` · odds를 제자리 수정하고 컴포넌트는 React 상태가 아니라 `catalogNow()` 싱글턴을 읽습니다. 시세 · 전투 기록 · 실시간 효율 · 연출 설정 등 9개 모듈 스토어(`useSyncExternalStore`)와 localStorage 키 54곳(접두어 `tidebound.` · `tidebound:` · `tb-` · `exp-` · `fold:` 혼재)이 있습니다.
- 디자인 시스템 현황: shadcn 10개(1,402줄, 게임 컴포넌트는 `tabs` 13곳 등 원시 요소로만 사용), 게임 컴포넌트의 className 1,878개 중 Tailwind 유틸리티는 사실상 0(전부 손으로 쓴 전역 CSS, BEM 비슷). CSS **hex 리터럴 3,094개(고유 1,389개)**, TSX hex 1,142개(587개가 스토리 SVG 등 그림), 루트 토큰 8개(`--background` · `--foreground` · `--card` · `--primary` · `--muted` · `--border` · `--sidebar` · `--gold`), 간격 · 타이포 토큰 없음, 다크 전용. 브레이크포인트 29종(767px이 80곳) + 데스크톱 `zoom`(`--ui-scale` 1.05~1.4).

---

## 4. 세이브 포맷 (Q8) — `docs/save-v1.schema.json`

- 만든 방법: `newState` · 중반 · 후반 표본 3개를 실제 엔진으로 만들어 키 · 타입 · 예시를 추론(JSON Schema 2020-12). **필수(required) 82개 = `newState`가 만드는 키**, 표본에서 본 선택 키 14개. 타입 정의(`game/types.ts:556-936` `State`)에는 **최상위 필드 204개**가 있으므로, 표본에 안 나온 선택 필드 약 110개(원정대 · 해커 · 시장 · 길드 등)는 스키마에 없습니다 → 2단계에서 타입에서 생성하는 스키마(ts-json-schema 또는 zod 역생성)로 보완해야 합니다. 의미 · 범위는 타입 주석이 원본입니다.
- 크기: 표본 2.5 / 6.2 / 26.9KB, 운영 30~61KB(gzip 16~18KB). 큰 키: `logs`(70줄 · 재생용 `event` 포함, 43%) > `expedition*` > `inventory`(100칸) > `book` · `story` > `account`(서버가 매 동기화 다시 씀).
- 버전: `version: 8` 하나. 번호는 v26~v3.3xx 동안 거의 안 올랐고, **마이그레이션은 키 존재 · 플래그 기준 멱등 보정**(삭제 · 환불 · 재척도 · 인덱스 이동 등 수십 건, 예 v3.367 `kopruluStagesShifted`)이라 "어느 버전이든 현재로"는 이미 만족하지만, 순서 · 테스트 · 되돌리기가 없습니다. 과거 세이브 픽스처 테스트 없음 → 브리프 8절 "픽스처 10개 이상"은 운영 DB에서 익명화해 확보해야 합니다(지금 저장소에는 없음).
- 세이브에 섞인 **파생 · 서버 전용 값**: `account`(계정 요약) · `altarStatus` · `closed` · `event` · `catalog`(응답에 별도) · `lastOffline`(표시용) · `catchingUp` · `away`. 브리프 8절 "파생값은 저장하지 않음"을 적용하면 이들은 응답 메타로 분리 대상입니다.
- 압축: `game/server/pack.ts` gzip 4단계 + base64(DB 저장 형식). 클라이언트에는 압축 없이 JSON으로 보냅니다(브리프 5절 "압축 전송"은 미적용).

---

## 5. 브리프 `[기본값]` 중 이 코드베이스에 안 맞는 것

| 브리프 항목 | 안 맞는 이유 | 제안 |
|---|---|---|
| **4절 틱 100ms 고정 스텝, `tick(state, dt, rng)`** | 이 게임의 턴은 **2초 = 1턴**(`turnMs: 2000`)인 턴제이고, 턴 안 처리(`systems/turn.ts` `tick`)는 이미 `(state, rng)` 순수 함수에 가깝습니다(상태를 제자리 수정). 100ms 스텝은 맞지 않고, 불변 갱신으로 바꾸면 30~61KB 객체를 턴마다 복사해 느려집니다. | `tick(s, rng)` 제자리 수정 유지 + 턴 경계에서만 스냅샷. rAF 커밋은 화면 재생(`REPLAY`)에만. |
| **5절 "서버는 저장 · 인증만, 계산은 클라이언트"** | (1) 정보 비공개 설계(`docs/concept.md` 10장, `game/secret/*` server-only, CI 누설 검사)와 충돌 — 드롭 확률 · 비밀 직업 조건이 클라이언트에 가야 함. (2) 공유 시스템(제단 공물 · 길드 · 합동 작전 · 해킹 · 원정대 고스트 · 결투 · 랭킹 · 소식)이 서버가 검증한 세이브를 전제. "초당 획득 상한 검증"으로는 골드 · 세계석 · 드롭 조작을 막지 못합니다. (3) 결정론 재계산 기반이 아직 없음(`Math.random`, 서버 이벤트 · 닫힘 · 해킹 다운이 섞임). | 세 갈래(6절 1번). **B안(지금 당장)**: 서버 권위 유지 + 폴링 제거(행동 때 · 60초 디바운스 · 비활성 0) + 델타 응답 + 직렬화 1회 → 고정 비용 몫 35~50% 절감, 신뢰 모델 불변. **C안(브리프의 뜻을 살리는 길)**: 엔진을 결정론으로(세이브마다 서버가 준 시드, `Math.random` 제거, 서버 이벤트 · 닫힘을 입력으로 고정) → 클라이언트가 턴을 돌리고 결과 + 행동 기록을 올림 → 서버는 **표본 검증**(N번에 1번 또는 수상한 증가량일 때만 같은 시드로 재실행)과 비밀 판정(드롭 등급 · 희귀 출현은 서버 난수로 결정해 내려 줌)만. 턴 몫까지 80~90% 절감. **A안(완전 클라이언트)** 은 비공개 · 공유 시스템을 재설계한 뒤에만. |
| **4절 오프라인 상한 12시간** | 이미 6시간 + 연구로 최대 24시간이고 '긴 휴식' 연구가 유료 재화(세계석)로 팔린 상태. 상한을 줄이면 환불 · 보상 문제. | 지금 규칙 유지. 표본 환산은 이미 있음. |
| **2 · 3절 zustand + 선택자** | 맞는 방향이지만 현재 상태 갱신이 "통째 교체"라 선택자만으로는 리렌더가 줄지 않습니다(참조가 모두 바뀜). | 서버 응답을 **키별 얕은 병합**(값이 같으면 이전 참조 유지)으로 바꾼 뒤 선택자 도입. 로그 · 재생 프레임은 별도 스토어(`useSyncExternalStore`). |
| **3절 `src/` 재배치 + 의존 방향 ESLint** | 지금 `game/`(코어) · `game/server/` · `game/secret/`(server-only) · `components/` · `app/`로 이미 나뉘어 있고, 테스트 로더(`scripts/lib/game-modules.mjs`)와 CI(`check-secrets.mjs`)가 이 경로를 전제합니다. 통째 이동은 116개 커밋 분량의 경로 참조와 테스트 561개를 건드립니다. | 폴더는 유지하고 **경계만 ESLint로 고정**(`game/**`에서 `react` · `next` · `components` import 금지, `components/**`에서 `game/server` · `game/secret` 금지 — 후자는 이미 `server-only`로 빌드 실패). `features/`는 `components/game/` 안에서 화면별 폴더로. |
| **2절 vitest 추가, 10절 커버리지 90%** | 이미 자체 하네스(`tests/run.mjs`, 561개, 공유 시드 난수, 파일 순서 의존)가 있고 CI가 돌립니다. vitest로 옮기면 난수 순서 의존 테스트가 깨집니다. | vitest는 **새 코드(마이그레이션 체인 · 레지스트리 · 골든 테스트)에만** 도입하고 기존 하네스는 유지. 두 러너를 CI에 나란히. |
| **7절 콘텐츠 `content/*.json` + zod 빌드 검증** | 맞음. 다만 비밀 표(`game/secret/*`)는 JSON으로 빼도 서버 전용이어야 하고, 모듈 로드 후처리(이름 덮어쓰기 · `finishJobs` · 코어 리워크)는 레지스트리의 '정규화 단계'로 옮겨야 합니다. | 공개 콘텐츠만 `content/`, 비밀 수치는 `content/secret/`(서버 전용 import). 콘텐츠 키트 스키마(`tools/content-kit/schemas`)를 zod로 변환. |
| **6.3 모든 화면에 URL** | 가능하지만 세이브가 서버에 있고 첫 로드가 `sync` 한 번이라 "새로고침 시 상태 유지"는 이미 됩니다. 메뉴 14개 중 `sync` 없이 그릴 수 있는 화면이 없어, 라우트마다 서버 컴포넌트로 만들면 요청이 늘어납니다. | `app/page.tsx` 하나를 유지하고 **해시 또는 `?view=` 쿼리**로 화면 상태만 URL화(뒤로가기 · 공유). 서버 라우트 분리는 하지 않음. |
| **8절 IndexedDB 스냅샷 · 가져오기/내보내기** | 세이브가 서버 권위라 로컬 스냅샷을 "복구"로 쓰면 되감기 치트가 됩니다. | 읽기 전용 백업(내보내기)만. 복구는 서버의 revision 기록으로. |
| **6.1 토큰만 사용, hex 금지** | CSS 11파일 6,6xx줄에 hex 직접 사용이 수백 곳(에이전트 집계 3.3). 한 번에 바꾸면 회귀 위험. | 토큰 정의 → 새 화면부터 적용 → stylelint 경고로 시작, 화면 교체 때 함께 치환. |

---

## 6. 핵심 설계 결정 요청 (2단계 전에 답이 필요)

1. **계산 위치**: A안(완전 클라이언트, 브리프 원안) · B안(서버 권위 + 폴링 제거, 35~50%) · C안(결정론 엔진 + 클라이언트 계산 + 서버 표본 검증 + 비밀 판정은 서버, 80~90%). **권고: B안을 2단계에 먼저 넣고(위험 없음, 2~3일), 3단계 코어 추출을 C안을 전제로 설계**(시드 난수 주입 · 외부 입력 고정이 골든 테스트에도 필요). A안이면 정보 비공개 · 해킹 · 제단 · 고스트 설계를 먼저 다시 정해야 합니다.
2. **폴더 재배치 범위**: `src/` 통째 이동 vs 지금 폴더 유지 + 경계 규칙(권고).
3. **테스트 러너**: vitest 병행(권고) vs 전면 교체.
4. **URL**: 쿼리/해시(권고) vs App Router 라우트 분리.
5. **세이브 v2**: 파생 · 서버 전용 키 분리와 로그 분리(세이브 밖 링 버퍼)를 v1→v2에 넣을지.

## 7. 다음 단계(2단계) 계획 초안 — 승인 뒤 착수

1. 토대: zod · vitest(병행) · zustand 추가. 경계 ESLint. Tailwind 4 `@theme` 토큰(`app/styles/theme.css`의 현재 토큰에서 시작) + 게임 범용 컴포넌트 10종 + `/dev/ui` 나열. 기존 화면 변경 없음.
2. 서버 비용 선행 처리(브리프 9절 순서와 별개로 비용이 급하므로): 비활성 탭 동기화 0, 전투 화면 외 폴링 제거, 저장 디바운스 60초, 응답 델타(키별 얕은 병합). 배포 뒤 Active CPU 전후 기록.
3. 코어 추출: `game/systems/turn.ts` 중심으로 "서버와 화면이 같은 `tick`을 쓰는" 경계 확정, 시드 난수 주입(`mutate`에 rng 전달) → 골든 테스트. **(v3.377 진행)** `game/server/rng.ts requestRng(id, revision, lastTick, salt)`를 `mutate`가 `advance` · `act`에 넘기고, `tests/golden.test.mjs`가 기준 몸 3개의 1시간 세이브 해시를 `tests/fixtures/golden.json`과 비교합니다(갱신: `node scripts/golden-update.mjs`).
4. 세이브 v2 마이그레이션 체인 + 운영 세이브 익명 픽스처 10개. **(v3.375 진행)** 운영 페이지 통계 탭의 내보내기 버튼(`exportFixtures`)이 `tests/fixtures/saves/` 용 익명 JSON을 내려줍니다. **(v3.378 진행)** `game/save/` 봉투 v2 + 체인(`docs/save-format.md`), `TIDEBOUND_SAVE_V2` 플래그 뒤. 픽스처 로드 테스트는 파일이 들어오면 자동으로 돕니다.
5. 셸 교체 → 화면 순차 교체(설정 → 도감 → 보관함 → 스킬 → 사냥 메인). **(v3.381 진행)** 설정 화면을 먼저 새 토대로 만들었습니다(`components/features/settings/`, 주소 `#settings`). 메뉴 화면의 해시 주소(`components/game/view-route.ts`)도 이때 넣었고, 셸(사이드바 · 상단바 · 모바일 탭) 교체는 다음 PR. **(v3.382 진행)** 도감 화면(`components/features/codex/`): 접는 구역 `FoldSection`은 닫힌 내용을 마운트하지 않아 161종 카드를 한 번에 그리지 않습니다. **(v3.384 진행)** 장비 보관함(`components/features/inventory/`): 작업대 · 스타캐치를 새 토대로 옮겼고, 상점 강화 탭 · 환생 화면은 옛 조각을 아직 씁니다. **(v3.385 진행)** 스킬 화면(`components/features/skills/`): 카드 · 편성 · 찾기. 목록은 구역마다 24장씩 그립니다. **(v3.386 진행)** 셸 교체(`components/features/shell/`): 사이드바 · 상단 바(재화 칩은 사냥 머리글에서 여기로) · 모바일 탭 5칸 · 어디서나 보이는 진행 위젯. 옛 `navigation.tsx` · `mobile-tab-bar.tsx`와 그 CSS(`.topbar` · `.game-sidebar` · `.mobile-tab-bar`)는 다음 버전에 삭제. **(v3.389 진행)** 자동 사냥 1차(`components/features/battle/`): 틀 · 모험가 카드 · 알림 · 기록판 · 선택판. **(v3.390 진행)** 2차: 난이도 카드 · 장면 · 조작 줄 · 핫바 · 호루라기를 옮기고 옛 battle-view · player-column · mobile-player-strip · battle-rail · notice-stack 을 삭제. **(v3.391 진행)** 옛 패널(settings-dialog · collection-panel · skills-panel · navigation · mobile-tab-bar) 삭제, 소스에 없는 클래스만 가진 CSS 규칙 748개 자동 제거(동적 클래스는 접두사로 보존, 전 화면 스크린샷 비교). 남은 옛 조각: inventory-panel(상점 강화 탭 · 환생 화면) · tide-selector(사냥터 화면) · 사냥 장면 연출 CSS. **(v3.392 진행)** 능력치 · 치장 화면(`components/features/character/`): 능력치 상세는 `Collapsible` 기반 `FoldRow`/`StatRow`로 옮기고(계산은 옛 stat-breakdown 그대로), 치장은 `FoldSection` 두 구역 + `StatBar` 계급 진행. character-panel · cosmetics-panel · stat-breakdown 삭제. **(v3.393 진행)** 상점 · 던전 주화 상점(`components/features/shop/`): 상품 카드 `GoodCard` · 재화 `Tile` 공용, 강화 탭은 `features/inventory/forge-bench` 재사용. shop-panel · dungeon-shop-panel · inventory-panel 삭제(옛 보관함 조각은 모두 사라짐).

---

## 부록 A. 측정 방법

- 턴 · 동기화 · 정산 비용: `scripts/lib/game-modules.mjs`로 엔진을 불러 중반 · 후반 표본을 만들고 `performance.now()`로 200회(턴) · 20회(동기화) 평균. 스크립트는 세션 스크래치(`save-schema.mjs` · `bench.mjs`)에 있으며 저장소에 넣지 않았습니다.
- end-to-end: 로컬 `pnpm start`(파일 DB) + curl. `sync` 응답 86.9KB(카탈로그 포함) / 36.8KB(카탈로그 키 보냄), 그중 `state` 31.0KB · `logs` 21.8KB(107줄).
- 운영 수치는 `docs/performance.md`(v3.104 · v3.127)에서 인용.
