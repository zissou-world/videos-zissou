// "Conversas que convertem" — ~96 s, 1920x1080. Fundo claro Zissou, números grandes, um ícone 3D por cena.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1920, H = 1080;
const C = { coral: '#E4796F', coralL: '#FBE9E6', ink: '#141B26', slate: '#5A7196', navy: '#293C4D', gray: '#C9CDD3', grayL: '#EEF0F2' };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const pr = (t, a, d) => clamp((t - a) / d);
const eo = x => 1 - Math.pow(1 - clamp(x), 3);
const eo5 = x => 1 - Math.pow(1 - clamp(x), 5);
const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const backO = x => { x = clamp(x); const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const out = document.getElementById('out'), ctx = out.getContext('2d');
const tmp = document.getElementById('tmp'), tctx = tmp.getContext('2d');
const glc = document.getElementById('gl');
const IMG = {};
let CUES, SC = [], TR = [], A = [];
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

// ---------- timeline helpers ----------
// word time inside a scene: Wd(scene, 'palavra', n)
function Wd(si, w, n = 1) {
  let k = 0; const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  for (const x of CUES.words) if (x.scene === si && norm(x.w) === norm(w) && ++k === n) return x.t;
  console.error('word not found', si, w, n); return SC[si].voStart;
}
const TRD = .85;
function camAt(t) {
  for (let i = 0; i < A.length; i++) {
    const s0 = i === 0 ? 0 : TR[i - 1] + TRD / 2, s1 = i === A.length - 1 ? 1e9 : TR[i] - TRD / 2;
    if (t <= s1) { const k = i === A.length - 1 ? pr(t, s0, 6) : pr(t, s0, s1 - s0); return { x: A[i].x + 36 * (k - .5), y: A[i].y, s: i }; }
    if (i < A.length - 1 && t < TR[i] + TRD / 2) {
      const k = eio(pr(t, s1, TRD));
      return { x: lerp(A[i].x + 18, A[i + 1].x - 18, k), y: lerp(A[i].y, A[i + 1].y, k), s: k < .5 ? i : i + 1, pan: k };
    }
  }
}
let CAM = { x: 960, y: 540 };

// ---------- 2D helpers ----------
function font(size, w = 700) { return `${w} ${size}px Zona`; }
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function tw(c, s, size, w = 700, ls = 0) { c.save(); c.font = font(size, w); c.letterSpacing = `${ls}px`; const m = c.measureText(s).width; c.restore(); return m; }
function txt(c, s, x, y, size, color, o = {}) {
  c.save(); c.font = font(size, o.w || 700); c.letterSpacing = `${o.ls || 0}px`;
  c.textAlign = o.al || 'left'; c.fillStyle = color; c.globalAlpha *= (o.a ?? 1);
  if (o.blur) c.filter = `blur(${o.blur}px)`;
  let sx = 1; if (o.mw) { const m = c.measureText(s).width; if (m > o.mw) sx = o.mw / m; }
  if (sx !== 1) { c.translate(x, y); c.scale(sx, 1); c.fillText(s, 0, 0); } else c.fillText(s, x, y);
  c.restore();
}
function ap(t, t0, d = .55) { const k = eo5(pr(t, t0, d)); return { a: clamp(k * 1.3), dy: (1 - k) * 30, blur: (1 - k) * 8, k }; }
// masked rise (Apple-like)
function rise(c, s, x, y, size, color, t, t0, o = {}) {
  const k = eo5(pr(t, t0, o.d || .65)); if (k <= 0) return;
  const ko = o.out ? eio(pr(t, o.out, .4)) : 0; if (ko >= 1) return;
  const w = tw(c, s, size, o.w || 700, o.ls || 0);
  const x0 = o.al === 'center' ? x - w / 2 : o.al === 'right' ? x - w : x;
  c.save(); c.beginPath(); c.rect(x0 - 20, y - size * 1.05, w + 40, size * 1.4); c.clip();
  txt(c, s, x, y + (1 - k) * size * 1.1 - ko * size * .4, size, color, { ...o, a: (o.a ?? 1) * clamp(k * 1.4) * (1 - ko), blur: (1 - k) * 3 + ko * 6 });
  c.restore();
}
function kicker(c, s, x, y, t, t0, o = {}) { const p = ap(t, t0, .6); txt(c, s, x, y + p.dy * .6, o.size || 26, o.color || C.coral, { ls: (o.size || 26) * .32, w: 700, a: p.a, blur: p.blur, al: o.al }); }
function card(c, x, y, w, h, o = {}) {
  c.save(); c.globalAlpha *= (o.a ?? 1);
  c.shadowColor = 'rgba(25,35,55,0.09)'; c.shadowBlur = 44; c.shadowOffsetY = 16;
  rr(c, x, y, w, h, o.r || 24); c.fillStyle = o.fill || '#fff'; c.fill(); c.restore();
}
function pill(c, s, x, y, size, bg, fg, k, o = {}) {
  if (k <= 0) return;
  const padX = size * .9, h = size * 2.2, w = tw(c, s, size, 700, o.ls || 0) + padX * 2;
  const px = o.al === 'center' ? x - w / 2 : x;
  c.save(); c.globalAlpha *= clamp(k * 1.5); const sc = .7 + .3 * backO(k);
  c.translate(px + w / 2, y + h / 2); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
  if (o.shadow) { c.shadowColor = 'rgba(25,35,55,0.14)'; c.shadowBlur = 24; c.shadowOffsetY = 8; }
  rr(c, 0, 0, w, h, h / 2); c.fillStyle = bg; c.fill(); c.shadowColor = 'transparent';
  txt(c, s, w / 2, h / 2 + size * .36, size, fg, { al: 'center', ls: o.ls || 0 });
  c.restore();
}
// rolling number: value, decimals, prefix/suffix
function num(c, value, k, x, y, size, color, o = {}) {
  if (k <= 0) return;
  const e = o.static ? 1 : eo(k), v = value * e, dec = o.dec || 0;
  let s = dec ? v.toFixed(dec).replace('.', ',') : Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (k >= 1) s = dec ? value.toFixed(dec).replace('.', ',') : Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const full = (o.pre || '') + s + (o.suf || '');
  const p = clamp(k * 4);
  txt(c, full, x, y + (1 - eo5(p)) * 24, size, color, { al: o.al, a: p, blur: (1 - p) * 6, ls: o.ls ?? -size * .02 });
}
function hbar(c, x, y, wMax, h, frac, k, color, track = true) {
  if (track) { rr(c, x, y, wMax, h, h / 2); c.fillStyle = C.grayL; c.fill(); }
  const w = Math.max(h, wMax * frac * eo(k)); if (k <= 0) return;
  rr(c, x, y, w, h, h / 2); c.fillStyle = color; c.fill();
}
function check(c, x, y, s, k, color = C.coral) {
  if (k <= 0) return;
  c.save(); c.globalAlpha *= clamp(k * 2);
  const sc = .6 + .4 * backO(k); c.translate(x, y); c.scale(sc, sc);
  c.beginPath(); c.arc(0, 0, s / 2, 0, Math.PI * 2); c.fillStyle = color; c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = s * .12; c.lineCap = 'round'; c.lineJoin = 'round';
  const p = eo(pr(k, .3, .7));
  c.beginPath(); c.moveTo(-s * .2, 0); const m = [-s * .05, s * .15], e = [s * .22, -s * .15];
  if (p < .4) { c.lineTo(lerp(-s * .2, m[0], p / .4), lerp(0, m[1], p / .4)); }
  else { c.lineTo(m[0], m[1]); c.lineTo(lerp(m[0], e[0], (p - .4) / .6), lerp(m[1], e[1], (p - .4) / .6)); }
  c.stroke(); c.restore();
}
function person(c, x, y, s, color, k) {
  if (k <= 0) return;
  c.save(); c.globalAlpha *= clamp(k * 1.5); const sc = .6 + .4 * backO(k); c.translate(x, y); c.scale(sc, sc);
  c.fillStyle = color; c.beginPath(); c.arc(0, -s * .62, s * .26, 0, Math.PI * 2); c.fill();
  rr(c, -s * .38, -s * .28, s * .76, s * .62, [s * .38, s * .38, s * .1, s * .1]); c.fill(); c.restore();
}

// ---------- background ----------
function blob(c, x, y, r, col, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
function drawBG(c, t) {
  c.fillStyle = '#F4F3F0'; c.fillRect(0, 0, W, H);
  blob(c, -60 + 40 * Math.sin(t * .15), -80, 900, '240,200,188', .5);
  blob(c, 1700 + 120 * Math.cos(t * .12), 1080, 900, '214,224,236', .55);
  blob(c, 1000, 540, 700, '255,255,255', .5);
}

// ---------- THREE ----------
const renderer = new THREE.WebGLRenderer({ canvas: glc, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0, 0);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = .8;
const D = 20;
const camera = new THREE.PerspectiveCamera(2 * Math.atan(5.4 / D) * 180 / Math.PI, W / H, .5, 200);
const key = new THREE.DirectionalLight(0xffffff, 1.8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 8; key.shadow.bias = -.0005;
Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 });
scene.add(key); scene.add(key.target);
scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e2dc, .9));
const toU = px => px / 100;
function scenePos(i, sx, sy, z = 0) { return V(toU(A[i].x + sx - 960), -toU(A[i].y + sy - 540), z); }
const M = {
  white: new THREE.MeshPhysicalMaterial({ color: 0xfaf9f7, roughness: .38, clearcoat: .4, clearcoatRoughness: .35, sheen: .3 }),
  coral: new THREE.MeshPhysicalMaterial({ color: 0xE4796F, roughness: .36, clearcoat: .45, clearcoatRoughness: .3 }),
  navy: new THREE.MeshPhysicalMaterial({ color: 0x293C4D, roughness: .4, clearcoat: .4 }),
  slate: new THREE.MeshPhysicalMaterial({ color: 0x5A7196, roughness: .4, clearcoat: .3 }),
  shadow: new THREE.ShadowMaterial({ opacity: .16 }),
};
const sh = g => { g.traverse(o => { if (o.isMesh) { o.castShadow = true; } }); return g; };
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
function ext(shape, depth, bev, segs = 5) { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: segs, curveSegments: 24 }); g.center(); return g; }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

