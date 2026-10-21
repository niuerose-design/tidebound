"""
v3.393 보스 전용 모양(칠흑 보스 13종 · 던전 보스 8종). render.py 가 불러와 SHAPES · M 에 덮어씁니다.
일반 몬스터와 달리 (1) 카메라를 낮춰 올려다보는 구도, (2) 돌 제단 + 빛나는 균열 · 룬 고리 무대, (3) 보스 색의 바닥 조명,
(4) 영웅 비례(어깨 넓고 머리 작음)의 큰 몸 · 큰 무기 · 날개 · 뿔 · 오라로 위압감을 줍니다.
"""
import math

R = None   # render 모듈(설치 때 채움)
def install(render):
    """render.py 의 도형 · 재질 · 장면 도우미를 이 모듈 전역으로 가져오고, 보스 모양과 팔레트를 등록합니다."""
    global R; R = render
    for k in ('bpy', 'Vector', 'C', 'mat', 'tint', 'obj', 'box', 'cyl', 'cone', 'sphere', 'torus', 'eyes', 'mouth', 'wing', 'spikes', 'humanoid'): globals()[k] = getattr(render, k)
    render.SHAPES.update({k[6:]: v for k, v in globals().items() if k.startswith('shape_')})
    render.M.update(boss_palette())

# ───────── 무대 · 조명 · 구도 ─────────
def loom(elev=11, az=-28):
    """카메라를 낮춰 올려다보는 구도(보스는 기본 22° 대신 11°)."""
    cam = bpy.context.scene.camera; dist = 20.0; e, a = math.radians(elev), math.radians(az)
    cam.location = (dist * math.cos(e) * math.sin(a), -dist * math.cos(e) * math.cos(a), dist * math.sin(e))
def glow_light(color, z=0.45, energy=70, loc=(0, -0.5)):
    """보스 색의 바닥 조명: 아래에서 올려 비춰 얼굴 · 갑옷에 색을 입힙니다."""
    d = bpy.data.lights.new('glow', 'POINT'); d.energy = energy; d.color = color; d.shadow_soft_size = 0.6
    o = bpy.data.objects.new('glow', d); bpy.context.scene.collection.objects.link(o); o.location = (loc[0], loc[1], z)
def mood(color):
    """보스 분위기 조명: 배경광을 줄이고(어둡게), 뒤쪽 림 라이트를 보스 색으로 세게, 태양은 조금 차갑게 · 약하게."""
    sc = bpy.context.scene; sc.view_settings.exposure = -0.55
    sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0.14
    for o in sc.objects:
        if o.type != 'LIGHT': continue
        if o.name == 'sun': o.data.energy = 2.6; o.data.color = (0.9, 0.92, 1.0)
        elif o.name == 'rim': o.data.energy = 520; o.data.color = tint(color, 1.15); o.location = (-2.0, 3.2, 2.6)
    key = bpy.data.lights.new('key', 'AREA'); key.energy = 140; key.color = (1.0, 0.96, 0.9); key.size = 3
    ko = bpy.data.objects.new('key', key); sc.collection.objects.link(ko); ko.location = (2.5, -3.0, 2.0)
    tgt = sc.objects.get('target'); c = ko.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
def stage(color, r=0.8, runes=True, cracks=6, embers=8, z=0.0):
    """돌 제단(어두운 원반) + 빛나는 균열 + 룬 고리 + 떠다니는 불씨 + 분위기 조명."""
    mood(color)
    stone = mat('stage', (0.16, 0.15, 0.17), rough=0.95); edge = mat('stageEdge', (0.11, 0.10, 0.12), rough=0.95)
    cyl(stone, (0, 0, z + 0.035), r, 0.07, verts=28); cyl(edge, (0, 0, z + 0.015), r * 1.06, 0.03, verts=28)
    g = mat('crack', color, emit=3.0, rough=0.4)
    for i in range(cracks):
        a = i * 2 * math.pi / cracks + 0.3; L = r * (0.55 + 0.25 * ((i * 7) % 3) / 2)
        box(g, (L / 2 * math.cos(a), L / 2 * math.sin(a), z + 0.072), (L, 0.018, 0.006), rot=(0, 0, a))
        box(g, (L * 0.8 * math.cos(a) + 0.08 * math.sin(a), L * 0.8 * math.sin(a) - 0.08 * math.cos(a), z + 0.072), (0.14, 0.012, 0.006), rot=(0, 0, a + 0.6))
    if runes: torus(mat('rune', color, emit=2.2, rough=0.4), (0, 0, z + 0.074), r * 0.78, 0.012)
    em = mat('ember', color, emit=4.0, rough=0.3)
    for i in range(embers):
        a = i * 2.4 + 0.7; rr = r * (0.45 + 0.5 * ((i * 5) % 4) / 3)
        sphere(em, (rr * math.cos(a), rr * math.sin(a), z + 0.3 + 0.9 * ((i * 3) % 5) / 4), 0.014 + 0.012 * (i % 3), outline=False)
    glow_light(color)
def aura_ring(color, z, R_, r_=0.02, rot=(0, 0, 0), alpha=1.0, emit=2.5): torus(mat('aura', color, emit=emit, rough=0.3, alpha=alpha), (0, 0, z), R_, r_, rot=rot)
def membrane(m, root, length, chord, lift, sgn, y=0.0, drop=0.0):
    """납작한 타원 날개 막 하나: root 에서 바깥(sgn·x)으로 length, 위로 lift° 기울어집니다."""
    L = math.radians(lift)
    o = obj(bpy.ops.mesh.primitive_uv_sphere_add, m, loc=(root[0] + sgn * length / 2 * math.cos(L), root[1] + y, root[2] + length / 2 * math.sin(L) - drop), rot=(0, -sgn * L, 0), scale=(length / 2, 0.03, chord / 2), segments=24, ring_count=12, radius=1)
    return o
def feather_wings(m, root, length, lift=26, layers=3, chord=None, back=0.16, spine=None):
    """깃털 날개: 큰 막 + 아래로 갈수록 짧아지는 막을 겹쳐 깃털 끝을 냅니다. spine 재질이 있으면 위쪽 뼈대를 그립니다."""
    chord = chord or length * 0.42
    for sgn in (-1, 1):
        for i in range(layers): membrane(m, (root[0] * sgn, root[1], root[2]), length * (1 - 0.18 * i), chord * (1 - 0.1 * i), lift - 14 * i, sgn, y=back + 0.03 * i, drop=0.1 * i)
        if spine: cyl(spine, (root[0] * sgn + sgn * length * 0.45 * math.cos(math.radians(lift)), root[1] + back - 0.01, root[2] + length * 0.45 * math.sin(math.radians(lift)) + chord * 0.4), 0.025, length * 0.9, rot=(0, -sgn * (math.pi / 2 - math.radians(lift)), 0), verts=6)
