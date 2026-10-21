# UI · UX 기준 (애플 휴먼 인터페이스 가이드라인)

화면을 새로 만들거나 고칠 때는 애플 HIG(https://developer.apple.com/kr/design/human-interface-guidelines/)를 기준으로 삼습니다. 이 게임에서 지키는 항목을 숫자로 적어 둡니다(v3.370).

## 꼭 지키는 숫자

| 항목 | 기준 | 구현 위치 |
|---|---|---|
| 터치 대상 | 손가락 기기(`pointer: coarse`)에서 모든 조작 요소 44×44pt 이상. 작게 보여야 하는 아이콘 · 글자 버튼은 보이는 크기는 두고 `::after`로 닿는 영역만 넓힘 | `app/styles/responsive.css` 맨 위 `@media (pointer:coarse)` |
| 글자 크기 | 11px 아래로 쓰지 않음. 본문 16px(데스크톱 · 마우스 기기는 15px, v3.387), 보조 13px(`small`), 가장 작은 표시 11px | 스타일 전체(테스트 `tests/v25.test.mjs`가 11px 미만을 잡음) |
| 글꼴 | 본문 나눔스퀘어 · 제목 마루 부리를 자체 호스팅(OFL). 기기 글꼴에 기대지 않아 어디서나 같은 모양 | `app/styles/fonts.css`, `public/fonts/`, `tools/fonts/` |
| 대비 | 글자와 배경 4.5:1 이상(18px 이상 · 14px 굵게는 3:1). 꺼진 상태 · 장식 기호는 3:1 | 색은 `theme.css` 토큰(`--muted #8d9fa4` 이상의 밝기) |
| 초점 | 키보드 초점은 버튼 · 링크 · 입력 · 선택 상자 · 접기 제목 · 탭 모두 2px 테두리 | `app/styles/elements.css` `:focus-visible` |
| 움직임 | `prefers-reduced-motion`이면 애니메이션 · 전환을 모두 끔 | `responsive.css` 첫 블록 |
| 안전 영역 | `viewport-fit: cover` + 고정 막대는 `env(safe-area-inset-bottom)` | `app/layout.tsx` viewport, `.mobile-tab-bar`, `.app-body` |
| 확대 | 핀치 확대를 막지 않음(`maximum-scale` · `user-scalable=no` 금지) | `app/layout.tsx` |
| 색만으로 뜻을 전하지 않음 | 등급 · 상태는 글자 또는 기호를 함께 둠(희귀 · 영웅 배지, ✧ ◆ 변종 기호 + 이름) | 각 화면 |
| 이름 없는 버튼 금지 | 아이콘만 있는 버튼은 `aria-label` 또는 `title` | 각 컴포넌트 |

## 구조 원칙

- **명료함**: 한 화면에 으뜸 동작(`.primary`)은 하나. 나머지는 `.secondary` · `.text-button`. 되돌릴 수 없는 동작은 붉은 색과 확인 단계를 함께 둡니다.
- **양보**: 그림 · 수치가 주인공이고 틀은 뒤로 물러납니다. 테두리 · 그림자는 계층을 나눌 때만 씁니다.
- **깊이**: 겹치는 층(시트 · 팝오버 · 토스트)은 z-index 순서를 지키고, 닫는 방법(닫기 버튼 · 바깥 탭 · Esc)을 늘 둡니다.
- **일관성**: 같은 동작은 같은 말 · 같은 자리. 버튼 글귀는 동사로 시작합니다(“장착”, “바치기”, “새로고침”).
- **적응**: 390px(휴대폰) · 768px · 1080px · 1440px에서 가로 스크롤 없이 16px 바깥 여백을 지킵니다.

## 점검 방법

스크린샷 흐름(`scripts/screenshots/`)으로 서버를 띄운 뒤, 화면마다 44px 미만 터치 대상 · 11px 미만 글자 · 4.5:1 미만 대비를 세는 점검 스크립트를 돌려 0에 가깝게 유지합니다(휴대폰 폭 390px · 데스크톱 1440px).
