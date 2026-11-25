"""Shared description of Ali's 3D avatar (geometry, rig, materials, expressions, animation keys).
Used by make_avatar.py (GLB writer) and blender_build_avatar.py (builds it inside Blender)."""

import json, math, struct, io, os, zlib
import numpy as np


# ---------------------------------------------------------------- math helpers
def rot(axis, deg):
    a = np.radians(deg); x, y, z = np.array(axis, float) / np.linalg.norm(axis)
    c, s, C = math.cos(a), math.sin(a), 1 - math.cos(a)
    return np.array([[c+x*x*C, x*y*C-z*s, x*z*C+y*s], [y*x*C+z*s, c+y*y*C, y*z*C-x*s], [z*x*C-y*s, z*y*C+x*s, c+z*z*C]])
def quat(axis, deg):
    a = np.radians(deg) / 2; v = np.array(axis, float) / np.linalg.norm(axis)
    return [*(v * math.sin(a)), math.cos(a)]
def qmul(a, b):
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return [aw*bx+ax*bw+ay*bz-az*by, aw*by-ax*bz+ay*bw+az*bx, aw*bz+ax*by-ay*bx+az*bw, aw*bw-ax*bx-ay*by-az*bz]
def look_rot(d):
    """rotation matrix whose local +Y points along d"""
    d = np.array(d, float); d /= np.linalg.norm(d)
    up = np.array([0, 1, 0.])
    v = np.cross(up, d); s = np.linalg.norm(v); c = up @ d
    if s < 1e-8: return np.eye(3) if c > 0 else rot([1, 0, 0], 180)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * ((1 - c) / s**2)

def spow(x, p): return np.sign(x) * np.abs(x) ** p

# ---------------------------------------------------------------- primitives
class Part:
    def __init__(self, pos, uv, idx, mat, bone, tag=''):
        self.pos, self.uv, self.idx, self.mat, self.bone, self.tag = pos, uv, idx, mat, bone, tag

def grid_idx(rings, segs):
    idx = []
    for i in range(rings):
        for j in range(segs):
            a = i*(segs+1)+j; b = a+segs+1
            idx += [a, b, a+1, a+1, b, b+1]
    return np.array(idx, np.uint32)

def ellip(center, radii, mat, bone, e1=1.0, e2=1.0, R=None, segs=22, rings=14, uvs=(1, 1), tag='', clip_y=None):
    """superellipsoid; e=1 -> ellipsoid, e<1 -> boxier"""
    v = np.linspace(-math.pi/2, math.pi/2, rings+1)[:, None]
    u = np.linspace(-math.pi, math.pi, segs+1)[None, :]
    if clip_y is not None: v = np.linspace(clip_y, math.pi/2, rings+1)[:, None]
    cv, sv, cu, su = np.cos(v), np.sin(v), np.cos(u), np.sin(u)
    x = radii[0]*spow(cv, e1)*spow(su, e2)
    y = radii[1]*spow(sv, e1)*np.ones_like(u)
    z = radii[2]*spow(cv, e1)*spow(cu, e2)
    P = np.stack([x, y, z], -1).reshape(-1, 3)
    if R is not None: P = P @ R.T
    P += center
    U = np.stack([(u/(2*math.pi)+.5)*np.ones_like(v)*uvs[0], (v/math.pi+.5)*np.ones_like(u)*uvs[1]], -1).reshape(-1, 2)
    return Part(P, U, grid_idx(rings, segs)[[i+d for i in range(0, 6*rings*segs, 3) for d in (0, 2, 1)]], mat, bone, tag)  # CCW outward

