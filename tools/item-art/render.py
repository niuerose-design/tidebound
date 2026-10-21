"""
v3.388 장비 그림(블렌더 bpy). 부위(무기 물리 · 마법 · 겸용, 방어구, 망토, 장신구) × 등급 7 을 로우폴리로 만들어
public/art/items/{slot}[-{style}]-{rarity}.webp(256×256, 투명 배경)로 저장합니다. 실행은 tools/item-art/README.md.
"""
import bpy, math, os, sys, time, tempfile
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'art', 'items')
ARGS = sys.argv[1:]
SAMPLES = int(ARGS[ARGS.index('--samples') + 1]) if '--samples' in ARGS else 48
FAST = '--fast' in ARGS
PICK = ARGS[ARGS.index('--pick') + 1].split(',') if '--pick' in ARGS else None
OUTDIR = ARGS[ARGS.index('--out') + 1] if '--out' in ARGS else OUT
SIZE = 256

# 등급 색(game/data/balance.ts RARITIES 와 같음) + 등급별 재질 묶음(초보자 나무 → 제네시스 빛나는 금).
RARITY = [(0.62, 0.68, 0.69), (0.41, 0.71, 0.93), (0.75, 0.59, 0.94), (0.91, 0.75, 0.44), (0.94, 0.54, 0.42), (0.37, 0.82, 0.71), (1.0, 0.44, 0.71)]
TIER = [  # (주 재질 색, 금속성, 장식 색, 발광)
    ((0.55, 0.40, 0.24), 0.0, (0.45, 0.32, 0.18), 0.0),      # 초보자: 나무 · 천
    ((0.72, 0.74, 0.76), 0.6, (0.30, 0.55, 0.32), 0.3),      # 메이플: 강철 · 메이플 잎 초록
    ((0.30, 0.28, 0.30), 0.7, (0.85, 0.65, 0.30), 0.6),      # 자쿰: 검은 쇠 · 금
    ((0.40, 0.42, 0.60), 0.7, (0.75, 0.59, 0.94), 1.2),      # 파프니르: 푸른 강철 · 보라
    ((0.90, 0.88, 0.80), 0.5, (0.91, 0.75, 0.44), 1.5),      # 앱솔랩스: 흰 · 금
    ((0.18, 0.26, 0.28), 0.8, (0.37, 0.82, 0.71), 2.2),      # 아케인셰이드: 어두운 청록 · 빛
    ((0.95, 0.92, 0.85), 0.9, (1.0, 0.44, 0.71), 3.0),       # 제네시스: 백금 · 분홍빛
]
_mats = {}
def mat(name, rgb, rough=0.5, metal=0.0, emit=0.0):
    key = (name, rgb, rough, metal, emit)
    if key in _mats: return _mats[key]
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*rgb, 1); b.inputs['Emission Strength'].default_value = emit
    _mats[key] = m; return m

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True); _mats.clear(); _outline.clear()
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 8 if FAST else SAMPLES; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = not FAST
    sc.render.resolution_x = SIZE; sc.render.resolution_y = SIZE; sc.render.film_transparent = True; sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -0.3
    cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'; cam_data.ortho_scale = 2.0
    cam = bpy.data.objects.new('cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam
    dist, elev, az = 20.0, math.radians(18), math.radians(-25)
    cam.location = (dist * math.cos(elev) * math.sin(az), -dist * math.cos(elev) * math.cos(az), dist * math.sin(elev))
    target = bpy.data.objects.new('t', None); sc.collection.objects.link(target); target.location = (0, 0, 0)
    con = cam.constraints.new('TRACK_TO'); con.target = target; con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
    sun_data = bpy.data.lights.new('sun', 'SUN'); sun_data.energy = 3.4; sun_data.color = (1.0, 0.96, 0.9); sun_data.angle = math.radians(10)
    sun = bpy.data.objects.new('sun', sun_data); sc.collection.objects.link(sun); sun.rotation_euler = (math.radians(45), math.radians(-15), math.radians(-35))
    rim_data = bpy.data.lights.new('rim', 'AREA'); rim_data.energy = 220; rim_data.color = (0.6, 0.95, 0.9); rim_data.size = 4
    rim = bpy.data.objects.new('rim', rim_data); sc.collection.objects.link(rim); rim.location = (-2.5, 3, 2); rc = rim.constraints.new('TRACK_TO'); rc.target = target; rc.track_axis = 'TRACK_NEGATIVE_Z'; rc.up_axis = 'UP_Y'
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.55, 0.7, 0.76, 1); bg.inputs[1].default_value = 0.4

