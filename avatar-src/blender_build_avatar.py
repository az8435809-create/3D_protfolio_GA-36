"""Build Ali's 3D avatar INSIDE BLENDER and export it as GLB.

How to run (Blender 3.6 – 4.x):
  1. Open Blender → Scripting workspace → Open this file → Run Script
     (or from a terminal:  blender --background --python avatar-src/blender_build_avatar.py)
  2. It creates:  "Ali_Armature" (18 bones) with two skinned meshes "Ali_Body" and "Ali_Face",
     Principled-BSDF materials (incl. a packed check texture for the suit), shape keys
     BlinkL / BlinkR / Smile / Surprised on the face, and actions Idle, Wave, Nod, Surprised, Celebrate
     stored as NLA tracks.
  3. Customise freely (sculpt the hair, tweak colours, re-pose), then re-export with
     File → Export → glTF 2.0 (.glb), Animation mode: "NLA Tracks".
     The script also exports automatically to  assets/ali-avatar-blender.glb.

The geometry, rig and animation keys come from avatar_model.py — the same description used by
make_avatar.py — so the Blender build matches the avatar on the website.
"""
import bpy, os, sys, math
from mathutils import Matrix, Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else bpy.path.abspath('//')
sys.path.insert(0, HERE)
import importlib, avatar_model as M
importlib.reload(M)

FPS = 30
C = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))          # glTF Y-up  ->  Blender Z-up
def zup(v): return C @ Vector(v)

# ---------------------------------------------------------------- clean previous build
for name in ('Ali_Body', 'Ali_Face', 'Ali_Armature'):
    ob = bpy.data.objects.get(name)
    if ob: bpy.data.objects.remove(ob, do_unlink=True)
for a in [a for a in bpy.data.actions if a.name.startswith('Ali_')]: bpy.data.actions.remove(a)
col = bpy.data.collections.get('AliAvatar') or bpy.data.collections.new('AliAvatar')
if col.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(col)
bpy.context.scene.render.fps = FPS

# ---------------------------------------------------------------- materials
img = bpy.data.images.get('suit_check') or bpy.data.images.new('suit_check', 256, 256)
px = M.check_png(256, pixels_only=True)[::-1].astype('float32') / 255.0      # Blender images start bottom-left
rgba = [0.0] * (256 * 256 * 4)
flat = px.reshape(-1, 3)
for i, (r, g, b) in enumerate(flat):
    rgba[i*4:i*4+4] = (r, g, b, 1.0)
img.pixels[:] = rgba
img.pack()

