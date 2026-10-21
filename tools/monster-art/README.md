# 도감 몬스터 그림(블렌더)

`render.py`가 블렌더 파이썬 모듈(`bpy`)로 몬스터를 로우폴리 도형으로 만들어 같은 카메라(앞 왼쪽 3/4 · 위에서 22° · 직교)로 렌더해 `public/art/monsters/{id}.webp`(384×384, 투명 배경, 바닥 그림자)로 저장합니다. 메이플 구역 · 보스 77종이 대상이며, 코프룰루 구역(`ao·vw·hm·sc*`)은 `tools/art-svg/`의 SVG를 그대로 씁니다.

## 실행

```bash
uv venv -p 3.13 tools/monster-art/.venv && VIRTUAL_ENV=tools/monster-art/.venv uv pip install bpy numpy pillow
tools/monster-art/.venv/bin/python -I tools/monster-art/render.py                 # 전부(48샘플, 약 20~30분)
tools/monster-art/.venv/bin/python -I tools/monster-art/render.py --fast           # 미리보기(8샘플)
tools/monster-art/.venv/bin/python -I tools/monster-art/render.py --pick minnow,shark --out /tmp/x   # 몇 종만 다른 폴더에
node scripts/art-manifest.mjs                                                       # 그림 목록 갱신(필수)
```

## 규약

- 모양은 `game/data/art.ts`의 `MONSTER_SHAPES`(실루엣)와 같은 이름의 `shape_*` 함수입니다. 옆모습 몸(돼지 · 멧돼지 · 용 · 악어 · 달팽이)은 머리가 +x(화면 오른쪽), 정면 몸(버섯 · 슬라임 · 사람형 · 눈 · 박쥐)은 얼굴이 −y(카메라 쪽)입니다.
- 몬스터별 색은 `M` 표(이름에서 고른 색: 파란 달팽이 → 파랑 껍질, 파이어보어 → 불꽃)에 있습니다. 새 몬스터는 모양과 팔레트를 적고 다시 렌더합니다.
- 윤곽선은 뒤집은 껍질(solidify + 카메라 광선에만 불투명한 셰이더), 조명은 태양 + 뒤쪽 청록 림 라이트, `center_and_scale`이 몸집에 상관없이 프레임을 채웁니다.
- 같은 id의 `.png`/`.webp`를 손으로 그려 넣으면 그쪽이 우선합니다(`png > webp > svg`).
