import 'server-only';
/**
 * v3.333 서버 리전 점검(운영 페이지): Vercel 함수 리전(VERCEL_REGION)과 Neon DB 리전(DATABASE_URL 호스트, 예: ep-xxx.ap-southeast-1.aws.neon.tech)을 읽어
 * 둘이 다르면 vercel.json의 regions에 넣을 Vercel 리전 id를 권합니다. DB 왕복(요청마다 1~2번)이 리전이 다르면 수백 ms라, 옵션 재설정 연타 같은 짧은 요청의 체감을 좌우합니다.
 */
/** Neon(AWS · Azure) 리전 → 가장 가까운 Vercel 함수 리전 id. */
const VERCEL_BY_NEON: Record<string, string> = {
    'aws-us-east-1': 'iad1', 'aws-us-east-2': 'cle1', 'aws-us-west-2': 'pdx1', 'aws-eu-central-1': 'fra1', 'aws-eu-west-2': 'lhr1',
    'aws-ap-southeast-1': 'sin1', 'aws-ap-southeast-2': 'syd1', 'aws-ap-northeast-1': 'hnd1', 'aws-sa-east-1': 'gru1',
    'azure-eastus2': 'iad1', 'azure-westus3': 'sfo1', 'azure-gwc': 'fra1',
};
/** Vercel 리전 id → 도시(안내용). */
const VERCEL_CITY: Record<string, string> = { iad1: '워싱턴', cle1: '클리블랜드', pdx1: '포틀랜드', sfo1: '샌프란시스코', fra1: '프랑크푸르트', lhr1: '런던', sin1: '싱가포르', syd1: '시드니', hnd1: '도쿄', icn1: '서울', gru1: '상파울루', bom1: '뭄바이', kix1: '오사카', cdg1: '파리', arn1: '스톡홀름', dub1: '더블린', cpt1: '케이프타운', hkg1: '홍콩' };
/** DATABASE_URL 호스트에서 Neon 리전을 읽습니다(비밀번호 등은 돌려주지 않음). 못 읽으면 null. */
export function dbRegionOf(url: string | undefined) {
    if (!url) return null;
    let host = '';
    try { host = new URL(url.replace(/^postgres(ql)?:/, 'https:')).hostname; } catch { return null; }
    const m = host.match(/\.([a-z]{2}-[a-z]+-\d)\.(aws)\.neon\.tech$/) || host.match(/\.([a-z0-9]+)\.(azure)\.neon\.tech$/);
    return m ? `${m[2]}-${m[1]}` : null;
}
export function serverRegions() {
    const functionRegion = process.env.VERCEL_REGION || null, dbRegion = dbRegionOf(process.env.DATABASE_URL || process.env.POSTGRES_URL);
    const recommended = dbRegion ? VERCEL_BY_NEON[dbRegion] || null : null;
    const aligned = !!functionRegion && !!recommended && functionRegion === recommended;
    return { functionRegion, functionCity: functionRegion ? VERCEL_CITY[functionRegion] || null : null, dbRegion, recommended, recommendedCity: recommended ? VERCEL_CITY[recommended] || null : null, aligned };
}