def bat_wings(m, root, length, lift=30, back=0.16, fingers=4):
    """박쥐 날개: 막 하나 + 손가락 뼈대 넷 + 끝 갈고리."""
    for sgn in (-1, 1):
        membrane(m, (root[0] * sgn, root[1], root[2]), length, length * 0.6, lift, sgn, y=back, drop=0.05)
        for i in range(fingers):
            a = math.radians(lift + 25 - i * 22)
            cyl(m, (root[0] * sgn + sgn * length * 0.45 * math.cos(a), root[1] + back - 0.02, root[2] + length * 0.45 * math.sin(a)), 0.022, length * 0.9, rot=(0, -sgn * (math.pi / 2 - a), 0), verts=6)
            cone(m, (root[0] * sgn + sgn * length * 0.92 * math.cos(a), root[1] + back - 0.02, root[2] + length * 0.92 * math.sin(a)), 0.03, 0.12, rot=(0, -sgn * (math.pi / 2 - a), 0), verts=5)
def flames(color, center, n=7, r=0.1, h=0.3, z=0.0, big=1.0):
    """불꽃: 중심 둘레의 발광 원뿔 묶음."""
    f = mat('flame', color, emit=3.5, rough=0.3)
    for i in range(n):
        a = i * 2 * math.pi / n; k = 0.6 + 0.4 * ((i * 3) % 3) / 2
        cone(f, (center[0] + r * math.cos(a) * big, center[1] + r * math.sin(a) * big, center[2] + z + h * k / 2), 0.045 * big, h * k * big, verts=6)

