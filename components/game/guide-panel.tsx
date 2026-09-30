import { BookOpen, ChevronDown, Coins, Crosshair, Fish, Gauge, Heart, RefreshCw, Shield, Sparkles, Swords, Target, Users, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { BALANCE, MONSTER_TUNING, STATUS_GUIDE, STATUS_TUNING, SKILL_FORMULA, FIRST_AID_HEAL } from '@/game/data/balance';
import { ATTRIBUTES, PROGRESSION, percent } from '@/game/data/progression';
import { ECONOMY, RESEARCH, RESEARCH_RESET, offlineCapSeconds, inventoryCap } from '@/game/data/economy';
import { victoryHealRate } from '@/game/systems/encounter';
import type { State } from '@/game/types';
import { SWARM_UNLOCK } from '@/game/data/world';
import { ABYSS_SP_MILESTONES } from '@/game/data/long-term';
import { TAILWIND_WINDOW, TAILWIND_EXP, DEEP_VOYAGE_LEVEL } from '@/game/systems/meta';
import { Heading } from './shared';

/** 도움말 카드: 효과 → 조건 → 제한 순서로 적습니다. */
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

/** 상태이상 사전을 성격별로 나눕니다. */
const STATUS_GROUPS = [
    { title: '행동 방해', ids: ['stun', 'silence', 'weaken'] },
    { title: '지속 피해 · 속도', ids: ['bleed', 'slow', 'haste'] },
] as const;

export function Guide({ s }: { s?: State }) {
    return <>
        <Heading eyebrow="CAPTAIN'S MANUAL" title="항해 도움말" description="주제 제목을 누르면 접고 펼칠 수 있습니다. 규칙은 효과 · 조건 · 제한 순서입니다." />
        <Topic open icon={<Target size={19}/>} title="능력치" note="기본치 + 레벨 성장 + 직접 배분에 직업·장비·스킬이 더해집니다.">
            <div className="help-stat-grid">{ATTRIBUTES.map(a => <article className="panel help-stat-card" key={a.id}><strong>{a.code} · {a.name}</strong><p>{a.description}</p></article>)}</div>
            <p className="footnote">능력치 화면의 수치를 누르면 기본·배분·직업·스킬·환생·연구·도감·장비별 기여를 볼 수 있습니다.</p>
            <p className="footnote help-notation"><b>표기 규칙</b> +10%: 원래 값에 비율로 더하는 보너스(같은 종류끼리 합산) · +1%p: 확률에 그대로 더하는 값(20% → 21%) · ×1.2: 다른 보너스와 곱하는 배율 · 1.2만: 큰 수 줄임 표기(숫자에 마우스를 올리면 정확한 값).</p>
        </Topic>
        <Topic icon={<Swords size={19}/>} title="전투" note="속도가 높은 쪽이 먼저 행동합니다.">
            <div className="help-flow">
                <div><b>1</b><strong>상태 처리</strong><p>상태이상의 남은 턴, 마나 회복, 기절을 먼저 처리합니다.</p></div>
                <div><b>2</b><strong>스킬 선택</strong><p>장착한 액티브를 위에서부터 조건·재사용 대기·마나·발동 확률 순으로 확인하고, 모두 실패하면 기본 공격을 합니다.</p></div>
                <div><b>3</b><strong>명중 판정</strong><p>공격마다 한 번 판정합니다.</p></div>
                <div><b>4</b><strong>피해 계산</strong><p>공격 수치 × 스킬 배율에 상대 방어·관통·치명타를 적용합니다.</p></div>
                <div><b>5</b><strong>추가타</strong><p>추가타가 있는 스킬은 같은 행동 안에서 후속 타격을 냅니다.</p></div>
            </div>
            <div className="help-columns">
                <Rule icon={<Crosshair size={19}/>} title="명중·회피"
                    effect={<>명중 수치는 내 공격이, 회피 수치는 상대 공격과 그 공격의 상태이상이 빗나갈 가능성을 바꿉니다. 실제 적중률 = 내 명중 − 상대 회피 + 속도 보정.</>}
                    condition="속도 차이에 따라 최대 ±6%p. 스킬 특화·가속·감속은 해당 공격에 추가로 반영됩니다."
                    limit="실제 적중률은 1~99.5%. 회피는 50%를 넘으면 효율이 줄어 90%에 수렴합니다. 명중·회피 수치는 확률이 아니므로, 어종별 실제 적중률은 물고기 도감에서 확인하세요."/>
            </div>
        </Topic>
        <Topic icon={<Gauge size={19}/>} title="상태이상" note={`${STATUS_GUIDE.length}종이 PvE·PvP에 같은 규칙으로 적용됩니다.`}>
            {STATUS_GROUPS.map(g => <div className="help-status-group" key={g.title}>
                <h3>{g.title}</h3>
                <div className="help-status-grid">{STATUS_GUIDE.filter(st => (g.ids as readonly string[]).includes(st.id)).map(status => <article className="panel help-status-card" key={status.id}>
                    <div className="help-status-top"><strong>{status.name}</strong><span>{status.kind}</span></div>
                    <p>{status.description}</p>
                    <small>{status.detail}</small>
                </article>)}</div>
            </div>)}
        </Topic>
        <Topic icon={<Zap size={19}/>} title="스킬" note="발동, 습득·계승, 숙련과 연마.">
            <div className="help-columns">
                <Rule icon={<Zap size={19}/>} title="액티브 스킬"
                    effect="전투 중 발동 확률에 따라 자동으로 사용합니다. 추가타는 스킬별 횟수·배율로 같은 행동 안에서 이어집니다."
                    condition="마나와 재사용 대기가 충족되고, 스킬별 조건(체력 비율 등)을 만족해야 합니다."
                    limit={`장착 개수 제한은 없고 총 AP만 제한합니다. 추가타는 최대 ${STATUS_TUNING.maxExtraAttacks}회입니다.`}/>
                <Rule icon={<Sparkles size={19}/>} title="스킬 습득·계승·강화"
                    effect="전직하면 그 직업의 기술을 SP 없이 기본 Lv.0으로 얻습니다. 장착한 채 승리해 첫 숙련을 채우면 다른 직업에서도 무료로 씁니다."
                    condition="해금한 기술에 한해 계승 또는 강화에 각각 1 SP를 쓸 수 있습니다."
                    limit="SP는 도감 최종 연구·던전 첫 연구·심연 이정표에서만 얻습니다. 보스 기술의 최초 해금(직업 숙련 조건)은 SP로 건너뛸 수 없습니다."/>
                <Rule icon={<Target size={19}/>} title="숙련 → 특화 → 연마"
                    effect="액티브의 실전 숙련 1단계에서 특화를 하나 고를 수 있습니다. 기본 숙련을 마친 뒤에는 장기 연마 30단계가 이어져 단계마다 직접 피해·양수 패시브 +0.8%입니다."
                    condition="특화 일부는 해당 던전의 보스 연구 보상을 받아야 열립니다."
                    limit="연마는 SP로 건너뛸 수 없고 AP·발동률·숙련 배수는 늘지 않습니다. 특화마다 피해 감소 등의 대가가 있습니다."/>
                <Rule icon={<BookOpen size={19}/>} title="경험치와 숙련 획득"
                    effect="승리할 때마다 현재 직업과 장착한 사용 가능 스킬의 숙련이 기본 1 늘어납니다. 경험치 배율 = 1 + 환생 + 진주 연구 + 직업 + 장착 스킬."
                    condition="조건부 숙련 스킬은 지정된 적을 이겼을 때만 추가 숙련을 줍니다. 겹치면 가장 큰 보너스 하나만 적용합니다."
                    limit={`승리 1회당 최대 ${PROGRESSION.maxMasteryPerVictory}. 도감 포획 수는 1씩만 늘어납니다(무리 사냥 제외).`}/>
            </div>
        </Topic>
        <Topic icon={<Shield size={19}/>} title="직업" note="숙달 보너스와 만능 항해사.">
            <div className="help-columns">
                <Rule icon={<Shield size={19}/>} title="직업 숙달"
                    effect="직업별 숙련 목표를 채우면 그 직업의 체력·공격·방어 보너스가 강화됩니다. 전직 화면에서 숙달 전후를 비교할 수 있습니다."
                    condition="그 직업을 선택한 동안에만 적용됩니다."
                    limit="페널티·치명타·경험치 보너스는 숙달로 변하지 않습니다. 숙련 기록은 다른 직업으로 옮겨도 남습니다."/>
                <Rule icon={<Users size={19}/>} title="만능 항해사 · 육중 조화"
                    effect={<>육중 조화의 원시 피해 = {SKILL_FORMULA.harmonyBase} + 배분 포인트 합 × {SKILL_FORMULA.harmonyPerPoint} + 가장 낮은 배분 포인트 × {SKILL_FORMULA.harmonyPerLowest}. 물리 {percent(SKILL_FORMULA.splitPhysical)} · 마법 {percent(1 - SKILL_FORMULA.splitPhysical)}로 나눠 각각 방어를 적용합니다.</>}
                    condition="Lv.40, 여섯 능력치에 직접 배분한 포인트가 각각 15 이상, 이형 항해자 숙련 2,400."
                    limit="직접 배분한 포인트만 계산하며 장비·일시 버프·일반 공격력은 더하지 않습니다. 명중·치명 판정은 한 번입니다."/>
            </div>
        </Topic>
        <Topic icon={<Fish size={19}/>} title="사냥 · 던전 · 생존" note="무리 사냥, 던전 반복, 회복과 방치 진행.">
            <div className="help-columns">
                <Rule icon={<Fish size={19}/>} title="무리 사냥"
                    effect="무리 전체를 체력 ×N(×100은 98배, ×500은 490배)인 한 개체로 상대하고, 처치하면 경험치·골드·숙련·도감을 마리 수만큼 받고 드롭을 마리 수만큼 판정합니다."
                    condition={`집중 사냥 중인 어종을 ${SWARM_UNLOCK[5]}마리 포획하면 ×5, ${SWARM_UNLOCK[100].toLocaleString()}마리 포획하면 ×100, ${SWARM_UNLOCK[500].toLocaleString()}마리 포획하면 ×500.`}
                    limit="적 방어는 늘 한 마리와 같고, 공격은 ×500에서만 490배입니다. 승리 회복은 무리 전체에 한 번이며, 처치 전에 쓰러지거나 규모를 바꾸면 보상이 없습니다. 적의 체력 비례 공격은 한 마리 기준입니다."/>
                <Rule icon={<Swords size={19}/>} title="던전 반복 · 무한 심연"
                    effect={`던전은 정해진 횟수 또는 실패할 때까지, 무한 심연은 목표 깊이 또는 실패할 때까지 자동 재도전합니다. 심연은 깊을수록 층당 진주가 늘고 ${ABYSS_SP_MILESTONES.join('·')}층 첫 돌파 시 SP 1을 줍니다.`}
                    condition="던전 카드에서 반복을 고른 뒤 도전합니다. 입장마다 6초 준비 후 체력·마나를 회복합니다."
                    limit={`반복이 끝나거나 실패하면 낚시터에서 자동 낚시를 이어갑니다. 던전 처치 후 회복은 ${percent(MONSTER_TUNING.dungeonHealAfterKill)}입니다.`}/>
                <Rule icon={<Heart size={19}/>} title="생존 · 방치 진행"
                    effect={`승리 후 최대 체력의 ${percent(BALANCE.healAfterKill)}(던전 ${percent(MONSTER_TUNING.dungeonHealAfterKill)})를 회복하고, 진주 연구 잔잔한 물결로 1%p씩 늘어납니다${s ? `(지금 필드 ${percent(victoryHealRate({ ...s, dungeon: null }))} · 던전 ${percent(victoryHealRate({ ...s, dungeon: { id: '', wave: 0 } }))})` : ''}. 공용 패시브 응급처치(AP 2, Lv.2 자동 습득)를 장착하면 승리마다 ${percent(FIRST_AID_HEAL)}를 더 회복합니다. 자동 낚시 중 자리를 비운 시간도 서버가 실제 턴으로 계산합니다.`}
                    condition={`패배하면 손실 없이 ${BALANCE.recoveryTurns}턴 회복한 뒤 다시 싸웁니다.`}
                    limit={`방치 정산은 기본 ${BALANCE.offlineCapSeconds / 3600}시간, 긴 닻줄 연구로 2시간씩 늘어납니다${s ? `(지금 ${offlineCapSeconds(s) / 3600}시간)` : ''}. 가방은 기본 ${BALANCE.inventoryCap}칸, 넓은 선창 연구로 5칸씩 늘어납니다${s ? `(지금 ${inventoryCap(s)}칸)` : ''}. 일시정지 중에는 쌓이지 않습니다. 해역 난이도는 일반 낚시터에만 적용됩니다.`}/>
            </div>
        </Topic>
        <Topic icon={<RefreshCw size={19}/>} title="성장 · 재화" note="환생, 진주 연구, 도감, 상점.">
            <div className="help-columns">
                <Rule icon={<RefreshCw size={19}/>} title="환생"
                    effect={<>진주 = 레벨 ÷ 10 + 환생 횟수 보상 + 연구·스킬 보너스 + 깊은 항해(요구 레벨 초과분² ÷ 40). 환생 영구 보너스(체력·물리/마법 공격·물리/마법 방어) = 2.5% × √환생 횟수. 영구 경험치는 환생마다 +25%.</>}
                    condition={`요구 레벨은 30에서 환생마다 +${ECONOMY.rebirthLevelStep}, 최대 Lv.${ECONOMY.rebirthLevelCap}. 요구 레벨+${TAILWIND_WINDOW} 이내에 환생하면 순풍(다음 생 요구 레벨까지 경험치 +${TAILWIND_EXP * 100}%), Lv.${DEEP_VOYAGE_LEVEL}에서 환생하면 깊은 항해(다음 생 숙련 기본 획득 +2).`}
                    limit={`환생 횟수 보상 진주와 영구 경험치는 20회까지 회당 1개·+25%, 이후에는 √(횟수 − 20)으로 완만해집니다. 환생 AP는 최대 ${ECONOMY.rebirthAPCap}, 해역 난이도는 최대 ${ECONOMY.tideCap}.`}/>
                <Rule icon={<Sparkles size={19}/>} title="진주 연구"
                    effect="진주로 영구 능력을 올립니다. 환생해도 유지됩니다. 전투(공격·생존)·유틸·골드 탭으로 나뉘며, 물리 공격(날카로운 기억)과 마법 공격(심해 등불의 기억), 물리 방어(불굴의 기억)와 마법 방어(진주막의 기억)는 각각 따로 연구합니다."
                    condition={`단계가 오를수록 비용이 커지고, 20단계 이후에는 더 가파르게 오릅니다. 일부 연구는 정해진 환생 횟수 이후에 열립니다. 탭별 재분배는 그 탭에 쓴 진주를 돌려받고 단계를 0으로 되돌립니다: 계정당 첫 1회는 ${RESEARCH_RESET.firstRefund * 100}%, 이후 ${RESEARCH_RESET.refund * 100}%(내림). 자동 낚시·던전 중에는 할 수 없고, 영혼의 그릇을 되돌려 장착 AP가 넘치면 먼저 스킬을 해제해야 합니다.`}
                    limit={<>연구 상한: {RESEARCH.map(r => `${r.name} ${r.max}단계`).join(' · ')}.</>}/>
                <Rule icon={<BookOpen size={19}/>} title="물고기 도감"
                    effect={`종별 연구는 ${BALANCE.bookMilestones.map(n => n.toLocaleString()).join(' · ')}회 포획에 골드를 주고, 최종 연구에서 SP 1을 줍니다. 연구 단계마다 어종 성향에 맞는 능력치가 오르고, 2단계부터는 그 어종 상대 피해 보정(생태 연구)이 붙습니다. 50회 포획하면 성향·스킬 정보가 공개됩니다. 지역의 모든 종을 완성하면 AP +1과 지역 테마 보너스를 받습니다.`}
                    condition={`한 종을 ${PROGRESSION.fishComplete}회 포획하면 완성으로 처리합니다. 보상은 도감에서 직접 받습니다.`}
                    limit="각 연구 단계 보상은 한 번만 받습니다. 무리 사냥 해금도 연구 단계 보상에 함께 표시됩니다."/>
                <Rule icon={<Coins size={19}/>} title="상점 · 장비 강화"
                    effect={`낚싯대·방어구·나침반을 감정하거나 확정 구매합니다. 강화 1회당 장비 기본 수치 +${percent(ECONOMY.enhanceGain)}.`}
                    condition={`강화는 최대 +${ECONOMY.enhanceMax}. 장비 카드의 수치는 강화가 적용된 값이며 카드에 강화 단계를 함께 표시합니다.`}
                    limit="구매·강화·옵션 변경 비용은 판매할 때 돌려받지 않습니다. 전리품 감지는 장비 드롭과 골드만 높이고 희귀어 출현·장비 등급에는 영향이 없습니다."/>
            </div>
        </Topic>
        <Topic icon={<Gauge size={19}/>} title="저장 데이터" note="데이터 초기화 규칙.">
            <div className="help-columns">
                <Rule icon={<Gauge size={19}/>} title="데이터 초기화"
                    effect="캐릭터 이름만 남기고 레벨·환생·장비·도감·길드·랭킹 등록까지 새 게임으로 돌아갑니다."
                    condition="환생 화면의 ‘저장 데이터 관리’에서 자동 낚시와 던전을 멈춘 뒤 실행합니다."
                    limit="되돌릴 수 없습니다."/>
            </div>
        </Topic>
    </>;
}
