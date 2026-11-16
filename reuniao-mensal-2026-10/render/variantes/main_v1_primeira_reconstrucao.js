import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ---------- helpers ----------
const C = { coral: '#E4796F', ink: '#141B26', slate: '#5A7196', navy: '#293C4D', bar: '#D6DEE7', white: '#FFFFFF' };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const pr = (t, a, d) => clamp((t - a) / d);
const eo = x => 1 - Math.pow(1 - clamp(x), 3);
const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const backO = x => { x = clamp(x); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const spring = x => x <= 0 ? 0 : x >= 1.6 ? 1 : 1 - Math.exp(-5.5 * x) * Math.cos(8 * x);
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const out = document.getElementById('out');
const ctx = out.getContext('2d');
const tmp = document.getElementById('tmp');
const tctx = tmp.getContext('2d');
const glc = document.getElementById('gl');
const W = 1920, H = 1080;

function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
const IMG = {};

// ---------- timeline (seconds, from the original narration) ----------
const TR = [8.95, 32.05, 71.95, 89.45, 96.05, 106.4, 113.95, 120.7]; // pan centers between scenes 1..9
const TRD = 0.8;
const A = [{ x: 960, y: 540 }, { x: 3070, y: 760 }, { x: 5180, y: 540 }, { x: 7290, y: 760 }, { x: 9400, y: 540 }, { x: 11510, y: 840 }, { x: 11810, y: 3040 }, { x: 9700, y: 3340 }, { x: 7590, y: 3040 }];
const DRIFT = [{ x: 0, y: 0 }, { x: 40, y: -10 }, { x: -40, y: 0 }, { x: 30, y: 10 }, { x: -30, y: 0 }, { x: 30, y: -10 }, { x: -30, y: 0 }, { x: 0, y: 20 }, { x: 0, y: 0 }];
const SS = [0, ...TR.map(x => x + TRD / 2)];
const SE = [...TR.map(x => x - TRD / 2), 138.1];

function camAt(t) {
  for (let i = 0; i < 9; i++) {
    if (t <= SE[i]) {
      const k = eio(pr(t, SS[i], SE[i] - SS[i]));
      return { x: A[i].x + DRIFT[i].x * (k - .5), y: A[i].y + DRIFT[i].y * (k - .5), s: i };
    }
    if (i < 8 && t < SS[i + 1]) {
      const k = eio(pr(t, SE[i], TRD));
      const a = { x: A[i].x + DRIFT[i].x * .5, y: A[i].y + DRIFT[i].y * .5 };
      const b = { x: A[i + 1].x - DRIFT[i + 1].x * .5, y: A[i + 1].y - DRIFT[i + 1].y * .5 };
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), s: k < .5 ? i : i + 1, pan: k };
    }
  }
  return { x: A[8].x, y: A[8].y, s: 8 };
}
function darkAt(t) { return t < 9.4 ? 1 - eio(pr(t, 8.85, 0.55)) : eio(pr(t, 127.55, 0.45)); }

// ---------- 2D drawing ----------
let CAM = { x: 960, y: 540 };
function sceneOrigin(i) { return { x: A[i].x - CAM.x, y: A[i].y - CAM.y }; } // add to scene-local coords (which are screen coords when camera centered)

