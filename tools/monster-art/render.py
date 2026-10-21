"""
v3.388 도감 몬스터 그림(블렌더 bpy). 그림이 없는 메이플 구역 · 보스 몬스터를 실루엣 모양(game/data/art.ts MONSTER_SHAPES)별 로우폴리 모델 + 몬스터별 팔레트로
같은 카메라(앞 왼쪽 3/4, 위에서 22°, 직교)로 렌더해 public/art/monsters/{id}.webp 로 저장합니다. 실행은 tools/monster-art/README.md.
"""
import bpy, math, os, sys, time, json, tempfile
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'art', 'monsters')
ARGS = sys.argv[1:]
SAMPLES = int(ARGS[ARGS.index('--samples') + 1]) if '--samples' in ARGS else 64
FAST = '--fast' in ARGS
PICK = ARGS[ARGS.index('--pick') + 1].split(',') if '--pick' in ARGS else None
OUTDIR = ARGS[ARGS.index('--out') + 1] if '--out' in ARGS else OUT
SIZE = 384

# ───────── 팔레트(기본) ─────────
C = {
    'dark': (0.10, 0.09, 0.12), 'bone': (0.86, 0.83, 0.74), 'steel': (0.58, 0.62, 0.68), 'gold': (0.85, 0.68, 0.32), 'eyeWhite': (0.95, 0.95, 0.92), 'pupil': (0.06, 0.06, 0.08),
    'shell': (0.52, 0.34, 0.22), 'skin': (0.90, 0.72, 0.60), 'wood': (0.42, 0.28, 0.16), 'leaf': (0.25, 0.58, 0.30), 'stone': (0.42, 0.44, 0.46), 'fire': (1.0, 0.45, 0.12), 'ice': (0.60, 0.85, 1.0),
    'teal': (0.30, 0.70, 0.62), 'purple': (0.55, 0.35, 0.80), 'red': (0.78, 0.22, 0.20), 'blue': (0.28, 0.48, 0.82), 'green': (0.36, 0.66, 0.32), 'orange': (0.95, 0.55, 0.18), 'pink': (0.95, 0.55, 0.70), 'grey': (0.55, 0.56, 0.58), 'black': (0.12, 0.11, 0.14), 'white': (0.92, 0.92, 0.90), 'lime': (0.62, 0.80, 0.30), 'cream': (0.93, 0.86, 0.68),
}
_mats = {}
def mat(name, rgb=None, rough=0.75, emit=0.0, metal=0.0, alpha=1.0):
    key = (name, rgb, rough, emit, metal, alpha)
    if key in _mats: return _mats[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    r, g, b = rgb or C[name]
    bsdf.inputs['Base Color'].default_value = (r, g, b, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if alpha < 1: bsdf.inputs['Alpha'].default_value = alpha; m.blend_method = 'BLEND'
    if emit: bsdf.inputs['Emission Color'].default_value = (r, g, b, 1); bsdf.inputs['Emission Strength'].default_value = emit
    _mats[key] = m
    return m
def tint(rgb, k):
    """밝기 배율(1보다 크면 밝게)."""
    return tuple(min(1.0, c * k) for c in rgb)

# ───────── 장면 ─────────
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mats.clear(); _outline.clear()
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 8 if FAST else SAMPLES; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = not FAST
    sc.render.resolution_x = SIZE; sc.render.resolution_y = SIZE; sc.render.resolution_percentage = 100
    sc.render.film_transparent = True; sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -0.4
    cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'; cam_data.ortho_scale = 2.2
    cam = bpy.data.objects.new('cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam
    dist = 20.0; elev = math.radians(22); az = math.radians(-30)   # 앞(−y)에서 왼쪽으로 30°
    cam.location = (dist * math.cos(elev) * math.sin(az), -dist * math.cos(elev) * math.cos(az), dist * math.sin(elev))
    target = bpy.data.objects.new('target', None); sc.collection.objects.link(target); target.location = (0, 0, 0.72)
    con = cam.constraints.new('TRACK_TO'); con.target = target; con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
    sun_data = bpy.data.lights.new('sun', 'SUN'); sun_data.energy = 3.6; sun_data.color = (1.0, 0.95, 0.86); sun_data.angle = math.radians(8)
    sun = bpy.data.objects.new('sun', sun_data); sc.collection.objects.link(sun); sun.rotation_euler = (math.radians(48), math.radians(-12), math.radians(-40))
    # 뒤 왼쪽 청록 림 라이트(바다 느낌)
    rim_data = bpy.data.lights.new('rim', 'AREA'); rim_data.energy = 260; rim_data.color = (0.55, 0.95, 0.85); rim_data.size = 4
    rim = bpy.data.objects.new('rim', rim_data); sc.collection.objects.link(rim); rim.location = (-2.5, 3.0, 2.2)
    rc = rim.constraints.new('TRACK_TO'); rc.target = target; rc.track_axis = 'TRACK_NEGATIVE_Z'; rc.up_axis = 'UP_Y'
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.55, 0.70, 0.76, 1); bg.inputs[1].default_value = 0.38
    return sc

# ───────── 윤곽선 · 기본 도형 ─────────
_outline = {}
def outline_mat():
    if 'm' in _outline: return _outline['m']
    m = bpy.data.materials.new('outline'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader'); geo = nt.nodes.new('ShaderNodeNewGeometry'); lp = nt.nodes.new('ShaderNodeLightPath')
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs[0].default_value = (0.03, 0.04, 0.05, 1); em.inputs[1].default_value = 1.0
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
    nt.links.new(geo.outputs['Backfacing'], inv.inputs[1]); nt.links.new(lp.outputs['Is Camera Ray'], mul.inputs[0]); nt.links.new(inv.outputs[0], mul.inputs[1])
    nt.links.new(mul.outputs[0], mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs[0])
    _outline['m'] = m
    return m
OUTLINE = 0.02
def obj(mesh_op, material, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), smooth=True, outline=True, **kw):
    mesh_op(location=loc, rotation=rot, **kw)
    o = bpy.context.object; o.scale = scale
    if material is not None: o.data.materials.append(material)
    if smooth: bpy.ops.object.shade_smooth()
    if outline and OUTLINE > 0:
        o.data.materials.append(outline_mat())
        md = o.modifiers.new('outline', 'SOLIDIFY'); md.thickness = -OUTLINE / max(scale); md.use_flip_normals = True; md.material_offset = 1; md.use_rim = False; md.offset = 1.0
    return o
def box(m, loc, size, rot=(0, 0, 0)): return obj(bpy.ops.mesh.primitive_cube_add, m, loc=loc, rot=rot, scale=(size[0] / 2, size[1] / 2, size[2] / 2), smooth=False, size=2)
def cyl(m, loc, r, h, rot=(0, 0, 0), verts=14): return obj(bpy.ops.mesh.primitive_cylinder_add, m, loc=loc, rot=rot, radius=r, depth=h, vertices=verts)
def cone(m, loc, r, h, rot=(0, 0, 0), verts=14, r2=0.0): return obj(bpy.ops.mesh.primitive_cone_add, m, loc=loc, rot=rot, radius1=r, radius2=r2, depth=h, vertices=verts)
def sphere(m, loc, r, scale=(1, 1, 1), outline=True): return obj(bpy.ops.mesh.primitive_uv_sphere_add, m, loc=loc, scale=(r * scale[0], r * scale[1], r * scale[2]), outline=outline, segments=20, ring_count=12, radius=1)
def torus(m, loc, R, r, rot=(0, 0, 0)): return obj(bpy.ops.mesh.primitive_torus_add, m, loc=loc, rot=rot, major_radius=R, minor_radius=r, major_segments=20, minor_segments=8)
def eyes(x, y, z, r=0.055, gap=0.11, pupil=None, white=None, glow=0.0, look=(0.0, 0.0)):
    """앞(−y)을 보는 눈 두 개. look 로 동공을 살짝 옮깁니다."""
    for sgn in (-1, 1):
        sphere(white or mat('eyeWhite', rough=0.3, emit=glow), (x + sgn * gap, y, z), r)
        sphere(pupil or mat('pupil', rough=0.2), (x + sgn * gap + look[0], y - r * 0.78, z + look[1]), r * 0.45, outline=False)
def mouth(x, y, z, w=0.16, kind='smile'):
    if kind == 'smile': torus(mat('pupil'), (x, y, z), w / 2, 0.012, rot=(math.radians(90), 0, 0))
    elif kind == 'line': box(mat('pupil'), (x, y, z), (w, 0.02, 0.025))
    elif kind == 'fang':
        for sgn in (-1, 1): cone(mat('bone'), (x + sgn * w / 3, y, z - 0.03), 0.02, 0.07, rot=(math.radians(180), 0, 0), verts=5)
def wing(m, loc, length, chord, rot=(0, 0, 0), sgn=1, side='y'):
    """납작한 삼각 날개. loc 은 몸에 붙는 뿌리, sgn 은 좌우. side='y'(옆모습 몸: 화면 안팎으로) · 'x'(정면 몸: 화면 좌우로). rot[0] 은 위로 치켜든 각도(도)."""
    lift = math.radians(rot[0])
    o = obj(bpy.ops.mesh.primitive_cone_add, m, loc=(0, 0, 0), smooth=False, outline=False, radius1=chord / 2, radius2=0.02, depth=length, vertices=3)
    if side == 'y':
        o.scale = (1.0, 0.05 / (chord / 2), 1.0); o.rotation_euler = (sgn * (-math.pi / 2 + lift), 0, 0)
        axis = Vector((0, sgn * math.cos(lift), math.sin(lift)))
    else:
        o.scale = (0.05 / (chord / 2), 1.0, 1.0); o.rotation_euler = (0, sgn * (math.pi / 2 - lift), 0)
        axis = Vector((sgn * math.cos(lift), 0, math.sin(lift)))
    o.location = Vector(loc) + axis * (length / 2)
    return o
def ground(size=1.8):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, 0)); g = bpy.context.object; g.is_shadow_catcher = True
    g.data.materials.append(mat('groundShadow', rgb=(0.5, 0.5, 0.5)))
