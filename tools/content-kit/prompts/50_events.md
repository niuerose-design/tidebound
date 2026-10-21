# 스토리 장면(모험 일지) 배치 생성

아래 스키마를 따르는 스토리 장면 **{{COUNT}}개**를 만들어라. 이 게임에 선택지형 랜덤 이벤트는 없고, 조건을 만족하면 해금되는 모험 일지 장면이 서사 콘텐츠다.

<schema>
{{SCHEMA:event}}
</schema>

<existing>
{{EXISTING}}
</existing>

이번 배치 조건:
- 장(chapter): {{CHAPTER}}
- 트리거 분포: {{TRIGGERS}} (예: region_visit 3, boss_kill 2, rebirths 1)
- 추가 테마/제약: {{THEME}}

작성 지침:
- `lines`는 2~5줄, 줄당 20~80자. 1인칭 회상체 ‘~다’, 대사는 “ ” 큰따옴표, 2인칭 ‘당신’ 금지.
- 각 장면은 세계관의 큰 사건(여러 세계가 판게아로 이어짐 · 바다가 기억 잃은 모험가를 내려놓음 · 환생 · 검은 마법사)과 연결되는 **새로운 사실 하나**를 담는다.
- `hint`는 열림 조건 문장 ‘~한다’ 8~30자. 조건 수치는 적어도 된다.
- `trigger.kind`는 enum 안에서만. 코드에 없는 조건이 필요하면 custom + value에 설명.
- 같은 트리거끼리 도입부(‘~에 닿았다’)가 겹치지 않게 첫 문장을 다양화한다.
- `choices`·`weight`·`body`·`area_filter`는 [미사용]이라 null. `art_hint`는 한 줄 삽화 프롬프트로 채운다.

`{"items": [...]}` JSON만 출력하라.