function mBubbles() {
  const g = new THREE.Group();
  const bubble = (w, h, mat) => {
    const s = new THREE.Shape(); const r = h * .42;
    s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r * .3); s.lineTo(-w / 2 - r * .55, -h / 2 - r * .45); s.lineTo(-w / 2 + r * .6, -h / 2); s.closePath();
    return new THREE.Mesh(ext(s, .3, .12, 6), mat);
  };
  const b1 = bubble(2.5, 1.45, M.coral); b1.position.set(.35, -.35, .3); g.add(b1);
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(.13, 24, 16), M.white, .35 + (i - 1) * .48, -.35, .58));
  const b2 = bubble(2.0, 1.2, M.white); b2.position.set(-.55, 1.05, -.25); b2.rotation.y = Math.PI; g.add(b2);
  for (let i = 0; i < 2; i++) g.add(mesh(new RoundedBoxGeometry(i ? .85 : 1.3, .14, .05, 2, .03), M.slate, -.55 - (i ? .23 : 0), 1.2 - i * .3, .02));
  return sh(g);
}
function mQuote() {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(2.0, 2.6, .16, 4, .07), M.white));
  g.add(mesh(new RoundedBoxGeometry(2.0, .5, .17, 4, .07), M.coral, 0, 1.05, .01));
  [[.9, .45], [1.3, .1], [1.1, -.25], [.7, -.6]].forEach(([w, y], i) => g.add(mesh(new RoundedBoxGeometry(w, .12, .04, 2, .03), i ? M.slate : M.navy, -.95 + w / 2 + .25, y, .1)));
  const badge = new THREE.Group(); badge.position.set(.78, -1.08, .3);
  badge.add(mesh(new THREE.CylinderGeometry(.48, .48, .18, 48).rotateX(Math.PI / 2), M.coral));
  const ck = new THREE.Shape(); ck.moveTo(-.2, .02); ck.lineTo(-.06, -.14); ck.lineTo(.22, .16); ck.lineTo(.17, .21); ck.lineTo(-.06, -.03); ck.lineTo(-.15, .07); ck.closePath();
  badge.add(mesh(ext(ck, .04, .02, 2), M.white, .01, 0, .12)); g.add(badge);
  // link chain
  const ring = (x, y) => { const m = mesh(new THREE.TorusGeometry(.2, .065, 16, 40), M.navy, x, y, .25); m.scale.set(1.5, 1, 1); m.rotation.z = .7; return m; };
  g.add(ring(-.62, -1.1)); g.add(ring(-.3, -.82));
  return sh(g);
}
function mStore() {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(2.8, 2.0, 1.8, 4, .06), M.white, 0, 0, 0));
  g.add(mesh(new RoundedBoxGeometry(3.05, .18, 2.0, 3, .06), M.white, 0, 1.08, 0));
  for (let i = 0; i < 6; i++) { const m = mesh(new THREE.CylinderGeometry(.25, .25, .9, 24, 1, false, 0, Math.PI), i % 2 ? M.white : M.coral, -1.18 + i * .47, .62, .95); m.rotation.set(Math.PI / 2, 0, Math.PI / 2); m.scale.set(1, 1, .7); g.add(m); }
  g.add(mesh(new RoundedBoxGeometry(.7, 1.05, .08, 3, .03), M.navy, -.6, -.47, .9));
  g.add(mesh(new RoundedBoxGeometry(1.0, .7, .06, 3, .03), M.slate, .55, -.25, .9));
  const sign = canvasTex(1024, 300, x => { x.drawImage(IMG.logo, 112, 20, 800, 800 * IMG.logo.height / IMG.logo.width); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#293C4D'; x.fillRect(0, 0, 1024, 300); });
  g.add(mesh(new THREE.PlaneGeometry(1.4, .41), new THREE.MeshBasicMaterial({ map: sign, transparent: true }), 0, 1.08, 1.01));
  return sh(g);
}
function mBell() {
  const g = new THREE.Group();
  const prof = [[0, 1.1], [.12, 1.08], [.2, 1.0], [.42, .9], [.6, .62], [.68, .2], [.78, -.25], [1.0, -.55], [1.08, -.66], [1.02, -.72], [0, -.72]].map(p => new THREE.Vector2(p[0], p[1]));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 64), M.coral));
  g.add(mesh(new THREE.TorusGeometry(.16, .06, 16, 32), M.coral, 0, 1.18, 0));
  g.add(mesh(new THREE.SphereGeometry(.2, 32, 20), M.navy, 0, -.86, 0));
  const badge = new THREE.Group(); badge.position.set(.72, .72, .45);
  badge.add(mesh(new THREE.SphereGeometry(.34, 32, 20), M.navy));
  g.add(badge); g.userData.badge = badge;
  return sh(g);
}
function mTag() {
  const g = new THREE.Group();
  const s = new THREE.Shape(); s.moveTo(-1.3, -.75); s.lineTo(.55, -.75); s.lineTo(1.3, 0); s.lineTo(.55, .75); s.lineTo(-1.3, .75); s.closePath();
  const hole = new THREE.Path(); hole.absarc(.75, 0, .17, 0, Math.PI * 2, true); s.holes.push(hole);
  g.add(new THREE.Mesh(ext(s, .14, .08, 5), M.white));
  const lab = canvasTex(512, 512, x => { x.fillStyle = '#E4796F'; x.font = '700 330px Zona'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('%', 256, 280); });
  g.add(mesh(new THREE.PlaneGeometry(1.15, 1.15), new THREE.MeshBasicMaterial({ map: lab, transparent: true }), -.35, 0, .16));
  const str = mesh(new THREE.TorusGeometry(.42, .045, 16, 48, Math.PI * 1.3), M.coral, 1.12, .3, 0); str.rotation.set(.3, 1.2, 1.9); g.add(str);
  return sh(g);
}
function mQuotes() {
  const g = new THREE.Group();
  const q = () => { const s = new THREE.Shape(); s.absarc(0, 0, .42, 0, Math.PI * 2, false);
    const geo = ext(s, .3, .08, 5); const m = new THREE.Mesh(geo, M.coral);
    const t = new THREE.Shape(); t.moveTo(.1, -.1); t.quadraticCurveTo(.45, -.6, -.15, -1.0); t.quadraticCurveTo(.2, -.55, -.32, -.2); t.closePath();
    const tm = new THREE.Mesh(ext(t, .3, .06, 4), M.coral); tm.position.set(.12, -.45, 0);
    const gg = new THREE.Group(); gg.add(m); gg.add(tm); return gg; };
  const a = q(); a.position.set(-.6, .25, 0); const b = q(); b.position.set(.6, .25, 0); g.add(a); g.add(b);
  return sh(g);
}
function mWatch() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.25, 1.25, .38, 64).rotateX(Math.PI / 2), M.white));
  g.add(mesh(new THREE.TorusGeometry(1.25, .13, 20, 72), M.coral));
  g.add(mesh(new THREE.CylinderGeometry(.16, .16, .32, 24), M.coral, 0, 1.52, 0));
  g.add(mesh(new RoundedBoxGeometry(.5, .16, .2, 2, .06), M.coral, 0, 1.72, 0));
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.add(mesh(new RoundedBoxGeometry(.06, i % 3 ? .12 : .22, .03, 2, .015), M.slate, Math.sin(a) * .98, Math.cos(a) * .98, .2)).rotation.z = -a; }
  const hand = new THREE.Group(); hand.position.z = .23; hand.add(mesh(new RoundedBoxGeometry(.09, .82, .04, 2, .02), M.navy, 0, .36, 0)); g.add(hand);
  g.add(mesh(new THREE.CylinderGeometry(.1, .1, .1, 24).rotateX(Math.PI / 2), M.coral, 0, 0, .26));
  g.userData.hand = hand;
  return sh(g);
}
function mIcon(pts) {
  const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.Group(); g.add(new THREE.Mesh(ext(s, .3, .07, 6), M.coral)); return sh(g);
}