def spikes(center, r, n, h, m, z, tilt=0.0):
    for i in range(n):
        a = i * 2 * math.pi / n
        cone(m, (center[0] + r * math.cos(a), center[1] + r * math.sin(a), z), h * 0.3, h, rot=(math.radians(-90 + tilt) * math.sin(a), math.radians(90 - tilt) * math.cos(a), 0), verts=6)

# ───────── 모양 ─────────
def shape_snail(p):
    body, shell, spiral = mat('b', p['body']), mat('s', p['shell']), mat('s2', tint(p['shell'], 0.6))
    sphere(body, (0.05, 0, 0.18), 0.3, scale=(1.9, 1.0, 0.6))            # 발
    sphere(body, (0.55, 0, 0.42), 0.19, scale=(1.0, 0.9, 1.0))            # 머리
    for sgn in (-1, 1):
        cyl(body, (0.62, sgn * 0.08, 0.66), 0.025, 0.3, rot=(math.radians(sgn * -20), math.radians(20), 0), verts=6); sphere(mat('eyeWhite', rough=0.3), (0.68, sgn * 0.13, 0.8), 0.05); sphere(mat('pupil'), (0.71, sgn * 0.13, 0.81), 0.024, outline=False)
    sphere(shell, (-0.2, 0, 0.5), 0.42, scale=(1.0, 0.75, 1.0))           # 껍질
    torus(spiral, (-0.2, -0.3, 0.5), 0.24, 0.035, rot=(math.radians(90), 0, 0)); torus(spiral, (-0.2, -0.3, 0.5), 0.1, 0.03, rot=(math.radians(90), 0, 0))
    mouth(0.68, -0.12, 0.36, 0.08, 'smile')
def shape_mushroom(p):
    cap, stem, dot = mat('c', p['body']), mat('st', p.get('stem', C['cream'])), mat('d', p.get('dot', C['white']))
    cyl(stem, (0, 0, 0.3), 0.26, 0.6, verts=16)
    sphere(cap, (0, 0, 0.78), 0.62, scale=(1.0, 1.0, 0.62))
    cyl(cap, (0, 0, 0.6), 0.6, 0.06, verts=24)
    for (x, y, s) in ((0.25, -0.35, 0.09), (-0.3, -0.25, 0.07), (0.05, 0.45, 0.08), (-0.1, -0.5, 0.05), (0.42, 0.2, 0.06)): sphere(dot, (x, y, 0.9 + 0.2 * (0.3 - s)), s, scale=(1, 1, 0.5))
    eyes(0, -0.26, 0.36, 0.05, 0.1, glow=0.0)
    mouth(0, -0.27, 0.22, 0.1, p.get('mouth', 'smile'))
    if p.get('horn'): cone(mat('h', C['bone']), (0, -0.2, 1.1), 0.09, 0.4, rot=(math.radians(-20), 0, 0), verts=8)
    if p.get('zombie'):
        for sgn in (-1, 1): cyl(stem, (sgn * 0.32, -0.1, 0.42), 0.05, 0.3, rot=(0, math.radians(sgn * 70), 0), verts=6)
    if p.get('feet'):
        for sgn in (-1, 1): sphere(stem, (sgn * 0.17, -0.12, 0.06), 0.11, scale=(1, 1.4, 0.55))
def shape_slime(p):
    body = mat('b', p['body'], rough=0.35, alpha=0.92); core = mat('core', tint(p['body'], 1.3), emit=0.6)
    sphere(body, (0, 0, 0.42), 0.55, scale=(1.15, 1.05, 0.78))
    sphere(body, (0.12, -0.1, 0.9), 0.14)
    sphere(core, (0.0, 0.05, 0.4), 0.2, outline=False)
    eyes(0, -0.5, 0.5, 0.06, 0.16, look=(0, 0))
    mouth(0, -0.55, 0.33, 0.14, p.get('mouth', 'smile'))
    if p.get('crown'):
        g = mat('gold', metal=0.8, rough=0.3); cyl(g, (0, 0, 0.96), 0.17, 0.08, verts=8)
        for i in range(5): a = i * 2 * math.pi / 5; cone(g, (0.17 * math.cos(a), 0.17 * math.sin(a), 1.06), 0.04, 0.14, verts=4)
def shape_pig(p):
    body, snout, dark = mat('b', p['body']), mat('sn', tint(p['body'], 1.15)), mat('d', tint(p['body'], 0.55))
    sphere(body, (0, 0, 0.42), 0.4, scale=(1.35, 1.0, 0.9))
    for (x, y) in ((-0.25, -0.18), (0.25, -0.18), (-0.25, 0.18), (0.25, 0.18)): cyl(dark, (x, y, 0.1), 0.06, 0.22, verts=8)
    sphere(body, (0.45, 0, 0.62), 0.27)
    sphere(snout, (0.68, 0, 0.56), 0.11, scale=(0.7, 1.1, 0.9))
    for sgn in (-1, 1): sphere(mat('pupil'), (0.76, sgn * 0.04, 0.57), 0.02, outline=False); cone(body, (0.4, sgn * 0.2, 0.88), 0.07, 0.18, rot=(math.radians(sgn * 25), 0, 0), verts=6)
    eyes(0.58, -0.05, 0.72, 0.045, 0.12)
    cyl(dark, (-0.5, 0, 0.5), 0.02, 0.25, rot=(0, math.radians(60), 0), verts=6)
    if p.get('ribbon'):
        r = mat('r', p['ribbon'])
        for sgn in (-1, 1): sphere(r, (0.3, sgn * 0.12, 0.92), 0.08, scale=(0.6, 1.2, 0.8))
    if p.get('armor'):
        s = mat('steel', metal=0.7, rough=0.35); sphere(s, (0, 0, 0.5), 0.42, scale=(1.1, 1.05, 0.7)); box(mat('gold', metal=0.7, rough=0.3), (0.1, 0, 0.84), (0.5, 0.08, 0.04))