_outline = {}
def outline_mat():
    if 'm' in _outline: return _outline['m']
    m = bpy.data.materials.new('outline'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader'); geo = nt.nodes.new('ShaderNodeNewGeometry'); lp = nt.nodes.new('ShaderNodeLightPath')
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs[0].default_value = (0.03, 0.04, 0.05, 1); em.inputs[1].default_value = 1.0; tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0; mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
    nt.links.new(geo.outputs['Backfacing'], inv.inputs[1]); nt.links.new(lp.outputs['Is Camera Ray'], mul.inputs[0]); nt.links.new(inv.outputs[0], mul.inputs[1])
    nt.links.new(mul.outputs[0], mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs[0])
    _outline['m'] = m; return m
OUTLINE = 0.016
def obj(op, m, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), smooth=True, outline=True, **kw):
    op(location=loc, rotation=rot, **kw); o = bpy.context.object; o.scale = scale
    if m is not None: o.data.materials.append(m)
    if smooth: bpy.ops.object.shade_smooth()
    if outline: o.data.materials.append(outline_mat()); md = o.modifiers.new('outline', 'SOLIDIFY'); md.thickness = -OUTLINE / max(scale); md.use_flip_normals = True; md.material_offset = 1; md.use_rim = False; md.offset = 1.0
    return o
def box(m, loc, size, rot=(0, 0, 0)): return obj(bpy.ops.mesh.primitive_cube_add, m, loc=loc, rot=rot, scale=(size[0] / 2, size[1] / 2, size[2] / 2), smooth=False, size=2)
def cyl(m, loc, r, h, rot=(0, 0, 0), verts=12): return obj(bpy.ops.mesh.primitive_cylinder_add, m, loc=loc, rot=rot, radius=r, depth=h, vertices=verts)
def cone(m, loc, r, h, rot=(0, 0, 0), verts=12, r2=0.0): return obj(bpy.ops.mesh.primitive_cone_add, m, loc=loc, rot=rot, radius1=r, radius2=r2, depth=h, vertices=verts)
def sphere(m, loc, r, scale=(1, 1, 1), outline=True): return obj(bpy.ops.mesh.primitive_uv_sphere_add, m, loc=loc, scale=(r * scale[0], r * scale[1], r * scale[2]), outline=outline, segments=18, ring_count=10, radius=1)
def torus(m, loc, R, r, rot=(0, 0, 0)): return obj(bpy.ops.mesh.primitive_torus_add, m, loc=loc, rot=rot, major_radius=R, minor_radius=r, major_segments=24, minor_segments=8)
def gem(m, loc, r): return obj(bpy.ops.mesh.primitive_ico_sphere_add, m, loc=loc, smooth=False, outline=False, subdivisions=1, radius=r)

def kit(r):
    base, metal, accent, emit = TIER[r]
    return dict(main=mat('main', base, rough=0.35 if metal else 0.7, metal=metal), trim=mat('trim', accent, rough=0.3, metal=0.6 if r else 0.0, emit=emit * 0.3),
                gem=mat('gem', RARITY[r], rough=0.15, emit=0.25 + emit * 0.35), grip=mat('grip', (0.32, 0.22, 0.14), rough=0.8), cloth=mat('cloth', base if r else (0.6, 0.55, 0.45), rough=0.85))

