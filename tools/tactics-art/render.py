"""
전기(戰記) 모드 아이소메트릭 스프라이트 생성기 — 블렌더(bpy, 헤드리스).

지형 타일과 클래스별 유닛을 로우폴리로 만들고, 같은 2:1 아이소 카메라로 렌더해 public/art/tactics/ 에 PNG와 manifest.json 을 씁니다.
캔버스(components/tactics/map-canvas.tsx)는 manifest의 anchor(바닥 중심 픽셀)를 써서 칸 중심에 겹쳐 그립니다.

실행(저장소 루트):
  uv venv -p 3.13 tools/tactics-art/.venv && VIRTUAL_ENV=tools/tactics-art/.venv uv pip install bpy numpy pillow
  tools/tactics-art/.venv/bin/python -I tools/tactics-art/render.py [--only tiles|units] [--pick .,F,cls_tide_heir] [--samples 48] [--fast]

세계 단위: 칸 한 변 = 1. 카메라는 수평에서 30도 위(세로 압축 1/2 → 2:1 마름모), 방위 45도. 마름모 가로 = 128px.
빛은 왼쪽 위(태양) + 약한 환경광. 윤곽선은 Freestyle.
"""
import bpy, math, json, os, sys, time
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'art', 'tactics')
ARGS = sys.argv[1:]
ONLY = ARGS[ARGS.index('--only') + 1] if '--only' in ARGS else 'all'
SAMPLES = int(ARGS[ARGS.index('--samples') + 1]) if '--samples' in ARGS else 48
FAST = '--fast' in ARGS
PICK = ARGS[ARGS.index('--pick') + 1].split(',') if '--pick' in ARGS else None
DIAMOND_W = 192           # 마름모 가로 픽셀(캔버스는 칸 가로 tw / DIAMOND_W 배율로 그림)
FRAME_W, FRAME_H = 240, 384
WORLD_PER_PX = math.sqrt(2) / DIAMOND_W   # 마름모 가로 = 대각선 sqrt(2)

