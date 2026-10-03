'use client';
import { BookOpen, ChevronDown, Coins, Crosshair, Fish, Gauge, Heart, RefreshCw, Shield, Sparkles, Swords, Target, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { BALANCE, MONSTER_TUNING, STATUS_GUIDE, STATUS_TUNING, FIRST_AID_HEAL, SKILL_FORMULA } from '@/game/data/balance';
import { ATTRIBUTES, PROGRESSION, percent } from '@/game/data/progression';
import { ECONOMY, RESEARCH_RESET, offlineCapSeconds, inventoryCap } from '@/game/data/economy';
import { victoryHealRate } from '@/game/systems/encounter';
import type { State } from '@/game/types';
import { SWARM_UNLOCK } from '@/game/data/world';
import { VARIANTS, VARIANT_BOOK_MIN } from '@/game/data/variants';
import { ABYSS_SP_MILESTONES } from '@/game/data/long-term';
import { TAILWIND_WINDOW, TAILWIND_EXP, DEEP_VOYAGE_LEVEL, tailwindWindow, tailwindExp } from '@/game/systems/meta';
import { Heading } from './shared';
import { JOB_TREES, LINEAGES } from '@/game/data/classes';

/** 도움말 카드: 효과 → 조건 → 제한. 각 항목은 두세 문장으로 짧게 적습니다. */
function Rule({ icon, title, effect, condition, limit }: { icon: ReactNode; title: string; effect: ReactNode; condition?: ReactNode; limit?: ReactNode }) {
    return <section className="panel help-card help-rule">
        <h2>{icon} {title}</h2>
        <dl>
            <dt>효과</dt><dd>{effect}</dd>
            {condition && <><dt>조건</dt><dd>{condition}</dd></>}
            {limit && <><dt>제한</dt><dd>{limit}</dd></>}
        </dl>
    </section>;
}

/** 도움말 주제: 제목을 눌러 접고 펼칩니다. 첫 주제만 펼친 채로 시작합니다. */
function Topic({ icon, title, note, open = false, children }: { icon: ReactNode; title: string; note: string; open?: boolean; children: ReactNode }) {
    return <details className="help-section help-topic" open={open}>
        <summary className="section-title"><h2>{icon} {title}</h2><span>{note}</span><ChevronDown size={17} className="help-topic-chevron"/></summary>
        <div className="help-topic-body">{children}</div>
    </details>;
}

const STATUS_GROUPS = [
    { title: '행동 방해', ids: ['stun', 'silence', 'weaken'] },
    { title: '지속 피해 · 속도', ids: ['bleed', 'slow', 'haste'] },
] as const;

export function Guide({ s }: { s?: State }) {
    const swarm = VARIANTS.find(v => v.id === 'swarm')!;
    return <>
        <Heading eyebrow="CAPTAIN'S MANUAL" title="항해 도움말" description="제목을 누르면 접고 펼칩니다."/>
        <Topic open icon={<Target size={19}/>} title="능력치" note="기본치 + 레벨 성장 + 직접 배분. 직업·장비·스킬이 더해집니다.">
            <div className="help-stat-grid">{ATTRIBUTES.map(a => <article className="panel help-stat-card" key={a.id}><strong>{a.code} · {a.name}</strong><p>{a.description}</p></article>)}</div>
            <Rule icon={<Swords size={19}/>} title="계보와 전직"
                effect={<>직업은 일곱 계열({JOB_TREES.filter(t => t.id !== 'mystery').map(t => t.name).join(' · ')} · ???)의 {LINEAGES.filter(l => !l.id.endsWith('independent') && l.tree !== 'mystery').length}개 계보로 이어집니다. 1차는 Lv.10에 열리고, 계보를 따라 5차까지 올라갑니다.<br/>자주 가는 길: <b>작살 사냥꾼</b>(근력·기민, 관통·치명 물리) · <b>조류 술사</b>(지능·정신, 폭발 주문과 회복) · <b>산호 수호자</b>(체질·근력, 방어·기절) · <b>독술사</b>(기민·지능, 중독을 쌓는 상태이상) · <b>마검 수련생</b>(근력·지능, 물리+마법 복합) · <b>방랑 음유시인</b>(행운·정신, 가속·경험치 보조).</>}
                condition="전직 화면의 계보 카드와 항로도에서 다음 직업의 조건을 보고, 숙달한 직업은 조건 없이 다시 전직합니다."
                limit="능력치 재분배는 무료이며 자동 낚시 중에는 할 수 없습니다. ??? 계열은 문을 지나야 열리고, 한 번 열린 문은 계속 열려 있습니다."/>
            <p className="footnote help-notation"><b>표기</b> +10%: 비율 보너스(같은 종류끼리 합산) · +1%p: 확률에 그대로 더함 · ×1.2: 곱하는 배율. 능력치 화면의 수치를 누르면 기여 내역이 열립니다.</p>
        </Topic>
        <Topic icon={<Swords size={19}/>} title="전투" note="빠른 쪽이 먼저, 더 빠르면 한 턴에 여러 번 움직입니다.">
            <div className="help-flow">
                <div><b>1</b><strong>상태 처리</strong><p>상태이상 남은 턴, 회복, 기절을 먼저 처리합니다.</p></div>
                <div><b>2</b><strong>스킬 선택</strong><p>장착한 액티브를 위에서부터 조건·대기·마나·확률 순으로 확인하고, 모두 실패하면 기본 공격입니다.</p></div>
                <div><b>3</b><strong>명중 판정</strong><p>공격마다 한 번 판정합니다.</p></div>
                <div><b>4</b><strong>피해 계산</strong><p>공격 × 스킬 배율에 상대 방어·관통·치명타를 적용합니다.</p></div>
                <div><b>5</b><strong>추가타</strong><p>추가타가 있는 스킬은 같은 행동 안에서 이어집니다.</p></div>
            </div>
            <div className="help-columns">
                <Rule icon={<Zap size={19}/>} title="속도 · 연속 행동"
                    effect={`상대보다 빠르면 행동할 때마다 확률로 한 번 더 움직입니다. 확률 = ${BALANCE.chainCoefficient} × log₂(내 속도 ÷ 상대 속도).`}
                    condition={`${[1.5, 2, 4].map(r => `속도 ${r}배 ${Math.round(Math.min(1, BALANCE.chainCoefficient * Math.log2(r)) * 100)}%`).join(' · ')}. 추가 행동도 온전한 행동이라 대기·회복·지속 피해가 한 칸씩 진행됩니다.`}
                    limit={`한 턴에 최대 ${BALANCE.chainMaxActions}번. 속도에 상한은 없지만 효과는 4배에서 멈춥니다.`}/>
                <Rule icon={<Crosshair size={19}/>} title="명중 · 회피"
                    effect="실제 적중률 = 내 명중 − 상대 회피 + 속도 보정(최대 ±6%p). 마법 기술·마력 평타는 상대 회피를 절반만 받고 속도 보정의 마이너스를 받지 않습니다."
                    condition="명중·회피 수치는 확률이 아닙니다. 어종별 실제 적중률은 도감에서 봅니다."
                    limit="적중률은 1~99.5%. 회피는 50%를 넘으면 효율이 줄어 90%에 수렴합니다."/>
                <Rule icon={<Shield size={19}/>} title="반격 · 무리 사냥"
                    effect={`맞을 때마다 (내 방어 × 반격 계수)를 돌려줍니다. 물리 공격을 맞으면 물리 방어, 마법 공격을 맞으면 마법 방어 기준입니다. 공격자 방어는 ${Math.round((1 - SKILL_FORMULA.thornsPierce) * 100)}%만 적용합니다. 무리 ×N을 상대하면 반격이 (1 + log₂N)배: ×5 약 3.3배 · ×100 약 7.6배 · ×500 ${SKILL_FORMULA.swarmThornsCap}배.`}
                    condition="탱커 계보 패시브는 반격과 함께 무리 조우 확률을 올립니다(+30~120%). 탱커는 1:1이 느린 대신 무리를 반격으로 갈아 마리 수만큼 보상을 받는 길입니다."
                    limit="반격은 흡혈이 2배로 적용되고, 피해 없는 상태이상 기술에는 발동하지 않습니다."/>
            </div>
            <details className="help-fold">
                <summary><Sparkles size={15}/> 피해의 종류 <span>물리 · 마법 · 복합 · 마력 평타 · 능력치 비례</span><ChevronDown size={15} className="help-topic-chevron"/></summary>
                <div className="help-columns">
                    <Rule icon={<Swords size={19}/>} title="물리 피해"
                        effect="물리 공격 × 스킬 배율. 상대의 물리 방어로 줄어듭니다: 피해 × 100 ÷ (100 + 물리 방어 × 2)."
                        condition="명중은 기본 공식 그대로(회피 전부 적용). 기본 공격과 대부분의 작살·격투 계열 기술이 여기에 속합니다."
                        limit={`방어 관통은 최대 85%. 관통만큼 상대 방어를 무시합니다.`}/>
                    <Rule icon={<Sparkles size={19}/>} title="마법 피해"
                        effect="마법 공격 × 스킬 배율. 상대의 마법 방어로 줄어듭니다: 피해 × 100 ÷ (100 + 마법 방어 × 2). 마나를 씁니다."
                        condition="상대 회피를 절반만 받고 속도 보정의 마이너스를 받지 않습니다. 단단한 비늘(물리 방어 높음) 어종에 유리하고, 마력 생물(마법 방어 높음)에는 불리합니다."
                        limit="마나가 모자라면 그 기술은 건너뛰고 다음 기술이나 기본 공격으로 넘어갑니다."/>
                    <Rule icon={<Shield size={19}/>} title="복합 피해"
                        effect={`원시 피해를 물리 ${Math.round(SKILL_FORMULA.splitPhysical * 100)}% · 마법 ${Math.round((1 - SKILL_FORMULA.splitPhysical) * 100)}%로 나누어 각각의 방어를 따로 적용한 뒤 더합니다.`}
                        condition="명중·치명타 판정은 한 번만 합니다. 한쪽 방어만 높은 어종에게 안정적입니다."
                        limit="명중은 물리 규칙을 따릅니다(마법의 회피 절반 보정 없음)."/>
                    <Rule icon={<Zap size={19}/>} title="마력 평타"
                        effect={`마법 직업의 기본 공격이 확률로 마력 평타(마법 공격 × ${SKILL_FORMULA.arcaneStrikeRatio}, 3차부터 +${Math.round(SKILL_FORMULA.arcaneRatioByTier[3] * 100)}~${Math.round(SKILL_FORMULA.arcaneRatioByTier[5] * 100)}%p)로 바뀝니다. 마나를 쓰지 않는 마법 피해입니다.`}
                        condition="마법 피해라서 회피 절반 보정을 받고 마법 방어로 줄어듭니다. 어종의 마법 평타(마력 생물)도 같은 규칙으로 나를 때립니다."
                        limit="스킬이 하나도 나가지 않은 행동에서만 발생합니다."/>
                    <Rule icon={<Target size={19}/>} title="능력치 · 기록 비례"
                        effect="외길 계보는 공격력 대신 배분 능력치 × 비율을 기준값으로, 육중 조화는 여섯 능력치로 만든 원시 피해를 씁니다. 도감·포획·사냥·골드 비례 기술은 기본 피해에 기록 배율을 곱합니다."
                        condition="피해 유형(물리/마법)은 기술에 표시된 대로 따르며, 방어·명중 규칙도 그 유형을 따릅니다. 힘법사 계열은 반대 공격력을 기준값으로 쓰는 ‘교차’ 기술입니다."
                        limit="장비·버프로 오른 공격력은 능력치 비례 기준값에 들어가지 않습니다."/>
                </div>
            </details>
        </Topic>
        <Topic icon={<Gauge size={19}/>} title="상태이상" note={`${STATUS_GUIDE.length}종. PvE와 결투에 같은 규칙입니다.`}>
            {STATUS_GROUPS.map(g => <div className="help-status-group" key={g.title}>
                <h3>{g.title}</h3>
                <div className="help-status-grid">{STATUS_GUIDE.filter(st => (g.ids as readonly string[]).includes(st.id)).map(status => <article className="panel help-status-card" key={status.id}>
                    <div className="help-status-top"><strong>{status.name}</strong><span>{status.kind}</span></div>
                    <p>{status.description}</p>
                    <small>{status.detail}</small>
                </article>)}</div>
            </div>)}
            <p className="footnote help-status-rules"><b>공통</b> 이미 걸린 상태이상은 다시 걸지 않고 그 기술을 건너뜁니다(중독은 계속 쌓임). 풀린 뒤 기절 {STATUS_TUNING.immuneTurns.stun}턴, 그 밖 {STATUS_TUNING.immuneTurns.slow}턴은 같은 상태이상에 면역입니다.</p>
        </Topic>
        <Topic icon={<Zap size={19}/>} title="스킬" note="발동, 습득·계승, 숙련과 연마.">
            <div className="help-columns">
                <Rule icon={<Zap size={19}/>} title="액티브"
                    effect="전투 중 발동 확률에 따라 자동으로 씁니다. 편성 순서대로 판정해 처음 성공한 하나만 사용합니다."
                    condition="마나·재사용 대기·스킬별 조건(체력 비율 등)을 채워야 합니다."
                    limit={`장착 개수 제한은 없고 총 AP만 제한합니다. 추가타는 최대 ${STATUS_TUNING.maxExtraAttacks}회.`}/>
                <Rule icon={<Sparkles size={19}/>} title="습득 · 계승 · 강화"
                    effect="전직하면 그 직업의 기술을 Lv.0으로 얻습니다. 장착한 채 포획해 첫 숙련을 채우면 다른 직업에서도 씁니다."
                    condition="해금한 기술에 한해 계승·강화에 각각 1 SP."
                    limit="SP는 도감 최종 연구, 던전 첫 정복 연구, 심연 이정표에서만 얻습니다."/>
                <Rule icon={<Target size={19}/>} title="숙련 · 연마"
                    effect="포획할 때마다 현재 직업과 장착한 스킬의 숙련이 기본 1 오릅니다. 기본 숙련을 마치면 연마 30단계가 이어져 단계마다 직접 피해·양수 패시브 +0.8%."
                    condition={`조건부 숙련 스킬은 지정한 적을 이겼을 때만 더 줍니다. 포획 1회당 최대 ${PROGRESSION.maxMasteryPerVictory}.`}
                    limit="연마는 SP로 건너뛸 수 없고 AP·발동률은 늘지 않습니다. 숙련은 환생과 전직 뒤에도 남습니다."/>
                <Rule icon={<BookOpen size={19}/>} title="경험치 배율"
                    effect="경험치 배율 = 1 + 환생 + 진주 연구 + 직업 + 장착 스킬."
                    condition="해역 난이도를 올리면 적이 강해지는 대신 경험치·골드·장비 레벨이 오릅니다."/>
            </div>
        </Topic>
        <Topic icon={<Shield size={19}/>} title="직업" note="숙달하면 그 직업의 보너스가 커집니다.">
            <div className="help-columns">
                <Rule icon={<Shield size={19}/>} title="직업 숙달"
                    effect="직업별 숙련 목표를 채우면 그 직업의 체력·공격·방어 보너스가 강화됩니다. 전직 화면에서 전후를 비교할 수 있습니다."
                    condition="그 직업을 쓰는 동안만 적용됩니다. 숙달한 직업은 조건 없이 다시 전직할 수 있습니다."
                    limit="페널티·치명타·경험치 보너스는 숙달로 변하지 않습니다."/>
            </div>
        </Topic>
        <Topic icon={<Fish size={19}/>} title="사냥 · 던전 · 생존" note="변종, 던전 반복, 회복과 방치 진행.">
            <div className="help-columns">
                <Rule icon={<Fish size={19}/>} title="변종(희귀어)"
                    effect={<>같은 어종인데 특이한 개체입니다. {VARIANTS.filter(v => v.id !== 'swarm').map(v => <span key={v.id}><br/>{v.mark} <b>{v.name}</b> {percent(v.chance, 1)} · {v.desc}</span>)}<br/>✦ <b>황금 개체</b> · 포획 순간 따로 판정, 그 한 마리 골드 10배. 난파선 수집가 계보 패시브(전리품 감지·심해 인양·보물왕의 창고·전설의 보고)가 확률을 올립니다.</>}
                    condition={`낚시터에서 그 어종을 ${VARIANT_BOOK_MIN}회 이상 포획한 뒤부터 입질마다 판정합니다. 해초림 테마 +10%. 난파선 수집가 계보 패시브가 확률을 올립니다(난파선 감식 +20% · 무리 감지 +50% · 전설의 보고 +100% 등).`}
                    limit="던전과 보스에는 변종이 없습니다. 지금 확률은 능력치 화면 아래 ‘변종 조우 확률’에서 봅니다."/>
                <Rule icon={<Fish size={19}/>} title="무리 변종"
                    effect={`포획당 ${percent(swarm.chance, 1)}. 무리 전체를 체력 ×N인 한 개체로 상대하고, 포획하면 보상·숙련·도감을 마리 수만큼 받습니다.`}
                    condition={`규모는 도감 포획 수로 정해집니다. ${SWARM_UNLOCK[5]}회 ×5, ${SWARM_UNLOCK[100].toLocaleString()}회 ×100, ${SWARM_UNLOCK[500].toLocaleString()}회에 희귀어 추적자의 ‘무리 감지’(Lv.30)를 장착하면 ×500.`}
                    limit="적 방어는 한 마리와 같고, 공격은 ×500에서만 490배입니다. 포획 전에 쓰러지면 보상이 없습니다."/>
                <Rule icon={<Swords size={19}/>} title="던전 · 무한 심연"
                    effect={`정해진 횟수 또는 실패할 때까지 자동으로 다시 도전합니다. 심연은 10층마다 보너스 진주, ${ABYSS_SP_MILESTONES.join('·')}층 첫 돌파에 SP 1, 30·60·90층에 장착 AP 1.`}
                    condition="던전 카드에서 반복을 고른 뒤 도전합니다. 입장 후 6초 준비가 끝나면 체력·마나가 회복됩니다."
                    limit={`던전에서는 포획 후 회복이 ${percent(MONSTER_TUNING.dungeonHealAfterKill)}입니다. 반복이 끝나면 낚시터로 돌아옵니다.`}/>
                <Rule icon={<Heart size={19}/>} title="생존 · 방치 진행"
                    effect={`포획 후 최대 체력의 ${percent(BALANCE.healAfterKill)}를 회복합니다${s ? `(지금 ${percent(victoryHealRate({ ...s, dungeon: null }))})` : ''}. 응급처치 패시브는 포획마다 ${percent(FIRST_AID_HEAL)}를 더 회복합니다.`}
                    condition={`패배하면 잃는 것 없이 ${BALANCE.recoveryTurns}턴 회복한 뒤 다시 싸웁니다. 자리를 비운 시간도 서버가 턴으로 계산합니다.`}
                    limit={`방치 정산은 기본 ${BALANCE.offlineCapSeconds / 3600}시간${s ? `(지금 ${offlineCapSeconds(s) / 3600}시간)` : ''}, 가방은 기본 ${BALANCE.inventoryCap}칸${s ? `(지금 ${inventoryCap(s)}칸)` : ''}. 둘 다 진주 연구로 늘어납니다.`}/>
            </div>
        </Topic>
        <Topic icon={<RefreshCw size={19}/>} title="성장 · 재화" note="환생, 진주 연구, 도감, 상점.">
            <div className="help-columns">
                <Rule icon={<RefreshCw size={19}/>} title="환생"
                    effect="진주 = 레벨 ÷ 10 + 환생 횟수 보상 + 연구·스킬 보너스 + 깊은 항해 보너스. 영구 보너스(체력·공격·방어)는 2.5% × √환생 횟수, 영구 경험치는 환생마다 +25%."
                    condition={`요구 레벨은 30에서 환생마다 +${ECONOMY.rebirthLevelStep}, 최대 Lv.${ECONOMY.rebirthLevelCap}. 요구 레벨 +${s ? tailwindWindow(s) : TAILWIND_WINDOW} 안에 환생하면 다음 생 경험치 +${Math.round((s ? tailwindExp(s) : TAILWIND_EXP) * 100)}%(순풍), Lv.${DEEP_VOYAGE_LEVEL}에 환생하면 숙련 기본 획득 +2(깊은 항해).`}
                    limit={`횟수 보상은 20회까지 회당 진주 1·경험치 +25%, 이후 완만해집니다. 환생 AP 최대 ${ECONOMY.rebirthAPCap}, 해역 난이도 최대 ${ECONOMY.tideCap}. 칭호는 업적(환생 횟수·도전·심연)을 달성하면 얻고, 능력치 화면의 ‘칭호’에서 장착하거나 숨깁니다.`}/>
                <Rule icon={<Sparkles size={19}/>} title="진주 연구"
                    effect="진주로 영구 능력을 올립니다. 환생해도 유지되며 전투·유틸·골드 탭으로 나뉩니다."
                    condition="단계가 오를수록 비용이 커집니다. 일부 연구는 정해진 환생 횟수 뒤에 열립니다."
                    limit={`탭별 재분배는 첫 1회 ${RESEARCH_RESET.firstRefund * 100}%, 이후 ${RESEARCH_RESET.refund * 100}%를 돌려받습니다. 자동 낚시·던전 중에는 할 수 없습니다.`}/>
                <Rule icon={<BookOpen size={19}/>} title="물고기 도감"
                    effect={`종별 연구 ${BALANCE.bookMilestones.map(n => n.toLocaleString()).join(' · ')}회 포획에 골드, 최종 단계에 SP 1. 단계마다 어종 성향의 능력치가 오르고 2단계부터 그 어종 상대 피해 보정이 붙습니다.`}
                    condition={`${PROGRESSION.fishComplete}회 포획하면 완성이고 적 정보가 열립니다. 지역의 모든 종을 완성하면 AP +1과 지역 테마 보너스.`}
                    limit="보상은 도감에서 직접 받고 각 단계는 한 번만 줍니다. 합계는 도감 ‘연구 보너스’ 탭에서 봅니다."/>
                <Rule icon={<Coins size={19}/>} title="상점 · 장비"
                    effect={`감정은 희귀 이상을 보장하고, 확정 구매는 표시된 등급 그대로입니다. 강화 1회당 기본 수치 +${percent(ECONOMY.enhanceGain)}, 최대 +${ECONOMY.enhanceMax}(전설 이상 +${ECONOMY.enhanceMaxLegend}).`}
                    condition="판매가는 등급·레벨에 비례하고 강화 비용의 30%를 돌려받습니다. 분해는 골드 대신 정수를 줍니다."
                    limit="구매·옵션 변경 비용은 돌려받지 않습니다. 일반 장비는 환생 때 정리됩니다(판매/분해는 설정에서 고름)."/>
            </div>
        </Topic>
        <Topic icon={<Gauge size={19}/>} title="저장 데이터" note="초기화 규칙.">
            <div className="help-columns">
                <Rule icon={<Gauge size={19}/>} title="데이터 초기화"
                    effect="이름만 남기고 레벨·환생·장비·도감·길드·랭킹 등록까지 새 게임으로 돌아갑니다."
                    condition="환생 화면 ‘저장 데이터 관리’에서 자동 낚시와 던전을 멈춘 뒤 실행합니다."
                    limit="되돌릴 수 없습니다."/>
            </div>
        </Topic>
    </>;
}
