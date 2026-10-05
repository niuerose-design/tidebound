'use client';
import { SPROUT, sproutExp } from '@/game/data/sprout';
import { BookOpen, ChevronDown, Coins, Crosshair, Fish, Flame, Gauge, Heart, RefreshCw, Shield, Sparkles, Swords, Target, Zap , Droplets } from 'lucide-react';
import type { ReactNode } from 'react';
import { BALANCE, MONSTER_TUNING, STATUS_GUIDE, STATUS_TUNING, SKILL_FORMULA, DUNGEON_MODES } from '@/game/data/balance';
import { ATTRIBUTES, PROGRESSION, percent } from '@/game/data/progression';
import { ECONOMY, RESEARCH_RESET, offlineCapSeconds, inventoryCap } from '@/game/data/economy';
import { STARFORCE } from '@/game/data/starforce';
import { victoryHealRate } from '@/game/systems/encounter';
import type { State } from '@/game/types';
import { SWARM_UNLOCK } from '@/game/data/world';
import { VARIANTS, VARIANT_BOOK_MIN } from '@/game/data/variants';
import { ABYSS_SP_MILESTONES } from '@/game/data/long-term';
import { RANKS, RANK_PERKS, RANK_TOTAL_POINTS } from '@/game/data/rank';
import { ALTAR, BLESSINGS, RAID, RAIDS } from '@/game/data/altar';
import { MIMIC } from '@/game/data/mimic';
import { EXP_NURI } from '@/game/data/exp-nuri';
import { TAILWIND_WINDOW, TAILWIND_EXP, DEEP_VOYAGE_LEVEL, tailwindWindow, tailwindExp, LEVEL_GATE_FREE_REBIRTHS } from '@/game/systems/meta';
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

/** 도움말 주제: 제목을 눌러 접고 펼칩니다. v27.81 모든 주제가 접힌 채로 시작합니다. */
function Topic({ icon, title, note, open = false, children }: { icon: ReactNode; title: string; note: string; open?: boolean; children: ReactNode }) {
    return <details className="help-section help-topic" open={open}>
        <summary className="section-title"><h2>{icon} {title}</h2><span>{note}</span><ChevronDown size={17} className="help-topic-chevron"/></summary>
        <div className="help-topic-body">{children}</div>
    </details>;
}

const STATUS_GROUPS = [
    { title: '행동 방해', ids: ['stun', 'silence', 'weaken'] },
    { title: '지속 피해 · 속도', ids: ['bleed', 'poison', 'burn', 'slow', 'haste'] },
] as const;