def capsule(p0, p1, r0, r1, mat, bone, segs=18, uvs=(1, 1), tag='', flat_end=False):
    """tapered capsule from p0 to p1"""
    p0, p1 = np.array(p0, float), np.array(p1, float); L = np.linalg.norm(p1-p0)
    prof = []
    n = 8
    for k in range(n+1):  # bottom cap
        a = -math.pi/2 + k/n*math.pi/2
        prof.append((r0*math.sin(a), r0*math.cos(a)))
    for k in range(1, 8):
        t = k/8; prof.append((t*L, r0+(r1-r0)*t))
    for k in range(n+1):  # top cap
        a = k/n*math.pi/2
        prof.append((L + (0 if flat_end else r1*math.sin(a)), r1*math.cos(a) if not flat_end or k == 0 else r1*(1-k/n)))
    prof = np.array(prof)
    u = np.linspace(0, 2*math.pi, segs+1)
    P = np.zeros((len(prof), segs+1, 3))
    P[..., 0] = prof[:, 1:2]*np.cos(u)[None]
    P[..., 2] = prof[:, 1:2]*np.sin(u)[None]
    P[..., 1] = prof[:, 0:1]
    P = P.reshape(-1, 3) @ look_rot(p1-p0).T + p0
    U = np.stack(np.meshgrid(u/(2*math.pi)*uvs[0], (prof[:, 0]-prof[0, 0])/(L+r0+r1)*uvs[1]), -1).reshape(-1, 2)
    return Part(P, U, grid_idx(len(prof)-1, segs), mat, bone, tag)

def tube(p0, p1, r, mat, bone, segs=18, uvs=(1, 1)):
    """open-ended short cylinder (cuffs, collars)"""
    p0, p1 = np.array(p0, float), np.array(p1, float)
    u = np.linspace(0, 2*math.pi, segs+1); L = np.linalg.norm(p1-p0)
    prof = np.array([(0, r*.92), (0, r), (L, r), (L, r*.92)])
    P = np.zeros((4, segs+1, 3)); P[..., 0] = prof[:, 1:2]*np.cos(u); P[..., 2] = prof[:, 1:2]*np.sin(u); P[..., 1] = prof[:, 0:1]
    P = P.reshape(-1, 3) @ look_rot(p1-p0).T + p0
    U = np.stack(np.meshgrid(u/(2*math.pi)*uvs[0], np.linspace(0, 1, 4)*uvs[1]), -1).reshape(-1, 2)
    return Part(P, U, grid_idx(3, segs), mat, bone)

def smooth_normals(P, idx):
    N = np.zeros_like(P)
    tri = idx.reshape(-1, 3); a, b, c = P[tri[:, 0]], P[tri[:, 1]], P[tri[:, 2]]
    fn = np.cross(b-a, c-a)
    for k in range(3): np.add.at(N, tri[:, k], fn)
    # weld duplicates (uv seams / poles) so shading is smooth
    key = np.round(P*2e4).astype(np.int64)
    _, inv = np.unique(key, axis=0, return_inverse=True)
    acc = np.zeros((inv.max()+1, 3)); np.add.at(acc, inv.ravel(), N); N = acc[inv.ravel()]
    n = np.linalg.norm(N, axis=1, keepdims=True); n[n == 0] = 1
    return (N/n).astype(np.float32)

# ---------------------------------------------------------------- skeleton (bind pose = world positions)
BONES = [  # name, parent, world head position
    ('root', None, (0, 0, 0)),
    ('hips', 'root', (0, .55, 0)),
    ('spine', 'hips', (0, .72, 0)),
    ('chest', 'spine', (0, .92, 0)),
    ('neck', 'chest', (0, 1.06, 0)),
    ('head', 'neck', (0, 1.14, 0)),
    ('upperarm.L', 'chest', (.335, 1.0, 0)),
    ('forearm.L', 'upperarm.L', (.42, .77, -.03)),
    ('hand.L', 'forearm.L', (.31, .60, .07)),
    ('upperarm.R', 'chest', (-.335, 1.0, 0)),
    ('forearm.R', 'upperarm.R', (-.40, .77, 0)),
    ('hand.R', 'forearm.R', (-.415, .565, .01)),
    ('thigh.L', 'hips', (.135, .52, 0)),
    ('shin.L', 'thigh.L', (.14, .32, 0)),
    ('foot.L', 'shin.L', (.145, .1, 0)),
    ('thigh.R', 'hips', (-.135, .52, 0)),
    ('shin.R', 'thigh.R', (-.14, .32, 0)),
    ('foot.R', 'shin.R', (-.145, .1, 0)),
]
BI = {b[0]: i for i, b in enumerate(BONES)}
BW = {b[0]: np.array(b[2], float) for b in BONES}