def shape_boar(p):
    body, mane, tusk = mat('b', p['body']), mat('m', p.get('mane', tint(p['body'], 0.5))), mat('bone')
    sphere(body, (0, 0, 0.5), 0.42, scale=(1.5, 0.95, 0.95))
    for (x, y) in ((-0.35, -0.2), (0.35, -0.2), (-0.35, 0.2), (0.35, 0.2)): cyl(mat('d', tint(p['body'], 0.5)), (x, y, 0.14), 0.065, 0.3, verts=8)
    sphere(body, (0.55, 0, 0.6), 0.32, scale=(1.1, 0.9, 0.95))
    box(mane, (0.0, 0, 0.9), (0.9, 0.12, 0.14))
    sphere(mat('d', tint(p['body'], 0.7)), (0.82, 0, 0.5), 0.13, scale=(0.7, 1.1, 0.9))
    for sgn in (-1, 1): cone(tusk, (0.78, sgn * 0.14, 0.42), 0.035, 0.22, rot=(math.radians(sgn * 20), math.radians(60), 0), verts=6); cone(body, (0.45, sgn * 0.22, 0.88), 0.07, 0.16, rot=(math.radians(sgn * 30), 0, 0), verts=6)
    eyes(0.7, -0.02, 0.72, 0.04, 0.13, white=mat('e', p.get('eye', C['eyeWhite']), emit=p.get('eyeGlow', 0.0)))
    if p.get('fire'):
        f = mat('fire', emit=2.5, rough=0.4)
        for (x, s) in ((-0.1, 0.12), (0.1, 0.1), (-0.3, 0.09)): cone(f, (x, 0, 1.05), s, 0.32, verts=7)
    if p.get('armor'): s = mat('steel', metal=0.7, rough=0.35); sphere(s, (0, 0, 0.56), 0.44, scale=(1.3, 1.0, 0.72)); spikes((0, 0), 0.0, 1, 0.3, s, 1.0)
    if p.get('wings'):
        w = mat('w', p['wings'])
        for sgn in (-1, 1): wing(w, (-0.05, sgn * 0.3, 0.85), 0.7, 0.55, rot=(45, 0, 0), sgn=sgn)
    if p.get('tailSpike'): cyl(mat('d', tint(p['body'], 0.5)), (-0.7, 0, 0.75), 0.03, 0.5, rot=(0, math.radians(-50), 0), verts=6); cone(tusk, (-0.9, 0, 0.98), 0.05, 0.16, rot=(0, math.radians(-30), 0), verts=6)
def shape_golem(p):
    rock, rock2, glow = mat('r', p['body']), mat('r2', tint(p['body'], 0.7)), mat('g', p.get('glow', C['teal']), emit=2.0, rough=0.3)
    box(rock, (0, 0, 0.62), (0.8, 0.6, 0.78), rot=(0, 0, 0.08))
    box(rock2, (0, 0, 1.14), (0.56, 0.46, 0.36), rot=(0, 0, -0.1))
    for sgn in (-1, 1): box(rock, (sgn * 0.6, -0.05, 0.6), (0.3, 0.3, 0.9), rot=(0, 0, sgn * 0.15)); box(rock2, (sgn * 0.3, 0, 0.14), (0.3, 0.34, 0.28))
    if p.get('turtle'):
        sh = mat('sh', p['shell']); sphere(sh, (0, 0.1, 0.9), 0.55, scale=(1.0, 0.9, 0.6)); sphere(rock, (0, -0.55, 0.72), 0.2); eyes(0, -0.72, 0.78, 0.04, 0.1); mouth(0, -0.74, 0.66, 0.1, 'line')
    else:
        for sgn in (-1, 1): box(glow, (sgn * 0.12, -0.24, 1.16), (0.1, 0.02, 0.06))
        box(glow, (0, -0.31, 0.62), (0.16, 0.02, 0.16), rot=(0, 0, 0.78))
    if p.get('mix'):
        for (x, y, z, s) in ((0.2, -0.2, 0.9, 0.12), (-0.25, 0.1, 0.4, 0.14), (0.3, 0.2, 0.3, 0.1)): sphere(mat('mx', p['mix'], emit=0.8), (x, y, z), s)
def shape_eye(p):
    iris, white, skin = mat('i', p['body'], emit=0.5, rough=0.3), mat('eyeWhite', rough=0.25), mat('sk', p.get('skin', tint(p['body'], 0.5)))
    sphere(white, (0, 0, 0.62), 0.5)
    sphere(iris, (0, -0.33, 0.62), 0.26, outline=False)
    sphere(mat('pupil', rough=0.15), (0, -0.47, 0.62), 0.12, outline=False)
    cyl(skin, (0, 0, 0.62), 0.52, 0.12, rot=(math.radians(90), 0, 0), verts=24) if False else None
    # 눈꺼풀 · 뒤통수 · 날개
    sphere(skin, (0, 0.1, 0.62), 0.52, scale=(1.0, 0.85, 1.0))
    sphere(white, (0, -0.02, 0.62), 0.47)
    sphere(iris, (0, -0.33, 0.62), 0.26, outline=False); sphere(mat('pupil', rough=0.15), (0, -0.47, 0.62), 0.12, outline=False)
    for sgn in (-1, 1): box(skin, (sgn * 0.55, 0.15, 0.78), (0.5, 0.04, 0.34), rot=(0, 0, sgn * 0.35)); cone(skin, (sgn * 0.25, 0.12, 1.1), 0.08, 0.3, rot=(0, math.radians(sgn * 25), 0), verts=6)
    if p.get('ice'):
        for (x, z) in ((0.3, 1.05), (-0.35, 1.0), (0.05, 1.15)): cone(mat('ice', emit=0.6, rough=0.2), (x, 0.1, z), 0.06, 0.3, verts=6)
    if p.get('screen'):
        box(mat('steel', metal=0.6, rough=0.4), (0, 0.0, 0.62), (1.1, 0.5, 0.8)); box(mat('scr', p['body'], emit=1.2, rough=0.2), (0, -0.26, 0.64), (0.8, 0.02, 0.55)); box(mat('steel', metal=0.6, rough=0.4), (0, 0, 0.1), (0.5, 0.4, 0.2))
def shape_monkey(p):
    fur, face, banana = mat('f', p['body']), mat('fa', p.get('face', C['cream'])), mat('ba', C['gold'] if not p.get('zombie') else (0.5, 0.5, 0.3))
    sphere(fur, (0, 0, 0.5), 0.33, scale=(1.0, 0.9, 1.15))
    sphere(fur, (0, -0.05, 1.0), 0.3); sphere(face, (0, -0.25, 0.96), 0.2, scale=(1.1, 0.8, 0.9))
    eyes(0, -0.4, 1.04, 0.045, 0.1, white=mat('e', p.get('eye', C['eyeWhite']))); mouth(0, -0.42, 0.9, 0.1, 'smile' if not p.get('zombie') else 'line')
    for sgn in (-1, 1): sphere(fur, (sgn * 0.3, 0, 1.08), 0.09); cyl(fur, (sgn * 0.38, -0.1, 0.55), 0.06, 0.5, rot=(0, math.radians(sgn * -25), 0), verts=8); cyl(fur, (sgn * 0.15, 0, 0.12), 0.07, 0.25, verts=8)
    torus(fur, (-0.3, 0.2, 0.5), 0.22, 0.035, rot=(0, math.radians(90), 0))
    cyl(banana, (0.55, -0.25, 0.9), 0.05, 0.36, rot=(0, math.radians(30), 0), verts=8)
    if p.get('zombie'): box(mat('bone'), (0.1, -0.3, 0.58), (0.2, 0.06, 0.04))
