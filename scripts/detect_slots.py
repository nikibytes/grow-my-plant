"""Auto-detect candidate leaf-anchor points for each tree stage PNG.
Strategy: leaf anchors should sit in the upper canopy region on/near the
branches. We sample opaque (branch) pixels, keep those above the trunk zone,
and pick a spread-out set via farthest-point sampling so anchors don't cluster.
Outputs a JS-ready slot array per stage + a canopy bounding ellipse."""
import json
import numpy as np
from PIL import Image

STAGES = 6
ATH = 40
N_TARGET = {1: 3, 2: 6, 3: 10, 4: 16, 5: 22, 6: 30}  # anchors per stage

def farthest_point_sample(pts, k):
    if len(pts) <= k:
        return pts
    pts = np.array(pts, float)
    chosen = [int(np.argmax(pts[:, 1] * -1))]  # start near top
    d = np.full(len(pts), np.inf)
    for _ in range(k - 1):
        last = pts[chosen[-1]]
        dist = np.sum((pts - last) ** 2, axis=1)
        d = np.minimum(d, dist)
        d[chosen] = -1
        chosen.append(int(np.argmax(d)))
    return pts[chosen].astype(int).tolist()

out = {}
for s in range(1, STAGES + 1):
    im = Image.open(f"public/trees/stage-{s}.png").convert("RGBA")
    a = np.array(im)[:, :, 3] > ATH
    ys, xs = np.where(a)
    top, bot = ys.min(), ys.max()
    height = bot - top
    # canopy = upper ~65% of the tree (exclude trunk/soil lower zone)
    canopy_cut = top + int(height * 0.65)
    cys, cxs = np.where(a[:canopy_cut, :])
    if len(cxs) < 5:  # seedling: whole thing is canopy
        cys, cxs = ys, xs
        canopy_cut = bot
    cx0, cx1 = cxs.min(), cxs.max()
    cy0, cy1 = cys.min(), cys.max()
    ccx, ccy = (cx0 + cx1) // 2, (cy0 + cy1) // 2
    rx, ry = max(20, (cx1 - cx0) // 2), max(20, (cy1 - cy0) // 2)
    # sample candidate points from canopy opaque pixels
    idx = np.random.default_rng(7).choice(len(cxs), size=min(4000, len(cxs)), replace=False)
    cand = list(zip(cxs[idx].tolist(), cys[idx].tolist()))
    anchors = farthest_point_sample(cand, N_TARGET[s])
    slots = [{"x": int(x), "y": int(y), "angle": int((hash((x, y)) % 50) - 25)} for x, y in anchors]
    out[f"stage-{s}"] = {
        "canopy": {"cx": int(ccx), "cy": int(ccy), "rx": int(rx), "ry": int(ry)},
        "slots": slots,
    }
    print(f"stage-{s}: {len(slots)} anchors, canopy c({ccx},{ccy}) r({rx},{ry})")

with open("assets/stage_slots.json", "w") as f:
    json.dump(out, f, indent=2)
print("wrote assets/stage_slots.json")
