"""Extract a branch SKELETON from each tree stage PNG (build-time).

Pipeline: alpha mask -> medial-axis skeleton -> graph of skeleton pixels ->
split into segments at junctions/endpoints -> assign a `level` = graph hops
from the trunk base (bottom-most skeleton point). Emits branch segments
(x1,y1)->(x2,y2, level) in 640x700 viewBox coords for each stage.

Only the runtime PLACEMENT is TypeScript; this is the build-time geometry
extractor (same role detect_slots.py had), so it stays in Python.
"""
import json
import numpy as np
from PIL import Image
from skimage.morphology import skeletonize
from scipy import ndimage

STAGES = 6
ATH = 40
# drop tiny spur segments shorter than this (px) — noise from skeletonization
MIN_SEG_LEN = 10

def neighbors(y, x, H, W):
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0:
                continue
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W:
                yield ny, nx

def extract(stage):
    im = Image.open(f"public/trees/stage-{stage}.png").convert("RGBA")
    a = np.array(im)[:, :, 3] > ATH
    # fill small holes so the skeleton is a clean centerline
    a = ndimage.binary_closing(a, iterations=2)
    a = ndimage.binary_fill_holes(a)
    skel = skeletonize(a)
    ys, xs = np.where(skel)
    if len(xs) == 0:
        return []
    pts = set(zip(ys.tolist(), xs.tolist()))

    # degree of each skeleton pixel
    deg = {p: sum(1 for _ in () or [n for n in neighbors(p[0], p[1], *skel.shape) if n in pts]) for p in pts}
    nodes = {p for p, d in deg.items() if d != 2}  # endpoints + junctions
    if not nodes:
        nodes = {min(pts, key=lambda p: -p[0])}

    # trunk base = lowest (max-y) skeleton node
    base = max(pts, key=lambda p: p[0])

    # walk from each node along degree-2 chains to the next node => segments
    visited_edges = set()
    segments = []  # (nodeA, nodeB, polyline pts)
    for start in nodes:
        for nb in [n for n in neighbors(start[0], start[1], *skel.shape) if n in pts]:
            edge0 = (start, nb)
            if edge0 in visited_edges:
                continue
            path = [start, nb]
            prev, cur = start, nb
            while cur not in nodes:
                nxts = [n for n in neighbors(cur[0], cur[1], *skel.shape) if n in pts and n != prev]
                if not nxts:
                    break
                prev, cur = cur, nxts[0]
                path.append(cur)
            visited_edges.add((start, path[1]))
            visited_edges.add((path[-1], path[-2]))
            visited_edges.add((path[1], start))
            visited_edges.add((path[-2], path[-1]))
            segments.append((path[0], path[-1], path))

    # BFS from base over the node graph to get a "level" per node (hops)
    from collections import deque, defaultdict
    adj = defaultdict(list)
    for a0, b0, _ in segments:
        adj[a0].append(b0)
        adj[b0].append(a0)
    # nearest node to base
    root = min(nodes, key=lambda p: (p[0] - base[0]) ** 2 + (p[1] - base[1]) ** 2)
    level = {root: 0}
    q = deque([root])
    while q:
        u = q.popleft()
        for v in adj[u]:
            if v not in level:
                level[v] = level[u] + 1
                q.append(v)

    out = []
    for a0, b0, path in segments:
        (y1, x1), (y2, x2) = path[0], path[-1]
        seg_len = np.hypot(x2 - x1, y2 - y1)
        if seg_len < MIN_SEG_LEN:
            continue
        # level = min level of the two endpoints + 1 (outer branches deeper)
        la = level.get(a0, 0)
        lb = level.get(b0, 0)
        lvl = min(la, lb)
        # orient so (x1,y1) is the end CLOSER to the base (inner), (x2,y2) outer
        if y1 < y2:  # y1 higher up (smaller y) => it's the outer end; swap
            x1, y1, x2, y2 = x2, y2, x1, y1
        out.append({"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2), "level": int(lvl)})
    return out

result = {}
for s in range(1, STAGES + 1):
    segs = extract(s)
    result[f"stage-{s}"] = segs
    print(f"stage-{s}: {len(segs)} branch segments, max level {max((b['level'] for b in segs), default=0)}")

with open("assets/stage_skeletons.json", "w") as f:
    json.dump(result, f, indent=1)
print("wrote assets/stage_skeletons.json")