# ───────── 영웅 비례 사람형(큰 보스 공통 몸) ─────────
def titan(p, armor=None, robe=None, skin=None, hat=None, weapon=None, cape=None, wings=None, horns=None, glow=None, float_=False, big=1.0, pauldron=True, hair=None, arms=2, mask=False, base=None):
    """키 2.2 · 어깨 1.0 의 큰 몸. hat: helm · hood · crown · horns · halo · bonecrown. weapon: greatsword · scythe · staff · orb · claws · cannon · twinblades · fists.
    wings: ('feather'|'bat'|'light'|'mech', 색). 얼굴은 −y(카메라) 쪽."""
    b = big; z0 = base if base is not None else (0.3 if float_ else 0.0)
    sk = mat('sk', skin or C['skin']); ar = mat('ar', armor or (0.4, 0.42, 0.48), metal=0.75, rough=0.32); cloth = mat('cl', robe or p['body'])
    trim = mat('tr', p.get('trim', C['gold']), metal=0.6, rough=0.35); dark = mat('dk', C['dark'])
    body = ar if armor else cloth
    if robe is not None and not armor:   # 긴 로브: 바닥까지 닿는 원뿔 + 허리 띠
        cone(cloth, (0, 0, z0 + 0.62 * b), 0.42 * b, 1.24 * b, verts=14, r2=0.22 * b)
    else:                                 # 다리 · 갑옷 정강이 · 장화
        for sgn in (-1, 1):
            cyl(dark, (sgn * 0.17 * b, 0, z0 + 0.45 * b), 0.085 * b, 0.9 * b, verts=10)
            box(ar if armor else cloth, (sgn * 0.17 * b, -0.02, z0 + 0.5 * b), (0.2 * b, 0.2 * b, 0.42 * b))
            box(dark, (sgn * 0.17 * b, -0.04 * b, z0 + 0.07 * b), (0.2 * b, 0.3 * b, 0.14 * b))
        cone(body, (0, 0, z0 + 1.2 * b), 0.3 * b, 0.62 * b, verts=14, r2=0.44 * b)            # 몸통(아래 좁고 위 넓음)
    box(trim, (0, 0, z0 + 0.95 * b), (0.5 * b, 0.46 * b, 0.07 * b))                              # 허리 띠
    if armor: box(ar, (0, -0.2 * b, z0 + 1.32 * b), (0.56 * b, 0.1 * b, 0.34 * b)); box(trim, (0, -0.26 * b, z0 + 1.34 * b), (0.1 * b, 0.02, 0.3 * b))   # 가슴판 · 문장
    # 어깨 · 팔
    for sgn in (-1, 1):
        if pauldron: sphere(ar if armor else cloth, (sgn * 0.5 * b, 0, z0 + 1.52 * b), 0.2 * b, scale=(1.0, 0.9, 0.75)); cone(trim if armor else dark, (sgn * 0.62 * b, 0, z0 + 1.66 * b), 0.05 * b, 0.22 * b, rot=(0, math.radians(sgn * 35), 0), verts=6)
        for k in range(arms // 2):
            dz = -0.33 * b * k; ang = -16 - 22 * k
            cyl(ar if armor else cloth, (sgn * 0.52 * b, -0.06 * b, z0 + 1.22 * b + dz), 0.085 * b, 0.58 * b, rot=(math.radians(-14), math.radians(sgn * ang), 0), verts=10)
            sphere(ar if armor else sk, (sgn * 0.6 * b, -0.17 * b, z0 + 0.92 * b + dz), 0.11 * b)
    # 머리
    hz = z0 + 1.88 * b
    sphere(sk if not mask else ar, (0, 0, hz), 0.2 * b)
    if hair: sphere(mat('h', hair), (0, 0.04 * b, hz + 0.05 * b), 0.21 * b, scale=(1, 1, 0.9)); box(mat('h', hair), (0, 0.16 * b, hz - 0.3 * b), (0.3 * b, 0.1 * b, 0.6 * b))
    if not mask: eyes(0, -0.15 * b, hz + 0.02 * b, 0.032 * b, 0.075 * b, white=mat('e', p.get('eye', C['eyeWhite']), emit=p.get('eyeGlow', 1.0)))
    else: box(mat('e', p.get('eye', C['ice']), emit=p.get('eyeGlow', 2.0)), (0, -0.19 * b, hz + 0.02 * b), (0.2 * b, 0.02, 0.025 * b))
    if hat == 'helm':
        sphere(ar, (0, 0.01, hz + 0.04 * b), 0.23 * b, scale=(1, 1, 0.9)); box(ar, (0, -0.16 * b, hz - 0.04 * b), (0.36 * b, 0.12 * b, 0.1 * b))
        for sgn in (-1, 1): cone(mat('hn', horns or C['steel'], metal=0.5, rough=0.4), (sgn * 0.18 * b, 0.02, hz + 0.2 * b), 0.05 * b, 0.42 * b, rot=(math.radians(-10), math.radians(sgn * 38), 0), verts=6)
    elif hat == 'hood': sphere(cloth, (0, 0.04 * b, hz + 0.05 * b), 0.26 * b, scale=(1, 1, 1.0)); cone(cloth, (0, 0.1 * b, hz + 0.32 * b), 0.17 * b, 0.34 * b, verts=8)
    elif hat == 'crown':
        g = mat('gold', metal=0.8, rough=0.3); cyl(g, (0, 0, hz + 0.19 * b), 0.17 * b, 0.1 * b, verts=8)
        for i in range(8): a_ = i * 2 * math.pi / 8; cone(g, (0.17 * b * math.cos(a_), 0.17 * b * math.sin(a_), hz + 0.32 * b), 0.035 * b, 0.18 * b * (1.4 if i % 2 == 0 else 1), verts=4)
    elif hat == 'bonecrown':
        for i in range(7): a_ = math.pi * (0.15 + 0.7 * i / 6); cone(mat('bone'), (0.19 * b * math.cos(a_), 0.1 * b, hz + 0.12 * b + 0.1 * b * math.sin(a_)), 0.03 * b, 0.3 * b, rot=(math.radians(-15), 0, 0), verts=5)
    elif hat == 'horns':
        for sgn in (-1, 1): cone(mat('hn', horns or C['black']), (sgn * 0.12 * b, 0.02, hz + 0.18 * b), 0.055 * b, 0.5 * b, rot=(math.radians(-15), math.radians(sgn * 34), 0), verts=6)
    elif hat == 'halo': aura_ring(glow or C['gold'], hz + 0.38 * b, 0.22 * b, 0.022, emit=2.5)
    # 망토 · 날개
    if cape:
        cp = mat('cp', cape); box(cp, (0, 0.3 * b, z0 + 1.0 * b), (0.78 * b, 0.07, 1.6 * b), rot=(math.radians(-9), 0, 0)); box(cp, (0, 0.38 * b, z0 + 0.6 * b), (0.6 * b, 0.06, 0.9 * b), rot=(math.radians(-18), 0, 0))
    if wings:
        kind, col = wings
        if kind == 'feather': feather_wings(mat('wg', col), (0.3 * b, 0.1, z0 + 1.62 * b), 1.6 * b, lift=32, spine=mat('wgs', tint(col, 1.3)))
        elif kind == 'bat': bat_wings(mat('wg', col), (0.3 * b, 0.1, z0 + 1.6 * b), 1.4 * b)
        elif kind == 'light': feather_wings(mat('wgl', col, emit=1.6, rough=0.3, alpha=0.75), (0.3 * b, 0.1, z0 + 1.62 * b), 1.4 * b)
        elif kind == 'mech':
            wm = mat('wgm', col, metal=0.7, rough=0.35); we = mat('wge', glow or C['orange'], emit=3.0, rough=0.3)
            for sgn in (-1, 1):
                for i in range(3):
                    a = math.radians(55 - 20 * i); L = (0.95 - 0.12 * i) * b
                    cx, cz = sgn * (0.35 * b + L / 2 * math.cos(a)), z0 + 1.55 * b + L / 2 * math.sin(a)
                    box(wm, (cx, 0.22 + 0.05 * i, cz), (L, 0.05, 0.26 * b), rot=(0, -sgn * a, 0)); box(we, (cx, 0.19 + 0.05 * i, cz + 0.1 * b), (L * 0.9, 0.01, 0.03 * b), rot=(0, -sgn * a, 0))
    # 무기(오른손 = 화면 왼쪽 −x)
    hx, hy, hzz = -0.6 * b, -0.17 * b, z0 + 0.92 * b
    steel = mat('steel', metal=0.75, rough=0.3)
    if weapon == 'greatsword': box(steel, (hx, hy, hzz + 0.75 * b), (0.17 * b, 0.03, 1.5 * b)); box(mat('fuller', (0.2, 0.2, 0.24), metal=0.6, rough=0.4), (hx, hy - 0.02, hzz + 0.8 * b), (0.04 * b, 0.01, 1.2 * b)); box(trim, (hx, hy, hzz + 0.02), (0.4 * b, 0.06, 0.06)); cone(steel, (hx, hy, hzz + 1.58 * b), 0.085 * b, 0.18 * b, verts=4)
    elif weapon == 'scythe':
        cyl(mat('wood'), (hx, hy, hzz + 0.45 * b), 0.025, 2.2 * b, verts=6)
        box(steel, (hx - 0.3 * b, hy, hzz + 1.45 * b), (0.7 * b, 0.02, 0.09 * b), rot=(0, -0.35, 0)); cone(steel, (hx - 0.66 * b, hy, hzz + 1.3 * b), 0.05 * b, 0.2 * b, rot=(0, math.radians(-120), 0), verts=4)
    elif weapon == 'staff':
        cyl(mat('wood'), (hx, hy, hzz + 0.5 * b), 0.025, 2.2 * b, verts=6)
        for sgn in (-1, 1): cone(trim, (hx + sgn * 0.07 * b, hy, hzz + 1.55 * b), 0.03, 0.22 * b, rot=(0, math.radians(sgn * -25), 0), verts=5)
        sphere(mat('g', glow or C['purple'], emit=3.0, rough=0.3), (hx, hy, hzz + 1.62 * b), 0.11 * b, outline=False)
    elif weapon == 'orb': sphere(mat('g', glow or C['purple'], emit=3.0, rough=0.3), (hx, hy - 0.1 * b, hzz + 0.2 * b), 0.14 * b, outline=False)
    elif weapon == 'claws':
        for sgn in (-1, 1):
            for i in range(3): cone(steel, (sgn * 0.6 * b + (i - 1) * 0.06 * b, -0.2 * b, hzz - 0.14 * b), 0.025 * b, 0.26 * b, rot=(math.radians(180), 0, 0), verts=5)
    elif weapon == 'cannon':
        for sgn in (-1, 1): cyl(steel, (sgn * 0.6 * b, -0.35 * b, hzz + 0.08 * b), 0.1 * b, 0.6 * b, rot=(math.radians(90), 0, 0), verts=12); sphere(mat('g', glow or C['orange'], emit=3.0, rough=0.3), (sgn * 0.6 * b, -0.66 * b, hzz + 0.08 * b), 0.07 * b, outline=False)
    elif weapon == 'twinblades':
        for sgn in (-1, 1): box(steel, (sgn * 0.6 * b, -0.17 * b, hzz + 0.45 * b), (0.08 * b, 0.02, 1.0 * b), rot=(0, math.radians(sgn * -12), 0))
    elif weapon == 'fists':
        for sgn in (-1, 1): sphere(ar, (sgn * 0.62 * b, -0.2 * b, hzz - 0.02), 0.15 * b)
    if glow and weapon == 'greatsword':
        f = mat('wfl', glow, emit=4.0, rough=0.3)
        box(f, (hx, hy - 0.025, hzz + 0.8 * b), (0.035 * b, 0.005, 1.2 * b)); box(f, (hx, hy + 0.025, hzz + 0.8 * b), (0.035 * b, 0.005, 1.2 * b))
        flames(glow, (hx, hy, hzz + 1.5 * b), n=5, r=0.06, h=0.3, big=b)
    elif glow and weapon == 'twinblades':
        f = mat('wfl', glow, emit=4.0, rough=0.3)
        for sgn in (-1, 1): box(f, (sgn * 0.6 * b, -0.17 * b - 0.02, hzz + 0.45 * b), (0.025 * b, 0.005, 0.9 * b), rot=(0, math.radians(sgn * -12), 0))
    return hz

# ───────── 칠흑 보스 ─────────
def shape_dusk(p):
    """더스크: 형체 없는 안개 덩어리에 눈이 많다. 떠 있는 검은 덩어리 + 촉수 + 보라 눈 9개."""
    loom(8); stage(C['purple'], r=0.85, cracks=5)
    fog = mat('fog', (0.11, 0.08, 0.16), rough=0.9); mist = mat('mist', (0.4, 0.25, 0.6), rough=0.8, alpha=0.35)
    for (x, y, z, r) in ((0, 0, 1.1, 0.62), (-0.45, 0.1, 0.8, 0.4), (0.5, -0.05, 0.85, 0.42), (0.15, 0.3, 1.55, 0.38), (-0.3, -0.2, 1.5, 0.33), (0.05, -0.35, 0.65, 0.3)): sphere(fog, (x, y, z), r, scale=(1, 0.9, 0.85))
    for (x, y, z, r) in ((-0.65, -0.2, 1.2, 0.3), (0.7, 0.2, 1.3, 0.28), (0.0, -0.1, 0.35, 0.45)): sphere(mist, (x, y, z), r, outline=False)
    for i in range(8):   # 촉수
        a = i * 2 * math.pi / 8 + 0.4
        cone(fog, (0.45 * math.cos(a), 0.45 * math.sin(a), 0.5), 0.07, 0.8, rot=(math.radians(-110) * math.sin(a), math.radians(110) * math.cos(a), 0), verts=6)
    ey = mat('e', C['purple'], emit=3.0, rough=0.3); pu = mat('pupil')
    for (x, y, z, r) in ((0, -0.56, 1.15, 0.12), (-0.3, -0.5, 0.9, 0.07), (0.33, -0.48, 1.0, 0.08), (-0.2, -0.44, 1.42, 0.06), (0.22, -0.42, 1.5, 0.05), (0.52, -0.38, 0.75, 0.05), (-0.5, -0.36, 1.2, 0.05), (0.1, -0.52, 0.7, 0.06), (0.4, -0.3, 1.35, 0.04)):
        sphere(ey, (x, y, z), r, outline=False); sphere(pu, (x, y - r * 0.7, z), r * 0.45, outline=False)
    aura_ring(C['purple'], 0.5, 0.95, 0.02, alpha=0.8)
def shape_dunkel(p):
    """듄켈: 검은 검의 지휘관. 중갑 · 뿔 투구 · 양손 대검 · 들불."""
    loom(); stage((0.5, 0.6, 1.0), r=0.8); titan(p, armor=p['body'], hat='helm', weapon='greatsword', cape=p.get('trim'), horns=(0.25, 0.26, 0.3), glow=C['ice'], mask=True)
    flames(C['fire'], (0, 0, 0.05), n=9, r=0.55, h=0.26)
def shape_will(p):
    """윌: 거미 다리 위의 거울 마법사. 사람형 상체 + 다리 여섯 + 떠 있는 거울 조각."""
    loom(); stage(C['purple'], r=0.9, cracks=4)
    leg = mat('leg', (0.12, 0.1, 0.16))
    for i in range(6):   # 거미 다리: 무릎이 위로 꺾임
        a = math.pi * (0.1 + 0.8 * i / 5) * (1 if i % 2 else -1) + (0 if i % 2 else math.pi); a = i * math.pi / 3 + math.pi / 6
        kx, ky = 0.75 * math.cos(a), 0.75 * math.sin(a)
        cyl(leg, (kx / 2, ky / 2, 0.75), 0.04, 1.0, rot=(math.radians(-50) * math.sin(a) * -1, math.radians(50) * math.cos(a), 0), verts=6)
        cyl(leg, (kx * 0.85, ky * 0.85, 0.5), 0.035, 1.0, rot=(math.radians(20) * math.sin(a), math.radians(-20) * math.cos(a), 0), verts=6)
    sphere(leg, (0, 0.05, 0.95), 0.4, scale=(1.1, 1.2, 0.6))   # 배
    hz = titan(p, robe=p['body'], hat='horns', weapon='orb', glow=C['purple'], base=0.95, big=0.85, pauldron=False, horns=C['black'])
    glass = mat('glass', (0.75, 0.7, 0.95), rough=0.1, metal=0.3, alpha=0.6)
    for (x, y, z, ry) in ((-1.0, 0.3, 1.5, 25), (1.05, 0.2, 1.2, -30), (0.8, 0.5, 2.1, -15), (-0.85, 0.55, 2.2, 20)): box(glass, (x, y, z), (0.36, 0.03, 0.5), rot=(0, 0, math.radians(ry)))
def shape_lucid(p):
    """루시드: 꿈을 다스리는 요정 여왕. 나비 날개 넷 · 왕관 · 지팡이 · 나비들."""
    loom(14); stage(C['pink'], r=0.75, cracks=4, embers=10)
    wm = mat('bw', (0.7, 0.45, 0.9), rough=0.3, alpha=0.75); wm2 = mat('bw2', C['pink'], rough=0.3, alpha=0.7)
    for sgn in (-1, 1):
        sphere(wm, (sgn * 0.65, 0.2, 1.85), 0.55, scale=(1.0, 0.06, 0.8), outline=False); sphere(wm2, (sgn * 0.5, 0.22, 1.05), 0.42, scale=(1.0, 0.06, 0.75), outline=False)
        sphere(mat('bwd', (0.95, 0.85, 1.0), emit=1.5), (sgn * 0.75, 0.16, 1.9), 0.12, scale=(1, 0.3, 1), outline=False)
    titan(p, robe=p['body'], hat='crown', weapon='staff', glow=C['pink'], float_=True, big=0.9, pauldron=False, hair=C['white'])
    bf = mat('bf', (0.95, 0.6, 0.85), emit=1.2)
    for (x, y, z) in ((-0.9, -0.3, 0.9), (0.95, -0.2, 1.6), (0.6, -0.5, 0.5), (-0.5, -0.45, 2.3)):
        for sgn in (-1, 1): box(bf, (x + sgn * 0.045, y, z), (0.08, 0.01, 0.07), rot=(0, math.radians(sgn * 35), 0))
def shape_hilla(p):
    """진 힐라: 되살아난 사령술사. 핏빛 로브 · 뼈 왕관 · 해골 지팡이 · 떠도는 해골."""
    loom(); stage(C['red'], r=0.8, cracks=7)
    titan(p, robe=p['body'], hat='bonecrown', weapon='staff', glow=(0.4, 1.0, 0.5), hair=C['red'], skin=tint(C['skin'], 0.8), big=1.0, pauldron=True)
    bone = mat('bone'); sock = mat('sock', (0.4, 1.0, 0.5), emit=2.0)
    for (x, y, z) in ((-0.95, 0.1, 1.5), (0.95, 0.0, 1.2), (0.8, -0.3, 2.2), (-0.75, -0.35, 0.6)):
        sphere(bone, (x, y, z), 0.12); eyes(x, y - 0.1, z + 0.01, 0.028, 0.05, white=sock)
def shape_swoo(p):
    """스우: 검은 날개의 군단장. 기계 갑옷 · 기계 날개 · 어깨 포 · 중력 구."""
    loom(); stage(C['orange'], r=0.85, cracks=6)
    titan(p, armor=p['body'], hat='helm', weapon='cannon', wings=('mech', (0.2, 0.2, 0.24)), horns=(0.3, 0.3, 0.34), glow=C['orange'], mask=True, big=1.05)
    sphere(mat('grav', (0.2, 0.15, 0.3), rough=0.3), (0, 0.1, 2.75), 0.2, outline=False); aura_ring(C['orange'], 2.75, 0.32, 0.015, rot=(math.radians(70), 0, 0))
def shape_damien(p):
    """데미안: 타락한 날개의 복수자. 검은 깃털 날개 · 뿔 · 검은 불꽃 대검."""
    loom(); stage(C['red'], r=0.8)
    titan(p, armor=p['body'], hat='horns', weapon='greatsword', cape=C['black'], wings=('feather', (0.1, 0.08, 0.11)), horns=C['black'], hair=C['white'], glow=C['red'], big=1.0, mask=True)
def shape_seren(p):
    """세렌: 태양의 수호자. 황금 갑옷 · 빛의 날개 · 등 뒤 태양 원반 · 불타는 검."""
    loom(); stage(C['gold'], r=0.8, cracks=8)
    sun = mat('sun', (1.0, 0.8, 0.4), emit=2.5, rough=0.3, alpha=0.85)
    torus(sun, (0, 0.5, 1.7), 0.75, 0.05, rot=(math.radians(90), 0, 0)); cyl(mat('sun2', (1.0, 0.85, 0.5), emit=1.2, alpha=0.35), (0, 0.52, 1.7), 0.7, 0.02, rot=(math.radians(90), 0, 0), verts=24)
    for i in range(12): a = i * 2 * math.pi / 12; cone(sun, (0.95 * math.cos(a), 0.5, 1.7 + 0.95 * math.sin(a)), 0.05, 0.3, rot=(0, -a + math.pi / 2, 0), verts=4)
    titan(p, armor=p['body'], hat='halo', weapon='greatsword', cape=p.get('trim'), wings=('light', (1.0, 0.9, 0.6)), hair=C['white'], glow=C['gold'], big=1.0)
def shape_blackmage(p):
    """검은 마법사: 세계를 다시 쓰는 초월자. 거대한 후드 로브 · 등 뒤 창세의 고리 셋 · 빛나는 두 손."""
    loom(9); stage(C['purple'], r=0.85, cracks=8, embers=12)
    for i, (rr, col, e) in enumerate(((1.15, (0.9, 0.85, 1.0), 2.0), (0.9, C['purple'], 2.5), (0.65, (0.3, 0.2, 0.5), 1.5))): torus(mat(f'ring{i}', col, emit=e, rough=0.3), (0, 0.45, 1.75), rr, 0.03, rot=(math.radians(90), 0, 0))
    titan(p, robe=p['body'], hat='hood', weapon=None, glow=C['purple'], float_=True, big=1.1, pauldron=True, skin=C['black'], mask=True)
    hand = mat('hand', C['purple'], emit=3.0, rough=0.3)
    for sgn in (-1, 1): sphere(hand, (sgn * 0.66, -0.2, 1.32), 0.13, outline=False); aura_ring(C['purple'], 1.32, 0.2, 0.012, rot=(0, math.radians(90), 0))
def shape_vesper(p):
    """베스퍼: 정적의 공포. 얼굴 없는 가면 · 종 모양 망토 · 퍼져 나가는 침묵의 고리."""
    loom(); stage((0.5, 0.65, 0.75), r=0.85, cracks=4, embers=5)
    titan(p, robe=p['body'], hat='hood', weapon='twinblades', float_=True, big=1.05, pauldron=True, mask=True, arms=2)
    for i, rr in enumerate((0.55, 0.85, 1.15)): aura_ring((0.6, 0.75, 0.85), 1.3, rr, 0.012, rot=(math.radians(90), 0, 0), alpha=0.5 - 0.12 * i, emit=1.5)
def shape_halder(p):
    """할더: 여섯 팔의 결정 석상. 돌 거인 · 팔 여섯 · 결정 채굴기 · 어깨 · 등의 결정."""
    loom(); stage((1.0, 0.7, 0.3), r=0.9, cracks=8)
    titan(p, armor=p['body'], hat='crown', weapon='claws', arms=6, skin=p['body'], big=1.1, pauldron=True, mask=True)
    cr = mat('crys', (1.0, 0.75, 0.35), emit=1.8, rough=0.2, alpha=0.85)
    for (x, y, z, h) in ((-0.55, 0.25, 2.0, 0.5), (0.5, 0.3, 2.1, 0.6), (0, 0.4, 2.3, 0.7), (-0.3, 0.35, 1.5, 0.4), (0.35, 0.4, 1.4, 0.35)): cone(cr, (x, y, z + h / 2), 0.1, h, verts=6)
def shape_mirren(p):
    """미렌: 늪 위를 떠도는 거대한 감긴 눈. 눈꺼풀 · 속눈썹 · 아래 촉수 · 주위의 작은 눈."""
    loom(10); stage((0.3, 0.8, 0.5), r=0.85, cracks=5, embers=10)
    eye = mat('eyeB', (0.9, 0.9, 0.85), rough=0.3); lid = mat('lid', (0.2, 0.3, 0.22)); iris = mat('iris', (0.3, 0.9, 0.6), emit=2.0)
    sphere(eye, (0, 0, 1.3), 0.75); sphere(lid, (0, 0.04, 1.36), 0.78, scale=(1, 1, 0.75))
    torus(mat('lash', (0.1, 0.15, 0.12)), (0, -0.2, 1.22), 0.72, 0.03, rot=(math.radians(75), 0, 0))
    for i in range(9): a = math.pi * (0.1 + 0.8 * i / 8); cone(mat('lash', (0.1, 0.15, 0.12)), (0.8 * math.cos(a), -0.55, 1.1 - 0.15 * math.sin(a)), 0.03, 0.35, rot=(math.radians(60), math.radians(-math.cos(a) * 40), 0), verts=5)
    for i in range(7): a = i * 2 * math.pi / 7; cone(lid, (0.4 * math.cos(a), 0.4 * math.sin(a), 0.55), 0.08, 0.9, rot=(math.radians(25) * math.sin(a), math.radians(-25) * math.cos(a), 0), verts=6)
    for (x, y, z, r) in ((-1.0, -0.2, 1.6, 0.14), (1.05, -0.1, 1.0, 0.16), (0.9, -0.3, 2.0, 0.11), (-0.95, -0.3, 0.7, 0.12)): sphere(eye, (x, y, z), r); sphere(iris, (x, y - r * 0.72, z), r * 0.5, outline=False)
def shape_solenne(p):
    """솔렌: 빛을 짜는 첫 직조자. 희고 긴 몸 · 팔 넷 · 베틀 같은 빛의 바퀴 · 빛의 실."""
    loom(); stage((1.0, 0.9, 0.6), r=0.8, cracks=6, embers=10)
    wheel = mat('wheel', (1.0, 0.92, 0.7), emit=2.0, rough=0.3)
    torus(wheel, (0, 0.5, 1.75), 1.05, 0.03, rot=(math.radians(90), 0, 0))
    for i in range(16): a = i * 2 * math.pi / 16; cyl(wheel, (0.52 * math.cos(a), 0.5, 1.75 + 0.52 * math.sin(a)), 0.008, 1.05, rot=(0, a + math.pi / 2, 0), verts=4)
    titan(p, robe=p['body'], hat='halo', weapon=None, arms=4, float_=True, big=1.05, pauldron=False, hair=(1.0, 0.95, 0.8), glow=(1.0, 0.9, 0.6))
    th = mat('thread', (1.0, 0.95, 0.75), emit=3.0, rough=0.3)
    for sgn in (-1, 1): sphere(th, (sgn * 0.66, -0.2, 1.22), 0.09, outline=False); sphere(th, (sgn * 0.66, -0.2, 0.9), 0.07, outline=False)

# ───────── 던전 보스 ───────── 
def shape_grottoWarden(p):
    """머쉬맘: 버섯 동산의 주인. 거대한 갓 · 성난 얼굴 · 팔 · 발 · 주위 새끼 버섯."""
    loom(12); stage((0.9, 0.55, 0.75), r=0.95, cracks=4, embers=6)
    cap, stem, dot = mat('c', p['body']), mat('st', p.get('stem', C['cream'])), mat('d', p.get('dot', C['white']))
    cyl(stem, (0, 0, 0.6), 0.5, 1.2, verts=18); sphere(cap, (0, 0, 1.5), 1.05, scale=(1.0, 1.0, 0.6)); cyl(cap, (0, 0, 1.22), 1.0, 0.1, verts=28)
    for (x, y, s) in ((0.45, -0.55, 0.14), (-0.5, -0.4, 0.11), (0.1, 0.7, 0.12), (-0.15, -0.8, 0.08), (0.7, 0.3, 0.1), (-0.7, 0.35, 0.09)): sphere(dot, (x, y, 1.7 + 0.3 * (0.3 - s)), s, scale=(1, 1, 0.5))
    eyes(0, -0.5, 0.75, 0.09, 0.2, white=mat('e', C['eyeWhite'], emit=0.3)); box(mat('brow', tint(p['body'], 0.5)), (0, -0.5, 0.92), (0.5, 0.05, 0.06), rot=(0, 0, 0))
    box(mat('pupil'), (0, -0.51, 0.52), (0.34, 0.02, 0.06))
    for sgn in (-1, 1): cone(mat('bone'), (sgn * 0.12, -0.52, 0.45), 0.035, 0.12, rot=(math.radians(180), 0, 0), verts=5); box(mat('brow', tint(p['body'], 0.45)), (sgn * 0.2, -0.5, 0.92), (0.22, 0.05, 0.06), rot=(0, 0, math.radians(sgn * -22)))
    for i in range(12): a = i * 2 * math.pi / 12 + 0.1; cone(mat('thorn', tint(p['body'], 0.6)), (1.02 * math.cos(a), 1.02 * math.sin(a), 1.3), 0.06, 0.26, rot=(math.radians(-70) * math.sin(a), math.radians(70) * math.cos(a), 0), verts=5)
    for sgn in (-1, 1): cyl(stem, (sgn * 0.62, -0.15, 0.7), 0.09, 0.6, rot=(math.radians(-20), math.radians(sgn * 60), 0), verts=8); sphere(stem, (sgn * 0.35, -0.22, 0.1), 0.2, scale=(1, 1.5, 0.6))
    for (x, y, k) in ((-1.0, -0.4, 0.25), (1.05, -0.3, 0.3), (0.95, 0.4, 0.22)): cyl(stem, (x, y, 0.15 * k / 0.25), 0.09 * k / 0.25, 0.3 * k / 0.25, verts=10); sphere(cap, (x, y, 0.32 * k / 0.25), k, scale=(1, 1, 0.6))
def shape_kelpHydra(p):
    """킹 슬라임: 수로의 왕. 거대한 몸 · 큰 왕관 · 성난 눈 · 흘러내리는 방울 · 새끼 슬라임."""
    loom(12); stage(C['purple'], r=0.95, cracks=5, embers=8)
    body = mat('b', p['body'], rough=0.35, alpha=0.92); core = mat('core', tint(p['body'], 1.3), emit=0.8)
    sphere(body, (0, 0, 0.75), 1.0, scale=(1.15, 1.05, 0.8)); sphere(body, (0.25, -0.15, 1.6), 0.26); sphere(body, (-0.35, 0.1, 1.5), 0.18)
    sphere(core, (0, 0.05, 0.7), 0.38, outline=False)
    eyes(0, -0.9, 0.9, 0.1, 0.28, white=mat('e', C['eyeWhite']), look=(0, 0)); box(mat('brow', tint(p['body'], 0.5)), (-0.28, -0.92, 1.08), (0.26, 0.04, 0.05), rot=(0, 0, math.radians(-25))); box(mat('brow', tint(p['body'], 0.5)), (0.28, -0.92, 1.08), (0.26, 0.04, 0.05), rot=(0, 0, math.radians(25)))
    mouth(0, -0.98, 0.6, 0.3, 'fang')
    g = mat('gold', metal=0.8, rough=0.3); cyl(g, (0, 0, 1.6), 0.36, 0.14, verts=10)
    for i in range(8): a = i * 2 * math.pi / 8; cone(g, (0.36 * math.cos(a), 0.36 * math.sin(a), 1.8), 0.07, 0.3 * (1.5 if i % 2 == 0 else 1), verts=4)
    sphere(mat('gem', C['red'], emit=1.5), (0, -0.36, 1.62), 0.07, outline=False)
    for (x, y, r) in ((-1.1, -0.3, 0.22), (1.15, -0.2, 0.25), (0.95, 0.5, 0.2)): sphere(body, (x, y, r * 0.8), r, scale=(1.15, 1.05, 0.8)); eyes(x, y - r * 0.9, r * 0.9, r * 0.12, r * 0.3)
def shape_anchorWraith(p):
    """좀비 머쉬맘: 되살아난 머쉬맘. 썩은 갓 · 찢긴 가장자리 · 튀어나온 뼈 · 초록 눈 · 뻗은 팔."""
    loom(12); stage((0.4, 0.9, 0.5), r=0.95, cracks=5, embers=8)
    cap, stem = mat('c', p['body']), mat('st', p.get('stem', C['cream'])); rot_ = mat('rot', tint(p['body'], 0.6))
    cyl(stem, (0, 0, 0.6), 0.48, 1.2, verts=18); sphere(cap, (0, 0, 1.5), 1.05, scale=(1.0, 1.0, 0.58)); cyl(cap, (0, 0, 1.22), 1.0, 0.1, verts=28)
    for i in range(7): a = i * 2 * math.pi / 7 + 0.2; cone(rot_, (1.0 * math.cos(a), 1.0 * math.sin(a), 1.2), 0.12, 0.3, rot=(math.radians(180), 0, 0), verts=4)
    for (x, y) in ((0.4, -0.5), (-0.45, -0.35), (0.1, 0.65)): sphere(rot_, (x, y, 1.72), 0.16, scale=(1, 1, 0.45))
    bone = mat('bone')
    for (x, y, z, rx, ry) in ((0.6, -0.2, 1.75, -30, 40), (-0.55, 0.2, 1.8, 20, -35), (0.1, 0.5, 1.95, 30, 10)): cone(bone, (x, y, z), 0.04, 0.45, rot=(math.radians(rx), math.radians(ry), 0), verts=5)
    eyes(0, -0.5, 0.75, 0.09, 0.2, white=mat('e', (0.4, 1.0, 0.5), emit=2.0)); box(mat('pupil'), (0, -0.5, 0.5), (0.32, 0.02, 0.05)); mouth(0, -0.51, 0.5, 0.32, 'fang')
    for sgn in (-1, 1): cyl(stem, (sgn * 0.75, -0.35, 0.85), 0.09, 0.7, rot=(math.radians(-70), math.radians(sgn * 15), 0), verts=8); sphere(stem, (sgn * 0.35, -0.22, 0.1), 0.2, scale=(1, 1.5, 0.6))
def shape_magmaKraken(p):
    """주니어 발록: 불의 제단의 마족. 큰 박쥐 날개 · 뿔 · 불타는 손톱 · 용암 균열 · 불꽃 갈기."""
    loom(); stage(C['fire'], r=0.85, cracks=9, embers=12)
    titan(p, skin=p['body'], hat='horns', weapon='claws', wings=('bat', tint(p['body'], 0.45)), horns=C['bone'], glow=C['fire'], big=1.05, pauldron=False)
    lava = mat('lava', C['fire'], emit=3.0, rough=0.4)
    for (x, z, w) in ((-0.1, 1.25, 0.3), (0.12, 1.1, 0.22), (0.0, 1.45, 0.18)): box(lava, (x, -0.33, z), (w, 0.01, 0.025), rot=(0, 0, math.radians(20 if x < 0 else -30)))
    flames(C['fire'], (0, 0, 1.85), n=5, r=0.22, h=0.35); mouth(0, -0.2, 1.85, 0.16, 'fang')
    for sgn in (-1, 1): flames(C['fire'], (sgn * 0.63, -0.2, 0.9), n=4, r=0.07, h=0.22)
def shape_templeOracle(p):
    """엘리쟈: 침묵의 바람을 부르는 하늘의 마녀. 큰 모자 · 떠 있는 몸 · 바람 소용돌이 · 지팡이."""
    loom(14); stage((0.75, 0.7, 1.0), r=0.75, cracks=4, embers=10)
    titan(p, robe=p['body'], weapon='staff', glow=C['gold'], float_=True, big=0.95, pauldron=False, hair=p.get('hair', (0.4, 0.3, 0.5)))
    cloth = mat('cl', p['body']); cone(cloth, (0, 0, 2.6), 0.26, 0.75, verts=10, r2=0.0); cyl(cloth, (0, 0, 2.28), 0.5, 0.04, verts=18)
    for i, (z, rr) in enumerate(((0.55, 0.9), (1.3, 1.05), (2.0, 0.8))): torus(mat('wind', (0.8, 0.85, 1.0), emit=1.0, alpha=0.5, rough=0.3), (0, 0, z), rr, 0.02, rot=(math.radians(12 * (1 if i % 2 else -1)), 0, 0))
def shape_abyssSovereign(p):
    """무공: 무릉도장의 주인. 탄탄한 몸 · 도복 갑옷 · 건틀릿 · 붉은 망토 · 기(氣) 오라."""
    loom(); stage(C['red'], r=0.8, cracks=6)
    titan(p, armor=p.get('armor', (0.25, 0.25, 0.3)), weapon='fists', cape=p.get('cape', C['red']), hair=(0.1, 0.08, 0.1), big=1.1, pauldron=True, glow=C['red'])
    cone(mat('h', (0.1, 0.08, 0.1)), (0, 0.02, 2.32), 0.07, 0.25, verts=6)
    for i, rr in enumerate((0.7, 0.95)): aura_ring(C['red'], 0.2 + 0.25 * i, rr, 0.012, alpha=0.7 - 0.25 * i, emit=2.0)
def shape_ventColossus(p):
    """자쿰: 봉인된 거대 석상. 큰 얼굴 몸통 · 좌우로 뻗은 팔 여덟 · 불꽃 눈 · 황금 관."""
    loom(8); stage(C['fire'], r=1.0, cracks=10, embers=12)
    st = mat('st', p['body'], rough=0.9); dk = mat('std', tint(p['body'], 0.6), rough=0.95)
    box(dk, (0, 0, 0.12), (1.2, 1.0, 0.24)); cone(st, (0, 0, 1.0), 0.6, 1.5, verts=12, r2=0.7)
    sphere(st, (0, 0, 1.95), 0.55, scale=(1.1, 0.9, 1.0))
    eyes(0, -0.42, 2.0, 0.09, 0.22, white=mat('e', p.get('eye', C['fire']), emit=2.5)); box(mat('pupil'), (0, -0.5, 1.7), (0.4, 0.03, 0.06)); mouth(0, -0.5, 1.68, 0.4, 'fang')
    for i in range(7): cone(mat('g', C['gold'], emit=1.2, metal=0.6), (-0.45 + i * 0.15, -0.2, 2.5 + 0.12 * (1 - abs(i - 3) / 3)), 0.05, 0.3 + 0.15 * (1 - abs(i - 3) / 3), verts=5)
    for sgn in (-1, 1):
        for i in range(4):
            z = 0.5 + i * 0.45; L = 1.0 - i * 0.12
            a = math.radians(70 - 22 * i)
            cyl(st, (sgn * (0.55 + L / 2 * math.sin(a)), 0.12 * (i % 2), z + L / 2 * math.cos(a)), 0.11, L, rot=(0, sgn * a, 0), verts=8)
            sphere(dk, (sgn * (0.55 + L * math.sin(a)), 0.12 * (i % 2), z + L * math.cos(a)), 0.17)
def shape_starfallSeraph(p):
    """파풀라투스: 시간을 멈춘 차원의 침략자. 시계 몸통 · 큰 날개 · 긴 팔 · 차원 고리 · 관."""
    loom(12); stage((0.6, 0.55, 0.9), r=0.85, cracks=6, embers=10)
    face, rim = mat('f', p.get('face', C['cream'])), mat('r', p['body'], metal=0.6, rough=0.4)
    cyl(rim, (0, 0, 1.3), 0.78, 0.24, rot=(math.radians(90), 0, 0), verts=32); cyl(face, (0, -0.13, 1.3), 0.65, 0.02, rot=(math.radians(90), 0, 0), verts=32)
    box(mat('pupil'), (0, -0.15, 1.48), (0.035, 0.01, 0.4)); box(mat('pupil'), (0.18, -0.15, 1.38), (0.36, 0.01, 0.035))
    for i in range(12): a = i * 2 * math.pi / 12; box(mat('pupil'), (0.56 * math.cos(a), -0.15, 1.3 + 0.56 * math.sin(a)), (0.04, 0.01, 0.1), rot=(0, -a, 0))
    eyes(0, -0.16, 1.6, 0.06, 0.2, white=mat('e', C['red'], emit=2.0))
    for sgn in (-1, 1):
        sphere(rim, (sgn * 0.75, 0, 1.85), 0.2); cyl(rim, (sgn * 1.0, 0, 1.2), 0.06, 1.0, rot=(0, math.radians(sgn * -25), 0), verts=8)
        for i in range(3): cone(rim, (sgn * (1.1 + (i - 1) * 0.08), 0, 0.62), 0.03, 0.3, rot=(math.radians(180), 0, 0), verts=5)
    feather_wings(mat('w', p.get('wing', C['white']), alpha=0.85, rough=0.3), (0.5, 0.15, 1.75), 1.5, lift=22)
    cyl(rim, (0, 0, 0.45), 0.4, 0.14, verts=18); cone(rim, (0, 0, 2.28), 0.14, 0.3, verts=8)
    for i in range(5): a = i * 2 * math.pi / 5; cone(mat('g', C['gold'], emit=1.2, metal=0.6), (0.14 * math.cos(a), 0.14 * math.sin(a), 2.46), 0.03, 0.14, verts=4)
    for i, rr in enumerate((1.0, 1.25)): torus(mat('dim', (0.6, 0.55, 0.9), emit=1.5, alpha=0.5, rough=0.3), (0, 0.3, 1.3), rr, 0.02, rot=(math.radians(90), 0, math.radians(15 * (1 if i else -1))))

def boss_palette():
  return {
    'onyxDusk': ('dusk', dict(body=(0.2, 0.15, 0.3), trim=(0.55, 0.35, 0.8), eye=(0.55, 0.35, 0.8), eyeGlow=2.0)),
    'onyxDunkel': ('dunkel', dict(body=(0.28, 0.3, 0.4), trim=(0.5, 0.55, 0.75), eye=(0.6, 0.85, 1.0), eyeGlow=2.5)),
    'onyxWill': ('will', dict(body=(0.3, 0.2, 0.45), trim=(0.55, 0.35, 0.8), eye=(0.55, 0.35, 0.8), eyeGlow=2.5)),
    'onyxLucid': ('lucid', dict(body=(0.85, 0.7, 0.95), trim=(0.95, 0.55, 0.7), eye=(0.95, 0.55, 0.7), eyeGlow=1.5)),
    'onyxHilla': ('hilla', dict(body=(0.5, 0.12, 0.18), trim=(0.85, 0.68, 0.32), eye=(0.4, 1.0, 0.5), eyeGlow=2.5)),
    'onyxSwoo': ('swoo', dict(body=(0.28, 0.26, 0.3), trim=(0.95, 0.55, 0.18), eye=(0.95, 0.55, 0.18), eyeGlow=2.5)),
    'onyxDamien': ('damien', dict(body=(0.22, 0.2, 0.28), trim=(0.78, 0.22, 0.2), eye=(0.9, 0.25, 0.2), eyeGlow=2.5)),
    'onyxSeren': ('seren', dict(body=(0.9, 0.78, 0.45), trim=(0.85, 0.3, 0.2), eye=(1.0, 0.85, 0.4), eyeGlow=2.0)),
    'onyxBlackMage': ('blackmage', dict(body=(0.1, 0.08, 0.14), trim=(0.55, 0.35, 0.8), eye=(0.7, 0.5, 1.0), eyeGlow=3.0)),
    'onyxVesper': ('vesper', dict(body=(0.3, 0.33, 0.38), trim=(0.5, 0.65, 0.75), eye=(0.6, 0.85, 1.0), eyeGlow=2.5)),
    'onyxHalder': ('halder', dict(body=(0.45, 0.4, 0.38), trim=(1.0, 0.7, 0.3), eye=(1.0, 0.75, 0.35), eyeGlow=2.5)),
    'onyxMirren': ('mirren', dict(body=(0.2, 0.3, 0.22))),
    'onyxSolenne': ('solenne', dict(body=(0.95, 0.92, 0.85), trim=(1.0, 0.85, 0.5), eye=(1.0, 0.9, 0.6), eyeGlow=2.5)),
    'grottoWarden': ('grottoWarden', dict(body=(0.55, 0.3, 0.5), stem=C['cream'], dot=C['white'])),
    'kelpHydra': ('kelpHydra', dict(body=C['green'])),
    'anchorWraith': ('anchorWraith', dict(body=(0.35, 0.4, 0.3), stem=(0.55, 0.58, 0.45))),
    'magmaKraken': ('magmaKraken', dict(body=(0.6, 0.2, 0.2), eye=C['fire'], eyeGlow=2.5)),
    'templeOracle': ('templeOracle', dict(body=(0.7, 0.65, 0.85), hair=(0.4, 0.3, 0.5), eye=C['gold'], eyeGlow=1.2)),
    'abyssSovereign': ('abyssSovereign', dict(body=(0.3, 0.3, 0.45), armor=(0.25, 0.25, 0.3), cape=C['red'], eye=C['red'], eyeGlow=1.5)),
    'ventColossus': ('ventColossus', dict(body=(0.35, 0.3, 0.28), eye=C['fire'])),
    'starfallSeraph': ('starfallSeraph', dict(body=(0.6, 0.55, 0.7), face=C['cream'], wing=(0.8, 0.85, 0.95), eye=C['red'])),
  }
