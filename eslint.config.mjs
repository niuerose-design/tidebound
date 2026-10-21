import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // v3.374 의존 방향(재설계 브리프 3절): app → components → game → (data · types). 게임 코어는 React · Next · 화면을 모르고, 화면은 서버 전용 모듈을 모릅니다.
  {
    files: ["game/**/*.{ts,tsx}"],
    ignores: ["game/server/**", "game/secret/**"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{ name: "react", message: "game/ 은 순수 TS입니다. React 를 가져오지 마세요." }, { name: "react-dom", message: "game/ 은 순수 TS입니다." }, { name: "next", message: "game/ 은 Next 를 모릅니다." }],
        patterns: [{ group: ["next/*", "@/components/*", "@/app/*", "**/components/**", "**/app/**", "@/game/server/*", "@/game/secret/*", "**/game/server/**", "**/game/secret/**"], message: "game/ 코어는 화면 · 서버 전용 모듈을 가져오지 않습니다(의존 방향 app → components → game)." }],
      }],
    },
  },
  {
    files: ["components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["@/game/server/*", "@/game/secret/*", "**/game/server/**", "**/game/secret/**", "@/app/api/*", "**/app/api/**"], message: "화면은 서버 전용 모듈(game/server · game/secret · app/api)을 가져오지 않습니다." }],
      }],
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
