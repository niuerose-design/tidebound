import type { ReactNode } from 'react';
import { FoldSection } from '@/components/ui/game';
import { cn } from '@/lib/utils';
import { AFFIX_POOL } from '@/game/data/gear';
/** v3.413 도움말 공용 조각(help-screen.tsx 에서 분리): 글 스타일 · 규칙 카드 · 주제 접이 · 옵션 목록 · 상태이상 묶음. */
export const GLOSSARY_AFFIXES = AFFIX_POOL.filter(a => !a.retired && !a.junk && !a.onlyOrigin).map(a => ({ ...a, name: a.kind === 'rule' ? `◆ ${a.name}` : a.name }));

/** 0.125 → 12.5 */
export const pctOf = (n: number) => Number((n * 100).toFixed(1));

/** v3.400 도움말 본문 공통 글 스타일(옛 help CSS 대신 Tailwind 변형): 문단 · 목록 · 굵은 글. */
export const PROSE = '[&_p]:text-xs [&_p]:leading-relaxed [&_p]:text-ink-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:text-xs [&_ul]:leading-relaxed [&_ul]:text-ink-2 [&_li]:mt-0.5 [&_b]:text-ink-1 [&_strong]:text-ink-1';
/** 도움말 카드: 효과 → 조건 → 제한. 각 항목은 두세 문장으로 짧게 적습니다. */
export function Rule({ icon, title, effect, condition, limit }: { icon: ReactNode; title: string; effect: ReactNode; condition?: ReactNode; limit?: ReactNode }) {
    const row = (k: string, v: ReactNode) => <><dt className="text-xs font-semibold text-accent">{k}</dt><dd className={cn('text-xs leading-relaxed text-ink-2', PROSE)}>{v}</dd></>;
    return <section className="grid content-start gap-2 rounded-m border border-line bg-surface-1 p-3">
        <h3 className="inline-flex items-center gap-1.5 text-s font-semibold [&_svg]:size-4 [&_svg]:text-accent">{icon} {title}</h3>
        <dl className="grid gap-1">{row('효과', effect)}{condition && row('조건', condition)}{limit && row('제한', limit)}</dl>
    </section>;
}
/** 도움말 주제: 제목을 눌러 접고 펼칩니다. v27.81 모든 주제가 접힌 채로 시작합니다. */
export function Topic({ icon, title, note, open = false, children }: { icon: ReactNode; title: string; note: string; open?: boolean; children: ReactNode }) {
    return <FoldSection title={<span className="inline-flex items-center gap-2 [&_svg]:size-[18px] [&_svg]:text-accent">{icon}{title}</span>} summary={note} defaultOpen={open}><div className={cn('grid gap-3', PROSE)}>{children}</div></FoldSection>;
}
export const STATUS_GROUPS = [
    { title: '행동 방해', ids: ['stun', 'silence', 'weaken', 'corrode'] },
    { title: '지속 피해 · 속도', ids: ['bleed', 'poison', 'burn', 'slow', 'haste'] },
] as const;
