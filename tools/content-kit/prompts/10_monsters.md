# 몬스터 배치 생성

아래 스키마를 따르는 몬스터 **{{COUNT}}종**을 만들어라.

<schema>
{{SCHEMA:monster}}
</schema>

<existing>
{{EXISTING}}
</existing>

이번 배치 조건:
- 출현 사냥터: `{{STAGE}}` (지역 {{REGION}}, 입장 레벨 기준 몬스터 레벨 {{LEVEL_RANGE}})
- 등급 분포: common {{N_COMMON}}종, rare {{N_RARE}}종, epic {{N_EPIC}}종, legendary {{N_LEGENDARY}}종, boss {{N_BOSS}}종
- 성향(profile)은 한 배치 안에서 같은 것이 40%를 넘지 않게 섞는다. 보스는 보스용 성향(venomBoss·arcaneBoss·boss·zakum·papulatus)만.
- 추가 테마/제약: {{THEME}}

작성 지침:
- `level`은 사냥터 입장 레벨 ~ +6 사이에 고르게. 능력치·경험치·골드는 레벨 공식이 정하므로 `stats`는 null.
- `rarity`가 common이면 `spawnWeight`·`rewardMultiplier`는 null. rare 이상은 가이드 6.3 표의 범위 안에서 적는다.
- `lore`는 도감 한 줄: 생태 한 구절 → 모험가와의 관계(왜 사냥 대상인지) 순서로 1~2문장, 50자 안.
- `profile`은 실제 전투 패턴을 정한다. lore의 묘사가 성향과 어긋나지 않게(armored인데 ‘날렵하다’ 금지).
- `shape`는 실루엣 23종 중 몬스터 외형에 가장 가까운 것. 그림이 없으면 이 모양으로 보인다.
- `id`는 지역 접두사 관례를 따른다(기존: aq·lf·tt·ar). 새 지역이면 2글자 접두사를 하나 정해 배치 안에서 통일.
- 같은 사냥터의 기존 몬스터와 생태적 역할(포식자/채집 대상/무리/단독)이 겹치지 않도록 분산한다.
- `description`·`behavior`·`weakness`·`drops`·`tags`는 [미사용] 칸이다. 요청에 없으면 tags만 채우고 나머지는 null.

`{"items": [...]}` JSON만 출력하라.