export function Guide({ s }: { s?: State }) {
    const swarm = VARIANTS.find(v => v.id === 'swarm')!;
    return <>
        <Heading eyebrow="ADVENTURER'S MANUAL" title="모험 도움말" description="주제는 모두 접혀 있습니다. 제목을 누르면 펼치고 다시 누르면 접습니다."/>
        <Topic icon={<Target size={19}/>} title="능력치" note="기본치 + 레벨 성장 + 직접 배분. 직업·장비·스킬이 더해집니다.">
            <div className="help-stat-grid">{ATTRIBUTES.map(a => <article className="panel help-stat-card" key={a.id}><strong>{a.code} · {a.name}</strong><p>{a.description}</p></article>)}</div>
            <Rule icon={<Swords size={19}/>} title="계보와 전직"
                effect={<>직업은 일곱 계열({JOB_TREES.filter(t => t.id !== 'mystery').map(t => t.name).join(' · ')} · ???)의 {LINEAGES.filter(l => !l.id.endsWith('independent') && l.tree !== 'mystery').length}개 계보로 이어집니다. 1차는 Lv.10에 열리고, 계보를 따라 5차까지 올라갑니다.<br/>자주 가는 길: <b>아처</b>(근력·기민, 관통·치명 물리) · <b>매지션</b>(지능·정신, 폭발 주문과 회복) · <b>검사</b>(체질·근력, 방어·기절) · <b>매지션(불,독)</b>(기민·지능, 중독을 쌓는 상태이상) · <b>데몬슬레이어 (1차)</b>(근력·지능, 물리+마법 복합) · <b>엔젤릭버스터 (1차)</b>(행운·정신, 가속·경험치 보조).</>}
                condition="전직 화면의 계보 카드와 항로도에서 다음 직업의 조건을 보고, 숙달한 직업은 조건 없이 다시 전직합니다."
                limit="능력치 재분배는 무료이며 자동 사냥 중에는 할 수 없습니다. ??? 계열은 윤회의 문(환생마다 추첨)이나 발견의 문(플레이 기록 조건)을 지나야 열리고, 한 번 열린 문은 계속 열려 있습니다."/>
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
                    condition="명중·회피 수치는 확률이 아닙니다. 몬스터별 실제 적중률은 도감에서 봅니다."
                    limit="적중률은 1~99.5%. 기민을 뺀 회피 소스(패시브·장비·연구·직업)는 합쳐서 60%p까지만 세고, 기민 회피는 그 위에 더합니다. 회피는 50%를 넘으면 효율이 줄어 90%에 수렴합니다."/>
                <Rule icon={<Shield size={19}/>} title="반격 · 무리 사냥"
                    effect={`맞을 때마다 (내 방어 × 반격 계수)를 돌려줍니다. 물리 공격을 맞으면 물리 방어, 마법 공격을 맞으면 마법 방어 기준입니다. 공격자 방어는 ${Math.round((1 - SKILL_FORMULA.thornsPierce) * 100)}%만 적용합니다. 무리 ×N을 상대하면 반격이 (1 + log₂N)배: ×5 약 3.3배 · ×100 약 7.6배 · ×500 ${SKILL_FORMULA.swarmThornsCap}배.`}
                    condition="탱커 계보 패시브는 반격과 함께 무리 조우 확률을 올립니다(+30~120%). 탱커는 1:1이 느린 대신 무리를 반격으로 갈아 마리 수만큼 보상을 받는 길입니다."
                    limit="반격은 흡혈이 2배로 적용되고, 피해 없는 상태이상 기술에는 발동하지 않습니다."/>
            </div>
            <details className="help-fold">
                <summary><Sparkles size={15}/> 피해의 종류 <span>물리 · 마법 · 복합 · 지속(고정) · 마력 평타 · 능력치 비례</span><ChevronDown size={15} className="help-topic-chevron"/></summary>
                <div className="help-columns">
                    <Rule icon={<Swords size={19}/>} title="물리 피해"
                        effect="물리 공격 × 스킬 배율. 상대의 물리 방어로 줄어듭니다: 피해 × 100 ÷ (100 + 물리 방어 × 2)."
                        condition="명중은 기본 공식 그대로(회피 전부 적용). 기본 공격과 대부분의 검·격투 계열 기술이 여기에 속합니다."
                        limit={`방어 관통은 최대 85%. 관통만큼 상대 방어를 무시합니다.`}/>
                    <Rule icon={<Droplets size={19}/>} title="지속 피해 (고정 피해)"
                        effect="출혈·중독·화상·부식은 물리도 마법도 아닌 고정 피해입니다. 걸릴 때 시전자의 공격력으로 틱 피해가 정해지고, 그 뒤로는 걸린 쪽이 행동할 때마다 그 값이 체력에서 그대로 빠집니다."
                        condition="물리·마법 방어, 방어 관통, 회피, 반격, 생태 연구 보정, 흡혈이 모두 적용되지 않습니다. 기절 중에도 들어갑니다."
                        limit="면역(풀린 뒤 1턴), 정화 기술, 無처럼 쓰러지지 않는 장치로만 막을 수 있습니다. 중독은 중첩마다, 출혈은 한 번만 최대 체력 1%분을 더합니다."/>
                    <Rule icon={<Sparkles size={19}/>} title="마법 피해"
                        effect="마법 공격 × 스킬 배율. 상대의 마법 방어로 줄어듭니다: 피해 × 100 ÷ (100 + 마법 방어 × 2). 마나를 씁니다."
                        condition="상대 회피를 절반만 받고 속도 보정의 마이너스를 받지 않습니다. 단단한 껍질(물리 방어 높음) 몬스터에 유리하고, 마력 생물(마법 방어 높음)에는 불리합니다."
                        limit="마나가 모자라면 그 기술은 건너뛰고 다음 기술이나 기본 공격으로 넘어갑니다."/>
                    <Rule icon={<Shield size={19}/>} title="복합 피해"
                        effect={`원시 피해를 물리 ${Math.round(SKILL_FORMULA.splitPhysical * 100)}% · 마법 ${Math.round((1 - SKILL_FORMULA.splitPhysical) * 100)}%로 나누어 각각의 방어를 따로 적용한 뒤 더합니다.`}
                        condition="명중·치명타 판정은 한 번만 합니다. 한쪽 방어만 높은 몬스터에게 안정적입니다."
                        limit="명중은 물리 규칙을 따릅니다(마법의 회피 절반 보정 없음)."/>
                    <Rule icon={<Zap size={19}/>} title="마력 평타"
                        effect={`마법 직업의 기본 공격이 확률로 마력 평타(마법 공격 × ${SKILL_FORMULA.arcaneStrikeRatio}, 3차부터 +${Math.round(SKILL_FORMULA.arcaneRatioByTier[3] * 100)}~${Math.round(SKILL_FORMULA.arcaneRatioByTier[5] * 100)}%p)로 바뀝니다. 마나를 쓰지 않는 마법 피해입니다.`}
                        condition="마법 피해라서 회피 절반 보정을 받고 마법 방어로 줄어듭니다. 몬스터의 마법 평타(마력 생물)도 같은 규칙으로 나를 때립니다."
                        limit="스킬이 하나도 나가지 않은 행동에서만 발생합니다."/>
                    <Rule icon={<Target size={19}/>} title="능력치 · 기록 비례"
                        effect="외길 계보는 공격력 대신 배분 능력치 × 비율을 기준값으로, 올라운드 밸런스는 여섯 능력치로 만든 원시 피해를 씁니다. 도감·처치·사냥·골드 비례 기술은 기본 피해에 기록 배율을 곱합니다."
                        condition="피해 유형(물리/마법)은 기술에 표시된 대로 따르며, 방어·명중 규칙도 그 유형을 따릅니다. 아크 계열은 반대 공격력을 기준값으로 쓰는 ‘교차’ 기술입니다."
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
                    effect="전직하면 그 직업의 기술을 Lv.0으로 얻습니다. 장착한 채 처치해 첫 숙련을 채우면 다른 직업에서도 씁니다. 3차 이상 스킬은 숙련 단계가 높습니다(3차 ×3 · 4차 ×10 · 5차 ×25)."
                    condition="해금한 기술에 한해 계승·강화에 각각 1 SP."
                    limit="SP는 도감 최종 연구, 던전 첫 정복 연구, 무릉도장 이정표에서만 얻습니다."/>
                <Rule icon={<Target size={19}/>} title="숙련 · 연마"
                    effect="처치할 때마다 현재 직업과 장착한 스킬의 숙련이 기본 1 오릅니다(사냥터·던전 난이도와 무관). 난이도 5 이상에서 나오는 숙련의 까미가 큰 숙련을 줍니다. 기본 숙련을 마치면 연마 30단계가 이어져 단계마다 직접 피해·양수 패시브 +0.8%."
                    condition={`조건부 숙련 스킬은 지정한 적을 이겼을 때만 더 줍니다. 처치 1회당 최대 ${PROGRESSION.maxMasteryPerVictory}.`}
                    limit="연마는 SP로 건너뛸 수 없고 AP·발동률은 늘지 않습니다. 숙련은 환생과 전직 뒤에도 남습니다."/>
                <Rule icon={<BookOpen size={19}/>} title="경험치 배율"
                    effect="경험치 배율 = 1 + 환생 + 세계석 연구 + 직업 + 장착 스킬."
                    condition="사냥터 난이도를 올리면 적이 강해지는 대신 골드 배율·장비 레벨·정수·장비 등급이 오릅니다. 경험치 배율은 1 + 0.1√난이도로 작습니다(난이도 100 ×2)."/>
            </div>
        </Topic>
        <Topic icon={<Shield size={19}/>} title="직업" note="숙달하면 그 직업의 보너스가 커집니다.">
            <div className="help-columns">
                <Rule icon={<Shield size={19}/>} title="직업 숙달"
                    effect="직업별 숙련 목표를 채우면 그 직업의 체력·공격·방어 보너스가 강화됩니다. 전직 화면에서 전후를 비교할 수 있습니다. 3차부터 목표가 크게 늘어(3차 ×3 · 4차 30만~45만 · 5차 150만), 5차 전직에는 선행 직업 숙달이 필요합니다."
                    condition="그 직업을 쓰는 동안만 적용됩니다. 숙달한 직업은 조건 없이 다시 전직할 수 있습니다."
                    limit="페널티·치명타·경험치 보너스는 숙달로 변하지 않습니다."/>
            </div>
        </Topic>
        <Topic icon={<Fish size={19}/>} title="사냥 · 던전 · 생존" note="변종, 던전 반복, 회복과 방치 진행.">
            <div className="help-columns">
                <Rule icon={<Fish size={19}/>} title="변종"
                    effect={<>같은 몬스터인데 특이한 개체입니다. {VARIANTS.filter(v => v.id !== 'swarm').map(v => <span key={v.id}><br/>{v.mark} <b>{v.name}</b> {percent(v.chance, 1)} · {v.desc}</span>)}<br/>✦ <b>황금 개체</b> · 처치 순간 따로 판정, 그 한 마리 골드 10배. 섀도어 계보 패시브(메소 마스터리·메소 가드·섀도우 파트너·메소 익스플로전 강화)가 확률을 올립니다.</>}
                    condition={`사냥터에서 그 몬스터를 ${VARIANT_BOOK_MIN}회 이상 처치한 뒤부터 출현마다 판정합니다. 버섯숲 연못 테마 +10%. 섀도어 계보 패시브가 확률을 올립니다(픽파킷 +20% · 무리 감지 +50% · 메소 익스플로전 강화 +100% 등).`}
                    limit="던전과 보스에는 변종이 없습니다. 지금 확률은 능력치 화면 아래 ‘변종 조우 확률’에서 봅니다."/>
                <Rule icon={<Fish size={19}/>} title="무리 변종"
                    effect={`처치당 ${percent(swarm.chance, 1)}. 무리 전체를 체력 ×N인 한 개체로 상대하고, 처치하면 보상·숙련·도감을 마리 수만큼 받습니다.`}
                    condition={`규모는 도감 처치 수로 정해집니다. ${SWARM_UNLOCK[5]}회 ×5, ${SWARM_UNLOCK[100].toLocaleString()}회 ×100, ${SWARM_UNLOCK[500].toLocaleString()}회에 시프의 ‘무리 감지’(Lv.30)를 장착하면 ×500.`}
                    limit="적 방어는 한 마리와 같고, 공격은 ×500에서만 490배입니다. 처치 전에 쓰러지면 보상이 없습니다."/>
                <Rule icon={<Swords size={19}/>} title="던전 · 무릉도장"
                    effect={`정해진 횟수 또는 실패할 때까지 자동으로 다시 도전합니다. 무릉도장은 10층마다 보너스 세계석, ${ABYSS_SP_MILESTONES.join('·')}층 첫 돌파에 SP 1, 30·60·90층에 장착 AP 1.`}
                    condition="던전 카드에서 반복을 고른 뒤 도전합니다. 입장 후 6초 준비가 끝나면 체력·마나가 회복됩니다."
                    limit={`던전에서는 처치 후 회복이 ${percent(MONSTER_TUNING.dungeonHealAfterKill)}입니다. 반복이 끝나면 사냥터로 돌아옵니다.`}/>
                <Rule icon={<Heart size={19}/>} title="생존 · 방치 진행"
                    effect={`처치 후 최대 체력의 ${percent(BALANCE.healAfterKill)}를 회복합니다${s ? `(지금 ${percent(victoryHealRate({ ...s, dungeon: null }))})` : ''}. 사냥터 난이도가 오를수록 줄어듭니다: 기본 ÷ (1 + 난이도 ÷ ${BALANCE.healAfterKillTideScale}) — 난이도 10에서 10%, 30에서 5%, 최저 ${percent(BALANCE.healAfterKillMin)}. 응급처치 패시브는 행동할 때마다 체력을 조금 회복합니다.`}
                    condition={`패배하면 잃는 것 없이 ${BALANCE.recoveryTurns}턴 회복한 뒤 다시 싸웁니다. 자리를 비운 시간도 서버가 턴으로 계산합니다.`}
                    limit={`방치 정산은 기본 ${BALANCE.offlineCapSeconds / 3600}시간${s ? `(지금 ${offlineCapSeconds(s) / 3600}시간)` : ''}, 가방은 기본 ${BALANCE.inventoryCap}칸${s ? `(지금 ${inventoryCap(s)}칸)` : ''}. 둘 다 세계석 연구로 늘어납니다.`}/>
            </div>
        </Topic>
        <Topic icon={<Flame size={19}/>} title="제단 · 난이도 · 특수 몬스터" note="모두가 함께 채우는 제단, 사냥터·던전 난이도, 까미와 누리.">
            <div className="help-columns">
                <Rule icon={<Flame size={19}/>} title="제단 · 축복"
                    effect={`골드·세계석·정수를 바치면 기여도(골드 ${ALTAR.goldPerPoint.toLocaleString()} = 1 · 세계석 1 = ${ALTAR.pearlPoints} · 정수 1 = ${ALTAR.essencePoints})가 고른 게이지에 쌓입니다. 축복 게이지가 차면 모든 모험가에게 ${BLESSINGS[0].hours}시간 동안 효과가 켜집니다: ${BLESSINGS.map(b => b.name).join(' · ')}.`}
                    condition="게이지는 서버 전체가 공유합니다. 혼자 다 채울 필요가 없고, 바친 만큼 주간 기여 순위에 오릅니다(익명 선택 가능)."
                    limit={`축복은 3단계까지 겹쳐 세지고 시간이 지나면 꺼집니다. 바치기 간격 ${ALTAR.offerCooldownMs / 1000}초.`}/>
                <Rule icon={<Swords size={19}/>} title="신 소환 · 신의 자리 · 탄핵"
                    effect={`신 소환 게이지(기여도 ${ALTAR.godCost.toLocaleString()})가 차면 신이 ${ALTAR.godLifetimeMs / 3600_000}시간 깨어납니다. 신을 처음 쓰러뜨린 모험가가 신의 자리에 앉아 다른 모험가가 바치는 재화의 ${ALTAR.titheRate * 100}%를 거둡니다.`}
                    condition={`도전 간격 ${ALTAR.challengeCooldownMs / 60_000}분. 신 카드에 최대 체력과 공격이 보이니 결투 전투력과 비교해 보세요. 신이 없을 때는 자리 주인을 ‘탄핵’할 수 있습니다: 주인이 신을 격파하던 당시의 능력치·스킬 그대로와 겨뤄 이기면 자리가 빕니다.`}
                    limit={`임기는 ${ALTAR.throneTermMs / 86_400_000}일. 자리가 비면 다음 신은 다시 ${ALTAR.firstGod.name}이고, 앉으려면 그 신을 쓰러뜨려야 합니다.`}/>
                <Rule icon={<Swords size={19}/>} title="월드보스"
                    effect={`소환 탭의 월드보스 게이지(${RAIDS.map(r => `${r.name} ${r.cost.toLocaleString()}`).join(' · ')})가 차면 그 보스가 나타납니다(${RAIDS.map(r => `${r.name} ${r.lifetimeHours}시간`).join(' · ')}, 격파 뒤 ${RAID.respawnMs / 3600_000}시간 대기). 체력은 서버가 함께 쓰는 하나의 값이라 모든 모험가의 피해가 누적되고, 0이 되면 격파입니다.`}
                    condition={`도전은 ${RAID.cooldownMs / 60_000}분에 한 번, 한 번에 최대 ${RAID.maxTurns}턴. 격파하면 한 번이라도 때린 모험가 전원이 골드·세계석(·SP)을 다음 동기화 때 받고, 마지막 일격은 보너스를 더 받으며, 서버 전체에 축복이 열립니다. 피해 순위는 제단의 월드보스 카드에서 봅니다.`}
                    limit="한 번에 한 마리만 나타납니다. 시간 안에 못 잡으면 떠나고 게이지는 다시 채워야 합니다. 신 소환과는 별개입니다."/>
                <Rule icon={<Gauge size={19}/>} title="사냥터 난이도 · 던전 난이도"
                    effect={`사냥터 난이도는 환생 횟수만큼(최대 ${ECONOMY.tideCap}) 올릴 수 있습니다. 몬스터 체력·공격이 오르는 대신 골드·경험치 배율과 장비 레벨이 오르고, 드롭 장비의 상위 등급 비율이 조금씩 오르며(난이도 100에서 태초 0.6% → 1%), 난이도 ${BALANCE.tideLoot.essenceMinTier}부터 처치마다 정수가 떨어집니다(확률 난이도 × ${BALANCE.tideLoot.essenceChancePerTier * 100}%, 양 1 + 난이도 ÷ ${BALANCE.tideLoot.essenceEveryTiers}). 난이도 ${MIMIC.minTier}부터 저레벨 사냥터의 몬스터도 내 레벨 근처까지 올라와 어느 사냥터든 보상이 비슷해집니다.`}
                    condition={`일반 던전은 입장할 때 ${DUNGEON_MODES.map(m => m.name).join(' · ')} 중 하나를 고릅니다. 헬은 사냥터 난이도 ${DUNGEON_MODES[1].tier}급, 나이트메어는 ${DUNGEON_MODES[2].tier}급이고 몬스터 레벨도 내 레벨까지 올라옵니다.`}
                    limit={`수식(난이도 t): 몬스터 체력 ×(1 + 0.35t + 0.006×(t−20)²) · 공격 ×(1 + 0.18t + 0.002×(t−20)²) · 몬스터 레벨은 난이도 5에서 내 레벨(사냥터 최고 레벨 + 6까지)까지 상승 · 골드 ×(1 + 0.5t) · 경험치 ×(1 + 0.1√t) · 처치 후 회복 ${percent(BALANCE.healAfterKill)} ÷ (1 + t ÷ ${BALANCE.healAfterKillTideScale}) · 드롭 장비 레벨 +5t(내 레벨 + ${BALANCE.dropLevelOver}까지) · 상위 등급 가중 (1 + ${BALANCE.tideLoot.rarityPerTier}t)^(등급−1) · 정수 확률 ${BALANCE.tideLoot.essenceChancePerTier * 100}% × t, 양 1 + t ÷ ${BALANCE.tideLoot.essenceEveryTiers}(난이도 ${BALANCE.tideLoot.essenceMinTier}부터). 무릉도장은 층 수가 난이도이고, 사냥터 난이도는 던전에 영향을 주지 않습니다.`}/>
                <Rule icon={<Fish size={19}/>} title="숙련의 까미 · 경험의 누리"
                    effect={`까미: 사냥터 난이도 ${MIMIC.minTier} 이상 · Lv.${MIMIC.minLevel} 이상 · 누적 ${MIMIC.minKills}마리부터 드물게 나오고, 잡으면 현재 직업 숙련을 한 번에 줍니다(${MIMIC.tiers.map(t => `${t.label} ${t.mastery.toLocaleString()}`).join(' · ')}). 누리: 난이도 ${EXP_NURI.minTier} 이상 · Lv.${EXP_NURI.minLevel}~99 · 누적 ${EXP_NURI.minKills.toLocaleString()}마리부터 나오고, 잡으면 지금 레벨 필요 경험치의 ${EXP_NURI.tiers.map(t => `${t.pct * 100}%`).join('·')}를 한 번에 줍니다.`}
                    condition="둘 다 체력이 많고 거의 아프지 않습니다. 제단의 까미·누리 축복과 운영 이벤트가 출현 확률을 곱해 올립니다."
                    limit="보상은 배율 보너스를 받지 않고, 던전에서는 나오지 않습니다. 사냥터 몬스터 목록·도감과는 별개입니다."/>
            </div>
        </Topic>
        <Topic icon={<RefreshCw size={19}/>} title="성장 · 재화" note="환생, 세계석 연구, 도감, 상점.">
            <div className="help-columns">
                <Rule icon={<RefreshCw size={19}/>} title="환생"
                    effect="세계석 = 레벨 ÷ 10 + 환생 횟수 보상 + 연구·스킬 보너스 + 깊은 모험 보너스. 영구 보너스(체력·공격·방어)는 2.5% × √환생 횟수, 영구 경험치는 환생마다 +25%."
                    condition={`요구 레벨은 30에서 환생마다 +${ECONOMY.rebirthLevelStep}(Lv.${ECONOMY.rebirthLevelLateFrom}까지), 그 뒤로는 환생마다 +${ECONOMY.rebirthLevelLateStep}(최대 Lv.${ECONOMY.rebirthLevelCap}). 환생 ${LEVEL_GATE_FREE_REBIRTHS}회부터는 사냥터·던전에 레벨 제한이 없습니다. 요구 레벨 +${s ? tailwindWindow(s) : TAILWIND_WINDOW} 안에 환생하면 다음 생 경험치 +${Math.round((s ? tailwindExp(s) : TAILWIND_EXP) * 100)}%(순풍), Lv.${DEEP_VOYAGE_LEVEL}에 환생하면 숙련 기본 획득 +2(깊은 모험). 환생 ${SPROUT.expUntil}회 전까지는 새싹의 축복으로 경험치 ×${sproutExp(0)}(환생할 때마다 ${SPROUT.expPerRebirth}씩 줄어듦), 환생 ${SPROUT.survivalUntil}회 전까지는 쓰러진 뒤 회복 대기 절반·처치 후 회복 +${Math.round(SPROUT.healBonus * 100)}%p.`}
                    limit={`횟수 보상은 20회까지 회당 세계석 1·경험치 +25%, 이후 완만해집니다. 환생 AP 최대 ${ECONOMY.rebirthAPCap}, 사냥터 난이도 최대 ${ECONOMY.tideCap}. 칭호는 업적(환생 횟수·도전·무릉도장)을 달성하면 얻고, 능력치 화면의 ‘칭호’에서 장착하거나 숨깁니다.`}/>
                <Rule icon={<Target size={19}/>} title="계급장"
                    effect={`처치한 마릿수로만 오르는 별도 계급(이등병 → 중장, ${RANKS.length}단계). 환생·분신과 무관하게 유지되고 무리는 마릿수만큼 셉니다. 진급마다 진급 포인트(병 1 · 부사관 2 · 장교 3 · 장성 4, 합계 ${RANK_TOTAL_POINTS})를 받아 특전을 삽니다. 특전은 단계당 1P이고 단계마다 효과가 같은 폭으로 늘어납니다: ${RANK_PERKS.map(p => `${p.name} — 단계당 ${p.id === 'tally' ? '처치 1마리를 계급 경험치 +1마리로 더 셈' : p.id === 'drill' ? '처치 숙련 기본 +1(직업·장착 스킬, 배율과 무관한 고정값)' : p.id === 'medal' ? '사냥터 처치마다 SP 드롭 +0.1%' : '사냥터 처치마다 세계석 드롭 +0.1%'}, 최대 ${p.max}단계(${p.desc(p.max)})`).join(' · ')}.`}
                    condition={`일병까지 ${RANKS[1].need.toLocaleString()}마리, 그 뒤 계급마다 약 ×1.38로 늘어 중장까지 합계 약 ${(RANKS.reduce((a, r) => a + r.need, 0) / 10000).toFixed(0)}만 마리입니다. 능력치 · 빌드 화면의 ‘계급’에서 봅니다.`}
                    limit="특전은 언제든 무료로 초기화해 다시 배분합니다. SP·세계석 특전은 사냥터 처치에만 적용되고 던전에서는 나오지 않습니다."/>
                <Rule icon={<Sparkles size={19}/>} title="세계석 연구"
                    effect="세계석으로 영구 능력을 올립니다. 환생해도 유지되며 전투·유틸·골드 탭으로 나뉩니다."
                    condition="단계가 오를수록 비용이 커집니다. 일부 연구는 정해진 환생 횟수 뒤에 열립니다."
                    limit={`탭별 재분배는 언제나 무료이며 쓴 세계석의 ${RESEARCH_RESET.refund * 100}%를 돌려받습니다. 자동 사냥·던전 중에는 할 수 없습니다.`}/>
                <Rule icon={<BookOpen size={19}/>} title="몬스터 도감"
                    effect={`종별 연구 ${BALANCE.bookMilestones.map(n => n.toLocaleString()).join(' · ')}회 처치. 4·5·6단계에 SP. 6단계는 그 몬스터를 난이도 ${BALANCE.bookTierReq[5]} 이상에서 처치해야 열립니다. 2단계부터 그 몬스터를 상대로 주는 피해가 오르고 받는 공격 피해가 줄어드는 생태 연구가 붙습니다(6단계 누적 +50% / -25%). 지역의 모든 몬스터가 연구 4·5·6단계면 지역 연구 1·2·3단계로 지역 효과가 쌓입니다. 지역마다 자주 나오는 변종이 다르고, 지역 끝의 무리 서식지에서는 몬스터가 전부 ×100·×500 무리로 나옵니다.`}
                    condition={`${PROGRESSION.fishComplete}회 처치하면 완성이고 적 정보가 열립니다. 지역의 모든 종을 완성하면 AP +1과 지역 테마 보너스.`}
                    limit="보상은 도감에서 직접 받고 각 단계는 한 번만 줍니다. 합계는 도감 ‘연구 보너스’ 탭에서 봅니다."/>
                <Rule icon={<Coins size={19}/>} title="상점 · 장비"
                    effect={`감정은 희귀 이상을 보장하고, 확정 구매는 표시된 등급 그대로입니다. 강화는 스타포스(v27.93): 전설 이상 ${STARFORCE.max}성 · 영웅 이하 ${STARFORCE.maxLow}성까지, 1~${STARFORCE.gainHighFrom}성 +${STARFORCE.gainLow * 100}%/성 · 그 위 +${STARFORCE.gainHigh * 100}%/성. 성마다 성공률이 정해져 있고(${STARFORCE.gainHighFrom}성부터 30%), ${STARFORCE.dropFrom}성부터 실패 시 1성 하락(${STARFORCE.safeStars.join('·')}성 유지), 15성부터 파괴 확률(일반 장비는 소멸, 유물은 ${STARFORCE.relicResetStar}성으로). 하락 2번 연속이면 찬스 타임(100%), 15·16성은 파괴 방지(비용 ×2)를 고를 수 있습니다. 비용은 12성까지 전과 같고 13성부터 성마다 ×${STARFORCE.growth}.`}
                    condition="판매가는 등급·레벨에 비례하고 강화 비용의 30%를 돌려받습니다. 분해는 골드 대신 정수를 줍니다. 정수는 옵션 재설정(옵션 종류를 바꿈, 같은 장비에서 할 때마다 비용 +10%·상한 없음)과 수치 재련(종류는 그대로 수치만 다시 굴림, 재설정 기본 비용의 절반·오르지 않음)에 씁니다."
                    limit="구매·옵션 변경 비용은 돌려받지 않습니다. 일반 장비는 환생 때 정리됩니다(판매/분해는 설정에서 고름)."/>
            </div>
        </Topic>
        <Topic icon={<Gauge size={19}/>} title="저장 데이터" note="초기화 규칙.">
            <div className="help-columns">
                <Rule icon={<Gauge size={19}/>} title="데이터 초기화"
                    effect="이름만 남기고 레벨·환생·장비·도감·길드·랭킹 등록까지 새 게임으로 돌아갑니다."
                    condition="환생 화면 ‘저장 데이터 관리’에서 자동 사냥과 던전을 멈춘 뒤 실행합니다."
                    limit="되돌릴 수 없습니다."/>
            </div>
        </Topic>
    </>;
}
