"""Gera assets/icon_shape.json (contorno do ícone Zissou, altura normalizada 1) a partir de assets/icone.png.
O main.js extruda esse contorno em 3D. Requer: pip install opencv-python-headless numpy."""
import cv2, numpy as np, json
im = cv2.imread('assets/icone.png', cv2.IMREAD_UNCHANGED)
a = cv2.GaussianBlur(cv2.resize(im[:, :, 3], None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC), (9, 9), 0)
_, th = cv2.threshold(a, 128, 255, cv2.THRESH_BINARY)
cs, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
c = max(cs, key=cv2.contourArea)[:, 0, :].astype(float)
cc = np.r_[c, c[:1]]
d = np.r_[0, np.cumsum(np.hypot(*np.diff(cc, axis=0).T))]
s = np.linspace(0, d[-1], 420, endpoint=False)
x, y = np.interp(s, d, cc[:, 0]), np.interp(s, d, cc[:, 1])
k = np.array([1, 4, 6, 4, 1], float); k /= k.sum()
xs = np.convolve(np.r_[x[-2:], x, x[:2]], k, 'valid'); ys = np.convolve(np.r_[y[-2:], y, y[:2]], k, 'valid')
ap = cv2.approxPolyDP(np.stack([xs, ys], 1).astype(np.float32).reshape(-1, 1, 2), 1.2, True)[:, 0, :]
x0, y0 = ap.min(0); x1, y1 = ap.max(0); h = y1 - y0; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
pts = [[round(float((p[0] - cx) / h), 4), round(float(-(p[1] - cy) / h), 4)] for p in ap]
if sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts))) < 0: pts = pts[::-1]
json.dump({'aspect': float((x1 - x0) / h), 'pts': pts}, open('assets/icon_shape.json', 'w'))
print(len(pts))