# ───────── 팔레트 ─────────
C = {
    'grass': (0.24, 0.46, 0.28), 'grass2': (0.32, 0.56, 0.32), 'soil': (0.40, 0.30, 0.19), 'water': (0.14, 0.40, 0.60), 'waterTop': (0.30, 0.60, 0.78),
    'stone': (0.36, 0.38, 0.42), 'stone2': (0.52, 0.54, 0.58), 'wood': (0.48, 0.34, 0.19), 'wood2': (0.35, 0.24, 0.12), 'roof': (0.62, 0.22, 0.17),
    'gold': (0.83, 0.68, 0.38), 'snow': (0.90, 0.92, 0.94), 'rock': (0.36, 0.31, 0.25), 'rock2': (0.50, 0.49, 0.45), 'leaf': (0.18, 0.52, 0.30), 'leaf2': (0.30, 0.68, 0.38),
    'ash': (0.12, 0.10, 0.10), 'skin': (0.86, 0.70, 0.56), 'dark': (0.18, 0.16, 0.20), 'steel': (0.62, 0.66, 0.70), 'leather': (0.52, 0.36, 0.22), 'cloth': (0.55, 0.52, 0.48),
    'player': (0.22, 0.48, 0.70), 'enemy': (0.70, 0.22, 0.22), 'ally': (0.24, 0.58, 0.28),
    'playerLight': (0.31, 0.64, 0.78), 'enemyLight': (0.83, 0.42, 0.42), 'allyLight': (0.48, 0.84, 0.48),
    'wisp': (0.45, 0.80, 1.0), 'toad': (0.30, 0.42, 0.22), 'crab': (0.55, 0.22, 0.16), 'bone': (0.78, 0.76, 0.68), 'drown': (0.20, 0.30, 0.34), 'fire': (0.95, 0.45, 0.20), 'wind': (0.55, 0.85, 0.75), 'light': (1.0, 0.95, 0.75), 'darkMagic': (0.45, 0.30, 0.70),
}
_mats = {}
def mat(name, rgb=None, rough=0.85, emit=0.0, metal=0.0):
    key = (name, emit)
    if key in _mats: return _mats[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    r, g, b = rgb or C[name]
    bsdf.inputs['Base Color'].default_value = (r, g, b, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emit: bsdf.inputs['Emission Color'].default_value = (r, g, b, 1); bsdf.inputs['Emission Strength'].default_value = emit
    _mats[key] = m
    return m

# ───────── 장면 ─────────
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mats.clear(); _outline.clear()
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 8 if FAST else SAMPLES; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = not FAST
    sc.render.resolution_x = FRAME_W; sc.render.resolution_y = FRAME_H; sc.render.resolution_percentage = 100
    sc.render.film_transparent = True; sc.render.image_settings.color_mode = 'RGBA'; sc.render.image_settings.compression = 60
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -0.3
    # 카메라: 방위 45°, 고도 30°(2:1), 직교. 프레임 가로가 ortho_scale 세계 단위.
    cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'; cam_data.ortho_scale = max(FRAME_W, FRAME_H) * WORLD_PER_PX
    cam = bpy.data.objects.new('cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam
    dist = 20.0; elev = math.radians(30)
    cam.location = (dist * math.cos(elev) * math.cos(math.radians(45)), -dist * math.cos(elev) * math.sin(math.radians(45)), dist * math.sin(elev))
    target = bpy.data.objects.new('target', None); sc.collection.objects.link(target); target.location = (0, 0, 0.62)   # 바닥 중심을 프레임 아래쪽에
    con = cam.constraints.new('TRACK_TO'); con.target = target; con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
    # 빛: 태양(왼쪽 위) + 환경광
    sun_data = bpy.data.lights.new('sun', 'SUN'); sun_data.energy = 4.0; sun_data.color = (1.0, 0.96, 0.88); sun_data.angle = math.radians(6)
    sun = bpy.data.objects.new('sun', sun_data); sc.collection.objects.link(sun); sun.rotation_euler = (math.radians(42), math.radians(18), math.radians(-70))
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.80, 0.84, 0.90, 1); bg.inputs[1].default_value = 0.6
    return sc

def anchor_px():
    """세계 원점(칸 바닥 중심)의 프레임 픽셀 좌표."""
    from bpy_extras.object_utils import world_to_camera_view
    sc = bpy.context.scene; bpy.context.view_layer.update()
    co = world_to_camera_view(sc, sc.camera, Vector((0, 0, 0)))
    return round(co.x * FRAME_W, 2), round((1 - co.y) * FRAME_H, 2)

# ───────── 기본 도형 ─────────
_outline = {}
def outline_mat():
    if 'm' in _outline: return _outline['m']
    m = bpy.data.materials.new('outline'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader'); geo = nt.nodes.new('ShaderNodeNewGeometry'); lp = nt.nodes.new('ShaderNodeLightPath')
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs[0].default_value = (0.02, 0.03, 0.04, 1); em.inputs[1].default_value = 1.0
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    # 카메라 광선이 껍질 안쪽(먼 쪽)을 볼 때만 검정. 그림자 · 반사 광선과 가까운 쪽은 투명.
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
    nt.links.new(geo.outputs['Backfacing'], inv.inputs[1]); nt.links.new(lp.outputs['Is Camera Ray'], mul.inputs[0]); nt.links.new(inv.outputs[0], mul.inputs[1])
    nt.links.new(mul.outputs[0], mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs[0])
    _outline['m'] = m
    return m
OUTLINE = 0.016
def obj(mesh_op, material, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), smooth=False, outline=True, **kw):
    mesh_op(location=loc, rotation=rot, **kw)
    o = bpy.context.object; o.scale = scale
    if material is not None: o.data.materials.append(material)
    if smooth: bpy.ops.object.shade_smooth()
    if outline and OUTLINE > 0:
        o.data.materials.append(outline_mat())
        md = o.modifiers.new('outline', 'SOLIDIFY'); md.thickness = -OUTLINE / max(scale); md.use_flip_normals = True; md.material_offset = 1; md.use_rim = False; md.offset = 1.0
    return o
def box(material, loc, size, rot=(0, 0, 0)):
    return obj(bpy.ops.mesh.primitive_cube_add, material, loc=loc, rot=rot, scale=(size[0] / 2, size[1] / 2, size[2] / 2), size=2)
def cyl(material, loc, r, h, rot=(0, 0, 0), verts=12, smooth=True):
    return obj(bpy.ops.mesh.primitive_cylinder_add, material, loc=loc, rot=rot, smooth=smooth, radius=r, depth=h, vertices=verts)
def cone(material, loc, r, h, rot=(0, 0, 0), verts=12, r2=0.0):
    return obj(bpy.ops.mesh.primitive_cone_add, material, loc=loc, rot=rot, smooth=True, radius1=r, radius2=r2, depth=h, vertices=verts)
def sphere(material, loc, r, scale=(1, 1, 1)):
    return obj(bpy.ops.mesh.primitive_uv_sphere_add, material, loc=loc, scale=(r * scale[0], r * scale[1], r * scale[2]), smooth=True, segments=16, ring_count=10, radius=1)

# ───────── 지형 ─────────
def slab(material, top=0.0, bottom=-0.5, inset=0.0):
    s = 1 - inset
    return box(material, (0, 0, (top + bottom) / 2), (s, s, top - bottom))
def grass(top=0.0):
    slab(mat('soil'), top - 0.06, -0.5); slab(mat('grass'), top, top - 0.06)
    for i, (x, y) in enumerate([(-0.25, 0.2), (0.3, -0.1), (0.05, -0.35), (-0.3, -0.3), (0.25, 0.3)]):
        box(mat('grass2'), (x, y, top + 0.015), (0.14, 0.14, 0.03), rot=(0, 0, 0.4 * i))
def tree(x, y, s=1.0, z=0.0):
    cyl(mat('wood2'), (x, y, z + 0.14 * s), 0.05 * s, 0.28 * s, verts=8)
    sphere(mat('leaf'), (x, y, z + 0.42 * s), 0.21 * s, scale=(1, 1, 1.15))
    sphere(mat('leaf2'), (x - 0.07 * s, y + 0.05 * s, z + 0.52 * s), 0.12 * s)
def build_tile(ch, variant=''):
    if ch == '.': grass()
    elif ch == 'F': grass(); tree(-0.22, 0.18, 0.95); tree(0.24, -0.05, 1.05); tree(-0.02, -0.3, 0.8)
    elif ch in 'M^':
        grass(); h = 1.3 if ch == '^' else 0.9
        cone(mat('rock'), (0, 0, h / 2), 0.55, h, verts=7); cone(mat('snow'), (0, 0, h - 0.17), 0.21 if ch == '^' else 0.17, 0.36, verts=7)
        box(mat('rock2'), (0.22, -0.2, 0.08), (0.16, 0.14, 0.16), rot=(0.3, 0.2, 0.5))
    elif ch == '~': slab(mat('soil'), -0.3, -0.5); slab(mat('water'), -0.18, -0.3); box(mat('waterTop'), (0.1, -0.1, -0.175), (0.4, 0.12, 0.01), rot=(0, 0, 0.6)); box(mat('waterTop'), (-0.2, 0.2, -0.175), (0.3, 0.1, 0.01), rot=(0, 0, 0.3))
    elif ch == '=':
        slab(mat('soil'), -0.3, -0.5); slab(mat('water'), -0.18, -0.3)
        along_y = variant == 'v'
        box(mat('wood'), (0, 0, 0.0), (0.7, 1.0, 0.07) if along_y else (1.0, 0.7, 0.07))
        for i in range(-2, 3):
            if along_y: box(mat('wood2'), (0, i * 0.2, 0.04), (0.7, 0.03, 0.02))
            else: box(mat('wood2'), (i * 0.2, 0, 0.04), (0.03, 0.7, 0.02))
        for sgn in (-1, 1):
            if along_y: box(mat('wood2'), (sgn * 0.33, 0, 0.12), (0.05, 1.0, 0.05))
            else: box(mat('wood2'), (0, sgn * 0.33, 0.12), (1.0, 0.05, 0.05))
    elif ch in '#D':
        slab(mat('stone'), 0.8, -0.5)
        for z in (0.2, 0.45, 0.7):
            for (x, y) in ((0.5, -0.25), (0.5, 0.25), (-0.25, -0.5), (0.25, -0.5)):
                box(mat('stone2'), (x, y, z), (0.02, 0.3, 0.08) if abs(x) == 0.5 else (0.3, 0.02, 0.08))
        if ch == 'D':
            box(mat('wood2'), (0.0, -0.505, 0.3), (0.42, 0.02, 0.6)); box(mat('wood'), (0, -0.515, 0.3), (0.34, 0.01, 0.52)); sphere(mat('gold'), (0.1, -0.525, 0.3), 0.03)
    elif ch == 'T':
        slab(mat('stone2'), 0.12, -0.5); box(mat('roof'), (0, 0, 0.14), (0.9, 0.5, 0.02))
        box(mat('wood2'), (0.05, 0.08, 0.3), (0.36, 0.34, 0.36)); box(mat('roof'), (0.05, 0.08, 0.5), (0.32, 0.3, 0.05))
        box(mat('wood2'), (0.05, 0.24, 0.72), (0.36, 0.06, 0.5)); box(mat('gold', metal=0.8, rough=0.3), (0.05, 0.24, 1.0), (0.4, 0.07, 0.08))
        for sgn in (-1, 1): box(mat('gold', metal=0.8, rough=0.3), (0.05 + sgn * 0.19, 0.0, 0.42), (0.04, 0.3, 0.12))
    elif ch == 'S':
        slab(mat('stone'), 0.45, -0.5)
        for (x, y) in ((-0.38, -0.38), (0.38, -0.38), (-0.38, 0.38), (0.38, 0.38)): box(mat('stone2'), (x, y, 0.55), (0.2, 0.2, 0.2))
        box(mat('stone2'), (0, 0, 0.46), (0.5, 0.5, 0.02))
    elif ch == 'H':
        grass(); box(mat('wood'), (0, 0.02, 0.26), (0.62, 0.56, 0.52))
        obj(bpy.ops.mesh.primitive_cone_add, mat('roof'), loc=(0, 0.02, 0.66), rot=(0, 0, math.radians(45)), scale=(0.52, 0.48, 1), radius1=1, radius2=0.0, depth=0.5, vertices=4)
        box(mat('wood2'), (0.1, -0.265, 0.13), (0.14, 0.02, 0.26)); box(mat('light', emit=1.5), (-0.17, -0.265, 0.3), (0.1, 0.02, 0.1))
    elif ch == 'R':
        grass(0.05); cyl(mat('stone2'), (-0.22, 0.1, 0.3), 0.08, 0.6, verts=8, smooth=False); cyl(mat('stone2'), (0.22, -0.18, 0.18), 0.08, 0.36, verts=8, smooth=False)
        box(mat('stone'), (0.05, 0.22, 0.09), (0.45, 0.12, 0.08), rot=(0, 0, 0.3)); box(mat('stone2'), (0.2, 0.15, 0.1), (0.14, 0.14, 0.14), rot=(0.2, 0.3, 0.4))
    elif ch == 'C':
        grass(); box(mat('wood'), (0, 0, 0.16), (0.42, 0.3, 0.3)); box(mat('wood2'), (0, 0, 0.17), (0.44, 0.32, 0.05)); box(mat('gold'), (0, -0.16, 0.2), (0.08, 0.02, 0.1))
        for x in (-0.15, 0.15): box(mat('steel', metal=0.6), (x, 0, 0.16), (0.03, 0.32, 0.32))
    elif ch == 'X':
        slab(mat('soil'), -0.04, -0.5); slab(mat('ash'), 0.04, -0.04); box(mat('ash'), (0.1, 0.05, 0.16), (0.4, 0.3, 0.24), rot=(0, 0.2, 0.1)); cyl(mat('ash'), (-0.25, -0.1, 0.25), 0.05, 0.5, rot=(0.3, 0, 0), verts=6)
        for (x, y) in ((0.28, -0.22), (-0.12, 0.3), (0.05, -0.05)): sphere(mat('fire', emit=2.5), (x, y, 0.06), 0.035)

# ───────── 유닛 ─────────
SIDES = {'player': ('player', 'playerLight'), 'enemy': ('enemy', 'enemyLight'), 'ally': ('ally', 'allyLight')}
# 클래스별 모양. body: human · cavalry · flying · toad · wisp · crab · king. weapon: sword · lance · axe · bow · tome · staff · dagger · claw · none. hat: none · helm · hood · wizard · crown · bandana · horns
UNITS = {
    'cls_tide_heir': dict(body='human', weapon='sword', hat='none', cape=True),
    'cls_tide_lord': dict(body='human', weapon='sword', hat='crown', cape=True, armor=True),
    'cls_shore_blade': dict(body='human', weapon='sword', hat='bandana'),
    'cls_tide_warden': dict(body='human', weapon='sword', hat='helm', armor=True),
    'cls_dune_lancer': dict(body='cavalry', weapon='lance', hat='none'),
    'cls_storm_rider': dict(body='cavalry', weapon='lance', hat='helm', armor=True, cape=True),
    'cls_reef_axe': dict(body='human', weapon='axe', hat='none', broad=True),
    'cls_wave_breaker': dict(body='human', weapon='axe', hat='helm', broad=True, armor=True),
    'cls_gull_archer': dict(body='human', weapon='bow', hat='hood'),
    'cls_cliff_sniper': dict(body='human', weapon='bow', hat='hood', cape=True),
    'cls_ember_scribe': dict(body='human', weapon='tome', hat='none', robe=True, glow='fire'),
    'cls_ash_sage': dict(body='human', weapon='tome', hat='wizard', robe=True, glow='fire'),
    'cls_gale_adept': dict(body='human', weapon='tome', hat='none', robe=True, glow='wind'),
    'cls_sky_caller': dict(body='human', weapon='tome', hat='wizard', robe=True, glow='light'),
    'cls_moss_cleric': dict(body='human', weapon='staff', hat='hood', robe=True),
    'cls_spring_keeper': dict(body='human', weapon='staff', hat='hood', robe=True, glow='light'),
    'cls_shell_guard': dict(body='human', weapon='lance', hat='helm', armor=True, broad=True, shield=True),
    'cls_bastion_crab': dict(body='human', weapon='axe', hat='helm', armor=True, broad=True, shield=True),
    'cls_salt_thief': dict(body='human', weapon='dagger', hat='hood'),
    'cls_mist_stalker': dict(body='human', weapon='dagger', hat='hood', cape=True),
    'cls_kite_rider': dict(body='flying', weapon='lance', hat='none'),
    'cls_tempest_wing': dict(body='flying', weapon='sword', hat='helm', armor=True),
    'cls_reef_brute': dict(body='human', weapon='axe', hat='horns', armor=True, broad=True),
    'cls_corsair': dict(body='human', weapon='axe', hat='bandana'),
    'cls_pirate_captain': dict(body='human', weapon='sword', hat='bandana', cape=True),
    'cls_mire_toad': dict(body='toad', weapon='none', hat='none'),
    'cls_bog_wisp': dict(body='wisp', weapon='none', hat='none'),
    'cls_spine_crab': dict(body='crab', weapon='none', hat='none'),
    'cls_drowned_knight': dict(body='cavalry', weapon='lance', hat='helm', armor=True, drowned=True),
    'cls_drowned_king': dict(body='king', weapon='lance', hat='crown', cape=True, drowned=True),
}
def weapon_mesh(kind, hand, side_mats):
    x, y, z = hand
    if kind == 'sword': box(mat('steel', metal=0.7, rough=0.35), (x, y, z + 0.22), (0.05, 0.02, 0.44)); box(mat('gold'), (x, y, z - 0.01), (0.14, 0.03, 0.03))
    elif kind == 'lance': cyl(mat('wood2'), (x, y, z + 0.2), 0.018, 1.0, verts=6); cone(mat('steel', metal=0.7, rough=0.35), (x, y, z + 0.78), 0.05, 0.18, verts=6)
    elif kind == 'axe': cyl(mat('wood2'), (x, y, z + 0.15), 0.02, 0.6, verts=6); box(mat('steel', metal=0.7, rough=0.35), (x + 0.08, y, z + 0.34), (0.16, 0.03, 0.2))
    elif kind == 'bow': obj(bpy.ops.mesh.primitive_torus_add, mat('wood2'), loc=(x + 0.05, y + 0.1, z + 0.12), rot=(0, math.radians(90), 0), major_radius=0.26, minor_radius=0.018, major_segments=16, minor_segments=6)
    elif kind == 'tome': box(mat('leather'), (x, y, z + 0.05), (0.16, 0.06, 0.2)); box(mat('bone'), (x, y - 0.035, z + 0.05), (0.13, 0.01, 0.17))
    elif kind == 'staff': cyl(mat('wood2'), (x, y, z + 0.25), 0.02, 0.9, verts=6); sphere(mat('light', emit=2.0), (x, y, z + 0.74), 0.06)
    elif kind == 'dagger': box(mat('steel', metal=0.7, rough=0.35), (x, y, z + 0.1), (0.035, 0.015, 0.22))
def finish_unit(scale=1.1):
    import mathutils
    bpy.context.view_layer.update()   # 방금 만든 물체의 matrix_world가 늦게 갱신되므로
    rz = mathutils.Matrix.Rotation(math.radians(-45), 4, 'Z') @ mathutils.Matrix.Scale(scale, 4)
    for o in list(bpy.context.scene.objects):
        if o.type == 'MESH': o.matrix_world = rz @ o.matrix_world
    bpy.ops.mesh.primitive_plane_add(size=1.6, location=(0, 0, 0)); ground = bpy.context.object; ground.is_shadow_catcher = True
    ground.data.materials.append(mat('groundShadow', rgb=(0.5, 0.5, 0.5)))
def build_unit(spec, side):
    _build_unit(spec, side); finish_unit()
def _build_unit(spec, side):
    team, team_light = SIDES[side]
    cloth = mat(team); trim = mat(team_light)
    skin = mat('drown') if spec.get('drowned') else mat('skin')
    body = spec['body']
    z0 = 0.0
    if body == 'cavalry':
        # 말: 몸통 · 목 · 머리 · 다리
        horse = mat('leather')   # 몸통은 y축 방향(카메라 기준 옆모습, 머리가 오른쪽)
        sphere(horse, (0, 0, 0.46), 0.24, scale=(0.9, 1.7, 0.85))
        for (x, y) in ((-0.11, -0.28), (0.11, -0.28), (-0.11, 0.28), (0.11, 0.28)): cyl(horse, (x, y, 0.18), 0.05, 0.36, verts=6)
        cyl(horse, (0, 0.42, 0.68), 0.085, 0.4, rot=(math.radians(35), 0, 0), verts=8); sphere(horse, (0, 0.56, 0.86), 0.11, scale=(0.8, 1.5, 0.8))
        for sgn in (-1, 1): cone(horse, (sgn * 0.07, 0.5, 0.98), 0.03, 0.1, verts=5)
        box(mat('dark'), (0, -0.4, 0.5), (0.08, 0.1, 0.4), rot=(math.radians(-20), 0, 0))   # 꼬리
        box(trim, (0, 0, 0.66), (0.34, 0.52, 0.05))
        z0 = 0.6
    elif body == 'flying':
        # 큰 바닷새 + 날개
        sphere(mat('bone'), (0, 0, 0.55), 0.2, scale=(1.5, 0.9, 0.7)); sphere(mat('bone'), (0.33, 0, 0.66), 0.09, scale=(1.5, 0.8, 0.8)); cone(mat('gold'), (0.48, 0, 0.66), 0.03, 0.12, rot=(0, math.radians(90), 0), verts=6)
        for sgn in (-1, 1): box(mat('bone'), (0, sgn * 0.42, 0.66), (0.5, 0.55, 0.03), rot=(math.radians(sgn * 20), 0, 0))
        z0 = 0.72
    elif body == 'toad':
        sphere(mat('toad'), (0, 0, 0.26), 0.3, scale=(1.3, 1.1, 0.85)); sphere(mat('toad'), (0.25, 0, 0.42), 0.17, scale=(1.1, 1.0, 0.8))
        for sgn in (-1, 1): sphere(mat('light', emit=1.0), (0.36, sgn * 0.1, 0.52), 0.045); sphere(mat('dark'), (0.39, sgn * 0.1, 0.52), 0.02)
        for sgn in (-1, 1): sphere(mat('toad'), (-0.15, sgn * 0.3, 0.14), 0.12, scale=(1.2, 0.8, 0.6))
        return
    elif body == 'wisp':
        sphere(mat('wispCore', rgb=(0.20, 0.55, 0.85), emit=1.2, rough=0.3), (0, 0, 0.6), 0.2); sphere(mat('wisp', emit=0.8, rough=0.3), (-0.05, 0.03, 0.9), 0.1); sphere(mat('wisp', emit=0.8, rough=0.3), (0.08, -0.05, 0.35), 0.07)
        for sgn in (-1, 1): sphere(mat('dark'), (0.15, sgn * 0.07, 0.63), 0.03)
        return
    elif body == 'crab':
        sphere(mat('crab'), (0, 0, 0.22), 0.3, scale=(1.3, 1.1, 0.6))
        for i in range(5): cone(mat('bone'), (-0.15 + i * 0.08, 0.0, 0.42), 0.03, 0.14, verts=5)
        for sgn in (-1, 1):
            for j in range(3): cyl(mat('crab'), (-0.1 + j * 0.15, sgn * 0.36, 0.1), 0.025, 0.2, rot=(math.radians(sgn * 40), 0, 0), verts=6)
            box(mat('crab'), (0.35, sgn * 0.22, 0.22), (0.22, 0.12, 0.14)); box(mat('crab'), (0.47, sgn * 0.22, 0.3), (0.12, 0.05, 0.1))
        return
    # 사람형 (king은 크고 망토)
    big = 1.25 if body == 'king' else 1.0
    broad = 1.18 if spec.get('broad') else 1.0
    robe = spec.get('robe')
    # 다리
    for sgn in (-1, 1): cyl(mat('dark') if not spec.get('drowned') else mat('drown'), (0, sgn * 0.09 * broad, z0 + 0.14 * big), 0.055 * broad, 0.28 * big, verts=8)
    # 몸통
    if robe: cone(cloth, (0, 0, z0 + 0.36 * big), 0.26 * big, 0.5 * big, verts=10, r2=0.13 * big)
    else: cyl(cloth, (0, 0, z0 + 0.45 * big), 0.17 * broad * big, 0.36 * big, verts=10)
    if spec.get('armor'): cyl(mat('steel', metal=0.6, rough=0.4), (0, 0, z0 + 0.5 * big), 0.19 * broad * big, 0.2 * big, verts=10); box(trim, (0, 0, z0 + 0.62 * big), (0.42 * broad * big, 0.1, 0.05))
    else: box(trim, (0, 0, z0 + 0.30 * big), (0.36 * broad * big, 0.38 * broad * big, 0.06))   # 허리띠
    # 팔
    for sgn in (-1, 1): cyl(skin if not spec.get('armor') else mat('steel', metal=0.6, rough=0.4), (0.04, sgn * 0.21 * broad * big, z0 + 0.46 * big), 0.045 * big, 0.3 * big, rot=(math.radians(sgn * 12), math.radians(-10), 0), verts=6)
    # 머리
    head_z = z0 + 0.78 * big
    sphere(skin, (0, 0, head_z), 0.15 * big)
    for sgn in (-1, 1): sphere(mat('dark'), (0.13 * big, sgn * 0.06 * big, head_z + 0.02), 0.022)
    hat = spec.get('hat', 'none')
    if hat == 'helm': sphere(mat('steel', metal=0.6, rough=0.4), (0, 0, head_z + 0.03), 0.165 * big, scale=(1, 1, 0.8)); box(mat('steel', metal=0.6, rough=0.4), (0.1, 0, head_z - 0.02), (0.14, 0.26, 0.08))
    elif hat == 'hood': sphere(cloth, (-0.03, 0, head_z + 0.04), 0.17 * big, scale=(1, 1, 0.9)); cone(cloth, (-0.08, 0, head_z + 0.2), 0.12, 0.2, verts=8)
    elif hat == 'wizard': cone(cloth, (0, 0, head_z + 0.3 * big), 0.2 * big, 0.45 * big, verts=10); cyl(cloth, (0, 0, head_z + 0.1 * big), 0.26 * big, 0.03, verts=12)
    elif hat == 'crown':
        cyl(mat('gold', metal=0.8, rough=0.3), (0, 0, head_z + 0.14 * big), 0.12 * big, 0.08, verts=8, smooth=False)
        for i in range(5): a = i * 2 * math.pi / 5; cone(mat('gold', metal=0.8, rough=0.3), (0.12 * big * math.cos(a), 0.12 * big * math.sin(a), head_z + 0.24 * big), 0.03, 0.12, verts=4)
    elif hat == 'bandana': sphere(trim, (0, 0, head_z + 0.05), 0.16 * big, scale=(1, 1, 0.55)); box(trim, (-0.12, 0.08, head_z - 0.02), (0.06, 0.16, 0.04), rot=(0.4, 0, 0.3))
    elif hat == 'horns':
        for sgn in (-1, 1): cone(mat('bone'), (0, sgn * 0.14 * big, head_z + 0.14), 0.04, 0.2, rot=(math.radians(sgn * -35), 0, 0), verts=6)
    if spec.get('cape'): box(cloth, (-0.2 * big, 0, z0 + 0.42 * big), (0.06, 0.34 * big, 0.62 * big), rot=(0, math.radians(8), 0))
    if spec.get('shield'): box(mat('steel', metal=0.6, rough=0.4), (0.0, -0.3 * big, z0 + 0.45 * big), (0.26, 0.04, 0.34)); box(trim, (0.0, -0.325 * big, z0 + 0.45 * big), (0.12, 0.01, 0.18))
    glow = spec.get('glow')
    if glow: sphere(mat(glow, emit=3.0, rough=0.3), (0.2, 0.28 * big, z0 + 0.5 * big), 0.07)
    weapon_mesh(spec.get('weapon', 'none'), (0.12, 0.3 * big, z0 + 0.36 * big), (cloth, trim))

# ───────── 렌더 ─────────
import tempfile
TMP = tempfile.mkdtemp(prefix='tactics-art-')
def render(name):
    """PNG로 렌더한 뒤 webp(무손실 알파 · 품질 92)로 public에 저장. 파일 이름(확장자 없이)을 돌려줍니다."""
    png = os.path.join(TMP, name + '.png')
    bpy.context.scene.render.filepath = png
    bpy.ops.render.render(write_still=True)
    from PIL import Image
    Image.open(png).save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=92, method=6)
    return name + '.webp'

def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = {'frame': [FRAME_W, FRAME_H], 'diamond': DIAMOND_W, 'tiles': {}, 'units': {}, 'anchor': None}
    t0 = time.time(); n = 0
    tiles = [('.', ''), ('F', ''), ('M', ''), ('^', ''), ('~', ''), ('=', 'h'), ('=', 'v'), ('#', ''), ('D', ''), ('T', ''), ('S', ''), ('H', ''), ('R', ''), ('C', ''), ('X', '')]
    names = {'.': 'plain', 'F': 'forest', 'M': 'mountain', '^': 'peak', '~': 'water', '=': 'bridge', '#': 'wall', 'D': 'door', 'T': 'throne', 'S': 'fort', 'H': 'village', 'R': 'ruin', 'C': 'chest', 'X': 'burnt'}
    if ONLY in ('all', 'tiles'):
        for ch, variant in tiles:
            if PICK and ch not in PICK: continue
            reset_scene(); build_tile(ch, variant)
            manifest['anchor'] = anchor_px()
            name = render(f"tile_{names[ch]}{('_' + variant) if variant else ''}"); n += 1
            manifest['tiles'][ch + variant] = name
            print(f"tile {ch}{variant} -> {name}", flush=True)
    if ONLY in ('all', 'units'):
        for cls, spec in UNITS.items():
            for side in SIDES:
                if cls in ('cls_tide_heir', 'cls_tide_lord') and side != 'player': continue
                if PICK and cls not in PICK: continue
                reset_scene(); build_unit(spec, side)
                manifest['anchor'] = anchor_px()
                name = render(f"unit_{cls[4:]}_{side}"); n += 1
                manifest['units'][f"{cls}:{side}"] = name
                print(f"unit {cls} {side} -> {name}", flush=True)
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f: json.dump(manifest, f, ensure_ascii=False, indent=1)
    print(f"{n} sprites in {time.time() - t0:.1f}s -> {OUT}")

main()
