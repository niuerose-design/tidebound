# 지역(사냥터·던전) 배치 생성

아래 스키마를 따르는 사냥터·던전 **{{COUNT}}곳**을 만들어라.

<schema>
{{SCHEMA:area}}
</schema>

<existing>
{{EXISTING}}
</existing>

이번 배치 조건:
- 지역 이름: {{REGION}} (새 지역이면 첫 사냥터에 `habitat` 칸을 채운다. 기존 지역이면 null)
- 구성: 사냥터(stage) {{N_STAGE}}곳 + 던전(dungeon) {{N_DUNGEON}}곳
- 입장 레벨 범위 {{LEVEL_RANGE}}, 입장 환생 {{REBIRTH}}
- 직전 지역(이어 붙일 곳): {{PREV_AREA}}
- 추가 테마/제약: {{THEME}}

작성 지침:
- `description`은 사냥터 목록에서 읽는다. ‘무엇이 보이고 → 무엇이 위험한가/누가 닿는가’ 2문장, 25~55자. 환생 조건은 문장에 녹인다(‘다섯 번의 생을 건넌 모험가만’).
- `subtitle`은 영문 대문자 ‘REGION · PLACE’. `tone`은 지역 분위기 색(기존 색 참고).
- 사냥터 `monsters`는 아직 없으면 `[]`로 두고 `monster_hints`에 3~5종의 컨셉(생태 역할이 겹치지 않게)을 적는다. 이것이 다음 몬스터 배치의 입력이다.
- 던전은 `boss`(monster id·‘칭호 · 이름’·gold·pearls)를 채운다. gold는 권장 레벨 몬스터 골드 × 6~10, pearls는 기존 표(1·1·2·3·5·8·12)의 흐름.
- `neighbor_hint`로 다음 지역의 씨앗을 남긴다.
- `terrain`·`climate`·`flavor`·`lore`·`ambient_lines`는 [미사용]. 요청이 없으면 null.

`{"items": [...]}` JSON만 출력하라.
