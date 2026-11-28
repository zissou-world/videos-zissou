"""Aplica uma tela do portal na tela verde do tablet (vídeo da Higgsfield), quadro a quadro.
Uso: python3 scripts/tela_no_tablet.py broll/raw_tablet_verde.mp4 telas/inicio.png saida.mp4 [pingpong]"""
import sys, subprocess, numpy as np, cv2
src, tela, dst = sys.argv[1:4]; ping = len(sys.argv) > 4
cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS) or 24
frames = []
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(f)
img = cv2.imread(tela); ih, iw = img.shape[:2]
out = []
for f in frames:
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
    m = cv2.inRange(hsv, (40, 90, 90), (85, 255, 255))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = max(cs, key=cv2.contourArea)
    hull = cv2.convexHull(c); peri = cv2.arcLength(hull, True)
    q = None
    for eps in (.01, .02, .03, .04, .06):
        ap = cv2.approxPolyDP(hull, eps * peri, True)
        if len(ap) == 4: q = ap.reshape(4, 2).astype(np.float32); break
    if q is None: q = cv2.boxPoints(cv2.minAreaRect(c)).astype(np.float32)
    # order: tl, tr, br, bl
    s = q.sum(1); d = np.diff(q, axis=1).ravel()
    quad = np.array([q[np.argmin(s)], q[np.argmin(d)], q[np.argmax(s)], q[np.argmax(d)]], np.float32)
    # expand 2 px so no green fringe remains at the border
    ctr = quad.mean(0); quad = ctr + (quad - ctr) * 1.006
    M = cv2.getPerspectiveTransform(np.float32([[0, 0], [iw, 0], [iw, ih], [0, ih]]), quad)
    warped = cv2.warpPerspective(img, M, (f.shape[1], f.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    # screen area = warped quad plus every green pixel (fills any sliver the quad missed), minus non-green
    # things inside the quad (e.g. a finger over the screen)
    qm = np.zeros(m.shape, np.uint8); cv2.fillConvexPoly(qm, quad.astype(np.int32), 255)
    occl = cv2.bitwise_and(qm, cv2.bitwise_not(cv2.dilate(m, np.ones((3, 3), np.uint8))))
    occl = cv2.morphologyEx(occl, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    soft_g = cv2.inRange(hsv, (35, 50, 60), (90, 255, 255))
    soft_g = cv2.bitwise_and(soft_g, cv2.dilate(qm, np.ones((41, 41), np.uint8)))
    area = cv2.max(cv2.subtract(qm, occl), soft_g)
    a = cv2.GaussianBlur(area, (3, 3), 0).astype(np.float32)[..., None] / 255
    # slight screen glow + despill of the bezel edge
    g = f.astype(np.float32); spill = np.maximum(g[..., 1] - np.maximum(g[..., 0], g[..., 2]), 0)
    g[..., 1] -= spill * .85
    comp = g * (1 - a) + (warped.astype(np.float32) * 1.03 + 4) * a
    out.append(np.clip(comp, 0, 255).astype(np.uint8))
if ping: out = out + out[::-1][1:-1]
h, w = out[0].shape[:2]
p = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{w}x{h}', '-r', str(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', dst], stdin=subprocess.PIPE)
for f in out: p.stdin.write(f.tobytes())
p.stdin.close(); p.wait(); print('ok', dst, len(out), 'frames')