function font(size, w = 700) { return `${w} ${size}px Zona`; }
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function txt(c, s, x, y, size, color, o = {}) {
  c.save();
  c.font = font(size, o.w || 700);
  c.letterSpacing = o.ls ? `${o.ls}px` : '0px';
  c.textAlign = o.al || 'left'; c.textBaseline = o.bl || 'alphabetic';
  c.fillStyle = color; c.globalAlpha *= (o.a ?? 1);
  if (o.blur) c.filter = `blur(${o.blur}px)`;
  let sx = 1;
  if (o.mw) { const m = c.measureText(s).width; if (m > o.mw) sx = o.mw / m; }
  if (sx !== 1) { c.translate(x, y); c.scale(sx, 1); c.fillText(s, 0, 0); } else c.fillText(s, x, y);
  c.restore();
}
function tw(c, s, size, w = 700, ls = 0) { c.save(); c.font = font(size, w); c.letterSpacing = `${ls}px`; const m = c.measureText(s).width; c.restore(); return m; }
// appear: fade + rise + blur
function ap(t, t0, d = .5) { const k = eo(pr(t, t0, d)); return { a: k, dy: (1 - k) * 26, blur: (1 - k) * 10 }; }
function gone(t, t1, d = .4) { return 1 - eio(pr(t, t1, d)); }
function kicker(c, s, x, y, t, t0, o = {}) {
  const p = ap(t, t0, .6);
  txt(c, s, x, y + p.dy, o.size || 30, o.color || C.coral, { ls: (o.size || 30) * .42, al: o.al || 'center', a: p.a * (o.a ?? 1), w: 600, blur: p.blur });
}
// line of words appearing at given times; words: [text, time, color?]
function wordLine(c, words, cx, y, size, t, o = {}) {
  const sp = size * .3;
  const ws = words.map(w => tw(c, w[0], size, 700, o.ls || 0));
  const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  let x = o.al === 'left' ? cx : cx - total / 2;
  words.forEach((w, i) => {
    const p = ap(t, w[1], .45);
    if (p.a > 0) txt(c, w[0], x, y + p.dy, size, w[2] || o.color || C.ink, { a: p.a * (o.a ?? 1), blur: p.blur + (o.blur || 0), ls: o.ls || 0 });
    x += ws[i] + sp;
  });
}
function card(c, x, y, w, h, o = {}) {
  c.save();
  c.globalAlpha *= (o.a ?? 1);
  c.shadowColor = 'rgba(25,35,55,0.10)'; c.shadowBlur = 50; c.shadowOffsetY = 18;
  rr(c, x, y, w, h, o.r || 26); c.fillStyle = '#fff'; c.fill();
  c.shadowColor = 'transparent';
  if (o.border) { c.lineWidth = 4; c.strokeStyle = o.border; c.globalAlpha *= (o.ba ?? 1); rr(c, x + 2, y + 2, w - 4, h - 4, (o.r || 26) - 2); c.stroke(); }
  c.restore();
}
function pill(c, s, x, y, size, bg, fg, o = {}) {
  const padX = size * .75, h = size * 2.0;
  const w = tw(c, s, size, 600, size * .14) + padX * 2;
  const k = o.k ?? 1; if (k <= 0) return w;
  c.save(); c.globalAlpha *= clamp(k * 1.4);
  const sc = .6 + .4 * backO(k);
  const px = o.al === 'center' ? x - w / 2 : o.al === 'right' ? x - w : x;
  c.translate(px + w / 2, y + h / 2); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
  rr(c, 0, 0, w, h, h / 2); c.fillStyle = bg; c.fill();
  txt(c, s, w / 2, h / 2 + size * .36, size, fg, { al: 'center', w: 600, ls: size * .14 });
  c.restore();
  return w;
}
const fmt = n => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
// odometer-ish rolling number
function odo(c, value, k, x, y, size, color, o = {}) {
  const pre = o.pre || '';
  if (k <= 0) return;
  const e = eo(k);
  const v = value * e;
  if (k >= 1) { txt(c, pre + fmt(value) + (o.suf || ''), x, y, size, color, { al: o.al, a: o.a }); return; }
  const s = pre + fmt(v);
  const last = s.slice(-1), head = s.slice(0, -1);
  const fr = (v % 1);
  const hw = tw(c, head, size), dw = tw(c, '0', size);
  let x0 = x; if (o.al === 'center') x0 = x - (hw + dw) / 2; else if (o.al === 'right') x0 = x - hw - dw;
  txt(c, head, x0, y, size, color, { a: o.a });
  c.save(); c.beginPath(); c.rect(x0 + hw - 4, y - size * 1.0, dw + 12, size * 1.25); c.clip();
  const d = parseInt(last) || 0;
  txt(c, String(d), x0 + hw, y - fr * size * .9, size, color, { a: (o.a ?? 1) * (1 - fr * .6), blur: 1.5 });
  txt(c, String((d + 1) % 10), x0 + hw, y + (1 - fr) * size * .9, size, color, { a: (o.a ?? 1) * fr, blur: 1.5 });
  c.restore();
  c.globalAlpha = 1;
}
function avatar(c, img, cx, cy, d, o = {}) {
  const k = o.k ?? 1; if (k <= 0) return;
  c.save(); c.globalAlpha *= clamp(k * 1.5);
  const sc = .7 + .3 * backO(k);
  c.translate(cx, cy); c.scale(sc, sc);
  // shadow + white ring
  c.shadowColor = 'rgba(25,35,55,0.18)'; c.shadowBlur = 24; c.shadowOffsetY = 8;
  c.beginPath(); c.arc(0, 0, d / 2 + (o.ring ? 9 : 6), 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
  c.shadowColor = 'transparent';
  if (o.ring) { c.beginPath(); c.arc(0, 0, d / 2 + 6, 0, Math.PI * 2); c.lineWidth = 5; c.strokeStyle = o.ring; c.stroke(); }
  c.save(); c.beginPath(); c.arc(0, 0, d / 2, 0, Math.PI * 2); c.clip();
  if (img) { const z = 1 + .06 * (1 - eo(k)); c.drawImage(img, -d / 2 * z, -d / 2 * z, d * z, d * z); }
  else {
    const g = c.createLinearGradient(0, -d / 2, 0, d / 2); g.addColorStop(0, o.c1 || '#EE9A90'); g.addColorStop(1, o.c2 || '#DD6E63');
    c.fillStyle = g; c.fillRect(-d / 2, -d / 2, d, d);
    txt(c, o.ini || '', 0, d * .17, d * .42, '#fff', { al: 'center' });
  }
  c.restore(); c.restore();
}

// ---------- background ----------
function drawBG(c, dk) {
  c.fillStyle = '#F1F0EE'; c.fillRect(0, 0, W, H);
  let g = c.createRadialGradient(80, -60, 0, 80, -60, 1100); g.addColorStop(0, 'rgba(236,168,156,0.42)'); g.addColorStop(1, 'rgba(236,168,156,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  g = c.createRadialGradient(1500, 1000, 0, 1500, 1000, 900); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  if (dk > 0) {
    c.save(); c.globalAlpha = dk;
    c.fillStyle = '#0A111C'; c.fillRect(0, 0, W, H);
    g = c.createRadialGradient(820, -120, 0, 820, -120, 900); g.addColorStop(0, 'rgba(150,38,34,0.95)'); g.addColorStop(.55, 'rgba(90,22,30,0.45)'); g.addColorStop(1, 'rgba(60,15,25,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    g = c.createRadialGradient(1500, 900, 0, 1500, 900, 1000); g.addColorStop(0, 'rgba(36,74,120,0.75)'); g.addColorStop(1, 'rgba(20,40,70,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    g = c.createRadialGradient(200, 700, 0, 200, 700, 800); g.addColorStop(0, 'rgba(18,40,66,0.6)'); g.addColorStop(1, 'rgba(18,40,66,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.restore();
  }
}

// ---------- THREE setup ----------
const renderer = new THREE.WebGLRenderer({ canvas: glc, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const D = 20;
const camera = new THREE.PerspectiveCamera(2 * Math.atan(5.4 / D) * 180 / Math.PI, W / H, 0.5, 200);
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-6, 10, 12); scene.add(key);
const hemi = new THREE.HemisphereLight(0xffffff, 0xd9dde6, 0.9); scene.add(hemi);
const toU = px => px / 100;
function scenePos(i, sx, sy, z = 0) { return new THREE.Vector3(toU(A[i].x + sx - 960), -toU(A[i].y + sy - 540), z); }

const M = {
  white: new THREE.MeshPhysicalMaterial({ color: 0xf8f7f5, roughness: .32, clearcoat: .4, clearcoatRoughness: .3, envMapIntensity: .9 }),
  ice: new THREE.MeshStandardMaterial({ color: 0xf6f5f3, roughness: .62, envMapIntensity: .8 }),
  coral: new THREE.MeshPhysicalMaterial({ color: 0xE4796F, roughness: .38, clearcoat: .3, envMapIntensity: .8 }),
  coralD: new THREE.MeshStandardMaterial({ color: 0xE06A5C, roughness: .55 }),
  blue: new THREE.MeshPhysicalMaterial({ color: 0xBFD0EC, roughness: .35, clearcoat: .3 }),
  navy: new THREE.MeshPhysicalMaterial({ color: 0x2F4566, roughness: .35, clearcoat: .5 }),
  peach: new THREE.MeshStandardMaterial({ color: 0xF7D8BF, roughness: .9 }),
  peach2: new THREE.MeshStandardMaterial({ color: 0xFBE6D3, roughness: .9 }),
  pink: new THREE.MeshStandardMaterial({ color: 0xF2A497, roughness: .8 }),
  navyD: new THREE.MeshStandardMaterial({ color: 0x23334C, roughness: .6 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xEDEAE6, roughness: .75, envMapIntensity: .45 }),
};
function shadowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(20,25,35,0.55)'); r.addColorStop(.5, 'rgba(20,25,35,0.18)'); r.addColorStop(1, 'rgba(20,25,35,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const SHT = shadowTex();
function mkShadow(w, h) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: SHT, transparent: true, depthWrite: false })); return m; }

let ICON_GEO;
function iconGeo(pts) {
  const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(s, { depth: .26, bevelEnabled: true, bevelThickness: .07, bevelSize: .045, bevelSegments: 5, curveSegments: 4 });
  g.center(); g.computeVertexNormals(); return g;
}
function mkIcon(mat) { const m = new THREE.Mesh(ICON_GEO, mat); m.visible = false; scene.add(m); return m; }
// icon width in px -> scale
const ICON_ASP = 1.668;
function setIcon(m, pos, wpx, rx = 0, ry = 0, rz = 0) { m.visible = wpx > 1; m.position.copy(pos); const s = toU(wpx) / ICON_ASP; m.scale.set(s, s, s); m.rotation.set(rx, ry, rz); }

// ---------- generic shapes ----------
const GEOS = {
  sphere: new THREE.SphereGeometry(.5, 40, 28),
  torus: new THREE.TorusGeometry(.38, .16, 24, 48),
  capsule: new THREE.CapsuleGeometry(.2, .5, 10, 24),
  cube: new RoundedBoxGeometry(.8, .8, .8, 5, .18),
};
function mkShape(kind, mat) { const m = new THREE.Mesh(GEOS[kind], mat); m.visible = false; scene.add(m); return m; }

// ---------- scene objects ----------
let O = {};
function build(shape) {
  ICON_GEO = iconGeo(shape.pts);
  O.icon1 = mkIcon(M.white);
  O.iconNN = mkIcon(M.coral);
  O.iconEnd = mkIcon(M.white);
  // podium
  O.pod = [];
  const P = [[2, 427, 840, 5.26], [1, 958, 750, 4.96], [3, 1486, 890, 5.24]];
  for (const [n, sx, top, w] of P) {
    const grp = new THREE.Group();
    const h = toU(1240 - top);
    const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, 2.0, 4, .06), M.ice); b.position.y = -h / 2; grp.add(b);
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = C.coral; g.font = '700 200px Zona'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 128, 140);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const num = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), new THREE.MeshBasicMaterial({ map: tx, transparent: true }));
    num.position.set(0, -.95, 1.005); grp.add(num);
    grp.position.copy(scenePos(2, sx, top, -1.0)); grp.userData = { n, top };
    grp.visible = false; scene.add(grp); O.pod.push(grp);
  }
  // burst particles (reused)
  O.burst = [];
  for (let i = 0; i < 70; i++) { const m = new THREE.Mesh(GEOS.cube, i % 3 ? M.coral : M.white); m.visible = false; scene.add(m); O.burst.push(m); }
  // store
  O.store = buildStore();
  // welcome shapes
  O.wel = [];
  const WS = [['sphere', M.coral, 272, 330, .9], ['torus', M.coral, 274, 542, .8], ['torus', M.blue, 228, 856, .9], ['sphere', M.coral, 542, 904, .75], ['cube', M.white, 1684, 290, .8], ['cube', M.white, 1296, 916, .6], ['capsule', M.coral, 1624, 772, .9], ['sphere', M.white, 1760, 640, .5], ['torus', M.coral, 1540, 180, .55], ['capsule', M.blue, 420, 160, .6]];
  for (const [k, m, x, y, s] of WS) { const o = mkShape(k, m); o.userData = { x, y, s }; O.wel.push(o); }
  // next night
  O.nnShadow = mkShadow(4.6, 1.1); O.nnShadow.visible = false; scene.add(O.nnShadow);
  const curve = new THREE.EllipseCurve(0, 0, 3.85, 2.6, 0, Math.PI * 2, false, 0);
  const p2 = curve.getPoints(240).map(p => new THREE.Vector3(p.x, 0, p.y));
  const c3 = new THREE.CatmullRomCurve3(p2, true);
  O.ringGeo = new THREE.TubeGeometry(c3, 400, .085, 16, true);
  O.ring = new THREE.Mesh(O.ringGeo, M.navy); O.ring.visible = false; scene.add(O.ring);
  O.ringCurve = c3;
  O.ringBall = new THREE.Mesh(GEOS.sphere, M.coral); O.ringBall.visible = false; scene.add(O.ringBall);
  // finale shapes
  O.fin = [];
  const r = rng(7);
  const kinds = ['sphere', 'torus', 'capsule', 'cube'];
  const mats = [M.coral, M.white, M.blue, M.coral, M.white, M.coral];
  for (let i = 0; i < 24; i++) {
    const o = mkShape(kinds[i % 4], mats[i % 6]);
    o.userData = { a0: i / 24 * Math.PI * 2 + r() * .2, rad: .92 + r() * .2, yo: (r() - .5) * .5, s: .45 + r() * .4, rs: r() * 2 - 1, ph: r() * 6 };
    O.fin.push(o);
  }
  O.endShadow = mkShadow(4, 1); O.endShadow.visible = false; scene.add(O.endShadow);
}

