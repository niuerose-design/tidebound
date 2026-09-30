# v19 장기 전투 밸런스 기록

기준: 2026-09-28. 기존 장비/숙련/SP/직업 해금 기록을 삭제하지 않는다. 기본 승리 숙련 1과 조건부 최대 10을 유지한다.

## 설계

- 쉬운 적: 시간당 숙련량/계승 준비. 강한 적: 경험치/환생 및 정복. 난도만 올려 숙련을 강제하지 않는다.
- 명중: clamp(명중−회피+clamp(0.08×log2(속도비),−0.06,0.06),0.01,0.995). 명중 수치 상한 제거. 회피는 50%까지 선형, 이후 90% 수렴.
- 기존 기본 성장/전직 조건 유지. 스킬 기본 완료치에 5만/25만/100만/400만/1200만/3000만을 더한 실전 연마. 직접 배율과 양수 패시브만 단계당 4%. 숙련 배수/장착 AP/발동률은 증가하지 않는다. 효과가 없는 숙련 전용 패시브는 추가 연마 대상에서 제외.
- 직업 숙달 완료치에 5천/2.5만/10만/40만/150만/500만/1500만 단련. 현재 직업에서만 체력·양 공격·양 방어 단계당 4%.
- 환생 기억은 1+0.025×sqrt(횟수). 경험치/진주 증가는 20회까지 이전과 동일, 이후 횟수의 제곱근으로 완만해진다.
- 공격/HP 연구 200, 방어 연구 100. 20단계 이후 추가 이차 비용. AP 확대를 무한정 허용하지 않아 편성 선택 유지.
- 해역 최대 200. 20단계 이후 HP/공격에 이차 증가, 보상은 선형. 추가 장비 없이 환생 연구와 직업·스킬 선택을 시험할 벽이다.
- 부재중 최대 24시간. 중단 중에는 누적하지 않으며, 던전 완료/실패 시 자동 중단 동작 유지.

## 검증과 한계

`node scripts/check-combat-depth.mjs`는 장비·골드 훈련·도감·영구 연구 없는 40레벨, 환생5, 배분160, 직업 숙련12000, 기술 숙련80000의 9개 편성을 사용한다. 6상대×160개 고정 시드=8640전투. AP/사용 조건에 맞춰 목록 앞에서 장착한다. 모든 직업의 최적 편성을 탐색한 결과가 아니며, 한 번의 전투를 만전에서 시작한다. 던전 전체 클리어율과 동일하지 않다. 300턴 제한은 검사용이며 실제 PvE에는 이 제한이 없다.

