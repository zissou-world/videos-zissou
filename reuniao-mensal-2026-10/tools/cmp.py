import subprocess, sys, os
from PIL import Image, ImageDraw, ImageFont
# usage: cmp.py ORIG NEW OUTDIR t1,t2,...  -> sheets of 4 rows (orig | new)
O, N, OUT, TS = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
os.makedirs(OUT, exist_ok=True)
ts = [float(x) for x in TS.split(',')]
def grab(src, t):
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(t), '-i', src, '-frames:v', '1', '-vf', 'scale=640:360', '-f', 'image2pipe', '-c:v', 'png', '-'], capture_output=True)
    from io import BytesIO
    return Image.open(BytesIO(p.stdout)).convert('RGB')
rows = []
for t in ts:
    a, b = grab(O, t), grab(N, t)
    r = Image.new('RGB', (1284, 360), (255, 0, 0)); r.paste(a, (0, 0)); r.paste(b, (644, 0))
    ImageDraw.Draw(r).text((10, 8), f'{t}', fill=(255, 0, 0))
    ImageDraw.Draw(r).rectangle((0, 0, 60, 26), outline=(255, 0, 0))
    d = ImageDraw.Draw(r); d.text((12, 8), f'{t:.1f}s', fill=(230, 0, 0))
    rows.append(r)
for i in range(0, len(rows), 4):
    g = rows[i:i + 4]
    s = Image.new('RGB', (1284, 364 * len(g)), (0, 0, 0))
    for j, r in enumerate(g): s.paste(r, (0, j * 364))
    s.save(os.path.join(OUT, f'sheet_{i // 4 + 1:02d}.jpg'), quality=88)
print(len(rows))