function buildStore() {
  const g = new THREE.Group();
  const Wd = 4.4, Hh = 4.0, Dd = 3.2, ow = 1.5, oh = 2.5, ox = .55, oy = -.55; // opening size & center (local)
  const t = .12;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  // walls: back, left, right, roof, base
  add(new RoundedBoxGeometry(Wd, Hh, t, 3, .03), M.wall, 0, 0, -Dd / 2);
  add(new RoundedBoxGeometry(t, Hh, Dd, 3, .03), M.wall, -Wd / 2, 0, 0);
  add(new RoundedBoxGeometry(t, Hh, Dd, 3, .03), M.wall, Wd / 2, 0, 0);
  add(new RoundedBoxGeometry(Wd + .5, .2, Dd + .5, 3, .06), M.white, 0, Hh / 2 + .08, 0);
  add(new RoundedBoxGeometry(Wd + .3, .16, Dd + .3, 3, .05), M.white, 0, -Hh / 2 - .04, 0);
  // front with opening (4 panels)
  const fz = Dd / 2;
  const L = -Wd / 2, R = Wd / 2, Tp = Hh / 2, Bt = -Hh / 2;
  const oL = ox - ow / 2, oR = ox + ow / 2, oT = oy + oh / 2, oB = oy - oh / 2;
  const panel = (x0, x1, y0, y1) => add(new THREE.BoxGeometry(x1 - x0, y1 - y0, t), M.wall, (x0 + x1) / 2, (y0 + y1) / 2, fz);
  panel(L, oL, Bt, Tp); panel(oR, R, Bt, Tp); panel(oL, oR, oT, Tp); panel(oL, oR, Bt, oB);
  // interior room behind opening
  const rz = fz - .1, rd = 1.6;
  add(new THREE.BoxGeometry(ow + .6, oh + .4, .05), M.peach, ox, oy, rz - rd);
  add(new THREE.BoxGeometry(.05, oh + .4, rd), M.peach2, oL - .02, oy, rz - rd / 2);
  add(new THREE.BoxGeometry(.05, oh + .4, rd), M.peach2, oR + .02, oy, rz - rd / 2);
  add(new THREE.BoxGeometry(ow + .6, .05, rd), M.peach2, ox, oB + .02, rz - rd / 2);
  add(new THREE.BoxGeometry(ow + .6, .05, rd), M.peach2, ox, oT, rz - rd / 2);
  const ilight = new THREE.PointLight(0xffd9b8, 0, 4); ilight.position.set(ox, oy + .6, rz - .4); g.add(ilight);
  // bed
  add(new RoundedBoxGeometry(.9, .55, .14, 3, .05), M.coralD, ox - .1, oB + .55, rz - rd + .15);
  add(new RoundedBoxGeometry(1.1, .2, 1.1, 3, .04), M.navyD, ox - .1, oB + .14, rz - rd + .7);
  add(new RoundedBoxGeometry(1.06, .2, 1.06, 3, .06), M.white, ox - .1, oB + .34, rz - rd + .7);
  add(new RoundedBoxGeometry(1.08, .08, .7, 3, .03), M.pink, ox - .1, oB + .47, rz - rd + .95);
  // sign + awning
  const c = document.createElement('canvas'); c.width = 1024; c.height = 320; const gg = c.getContext('2d');
  gg.drawImage(IMG.logo, 0, 0, 1024, 1024 * IMG.logo.height / IMG.logo.width);
  gg.globalCompositeOperation = 'source-in'; gg.fillStyle = '#293C4D'; gg.fillRect(0, 0, 1024, 320);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, .625), new THREE.MeshBasicMaterial({ map: tx, transparent: true }));
  sign.position.set(ox, oT + .78, fz + .07); g.add(sign);
  const aw = add(new THREE.CapsuleGeometry(.06, 2.0, 6, 16), M.coral, ox, oT + .22, fz + .14); aw.rotation.z = Math.PI / 2;
  // door (hinged right)
  const hinge = new THREE.Group(); hinge.position.set(oR, oy, fz + .08); g.add(hinge);
  const door = new THREE.Mesh(new RoundedBoxGeometry(ow, oh, .09, 3, .02), M.white); door.position.set(-ow / 2, 0, 0); hinge.add(door);
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(.035, .35, 6, 12), M.coral); handle.position.set(-ow + .18, 0, .08); hinge.add(handle);
  g.userData = { hinge, ilight };
  g.visible = false; scene.add(g);
  return g;
}