mats = {}
for name, (colr, metal, rough, tex) in M.MATS.items():
    m = bpy.data.materials.get('Ali_' + name) or bpy.data.materials.new('Ali_' + name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    lin = [c ** 2.2 for c in colr[:3]] + [1.0]
    bsdf.inputs['Base Color'].default_value = lin
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = rough
    if tex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; t.location = (-400, 200)
        nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
    mats[name] = m

# ---------------------------------------------------------------- meshes
def build_object(name, parts, targets=None):
    verts, faces, uvs, mat_idx, groups = [], [], [], [], {}
    mat_order = []
    for p in parts:
        base = len(verts)
        verts += [tuple(zup(v)) for v in p.pos]
        uvs += [tuple(u) for u in p.uv]
        if p.mat not in mat_order: mat_order.append(p.mat)
        tri = p.idx.reshape(-1, 3)
        for t in tri:
            if len({int(t[0]), int(t[1]), int(t[2])}) < 3: continue          # skip degenerate pole triangles
            faces.append((int(t[0])+base, int(t[1])+base, int(t[2])+base)); mat_idx.append(mat_order.index(p.mat))
        groups.setdefault(p.bone, []).extend(range(base, base+len(p.pos)))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    uvl = me.uv_layers.new(name='UVMap')
    for loop in me.loops: uvl.data[loop.index].uv = uvs[loop.vertex_index]
    for poly, mi in zip(me.polygons, mat_idx):
        poly.material_index = mi; poly.use_smooth = True
    for mname in mat_order: me.materials.append(mats[mname])
    ob = bpy.data.objects.new(name, me); col.objects.link(ob)
    for bone, ids in groups.items():
        vg = ob.vertex_groups.new(name=bone); vg.add(ids, 1.0, 'REPLACE')
    if targets:
        names, T = targets
        ob.shape_key_add(name='Basis', from_mix=False)
        for n in names:
            sk = ob.shape_key_add(name=n, from_mix=False)
            off = 0
            for i, p in enumerate(parts):
                d = T[n][i]
                for k in range(len(p.pos)):
                    sk.data[off+k].co = sk.data[off+k].co + zup(d[k])
                off += len(p.pos)
    # merge coincident seam/pole vertices for clean editing
    return ob

body = build_object('Ali_Body', M.body)
face = build_object('Ali_Face', M.face, M.face_targets(M.face))

# ---------------------------------------------------------------- armature
arm = bpy.data.armatures.new('Ali_Rig')
rig = bpy.data.objects.new('Ali_Armature', arm); col.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
children = {}
for name, parent, pos in M.BONES:
    if parent: children.setdefault(parent, []).append(name)
for name, parent, pos in M.BONES:
    eb = arm.edit_bones.new(name)
    eb.head = zup(pos)
    kids = children.get(name, [])
    if len(kids) == 1 and name not in ('root', 'chest'):
        eb.tail = zup(M.BW[kids[0]])
    else:
        eb.tail = eb.head + Vector((0, 0, 0.12))
    if (eb.tail - eb.head).length < 1e-3: eb.tail = eb.head + Vector((0, 0, 0.1))
    eb.roll = 0
for name, parent, pos in M.BONES:
    if parent:
        arm.edit_bones[name].parent = arm.edit_bones[parent]
        arm.edit_bones[name].use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')
for ob in (body, face):
    ob.parent = rig
    mod = ob.modifiers.new('Armature', 'ARMATURE'); mod.object = rig

# ---------------------------------------------------------------- actions (bone keys + shape-key keys) as NLA tracks
rest_q = {b.name: b.matrix_local.to_quaternion() for b in arm.bones}
def to_bone_quat(bone, q_xyzw):
    x, y, z, w = q_xyzw
    q = Quaternion((w, x, y, z))
    axis, ang = q.to_axis_angle()
    qz = Quaternion(C @ axis, ang)                       # same rotation, expressed in Z-up space
    r = rest_q[bone]
    return r.inverted() @ qz @ r
def to_bone_loc(bone, v):
    delta = Vector(v) - Vector(M.BW[bone] - (M.BW[[b for b in M.BONES if b[0] == bone][0][1]] if [b for b in M.BONES if b[0] == bone][0][1] else 0))
    return rest_q[bone].inverted() @ (C @ delta)

rig.animation_data_create()
face.data.shape_keys.animation_data_create()
start = 1
for name, dur, tracks, morph in M.ANIM_SPECS:
    act = bpy.data.actions.new('Ali_' + name); rig.animation_data.action = act
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    for bone, tr in tracks.items():
        pb = rig.pose.bones[bone]
        for t, qv in tr.get('rotation', []):
            pb.rotation_quaternion = to_bone_quat(bone, qv); pb.keyframe_insert('rotation_quaternion', frame=1 + t * FPS)
        for t, v in tr.get('translation', []):
            pb.location = to_bone_loc(bone, v); pb.keyframe_insert('location', frame=1 + t * FPS)
    track = rig.animation_data.nla_tracks.new(); track.name = name
    track.strips.new(name, 1, act)
    rig.animation_data.action = None
    if morph:
        kb = face.data.shape_keys.key_blocks
        sact = bpy.data.actions.new('Ali_' + name + '_Face'); face.data.shape_keys.animation_data.action = sact
        names = ['BlinkL', 'BlinkR', 'Smile', 'Surprised']
        for ti, keys in morph.items():
            for t, wv in keys:
                kb[names[ti]].value = wv; kb[names[ti]].keyframe_insert('value', frame=1 + t * FPS)
        ftrack = face.data.shape_keys.animation_data.nla_tracks.new(); ftrack.name = name      # same name → merged on export
        ftrack.strips.new(name, 1, sact)
        face.data.shape_keys.animation_data.action = None
for pb in rig.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)

# ---------------------------------------------------------------- export
out = os.path.normpath(os.path.join(HERE, '..', 'assets', 'ali-avatar-blender.glb'))
kw = dict(filepath=out, export_format='GLB', export_animations=True, export_skins=True, export_morph=True, export_yup=True)
try:
    bpy.ops.export_scene.gltf(**kw, export_animation_mode='NLA_TRACKS')
except TypeError:
    bpy.ops.export_scene.gltf(**kw)            # older Blender: exports NLA tracks by default
print('Ali avatar built and exported to', out)
