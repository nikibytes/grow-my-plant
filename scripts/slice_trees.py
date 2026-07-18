"""Re-slice each tree into its OWN canvas sized to the tree bbox + margin, so
nothing is cropped (the old 640x700 forced tall stages to clip). Trunk base is
locked to the bottom-center of each canvas. Emits per-stage PNGs + a sizes
JSON the TS layer uses for the per-stage viewBox."""
import json
import numpy as np
from PIL import Image

SRC = "assets/tree_stages.webp"
OUT = "public/trees"
MARGIN = 80          # px padding around the tree
ATH = 40
STAGES = 6

os_m = __import__("os")
os_m.makedirs(OUT, exist_ok=True)

src = Image.open(SRC).convert("RGBA")
a = np.array(src)[:, :, 3] > ATH
H, W = a.shape


def ranges(idx, gap, size):
    if len(idx) == 0:
        return []
    out, s, p = [], idx[0], idx[0]
    for i in idx[1:]:
        if i - p > gap:
            if p - s >= size:
                out.append((int(s), int(p)))
            s = i
        p = i
    if p - s >= size:
        out.append((int(s), int(p)))
    return out


sizes = {}
for ri, (r0, r1) in enumerate(ranges(np.where(a.sum(axis=1) > 4)[0], 40, 40)):
    sub = a[r0:r1 + 1, :]
    for ci, (c0, c1) in enumerate(ranges(np.where(sub.sum(axis=0) > 4)[0], 40, 40)):
        # global stage index: 4 top-row then 2 bottom-row
        stage = ri * 4 + ci + 1
        if stage > STAGES:
            continue
        cell = a[r0:r1 + 1, c0:c1 + 1]
        rw = np.where(cell.any(axis=1))[0]
        rr0 = r0 + int(rw[0])
        rr1 = r0 + int(rw[-1])
        crop = src.crop((c0, rr0, c1 + 1, rr1 + 1))
        bw, bh = crop.size
        cw, ch = bw + 2 * MARGIN, bh + 2 * MARGIN
        canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        canvas.alpha_composite(crop, (MARGIN, MARGIN))
        canvas.save(f"{OUT}/stage-{stage}.png")
        sizes[f"stage-{stage}"] = {"vw": cw, "vh": ch, "baseX": cw // 2, "baseY": ch - MARGIN}
        print(f"stage-{stage}: canvas {cw}x{ch}, base ({cw//2},{ch-MARGIN})")

with open("assets/stage_sizes.json", "w") as f:
    json.dump(sizes, f, indent=1)
print("wrote assets/stage_sizes.json")
