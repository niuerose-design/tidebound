// v3.374 vitest(재설계 2단계): 새 코드(세이브 차분 · 레지스트리 · 토큰 · 게임 범용 컴포넌트)만 여기서 검사합니다.
// 기존 게임플레이 테스트(tests/*.test.mjs, 공유 시드 난수 · 파일 순서 의존)는 그대로 node tests/run.mjs 로 돌립니다.
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
    test: { include: ['tests/unit/**/*.test.ts'], environment: 'node', passWithNoTests: false },
});
