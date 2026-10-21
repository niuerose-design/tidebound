'use client';
import dynamic from 'next/dynamic';
/** 전기 모드는 브라우저 저장소를 바로 읽으므로 서버 렌더 없이 띄웁니다. */
const TacticsApp = dynamic(() => import('./tactics-app'), { ssr: false, loading: () => <div className="tx-center"><p>전기를 펼치는 중...</p></div> });
export default function TacticsEntry() { return <TacticsApp/>; }
