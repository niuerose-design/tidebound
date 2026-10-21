# 세이브 형식과 마이그레이션 (v3.378, 재설계 3단계)

브리프 8절의 봉투 · 마이그레이션 체인을 지금 서버에 **기능 플래그 뒤에서** 넣었습니다. 코드는 `game/save/`(순수, React · 서버 모듈을 모름)와 `game/server/save.ts`(플래그)입니다.

## 두 모양

| | v1 (지금 라이브) | v2 봉투 |
|---|---|---|
| DB `players.state` | `State` 그대로(`version: 8`) | `{ v: 2, savedAt, lastTickAt, contentVersion, state }` |
| 파생 키 | 섞여 있음 | `state`에서 `event` · `closed` · `catchingUp` · `away` 제거(`DERIVED_KEYS`, `advance()`가 요청마다 다시 적음) |
| 읽기 | `readSave`가 둘 다 받음 | 같음 |
| 쓰기 | `TIDEBOUND_SAVE_V2` 없음 · `0` | `TIDEBOUND_SAVE_V2=1` |

- `account`(10분 주기 캐시) · `altarStatus`(15초 캐시) · `lastOffline`(행동으로 닫는 정산 카드)은 상태라 v2에서도 남깁니다. 캐시가 세이브 밖(최근 사본 층)으로 옮겨지면 v3에서 뺄 후보입니다.
- 픽스처 파일(`tests/fixtures/saves/*.json`)의 `state`는 v1 모양 그대로입니다. 봉투는 DB 행에만 씁니다.

## 읽기 경로 (하나뿐)

`game/save/envelope.ts`
- `unwrapSave(raw, now)`: 봉투 번호 `v`(봉투가 아니면 1)부터 `SAVE_FORMAT`까지 `MIGRATIONS`를 차례로 적용해 `State`만 돌려줍니다. 서버보다 새로운 `v`는 `SaveFormatError`(먼저 서버를 배포).
- `readSave(json, now)` = `unwrapSave` + `systems/migrations.ts migrateState`(키 보정: 환불 · 재척도 · 인덱스 이동, 멱등 플래그). 서버 `mutate` · 운영 페이지 · 테스트가 모두 이 경로입니다.
- `parseSave`는 보정 없이 벗기기만(목록 훑기 · 차분 응답 `before` 사본).

서버는 `game/server/save.ts`의 `readRow` · `peekRow` · `packSave`만 씁니다. `JSON.parse(row.state)` · `JSON.stringify(s)`를 직접 쓰지 않습니다.

## 체인에 단계를 더할 때

1. `game/save/migrations/vN-to-vN+1.ts`에 `(raw, now) => raw'` 순수 함수. 입력을 바꾸지 않습니다.
2. `migrations/index.ts`의 `MIGRATIONS`에 `{ from: N, to: N+1, up }` 한 줄, `format.ts`의 `SAVE_FORMAT` 올림.
3. `tests/unit/save-envelope.test.ts`에 과거 모양 픽스처로 그 단계의 검사(체인 연속성 검사는 자동).
4. `State` 안의 키 보정은 전처럼 `systems/migrations.ts`에 둡니다. 봉투 모양이 바뀔 때만 체인에 더합니다.

## 켜기 · 되돌리기

- Vercel 환경 변수 `TIDEBOUND_SAVE_V2=1` → 다음 저장부터 v2. 읽기는 플래그와 무관하므로 섞여 있어도 됩니다.
- `0`으로 내리면 다음 저장부터 v1로 다시 씁니다(테스트 `tests/save.test.mjs`가 v1 → v2 → v1을 검사). 재배포 없이 되돌립니다.
- 차분 응답: v2를 켜면 `before` 사본에 파생 키가 없어 `event`(수백 바이트)가 동기화마다 `patch.set`에 실립니다. 응답 크기 영향은 작고, 캐시 층을 옮길 때 같이 정리합니다.

## 테스트

- `pnpm test:unit`: `save-envelope.test.ts`(v1 읽기 · v2 쓰기 · 왕복 · 체인 연속성 · 새 버전 거부), `save-fixtures.test.ts`(픽스처 전부 올라오고 10턴 돌고 봉투 왕복, 파일 없으면 건너뜀).
- `pnpm test`: `save.test.mjs`(서버 store + 파일 DB + 플래그 전환).