// ---------- 3D per-frame update ----------
function hideAll() { scene.traverse(o => { if (o.isMesh || o.isGroup) { if (o.parent === scene) o.visible = false; } }); }

function upd3D(t) {
  hideAll();
  // ---- S1 icon (0..9.2) ----
  if (t < 9.6) {
    const k = eo(pr(t, 0.25, 1.9));
    const up = eio(pr(t, 3.2, 0.9));
    const wpx = lerp(lerp(30, 575, k), 364, up);
    const sy = lerp(520, 290, up);
    const ry = (1 - k) * 2.6 + Math.sin(t * .9) * .18 * (1 - up * .3);
    const rx = .35 * (1 - k) + .12 + Math.sin(t * .7) * .05;
    setIcon(O.icon1, scenePos(0, 960, sy, 0), wpx, rx, ry, 0);
  }
  // ---- S3 podium ----
  if (t > 31.5 && t < 73) {
    const starts = { 1: 60.3, 2: 48.36, 3: 34.64 };
    for (const g of O.pod) {
      const k = spring(pr(t, starts[g.userData.n] - .15, 1.1) * 1.6);
      if (k <= 0) continue;
      g.visible = true; g.scale.set(1, Math.max(.001, k), 1);
    }
    // burst for 1st place
    burst(t, 61.35, scenePos(2, 958, 520, 0.5), 1.0);
  }
  // ---- S5 store ----
  if (t > 88.8 && t < 97) {
    const s = O.store; s.visible = true;
    const k = eo(pr(t, 89.7, 1.0));
    const p = scenePos(4, 1420 + (1 - k) * 260, 610, -1.2);
    s.position.copy(p); s.rotation.set(.06, .3 - (1 - k) * .4, 0);
    s.scale.setScalar(1.28);
    const o = eio(pr(t, 92.5, 1.3));
    s.userData.hinge.rotation.y = 1.75 * o;
    s.userData.ilight.intensity = 6 * o;
  }
  // ---- S6 welcome shapes ----
  if (t > 95.5 && t < 107) {
    O.wel.forEach((o, i) => {
      const u = o.userData; const k = backO(pr(t, 96.6 + i * .12, .9));
      if (k <= 0) return;
      o.visible = true;
      const p = scenePos(5, u.x, u.y + Math.sin(t * .8 + i) * 12, -.5 + (i % 3) * .3);
      o.position.copy(p); o.scale.setScalar(u.s * 1.25 * k);
      o.rotation.set(t * .3 + i, t * .4 + i * 2, i);
    });
  }
  // ---- S8 Next Night ----
  if (t > 113.3 && t < 121.4) {
    const c0 = scenePos(7, 960, 390, 0);
    const k = backO(pr(t, 114.45, .8));
    const dis = pr(t, 119.7, .5);
    if (dis < 1) setIcon(O.iconNN, c0, 300 * k * (1 - dis), .25, Math.sin(t * .8) * .25 + (1 - k) * 1.5, 0);
    burst(t, 119.75, c0, .9, true);
    O.nnShadow.visible = k > 0; O.nnShadow.position.copy(scenePos(7, 960, 640, -1)); O.nnShadow.scale.set(k, k, 1);
    O.nnShadow.material.opacity = .8;
    // ring draws around
    const rk = eio(pr(t, 114.9, 1.5));
    if (rk > 0) {
      O.ring.visible = true; O.ring.position.copy(c0); O.ring.rotation.set(.5, 0, -.06);
      const total = O.ringGeo.index.count; O.ringGeo.setDrawRange(0, Math.floor(total * rk / 6) * 6);
      if (rk < 1) {
        const pt = O.ringCurve.getPointAt(rk * .999).clone().applyEuler(O.ring.rotation).add(c0);
        O.ringBall.visible = true; O.ringBall.position.copy(pt); O.ringBall.scale.setScalar(.36);
      }
    }
  }
  // ---- S9 shapes & icon ----
  if (t > 124.8) {
    const c0 = scenePos(8, 960, 520, 0);
    const kin = eo(pr(t, 125.6, 1.4));
    const bk = pr(t, 134.2, .6);
    const up = eio(pr(t, 130.9, .9));
    const center = scenePos(8, 960, lerp(500, 300, up), 0);
    const dk = darkAt(t);
    O.fin.forEach((o, i) => {
      const u = o.userData; if (kin <= 0 || bk >= 1) return;
      o.visible = true;
      const a = u.a0 + t * .35;
      const rx = lerp(9.5, 7.6, dk) * u.rad * lerp(1, .62, up), ry = lerp(2.4, 2.6, dk) * u.rad * lerp(1, .55, up);
      const cc = dk > .5 ? center : c0;
      const fly = 1 - kin;
      o.position.set(cc.x + Math.cos(a) * rx * (1 + fly * .8), cc.y + Math.sin(a) * ry + u.yo + fly * 3 * Math.sin(u.ph), cc.z + Math.sin(a) * 2.2);
      const s = u.s * 1.2 * kin * (1 - bk) * lerp(1, .8, up);
      o.scale.setScalar(Math.max(.001, s));
      o.rotation.set(t * u.rs + u.ph, t * .6 + i, u.ph);
    });
    // big icon in dark finale
    if (dk > 0) {
      const ik = backO(pr(t, 127.75, .9));
      const lock = eio(pr(t, 134.9, 1.0));
      const wpx = lerp(lerp(348, 270, up), 307, lock) * ik;
      const sy = lerp(lerp(500, 296, up), 430, lock);
      setIcon(O.iconEnd, scenePos(8, 960, sy, 0), wpx, .15 + Math.sin(t) * .05, Math.sin(t * .7) * .3 * (1 - lock), 0);
    }
    burst(t, 134.3, center, 1.3, false, true);
  }
}
function burst(t, t0, c, sz = 1, coralOnly = false, wide = false) {
  const k = pr(t, t0, 1.8);
  if (k <= 0 || k >= 1) return;
  const r = rng(Math.floor(t0 * 100));
  O.burst.forEach((m, i) => {
    const a = r() * Math.PI * 2, el = (r() - .5) * 2, sp = (2 + r() * 4) * sz * (wide ? 1.6 : 1);
    const e = eo(k);
    m.visible = true;
    m.material = coralOnly ? M.coral : (i % 3 ? M.coral : M.white);
    m.position.set(c.x + Math.cos(a) * sp * e, c.y + el * sp * .6 * e - k * k * 1.2, c.z + Math.sin(a) * sp * .5 * e);
    m.scale.setScalar(.09 * (1 - k) * (0.6 + r()) * sz);
    m.rotation.set(t * 3 + i, t * 2, i);
  });
}