# ---------------------------------------------------------------- materials
MATS = {  # name: (baseColor rgba (linear-ish), metallic, roughness, texture)
    'skin':   ([.90, .66, .49, 1], 0, .7, None),
    'hair':   ([.27, .16, .10, 1], 0, .78, None),
    'hairhi': ([.36, .23, .14, 1], 0, .74, None),
    'suit':   ([1, 1, 1, 1], 0, .82, 'check'),
    'shirt':  ([.93, .92, .88, 1], 0, .7, None),
    'shoe':   ([.13, .065, .04, 1], 0, .28, None),
    'eyewhite': ([.97, .96, .94, 1], 0, .35, None),
    'iris':   ([.30, .15, .07, 1], 0, .25, None),
    'pupil':  ([.035, .02, .015, 1], 0, .2, None),
    'shine':  ([1, 1, 1, 1], 0, .1, None),
    'lash':   ([.06, .035, .025, 1], 0, .6, None),
    'brow':   ([.17, .09, .055, 1], 0, .7, None),
    'mouth':  ([.55, .25, .20, 1], 0, .5, None),
    'silver': ([.85, .86, .88, 1], 1, .25, None),
    'button': ([.55, .50, .44, 1], .6, .35, None),
    'watch':  ([.08, .08, .09, 1], .3, .4, None),
}

def check_png(size=256, pixels_only=False):
    """brown window-pane check like the mascot's suit"""
    img = np.zeros((size, size, 3), np.float32)
    rng = np.random.default_rng(3)
    base = np.array([74, 52, 40]) / 255
    img[:] = base
    noise = rng.normal(0, .025, (size, size, 1)); img += noise
    yy, xx = np.mgrid[0:size, 0:size]
    for k, (col, w, per) in enumerate([((48, 33, 26), 5, 32), ((92, 96, 112), 1, 32), ((112, 84, 62), 1, 16)]):
        c = np.array(col)/255; off = 0 if k == 0 else (8 if k == 1 else 3)
        m = (((xx+off) % per) < w) | (((yy+off) % per) < w)
        a = .75 if k == 0 else .55
        img[m] = img[m]*(1-a) + c*a
    img = np.clip(img*255, 0, 255).astype(np.uint8)
    if pixels_only: return img
    raw = b''.join(b'\x00' + img[y].tobytes() for y in range(size))
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t+d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')

# ---------------------------------------------------------------- the model
HEAD_C = np.array([0, 1.43, 0.]); HEAD_R = np.array([.40, .41, .375])
def on_head(x, y, lift=0.):
    """point on the front of the head surface + rotation aligning local +Z with the surface normal"""
    dx, dy = x/HEAD_R[0], (y-HEAD_C[1])/HEAD_R[1]
    z = HEAD_R[2]*math.sqrt(max(0.02, 1-dx*dx-dy*dy))
    p = np.array([x, y, z])
    n = np.array([x/HEAD_R[0]**2, (y-HEAD_C[1])/HEAD_R[1]**2, z/HEAD_R[2]**2]); n /= np.linalg.norm(n)
    yaw = math.degrees(math.atan2(n[0], n[2])); pitch = -math.degrees(math.asin(n[1]))
    return p + n*lift, rot([0, 1, 0], yaw) @ rot([1, 0, 0], pitch)

body, face = [], []
B = body.append
# --- head & ears & nose
B(ellip(HEAD_C, HEAD_R, 'skin', 'head', segs=36, rings=24))
# (jaw volume removed — the head ellipsoid reads cleaner)
for s in (1, -1):
    B(ellip([s*.395, 1.40, -.01], [.055, .085, .045], 'skin', 'head', R=rot([0, 1, 0], s*15)))