# ───────── 모양(세로로 세워 화면 가운데) ─────────
def sword(r):
    k = kit(r)
    cyl(k['grip'], (0, 0, -0.55), 0.045, 0.34, verts=8); sphere(k['trim'], (0, 0, -0.74), 0.07)
    box(k['trim'], (0, 0, -0.36), (0.36 + 0.06 * r, 0.07, 0.06))
    w = 0.1 + 0.015 * r
    box(k['main'], (0, 0, 0.22), (w, 0.03, 1.1)); cone(k['main'], (0, 0, 0.87), w / 2, 0.2, verts=4)
    if r >= 1: box(mat('edge', (0.9, 0.92, 0.95), rough=0.2, metal=0.9), (0, -0.017, 0.22), (w * 0.4, 0.005, 1.0))
    if r >= 2: gem(k['gem'], (0, -0.05, -0.36), 0.045)
    if r >= 4:
        for z in (0.0, 0.3, 0.55): gem(k['gem'], (0, -0.02, z), 0.02)
    if r >= 5: torus(k['gem'], (0, 0, 0.22), 0.3, 0.012, rot=(math.radians(90), 0, 0))
def staff(r):
    k = kit(r)
    cyl(k['grip'] if r == 0 else k['main'], (0, 0, -0.15), 0.035, 1.4, verts=8)
    if r >= 1:
        for z in (-0.6, -0.2): torus(k['trim'], (0, 0, z), 0.04, 0.012)
    top = 0.6
    for sgn in (-1, 1): cone(k['trim'], (sgn * 0.08, 0, top + 0.1), 0.03, 0.3 + 0.05 * r, rot=(0, math.radians(sgn * -25), 0), verts=6)
    sphere(k['gem'], (0, 0, top + 0.16 + 0.02 * r), 0.1 + 0.015 * r, outline=False)
    if r >= 3: torus(k['gem'], (0, 0, top + 0.16), 0.22, 0.012, rot=(math.radians(90), 0, 0))
    if r >= 5:
        for i in range(3): a = i * 2 * math.pi / 3; gem(k['gem'], (0.3 * math.cos(a), 0.3 * math.sin(a), top + 0.16), 0.03)
def rod(r):
    """샤이닝 로드: 짧은 봉 + 날개 모양 머리."""
    k = kit(r)
    cyl(k['grip'] if r == 0 else k['main'], (0, 0, -0.3), 0.04, 0.9, verts=8); sphere(k['trim'], (0, 0, -0.77), 0.06)
    sphere(k['gem'], (0, 0, 0.3), 0.12 + 0.01 * r, outline=False)
    for sgn in (-1, 1):
        o = obj(bpy.ops.mesh.primitive_cone_add, k['trim'], loc=(sgn * 0.2, 0, 0.42), smooth=False, radius1=0.12, radius2=0.01, depth=0.5 + 0.04 * r, vertices=3)
        o.scale = (0.25, 1, 1); o.rotation_euler = (0, sgn * math.radians(-50), 0)
    if r >= 2: torus(k['trim'], (0, 0, 0.3), 0.2, 0.014, rot=(math.radians(90), 0, 0))
    if r >= 4: torus(k['gem'], (0, 0, 0.3), 0.3, 0.01, rot=(math.radians(90), 0, math.radians(20)))
def coat(r):
    k = kit(r); m = k['cloth'] if r == 0 else k['main']
    cyl(m, (0, 0, 0.0), 0.42, 0.9, verts=16)                                 # 몸통
    for sgn in (-1, 1): cyl(m, (sgn * 0.5, 0, 0.3), 0.14, 0.42, rot=(0, math.radians(sgn * 20), 0), verts=10)   # 어깨 · 소매
    cyl(k['trim'], (0, 0, 0.42), 0.26, 0.1, verts=16)                         # 목둘레
    if r >= 1:
        for sgn in (-1, 1): sphere(k['trim'], (sgn * 0.5, 0, 0.5), 0.17, scale=(1, 1, 0.6))   # 어깨 보호대
        box(k['trim'], (0, -0.43, -0.3), (0.6, 0.03, 0.08))                  # 허리띠
    if r >= 2: gem(k['gem'], (0, -0.45, 0.1), 0.06)
    if r >= 3: box(k['trim'], (0, -0.44, 0.1), (0.05, 0.02, 0.6)); box(k['trim'], (0, -0.44, 0.25), (0.4, 0.02, 0.05))
    if r >= 5:
        for sgn in (-1, 1): cone(k['gem'], (sgn * 0.55, 0, 0.62), 0.04, 0.2, verts=6)