| 직업 | 적 | 해역 | 승률 % | 평균 턴 | 생존 HP % |
|---|---|---:|---:|---:|---:|
| whaler | shark | 0 | 100 | 3 | 97 |
| whaler | ghost | 0 | 100 | 1.8 | 99 |
| whaler | dragon | 10 | 19 | 23 | 1 |
| whaler | dragon | 30 | 0 | 8.5 | 0 |
| whaler | templeOracle | 0 | 100 | 11.2 | 71 |
| whaler | abyssSovereign | 3 | 0 | 15.4 | 0 |
| corsair | shark | 0 | 100 | 5.5 | 92 |
| corsair | ghost | 0 | 100 | 2.8 | 97 |
| corsair | dragon | 10 | 0 | 16.1 | 0 |
| corsair | dragon | 30 | 0 | 6.3 | 0 |
| corsair | templeOracle | 0 | 99 | 20.7 | 34 |
| corsair | abyssSovereign | 3 | 0 | 11.2 | 0 |
| tempest | shark | 0 | 100 | 2.5 | 98 |
| tempest | ghost | 0 | 100 | 2.4 | 99 |
| tempest | dragon | 10 | 1 | 19.6 | 0 |
| tempest | dragon | 30 | 0 | 7.3 | 0 |
| tempest | templeOracle | 0 | 100 | 18.1 | 69 |
| tempest | abyssSovereign | 3 | 0 | 16.2 | 0 |
| oracle | shark | 0 | 100 | 4.1 | 97 |
| oracle | ghost | 0 | 100 | 3.1 | 99 |
| oracle | dragon | 10 | 16 | 37.9 | 2 |
| oracle | dragon | 30 | 0 | 9.3 | 0 |
| oracle | templeOracle | 0 | 100 | 25.8 | 77 |
| oracle | abyssSovereign | 3 | 0 | 30.4 | 0 |
| bulwark | shark | 0 | 100 | 6.7 | 99 |
| bulwark | ghost | 0 | 100 | 3.1 | 99 |
| bulwark | dragon | 10 | 100 | 57.7 | 73 |
| bulwark | dragon | 30 | 0 | 87.4 | 0 |
| bulwark | templeOracle | 0 | 100 | 24.3 | 83 |
| bulwark | abyssSovereign | 3 | 94 | 119.2 | 32 |
| krakenSlayer | shark | 0 | 100 | 3 | 97 |
| krakenSlayer | ghost | 0 | 100 | 1.6 | 99 |
| krakenSlayer | dragon | 10 | 5 | 21.6 | 0 |
| krakenSlayer | dragon | 30 | 0 | 8.8 | 0 |
| krakenSlayer | templeOracle | 0 | 100 | 11.6 | 70 |
| krakenSlayer | abyssSovereign | 3 | 0 | 14.7 | 0 |
| stormScribe | shark | 0 | 100 | 1.7 | 98 |
| stormScribe | ghost | 0 | 100 | 1.6 | 99 |
| stormScribe | dragon | 10 | 0 | 14.6 | 0 |
| stormScribe | dragon | 30 | 0 | 5.6 | 0 |
| stormScribe | templeOracle | 0 | 100 | 18.9 | 53 |
| stormScribe | abyssSovereign | 3 | 0 | 12.3 | 0 |
| coralSaint | shark | 0 | 100 | 17.4 | 97 |
| coralSaint | ghost | 0 | 100 | 8 | 100 |
| coralSaint | dragon | 10 | 100 | 144.8 | 78 |
| coralSaint | dragon | 30 | 0 | 44.8 | 0 |
| coralSaint | templeOracle | 0 | 100 | 64.5 | 77 |
| coralSaint | abyssSovereign | 3 | 99 | 278.3 | 77 |
| bonecaster | shark | 0 | 100 | 3.1 | 96 |
| bonecaster | ghost | 0 | 100 | 3 | 96 |
| bonecaster | dragon | 10 | 0 | 11.8 | 0 |
| bonecaster | dragon | 30 | 0 | 4.9 | 0 |
| bonecaster | templeOracle | 0 | 79 | 25.5 | 14 |
| bonecaster | abyssSovereign | 3 | 0 | 10.6 | 0 |

첫 환생 표본 (`check-progression-pace.mjs`, seed29, 장비/골드훈련/유료SP 없이 1분마다 배분·편성, 10분마다 사냥터 비교): 물리 5.94h/118패, 마법 11.54h/535패. 경험치 최적화를 위해 위험 지역을 선택하는 경로이며 추천 사냥 경로/보편적 소요시간이 아니다. 초반을 일괄 늘리지 않고 중후반 수련과 환생 연구에 장기 시간을 배치한다.

24시간 무배분 자동낚시 표본: 실제 43200턴 정상 실행, 약 3~4초 로컬 계산. 서버 환경 시간은 다를 수 있다. 원래 숙련/연구/환생 보존 및 보상 중복 방지 검사는 check-growth로 검증.

## 1년 전망은 속도 시나리오이며 실측이 아님

하루24시간 유효 방치, 숙련 보너스 없이 시간당100/300/900/1800승이면 연간 87.6만/262.8만/788.4만/1576.8만 숙련. 1800승은 2초마다 한 마리를 잡는 이론상 상한이다. 조건부 숙련이 적용되면 최대10배지만 대상 적·AP·전투시간의 대가가 있다. 3000만 연마는 전용 숙련 편성으로 장기간 집중할 목표이며 모든 스킬을 1년 안에 끝낸다는 설계가 아니다. 하루 실제 정산시간이 짧으면 더 오래 걸린다.

누적 연구 비용과 환생 소요시간이 서로 변하므로 1년 전체 완주를 검증했다고 주장하지 않는다. 실제 장기 지표(시간당 숙련, 진주/일, 동일 해역 패배율, 반복 선택되는 기술)를 통해 후속 수치 조정이 필요하다.
