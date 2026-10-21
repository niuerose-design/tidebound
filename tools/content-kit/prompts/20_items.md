# 아이템 배치 생성

아래 스키마를 따르는 아이템 **{{COUNT}}개**를 만들어라. 이 게임의 아이템은 전부 장비이고, 생성 대상은 네 갈래(kind)다.

<schema>
{{SCHEMA:item}}
</schema>

<existing>
{{EXISTING}}
</existing>

이번 배치 조건:
- kind: {{KIND}}  (gear = 장비 이름 표, affix = 장비 옵션, onyx = 칠흑 장신구, relic = 유물)
- gear일 때: 등급 {{RARITY}}(0~6) 한 등급의 세트 이름 `{{SET_NAME}}`으로 무기 3계열(physical·magic·balanced) + 방어구 + 망토 + 장신구 = 6개를 한 묶음으로. 같은 등급 칸은 게임에 하나뿐이라 기존 이름을 **대체**한다는 전제.
- affix일 때: kind 분포 flat {{N_FLAT}} · percent {{N_PERCENT}} · rule {{N_RULE}}. stat은 Stats 키 중에서, base는 가이드 6.4 표의 같은 stat 기존값 ±30% 안.
- onyx일 때: 보스 몬스터 id {{BOSS}} 하나당 장신구 1개(고유 옵션 1줄 포함).
- 추가 테마/제약: {{THEME}}

작성 지침:
- gear 이름은 등급이 오를수록 구체적 사물 → 추상적 개념으로(초보자: 목검·면티 → 태초: 제네시스·에테르넬). 같은 세트의 6개는 어휘를 공유한다.
- affix `name`은 1~5자 명사(맹공·신비·유리 대포), `description`은 ‘~을 올립니다.’ 한 문장. 양날 옵션은 손해 쪽을 두 번째 문장에.
- onyx `description`은 ‘{보스}를 쓰러뜨린 증표. {효과 요약}.’ 두 문장, 60자 안.
- `flavor`·`effect_text`·`stats`·`tier`·`type`은 [미사용]이라 null. `tags`는 채운다.

`{"items": [...]}` JSON만 출력하라.
