import { gzipSync, gunzipSync } from 'node:zlib';
/**
 * v25.10 세이브 압축: Neon에는 gzip+base64('gz:' 접두)로 저장해 읽기 전송량을 약 1/5로 줄입니다.
 * 읽을 때 접두가 없으면 평문 JSON으로 보고 그대로 돌려주므로 기존 행은 다음 저장 때 자연히 압축됩니다.
 */
export const PACK_PREFIX = 'gz:';
export function packState(json: string) { return PACK_PREFIX + gzipSync(Buffer.from(json, 'utf8'), { level: 6 }).toString('base64'); }
export function unpackState(stored: string) { return stored.startsWith(PACK_PREFIX) ? gunzipSync(Buffer.from(stored.slice(PACK_PREFIX.length), 'base64')).toString('utf8') : stored; }