const ICONS = [];
function addIcon(i, model, sx, sy, scale, opt = {}) {
  const grp = new THREE.Group(); grp.add(model); scene.add(grp);
  const shadow = mesh(new THREE.PlaneGeometry(9, 9), M.shadow); shadow.rotation.x = -Math.PI / 2; shadow.receiveShadow = true; scene.add(shadow);
  ICONS.push({ i, grp, model, sx, sy, scale, shadow, opt });
}
function build(iconPts) {
  addIcon(0, mBubbles(), 1420, 500, 1.15);
  addIcon(1, mQuote(), 1440, 520, 1.15);
  addIcon(2, mStore(), 480, 560, 1.55, { ry: .42 });
  addIcon(3, mBell(), 1450, 500, 1.15);
  addIcon(4, mTag(), 480, 520, 1.6, { ry: .3 });
  addIcon(5, mQuotes(), 1680, 250, .8);
  addIcon(6, mWatch(), 470, 530, 1.15, { ry: .3 });
  addIcon(7, mIcon(iconPts), 960, 330, 1.6);
}
function upd3D(t) {
  for (const ic of ICONS) {
    const s0 = ic.i ? TR[ic.i - 1] - 1 : -1, s1 = ic.i < A.length - 1 ? TR[ic.i] + 1 : 1e9;
    const vis = t > s0 && t < s1;
    ic.grp.visible = ic.shadow.visible = vis; if (!vis) continue;
    const intro = SC[ic.i].voStart - .55;
    const k = backO(pr(t, intro, 1.0));
    let sx = ic.sx, sy = ic.sy, sc = ic.scale;
    if (ic.i === 7) { const end = eio(pr(t, Wd(7, 'conversa', 2) - .35, 1.0)); sy = lerp(-400, 330, end); sc *= end; }
    const p = scenePos(ic.i, sx, sy, 0);
    const bob = Math.sin(t * 1.3 + ic.i) * .08;
    ic.grp.position.copy(p).add(V(0, bob, 0));
    ic.grp.scale.setScalar(Math.max(.001, sc * (ic.i === 7 ? 1 : k)));
    ic.grp.rotation.set(.12 + Math.sin(t * .7 + ic.i) * .05, (ic.opt.ry ?? -.35) + Math.sin(t * .5 + ic.i) * .18 + (1 - clamp(k)) * 1.2, Math.sin(t * .6) * .03);
    ic.shadow.position.copy(p).add(V(0, -1.75 * sc, 0));
    if (ic.model.userData.hand) ic.model.userData.hand.rotation.z = -t * 2.2;
    if (ic.model.userData.badge) { const b = backO(pr(t, Wd(3, 'avisa') - .1, .6)); ic.model.userData.badge.scale.setScalar(Math.max(.001, b)); ic.model.rotation.z = Math.sin(t * 7) * .06 * Math.exp(-Math.max(0, t - Wd(3, 'avisa')) * 1.2) * (t > Wd(3, 'avisa') ? 1 : 0); }
  }
  // light follows camera
  const f = V(toU(CAM.x), -toU(CAM.y), 0);
  key.position.copy(f).add(V(-4, 9, 8)); key.target.position.copy(f);
}

