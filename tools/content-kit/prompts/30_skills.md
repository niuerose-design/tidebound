# 스킬 배치 생성

아래 스키마를 따르는 스킬 **{{COUNT}}개**를 만들어라.

<schema>
{{SCHEMA:skill}}
</schema>

<existing>
{{EXISTING}}
</existing>

이번 배치 조건:
- 소유 직업: `{{JOB}}` (차수 {{TIER}}, 계보 {{LINEAGE}}, 계열 {{TREE}}: physical·magic·defense·status·hybrid·support 중 하나)
- 구성: active {{N_ACTIVE}}개, passive {{N_PASSIVE}}개
- 피해 축: {{DAMAGE_TYPES}} (physical·magic·split·fixed). 속성(element)·대상(target) 개념은 없다.
- 추가 테마/제약: {{THEME}}

작성 지침:
- 이 게임의 핵심은 **스킬 조합**이다. 배치 안에서 ‘상태이상을 거는 액티브(effect) → 그 상태에서 더 아픈 액티브(damageBonusCondition)’ 쌍을 최소 1쌍, 패시브 1개는 그 쌍을 받쳐 주는 능력치(bonus)로 만든다.
- 수치는 가이드 6.5 표의 차수별 범위 안: AP(cost) 액티브 2/3/4/5/6, 패시브 2/2/3/3/3. multiplier·chance·cooldown도 표의 중앙값 ±30%.
- 물리 액티브는 chance ≤ .30, 마법·복합은 ≥ .45에 manaCost를 적는다(원값 8~60, 게임이 ×4 한다).
- 액티브의 `desc`는 null(게임이 수치에서 자동 생성). 패시브의 `desc`만 손으로: ‘~이 오르고, ~하면 ~됩니다.’ 10~60자.
- `name`은 원작 스킬명 표기 관례(외래어 허용)를 따르되, 스타일 가이드 4절의 IP 결정을 지킨다.
- `fx`는 연출 갈래(pierce·slash·fire…) 중 하나. `mechanic`은 기존 게임 필드만(새 기전 금지).
- `category`·`combo_hint`·`target`·`element`·`params`·`unlock_hint`·`flavor`·`effect_text`는 [미사용]. combo_hint만 설계 메모로 채워도 좋다.

`{"items": [...]}` JSON만 출력하라.