p, R = on_head(0, 1.33, -.005); B(ellip(p, [.032, .03, .03], 'skin', 'head', R=R))

# --- hair: big messy volume
B(ellip(HEAD_C+[0, .09, -.06], [.46, .40, .44], 'hair', 'head', R=rot([1, 0, 0], -16), segs=36, rings=20, clip_y=.05))
B(ellip(HEAD_C+[0, -.06, -.10], [.44, .36, .38], 'hair', 'head', segs=30, rings=16))          # back/sides
rng = np.random.default_rng(11)
locks = [  # (x, y, z, rx, ry, rz, tilt axis, deg, mat)
    (-.30, 1.64, .22, .17, .07, .12, [0, 0, 1], 30), (-.10, 1.72, .26, .2, .075, .13, [0, 0, 1], 14),
    (.12, 1.73, .25, .21, .075, .13, [0, 0, 1], -12), (.31, 1.64, .2, .17, .07, .12, [0, 0, 1], -32),
    (-.02, 1.66, .31, .19, .07, .09, [0, 0, 1], 8), (-.22, 1.59, .30, .15, .06, .08, [0, 0, 1], 26),
    (.22, 1.60, .29, .15, .06, .08, [0, 0, 1], -24),
    (-.44, 1.38, .12, .07, .17, .1, [0, 0, 1], -10), (.44, 1.38, .12, .07, .17, .1, [0, 0, 1], 10),
    (-.42, 1.22, .08, .07, .12, .09, [0, 0, 1], 12), (.42, 1.22, .08, .07, .12, .09, [0, 0, 1], -12),
    (-.40, 1.56, .18, .1, .1, .14, [1, 0, 0], 20), (.40, 1.56, .18, .1, .1, .14, [1, 0, 0], 20),
    (0, 1.84, -.04, .3, .07, .3, [0, 0, 1], 0),
    (-.33, 1.70, -.05, .14, .1, .2, [0, 0, 1], 35), (.33, 1.70, -.05, .14, .1, .2, [0, 0, 1], -35),
    (0, 1.25, -.33, .3, .2, .1, [1, 0, 0], 0), (-.25, 1.18, -.25, .12, .16, .1, [0, 0, 1], -8), (.25, 1.18, -.25, .12, .16, .1, [0, 0, 1], 8),
]
for i, (x, y, z, a, b, c, ax, d) in enumerate(locks):
    B(ellip([x, y, z], [a, b, c], 'hairhi' if i % 3 == 1 else 'hair', 'head', e1=.95, e2=1.45, R=rot(ax, d), segs=16, rings=10))
# bangs sweeping across the forehead
for x, y, w, d in [(-.27, 1.58, .13, 38), (-.13, 1.62, .14, 22), (.02, 1.63, .15, -4), (.17, 1.61, .14, -22), (.29, 1.56, .12, -36)]:
    p, R = on_head(x, y, .025)
    B(ellip(p, [w*1.15, .042, .055], 'hair' if x < .1 else 'hairhi', 'head', e1=.9, e2=1.6, R=R @ rot([0, 0, 1], d), segs=16, rings=8))

# --- face (separate mesh with morph targets)
F = face.append
for s, side in ((1, 'L'), (-1, 'R')):
    ex, ey = s*.155, 1.405
    p, R = on_head(ex, ey, -.012)
    F(ellip(p, [.098, .115, .03], 'eyewhite', 'head', R=R, tag='eye'+side))
    p2, _ = on_head(ex-s*.004, ey-.006, .004); F(ellip(p2, [.078, .097, .022], 'iris', 'head', R=R, tag='eye'+side))
    p3, _ = on_head(ex-s*.004, ey-.012, .010); F(ellip(p3, [.038, .046, .014], 'pupil', 'head', R=R, tag='eye'+side))
    p4, _ = on_head(ex+s*.022, ey+.03, .016); F(ellip(p4, [.019, .019, .01], 'shine', 'head', R=R, tag='eye'+side))
    p5, _ = on_head(ex-s*.03, ey-.04, .014); F(ellip(p5, [.009, .009, .006], 'shine', 'head', R=R, tag='eye'+side))
    p6, R6 = on_head(ex, ey+.095, .004)
    F(ellip(p6, [.107, .022, .02], 'lash', 'head', R=R6 @ rot([0, 0, 1], -s*6), tag='lash'+side))
    pb, Rb = on_head(s*.165, 1.555, .012)
    F(ellip(pb, [.085, .016, .014], 'brow', 'head', e1=.6, R=Rb @ rot([0, 0, 1], s*7), tag='brow'))
