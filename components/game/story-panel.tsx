'use client';
/**
 * v3.215 스토리 탭 ‘모험 일지’: 열린 장면(State.story)을 장별로 보여 주고, 잠긴 장면은 제목 대신 열림 조건만 보입니다.
 * 읽음 표시(NEW)는 전투 기록처럼 이 브라우저에만 남깁니다(서버 저장 없음).
 */
import { useEffect, useState } from 'react';
import { BookOpen, Lock } from 'lucide-react';
import { STORY, STORY_CHAPTERS, STORY_PARTS } from '@/game/data/story';
import { kstIso } from '@/game/data/time';
import type { State } from '@/game/types';
import { Fold, Heading } from './shared';
import { ChapterBanner, SceneArt } from './story-art';

const SEEN_KEY = 'tidebound.storySeen:';
const readSeen = (name: string): string[] => { try { const v = JSON.parse(localStorage.getItem(SEEN_KEY + name) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const writeSeen = (name: string, ids: string[]) => { try { localStorage.setItem(SEEN_KEY + name, JSON.stringify(ids)); } catch { /* 저장소 없음: 이번 화면에서만 */ } };

export function StoryPanel({ s }: { s: State }) {
    const open = s.story || {}, unlocked = STORY.filter(x => open[x.id]), openKey = unlocked.map(x => x.id).join(',');
    // 이 화면을 연 순간의 읽음 목록으로 NEW를 표시하고, 열린 장면은 바로 읽음으로 적습니다(다음에 열면 NEW가 사라짐).
    const [seen, setSeen] = useState<Set<string> | null>(null);
    useEffect(() => {
        const t = setTimeout(() => { const before = readSeen(s.name); setSeen(prev => prev ?? new Set(before)); writeSeen(s.name, [...new Set([...before, ...openKey.split(',').filter(Boolean)])]); }, 0);
        return () => clearTimeout(t);
    }, [s.name, openKey]);
    const fresh = seen ? unlocked.filter(x => !seen.has(x.id)).length : 0;
    return <>
        <Heading eyebrow="ADVENTURE JOURNAL" title="모험 일지" description="판게아를 여행하며 지나온 이야기입니다. 새 지역 · 보스 · 전직 · 환생 같은 이정표를 넘으면 장면이 하나씩 열립니다. 이야기는 환생 · 승천해도 남습니다."/>
        <section className="panel story-progress" aria-label="스토리 진행">
            <BookOpen size={20}/>
            <span>열린 이야기 <b>{unlocked.length}</b> / {STORY.length}{fresh > 0 && <em className="story-new"> 새 이야기 {fresh}편</em>}</span>
            <div className="story-bar" aria-hidden><i style={{ width: `${(unlocked.length / STORY.length) * 100}%` }}/></div>
        </section>
        {STORY_PARTS.map(part => {
            const inPart = STORY.filter(x => part.chapters.includes(x.chapter)), partGot = inPart.filter(x => open[x.id]).length;
            return <section key={part.title} className="story-part">
                <h2 className="story-part-title"><span>{part.title}</span>{part.subtitle}<small>{partGot} / {inPart.length}</small></h2>
                {part.chapters.map(ci => {
                    const chapter = STORY_CHAPTERS[ci], scenes = STORY.filter(x => x.chapter === ci), got = scenes.filter(x => open[x.id]).length;
                    const fresh = seen ? scenes.filter(x => open[x.id] && !seen.has(x.id)).length : 0;
                    // 접은 상태는 장마다 이 기기에 기억합니다(Fold). v3.217 처음에는 모든 장이 접혀 있습니다(장 제목의 NEW 수로 새 이야기를 알 수 있음).
                    return <Fold key={chapter} id={`story:${ci}`} className="story-chapter" defaultOpen={false} title={chapter} note={<>{got} / {scenes.length}{fresh > 0 && <span className="story-badge">NEW {fresh}</span>}</>}>
                        <ChapterBanner chapter={ci} title={chapter} dim={got === 0}/>
                        <div className="story-list">{scenes.map(x => open[x.id]
                            ? <article key={x.id} className="panel story-scene">
                                <header><h3>{x.title}{seen && !seen.has(x.id) && <span className="story-badge">NEW</span>}</h3><time>{kstIso(open[x.id]).slice(0, 10).replace(/-/g, '.')}</time></header>
                                <SceneArt id={x.id} title={x.title}/>
                                {x.lines.map((line, i) => <p key={i}>{line}</p>)}
                            </article>
                            : <article key={x.id} className="panel story-scene story-locked"><Lock size={15}/><span>잠긴 이야기 · {x.hint}</span></article>)}</div>
                    </Fold>;
                })}
            </section>;
        })}
    </>;
}
