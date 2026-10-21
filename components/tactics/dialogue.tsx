'use client';
import { useState } from 'react';
import type { Line } from '@/game/srpg/engine/types';
import { speakerName, portraitGlyph } from './format';
/** 대사 창: 한 줄씩 넘기고 끝나면 onDone. 건너뛰기 가능. */
export function DialogueBox({ lines, onDone, title }: { lines: Line[]; onDone: () => void; title?: string }) {
    const [i, setI] = useState(0);
    const line = lines[i];
    if (!line) return null;
    const next = () => { if (i + 1 >= lines.length) onDone(); else setI(i + 1); };
    const isUnit = line.speaker.startsWith('unit_');
    return <div className="tx-dialogue" onClick={next} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') next(); }}>
        {title && <div className="tx-dialogue-title">{title}</div>}
        <div className={`tx-dialogue-box emo-${line.emotion ?? 'neutral'}`}>
            <span className={`tx-portrait ${isUnit ? 'ally' : 'other'}`}>{portraitGlyph(line.speaker)}</span>
            <div><strong>{speakerName(line.speaker)}</strong><p>{line.text}</p></div>
            <small>{i + 1}/{lines.length} · 눌러서 다음</small>
        </div>
        <button type="button" className="text-button tx-skip" onClick={e => { e.stopPropagation(); onDone(); }}>건너뛰기</button>
    </div>;
}
