'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * v27.88 알림 묶음. 데스크톱에서는 자식 알림이 그대로 쌓이고, 모바일(767px 이하)에서는 첫 알림만 보이고
 * 나머지는 ‘알림 N개 더 보기’로 펼칩니다. 자식 컴포넌트가 null을 돌려주면(닫은 알림 등) 세지 않습니다.
 */
export function NoticeStack({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [count, setCount] = useState(0), [open, setOpen] = useState(false);
    useEffect(() => {
        const el = ref.current; if (!el) return;
        const update = () => setCount(el.children.length);
        update();
        const observer = new MutationObserver(update); observer.observe(el, { childList: true });
        return () => observer.disconnect();
    }, []);
    return <div className={`notice-stack ${open ? 'open' : 'folded'}`}>
        <div className="notice-stack-list" ref={ref}>{children}</div>
        {count > 1 && <button type="button" className="notice-stack-toggle" aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? '알림 접기' : `알림 ${count - 1}개 더 보기`}<ChevronDown size={14}/></button>}
    </div>;
}
