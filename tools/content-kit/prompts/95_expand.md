# 기존 항목 확장 (연관 콘텐츠 파생)

아래 `<seed>`는 이미 확정된 항목이다. 이 항목에서 파생되는 연관 콘텐츠를 만들어라.

<seed>
{{SEED}}
</seed>

<existing>
{{EXISTING}}
</existing>

파생 규칙:
- seed가 **지역(area)**이면: `monster_hints`를 바탕으로 그 사냥터의 몬스터 {{N_MON}}종(stage = seed id), 지역 방문 장면(region_visit) {{N_EVT}}개
- seed가 **몬스터**면: boss면 던전 1곳(boss 칸에 이 몬스터) + boss_kill 장면 1개, 칠흑 보스면 onyx 장신구 1개
- seed가 **직업(job id·차수)**이면: 그 직업의 스킬 {{N_SKILL}}개(상태이상 → 조건부 추가 피해 쌍 1쌍 포함)
- seed가 **스킬**이면: `damageBonusCondition`이 받는 상태이상을 거는 짝 스킬(없으면), 그리고 둘을 받쳐 주는 패시브 1개

각 타입은 해당 스키마를 정확히 따르고, 출력은 타입별로 묶는다:
{ "monsters": [...], "items": [...], "skills": [...], "areas": [...], "events": [...] }
해당 없는 키는 빈 배열로 둔다. JSON만 출력하라.

<schemas>
{{SCHEMA:monster}}
{{SCHEMA:item}}
{{SCHEMA:skill}}
{{SCHEMA:area}}
{{SCHEMA:event}}
</schemas>
