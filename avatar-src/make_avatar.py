"""Builds assets/ali-avatar.glb: a stylized, rigged, animated 3D version of Ali's mascot.
Run:  python3 avatar-src/make_avatar.py
- Modeling: superellipsoids + lathed capsules (chibi proportions from the 2D mascot)
- Materials: PBR (baseColor/metallic/roughness), procedural brown check texture for the suit
- Rig: 18-bone armature with a glTF skin (JOINTS_0/WEIGHTS_0)
- Expressions: morph targets BlinkL, BlinkR, Smile, Surprised on the Face mesh
- Animations: Idle, Wave, Nod, Surprised, Celebrate
The same character can be rebuilt inside Blender with avatar-src/blender_build_avatar.py."""
import json, struct, io, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from avatar_model import *

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'ali-avatar.glb')

# ---------------------------------------------------------------- glTF writer
bin_ = io.BytesIO(); views, accs = [], []
def add_view(data, target=None):
    while bin_.tell() % 4: bin_.write(b'\0')
    off = bin_.tell(); bin_.write(data)
    v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
    if target: v['target'] = target
    views.append(v); return len(views)-1
def add_acc(arr, ctype, typ, target=None, minmax=False, normalized=False):
    arr = np.ascontiguousarray(arr)
    vi = add_view(arr.tobytes(), target)
    a = {'bufferView': vi, 'componentType': ctype, 'count': int(arr.shape[0]), 'type': typ}
    if normalized: a['normalized'] = True
    if minmax:
        mn = arr.reshape(arr.shape[0], -1).min(0); mx = arr.reshape(arr.shape[0], -1).max(0)
        a['min'] = [float(v) for v in mn]; a['max'] = [float(v) for v in mx]
    accs.append(a); return len(accs)-1

mat_names = list(MATS)
gl_mats = []
for n in mat_names:
    col, met, rough, tex = MATS[n]
    col = [round(c**2.2, 4) for c in col[:3]] + [col[3]]   # authored as sRGB, stored linear per glTF spec
    m = {'name': n, 'pbrMetallicRoughness': {'baseColorFactor': col, 'metallicFactor': met, 'roughnessFactor': rough}}
    if tex: m['pbrMetallicRoughness']['baseColorTexture'] = {'index': 0}
    gl_mats.append(m)

def build_mesh(parts, name, targets=None):
    prims = []
    by_mat = {}
    for i, pt in enumerate(parts): by_mat.setdefault(pt.mat, []).append(i)
    tnames = None
    if targets: tnames, T = targets
    for m, ids in by_mat.items():
        P, N, U, J, W, I, TT = [], [], [], [], [], [], {k: [] for k in (tnames or [])}
        base = 0
        for i in ids:
            pt = parts[i]; n = len(pt.pos)
            P.append(pt.pos); N.append(smooth_normals(pt.pos, pt.idx)); U.append(pt.uv)
            J.append(np.tile([BI[pt.bone], 0, 0, 0], (n, 1))); W.append(np.tile([1., 0, 0, 0], (n, 1)))
            I.append(pt.idx+base); base += n
            for k in TT: TT[k].append(T[k][i])
        P = np.concatenate(P).astype(np.float32); attrs = {
            'POSITION': add_acc(P, 5126, 'VEC3', 34962, True),
            'NORMAL': add_acc(np.concatenate(N).astype(np.float32), 5126, 'VEC3', 34962),
            'TEXCOORD_0': add_acc(np.concatenate(U).astype(np.float32), 5126, 'VEC2', 34962),
            'JOINTS_0': add_acc(np.concatenate(J).astype(np.uint8), 5121, 'VEC4', 34962),
            'WEIGHTS_0': add_acc((np.concatenate(W)*255).astype(np.uint8), 5121, 'VEC4', 34962, normalized=True)}
        idx = np.concatenate(I); assert idx.max() < 65535
        prim = {'attributes': attrs, 'indices': add_acc(idx.astype(np.uint16), 5123, 'SCALAR', 34963), 'material': mat_names.index(m), 'mode': 4}
        if tnames:
            prim['targets'] = [{'POSITION': add_acc(np.concatenate(TT[k]).astype(np.float32), 5126, 'VEC3', 34962, True)} for k in tnames]
        prims.append(prim)
    mesh = {'name': name, 'primitives': prims}
    if tnames: mesh['weights'] = [0]*len(tnames); mesh['extras'] = {'targetNames': tnames}
    return mesh

