"""Referência horizontal 1920x1080 para a HeyGen: Marcio à direita, sobre verde liso, com os ombros estendidos até a borda. Uso: python3 scripts/referencia_h.py"""
import numpy as np
from PIL import Image, ImageFilter
W, H, S, CX, TOP = 1920, 1080, .56, 1330, 120
cut = Image.open('assets/marcio_cutout.png').convert('RGBA')
a = np.asarray(cut.getchannel('A')); rows = np.where(a.max(1) > 128)[0]; hair = rows[0]
cw, ch = int(cut.width * S), int(cut.height * S); cut = cut.resize((cw, ch), Image.LANCZOS)
ox, oy = CX - cw // 2, TOP - int(hair * S)
canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0)); canvas.alpha_composite(cut, (ox, oy))
arr = np.asarray(canvas).astype(np.float32)
# extend the shirt with rounded shoulders that fall into the arms
A = arr[..., 3]
orig_a = A.copy() > 200
for side in (0, 1):
    xe = ox if side == 0 else ox + cw - 1
    ys = [y for y in range(max(0, oy), min(H, oy + ch)) if A[y, xe] > 200]
    if not ys: continue
    y0 = ys[0]; rx, ry = 165, (H - y0) * 1.15
    for y in range(y0, H):
        dy = (y - y0) / ry; ext_w = rx * np.sqrt(max(0., 1 - (1 - dy) ** 2)) if dy < 1 else rx
        n = int(ext_w); 
        if n <= 0: continue
        band = arr[y, xe:xe + 30, :3] if side == 0 else arr[y, xe - 29:xe + 1, :3]
        col = np.median(band, 0)
        xs = np.arange(n); fall = 1 - .45 * (xs / max(rx, 1)) ** 1.5   # darker toward the outside (roundness)
        seg = col[None, :] * fall[:, None]
        alpha = np.clip((n - xs) / 3.0, 0, 1) * 255                      # 3 px feather on the outer edge
        if side == 0:
            arr[y, xe - n:xe, :3] = seg[::-1]; arr[y, xe - n:xe, 3] = alpha[::-1]
        else:
            arr[y, xe + 1:xe + 1 + n, :3] = seg[:W - xe - 1]; arr[y, xe + 1:xe + 1 + n, 3] = alpha[:W - xe - 1]
# smooth the extended cloth (row medians leave horizontal streaks)
from scipy.ndimage import gaussian_filter
mask = (arr[..., 3] > 0) & ~orig_a
sm = arr.copy()
for c in range(3): sm[..., c] = gaussian_filter(arr[..., c], (14, 4))
arr[mask, :3] = sm[mask, :3]
ext = Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA')
out = Image.new('RGBA', (W, H), (0, 177, 64, 255)); out.alpha_composite(ext)
out.convert('RGB').save('assets/referencia_verde_h.jpg', quality=96)
print('ok', ox, oy, cw, ch, hair)