pm, Rm = on_head(0, 1.255, .002)
F(ellip(pm, [.052, .011, .01], 'mouth', 'head', R=Rm, tag='mouth', segs=32, rings=12))

# --- neck, torso, shirt, lapels
B(capsule([0, 1.0, 0], [0, 1.16, 0], .085, .08, 'skin', 'neck'))
B(ellip([0, .76, 0], [.325, .33, .205], 'suit', 'chest', e1=.42, e2=.72, segs=30, rings=22, uvs=(6, 4)))
B(ellip([0, .5, 0], [.29, .08, .18], 'suit', 'hips', e1=.5, e2=.7, uvs=(6, 1)))
B(ellip([0, .9, .168], [.1, .19, .045], 'shirt', 'chest', e1=.45, e2=.6))                       # shirt panel
for s in (1, -1):
    B(ellip([s*.075, 1.05, .1], [.07, .04, .05], 'shirt', 'chest', R=rot([0, 0, 1], s*-30)))      # collar points
    B(ellip([s*.105, .88, .19], [.06, .23, .028], 'suit', 'chest', e1=.35, R=rot([0, 0, 1], s*-19) @ rot([0, 1, 0], s*14), uvs=(2, 3)))  # lapels
for y in (.70, .59):
    B(ellip([-.07, y, .208], [.022, .022, .012], 'button', 'chest'))
B(ellip([-.19, .58, .19], [.075, .012, .03], 'suit', 'chest', uvs=(2, 1)))                       # pocket flap
# silver leaf pin + chain (left chest, as on the mascot)
B(ellip([.19, .98, .2], [.026, .045, .012], 'silver', 'chest', R=rot([0, 0, 1], -35)))
for k in range(6):
    t = k/5; B(ellip([.19+.07*t, .95-.06*math.sin(t*math.pi)-.02*t, .205], [.007, .007, .007], 'silver', 'chest', segs=10, rings=6))

# --- arms
def arm(side):
    s = 1 if side == 'L' else -1
    sh, el, wr = BW['upperarm.'+side], BW['forearm.'+side], BW['hand.'+side]
    B(ellip(sh+[0, -.02, 0], [.1, .09, .1], 'suit', 'upperarm.'+side, uvs=(2, 2)))
    B(capsule(sh+[0, -.04, 0], el, .088, .08, 'suit', 'upperarm.'+side, uvs=(3, 2)))
    B(capsule(el, wr, .08, .07, 'suit', 'forearm.'+side, uvs=(3, 2)))
    d = (wr-el)/np.linalg.norm(wr-el)
    B(tube(wr-d*.02, wr+d*.02, .068, 'shirt', 'forearm.'+side))
    if side == 'R':
        B(ellip(wr+d*.06, [.06, .07, .055], 'skin', 'hand.R'))
        B(capsule(wr+d*.05+[.035, 0, .02], wr+d*.1+[.04, -.02, .03], .02, .018, 'skin', 'hand.R'))  # thumb
    else:
        B(ellip(wr+d*.03, [.055, .05, .05], 'skin', 'hand.L'))   # mostly hidden in the pocket
        B(tube(wr-d*.005, wr+d*.012, .07, 'watch', 'forearm.L'))
