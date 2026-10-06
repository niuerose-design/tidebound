'use client';
/** v3.31 승천 카드: 환생 화면 '환생 준비' 탭. 조건·지금 받는 배율·받는 보상·유지되는 것·초기화되는 것과 확인 창. 설계는 docs/balance-rebirth.md 8·11·14절. */
import { Crown } from 'lucide-react';
import { ConfirmButton } from './confirm-button';
import { Meter, format } from './shared';
import type { PanelProps } from './panel-props';
import { ASCENSION, ASCENSION_RESEARCH, ascensionOf, ascensionRequirement, ascensionMastery, ascensionVow, lifetimeRebirths } from '@/game/data/ascension';
import { RESEARCH } from '@/game/data/economy';
import { achievementRefund } from '@/game/systems/actions/lifecycle';

/** 환생 50회부터(또는 한 번이라도 승천했으면) 보입니다. */
export function AscensionPanel({ s, send, busy }: PanelProps) {
    const n = ascensionOf(s), need = ascensionRequirement(s), ready = s.rebirths >= need;
    if (!n && s.rebirths < 50) return null;
    const next = { ...s, ascension: n + 1 }, refund = achievementRefund(s);
    const auto = Object.entries(ASCENSION_RESEARCH).map(([id, rank]) => `${RESEARCH.find(r => r.id === id)?.name || id}${rank > 1 ? ` ${rank}` : ''}`).join(' · ');
    const log = (s.ascensionLog || []).slice(-5).reverse();
    return <section className="panel ascension-panel">
        <div className="rebirth-ready ascension-ready">
            <div className="rebirth-ready-copy">
                <span className="eyebrow">ASCENSION · {n + 1}번째 승천</span>
                <h2>{ready ? '환생의 끝에 닿았습니다. 숙련을 들고 처음부터 다시 오를 수 있습니다' : `환생 ${need}회에 승천이 열립니다`}</h2>
                <Meter value={Math.min(s.rebirths, need)} max={need} label={`환생 ${format(s.rebirths)} / ${need}회`} color="gold"/>
                <p className="footnote">승천할 때마다 필요한 환생 횟수가 오릅니다({ASCENSION.requirements.join(' → ')}). 환생은 {ASCENSION.rebirthCap}회까지이고, {ASCENSION.researchLockAt}회부터는 세계석 연구를 살 수 없습니다.
                    {n > 0 && ` 지금 ${n}승천 · 숙련 ×${ascensionMastery(s)} · 서약 보상 ×${ascensionVow(s).toFixed(1)} · 누적 환생 ${format(lifetimeRebirths(s))}회.`}</p>
            </div>
            <div className="rebirth-reward"><span>승천 후 숙련 배율</span><strong><Crown size={26}/>×{ascensionMastery(next)}</strong>
                <ConfirmButton label="승천하기" title={`${n + 1}번째 승천을 할까요?`} confirmLabel="승천" disabled={busy || !ready || !!s.dungeon}
                    description={`되돌릴 수 없습니다. 환생 횟수·레벨·골드·세계석·세계석 연구·SP·정수·장비(유물·칠흑 포함)·도감·스킬 연마와 한계 돌파·무릉도장 기록이 처음으로 돌아갑니다. 계정 금고의 세계석·정수도 모두 사라집니다(다른 분신이 넣은 몫 포함). 결투와 이번 주 무릉도장 기록판에서도 바로 빠집니다. 직업·스킬 숙련, 업적, 계급장, 칭호, 기록은 남고 업적 보상 세계석 ${format(refund.pearls)} · SP ${refund.sp}를 다시 받습니다.`}
                    onConfirm={() => send({ type: 'ascend' })}/>
            </div>
        </div>
        <div className="rebirth-records rebirth-three">
            <article className="panel ledger-gain"><h2>받는 보상</h2><ul>
                <li><b>숙련 획득 ×{ascensionMastery(s)} → ×{ascensionMastery(next)}</b><small>승천 1회당 +{ASCENSION.masteryPer * 100}%, {ASCENSION.masteryCap}회까지. 숙련의 까미 당첨분에도 곱합니다.</small></li>
                <li><b>서약 보상 ×{ascensionVow(s).toFixed(1)} → ×{ascensionVow(next).toFixed(1)}</b><small>하드코어·힘의 길·절제·랜덤게임 보상의 보너스 부분에 곱합니다({ASCENSION.vowCap}회까지).</small></li>
                <li><b>업적 보상 다시 지급 · 세계석 {format(refund.pearls)} · SP {refund.sp}</b><small>받은 업적의 영구 효과(능력치·AP)는 그대로 남습니다.</small></li>
                <li><b>편의 연구 자동 해제</b><small>{auto}. 서약·랜덤게임은 1단계가 바로 열립니다.</small></li>
                <li><b>초반 가속 · 까미·누리</b><small>환생 {ASCENSION.earlyExpUntil}회 전까지 경험치 ×{ASCENSION.earlyExp}(새싹의 축복 대신). 까미·누리가 사냥터 난이도 0부터 나옵니다.</small></li>
                {!n && <li><b>행운의 편지 6~10단계</b><small>오프라인 확률 ×0.5 · 까미 ‘대’ 7.5% · 편지 수신인.</small></li>}
            </ul></article>
            <article className="panel ledger-kept"><h2>유지되는 것</h2><ul><li>직업 숙련 · 숙달 · 직업 단련 · 해금한 직업</li><li>스킬 숙련(성장 레벨) · 계승 · 배운 스킬</li><li>업적과 그 영구 효과 · 계급장 · 칭호</li><li>기록(누적 처치·환생 기록·결투 전적·스타포스 기록 등)</li><li>분신 슬롯 · 길드 · 해커 · 설정</li></ul></article>
            <article className="panel ledger-reset"><h2>초기화되는 것</h2><ul><li>환생 횟수 · 레벨 · 직업(초보자) · 능력치 배분</li><li>골드 · 세계석 · 세계석 연구 · SP · 정수</li><li>스킬 연마 단계 · 한계 돌파 · SP로 올린 스킬 단계</li><li>모든 장비(유물 · 칠흑 포함) · 몬스터·장비 도감</li><li>무릉도장(최고층은 승천 기록에 남음) · 계정 금고 · 서약</li><li>계정 보너스(이 캐릭터의 기록으로 다시 채움)</li></ul></article>
        </div>
        {log.length > 0 && <p className="footnote ascension-log">승천 기록: {log.map(x => `${x.n}승천 · 환생 ${x.rebirths}회 · 무릉도장 ${x.abyssBest}층`).join(' / ')}</p>}
    </section>;
}
