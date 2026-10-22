import { card, Primary, Sm, big, BLESS_NAMES, Tile, Fold, muted, Bars, field, grid } from '../parts';
import { cn } from '@/lib/utils';
import { format, formatDuration } from '@/components/game/shared';
import type { Admin } from '../use-admin';

/** v3.413 운영자 페이지 탭(page.tsx 에서 분리). 화면과 문구는 그대로입니다. */
export function StatsTab({ a }: { a: Admin }) {
    const { key, stats, busy, fxLimit, setFxLimit, fxMinLevel, setFxMinLevel, exportFixtures, expedition, resetAltar, blessId, setBlessId, blessLevel, setBlessLevel, blessMinutes, setBlessMinutes, setBlessing } = a;
    if (!stats) return null;
    return <>
            <Fold title="세이브 익명 내보내기 (재설계 픽스처)" open={false} note="이름 · 계정 · 길드 · 상대 기록을 지운 JSON. tests/fixtures/saves/ 에 둡니다.">
                <div className="flex flex-wrap items-center gap-2">
                    <label className="text-s">최대 개수 <input value={fxLimit} onChange={e => setFxLimit(e.target.value)} inputMode="numeric" className={cn(field, 'ml-1 w-[70px]')}/></label>
                    <label className="text-s">최소 레벨 <input value={fxMinLevel} onChange={e => setFxMinLevel(e.target.value)} inputMode="numeric" className={cn(field, 'ml-1 w-[70px]')}/></label>
                    <Primary type="button" disabled={busy || !key} onClick={() => void exportFixtures()}>JSON 내려받기</Primary>
                </div>
            </Fold>
            {expedition && <Fold title="원정대(오토배틀러)" note={`${expedition.players}명 · ${format(expedition.runs)}판 · 완주 ${format(expedition.clears)} · 고스트 ${expedition.ghostFights ? `${Math.round(100 * expedition.ghostWins / expedition.ghostFights)}%(${expedition.ghostFights}전)` : '없음'}`} open={false}>
                <div style={grid(150)}>
                    <Tile label="판 수" value={format(expedition.runs)} note={`완주율 ${expedition.runs ? Math.round(100 * expedition.clears / expedition.runs) : 0}% · 판당 ${expedition.runs ? (expedition.wins / expedition.runs).toFixed(1) : '0'}승`}/>
                    {expedition.rounds.map(r => <Tile key={r.round} label={`${r.round}라운드 승률`} value={`${r.rate}%`} note={`${format(r.plays)}전 ${format(r.wins)}승`}/>)}
                </div>
                <p className="mt-3 text-s"><b>많이 배치한 유닛</b> · {expedition.units.length ? expedition.units.map(u => `${u.name} ${format(u.count)}`).join(' · ') : '아직 없음'}</p>
                <p className="mt-2 text-s"><b>시너지 조합별 승률</b>(전투 20 이상, 4명 이상 켜진 조합) · {expedition.comps?.length ? expedition.comps.map(c => `${c.name} ${c.rate}%(${format(c.plays)}전)`).join(' · ') : '아직 없음'}</p>
            </Fold>}
            <Fold title="요약" note={`${new Date(stats.at).toLocaleString('ko-KR')} 기준`}>
                <div style={grid(150)}>
                    <Tile label="가입 계정" value={format(stats.accounts)} note={`세이브(분신 포함) ${format(stats.saves)}`}/>
                    <Tile label="최근 1시간 활동" value={format(stats.active.hour)} note={`24시간 ${format(stats.active.day)} · 7일 ${format(stats.active.week)}`}/>
                    <Tile label="자동 사냥 켜 둠" value={format(stats.running)} note={`던전 진행 중 ${format(stats.inDungeon)}`}/>
                    <Tile label="평균 레벨" value={String(stats.level.avg)} note={`최고 Lv.${stats.level.max}`}/>
                    <Tile label="평균 환생" value={`${stats.rebirths.avg}회`} note={`최고 ${stats.rebirths.max}회 · 무릉도장 ${stats.abyssBest}층`}/>
                    <Tile label="총 처치" value={big(stats.totals.kills)} note={`누적 플레이 ${format(stats.totals.playHours)}시간`}/>
                    <Tile label="보유 골드 합계" value={big(stats.totals.gold)} note={`중앙값 ${big(stats.medians.gold)}`}/>
                    <Tile label="보유 세계석 합계" value={format(stats.totals.pearls)} note={`중앙값 ${format(stats.medians.pearls)}`}/>
                    <Tile label="길드 가입" value={format(stats.inGuild)} note={`한계돌파 ${format(stats.limitBreakers)}명`}/>
                    <Tile label="최고 계급" value={stats.ranks.top} note={`안 쓴 진급 포인트 ${format(stats.ranks.freePoints)}`}/>
                </div>
            </Fold>
            <Fold title="제단 관리" open={false} note={`${stats.altar.gen}번째 신 ${stats.altar.godAlive ? '깨어 있음' : '잠듦'} · 신의 자리 ${stats.altar.throne || '비어 있음'} · 몫 ${big(stats.altar.titheGold)} G · 기여도 ${format(stats.altar.points)}`}>
                <div className="flex flex-wrap gap-2">
                    <Sm disabled={busy} onClick={() => resetAltar('offers')}>공물 초기화(게이지 0)</Sm>
                    <Sm disabled={busy} onClick={() => resetAltar('god')}>신 초기화(신·자리·몫 비우기)</Sm>
                </div>
                <h3 className="mb-1.5 mt-3 text-s font-semibold">축복 단계 설정</h3>
                <div className="flex flex-wrap items-center gap-2">
                    <select value={blessId} onChange={e => setBlessId(e.target.value)} aria-label="축복">{Object.entries(BLESS_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
                    <select value={blessLevel} onChange={e => setBlessLevel(Number(e.target.value))} aria-label="단계">{[0, 1, 2, 3, 4, 5, 6].map(l => <option key={l} value={l}>{l ? `${l}단계` : '끄기(0)'}</option>)}</select>
                    <input value={blessMinutes} onChange={e => setBlessMinutes(e.target.value.replace(/[^0-9]/g, ''))} placeholder="유지 분(비우면 기본)" inputMode="numeric" className={cn(field, 'w-[150px]')} aria-label="유지 시간(분)"/>
                    <Primary type="button" disabled={busy || !key} onClick={() => void setBlessing()}>적용</Primary>
                </div>
                <p className="mt-1.5 text-xs text-ink-3">기여도는 그대로 두고 단계·시간만 바꿉니다. 기본 시간: 1~3단계 × 1시간, 4·5·6단계는 4·2·1시간 뒤 3단계로 내려와 12시간.</p>
            </Fold>
            <Fold title="환생 통계" note={`24시간 ${format(stats.rebirthPace.recent.day)}회 · 7일 ${format(stats.rebirthPace.recent.week)}회`}>
                <div className="grid gap-2.5">
                    <div style={grid(200)}>
                        <Tile label="환생까지 실제 시간" value={stats.rebirthPace.measured ? formatDuration(stats.rebirthPace.real.median) : '-'} note={stats.rebirthPace.measured ? `중앙값 · 평균 ${formatDuration(stats.rebirthPace.real.avg)} · ${format(stats.rebirthPace.measured)}건` : '아직 없습니다'}/>
                        <Tile label="환생까지 사냥 시간" value={stats.rebirthPace.measured ? formatDuration(stats.rebirthPace.play.median) : '-'} note={stats.rebirthPace.measured ? `중앙값 · 평균 ${formatDuration(stats.rebirthPace.play.avg)}` : ''}/>
                    </div>
                    <div style={grid(320)}>
                        <div className={cn(card, 'p-3.5')}><h3 className="mb-2 font-display text-s font-bold">회차별 평균 시간</h3>
                            {!stats.rebirthPace.byCount.length && <p className="text-s text-ink-3">없습니다.</p>}
                            <table className="w-full border-collapse text-s"><tbody>{stats.rebirthPace.byCount.map(b => <tr key={b.label}><td className="py-0.5">{b.label}</td><td className="text-right">실제 {formatDuration(b.real)}</td><td className="text-right">사냥 {formatDuration(b.play)}</td><td className="text-right text-ink-3">{format(b.count)}건</td></tr>)}</tbody></table></div>
                        <div className={cn(card, 'p-3.5')}><h3 className="mb-2 font-display text-s font-bold">최근 환생 20건</h3>
                            {!stats.rebirthPace.latest.length && <p className="text-s text-ink-3">없습니다.</p>}
                            <ol className="grid list-decimal gap-0.5 pl-5 text-xs">{stats.rebirthPace.latest.map((r, i) => <li key={i}>{r.name} · {r.n}번째 · {new Date(r.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · 실제 {formatDuration(r.realMs)}{r.partial ? '(일부)' : ''} · 사냥 {formatDuration(r.playMs)}</li>)}</ol></div>
                    </div>
                </div>
            </Fold>
            <Fold title="밸런스 점검" open={false}>
                <div style={grid(200)}>
                    <Tile label={`무릉도장 ${stats.balance.godDepth}층 이상`} value={format(stats.balance.reached)} note="첫 신과 같은 난이도를 깬 모험가"/>
                    <Tile label="신 도전" value={`${format(stats.balance.god.wins)}승 / ${format(stats.balance.god.tries)}회`} note={`도전 ${format(stats.balance.god.players)}명 · 최고 ${Math.round(stats.balance.god.best * 100)}% 깎음`}/>
                    <Tile label="오프라인 상한 도달" value={`${format(stats.balance.offline.capped)} / ${format(stats.balance.offline.settled)}`} note="최근 부재중 정산이 상한에 닿은 모험가"/>
                </div>
            </Fold>
            <Fold title="분포 · 순위" open={false}>
                <div style={grid(320)}>
                    <Bars title="레벨" rows={stats.level.buckets} total={stats.saves}/>
                    <Bars title="환생 횟수" rows={stats.rebirths.buckets} total={stats.saves}/>
                    <Bars title="무릉도장 최고 층" rows={stats.balance.abyss} total={stats.saves}/>
                    <Bars title="지금 있는 사냥터" rows={stats.stages.map(r => ({ label: r.name, count: r.count }))} total={stats.saves}/>
                    <Bars title="지금 있는 던전" rows={stats.dungeons.map(r => ({ label: r.name, count: r.count }))} total={stats.saves}/>
                    <Bars title="현재 직업 상위 15" rows={stats.jobs.map(r => ({ label: r.name, count: r.count }))} total={stats.saves}/>
                    <Bars title="계급장(계급 순)" rows={stats.ranks.dist.map(r => ({ label: r.name, count: r.count }))} total={stats.saves}/>
                    <div className={cn(card, 'p-3.5')}><h2 className="mb-2 font-display text-s font-bold">진급 특전 선택</h2>
                        <table className="w-full border-collapse text-s"><tbody>{stats.ranks.perks.map(p => <tr key={p.name}><td className="py-0.5">{p.name}</td><td className="text-right">{format(p.count)}명{stats.saves ? <small className={muted}> ({Math.round(p.count / stats.saves * 100)}%)</small> : null}</td><td className="text-right text-ink-3">평균 {p.avg} / {p.max}단계</td></tr>)}</tbody></table></div>
                    <div className={cn(card, 'p-3.5')}><h2 className="mb-2 font-display text-s font-bold">환생·레벨 상위 10</h2>
                        <ol className="grid list-decimal gap-0.5 pl-5 text-s">{stats.top.map((p, i) => <li key={i}>{p.name} · 환생 {p.rebirths}회 · Lv.{p.level}{p.abyss ? ` · 무릉도장 ${p.abyss}층` : ''}</li>)}</ol></div>
                </div>
            </Fold>
    </>;
}