def shape_drake(p):
    scale_m, belly, wing_m, horn = mat('s', p['body']), mat('b', p.get('belly', tint(p['body'], 1.4))), mat('w', p.get('wing', tint(p['body'], 0.7))), mat('bone')
    sphere(scale_m, (0, 0, 0.5), 0.38, scale=(1.5, 0.9, 0.9))
    sphere(belly, (0.05, -0.12, 0.38), 0.3, scale=(1.3, 0.8, 0.7), outline=False)
    cyl(scale_m, (0.5, 0, 0.75), 0.13, 0.45, rot=(0, math.radians(-40), 0), verts=10)
    sphere(scale_m, (0.75, 0, 0.98), 0.22, scale=(1.3, 0.9, 0.85))
    for sgn in (-1, 1): cone(horn, (0.65, sgn * 0.12, 1.2), 0.04, 0.22, rot=(math.radians(sgn * 25), math.radians(-30), 0), verts=6); cyl(mat('d', tint(p['body'], 0.6)), (0.3 * sgn, sgn * 0.2, 0.15), 0.07, 0.3, verts=8)
    eyes(0.85, -0.1, 1.04, 0.04, 0.1, white=mat('e', p.get('eye', C['gold']), emit=0.6)); mouth(0.92, -0.08, 0.9, 0.1, 'fang')
    for sgn in (-1, 1): wing(wing_m, (-0.05, sgn * 0.25, 0.78), 0.85, 0.7, rot=(45, 0, 0), sgn=sgn)
    cone(scale_m, (-0.75, 0, 0.45), 0.1, 0.7, rot=(0, math.radians(-100), 0), verts=8)
    spikes((0, 0), 0.0, 1, 0.14, mat('d', tint(p['body'], 0.6)), 0.9)
    if p.get('fire'): sphere(mat('fire', emit=3.0, rough=0.3), (1.05, -0.05, 0.9), 0.08, outline=False)
def shape_ghost(p):
    cloth = mat('c', p['body'], rough=0.5, alpha=0.9); glow = mat('g', p.get('glow', tint(p['body'], 1.3)), emit=1.5, rough=0.3)
    sphere(cloth, (0, 0, 0.9), 0.36)
    cone(cloth, (0, 0, 0.48), 0.36, 0.7, verts=12, r2=0.2)
    for i, x in enumerate((-0.25, -0.08, 0.1, 0.27)): cone(cloth, (x, 0, 0.1), 0.09, 0.2, rot=(math.radians(180), 0, 0), verts=6)
    eyes(0, -0.3, 0.96, 0.06, 0.12, white=glow, pupil=mat('pupil'))
    mouth(0, -0.33, 0.8, 0.1, 'line')
    for sgn in (-1, 1): sphere(cloth, (sgn * 0.42, -0.1, 0.65), 0.1, scale=(1.3, 1, 0.8))
    if p.get('lantern'): sphere(mat('fire', emit=3.0, rough=0.3), (0.55, -0.15, 0.6), 0.07, outline=False)
    if p.get('wisp'):
        for (x, z, s) in ((-0.5, 1.2, 0.07), (0.5, 1.3, 0.05), (0.45, 0.3, 0.06)): sphere(glow, (x, 0, z), s, outline=False)
def shape_skeleton(p):
    bone, dark = mat('bone'), mat('pupil')
    for sgn in (-1, 1): cyl(bone, (sgn * 0.1, 0, 0.22), 0.045, 0.44, verts=8)
    cyl(bone, (0, 0, 0.5), 0.09, 0.14, verts=8)
    for i in range(4): torus(bone, (0, 0, 0.62 + i * 0.09), 0.17 - i * 0.015, 0.025, rot=(0, 0, 0))
    cyl(bone, (0, 0, 0.78), 0.035, 0.45, verts=6)
    sphere(bone, (0, 0, 1.12), 0.2, scale=(1, 0.95, 1.05)); box(bone, (0, -0.1, 0.98), (0.2, 0.2, 0.1))
    for sgn in (-1, 1): sphere(dark, (sgn * 0.08, -0.17, 1.16), 0.05, outline=False); cyl(bone, (sgn * 0.25, 0, 0.8), 0.035, 0.42, rot=(0, math.radians(sgn * 15), 0), verts=6)
    sphere(mat('g', p.get('glow', C['red']), emit=2.0), (0, -0.18, 1.16), 0.0 if not p.get('eyeGlow') else 0.03, outline=False)
    if p.get('weapon') == 'sword': box(mat('steel', metal=0.7, rough=0.35), (0.42, -0.1, 0.95), (0.05, 0.02, 0.7)); box(mat('gold'), (0.42, -0.1, 0.62), (0.16, 0.03, 0.03))
    if p.get('weapon') == 'spear': cyl(mat('wood'), (0.42, -0.1, 0.8), 0.02, 1.4, verts=6); cone(mat('steel', metal=0.7, rough=0.35), (0.42, -0.1, 1.58), 0.05, 0.2, verts=6)
    if p.get('helm'): sphere(mat('steel', metal=0.6, rough=0.4), (0, 0, 1.18), 0.22, scale=(1, 1, 0.75)); cone(mat('red'), (0, 0.05, 1.42), 0.05, 0.16, verts=6)
    if p.get('big'):
        for o in list(bpy.context.scene.objects):
            if o.type == 'MESH': o.scale = tuple(s * 1.2 for s in o.scale); o.location = tuple(l * 1.2 for l in o.location)
    if p.get('wings'):
        for sgn in (-1, 1): wing(bone, (sgn * 0.2, 0.08, 0.95), 0.6, 0.5, rot=(28, 0, 0), sgn=sgn, side='x')
def shape_octopus(p):
    body = mat('b', p['body']); sucker = mat('s', tint(p['body'], 1.3))
    sphere(body, (0, 0, 0.8), 0.42, scale=(1, 0.95, 1.15))
    for i in range(8):
        a = i * 2 * math.pi / 8 + 0.2; x, y = 0.32 * math.cos(a), 0.32 * math.sin(a)
        cyl(body, (x * 1.5, y * 1.5, 0.16), 0.07, 0.32, rot=(math.radians(-50) * math.sin(a), math.radians(50) * math.cos(a), 0), verts=8)
        sphere(sucker, (x * 2.1, y * 2.1, 0.06), 0.07, scale=(1, 1, 0.6))
    eyes(0, -0.36, 0.86, 0.07, 0.17, look=(0, 0)); mouth(0, -0.4, 0.66, 0.08, 'smile')
    if p.get('ring'): torus(mat('gold', metal=0.7, rough=0.3), (0, 0, 1.2), 0.2, 0.03)