// ---------- 2D scenes ----------
const DAYS = [40583, 79713, 120345, 70718, 92891, 68520, 76140, 44343, 72414, 101853, 52640, 95290, 105746, 61188, 16974, 81219, 216503, 48390, 29898, 58675, 58970, 97495, 153807, 122432, 42212, 185163, 82730, 259637, 94879, 60485, 136680];

function S1(c, t, o) { // dark opening
  const fa = gone(t, 8.7, .4);
  c.save(); c.translate(o.x, o.y); c.globalAlpha = fa;
  const out1 = gone(t, 5.15, .35);
  if (out1 > 0) {
    c.globalAlpha = fa * out1;
    wordLine(c, [['A', 3.5], ['MAIOR', 3.62], ['BLACK', 3.94, C.coral]], 960, 768, 122, t, { color: '#fff' });
    wordLine(c, [['DA', 4.2], ['NOSSA', 4.32], ['HISTÓRIA.', 4.52]], 960, 888, 122, t, { color: '#fff' });
  }
  c.globalAlpha = fa;
  wordLine(c, [['COMEÇA', 5.45], ['COM', 5.7]], 960, 768, 122, t, { color: '#fff' });
  wordLine(c, [['ESSE', 6.78], ['TIME.', 7.38, C.coral]], 960, 888, 122, t, { color: '#fff' });
  c.restore();
}