meshes = [build_mesh(body, 'Body'), build_mesh(face, 'Face', face_targets(face))]

# nodes: 0..len(BONES)-1 joints, then armature root holder, then 2 mesh nodes
nodes = []
for name, parent, pos in BONES:
    local = np.array(pos) - (BW[parent] if parent else 0)
    nodes.append({'name': name, 'translation': [float(v) for v in local]})
for i, (name, parent, _) in enumerate(BONES):
    if parent:
        nodes[BI[parent]].setdefault('children', []).append(i)
arm_node = len(nodes); nodes.append({'name': 'Armature', 'children': [BI['root']]})
nodes.append({'name': 'AliBody', 'mesh': 0, 'skin': 0}); nodes.append({'name': 'AliFace', 'mesh': 1, 'skin': 0})
ibm = np.zeros((len(BONES), 16), np.float32)
for i, b in enumerate(BONES):
    M = np.eye(4); M[:3, 3] = -BW[b[0]]; ibm[i] = M.T.reshape(-1)    # column-major
skin = {'name': 'AliRig', 'joints': list(range(len(BONES))), 'skeleton': BI['root'], 'inverseBindMatrices': add_acc(ibm, 5126, 'MAT4')}

anims = []
for name, dur, tracks, morph in ANIM_SPECS:
    ch, sm = [], []
    for bone, tr in tracks.items():
        for path, keys in tr.items():
            t = np.array([k[0] for k in keys], np.float32); v = np.array([k[1] for k in keys], np.float32)
            sm.append({'input': add_acc(t, 5126, 'SCALAR', minmax=True), 'output': add_acc(v, 5126, 'VEC4' if path == 'rotation' else 'VEC3'), 'interpolation': 'LINEAR'})
            ch.append({'sampler': len(sm)-1, 'target': {'node': BI[bone], 'path': path}})
    if morph:
        times = sorted({k[0] for keys in morph.values() for k in keys})
        out = []
        for t in times:
            for ti in range(4):
                keys = morph.get(ti, [(0, 0), (dur, 0)])
                out.append(float(np.interp(t, [k[0] for k in keys], [k[1] for k in keys])))
        sm.append({'input': add_acc(np.array(times, np.float32), 5126, 'SCALAR', minmax=True), 'output': add_acc(np.array(out, np.float32), 5126, 'SCALAR'), 'interpolation': 'LINEAR'})
        ch.append({'sampler': len(sm)-1, 'target': {'node': arm_node+2, 'path': 'weights'}})
    anims.append({'name': name, 'channels': ch, 'samplers': sm})

# ---------------------------------------------------------------- assemble GLB
png = check_png()
img_view = add_view(png)
gltf = {
    'asset': {'version': '2.0', 'generator': 'make_avatar.py (Ali Zain portfolio)', 'copyright': 'Ali Zain'},
    'scene': 0, 'scenes': [{'name': 'AliAvatar', 'nodes': [arm_node, arm_node+1, arm_node+2]}],
    'nodes': nodes, 'meshes': meshes, 'skins': [skin], 'materials': gl_mats,
    'textures': [{'source': 0, 'sampler': 0}], 'images': [{'bufferView': img_view, 'mimeType': 'image/png', 'name': 'suit_check'}],
    'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
    'animations': anims, 'accessors': accs, 'bufferViews': views,
}
while bin_.tell() % 4: bin_.write(b'\0')
binb = bin_.getvalue(); gltf['buffers'] = [{'byteLength': len(binb)}]
js = json.dumps(gltf, separators=(',', ':')).encode()
js += b' '*((4-len(js) % 4) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 12+8+len(js)+8+len(binb)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binb), 0x004E4942) + binb
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'wb').write(glb)
import base64   # copy for opening index.html straight from disk (file:// blocks fetch)
open(OUT.replace('ali-avatar.glb', 'ali-avatar-data.js'), 'w').write('window.AVATAR_GLB_B64="' + base64.b64encode(glb).decode() + '";')
print('wrote', os.path.normpath(OUT), len(glb)//1024, 'KB |', sum(len(p.pos) for p in body+face), 'verts |', len(anims), 'animations |', len(BONES), 'bones')