arm('L'); arm('R')
# --- legs & shoes
for side, s in (('L', 1), ('R', -1)):
    B(capsule(BW['thigh.'+side]+[0, .02, 0], BW['shin.'+side], .105, .1, 'suit', 'thigh.'+side, uvs=(3, 2)))
    B(capsule(BW['shin.'+side], BW['foot.'+side]+[0, .03, 0], .1, .098, 'suit', 'shin.'+side, uvs=(3, 2)))
    B(tube(BW['foot.'+side]+[0, .02, 0], BW['foot.'+side]+[0, .06, 0], .108, 'suit', 'shin.'+side, uvs=(3, .5)))
    B(ellip(BW['foot.'+side]+[0, -.045, .05], [.1, .065, .16], 'shoe', 'foot.'+side, e1=.7, e2=.8))

# ---------------------------------------------------------------- morph targets for the face
def face_targets(parts):
    names = ['BlinkL', 'BlinkR', 'Smile', 'Surprised']
    T = {n: [] for n in names}
    for pt in parts:
        P = pt.pos; c = P.mean(0)
        z = np.zeros_like(P)
        def squash(fy, fx=1., dy=0.):
            Q = P.copy(); Q[:, 1] = c[1]+(P[:, 1]-c[1])*fy+dy; Q[:, 0] = c[0]+(P[:, 0]-c[0])*fx; return Q-P
        for side in 'LR':
            if pt.tag == 'eye'+side:
                T['Blink'+side].append(squash(.06, 1., -.03))
            elif pt.tag == 'lash'+side:
                T['Blink'+side].append(squash(1., 1., -.075))
            else:
                T['Blink'+side].append(z)
        if pt.tag == 'mouth':
            x = P[:, 0]-c[0]
            Q = P.copy(); Q[:, 0] = c[0]+x*1.35; Q[:, 1] += (x/.052)**2*.022 - .004
            T['Smile'].append(Q-P)
            Q = P.copy(); Q[:, 0] = c[0]+x*.55; Q[:, 1] = c[1]+(P[:, 1]-c[1])*3.6-.012
            T['Surprised'].append(Q-P)
        elif pt.tag == 'brow':
            T['Smile'].append(np.tile([0, .008, 0], (len(P), 1)))
            T['Surprised'].append(squash(1., 1., .045))
        elif pt.tag.startswith('eye'):
            T['Smile'].append(squash(.82, 1.02, -.006))
            T['Surprised'].append(squash(1.14, 1.12, .006))
        else:
            T['Smile'].append(z); T['Surprised'].append(z)
    return names, T

# ---------------------------------------------------------------- animations
I4 = [0, 0, 0, 1]
def rq(*rots):
    q = I4
    for ax, d in rots: q = qmul(q, quat(ax, d))
    return q
X, Y, Z = [1, 0, 0], [0, 1, 0], [0, 0, 1]
ANIM_SPECS = []
def anim(name, dur, tracks, morph=None):
    ANIM_SPECS.append((name, dur, tracks, morph or {}))
def _unused(name, dur, tracks, morph=None):
    """tracks: {bone: {'rotation': [(t,q)...], 'translation': [(t,v)...]}}; morph: {targetIndex: [(t,w)...]}"""
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

def loop(keys):  # smooth sampled curve helper: list of (t, value) -> dense
    return keys
def dense(fn, dur, n=24):
    return [(dur*i/n, fn(dur*i/n)) for i in range(n+1)]

