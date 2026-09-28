import { BookOpen, Coins, Crosshair, Fish, Gauge, Heart, Shield, Sparkles, Swords, Target, Zap } from 'lucide-react';
import { BALANCE, MONSTER_TUNING, STATUS_GUIDE } from '@/game/data/balance';
import { PROGRESSION } from '@/game/data/progression';
import { ENCOUNTER_POWER } from '@/game/data/world';
import { Heading } from './shared';

const attributes = [
    ['STR · 근력', '물리 공격 +2 · 물리 방어 +0.25'],
    ['DEX · 기민', '명중 +0.4%p · 회피 +0.2%p · 속도 +0.5'],
    ['INT · 지능', '마법 공격 +2.4 · 최대 마나 +1'],
    ['VIT · 체질', '최대 체력 +9 · 물리 방어 +0.6'],
    ['WIS · 정신', '마법 방어 +1.2 · 최대 마나 +3 · 마나 회복 +0.15'],
    ['LUK · 행운', '치명타·치명 피해·장비 드롭·골드 획득을 함께 높입니다.'],
];

export function Guide() {
    return <>
        <Heading eyebrow="CAPTAIN'S MANUAL" title="항해 도움말" description="스탯이 전투에 어떻게 연결되는지, 자동 전투가 어떤 순서로 판정되는지 정리했습니다." />
        <section className="help-section">
            <div className="section-title"><h2><Target size={19}/> 능력치</h2><span>기본 능력치에 레벨·장비·직업·스킬이 합산됩니다.</span></div>
            <div className="help-stat-grid">{attributes.map(([name, desc]) => <article className="panel help-stat-card" key={name}><strong>{name}</strong><p>{desc}</p></article>)}</div>
        </section>
        <section className="help-section">
            <div className="section-title"><h2><Swords size={19}/> 한 턴의 전투 순서</h2><span>플레이어와 물고기가 각각 행동합니다.</span></div>
            <div className="help-flow">
                <div><b>1</b><strong>상태 처리</strong><p>출혈·약화·침묵·감속/가속의 남은 턴과 마나 회복·기절을 먼저 처리합니다.</p></div>
                <div><b>2</b><strong>스킬 판정</strong><p>장착한 모든 액티브를 우선순위 순서대로 조건·쿨다운·마나·발동 확률을 확인합니다.</p></div>
                <div><b>3</b><strong>명중 판정</strong><p>내 명중 − 상대 회피 + 속도 보정를 1~99.5% 범위로 적용합니다.</p></div>
                <div><b>4</b><strong>피해 계산</strong><p>물리/마법 공격과 상대 방어, 관통, 치명타를 반영합니다.</p></div>
                <div><b>5</b><strong>추가타</strong><p>쌍갈고리·촉수 난무처럼 추가타가 있는 스킬은 같은 행동 안에서 제한된 후속 타격을 냅니다.</p></div>
            </div>
        </section>
        <section className="help-section">
            <div className="section-title"><h2><Gauge size={19}/> 상태이상 사전</h2><span>{STATUS_GUIDE.length}종의 상태가 같은 규칙으로 PvE·PvP에 적용됩니다.</span></div>
            <div className="help-status-grid">{STATUS_GUIDE.map(status => <article className="panel help-status-card" key={status.id}>
                <div className="help-status-top"><strong>{status.name}</strong><span>{status.kind}</span></div>
                <p>{status.description}</p>
                <small>{status.detail}</small>
            </article>)}</div>
        </section>
        <div className="help-columns">
            <section className="panel help-card"><h2>숙련 → 특화 → 보스 연구</h2><p>액티브 스킬의 실전 숙련 1단계를 달성하면 스킬 화면에서 특화를 하나 선택할 수 있습니다. 정밀 챔질은 회피 대응, 상처 추적·약점 해류는 상태이상 연계, 마나 절약은 긴 전투에 사용합니다. 특화마다 피해 감소 등의 대가가 있으므로 기본형도 유효한 선택입니다.</p><p>보스 첫 정복 연구에서는 SP와 일부 특화를 얻습니다. 조수의 동굴은 봉인 추격, 해초 묘실은 정화의 숨, 닻의 묘지는 닻 파쇄, 검은 화구 제단은 촉수의 잔향을 엽니다. 던전 화면에서 보상을 한 번 수령하면 환생 후에도 해금이 유지됩니다. 이전에 정복한 기록도 인정합니다.</p><p>특화 변경은 낚시 중단·던전 귀환 후 무료입니다. SP로 성장 레벨을 올려도 실전 숙련 1단계를 대신하지 않습니다.</p></section>
            <section className="panel help-card"><h2>이번 항해에서 남길 목표</h2><p>스킬·전직·던전 화면에서 목표를 정하면 자동 낚시와 환생 화면에서 남은 조건을 확인할 수 있습니다. 스킬 목표는 선택 당시의 다음 실전 숙련 단계이며, 달성해도 자동으로 더 높은 목표로 바뀌지 않습니다.</p><p>경험치를 올려 환생을 앞당길지, 익숙한 적에게서 기술을 숙련할지는 자유롭게 선택하세요. 일반 숙련은 적의 강함과 관계없이 승리당 1이며, 기존 조건부 숙련 패시브의 추가 보상도 유지됩니다.</p></section>
            <section className="panel help-card">
                <h2><Crosshair size={19}/> 명중·회피</h2>
                <p>명중은 내 공격과 상태이상이 빗나가지 않을 확률을 높입니다. 회피는 상대의 공격과 그 공격에 붙은 기절·출혈 같은 효과를 함께 피할 확률을 높입니다.</p>
                <div className="help-formula">내 명중률 = 내 명중 − 상대 회피 + 속도 보정<br/>적 명중률 = 적 명중 − 내 회피 + 속도 보정<br/><small>최소 1% · 최대 99.5% · 속도비에 따라 ±6%p<br/>스킬 특화·가속·감속은 실제 공격에 추가 반영<br/>명중 120% 제한 폐지 · 회피 50% 초과분은 점차 효율 감소(90%에 수렴)</small></div>
            </section>
            <section className="panel help-card">
                <h2><Zap size={19}/> 액티브 스킬</h2>
                <p>장착한 액티브는 위에서부터 조건·쿨다운·마나·발동 확률을 판정합니다. 앞 스킬이 실패하면 다음으로 넘어가며, 모두 실패하면 기본 공격을 합니다. 액티브·패시브 개수 제한은 없고 총 AP만 제한됩니다. 추가타는 스킬별 횟수·배율을 따르며 최대 2회로 제한됩니다.</p>
                <p className="help-note">전직하면 해당 직업의 기술을 SP 없이 기본 Lv.0으로 얻습니다. 장착한 채 승리해 첫 숙련을 달성하면 다른 직업에서도 무료로 계승합니다. 해금한 기술에 한해 계승 또는 강화에 각각 1 SP를 쓸 수 있습니다. 스킬의 자세히 보기에서 모든 성장 단계의 실제 효과를 비교할 수 있습니다. SP와 숙련은 동일한 성장 단계를 열며 합산하지 않습니다. SP를 써도 숙련 성장은 계속되고, 전직의 선행조건에는 실제 누적 숙련도만 인정됩니다.</p>
            </section>
            <section className="panel help-card">
                <h2><BookOpen size={19}/> 경험치와 조건부 숙련</h2>
                <p>경험치 획득 배율은 1 + 환생 보너스 + 진주 연구 + 현재 직업 + 장착 스킬입니다. 능력치 화면의 경험치 획득 증가와 배율은 실제 포획 보상에 적용되는 값입니다.</p>
                <p className="help-note">승리 시 현재 직업과 장착한 사용 가능 스킬의 숙련도가 기본 1 증가합니다. 거수 관찰일지 등은 지정된 적을 이겼을 때만 추가 숙련을 줍니다. 조건이 겹치면 가장 큰 보너스 하나만 적용하며 한 번의 승리당 최대 10입니다. 도감 포획 수는 여전히 1만 증가합니다.</p>
            </section>
            <section className="panel help-card">
                <h2><Zap size={19}/> 숙련으로 해금하는 보스 기술</h2>
                <p>메아리 조련사는 직업 숙련도 6,000에서 무음의 포효를, 심연 모사체는 20,000에서 촉수 난무를 무료 해금합니다. 이 최초 해금 조건은 SP로 건너뛸 수 없습니다. 해금한 뒤에는 다른 스킬처럼 장착 숙련이나 SP로 강화·계승합니다.</p>
                <p className="help-note">몬스터 스킬명은 전투 중앙에, 피해·회복 숫자는 해당 HP 바에 표시합니다. 기절·침묵·출혈·약화·감속·가속은 영향을 받은 캐릭터 이름 옆에서 확인합니다.</p>
            </section>
            <section className="panel help-card">
                <h2><Shield size={19}/> 직업 숙달 보너스</h2>
                <p>직업별 숙련 목표를 채우면 해당 직업의 체력·공격·방어 보너스가 강화됩니다. 전직 화면에서 숙달 전후 수치를 비교하세요. 강화된 보너스는 그 직업을 선택한 동안에만 적용되고, 다른 직업으로 옮기면 이전 보너스는 적용되지 않습니다. 숙련 기록은 계속 남습니다.</p>
                <p className="help-note">페널티·치명타·경험치 보너스는 숙달로 변하지 않습니다.</p>
            </section>
            <section className="panel help-card">
                <h2><Coins size={19}/> 항구 상점과 전리품 감지</h2>
                <p>상점에서 낚싯대·방어구·나침반을 감정할 수 있습니다. 낚싯대는 물리형과 마법형이 같은 확률입니다. 장비 강화 탭에서 착용 장비를 강화하세요.</p>
                <p className="help-note">전리품 감지(이전 이름: 희귀어 감지)는 장비 드롭 확률과 골드 보상을 높입니다. 희귀 물고기 출현률·장비 등급·상점 감정 확률에는 영향을 주지 않습니다.</p>
            </section>
            <section className="panel help-card">
                <h2><Heart size={19}/> 생존과 회복</h2>
                <p>전투 승리 후 체력의 16%를 회복합니다. 패배해도 장비·골드 손실 없이 3턴 회복한 뒤 다시 전투합니다.</p>
            </section>
            <section className="panel help-card">
                <h2><Gauge size={19}/> 방치 진행</h2>
                <p>자동 낚시 중 접속하지 않은 시간도 서버가 최대 24시간까지 실제 턴으로 계산합니다. 일시정지 중에는 보상이 쌓이지 않습니다.</p>
            </section>
            <section className="panel help-card">
                <h2><Sparkles size={19}/> 환생</h2>
                <p>레벨 30부터 환생할 수 있습니다. 진주·SP·도감·스킬 해금·SP 계승·강화·숙련·유물·길드·랭킹은 유지되고, 일반 장비·골드·레벨·진행 중 전투는 초기화됩니다.</p>
            </section>
            <section className="panel help-card">
                <h2><Shield size={19}/> 데이터 초기화</h2>
                <p>환생 화면의 위험 구역에서 자동 낚시와 던전을 멈춘 뒤 전체 데이터를 초기화할 수 있습니다. 캐릭터 이름만 남고 레벨·환생·장비·도감·길드·랭킹 등록 정보까지 새 게임처럼 돌아갑니다.</p>
            </section>
            <section className="panel help-card">
                <h2><Coins size={19}/> 골드와 던전</h2>
                <p>골드는 상점·감정·강화·길드 기부에 사용합니다. 골드 획득 보너스는 포획과 던전 보상에만 적용되며 장비 판매가에는 적용되지 않습니다. 던전 탐험 화면에서 웨이브·보스·현재 HP·최근 로그를 확인할 수 있습니다.</p>
            </section>
            <section className="panel help-card">
                <h2><Fish size={19}/> 희귀어와 보스</h2>
                <p>희귀·영웅·전설 물고기는 일반 개체보다 낮은 출현 가중치와 높은 보상을 가집니다. 각 던전의 마지막 웨이브는 별도 보스 개체이며 전용 스킬 프로필을 사용합니다. 일부 보스 스킬은 몬스터 계열 직업의 플레이어 스킬로도 계승됩니다.</p>
            </section>
            <section className="panel help-card">
                <h2><Gauge size={19}/> 강화 개체</h2>
                <p>전투는 계속 1:1로 유지합니다. 이후 수역이나 던전에 <b>x{ENCOUNTER_POWER.elite.multiplier} {ENCOUNTER_POWER.elite.label}</b> 또는 <b>x{ENCOUNTER_POWER.mythic.multiplier} {ENCOUNTER_POWER.mythic.label}</b>을 배치하면 한 마리의 체력·공격·보상이 함께 커져 다수 전투에 가까운 파밍 밀도를 만들 수 있습니다.</p>
            </section>
        </div>
        <div className="notice"><BookOpen size={18}/><span>도감 연구는 {BALANCE.bookMilestones.map(n => n.toLocaleString()).join(' · ')}회에 골드를 주고, 최종 10,000회 연구에서만 1 SP를 줍니다. 시작 SP와 레벨업 SP 지급은 없습니다. 이미 받은 SP는 업데이트로 사라지지 않습니다. 한 종을 {PROGRESSION.fishComplete}회 연구하면 완성으로 처리되고, 지역 내 모든 종을 완성한 지역 연구에서 AP +1과 최대 체력 +20을 얻습니다. 일반 물고기는 HP ×{MONSTER_TUNING.hpMultiplier.toFixed(2)} · 공격 ×{MONSTER_TUNING.attackMultiplier.toFixed(2)} · 방어 ×{MONSTER_TUNING.defenseMultiplier.toFixed(2)} 기본 보정에 더해 고레벨일수록 체력·공격·방어가 강해집니다. 던전은 입장 후 6초 준비, 웨이브별 추가 강화, 처치 후 체력 8% 회복이 적용됩니다. 보스 전투 강화와 경험치 배율은 별개입니다. 랭킹은 직접 등록한 스냅샷으로 비동기 결투를 진행합니다.</span></div>
    </>;
}
