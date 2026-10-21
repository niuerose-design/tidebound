# 전기 입체 보기 스프라이트(블렌더)

`render.py`가 블렌더(파이썬 모듈 `bpy`)로 지형 타일과 클래스별 유닛을 로우폴리로 만들고, 같은 2:1 아이소메트릭 카메라로 렌더해 `public/art/tactics/*.webp`와 `manifest.json`(프레임 크기 · 마름모 가로 · 바닥 중심 anchor)을 씁니다. 게임은 `components/tactics/sprites.ts`가 목록을 읽어 캔버스(`map-canvas.tsx`)에 그립니다. 그림이 없는 지형 · 클래스는 절차적으로 그립니다.

## 실행

```bash
uv venv -p 3.13 tools/tactics-art/.venv
VIRTUAL_ENV=tools/tactics-art/.venv uv pip install bpy numpy pillow
tools/tactics-art/.venv/bin/python -I tools/tactics-art/render.py            # 전부(약 5분, CPU 사이클 48샘플)
tools/tactics-art/.venv/bin/python -I tools/tactics-art/render.py --fast     # 미리보기(8샘플)
tools/tactics-art/.venv/bin/python -I tools/tactics-art/render.py --pick '.,F,cls_tide_heir' --only units
```

## 규약

- 세계 단위 1 = 칸 한 변. 카메라는 수평에서 30° 위 · 방위 45°, 직교 투영. 마름모 가로 192px(프레임 240×384).
- 지형 윗면 높이는 `map-canvas.tsx`의 `HEIGHT` 표와 같아야 합니다(벽 0.8 · 요새 0.45 · 왕좌 0.12 · 물 −0.18 …). 캔버스의 높이 1단 = `0.612·tw`(= cos30° · tw/√2).
- 유닛은 카메라 쪽을 보게 −45° 돌려 놓고, 그림자 받이 바닥으로 접지 그림자를 넣습니다. 편 색은 `SIDES`(아군 · 적 · 중립). 주인공 클래스(cls_tide_heir · cls_tide_lord)는 아군만 렌더합니다.
- 윤곽선은 뒤집은 껍질(solidify + 카메라 광선에만 불투명한 셰이더). Freestyle은 헤드리스 bpy에서 비어 나와 쓰지 않습니다.
- 새 클래스를 추가하면 `UNITS`에 모양(body · weapon · hat · armor · cape · robe · shield · glow)을 넣고 다시 렌더합니다.
