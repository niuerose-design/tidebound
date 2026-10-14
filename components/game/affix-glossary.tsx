'use client';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { STAT_LABELS } from '@/game/data/progression';
import type { Stats } from '@/game/types';

/** v3.323 장비 옵션 이름 사전에 쓰는 옵션 한 줄(이름 · 오르는 능력치 · 설명). */
export type GlossaryAffix = { id: string; name: string; stat: string; stat2?: string; base2?: number; description: string };
/** 옵션이 바꾸는 능력치를 짧게: ‘처치 골드’, 양날 옵션은 ‘물리 공격 ↑ · 물리 방어 ↓’. */
export const affixShortLabel = (a: GlossaryAffix) => {
    const label = (k: string) => STAT_LABELS[k as keyof Stats] || k;
    if (!a.stat2) return label(a.stat);
    return (a.base2 ?? 0) < 0 ? `${label(a.stat)} ↑ · ${label(a.stat2)} ↓` : `${label(a.stat)} · ${label(a.stat2)}`;
};

/** v3.323 옵션 이름 → 뜻 목록. 상점(저격 · 자동 뽑기)과 도움말이 같은 목록을 씁니다. 높이가 넘치면 목록 안에서만 스크롤합니다. */
export function AffixGlossaryList({ affixes, picked }: { affixes: GlossaryAffix[]; picked?: string }) {
    return <ul className="affix-glossary" aria-label="장비 옵션 설명">
        {affixes.map(a => <li key={a.id} className={a.id === picked ? 'on' : ''}>
            <b>{a.name}</b><span className="affix-glossary-stat">{affixShortLabel(a)}</span><small>{a.description}</small>
        </li>)}
    </ul>;
}

/** v3.323 옵션 고르기 옆의 ‘옵션 설명’ 버튼: 누르면 지금 부위에서 고를 수 있는 옵션의 뜻을 펼칩니다. */
export function AffixGlossaryButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
    return <button type="button" className="affix-glossary-toggle" aria-expanded={open} onClick={onToggle}><Info size={14}/> 옵션 설명</button>;
}
export const useGlossaryToggle = () => { const [open, setOpen] = useState(false); return { open, toggle: () => setOpen(v => !v) }; };
