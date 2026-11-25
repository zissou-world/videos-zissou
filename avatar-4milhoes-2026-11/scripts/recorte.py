"""Recorte fino do avatar (fundo verde da HeyGen): chave por diferença de verde com alfa suave nos fios,
descontaminação da cor da borda, remoção do tufo escuro no topo da cabeça e um leve "light wrap" vermelho.
Uso: python3 scripts/recorte.py [quadros...]   (sem argumentos processa o vídeo todo para out/frames)"""
import sys, subprocess, numpy as np, json, os
from PIL import Image
from scipy.ndimage import gaussian_filter, binary_erosion
from multiprocessing import Pool
SRC, W, H = 'out/avatar_heygen.mp4', 1080, 1920
K = np.array([0, 177, 62], np.float32)          # key colour measured on the plates
WRAP = np.array([150, 34, 38], np.float32)       # wall red for the light wrap
def key(rgb):
    c = rgb.astype(np.float32); r, g, b = c[..., 0], c[..., 1], c[..., 2]
    d = g - np.maximum(r, b)
    a = 1 - np.clip((d - 10) / (95 - 10), 0, 1)                      # soft alpha on hair strands
    a = gaussian_filter(a, .6)
    a[a < .03] = 0
    # decontaminate: remove the green that is mixed into semi-transparent pixels
    fg = (c - (1 - a[..., None]) * K) / np.maximum(a[..., None], .08)
    fg[..., 1] = np.minimum(fg[..., 1], np.maximum(fg[..., 0], fg[..., 2]) * 1.02 + 4)   # spill
    fg = np.clip(fg, 0, 255)
    # dark tuft on top of the head (an object behind the head in the source selfie)
    rows = np.where((a[:, 250:830] > .5).sum(1) > 20)[0]
    top = rows[0] if len(rows) else 120
    if len(rows):
        top = rows[0]; band = slice(max(0, top - 5), top + 70)
        lum = fg[band, :, 0] * .3 + fg[band, :, 1] * .59 + fg[band, :, 2] * .11
        ab = a[band] > .5; first = np.where(ab.any(0), ab.argmax(0), 10 ** 6)          # first opaque row per column
        yy = np.arange(ab.shape[0])[:, None]
        dark = (lum < 58) & (a[band] > 0) & (yy < first[None, :] + 26)                 # only the outer crust of the head
        m = gaussian_filter(dark.astype(np.float32), 2.0)
        a[band] *= 1 - np.clip(m * 1.6, 0, 1)
    # light wrap: the outer edge picks up a little of the red wall
    inner = gaussian_filter(a, 6)
    edge = np.clip(a - inner, 0, 1) * 2.2 + (1 - a) * .0
    w = np.clip(edge, 0, .35)[..., None]
    fg = fg * (1 - w) + WRAP * w
    return np.dstack([fg, a * 255]).astype(np.uint8)
def frames():
    p = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-i', SRC, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    i = 0
    while True:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3: break
        i += 1; yield i, np.frombuffer(buf, np.uint8).reshape(H, W, 3)
def work(item):
    i, rgb = item
    Image.fromarray(key(rgb), 'RGBA').save(f'out/frames_new/{i:05d}.webp', quality=90, method=3); return i
if __name__ == '__main__':
    only = set(int(x) for x in sys.argv[1:])
    os.makedirs('out/frames_new', exist_ok=True)
    if only:
        for i, rgb in frames():
            if i in only: work((i, rgb))
            if i >= max(only): break
    else:
        with Pool(4) as pool:
            n = 0
            for _ in pool.imap(work, frames(), chunksize=4): n += 1
        json.dump({'n': n, 'fps': 25}, open('out/frames_new/meta.json', 'w')); print('ok', n)