def cape(r):
    k = kit(r); m = k['cloth']
    o = obj(bpy.ops.mesh.primitive_cone_add, m, loc=(0, 0.05, -0.1), smooth=False, radius1=0.55, radius2=0.22, depth=1.3, vertices=12); o.scale = (1, 0.45, 1)
    torus(k['trim'], (0, 0, 0.55), 0.2, 0.03)                                  # 목 고리
    gem(k['gem'], (0, -0.12, 0.55), 0.06 + 0.01 * r)
    if r >= 2: box(k['trim'], (0, -0.3, -0.05), (0.04, 0.02, 0.9))
    if r >= 4:
        for sgn in (-1, 1): box(k['trim'], (sgn * 0.3, -0.26, -0.5), (0.04, 0.02, 0.4), rot=(0, math.radians(sgn * -10), 0))
    if r >= 6: torus(k['gem'], (0, 0, 0.55), 0.3, 0.012)
def charm(r):
    k = kit(r)
    if r in (0, 3, 5):   # 귀고리 · 반지
        torus(k['main'] if r else k['grip'], (0, 0, 0.05), 0.42, 0.07 + 0.01 * r, rot=(math.radians(90), 0, 0))
        gem(k['gem'], (0, -0.06, 0.5), 0.12 + 0.015 * r)
        if r >= 3:
            for sgn in (-1, 1): gem(k['trim'], (sgn * 0.2, -0.06, 0.42), 0.05)
    else:                 # 목걸이 · 펜던트
        torus(k['trim'], (0, 0, 0.3), 0.42, 0.03, rot=(math.radians(90), 0, 0))
        box(k['main'], (0, 0, -0.12), (0.4, 0.08, 0.52), rot=(0, 0, math.radians(45)))
        gem(k['gem'], (0, -0.07, -0.12), 0.13 + 0.015 * r)
        if r >= 4: torus(k['gem'], (0, 0, -0.12), 0.34, 0.014, rot=(math.radians(90), 0, 0))
ITEMS = {'rod-physical': sword, 'rod-magic': staff, 'rod-balanced': rod, 'coat': coat, 'cape': cape, 'charm': charm}

def fit():
    bpy.context.view_layer.update(); xs, zs = [], []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH': continue
        for v in o.bound_box: w = o.matrix_world @ Vector(v); xs.append(w.x); zs.append(w.z)
    w, h = max(xs) - min(xs), max(zs) - min(zs); s = min(1.7 / max(w, 0.01), 1.7 / max(h, 0.01)); cx, cz = (max(xs) + min(xs)) / 2, (max(zs) + min(zs)) / 2
    for o in bpy.context.scene.objects:
        if o.type == 'MESH': o.location = ((o.location.x - cx) * s, o.location.y * s, (o.location.z - cz) * s); o.scale = tuple(c * s for c in o.scale)
    bpy.context.view_layer.update()
TMP = tempfile.mkdtemp(prefix='item-art-')
def render(name):
    png = os.path.join(TMP, name + '.png'); bpy.context.scene.render.filepath = png; bpy.ops.render.render(write_still=True)
    from PIL import Image
    os.makedirs(OUTDIR, exist_ok=True); Image.open(png).save(os.path.join(OUTDIR, name + '.webp'), 'WEBP', quality=88, method=6)
def main():
    t0 = time.time(); n = 0
    for key, build in ITEMS.items():
        for r in range(7):
            name = f'{key}-{r}'
            if PICK and name not in PICK and key not in PICK: continue
            reset_scene(); build(r); fit(); render(name); n += 1
            print(f'{name} {time.time() - t0:.0f}s', flush=True)
    print(f'{n} items in {time.time() - t0:.1f}s -> {OUTDIR}')
main()
