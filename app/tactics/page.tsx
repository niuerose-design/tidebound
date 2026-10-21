import type { Metadata } from 'next';
import TacticsEntry from '@/components/tactics/tactics-entry';
export const metadata: Metadata = { title: '소금바람 해안 전기 — 판게아 전기(턴제 전술)', description: '판게아 RPG의 독립 턴제 전술 모드. 10장의 이야기를 이동 · 공격 · 지형 · 상성으로 풀어 갑니다.' };
export default function TacticsPage() { return <TacticsEntry/>; }
