import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * v3.450 자세한 규칙(docs/writing.md 3단계): 화면에는 안내문 한 문장만 두고, 나머지 규칙은 이 안에 접어 둡니다.
 * 기본 <details>라 자바스크립트 없이도 열리고, 머리줄은 손가락 기기에서 44pt · 키보드 초점 테두리. 내용은 <p> 하나에 한 뜻씩.
 */
export function FinePrint({ summary = '자세한 규칙', className, children }: { summary?: string; className?: string; children: ReactNode }) {
    return <details className={cn('group text-xs leading-relaxed text-ink-3', className)}>
        <summary className="inline-flex cursor-pointer select-none list-none items-center gap-1 rounded-m py-1 text-ink-2 outline-none hover:text-ink-1 focus-visible:ring-[3px] focus-visible:ring-accent/50 pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
            <ChevronRight size={14} className="shrink-0 transition-transform motion-reduce:transition-none group-open:rotate-90" aria-hidden/>{summary}
        </summary>
        <div className="grid gap-1.5 pb-1 pl-5 [&_p]:m-0 [&_ul]:list-disc [&_ul]:pl-4">{children}</div>
    </details>;
}
