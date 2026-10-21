# 디자인 시스템 (재설계 2단계 토대, v3.374)

브리프 6절(디자인 시스템) · 3절(의존 방향)의 첫 구현입니다. 기존 화면은 바꾸지 않았고, **새 화면과 교체하는 화면부터** 이 토대만 씁니다.
나열 · 검토: 개발 서버에서 `/dev/ui` (운영 빌드는 404). 접근성 기준은 `docs/ui-hig.md`(터치 44pt · 글자 11px 이상 · 대비 4.5:1 · 초점 · 안전 영역).

## 1. 토큰 (`app/styles/tokens.css`, Tailwind 4 `@theme`)

| 묶음 | 토큰 | Tailwind 예 |
|---|---|---|
| 바탕 | `--surface-0`(화면) · `-1`(사이드바 · 피드) · `-2`(카드) · `-3`(칸 · 막대 바탕) | `bg-surface-2` |
| 글자 | `--ink-1`(본문) · `-2`(보조) · `-3`(흐림, 4.5:1 이상) | `text-ink-3` |
| 선 · 강조 | `--line` · `--line-strong` · `--accent` · `--accent-ink` · `--accent-soft` · `--gold-ink` | `border-line`, `bg-accent` |
| 등급 7 | `--rarity-common … primal` (= `game/data/balance` RARITIES 색, 테스트로 고정) | `text-rarity-epic` |
| 피해 4 | `--dmg-physical · magic · split · fixed` | `text-dmg-magic` |
| 상태 4 | `--ok · warn · danger · info` | `text-danger` |
| 글자 크기 | `--text-xs 11 · s 13 · m 15 · l 18 · xl 22 · 2xl 28` | `text-s` |
| 간격 · 둥글기 · 그림자 · 모션 | `--space-1~8`(4px 단위) · `--radius-s/m/l` · `--shadow-1/2` · `--duration-fast/base` · `--ease-out` | `rounded-m`, `shadow-2` |
| 글꼴 | `--font-ui`(나눔스퀘어, v3.387 자체 호스팅) · `--font-display`(마루 부리, 제목 · 눈썹 글) · `--font-num`(고정폭 숫자, `tabular-nums`) | `font-display` · `font-num` |

- 기존 변수(`--background` · `--card` · `--primary` · `--muted` · `--border` · `--gold`)는 그대로 두었고, 토큰이 같은 값을 가리킵니다(`tests/unit/tokens.test.ts`).
- 다크가 기본, 라이트는 `:root[data-theme="light"]`에 값만 정의(스위치는 아직 없음).
- 새 컴포넌트에는 hex 직접 사용 금지. 등급 · 피해처럼 데이터에서 오는 색은 `rarityVar()` · `var(--dmg-*)`로.

## 2. 게임 범용 컴포넌트 (`components/ui/game/`)

게임 의미를 모르는 조각입니다(데이터는 전부 props). `import { … } from '@/components/ui/game'`.

| 컴포넌트 | 쓰임 | 접근성 |
|---|---|---|
| `StatBar` | 체력 · 마나 · 경험치 막대. 줄면 잔상, 늘면 번쩍. 축약 숫자 + 정확한 값 title | `role="meter"` |
| `NumberTicker` | 큰 숫자(만 · 억 · 조), 변화 때 굴러감(rAF, 모션 줄이기면 즉시), 고정폭 | title 에 정확한 값 |
| `ItemSlot` | 등급 테두리 · 수량 · 잠금 · 선택 · 빈 칸. 기본 44px | `button` + `aria-label` · `aria-pressed` |
| `RichTooltip` | 이름 · 등급 · 플레이버 · 효과 · 획득처 공통 틀. hover · focus · 길게 누르기 | `role="tooltip"` · Esc |
| `RarityTag` · `ElementIcon` · `TierBadge` | 등급 · 피해 종류 · 차수. 색과 글자를 함께 | 글자 또는 `aria-label` |
| `LogFeed` | 가상 스크롤 기록, 자동 따라가기 + 멈춤 감지, 종류 필터 | `role="log"` · `aria-live` |
| `ProgressRing` | 둥근 진행도 | `role="progressbar"` |
| `EmptyState` · `SectionHeader` · `KeyValueList` | 빈 화면 · 구역 제목 · 이름/값 목록 | 제목 계층 `h1~h3` |
| `formatShort` · `formatExact` · `formatPercent` | 숫자 표기 | |