function S2(c, t, o) { // outubro em números
  c.save(); c.translate(o.x, o.y);
  kicker(c, 'OUTUBRO EM NÚMEROS', 960, 140, t, 9.5);
  // headline
  const hg = gone(t, 11.45, .35);
  if (hg > 0) {
    c.save(); c.globalAlpha = hg; c.translate(0, -(1 - hg) * 40);
    wordLine(c, [['OUTUBRO', 9.55], ['MOSTROU', 10.05]], 960, 470, 92, t);
    wordLine(c, [['DO', 10.45], ['QUE', 10.6], ['ESSE', 10.75], ['TIME', 11.0], ['É', 11.22], ['CAPAZ.', 11.3, C.coral]], 960, 584, 92, t);
    c.restore();
  }
  // cards
  const cw = 564, gap = 46, ch = 276;
  const tA = [12.2, 16.0, 22.85];
  const n = tA.filter(x => t > x - .2).length;
  const cntK = [0, 1, 2, 3].map(i => i);
  // animated centering: positions depend on number of visible cards, eased
  const posFor = (i, count) => { const tot = count * cw + (count - 1) * gap; return 960 - tot / 2 + i * (cw + gap); };
  const kk = [pr(t, 15.8, .7), pr(t, 22.65, .7)].map(eio);
  const count = 1 + kk[0] + kk[1];
  const lift = eio(pr(t, 25.6, .9));
  const y0 = lerp(375, 240, lift);
  const labels = ['PEDIDOS', 'TOTAL DE VENDAS', 'TICKET MÉDIO'];
  for (let i = 0; i < 3; i++) {
    const k = backO(pr(t, tA[i] - .15, .6));
    if (k <= 0) continue;
    const x = posFor(i, count);
    c.save(); c.globalAlpha = clamp(k * 1.5); c.translate(x + cw / 2, y0 + ch / 2); c.scale(.85 + .15 * k, .85 + .15 * k); c.translate(-cw / 2, -ch / 2);
    card(c, 0, 0, cw, ch);
    txt(c, labels[i], 36, 62, 22, C.ink, { ls: 22 * .32, w: 600, a: .85 });
    if (i === 0) { odo(c, 646, pr(t, 12.4, 1.3), 34, 172, 92, C.ink); pill(c, 'MAIOR DO ANO', 34, 198, 21, C.coral, '#fff', { k: pr(t, 14.2, .5) }); }
    if (i === 1) { odo(c, 2828532, pr(t, 16.2, 1.8), 34, 172, 76, C.ink, { pre: 'R$ ' }); pill(c, '+44% VS OUTUBRO/25', 34, 198, 21, C.coral, '#fff', { k: pr(t, 19.0, .5) }); }
    if (i === 2) { odo(c, 4739, pr(t, 23.15, 1.3), 34, 172, 92, C.ink, { pre: 'R$ ' }); }
    c.restore();
  }
  // chart
  const ck = eo(pr(t, 25.85, .8));
  if (ck > 0) {
    const x = 72, y = 604, w = 1776, h = 388;
    c.save(); c.globalAlpha = ck; c.translate(0, (1 - ck) * 60);
    card(c, x, y, w, h);
    txt(c, 'VENDAS POR DIA · OUTUBRO', x + 36, y + 62, 22, C.ink, { ls: 22 * .32, w: 600, a: .85 });
    const bx = x + 70, bw = 30, step = (w - 140) / 30, base = y + h - 52, maxH = 210, mx = 259637;
    for (let i = 0; i < 31; i++) {
      const g = eo(pr(t, 26.1 + i * .045, .7));
      const bh = Math.max(4, DAYS[i] / mx * maxH * g);
      const hi = i === 27;
      rr(c, bx + i * step - bw / 2, base - bh, bw, bh, 5);
      c.fillStyle = hi ? C.coral : C.bar; c.fill();
      if (i % 3 === 0) txt(c, String(i + 1), bx + i * step, base + 30, 15, hi ? C.coral : C.slate, { al: 'center', w: 600, a: .8 });
    }
    // highlight label
    const hk = pr(t, 27.2, .5);
    const hx = bx + 27 * step;
    txt(c, 'MELHOR DIA', 1628, y + 26, 16, C.coral, { al: 'center', ls: 16 * .3, w: 600, a: eo(hk) });
    if (hk > 0) {
      c.save(); c.globalAlpha *= eo(hk);
      rr(c, 1432, y + 42, 392, 64, 14); c.fillStyle = C.ink; c.fill();
      const vk = pr(t, 27.3, 2.6);
      const vs = vk > 0 ? 'R$ ' + fmt(259637 * eo(vk)) : 'R$ 0';
      txt(c, '28/10 · ' + vs, 1628, y + 85, 30, '#fff', { al: 'center', w: 600 });
      c.restore();
    }
    c.restore();
    txt(c, 'Fonte: Shopify · total de vendas da Zissou · outubro de 2026', 960, 1052, 16, C.slate, { al: 'center', w: 600, a: ck * .55 });
  }
  c.restore();
}

function podCard(c, t, x, y, d, o) {
  // d: {place, name, store, value, ped, pct, tags:[[s,t]], img, t0, tv, tp, tc, first}
  const k = backO(pr(t, d.t0, .6));
  if (k <= 0) return;
  const w = 490, h = 430;
  c.save(); c.globalAlpha = clamp(k * 1.6);
  c.translate(x + w / 2, y + h); c.scale(.9 + .1 * k, .9 + .1 * k); c.translate(-w / 2, -h);
  card(c, 0, 0, w, h, { border: d.first ? C.coral : null });
  avatar(c, d.img, 30 + 58, 0, 116, { k: pr(t, d.t0 + .15, .6), ring: d.first ? C.coral : null });
  txt(c, d.place, 170, 44, 21, C.coral, { ls: 21 * .32, w: 600 });
  txt(c, d.name, 30, 112, 38, C.ink, { mw: w - 60 });
  txt(c, d.store, 30, 150, 23, C.slate, { w: 600 });
  if (t > d.tv - .1) odo(c, d.value, pr(t, d.tv, 1.3), 28, 232, 62, d.first ? C.coral : C.ink, { pre: 'R$ ' });
  const pk = ap(t, d.tp, .4);
  if (pk.a > 0) {
    txt(c, `${d.ped} pedidos`, 30, 296, 28, C.ink, { w: 600, a: pk.a });
    const pw = tw(c, `${d.ped} pedidos`, 28, 600);
    pill(c, `${d.pct}% DA META`, 30 + pw + 16, 268, 19, d.first ? C.coral : C.ink, '#fff', { k: pr(t, d.tc, .5) });
  }
  d.tags.forEach((tg, j) => pill(c, tg[0], 30, 330 + j * 44, 16, C.coral, '#fff', { k: pr(t, tg[1], .5) }));
  c.restore();
}

function S3(c, t, o) { // podium
  c.save(); c.translate(o.x, o.y);
  kicker(c, 'PÓDIO DE OUTUBRO', 954, 104, t, 33.3);
  podCard(c, t, 1222, 446, { place: '3º LUGAR', name: 'Daiani Moreira da Silva', store: 'Shopping Morumbi', value: 177281, ped: 30, pct: 355, tags: [['MAIS PEDIDOS DO MÊS', 41.7], ['1º MÊS NO TIME', 46.0]], img: IMG.daiani, t0: 35.55, tv: 38.4, tp: 40.7, tc: 43.8 });
  podCard(c, t, 200, 382, { place: '2º LUGAR', name: 'Margarida Rodrigues', store: 'Itaim', value: 190063, ped: 27, pct: 111, tags: [['MAIS ATENDIMENTOS: 225', 58.0]], img: IMG.margarida, t0: 49.05, tv: 50.9, tp: 52.5, tc: 54.0 });
  podCard(c, t, 712, 296, { place: '1º LUGAR', name: 'Lucas Gonçalves', store: 'Gabriel', value: 232431, ped: 23, pct: 141, tags: [['+46% VS SETEMBRO', 68.85]], img: IMG.lucas, t0: 61.3, tv: 63.3, tp: 65.2, tc: 66.6, first: true });
  c.restore();
}