def shape_bat(p):
    fur, wing_m = mat('f', p['body']), mat('w', p.get('wing', tint(p['body'], 0.7)))
    sphere(fur, (0, 0, 0.75), 0.28)
    for sgn in (-1, 1):
        wing(wing_m, (sgn * 0.22, 0.02, 0.78), 0.62, 0.45, rot=(12, 0, 0), sgn=sgn, side='x'); cone(fur, (sgn * 0.14, 0.05, 1.03), 0.07, 0.2, rot=(0, math.radians(sgn * 15), 0), verts=6)
        cyl(fur, (sgn * 0.1, -0.05, 0.42), 0.03, 0.2, verts=6)
    eyes(0, -0.22, 0.8, 0.05, 0.11, white=mat('e', p.get('eye', C['red']), emit=1.2)); mouth(0, -0.25, 0.66, 0.08, 'fang')
    if p.get('bird'):
        cone(mat('gold'), (0, -0.3, 0.72), 0.06, 0.2, rot=(math.radians(-90), 0, 0), verts=6); sphere(fur, (0, 0.1, 0.35), 0.3, scale=(1.1, 1.2, 0.9))
def shape_crab(p):
    sh, claw = mat('s', p['body']), mat('c', tint(p['body'], 1.15))
    sphere(sh, (0, 0, 0.36), 0.45, scale=(1.3, 1.0, 0.55))
    for i in range(5): cone(mat('bone'), (-0.3 + i * 0.15, 0.1, 0.62), 0.03, 0.14, verts=5)
    for sgn in (-1, 1):
        for j in range(3): cyl(sh, (-0.2 + j * 0.2, sgn * 0.5, 0.15), 0.035, 0.3, rot=(math.radians(sgn * 45), 0, 0), verts=6)
        box(claw, (0.5, sgn * 0.3, 0.38), (0.3, 0.16, 0.2)); box(claw, (0.66, sgn * 0.3, 0.5), (0.16, 0.07, 0.12), rot=(0, 0.3, 0))
    eyes(0.3, -0.25, 0.6, 0.045, 0.12); mouth(0.3, -0.33, 0.44, 0.1, 'line')
    if p.get('crown'):
        g = mat('gold', metal=0.8, rough=0.3)
        for i in range(5): cone(g, (-0.2 + i * 0.1, -0.15, 0.7), 0.025, 0.12, verts=4)
def shape_croc(p):
    sk, belly = mat('s', p['body']), mat('b', p.get('belly', tint(p['body'], 1.3)))
    sphere(sk, (-0.1, 0, 0.3), 0.35, scale=(1.9, 1.0, 0.7))
    box(sk, (0.6, 0, 0.3), (0.7, 0.4, 0.26)); box(belly, (0.6, 0, 0.2), (0.68, 0.36, 0.08), outline=False) if False else None
    for sgn in (-1, 1): cyl(sk, (0.2, sgn * 0.33, 0.1), 0.06, 0.2, verts=6); cyl(sk, (-0.4, sgn * 0.3, 0.1), 0.06, 0.2, verts=6)
    for i in range(4): cone(mat('bone'), (0.4 + i * 0.12, 0.17, 0.2), 0.02, 0.07, rot=(math.radians(180), 0, 0), verts=4); cone(mat('bone'), (0.4 + i * 0.12, -0.17, 0.2), 0.02, 0.07, rot=(math.radians(180), 0, 0), verts=4)
    eyes(0.35, -0.1, 0.5, 0.045, 0.14, white=mat('e', p.get('eye', C['gold']), emit=0.5))
    spikes((0, 0), 0.0, 1, 0.12, mat('d', tint(p['body'], 0.6)), 0.6)
    cone(sk, (-0.85, 0, 0.3), 0.12, 0.6, rot=(0, math.radians(-90), 0), verts=8)
    if p.get('blind'): box(mat('d', (0.2, 0.2, 0.22)), (0.35, 0, 0.5), (0.1, 0.36, 0.08))
def shape_snake(p):
    sk, belly = mat('s', p['body']), mat('b', p.get('belly', tint(p['body'], 1.3)))
    torus(sk, (0, 0, 0.12), 0.42, 0.11); torus(sk, (0.05, 0.05, 0.33), 0.3, 0.1)
    cyl(sk, (0.1, -0.2, 0.68), 0.1, 0.5, rot=(math.radians(-15), 0, 0), verts=10)
    sphere(sk, (0.1, -0.32, 0.98), 0.18, scale=(1, 1.3, 0.9))
    eyes(0.1, -0.5, 1.04, 0.04, 0.09, white=mat('e', p.get('eye', C['gold']), emit=0.6))
    box(mat('red'), (0.1, -0.58, 0.9), (0.03, 0.2, 0.015))
    if p.get('poison'):
        for (x, z) in ((-0.3, 0.6), (0.4, 0.5)): sphere(mat('g', p['poison'], emit=1.0, rough=0.3, alpha=0.8), (x, 0, z), 0.07, outline=False)
def shape_bubble(p):
    skin = mat('s', p['body'], rough=0.25, alpha=0.75); core = mat('c', p.get('core', tint(p['body'], 1.4)), emit=1.5, rough=0.3)
    sphere(skin, (0, 0, 0.72), 0.5)
    sphere(core, (0, 0, 0.72), 0.2, outline=False)
    for (x, y, z, s) in ((0.45, -0.3, 1.1, 0.1), (-0.5, 0.1, 0.4, 0.08), (0.2, 0.4, 1.25, 0.06)): sphere(skin, (x, y, z), s, outline=False)
    eyes(0, -0.4, 0.78, 0.05, 0.13, glow=0.4); mouth(0, -0.44, 0.62, 0.08, 'smile')
    if p.get('wings'):
        for sgn in (-1, 1): box(mat('w', C['white'], alpha=0.6, rough=0.3), (sgn * 0.5, 0.05, 0.95), (0.4, 0.03, 0.5), rot=(0, math.radians(sgn * 20), 0))
def shape_demon(p):
    skin, dark, horn = mat('s', p['body']), mat('d', tint(p['body'], 0.55)), mat('h', p.get('horn', C['bone']))
    for sgn in (-1, 1): cyl(dark, (sgn * 0.13, 0, 0.22), 0.07, 0.44, verts=8)
    sphere(skin, (0, 0, 0.72), 0.34, scale=(1.2, 0.9, 1.0))
    sphere(skin, (0, 0, 1.2), 0.24)
    for sgn in (-1, 1): cone(horn, (sgn * 0.15, 0, 1.42), 0.05, 0.3, rot=(math.radians(sgn * 20), math.radians(sgn * 20), 0), verts=6); cyl(skin, (sgn * 0.42, -0.1, 0.7), 0.06, 0.5, rot=(0, math.radians(sgn * -20), 0), verts=8)
    eyes(0, -0.22, 1.24, 0.045, 0.1, white=mat('e', p.get('eye', C['fire']), emit=1.5)); mouth(0, -0.24, 1.1, 0.12, 'fang')
    for sgn in (-1, 1): wing(dark, (sgn * 0.3, 0.1, 0.85), 0.65, 0.5, rot=(30, 0, 0), sgn=sgn, side='x')
    if p.get('chimera'):
        sphere(skin, (-0.35, 0, 0.9), 0.16); eyes(-0.35, -0.14, 0.94, 0.03, 0.07); cone(skin, (-0.6, 0, 0.6), 0.06, 0.5, rot=(0, math.radians(-110), 0), verts=6)
    if p.get('fireTail'): sphere(mat('fire', emit=2.5, rough=0.3), (-0.5, 0.1, 0.5), 0.09, outline=False)
