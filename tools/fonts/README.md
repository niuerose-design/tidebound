# 글꼴 서브셋 (v3.387)

`public/fonts/*.woff2`와 `app/styles/fonts.css`는 `subset.py`가 만듭니다. 원본은 네이버가 OFL 1.1로 배포하는 TTF이고, npm `@kfonts/maruburi` · `@kfonts/nanum-square`(같은 파일을 담은 패키지)에서 받습니다.

```bash
uv venv -p 3.13 tools/fonts/.venv && VIRTUAL_ENV=tools/fonts/.venv uv pip install fonttools brotli
mkdir -p tools/fonts/work && cd tools/fonts/work
npm pack @kfonts/maruburi @kfonts/nanum-square && for f in *.tgz; do d=${f%-*}; mkdir -p $d && tar xzf $f -C $d; done   # → work/maruburi/package/src/*.ttf
# (패키지 이름에 붙은 버전 숫자를 지워 maruburi · nanum-square 폴더로 맞춥니다)
cd ../../.. && node tools/fonts/syllables.mjs > tools/fonts/work/syllables.txt    # 게임 글에 쓰는 한글 음절 목록
tools/fonts/.venv/bin/python -I tools/fonts/subset.py
```

- `-ko` 파일의 `unicode-range`는 쓰는 음절만 적으므로, 새 한글 글자가 글에 들어가면 다시 돌려야 그 글자가 서브셋에 들어갑니다(그전까지는 `-ext` 파일이 대신 내려와 보이기는 합니다).
- 기호(★ ✦ → ◆ 등)는 글꼴에 없으면 시스템 기호 글꼴로 떨어집니다(`--font-ui` 뒤쪽 폴백).