function ringC(c, cx, cy, r, k, color, label) {
  c.save();
  c.lineWidth = 10; c.lineCap = 'round';
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.strokeStyle = '#EEF0F3'; c.stroke();
  if (k > 0) { c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); c.strokeStyle = color; c.stroke(); }
  c.restore();
  txt(c, label, cx, cy + 12, 34, C.ink, { al: 'center' });
  txt(c, 'CONVERSÃO', cx, cy + 38, 11, C.slate, { al: 'center', ls: 3, w: 600 });
}
function S4(c, t, o) { // team in action
  c.save(); c.translate(o.x, o.y);
  kicker(c, 'O TIME EM AÇÃO', 960, 104, t, 72.5);
  const nk = pr(t, 73.95, 1.4);
  if (nk > 0) odo(c, 1618, nk, 960, 350, 160, C.ink, { al: 'center' });
  kicker(c, 'ATENDIMENTOS EM OUTUBRO', 960, 408, t, 74.3, { size: 22, color: C.slate });
  const cards = [
    { x: 96, t0: 77.1, a: 817, la: 'ORÇAMENTOS', ta: 77.25, b: 277, lb: 'VIRARAM VENDA', tb: 79.0, pct: 34, tpc: 79.4, col: C.slate },
    { x: 979, t0: 81.6, a: 836, la: 'LEADS', ta: 81.75, b: 245, lb: 'FECHAMENTOS', tb: 83.65, pct: 29, tpc: 84.6, col: C.coral, hl: 85.5 },
  ];
  for (const d of cards) {
    const k = backO(pr(t, d.t0, .6)); if (k <= 0) continue;
    const w = 837, h = 338, y = 564;
    c.save(); c.globalAlpha = clamp(k * 1.5); c.translate(d.x + w / 2, y + h / 2); c.scale(.9 + .1 * k, .9 + .1 * k); c.translate(-w / 2, -h / 2);
    card(c, 0, 0, w, h, { border: d.hl ? C.coral : null, ba: d.hl ? eo(pr(t, d.hl, .5)) : 0 });
    odo(c, d.a, pr(t, d.ta, 1.0), 44, 150, 66, C.ink);
    txt(c, d.la, 46, 202, 16, C.slate, { ls: 16 * .3, w: 600 });
    const bk = ap(t, d.tb - .1, .4);
    if (bk.a > 0) {
      txt(c, '→', 236, 148, 46, C.coral, { a: bk.a });
      odo(c, d.b, pr(t, d.tb, 1.0), 290, 150, 66, C.coral);
      txt(c, d.lb, 292, 202, 16, C.slate, { ls: 16 * .3, w: 600, a: bk.a });
    }
    ringC(c, 712, 160, 86, eo(pr(t, d.tpc, 1.2)) * d.pct / 100, d.col, Math.round(d.pct * eo(pr(t, d.tpc, 1.2))) + '%');
    if (d.hl) pill(c, 'INCRÍVEIS 29%', 44, 252, 18, C.coral, '#fff', { k: pr(t, d.hl, .5) });
    c.restore();
  }
  c.restore();
}

function S5(c, t, o) { // BH
  c.save(); c.translate(o.x, o.y);
  kicker(c, 'A ZISSOU CRESCE', 152, 382, t, 89.95, { al: 'left', size: 34 });
  wordLine(c, [['OLÁ,', 91.0], ['BH!', 91.5, C.coral]], 152, 564, 170, t, { al: 'left' });
  const p = ap(t, 92.55, .5);
  txt(c, 'Nossa nova loja no BH Shopping.', 152, 640 + p.dy, 40, C.slate, { w: 600, a: p.a, blur: p.blur });
  c.restore();
}

const WEL = [['Bernardo', 'Vieira', 'bernardo', 98.55, 'BV'], ['Alex', 'Martins', 'alex', 99.65, 'AM'], ['Yasmin', 'Vicente', 'yasmin', 100.78, 'YV'], ['Camila', 'Dias', 'camila', 101.9, 'CD'], ['Silvia', 'Souza', 'silvia', 102.88, 'SS']];
const WCOL = [['#EE9A90', '#DD6E63'], ['#7F93B5', '#5A7196'], ['#E99070', '#D06A4E'], ['#2C3A50', '#18222F'], ['#F2A9A0', '#E47F74']];
function S6(c, t, o) { // welcome
  c.save(); c.translate(o.x, o.y);
  const swap = pr(t, 103.3, .4);
  if (swap < 1) kicker(c, 'REFORÇOS NO TIME', 960, 230, t, 96.55, { a: 1 - eio(swap) });
  if (swap > 0) wordLine(c, [['QUE', 103.85], ['BOM', 103.95], ['TER', 104.05], ['VOCÊS', 104.2], ['AQUI!', 104.5, C.coral]], 960, 250, 74, t);
  const cw = 306, ch = 404, gap = 42;
  // eased count for centering
  let cnt = 0; WEL.forEach(w => { cnt += eio(pr(t, w[3] - .2, .6)); });
  WEL.forEach((wd, i) => {
    const k = backO(pr(t, wd[3] - .2, .6)); if (k <= 0) return;
    const tot = cnt * cw + (cnt - 1) * gap;
    const x = 960 - tot / 2 + i * (cw + gap);
    const act = (i === WEL.length - 1 ? pr(t, wd[3] - .2, .3) * (1 - pr(t, 104.3, .6)) : pr(t, wd[3] - .2, .3) * (1 - pr(t, WEL[i + 1][3] - .2, .5)));
    const sc = (.85 + .15 * k) * (1 + .06 * act);
    const y = 440;
    c.save(); c.globalAlpha = clamp(k * 1.5); c.translate(x + cw / 2, y + ch / 2); c.scale(sc, sc); c.translate(-cw / 2, -ch / 2);
    card(c, 0, 0, cw, ch);
    avatar(c, IMG[wd[2]], cw / 2, 138, 150, { k: pr(t, wd[3] - .05, .6), ring: act > .3 ? C.coral : null, ini: wd[4], c1: WCOL[i][0], c2: WCOL[i][1] });
    txt(c, wd[0], cw / 2, 278, 44, C.ink, { al: 'center', mw: cw - 30 });
    txt(c, wd[1], cw / 2, 322, 28, C.slate, { al: 'center', w: 600 });
    rr(c, cw / 2 - 20, 352, 40, 5, 3); c.fillStyle = C.coral; c.fill();
    c.restore();
  });
  c.restore();
}

function S7(c, t, o) { // promotions
  c.save(); c.translate(o.x, o.y);
  wordLine(c, [['A', 106.95], ['GENTE', 107.05], ['CRESCE', 107.3], ['JUNTO.', 107.65, C.coral]], 960, 248, 100, t);
  const P = [['Margarida', 'margarida', 334, 108.25], ['Cecilia', 'cecilia', 990, 108.8]];
  for (const [nm, im, x, t0] of P) {
    const k = backO(pr(t, t0, .6)); if (k <= 0) continue;
    const w = 590, h = 446, y = 426;
    c.save(); c.globalAlpha = clamp(k * 1.5); c.translate(x + w / 2, y + h / 2); c.scale(.85 + .15 * k, .85 + .15 * k); c.translate(-w / 2, -h / 2);
    card(c, 0, 0, w, h);
    avatar(c, IMG[im], w / 2, 150, 184, { k: pr(t, t0 + .1, .6) });
    txt(c, nm, w / 2, 316, 62, C.ink, { al: 'center' });
    txt(c, 'Nova líder de loja', w / 2, 372, 34, C.coral, { al: 'center', w: 600 });
    pill(c, 'PROMOÇÃO', w - 26, 26, 17, C.coral, '#fff', { k: pr(t, 109.55, .5), al: 'right' });
    c.restore();
  }
  c.restore();
}

