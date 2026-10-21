# 장비 그림(블렌더)

`render.py`가 블렌더 파이썬 모듈(`bpy`)로 장비를 로우폴리로 세워 `public/art/items/{slot}-{등급}.webp`(무기는 `rod-{physical|magic|balanced}-{등급}`, 256×256, 투명 배경)로 저장합니다. 등급 0~6(일반 → 태초)은 `TIER`의 재질 묶음(초보자 나무 → 메이플 강철 → 자쿰 검은 쇠 · 금 → 파프니르 푸른 강철 → 앱솔랩스 흰 · 금 → 아케인셰이드 어두운 청록 · 빛 → 제네시스 백금)과 `RARITY`의 보석 색(`game/data/balance.ts RARITIES`)을 씁니다.

```bash
uv venv -p 3.13 tools/item-art/.venv && VIRTUAL_ENV=tools/item-art/.venv uv pip install bpy numpy pillow
tools/item-art/.venv/bin/python -I tools/item-art/render.py            # 42장(48샘플, 몇 분)
tools/item-art/.venv/bin/python -I tools/item-art/render.py --fast --pick coat-3,rod-magic-6 --out /tmp/x
node scripts/art-manifest.mjs                                           # 그림 목록 갱신(필수)
```

화면은 `components/game/gear-art.tsx`의 `GearArt`(부위 · 등급 · 무기 계열)로 보여 주고, 그림이 없으면 부위 아이콘(`SlotIcon`)이 남습니다. 칠흑 장신구는 `OnyxArt` 그대로입니다.