def humanoid(p, robe=None, armor=None, cape=None, hat=None, weapon=None, big=1.0, skin=None, hair=None, glow=None, wings=None, horns=None, float_=False):
    """사람형 보스 공통 몸. robe · armor · cape · hat(hood · crown · horns · hat · halo · helm) · weapon(staff · sword · scythe · book · orb · gauntlet · cannon)."""
    sk = mat('sk', skin or C['skin']); cloth = mat('cl', robe or p['body']); trim = mat('tr', p.get('trim', C['gold']), metal=0.5, rough=0.4)
    z0 = 0.25 if float_ else 0.0
    if robe is not None or not armor: cone(cloth, (0, 0, z0 + 0.42 * big), 0.3 * big, 0.84 * big, verts=12, r2=0.14 * big)
    else:
        for sgn in (-1, 1): cyl(mat('d', C['dark']), (sgn * 0.1 * big, 0, z0 + 0.18 * big), 0.06 * big, 0.36 * big, verts=8)
        cyl(cloth, (0, 0, z0 + 0.55 * big), 0.2 * big, 0.42 * big, verts=12)
    if armor: a = mat('ar', armor, metal=0.7, rough=0.35); cyl(a, (0, 0, z0 + 0.62 * big), 0.23 * big, 0.3 * big, verts=12); box(a, (0, 0, z0 + 0.8 * big), (0.56 * big, 0.3 * big, 0.08))
    box(trim, (0, 0, z0 + 0.5 * big), (0.4 * big, 0.4 * big, 0.05))
    for sgn in (-1, 1): cyl(cloth if not armor else mat('ar', armor, metal=0.7, rough=0.35), (sgn * 0.26 * big, -0.03, z0 + 0.6 * big), 0.055 * big, 0.36 * big, rot=(math.radians(-10), math.radians(sgn * -14), 0), verts=8)
    hz = z0 + 0.98 * big
    sphere(sk, (0, 0, hz), 0.17 * big)
    if hair: sphere(mat('h', hair), (0, 0.03, hz + 0.05), 0.18 * big, scale=(1, 1, 0.85))
    eyes(0, -0.13 * big, hz + 0.01, 0.028 * big, 0.065 * big, white=mat('e', p.get('eye', C['eyeWhite']), emit=p.get('eyeGlow', 0.0)))
    if hat == 'hood': sphere(cloth, (0, 0.03, hz + 0.05), 0.2 * big, scale=(1, 1, 0.95)); cone(cloth, (0, 0.08, hz + 0.25), 0.14, 0.24, verts=8)
    elif hat == 'crown':
        g = mat('gold', metal=0.8, rough=0.3); cyl(g, (0, 0, hz + 0.16 * big), 0.13 * big, 0.08, verts=8)
        for i in range(6): a_ = i * 2 * math.pi / 6; cone(g, (0.13 * big * math.cos(a_), 0.13 * big * math.sin(a_), hz + 0.26 * big), 0.03, 0.12, verts=4)
    elif hat == 'horns':
        for sgn in (-1, 1): cone(mat('hn', horns or C['dark']), (0, sgn * 0.14 * big, hz + 0.15), 0.04, 0.26, rot=(math.radians(sgn * -40), 0, 0), verts=6)
    elif hat == 'hat': cone(cloth, (0, 0, hz + 0.32 * big), 0.2 * big, 0.5 * big, verts=10); cyl(cloth, (0, 0, hz + 0.12 * big), 0.28 * big, 0.03, verts=14)
    elif hat == 'halo': torus(mat('gold', emit=1.5, rough=0.3), (0, 0, hz + 0.3 * big), 0.16 * big, 0.02)
    elif hat == 'helm': sphere(mat('ar', armor or C['steel'], metal=0.7, rough=0.35), (0, 0, hz + 0.03), 0.19 * big, scale=(1, 1, 0.85)); box(mat('ar', armor or C['steel'], metal=0.7, rough=0.35), (0, -0.12, hz - 0.02), (0.3, 0.14, 0.07))
    if cape: box(mat('cp', cape), (0, 0.24 * big, z0 + 0.5 * big), (0.46 * big, 0.06, 0.78 * big), rot=(math.radians(-8), 0, 0))
    if wings:
        for sgn in (-1, 1): wing(mat('wg', wings), (sgn * 0.2 * big, 0.12, z0 + 0.85 * big), 0.75 * big, 0.5, rot=(30, 0, 0), sgn=sgn, side='x')
    hand = (-0.33 * big, -0.1, z0 + 0.46 * big)
    if weapon == 'staff': cyl(mat('wood'), (hand[0], hand[1], hand[2] + 0.25), 0.02, 1.1, verts=6); sphere(mat('g', glow or C['purple'], emit=2.5, rough=0.3), (hand[0], hand[1], hand[2] + 0.86), 0.08, outline=False)
    elif weapon == 'sword': box(mat('steel', metal=0.7, rough=0.35), (hand[0], hand[1], hand[2] + 0.3), (0.05, 0.02, 0.6)); box(trim, (hand[0], hand[1], hand[2] - 0.02), (0.16, 0.03, 0.03))
    elif weapon == 'scythe': cyl(mat('wood'), (hand[0], hand[1], hand[2] + 0.3), 0.02, 1.3, verts=6); box(mat('steel', metal=0.7, rough=0.35), (hand[0] - 0.18, hand[1], hand[2] + 0.92), (0.4, 0.02, 0.06), rot=(0, -0.3, 0))
    elif weapon == 'book': box(mat('leather', rgb=(0.3, 0.16, 0.12)), (hand[0] + 0.05, hand[1], hand[2] + 0.1), (0.16, 0.06, 0.2))
    elif weapon == 'orb': sphere(mat('g', glow or C['purple'], emit=2.5, rough=0.3), (hand[0] + 0.02, hand[1], hand[2] + 0.12), 0.09, outline=False)
    elif weapon == 'gauntlet': sphere(mat('ar', armor or C['steel'], metal=0.7, rough=0.35), (hand[0] + 0.02, hand[1], hand[2] - 0.02), 0.1)
    elif weapon == 'cannon': cyl(mat('steel', metal=0.7, rough=0.35), (hand[0], hand[1] - 0.15, hand[2] + 0.05), 0.07, 0.45, rot=(math.radians(90), 0, 0), verts=10)
    if glow and weapon not in ('staff', 'orb'): sphere(mat('g', glow, emit=2.0, rough=0.3), (0.33 * big, -0.12, z0 + 0.5 * big), 0.06, outline=False)
def shape_mage(p): humanoid(p, robe=p['body'], hat='hat', weapon='staff', glow=p.get('glow', C['teal']), hair=p.get('hair'), big=1.1)
def shape_fighter(p): humanoid(p, armor=p.get('armor', C['steel']), hat='helm', weapon=p.get('weapon', 'sword'), cape=p.get('cape'), big=p.get('big', 1.0))
def shape_statue(p):
    st = mat('st', p['body'], rough=0.9)
    box(st, (0, 0, 0.1), (0.9, 0.9, 0.2), rot=(0, 0, 0))
    humanoid(dict(body=p['body'], trim=tint(p['body'], 0.8), eye=p.get('eye', C['teal']), eyeGlow=1.5), armor=p['body'], hat='helm', weapon=p.get('weapon', 'sword'), big=p.get('big', 1.05), skin=p['body'])
    if p.get('colossus'):
        for sgn in (-1, 1): box(st, (sgn * 0.7, 0, 0.5), (0.3, 0.3, 1.0))
        for i in range(4): cone(mat('g', C['gold'], emit=1.2), (-0.3 + i * 0.2, -0.25, 1.55), 0.04, 0.2, verts=5)