function S8(c, t, o) { // next night
  c.save(); c.translate(o.x, o.y);
  const p = ap(t, 114.65, .55);
  if (p.a > 0) txt(c, 'NEXT NIGHT', 960, 815 + p.dy, 112, C.ink, { al: 'center', ls: 112 * .09, a: p.a, blur: p.blur });
  const q = ap(t, 116.25, .5);
  if (q.a > 0) txt(c, 'Mais motivos para voltar.', 960, 900 + q.dy, 42, C.slate, { al: 'center', w: 600, a: q.a, blur: q.blur });
  c.restore();
}

function S9(c, t, o) { // finale
  c.save(); c.translate(o.x, o.y);
  // light phrases
  const ph = [
    { w: [['CADA', 121.9], ['OPORTUNIDADE.', 122.1, C.coral]], kick: 'VAMOS BUSCAR', tk: 121.0, out: 123.0 },
    { w: [['CADA', 123.15], ['CONTATO', 123.35], ['IMPORTA,', 123.7]], out: 124.35 },
    { w: [['CADA', 124.42], ['ATENDIMENTO', 124.62], ['CONTA.', 125.2, C.coral]], out: 125.75 },
    { w: [['UM', 126.6], ['SÓ', 126.78], ['TIME.', 126.98, C.coral]], kick: 'TODAS AS ÁREAS', tk: 125.82, out: 127.45 },
  ];
  for (const p of ph) {
    const g = gone(t, p.out, .35);
    if (g <= 0 || t < (p.tk || p.w[0][1]) - .1) continue;
    const bl = (1 - g) * 14;
    c.save(); c.globalAlpha = g;
    if (p.kick) kicker(c, p.kick, 960, 452, t, p.tk, { size: 24 });
    wordLine(c, p.w, 960, 560, 96, t, { blur: bl });
    c.restore();
  }
  // dark finale text
  const fg = gone(t, 134.1, .4);
  if (fg > 0 && t > 131) {
    c.save(); c.globalAlpha = fg;
    wordLine(c, [['VAMOS', 131.3], ['FAZER', 131.45], ['A', 131.6], ['MAIOR', 131.7], ['BLACK', 131.85, C.coral]], 960, 776, 88, t, { color: '#fff' });
    wordLine(c, [['DA', 132.2], ['NOSSA', 132.35], ['HISTÓRIA.', 132.5]], 960, 872, 88, t, { color: '#fff' });
    c.restore();
  }
  // logo lockup
  const lk = eo(pr(t, 135.35, .9));
  if (lk > 0) {
    const lw = 440, lh = lw * IMG.logo.height / IMG.logo.width;
    c.save(); c.globalAlpha = lk; c.filter = `blur(${(1 - lk) * 8}px)`;
    c.drawImage(IMG.logo, 960 - lw / 2, 560 + 18 * (1 - lk), lw, lh);
    c.restore();
  }
  c.restore();
}

const SCENES = [S1, S2, S3, S4, S5, S6, S7, S8, S9];

// ---------- streak during pans ----------
function streak(c, t) {
  for (let i = 0; i < TR.length; i++) {
    const k = pr(t, TR[i] - TRD / 2, TRD);
    if (k <= 0 || k >= 1) continue;
    const a = Math.sin(k * Math.PI);
    const dx = A[i + 1].x - A[i].x, dy = A[i + 1].y - A[i].y; const L = Math.hypot(dx, dy);
    const ux = dx / L, uy = dy / L;
    const cx = 960 + (0.5 - k) * 900 * ux, cy = 540 + (0.5 - k) * 900 * uy;
    c.save(); c.globalAlpha = a * .9; c.strokeStyle = C.coral; c.lineWidth = 3; c.lineCap = 'round';
    c.filter = 'blur(1px)';
    c.beginPath(); c.moveTo(cx - ux * 380, cy - uy * 380 - 30); c.lineTo(cx + ux * 380, cy + uy * 380 + 30); c.stroke();
    c.restore();
  }
}

// ---------- frame ----------
function composite(c, t) {
  const cam = camAt(t); CAM = cam;
  const dk = darkAt(t);
  drawBG(c, dk);
  camera.position.set(toU(cam.x - 960 + 960), -toU(cam.y), D);
  camera.lookAt(toU(cam.x), -toU(cam.y), 0);
  upd3D(t);
  renderer.render(scene, camera);
  c.drawImage(glc, 0, 0);
  for (let i = 0; i < 9; i++) {
    if (Math.abs(i - cam.s) > 1) continue;
    const o = sceneOrigin(i);
    if (o.x < -2200 || o.x > 2200 || o.y < -1400 || o.y > 1400) continue;
    o.x += 0; o.y += 0;
    SCENES[i](c, t, { x: o.x, y: o.y });
  }
  streak(c, t);
}
// screen-space offset for a scene: scene-local (0..1920) maps to screen by + (A[i] - CAM) ; local center 960,540 sits at A[i]
function renderAt(t) {
  const cam = camAt(t);
  // motion blur during pans
  const dt = 1 / 30;
  const c2 = camAt(t + dt / 2), c1 = camAt(t - dt / 2);
  const sp = Math.hypot(c2.x - c1.x, c2.y - c1.y);
  const N = sp > 40 ? 8 : sp > 8 ? 4 : 1;
  if (N === 1) { composite(ctx, t); return N; }
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < N; i++) {
    const ts = t + (i / (N - 1) - .5) * dt * .6;
    composite(tctx, ts);
    ctx.globalAlpha = 1 / (i + 1); ctx.drawImage(tmp, 0, 0); ctx.globalAlpha = 1;
  }
  return N;
}

window.ready = (async () => {
  await document.fonts.load('700 40px Zona'); await document.fonts.load('600 40px Zona');
  const names = ['lucas', 'margarida', 'daiani', 'cecilia', 'alex', 'bernardo', 'camila', 'yasmin', 'silvia'];
  for (const n of names) { try { IMG[n] = await loadImg(`../assets/foto_${n}.jpg`); } catch (e) { IMG[n] = null; } }
  IMG.logo = await loadImg('../assets/logo.png');
  const shape = await (await fetch('../assets/icon_shape.json')).json();
  build(shape);
  renderer.compile(scene, camera);
  return true;
})();
window.renderAt = renderAt;