규칙: feature(화면) 컴포넌트는 shadcn 기본 + 이 조각만 조합하고 새 스타일을 정의하지 않습니다. 파괴적 행동은 확인 Dialog + 되돌리기 토스트(sonner), 로딩은 Skeleton.

## 3. 의존 방향 (ESLint, `eslint.config.mjs`)

`app → components → game → (data · types)`.
- `game/**`(server · secret 제외): `react` · `react-dom` · `next` · `components` · `app` · `game/server` · `game/secret` 가져오기 금지.
- `components/**`: `game/server` · `game/secret` · `app/api` 가져오기 금지(비밀 모듈은 `server-only`로 빌드도 실패).

## 4. 테스트

- 새 코드는 **vitest**(`pnpm test:unit`, `tests/unit/**/*.test.ts`): 세이브 차분 · 숫자 표기 · 토큰 일치.
- 기존 게임플레이 테스트(`pnpm test`, 공유 시드 난수 · 파일 순서 의존)는 그대로. CI는 둘 다 돌립니다.

## 5. 다음 단계

3단계(시드 난수 · 골든 테스트 · 세이브 v2 체인)는 v3.375~3.378에 끝났고, 4단계는 **설정 화면(v3.381, `components/features/settings/settings-screen.tsx`)**부터 이 토대 위에 새로 만듭니다. 새 화면 규칙: `components/features/<화면>/`에 두고, 토큰 · shadcn 기본(`components/ui`, v3.381 `Switch` 추가) · 게임 범용 조각만 조합하며 전역 CSS 를 더하지 않습니다. 터치 기기의 44pt 는 `responsive.css`의 공통 규칙이 버튼 · 입력 · 선택 상자에 적용되고, 스위치처럼 모양이 고정된 조각은 `::after`로 닿는 영역을 채웁니다. 메뉴 화면은 주소 해시(`#settings`)를 가집니다(`components/game/view-route.ts`). 도감 화면(v3.382, `components/features/codex/`)이 두 번째입니다. 이때 더한 조각: `ChoiceChips`(값 고르기 칩, `aria-pressed`) · `FoldSection`(접는 구역, 닫히면 내용을 마운트하지 않음) · shadcn `Collapsible`. 장비 보관함(v3.384, `components/features/inventory/`)이 세 번째입니다. 이때 더한 조각: `ConfirmAction`(확인 창을 거치는 행동 버튼). 스킬 화면(v3.385, `components/features/skills/`)이 네 번째입니다. 셸(v3.386, `components/features/shell/`): 메뉴 목록 `nav.ts`, 사이드바 `SideNav`(shadcn Sidebar 위에 토큰 유틸리티), 상단 바 `TopBar`(제목 · 재화 `NumberTicker` 칩 · 저장 상태 · 설정, sticky), 모바일 탭 `TabBar`(5칸, 안전 영역), 진행 위젯 `ActivityWidget`(card · strip). 자동 사냥(v3.389 1차, `components/features/battle/`): `BattleScreen`(틀) · `PlayerCard`(긴 카드 · compact 한 줄) · `Notices` · `Rail`(기록판 `FoldSection` + 선택판 `Tabs`). 2차(v3.390): `TidePanel`(난이도 · 집중 사냥 `ChoiceChips`) · `Arena`(장면 + `Dock`) · `Hotbar`(`RichTooltip`) · `Whistle`(Popover) · `kkami.tsx`. 장면 안의 연출(`scene-stage` · `combat-fx`)은 연출 CSS(`battle.css`)에 붙어 있어 옛 클래스를 그대로 쓰는 예외입니다. 능력치 · 치장(v3.392, `components/features/character/`): `CharacterScreen` · `CosmeticsScreen`과 `breakdown.tsx`의 `FoldRow`(이름 · 값 한 줄 → 출처 목록 · 설명 펼침) · `StatRow` · `MasteryRow` · `RankPerkRow`. 옛 character-panel · cosmetics-panel · stat-breakdown은 삭제. 상점 · 던전 주화 상점(v3.393, `components/features/shop/`): `ShopScreen` · `DungeonShopScreen`, `parts.tsx`의 `GoodCard`(머리 · 설명 · 고르는 칸 · 가격 · 버튼) · `Tile` · `Field`. 옛 shop-panel · dungeon-shop-panel · inventory-panel 삭제.
