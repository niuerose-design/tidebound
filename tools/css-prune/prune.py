"""죽은 CSS 규칙 제거: 선택자의 모든 클래스가 소스(components · app · lib · game 의 ts · tsx)에 없으면 지웁니다. 동적 클래스는 접두사(`x-${…}` · `'x-' +`)로 살립니다. 빈 @media 는 지웁니다. 지운 선택자는 removed.txt 에."""
import re, os, sys
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); SD=os.path.dirname(os.path.abspath(__file__))
SKIP=['node_modules','.next','.git','public','tools','tests','docs','scripts']
src=[]
for root,dirs,files in os.walk(ROOT):
    dirs[:]=[d for d in dirs if d not in SKIP and not d.startswith('.')]
    for f in files:
        if f.endswith(('.tsx','.ts','.mjs','.js')) and not f.endswith('.d.ts'): src.append(open(os.path.join(root,f),encoding='utf-8').read())
text='\n'.join(src)
tokens=set(re.findall(r"[A-Za-z_][A-Za-z0-9_-]*", text))
prefixes=set(re.findall(r"([A-Za-z][A-Za-z0-9_-]*-)\$\{", text)) | set(re.findall(r"['\"]([A-Za-z][A-Za-z0-9_-]*-)['\"]\s*\+", text))
KEEP_ALWAYS={'ready','missing','open','active','selected','locked','folded','compact','danger','running'}
def used(cls): return cls in tokens or cls in KEEP_ALWAYS or any(cls.startswith(p) for p in prefixes)
removed=[]
def prune(block):
    out=[]; depth=0; start=0; j=0; sel=''; body_start=0
    while j<len(block):
        c=block[j]
        if c=='{':
            if depth==0: sel=block[start:j]; body_start=j+1
            depth+=1
        elif c=='}':
            depth-=1
            if depth==0:
                body=block[body_start:j]; s=sel.strip()
                if s.startswith(('@media','@supports','@container','@layer')):
                    inner=prune(body)
                    if inner.strip(): out.append(f'{sel}{{{inner}}}')
                elif s.startswith('@'):
                    out.append(f'{sel}{{{body}}}')
                else:
                    classes=set(re.findall(r'\.([A-Za-z_][A-Za-z0-9_-]*)', s))
                    if classes and not any(used(c) for c in classes): removed.append(s)
                    else: out.append(f'{sel}{{{body}}}')
                start=j+1
        j+=1
    tail=block[start:]
    if tail.strip(): out.append(tail)
    return ''.join(out)
total_before=total_after=0
for fn in sorted(os.listdir(ROOT+'/app/styles')):
    if not fn.endswith('.css') or fn in ('fonts.css','tokens.css','theme.css'): continue
    p=f'{ROOT}/app/styles/{fn}'; css=open(p,encoding='utf-8').read(); total_before+=len(css)
    # 주석은 그대로 두되 규칙 판단에는 영향 없음(주석 안 중괄호가 없다고 가정 — 검사)
    assert not re.search(r'/\*[^*]*\{', css), fn
    new=prune(css)
    new=re.sub(r'\n{3,}', '\n\n', new); total_after+=len(new)
    open(p,'w',encoding='utf-8').write(new)
    print(fn, len(css), '->', len(new))
open(SD+'/removed.txt','w',encoding='utf-8').write('\n'.join(removed))
print('removed rules', len(removed), 'bytes', total_before, '->', total_after)
