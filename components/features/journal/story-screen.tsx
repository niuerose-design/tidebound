'use client';
/**
 * v3.401 모험 일지(새 토대): 열린 장면(State.story)을 부 · 장별로 보여 주고, 잠긴 장면은 제목 대신 열림 조건만 보입니다.
 * 읽음 표시(NEW)는 전투 기록처럼 이 브라우저에만 남깁니다(서버 저장 없음). 삽화(ChapterBanner · SceneArt)는 그림 조각이라 그대로 씁니다.
 */
import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, Lock } from 'lucide-react';
import { STORY, STORY_CHAPTERS, STORY_PARTS } from '@/game/data/story';
import { kstIso } from '@/game/data/time';
import type { State } from '@/game/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SectionHeader, FoldSection, StatBar } from '@/components/ui/game';
import { ChapterBanner, SceneArt } from '@/components/game/story-art';
import { cn } from '@/lib/utils';

const SEEN_KEY = 'tidebound.storySeen:';
const readSeen = (name: string): string[] => { try { const v = JSON.parse(localStorage.getItem(SEEN_KEY + name) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const writeSeen = (name: string, ids: string[]) => { try { localStorage.setItem(SEEN_KEY + name, JSON.stringify(ids)); } catch { /* 저장소 없음: 이번 화면에서만 */ } };
const New = ({ n }: { n?: number }) => <span className="rounded-s bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-ink">NEW{n ? ` ${n}` : ''}</span>;

export function StoryScreen({ s }: { s: State }) {
    const open = s.story || {}, unlocked = STORY.filter(x => open[x.id]), openKey = unlocked.map(x => x.id).join(',');
    // 이 화면을 연 순간의 읽음 목록으로 NEW를 표시하고, 열린 장면은 바로 읽음으로 적습니다(다음에 열면 NEW가 사라짐).
    const [seen, setSeen] = useState<Set<string> | null>(null);
    useEffect(() => {
        const t = setTimeout(() => { const before = readSeen(s.name); setSeen(prev => prev ?? new Set(before)); writeSeen(s.name, [...new Set([...before, ...openKey.split(',').filter(Boolean)])]); }, 0);
        return () => clearTimeout(t);
    }, [s.name, openKey]);
    const fresh = seen ? unlocked.filter(x => !seen.has(x.id)).length : 0;
    return <div className="grid gap-4 text-ink-1">
        <SectionHeader as="h1" eyebrow="ADVENTURE JOURNAL" title="모험 일지" description="판게아를 여행하며 지나온 이야기입니다. 새 지역 · 보스 · 전직 · 환생 같은 이정표를 넘으면 장면이 하나씩 열립니다. 이야기는 환생 · 승천해도 남습니다."/>
        <section className="flex items-center gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1" aria-label="스토리 진행">
            <BookOpen size={20} className="shrink-0 text-accent"/>
            <div className="grid min-w-0 flex-1 gap-1"><span className="text-s">열린 이야기 <b className="font-num">{unlocked.length}</b> / {STORY.length}{fresh > 0 && <em className="ml-2 text-xs not-italic text-accent">새 이야기 {fresh}편</em>}</span><StatBar size="s" tone="exp" value={unlocked.length} max={STORY.length} showText={false}/></div>
        </section>
        {STORY_PARTS.map(part => {
            const inPart = STORY.filter(x => part.chapters.includes(x.chapter)), partGot = inPart.filter(x => open[x.id]).length;
            return <section key={part.title} className="grid gap-3">
                <h2 className="flex flex-wrap items-baseline gap-2 font-display text-l font-bold"><span>{part.title}</span><span className="text-s font-normal text-ink-2">{part.subtitle}</span><small className="font-num text-xs font-normal text-ink-3">{partGot} / {inPart.length}</small></h2>
                {part.chapters.map(ci => {
                    const chapter = STORY_CHAPTERS[ci], scenes = STORY.filter(x => x.chapter === ci), got = scenes.filter(x => open[x.id]).length;
                    const freshIn = seen ? scenes.filter(x => open[x.id] && !seen.has(x.id)).length : 0;
                    // v3.217 처음에는 모든 장이 접혀 있습니다(장 제목의 NEW 수로 새 이야기를 알 수 있음).
                    return <FoldSection key={chapter} defaultOpen={false} title={chapter} summary={<span className="inline-flex items-center gap-2">{got} / {scenes.length}{freshIn > 0 && <New n={freshIn}/>}</span>}>
                        <ChapterBanner chapter={ci} title={chapter} dim={got === 0}/>
                        <div className="grid gap-2">{scenes.map(x => open[x.id]
                            ? <Scene key={x.id} title={x.title} date={kstIso(open[x.id]).slice(0, 10).replace(/-/g, '.')} fresh={!!seen && !seen.has(x.id)} id={x.id} lines={x.lines}/>
                            : <article key={x.id} className="flex items-center gap-2 rounded-m border border-dashed border-line bg-surface-1 p-3 text-xs text-ink-3"><Lock size={14}/><span>잠긴 이야기 · {x.hint}</span></article>)}</div>
                    </FoldSection>;
                })}
            </section>;
        })}
    </div>;
}
/** v3.218 장면도 하나씩 접었다 폅니다(처음엔 접힘, 펼칠 때 삽화 · 글을 그림). */
function Scene({ id, title, date, fresh, lines }: { id: string; title: string; date: string; fresh: boolean; lines: string[] }) {
    const [open, setOpen] = useState(false);
    return <Collapsible open={open} onOpenChange={setOpen} className="rounded-m border border-line bg-surface-1">
        <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-2 rounded-m px-3 py-2 text-left outline-none hover:bg-surface-3/60 focus-visible:ring-[3px] focus-visible:ring-accent/50">
            <h3 className="inline-flex min-w-0 flex-1 items-center gap-2 font-display text-s font-semibold"><span className="truncate">{title}</span>{fresh && <New/>}</h3><time className="font-num text-xs text-ink-3">{date}</time><ChevronDown size={16} className={cn('shrink-0 text-ink-3 transition-transform', open && 'rotate-180')} aria-hidden/>
        </CollapsibleTrigger>
        <CollapsibleContent><div className="grid gap-2 border-t border-line px-3 py-3"><SceneArt id={id} title={title}/>{lines.map((line, i) => <p key={i} className="text-s leading-relaxed text-ink-2">{line}</p>)}</div></CollapsibleContent>
    </Collapsible>;
}
