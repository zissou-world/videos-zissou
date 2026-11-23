"""Imagem de referência vertical para a HeyGen: fundo de tubetes azuis com profundidade + recorte do Marcio. Uso: python3 scripts/referencia.py"""
import numpy as np
from PIL import Image, ImageFilter
W, H = 1080, 1920
rng = np.random.default_rng(7)
x = np.arange(W)[None, :].astype(np.float32); y = np.arange(H)[:, None].astype(np.float32)
bg = np.zeros((H, W, 3), np.float32)
base = np.array([10, 22, 48], np.float32) / 255
bg[:] = base
def layer(n, wmin, wmax, cols, blur, bright, seed):
    r = np.random.default_rng(seed); img = np.zeros((H, W, 4), np.float32); cx = -40
    while cx < W + 40:
        w = r.uniform(wmin, wmax); c = np.array(cols[r.integers(len(cols))], np.float32) / 255
        u = (x - cx) / (w / 2)                      # -1..1 across tube
        m = (np.abs(u) <= 1).astype(np.float32)
        shade = np.sqrt(np.clip(1 - u ** 2, 0, 1))  # cylinder normal z
        spec = np.exp(-((u + .35) / .12) ** 2) * .55   # highlight stripe
        col = c[None, None, :] * (.25 + .9 * shade[..., None]) * bright + spec[..., None] * bright
        vert = (.55 + .45 * np.exp(-((y - H * .38) / (H * .55)) ** 2))[..., None]
        a = np.repeat(m, H, 0)[..., None]
        img[..., :3] = img[..., :3] * (1 - a) + np.repeat(col, H, 0) * vert * a; img[..., 3:] = np.maximum(img[..., 3:], a)
        cx += w + r.uniform(4, 18)
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im).astype(np.float32) / 255
blues = [(28, 64, 128), (40, 90, 170), (22, 50, 104), (60, 112, 196), (34, 76, 150)]
for n, wmin, wmax, blur, br, sd in [(0, 60, 120, 18, .55, 1), (1, 90, 170, 9, .8, 2)]:
    L = layer(n, wmin, wmax, blues, blur, br, sd); a = L[..., 3:]
    bg = bg * (1 - a) + L[..., :3] * a
# soft key light behind the head, coral touch low-left, vignette
glow = np.exp(-(((x - W * .52) / 520) ** 2 + ((y - H * .5) / 620) ** 2))[..., None]
bg = bg * (1 + .55 * glow) + np.array([.05, .09, .16]) * glow
coral = np.exp(-(((x - 0) / 600) ** 2 + ((y - H) / 700) ** 2))[..., None]
bg = bg + np.array([.22, .09, .07]) * coral * .5
vig = (1 - .55 * (((x - W / 2) / (W * .75)) ** 2 + ((y - H / 2) / (H * .7)) ** 2))[..., None]
bg = np.clip(bg * np.clip(vig, .35, 1), 0, 1)
out = Image.fromarray((bg * 255).astype(np.uint8)).convert('RGBA')
cut = Image.open('assets/marcio_cutout.png').convert('RGBA')
s = 1.0; cw, ch = int(cut.width * s), int(cut.height * s); cut = cut.resize((cw, ch), Image.LANCZOS)
ox, oy = (W - cw) // 2, 330
# soft shadow behind person
sh = Image.new('RGBA', out.size, (0, 0, 0, 0)); a = cut.split()[3].point(lambda v: int(v * .45))
blk = Image.new('RGBA', cut.size, (0, 0, 10, 255)); blk.putalpha(a); sh.alpha_composite(blk, (ox + 18, oy + 22)); sh = sh.filter(ImageFilter.GaussianBlur(28))
out.alpha_composite(sh)
# slight cool grade on the person so it sits in the blue scene
arr = np.asarray(cut).astype(np.float32); arr[..., 0] *= .97; arr[..., 2] = np.minimum(255, arr[..., 2] * 1.03); cut = Image.fromarray(arr.astype(np.uint8), 'RGBA')
out.alpha_composite(cut, (ox, oy))
out.convert('RGB').save('assets/referencia_vertical.jpg', quality=95)
print('ok assets/referencia_vertical.jpg')