def shape_clock(p):
    face, rim = mat('f', p.get('face', C['cream'])), mat('r', p['body'], metal=0.6, rough=0.4)
    cyl(rim, (0, 0, 0.75), 0.56, 0.18, rot=(math.radians(90), 0, 0), verts=28)
    cyl(face, (0, -0.1, 0.75), 0.46, 0.02, rot=(math.radians(90), 0, 0), verts=28)
    box(mat('pupil'), (0, -0.12, 0.88), (0.025, 0.01, 0.28)); box(mat('pupil'), (0.12, -0.12, 0.8), (0.24, 0.01, 0.025))
    for i in range(12): a = i * 2 * math.pi / 12; box(mat('pupil'), (0.4 * math.cos(a), -0.12, 0.75 + 0.4 * math.sin(a)), (0.03, 0.01, 0.06), rot=(0, -a, 0))
    for sgn in (-1, 1): sphere(rim, (sgn * 0.5, 0, 1.2), 0.14); cyl(rim, (sgn * 0.66, 0, 0.6), 0.04, 0.5, rot=(0, math.radians(sgn * -20), 0), verts=6)
    cyl(rim, (0, 0, 0.3), 0.3, 0.1, verts=16); cone(rim, (0, 0, 1.46), 0.1, 0.18, verts=8)
    for sgn in (-1, 1): box(mat('w', p.get('wing', C['white']), alpha=0.7, rough=0.3), (sgn * 0.75, 0.1, 0.95), (0.4, 0.03, 0.7), rot=(0, math.radians(sgn * 25), 0))
# 칠흑 보스(사람형 변주)
def shape_dusk(p): humanoid(p, robe=p['body'], hat='hood', weapon='scythe', glow=C['purple'], skin=C['black'], float_=True); sphere(mat('g', C['purple'], emit=2.0, rough=0.3, alpha=0.6), (0, 0, 0.55), 0.5, outline=False)
def shape_dunkel(p): humanoid(p, armor=p['body'], hat='helm', weapon='sword', cape=p.get('trim'), big=1.1, skin=C['dark'], wings=tint(p['body'], 0.5))
def shape_will(p): humanoid(p, robe=p['body'], hat='horns', weapon='orb', glow=C['purple'], skin=tint(p['body'], 1.4), horns=C['black']); spikes((0, 0), 0.5, 6, 0.3, mat('lg', C['black']), 0.3, tilt=10)
def shape_lucid(p): humanoid(p, robe=p['body'], hat='crown', weapon='staff', glow=C['pink'], hair=C['white'], wings=C['pink'], float_=True)
def shape_hilla(p): humanoid(p, robe=p['body'], hat='crown', weapon='staff', glow=C['red'], hair=C['red'], skin=tint(C['skin'], 0.8)); sphere(mat('g', C['red'], emit=1.5, rough=0.3), (-0.4, 0.2, 1.0), 0.09, outline=False)
def shape_swoo(p): humanoid(p, armor=p['body'], hat='hood', weapon='cannon', cape=p.get('trim'), big=1.05, skin=C['skin'], glow=C['orange'])
def shape_damien(p): humanoid(p, armor=p['body'], hat='horns', weapon='sword', cape=C['black'], skin=tint(C['skin'], 0.9), horns=C['black'], wings=C['black'], hair=C['white'])
def shape_seren(p): humanoid(p, armor=p['body'], hat='halo', weapon='sword', cape=p.get('trim'), hair=C['white'], wings=C['cream'], glow=C['gold'])
def shape_blackmage(p): humanoid(p, robe=p['body'], hat='hood', weapon='staff', glow=C['purple'], skin=C['black'], float_=True); torus(mat('g', C['purple'], emit=2.0, rough=0.3), (0, 0.1, 1.4), 0.5, 0.025, rot=(math.radians(90), 0, 0))
def shape_chest(p):
    w, g = mat('w', p['body']), mat('gold', metal=0.7, rough=0.3)
    box(w, (0, 0, 0.3), (0.9, 0.6, 0.5)); obj(bpy.ops.mesh.primitive_cylinder_add, w, loc=(0, 0, 0.56), rot=(0, math.radians(90), 0), radius=0.3, depth=0.9, vertices=16)
    for x in (-0.3, 0.3): box(g, (x, 0, 0.42), (0.06, 0.64, 0.8))
    eyes(0, -0.32, 0.45, 0.05, 0.14); mouth(0, -0.33, 0.3, 0.3, 'fang')
SHAPES = {k[6:]: v for k, v in globals().items() if k.startswith('shape_')}