blink = lambda t0: [(0, 0), (t0, 0), (t0+.07, 1), (t0+.16, 0)]
# Idle (4s loop): breathing, gentle sway, two blinks
anim('Idle', 4.0, {
    'chest': {'rotation': dense(lambda t: rq((Z, 1.2*math.sin(t*math.pi/2)), (X, .8*math.sin(t*math.pi))), 4)},
    'head': {'rotation': dense(lambda t: rq((Z, -2.5*math.sin(t*math.pi/2+.6)), (Y, 4*math.sin(t*math.pi/2))), 4)},
    'hips': {'translation': dense(lambda t: [0, .55+.008*math.sin(t*math.pi), 0], 4)},
    'upperarm.R': {'rotation': dense(lambda t: rq((Z, -1.5+1.5*math.sin(t*math.pi))), 4)},
}, {0: blink(1.1)+[(4, 0)], 1: blink(1.1)+[(4, 0)]})
# Wave (2.4s): raise right arm, wave the forearm, smile
up = lambda d=0: rq((Z, -128), (X, -12))
anim('Wave', 2.4, {
    'upperarm.R': {'rotation': [(0, I4), (.35, up()), (2.0, up()), (2.4, I4)]},
    'forearm.R': {'rotation': [(0, I4), (.35, rq((Z, -20)))] + [(.35+k*.2, rq((Z, -20+(28 if k % 2 else -12)))) for k in range(1, 8)] + [(2.0, rq((Z, -20))), (2.4, I4)]},
    'chest': {'rotation': [(0, I4), (.4, rq((Z, 3), (Y, -5))), (2.0, rq((Z, 3), (Y, -5))), (2.4, I4)]},
    'head': {'rotation': [(0, I4), (.4, rq((Z, 6), (Y, -6))), (2.0, rq((Z, 6), (Y, -6))), (2.4, I4)]},
}, {2: [(0, 0), (.3, 1), (2.1, 1), (2.4, 0)]})
# Nod (1.6s): "yes"
anim('Nod', 1.6, {
    'head': {'rotation': [(0, I4), (.25, rq((X, 16))), (.5, rq((X, -4))), (.75, rq((X, 13))), (1.0, rq((X, -2))), (1.3, I4), (1.6, I4)]},
    'neck': {'rotation': [(0, I4), (.25, rq((X, 5))), (.75, rq((X, 4))), (1.3, I4), (1.6, I4)]},
}, {2: [(0, 0), (.3, .7), (1.2, .7), (1.6, 0)]})
# Surprised (1.8s): hop, arms flare, O-mouth
anim('Surprised', 1.8, {
    'hips': {'translation': [(0, [0, .55, 0]), (.12, [0, .52, 0]), (.32, [0, .70, 0]), (.52, [0, .55, 0]), (.62, [0, .53, 0]), (.8, [0, .55, 0]), (1.8, [0, .55, 0])]},
    'upperarm.R': {'rotation': [(0, I4), (.3, rq((Z, -38))), (1.3, rq((Z, -30))), (1.8, I4)]},
    'head': {'rotation': [(0, I4), (.3, rq((X, -10))), (1.3, rq((X, -6))), (1.8, I4)]},
    'chest': {'rotation': [(0, I4), (.3, rq((X, -5))), (1.3, rq((X, -3))), (1.8, I4)]},
}, {3: [(0, 0), (.2, 1), (1.4, 1), (1.8, 0)]})
# Celebrate (2.2s): fist pump + hop + big smile
pump = rq((Z, -150), (X, -10))
anim('Celebrate', 2.2, {
    'upperarm.R': {'rotation': [(0, I4), (.3, pump), (.55, rq((Z, -120))), (.8, pump), (1.05, rq((Z, -120))), (1.3, pump), (1.8, pump), (2.2, I4)]},
    'forearm.R': {'rotation': [(0, I4), (.3, rq((Z, -60))), (1.8, rq((Z, -60))), (2.2, I4)]},
    'hips': {'translation': [(0, [0, .55, 0]), (.3, [0, .64, 0]), (.55, [0, .55, 0]), (.8, [0, .64, 0]), (1.05, [0, .55, 0]), (1.3, [0, .64, 0]), (1.55, [0, .55, 0]), (2.2, [0, .55, 0])]},
    'head': {'rotation': [(0, I4), (.3, rq((X, -8), (Z, 4))), (1.8, rq((X, -8), (Z, 4))), (2.2, I4)]},
}, {2: [(0, 0), (.25, 1), (1.9, 1), (2.2, 0)], 0: [(0, 0), (1.95, 0), (2.02, 1), (2.1, 0), (2.2, 0)], 1: [(0, 0), (1.95, 0), (2.02, 1), (2.1, 0), (2.2, 0)]})

