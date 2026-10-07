import { gzipSync, gunzipSync } from 'node:zlib';
/**
 * v25.10 세이브 압축: Neon에는 gzip+base64('gz:' 접두)로 저장해 읽기 전송량을 약 1/3로 줄입니다(Lv.60 세이브 24KB → 8KB).
 * v3.124 압축 단계 6 → 4: 요청마다 드는 CPU를 절반(약 1.2ms → 0.7ms)으로 줄이고 크기는 약 7% 커집니다(64KB 세이브 13.7KB → 14.6KB).
 * 읽을 때 접두가 없으면 평문 JSON으로 보고 그대로 돌려주므로 기존 행은 다음 저장 때 자연히 압축됩니다.
 */
const PACK_PREFIX = 'gz:';
export function packState(json: string) { return PACK_PREFIX + gzipSync(Buffer.from(json, 'utf8'), { level: 4 }).toString('base64'); }
export function unpackState(stored: string) { return stored.startsWith(PACK_PREFIX) ? gunzipSync(Buffer.from(stored.slice(PACK_PREFIX.length), 'base64')).toString('utf8') : stored; }
