# 죽은 CSS 규칙 정리 (v3.391)

`prune.py`는 `app/styles/*.css`(fonts · tokens · theme 제외)에서 선택자의 **모든 클래스가 소스(components · app · lib · game 의 ts · tsx · mjs)에 없는** 규칙을 지웁니다. 동적 클래스(`tone-${x}` · `'scene-fx-' + kind`)는 접두사로 살려 두고, 빈 `@media` 블록은 함께 지웁니다. 지운 선택자 목록은 같은 폴더의 `removed.txt`에 남깁니다(git 제외).

```bash
python3 -I tools/css-prune/prune.py
pnpm build && (전 화면 스크린샷을 지우기 전과 비교)   # 화면이 같은지 확인한 뒤 커밋
```

주의: CSS 안에서만 서로 가리키는 규칙(예: 부모 클래스만 소스에 있고 자식 클래스는 CSS 에만 있는 경우)은 자식 클래스가 소스에 없으면 지워집니다. 그런 클래스는 소스에 적어 두거나 `KEEP_ALWAYS`에 넣습니다.