// ---------- scenes (local coordinates 1920x1080) ----------
const L = 170, R = 1010;
function S0(c, t) {
  const s = SC[0];
  kicker(c, 'CONVERSAS QUE CONVERTEM · WHATSAPP', L, 250, t, s.voStart - .4);
  const out = Wd(0, 'mas') - .35;
  const stat = (v, lab, y, t0, o = {}) => {
    const g = 1 - eio(pr(t, out, .5)); if (g <= 0) return;
    c.save(); c.globalAlpha = g; c.translate(0, -(1 - g) * 40);
    num(c, v, pr(t, t0, 1.1), L, y, 128, o.color || C.ink, o);
    rise(c, lab, L + 6, y + 52, 30, C.slate, t, t0 + .25, { w: 600 });
    c.restore();
  };
  stat(2219, 'atendimentos de venda analisados', 440, Wd(0, 'dois') - .1);
  stat(354, 'viraram compra em até 14 dias', 640, Wd(0, 'trezentos') - .1, { color: C.coral });
  stat(16, 'de conversão média', 840, Wd(0, 'compra') + .25, { suf: '%' });
  rise(c, 'O que faz uma conversa', L, 500, 92, C.ink, t, Wd(0, 'separa') - .2);
  rise(c, 'virar venda?', L, 610, 92, C.coral, t, Wd(0, 'vende', 1) - .15);
}
function S1(c, t) {
  const s = SC[1];
  kicker(c, '1 · ORÇAMENTO CONCRETO', L, 250, t, s.voStart - .4);
  num(c, 2.9, pr(t, Wd(1, 'triplica') - .2, .9), L - 6, 470, 210, C.coral, { dec: 1, suf: '×' });
  rise(c, 'mais chance de venda', L + 4, 540, 34, C.ink, t, Wd(1, 'triplica') + .1, { w: 700 });
  rise(c, 'quando o orçamento é criado', L + 4, 586, 34, C.slate, t, Wd(1, 'triplica') + .25, { w: 600 });
  const t1 = Wd(1, 'link') - .2;
  kicker(c, 'CONVERSAS COM LINK DO ORÇAMENTO', L, 690, t, t1, { size: 22, color: C.slate });
  const bar = (lab, v, y, t0, col) => {
    const p = ap(t, t0, .5); if (p.a <= 0) return;
    txt(c, lab, L, y, 30, C.ink, { w: 600, a: p.a });
    hbar(c, L, y + 22, 600, 30, v / 30, pr(t, t0 + .1, .9), col);
    num(c, v, pr(t, t0 + .1, .9), L + 620, y + 47, 44, col === C.coral ? C.coral : C.slate, { suf: '%' });
  };
  bar('Quem mais vende', 29, 760, Wd(1, 'vinte') - .3, C.coral);
  bar('Quem menos vende', 10, 880, Wd(1, 'dez') - .3, C.gray);
}
function S2(c, t) {
  const s = SC[2];
  kicker(c, '2 · CONVITE PARA A LOJA', R, 250, t, s.voStart - .4);
  num(c, 2, pr(t, Wd(2, 'dobra') - .2, .7), R - 6, 470, 210, C.coral, { suf: '×', static: true });
  rise(c, 'mais chance de venda', R + 4, 540, 34, C.ink, t, Wd(2, 'dobra') + .1);
  rise(c, 'com o convite para a loja', R + 4, 586, 34, C.slate, t, Wd(2, 'dobra') + .25, { w: 600 });
  const t2 = Wd(2, 'dois') - .25;
  for (let i = 0; i < 3; i++) person(c, R + 50 + i * 120, 820, 120, i < 2 ? C.coral : C.gray, pr(t, t2 + i * .18, .6));
  rise(c, '2 em cada 3', R + 420, 790, 64, C.ink, t, t2 + .2);
  rise(c, 'compram quando vão à loja', R + 422, 840, 30, C.slate, t, t2 + .35, { w: 600 });
}
function S3(c, t) {
  const s = SC[3];
  kicker(c, '3 · SINAIS DE COMPRA', L, 250, t, s.voStart - .4);
  rise(c, 'O cliente avisa', L, 360, 72, C.ink, t, Wd(3, 'avisa') - .25);
  rise(c, 'quando está pronto.', L, 440, 72, C.ink, t, Wd(3, 'pronto') - .25);
  const bar = (lab, v, y, t0, col) => {
    const p = ap(t, t0, .5); if (p.a <= 0) return;
    txt(c, lab, L, y, 30, C.ink, { w: 600, a: p.a });
    hbar(c, L, y + 20, 640, 30, v / 50, pr(t, t0 + .1, .9), col);
    num(c, v, pr(t, t0 + .1, .9), L + 660, y + 45, 44, col === C.gray ? C.slate : C.coral, { suf: '%' });
  };
  bar('Perguntou de prazo de entrega', 47, 560, Wd(3, 'prazo') - .2, C.coral);
  bar('Perguntou de pagamento', 43, 680, Wd(3, 'pagamento') - .2, C.coral);
  bar('Média geral', 16, 800, Wd(3, 'prazo') + .6, C.gray);
  pill(c, 'Responda rápido e já mande o link', L, 900, 26, C.navy, '#fff', pr(t, Wd(3, 'nesse') - .1, .6), { shadow: true });
}
function S4(c, t) {
  const s = SC[4];
  kicker(c, '4 · ACHOU CARO?', R, 250, t, s.voStart - .4);
  num(c, 42, pr(t, Wd(4, 'quarenta') - .2, .9), R - 6, 430, 170, C.coral, { suf: '%' });
  rise(c, 'dos que acham caro fecham a compra', R + 4, 492, 32, C.ink, t, Wd(4, 'fecham') - .1);
  kicker(c, 'COMO RESPONDER', R, 590, t, Wd(4, 'responda') - .2, { size: 22, color: C.slate });
  const row = (lab, v, y, t0, good) => {
    const p = ap(t, t0, .5); if (p.a <= 0) return;
    c.save(); c.globalAlpha = p.a; c.translate(0, p.dy * .5);
    card(c, R, y, 760, 72, { r: 18, fill: good ? '#fff' : '#F6F3F2' });
    txt(c, lab, R + 28, y + 47, 29, good ? C.ink : C.slate, { w: 600 });
    num(c, v, pr(t, t0, .8), R + 732, y + 50, 38, good ? C.coral : C.slate, { suf: '%', al: 'right' });
    c.restore();
  };
  const r0 = Wd(4, 'concreto') - .1;
  row('Convite para a loja', 58, 625, r0, true);
  row('Orçamento ou link', 49, 712, r0 + .3, true);
  row('Condição (Pix, parcelas)', 45, 799, r0 + .6, true);
  row('Só defender o produto', 27, 886, Wd(4, 'defender') - .25, false);
}
function S5(c, t) {
  const s = SC[5];
  kicker(c, '5 · PALAVRAS QUE VENDEM', L, 250, t, s.voStart - .4);
  const col = (x, title, color, items, t0) => {
    kicker(c, title, x, 340, t, t0, { size: 22, color });
    items.forEach(([lab, v, tt], j) => {
      const p = ap(t, tt, .5); if (p.a <= 0) return;
      const y = 375 + j * 100;
      c.save(); c.globalAlpha = p.a; c.translate(0, p.dy * .5);
      card(c, x, y, 700, 80, { r: 20, fill: color === C.coral ? '#fff' : '#F7F5F4' });
      txt(c, lab, x + 28, y + 51, 29, color === C.coral ? C.ink : C.slate, { w: 600, mw: 520 });
      num(c, v, pr(t, tt, .8), x + 672, y + 54, 40, color, { suf: '%', al: 'right' });
      c.restore();
    });
  };
  const tl = Wd(5, 'link') - .25;
  col(L, 'VENDEM', C.coral, [['"link de pagamento"', 55, tl], ['"prazo de entrega"', 58, tl + .25], ['"dias úteis"', 46, Wd(5, 'dias') - .2], ['"você consegue finalizar hoje?"', 48, Wd(5, 'consegue') - .2]], tl - .2);
  const ta = Wd(5, 'interesse') - .5;
  col(950, 'AFASTAM', C.slate, [['"se você ainda tem interesse"', 3, ta], ['"não quero te incomodar"', 7, ta + .4], ['"só passei para saber"', 8, ta + .7]], ta - .2);
  pill(c, 'Retome sempre com um motivo concreto', L, 820, 26, C.navy, '#fff', pr(t, Wd(5, 'retome') - .1, .6), { shadow: true });
}
function S6(c, t) {
  const s = SC[6];
  kicker(c, 'O TEMPO CONTA', R, 250, t, s.voStart - .4);
  num(c, 51, pr(t, Wd(6, 'metade') - .1, .9), R - 6, 420, 150, C.coral, { suf: '%' });
  rise(c, 'das compras em até 12 horas', R + 4, 476, 32, C.ink, t, Wd(6, 'doze') - .25);
  num(c, 75, pr(t, Wd(6, 'tres') - .1, .9), R - 6, 650, 150, C.ink, { suf: '%' });
  rise(c, 'em até 3 dias', R + 4, 706, 32, C.ink, t, Wd(6, 'dias') - .25);
  // timeline
  const k = eo(pr(t, Wd(6, 'metade'), 2.4)), x0 = R, w = 760, y = 830;
  const ap0 = ap(t, Wd(6, 'metade') - .2, .5); if (ap0.a > 0) {
    c.save(); c.globalAlpha = ap0.a;
    hbar(c, x0, y, w, 14, 1, 1, C.grayL, false);
    const marks = [['12 h', .14], ['1 dia', .25], ['3 dias', .47], ['7 dias', .72], ['14 dias', 1]];
    const fill = k < .5 ? lerp(0, .14, k / .5) : lerp(.14, .47, (k - .5) / .5);
    hbar(c, x0, y, w, 14, fill, 1, C.coral, false);
    marks.forEach(([m, f]) => { c.fillStyle = f <= fill + .001 ? C.coral : C.gray; c.beginPath(); c.arc(x0 + w * f, y + 7, 9, 0, Math.PI * 2); c.fill(); txt(c, m, x0 + w * f, y + 52, 22, C.slate, { al: 'center', w: 600 }); });
    c.restore();
  }
}
function S7(c, t) {
  const s = SC[7];
  const end = Wd(7, 'conversa', 2) - .35;
  const g = 1 - eio(pr(t, end, .5));
  if (g > 0) {
    c.save(); c.globalAlpha = g;
    kicker(c, 'NA SUA PRÓXIMA CONVERSA', 960, 250, t, s.voStart - .4, { al: 'center' });
    const items = [['Pergunte e entenda a necessidade', 'pergunte'], ['Monte o orçamento', 'monte'], ['Mande o link', 'mande'], ['Convide para a loja', 'convide'], ['Peça os dados e feche', 'peca']];
    items.forEach(([lab, w], j) => {
      const t0 = Wd(7, w) - .15, y = 340 + j * 118;
      const p = ap(t, t0, .5); if (p.a <= 0) return;
      c.save(); c.globalAlpha *= p.a; c.translate(0, p.dy * .5);
      card(c, 560, y, 800, 92, { r: 24 });
      check(c, 616, y + 46, 46, pr(t, t0 + .1, .6));
      txt(c, lab, 664, y + 58, 36, C.ink);
      c.restore();
    });
    c.restore();
  }
  const fk = pr(t, end + .25, .7);
  rise(c, 'Conversa concreta', 960, 660, 96, C.ink, t, end + .25, { al: 'center' });
  rise(c, 'vende mais.', 960, 770, 96, C.coral, t, end + .45, { al: 'center' });
  const lk = eo(pr(t, Wd(7, 'bora') + .2, .8));
  if (lk > 0) { const lw = 300, lh = lw * IMG.logo.height / IMG.logo.width; c.save(); c.globalAlpha = lk; c.filter = 'invert(0)'; c.drawImage(IMG.logoN, 960 - lw / 2, 870 + 12 * (1 - lk), lw, lh); c.restore(); }
}
const SCN = [S0, S1, S2, S3, S4, S5, S6, S7];

