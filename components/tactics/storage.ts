/** 전기 모드 저장: 브라우저 localStorage. 본편 세이브와 완전히 분리됩니다. */
import type { Battle, Mode } from '@/game/srpg/engine/types';
import type { Campaign } from '@/game/srpg/state/campaign';
const CAMPAIGN_KEY = 'tactics.campaign.v1';
const SESSION_KEY = 'tactics.session.v1';
const PREF_KEY = 'tactics.prefs.v1';
/** 전투 중 저장(새로고침 복구 · 되감기 재료). snapshots는 각 플레이어 턴 시작 상태(최근 6개). */
export interface Session { chapterId: string; battle: Battle; snapshots: Battle[]; deployed: string[] }
export interface Prefs { tile: number; speed: 'normal' | 'fast'; showGrid: boolean }
const read = <T>(key: string): T | null => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : null; } catch { return null; } };
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장 공간 부족 등: 조용히 무시 */ } };
export const loadCampaign = () => read<Campaign>(CAMPAIGN_KEY);
export const saveCampaign = (c: Campaign) => write(CAMPAIGN_KEY, c);
export const clearCampaign = () => { try { localStorage.removeItem(CAMPAIGN_KEY); localStorage.removeItem(SESSION_KEY); } catch { /* noop */ } };
export const loadSession = () => read<Session>(SESSION_KEY);
export const saveSession = (s: Session) => write(SESSION_KEY, s);
export const clearSession = () => { try { localStorage.removeItem(SESSION_KEY); } catch { /* noop */ } };
/** 손가락으로 쓰는 기기인지(HIG 44pt 터치 기준). */
export const coarsePointer = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
/** 칸 크기 선택지. 손가락 기기는 44px 아래로 내려가지 않습니다. */
export const tileSizes = () => coarsePointer() ? [44, 56, 68] : [36, 44, 56];
export const loadPrefs = (): Prefs => { const saved = read<Partial<Prefs>>(PREF_KEY) ?? {}; const sizes = tileSizes(); const tile = saved.tile && sizes.includes(saved.tile) ? saved.tile : 44; return { speed: 'normal', showGrid: true, ...saved, tile }; };
export const savePrefs = (p: Prefs) => write(PREF_KEY, p);
export const MODE_NAMES: Record<Mode, string> = { casual: '캐주얼', classic: '클래식' };
