# 세이브 픽스처 (재설계 3단계)

운영 페이지 → 통계 탭 → **세이브 익명 내보내기** 로 받은 JSON 을 이 폴더에 둡니다(파일 이름 `saves-<빌드>-<날짜>.json`).
형식은 `game/systems/anonymize.ts` 의 `SaveFixtureFile`: `{ kind, build, saveVersion, exportedAt, count, saves: [{ id, slot, revision, updatedAt, level, rebirths, job, state }] }`.

- 이름은 `표본N`, 계정 요약 · 길드 · 원정대 공유 코드 · 고스트 · 결투 상대 기록은 지워져 있고, id 는 계정 id 의 해시 앞 8자리입니다.
- 세이브 v2 마이그레이션 체인과 골든 테스트가 이 폴더의 모든 파일을 읽어 "어느 과거 버전이든 현재로 올라오는지"를 검사합니다(3단계에서 추가).
- 브리프 9절: 10개 이상을 확보해 모든 단계에서 로드 테스트에 씁니다. 버전이 바뀔 때마다 새 파일을 더하고 옛 파일은 지우지 않습니다.
