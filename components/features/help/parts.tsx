import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { FoldSection } from '@/components/ui/game';
import { cn } from '@/lib/utils';
import { AFFIX_POOL } from '@/game/data/gear';
/** v3.413 도움말 공용 조각(help-screen.tsx 에서 분리): 글 스타일 · 규칙 카드 · 주제 접이 · 옵션 목록 · 상태이상 묶음. */
export const GLOSSARY_AFFIXES = AFFIX_POOL.filter(a => !a.retired && !a.junk && !a.onlyOrigin).map(a => ({ ...a, name: a.kind === 'rule' ? `◆ ${a.name}` : a.name }));

/** 0.125 → 12.5 */
export const pctOf = (n: number) => Number((n * 100).toFixed(1));

/** v3.400 도움말 본문 공통 글 스타일(옛 help CSS 대신 Tailwind 변형): 문단 · 목록 · 굵은 글. */
export const PROSE = '[&_p]:text-xs [&_p]:leading-relaxed [&_p]:text-ink-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:text-xs [&_ul]:leading-relaxed [&_ul]:text-ink-2 [&_li]:mt-0.5 [&_b]:text-ink-1 [&_strong]:text-ink-1';
/**
 * v3.455 도움말 항목(docs/writing.md 5단계): 효과 · 조건 · 제한 세 칸 틀 대신 질문 하나와 답 문단들. 기본 <details>라 접혀 있고,
 * 질문 줄은 손가락 기기에서 44pt · 초점 테두리. 답은 effect → condition → limit 순서의 문단이고 이름표는 붙이지 않습니다.
 */
export function Rule({ icon, q, title, effect, condition, limit }: { icon: ReactNode; /** 질문. 없으면 제목을 그대로 씁니다. */ q?: string; title: string; effect: ReactNode; condition?: ReactNode; limit?: ReactNode }) {
    return <details className="group rounded-m border border-line bg-surface-1">
        <summary className="flex min-h-11 cursor-pointer select-none list-none items-center gap-2 px-3 py-2 outline-none hover:bg-surface-3/60 focus-visible:ring-[3px] focus-visible:ring-accent/50 [&::-webkit-details-marker]:hidden">
            <span className="shrink-0 [&_svg]:size-4 [&_svg]:text-accent" aria-hidden>{icon}</span>
            <h3 className="min-w-0 flex-1 text-s font-semibold text-ink-1">{q || title}</h3>
            <ChevronRight size={14} className="shrink-0 text-ink-3 transition-transform motion-reduce:transition-none group-open:rotate-90" aria-hidden/>
        </summary>
        <div className={cn('grid gap-2 border-t border-line px-3 py-3 text-xs leading-relaxed text-ink-2', PROSE)}>
            <p>{effect}</p>
            {condition && <p>{condition}</p>}
            {limit && <p>{limit}</p>}
        </div>
    </details>;
}
/** 도움말 주제: 제목을 눌러 접고 펼칩니다. v27.81 모든 주제가 접힌 채로 시작합니다. */
export function Topic({ icon, title, note, open = false, children }: { icon: ReactNode; title: string; note: string; open?: boolean; children: ReactNode }) {
    // v3.455 한 줄 요약은 제목 오른쪽이 아니라 아래 줄(extra)에: 휴대폰에서 제목과 요약이 서로 밀어내던 것을 막습니다.
    return <FoldSection title={<span className="inline-flex items-center gap-2 [&_svg]:size-[18px] [&_svg]:text-accent">{icon}{title}</span>} extra={note} defaultOpen={open}><div className={cn('grid gap-3', PROSE)}>{children}</div></FoldSection>;
}
export const STATUS_GROUPS = [
    { title: '행동 방해', ids: ['stun', 'silence', 'weaken', 'corrode'] },
    { title: '지속 피해 · 속도', ids: ['bleed', 'poison', 'burn', 'slow', 'haste'] },
] as const;