function footnote(c, t) {
  const a = eo(pr(t, .6, 1)) * (1 - eio(pr(t, SC[7].voStart - 1, .6))) * .55;
  if (a > 0) txt(c, 'Fonte: atendimentos de WhatsApp × pedidos pagos na Shopify · 1/jun a 2/nov de 2026', 170, 1038, 18, C.slate, { w: 600, a });
}

function composite(c, t) {
  CAM = camAt(t);
  drawBG(c, t);
  camera.position.set(toU(CAM.x), -toU(CAM.y), D); camera.lookAt(toU(CAM.x), -toU(CAM.y), 0);
  upd3D(t); renderer.render(scene, camera); c.drawImage(glc, 0, 0);
  for (let i = 0; i < A.length; i++) {
    if (Math.abs(i - CAM.s) > 1) continue;
    const ox = A[i].x - CAM.x, oy = A[i].y - CAM.y;
    if (Math.abs(ox) > 2200) continue;
    c.save(); c.translate(ox, oy); SCN[i](c, t); c.restore();
  }
  footnote(c, t);
  const fi = 1 - eo(pr(t, 0, .5)), fo = eio(pr(t, CUES.duration - .6, .6));
  if (fi > 0 || fo > 0) { c.fillStyle = `rgba(244,243,240,${Math.max(fi, fo)})`; c.fillRect(0, 0, W, H); }
}
function renderAt(t) {
  const a = camAt(t - 1 / 60), b = camAt(t + 1 / 60); const sp = Math.hypot(b.x - a.x, b.y - a.y);
  const N = sp > 40 ? 7 : sp > 10 ? 4 : 1;
  if (N === 1) { composite(ctx, t); return 1; }
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < N; i++) { composite(tctx, t + (i / (N - 1) - .5) * (1 / 30) * .55); ctx.globalAlpha = 1 / (i + 1); ctx.drawImage(tmp, 0, 0); ctx.globalAlpha = 1; }
  return N;
}

window.ready = (async () => {
  await document.fonts.load('700 40px Zona'); await document.fonts.load('600 40px Zona');
  CUES = await (await fetch('../cues.json')).json();
  SC = CUES.scenes;
  TR = SC.slice(0, -1).map((s, i) => (s.voEnd + SC[i + 1].voStart) / 2);
  const P = [[960, 540], [3160, 540], [5360, 720], [7560, 540], [9760, 380], [11960, 540], [14160, 720], [16360, 540]];
  A = P.map(([x, y]) => ({ x, y }));
  IMG.logo = await loadImg('../assets/logo.png');
  { const c = document.createElement('canvas'); c.width = IMG.logo.width; c.height = IMG.logo.height; const g = c.getContext('2d'); g.drawImage(IMG.logo, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#293C4D'; g.fillRect(0, 0, c.width, c.height); IMG.logoN = c; }
  const shape = await (await fetch('../assets/icon_shape.json')).json();
  build(shape.pts);
  renderer.compile(scene, camera);
  return true;
})();
window.renderAt = renderAt;