# ───────── 몬스터별 팔레트(이름에서 고른 색) ─────────
M = {
    'minnow': ('snail', dict(body=C['cream'], shell=C['shell'])), 'carp': ('snail', dict(body=(0.7, 0.8, 0.95), shell=C['blue'])), 'perch': ('snail', dict(body=(0.95, 0.75, 0.7), shell=C['red'])),
    'mackerel': ('mushroom', dict(body=C['grey'], stem=C['cream'], dot=C['white'], feet=True)), 'puffer': ('mushroom', dict(body=C['orange'], feet=True)), 'barracuda': ('mushroom', dict(body=C['green'], feet=True)),
    'seahorse': ('mushroom', dict(body=C['blue'], feet=True)), 'needlefish': ('mushroom', dict(body=(0.6, 0.4, 0.3), horn=True, feet=True)), 'tidejelly': ('mushroom', dict(body=(0.45, 0.5, 0.35), stem=(0.6, 0.62, 0.5), dot=(0.3, 0.35, 0.25), zombie=True, mouth='line')),
    'aqFlower': ('mushroom', dict(body=C['pink'], stem=C['leaf'], dot=C['gold'])), 'grottoWarden': ('mushroom', dict(body=(0.55, 0.3, 0.5), stem=C['cream'], dot=C['white'], feet=True)), 'anchorWraith': ('mushroom', dict(body=(0.35, 0.4, 0.3), stem=(0.55, 0.58, 0.45), dot=(0.25, 0.3, 0.2), zombie=True, mouth='line', feet=True)),
    'ray': ('slime', dict(body=C['lime'])), 'essenceSlime': ('slime', dict(body=C['purple'])), 'kingSlime': ('slime', dict(body=C['purple'], crown=True)), 'kelpHydra': ('slime', dict(body=C['green'], crown=True)),
    'lionfish': ('pig', dict(body=C['pink'])), 'eel': ('pig', dict(body=C['pink'], ribbon=C['red'])), 'aqSeaco': ('pig', dict(body=(0.5, 0.7, 0.85))),
    'ghost': ('boar', dict(body=(0.5, 0.36, 0.26))), 'stormBarracuda': ('boar', dict(body=C['grey'], armor=True, eye=C['red'], eyeGlow=1.0)), 'emberEel': ('boar', dict(body=(0.6, 0.25, 0.15), fire=True, eye=C['fire'], eyeGlow=1.0)),
    'abyssManta': ('boar', dict(body=(0.35, 0.3, 0.4), eye=C['purple'], eyeGlow=1.0)), 'lfManticore': ('boar', dict(body=(0.7, 0.5, 0.25), mane=(0.4, 0.25, 0.1), wings=(0.4, 0.3, 0.35), tailSpike=True)),
    'angler': ('skeleton', dict(weapon='sword', helm=True)), 'lfSkelegon': ('skeleton', dict(weapon='spear', big=True, wings=True, eyeGlow=True, glow=C['teal'])),
    'shark': ('golem', dict(body=C['stone'])), 'ashRay': ('golem', dict(body=(0.22, 0.2, 0.24), glow=C['red'])), 'magmaPuffer': ('golem', dict(body=(0.4, 0.3, 0.3), mix=C['fire'], glow=C['fire'])),
    'lfBlueTurtle': ('golem', dict(body=(0.3, 0.5, 0.7), shell=C['blue'], turtle=True)), 'lfRedTurtle': ('golem', dict(body=(0.7, 0.35, 0.3), shell=C['red'], turtle=True)),
    'viper': ('eye', dict(body=C['red'], skin=(0.3, 0.2, 0.35))), 'squid': ('eye', dict(body=C['purple'], skin=(0.25, 0.2, 0.3))), 'leviathan': ('eye', dict(body=C['ice'], skin=(0.3, 0.4, 0.55), ice=True)), 'ttMonitor': ('eye', dict(body=C['teal'], screen=True)),
    'moonfish': ('monkey', dict(body=(0.5, 0.35, 0.22))), 'dragon': ('monkey', dict(body=(0.4, 0.45, 0.35), face=(0.6, 0.65, 0.5), eye=C['red'], zombie=True)),
    'cinderKoi': ('drake', dict(body=C['red'], fire=True)), 'ancient': ('drake', dict(body=(0.25, 0.2, 0.3), belly=(0.45, 0.35, 0.5), eye=C['red'])), 'lfWyvern': ('drake', dict(body=C['blue'], wing=(0.2, 0.3, 0.55))),
    'novaManta': ('drake', dict(body=(0.6, 0.5, 0.35), wing=(0.45, 0.35, 0.25))), 'ventLeviathan': ('drake', dict(body=(0.2, 0.18, 0.25), wing=(0.15, 0.12, 0.2), eye=C['purple'])),
    'eclipseMoonfish': ('ghost', dict(body=(0.75, 0.78, 0.85), glow=C['ice'], lantern=True)), 'glassSquid': ('ghost', dict(body=(0.8, 0.82, 0.9), glow=C['ice'])),
    'arErdaSpirit': ('ghost', dict(body=C['teal'], glow=(0.6, 1.0, 0.9), wisp=True)), 'arVanishSoul': ('ghost', dict(body=(0.4, 0.3, 0.5), glow=C['purple'], wisp=True)),
    'prismRay': ('octopus', dict(body=(0.85, 0.45, 0.5))), 'aqSquid': ('octopus', dict(body=(0.45, 0.6, 0.85), ring=True)),
    'voidGuppy': ('bat', dict(body=(0.25, 0.2, 0.3), wing=(0.35, 0.25, 0.4), eye=C['red'])), 'ttDodo': ('bat', dict(body=(0.5, 0.55, 0.6), wing=(0.4, 0.45, 0.5), eye=C['eyeWhite'], bird=True)),
    'ventCrab': ('crab', dict(body=(0.75, 0.3, 0.25), crown=True)),
    'blindShark': ('croc', dict(body=(0.35, 0.5, 0.4), blind=True)), 'cinderAngler': ('croc', dict(body=(0.5, 0.3, 0.2), eye=C['fire'])), 'aqShark': ('croc', dict(body=(0.4, 0.55, 0.7), belly=(0.8, 0.85, 0.9))), 'ttLyka': ('croc', dict(body=(0.55, 0.45, 0.35), eye=C['teal'])),
    'sulfurEel': ('snake', dict(body=(0.55, 0.65, 0.3), poison=C['lime'])),
    'starKoi': ('bubble', dict(body=(0.6, 0.8, 0.95))), 'arMysticErda': ('bubble', dict(body=C['teal'], core=(0.7, 1.0, 0.95))), 'arTrueErda': ('bubble', dict(body=(0.85, 0.75, 0.95), core=C['white'], wings=True)),
    'aqGuard': ('fighter', dict(body=(0.3, 0.45, 0.6), armor=(0.45, 0.6, 0.72), weapon='sword')), 'abyssSovereign': ('fighter', dict(body=(0.3, 0.3, 0.45), armor=(0.25, 0.25, 0.3), weapon='gauntlet', cape=C['red'], big=1.15)),
    'ttGuardian': ('statue', dict(body=(0.5, 0.52, 0.58))), 'arMemoryGuard': ('statue', dict(body=(0.45, 0.5, 0.6), eye=C['purple'])), 'ventColossus': ('statue', dict(body=(0.35, 0.3, 0.28), eye=C['fire'], big=1.25, colossus=True)),
    'ttChimera': ('demon', dict(body=(0.6, 0.45, 0.3), chimera=True)), 'magmaKraken': ('demon', dict(body=(0.6, 0.2, 0.2), fireTail=True)),
    'templeOracle': ('mage', dict(body=(0.7, 0.65, 0.85), glow=C['gold'], hair=(0.4, 0.3, 0.5))),
    'onyxDusk': ('dusk', dict(body=(0.2, 0.15, 0.3), trim=C['purple'], eye=C['purple'], eyeGlow=2.0)), 'onyxDunkel': ('dunkel', dict(body=(0.3, 0.32, 0.42), trim=(0.5, 0.55, 0.75), eye=C['ice'], eyeGlow=1.5)),
    'onyxWill': ('will', dict(body=(0.3, 0.2, 0.45), trim=C['purple'], eye=C['purple'], eyeGlow=1.5)), 'onyxLucid': ('lucid', dict(body=(0.85, 0.7, 0.95), trim=C['pink'], eye=C['pink'])),
    'onyxHilla': ('hilla', dict(body=(0.5, 0.15, 0.2), trim=C['gold'], eye=C['red'], eyeGlow=1.5)), 'onyxSwoo': ('swoo', dict(body=(0.35, 0.3, 0.3), trim=C['orange'], eye=C['orange'], eyeGlow=1.0)),
    'onyxDamien': ('damien', dict(body=(0.25, 0.22, 0.3), trim=C['red'], eye=C['red'], eyeGlow=1.5)), 'onyxSeren': ('seren', dict(body=(0.9, 0.85, 0.75), trim=C['gold'], eye=C['gold'])),
    'onyxBlackMage': ('blackmage', dict(body=(0.1, 0.08, 0.14), trim=C['purple'], eye=C['purple'], eyeGlow=2.5)), 'starfallSeraph': ('clock', dict(body=(0.6, 0.55, 0.7), face=C['cream'], wing=(0.8, 0.85, 0.95))),
}

# v3.393 보스 전용 모양(칠흑 보스 · 던전 보스): 낮은 카메라 · 제단 무대 · 큰 몸. SHAPES · M 을 덮어씁니다.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import bosses; bosses.install(sys.modules[__name__])

def center_and_scale():
    """물체 전체를 프레임에 맞춥니다: 바닥을 0에 두고 가로 · 세로가 1.9 안에 들어가게 줄이거나 키웁니다."""
    bpy.context.view_layer.update()
    xs, ys, zs = [], [], []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH': continue
        for v in o.bound_box:
            w = o.matrix_world @ Vector(v); xs.append(w.x); ys.append(w.y); zs.append(w.z)
    w = max(max(xs) - min(xs), max(ys) - min(ys), 0.01); h = max(zs) - min(zs)
    s = min(1.55 / w, 1.75 / h, 1.6); cx, cy, z0 = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, min(zs)
    for o in bpy.context.scene.objects:
        if o.type == 'MESH': o.location = ((o.location.x - cx) * s, (o.location.y - cy) * s, (o.location.z - z0) * s); o.scale = tuple(c * s for c in o.scale)
    bpy.context.view_layer.update()

TMP = tempfile.mkdtemp(prefix='monster-art-')
def render(name):
    png = os.path.join(TMP, name + '.png'); bpy.context.scene.render.filepath = png
    bpy.ops.render.render(write_still=True)
    from PIL import Image
    os.makedirs(OUTDIR, exist_ok=True)
    Image.open(png).save(os.path.join(OUTDIR, name + '.webp'), 'WEBP', quality=88, method=6)

def main():
    t0 = time.time(); n = 0
    for mid, (shape, p) in M.items():
        if PICK and mid not in PICK: continue
        reset_scene(); SHAPES[shape](p); center_and_scale(); ground()
        render(mid); n += 1
        print(f"{mid} ({shape}) {time.time() - t0:.0f}s", flush=True)
    print(f"{n} monsters in {time.time() - t0:.1f}s -> {OUTDIR}")
main()
