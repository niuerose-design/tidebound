// v3.374 vitest(재설계 2단계): 새 코드(세이브 차분 · 레지스트리 · 토큰 · 게임 범용 컴포넌트)만 여기서 검사합니다.
// 기존 게임플레이 테스트(tests/*.test.mjs, 공유 시드 난수 · 파일 순서 의존)는 그대로 node tests/run.mjs 로 돌립니다.
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    // 'server-only'(Next 빌드 표식)는 빈 모듈로: 엔진(game/secret/register)을 vitest에서도 불러올 수 있게.
    resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)), 'server-only': fileURLToPath(new URL('./tests/unit/stubs/server-only.ts', import.meta.url)) } },
    test: { include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'], environment: 'node', passWithNoTests: false },
});
