"""
v3.387 글꼴 서브셋. 원본 TTF(네이버 마루 부리 · 나눔스퀘어, OFL 1.1)를 웹용 woff2 둘(-ko: 라틴 · 기호 · 게임 글에 쓰는 한글 음절 / -ext: 나머지 한글)로 나누고 app/styles/fonts.css 를 다시 씁니다.
실행은 tools/fonts/README.md.
"""
import sys, os, subprocess, json
import pathlib
SD = str(pathlib.Path(__file__).resolve().parent / 'work')   # 원본 TTF 와 syllables.txt 를 두는 작업 폴더(git 제외)
OUT = 'public/fonts'
syl = sorted(set(open(SD + '/syllables.txt', encoding='utf-8').read()))
used = sorted(ord(c) for c in syl)
# 공통 범위: 라틴 · 문장 부호 · 화살표 · 수학 · 원문자 · 도형 · 기호 · CJK 부호 · 호환 자모 · 전각
COMMON = ['U+0000-00FF', 'U+0131', 'U+0152-0153', 'U+02BB-02BC', 'U+02C6', 'U+02DA', 'U+02DC', 'U+0391-03C9', 'U+2000-206F', 'U+2070-209F', 'U+20A0-20CF', 'U+2100-214F', 'U+2190-21FF', 'U+2200-22FF', 'U+2300-23FF', 'U+2460-24FF', 'U+2500-257F', 'U+25A0-25FF', 'U+2600-26FF', 'U+2700-27BF', 'U+2B00-2BFF', 'U+3000-303F', 'U+3131-318E', 'U+FF01-FF60', 'U+FFFD']
def ranges(cps):
    out = []; s = p = None
    for c in cps:
        if s is None: s = p = c
        elif c == p + 1: p = c
        else: out.append((s, p)); s = p = c
    if s is not None: out.append((s, p))
    return out
used_r = ranges(used)
fmt = lambda r: ('U+%04X' % r[0]) if r[0] == r[1] else ('U+%04X-%04X' % r)
KO = COMMON + [fmt(r) for r in used_r]
# 확장: 나머지 한글 음절 + 옛한글 자모
allsyl = set(range(0xAC00, 0xD7A4)) - set(used)
EXT = ['U+1100-11FF', 'U+A960-A97F', 'U+D7B0-D7FF'] + [fmt(r) for r in ranges(sorted(allsyl))]
FONTS = [('maruburi', 'MaruBuri-Regular', 'MaruBuri', 400), ('maruburi', 'MaruBuri-Bold', 'MaruBuri', 700),
         ('nanum-square', 'NanumSquareR', 'NanumSquare', 400), ('nanum-square', 'NanumSquareB', 'NanumSquare', 700), ('nanum-square', 'NanumSquareEB', 'NanumSquare', 800)]
css = []
for pkg, file, fam, w in FONTS:
    src = f'{SD}/{pkg}/package/src/{file}.ttf'
    for tag, uni in (('ko', KO), ('ext', EXT)):
        dst = f'{OUT}/{file}-{tag}.woff2'
        subprocess.run([sys.executable, '-m', 'fontTools.subset', src, '--unicodes=' + ','.join(uni), '--flavor=woff2', '--no-hinting', '--desubroutinize', '--layout-features=*', '--name-IDs=*', f'--output-file={dst}'], check=True)
        print(dst, os.path.getsize(dst))
# ext 먼저, ko 나중(겹치는 글자는 나중에 선언한 쪽이 이깁니다)
for pkg, file, fam, w in FONTS:
    css.append(f"@font-face {{ font-family: '{fam}'; font-style: normal; font-weight: {w}; font-display: swap; src: url('/fonts/{file}-ext.woff2') format('woff2'); unicode-range: U+1100-11FF, U+A960-A97F, U+AC00-D7A3, U+D7B0-D7FF; }}")
    css.append(f"@font-face {{ font-family: '{fam}'; font-style: normal; font-weight: {w}; font-display: swap; src: url('/fonts/{file}-ko.woff2') format('woff2'); unicode-range: {', '.join(KO)}; }}")
open('app/styles/fonts.css', 'w', encoding='utf-8').write("""/*
 * v3.387 자체 호스팅 글꼴(네이버 나눔글꼴 · 마루 부리, SIL OFL 1.1 — public/fonts/README.md).
 * 본 파일(-ko)은 라틴 · 기호 · 게임 글에 쓰는 한글 음절만 담고, 그 밖의 한글(이름 · 채팅)은 확장 파일(-ext)을 그 글자가 보일 때만 받습니다(unicode-range).
 * 겹치는 글자는 나중에 선언한 -ko 쪽을 씁니다. 이 파일은 scripts/fonts-subset 절차(tools/fonts/README.md)가 만듭니다. 손으로 고치지 마세요.
 */
""" + '\n'.join(css) + '\n')
print('ranges ko', len(KO), 'ext', len(EXT))
