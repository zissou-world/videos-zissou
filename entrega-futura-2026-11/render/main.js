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
const key = new THREE.DirectionalLight(0xffffff, 1.8); key.castShadow = false; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 8; key.shadow.bias = -.0005;
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
  g.userData.badge = badge;
  return sh(g);
}
function mStore() {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fb3d1, roughness: .12, metalness: 0, clearcoat: 1, clearcoatRoughness: .05 });
  g.add(mesh(new RoundedBoxGeometry(3.0, 2.2, 1.6, 4, .06), M.white, 0, 0, 0));                 // body
  g.add(mesh(new RoundedBoxGeometry(3.25, .2, 1.85, 3, .07), M.white, 0, 1.2, 0));              // roof cornice
  g.add(mesh(new RoundedBoxGeometry(3.15, .12, 1.75, 3, .05), M.white, 0, -1.16, .05));         // base step
  // sign band: navy with white logo
  g.add(mesh(new RoundedBoxGeometry(2.3, .46, .08, 3, .04), M.navy, 0, .78, .82));
  const sign = canvasTex(1024, 220, x => { x.drawImage(IMG.logo, 232, 18, 560, 560 * IMG.logo.height / IMG.logo.width); });
  g.add(mesh(new THREE.PlaneGeometry(2.0, .43), new THREE.MeshBasicMaterial({ map: sign, transparent: true }), 0, .78, .87));
  // striped awning: slanted slats + rounded front edge
  const aw = new THREE.Group(); aw.position.set(0, .42, .82); aw.rotation.x = .55;
  for (let i = 0; i < 8; i++) aw.add(mesh(new RoundedBoxGeometry(.33, .06, .62, 2, .025), i % 2 ? M.white : M.coral, -1.155 + i * .33, 0, .31));
  for (let i = 0; i < 8; i++) { const sc = mesh(new THREE.CylinderGeometry(.165, .165, .07, 24, 1, false, 0, Math.PI), i % 2 ? M.white : M.coral, -1.155 + i * .33, 0, .62); sc.rotation.set(Math.PI / 2, 0, Math.PI / 2); sc.rotation.set(0, 0, 0); sc.rotation.x = Math.PI / 2; sc.rotation.z = Math.PI; g.add(sc); aw.add(sc); }
  g.add(aw);
  // door (left) with frame and handle
  g.add(mesh(new RoundedBoxGeometry(.78, 1.25, .06, 3, .03), M.white, -.82, -.48, .81));
  g.add(mesh(new RoundedBoxGeometry(.66, 1.15, .06, 3, .03), M.navy, -.82, -.5, .84));
  g.add(mesh(new THREE.SphereGeometry(.05, 16, 12), M.coral, -.6, -.5, .9));
  // shop window (right)
  g.add(mesh(new RoundedBoxGeometry(1.42, .98, .06, 3, .03), M.white, .5, -.36, .81));
  g.add(mesh(new RoundedBoxGeometry(1.3, .86, .05, 3, .03), glass, .5, -.36, .84));
  g.add(mesh(new RoundedBoxGeometry(.04, .86, .06, 2, .015), M.white, .5, -.36, .86));
  // little mattress in the window
  g.add(mesh(new RoundedBoxGeometry(.9, .14, .3, 3, .05), M.white, .5, -.68, .75));
  g.add(mesh(new RoundedBoxGeometry(.9, .06, .3, 2, .02), M.coral, .5, -.58, .75));
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
  const s = new THREE.Shape(); s.moveTo(-1.25, -.7); s.lineTo(.5, -.7); s.lineTo(1.2, 0); s.lineTo(.5, .7); s.lineTo(-1.25, .7); s.closePath();
  const hole = new THREE.Path(); hole.absarc(.68, 0, .16, 0, Math.PI * 2, true); s.holes.push(hole);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: .16, bevelEnabled: true, bevelThickness: .09, bevelSize: .09, bevelSegments: 6, curveSegments: 32 }), M.coral);
  body.position.z = -.08; g.add(body);
  const ring = mesh(new THREE.TorusGeometry(.2, .045, 16, 40), M.white, .68, 0, .2); g.add(ring);
  const lab = canvasTex(512, 512, x => { x.fillStyle = '#ffffff'; x.font = '700 340px Zona'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('%', 256, 285); });
  g.add(mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: lab, transparent: true }), -.38, 0, .19));
  const curve = new THREE.CatmullRomCurve3([V(.68, 0, .05), V(1.05, .25, .1), V(1.35, .75, 0), V(1.2, 1.25, -.1), V(.85, 1.45, -.15)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, .035, 12, false), M.navy));
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

// ---------- extra 3D models ----------
function mFunnel() {
  const g = new THREE.Group();
  const prof = [[0, -1.2], [.22, -1.2], [.24, -1.15], [.24, -.25], [1.15, .75], [1.25, .95], [1.28, 1.05], [1.2, 1.1], [1.08, .98], [.12, -.18], [0, -.18]].map(p => new THREE.Vector2(p[0], p[1]));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 72), M.coral));
  g.add(mesh(new THREE.TorusGeometry(1.2, .07, 16, 72).rotateX(Math.PI / 2), M.white, 0, 1.03, 0));
  g.userData.balls = [];
  for (let i = 0; i < 3; i++) { const b = mesh(new THREE.SphereGeometry(.17, 24, 16), i === 1 ? M.navy : M.white, -.45 + i * .45, 1.55, 0); g.add(b); g.userData.balls.push(b); }
  return sh(g);
}
function mShield() {
  const g = new THREE.Group();
  const s = new THREE.Shape(); s.moveTo(0, 1.25); s.bezierCurveTo(.5, 1.0, .95, .98, 1.1, .95); s.bezierCurveTo(1.1, .1, .9, -.75, 0, -1.3); s.bezierCurveTo(-.9, -.75, -1.1, .1, -1.1, .95); s.bezierCurveTo(-.95, .98, -.5, 1.0, 0, 1.25);
  g.add(new THREE.Mesh(ext(s, .32, .12, 6), M.navy));
  const ck = new THREE.Shape(); ck.moveTo(-.45, .02); ck.lineTo(-.12, -.32); ck.lineTo(.5, .32); ck.lineTo(.38, .44); ck.lineTo(-.12, -.07); ck.lineTo(-.33, .15); ck.closePath();
  const ckm = mesh(ext(ck, .1, .05, 3), M.coral, 0, -.02, .32); g.add(ckm); g.userData.check = ckm;
  return sh(g);
}
function mTrend() {
  const g = new THREE.Group();
  g.userData.bars = [];
  [.6, 1.0, 1.5].forEach((h, i) => { const b = mesh(new RoundedBoxGeometry(.42, h, .42, 3, .07), M.white, -.7 + i * .62, 0, 0); b.geometry.translate(0, h / 2, 0); b.position.y = -1.0; g.add(b); g.userData.bars.push(b); });
  const s = new THREE.Shape(); s.moveTo(-1.2, -.35); s.lineTo(-.35, .35); s.lineTo(.05, -.02); s.lineTo(.75, .65); s.lineTo(.55, .82); s.lineTo(1.25, .95); s.lineTo(1.1, .25); s.lineTo(.92, .45); s.lineTo(.05, -.38); s.lineTo(-.35, -.02); s.lineTo(-1.05, -.55); s.closePath();
  const ar = mesh(ext(s, .16, .05, 3), M.coral, 0, .3, .35); g.add(ar); g.userData.arrow = ar;
  return sh(g);
}

function mCalendar() {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(2.2, 2.3, .34, 4, .1), M.white));
  g.add(mesh(new RoundedBoxGeometry(2.2, .62, .36, 4, .1), M.coral, 0, .84, .01));
  for (const x of [-.55, .55]) { const r = mesh(new THREE.TorusGeometry(.16, .05, 14, 32), M.navy, x, 1.17, 0); g.add(r); }
  const tex = canvasTex(512, 512, x => { x.fillStyle = '#ffffff'; x.font = '700 70px Zona'; x.textAlign = 'center'; x.fillText('DEZ', 256, 100); x.fillStyle = '#141B26'; x.font = '700 250px Zona'; x.fillText('12', 256, 400); });
  g.add(mesh(new THREE.PlaneGeometry(2.0, 2.0), new THREE.MeshBasicMaterial({ map: tex, transparent: true }), 0, 0, .18));
  return sh(g);
}
function mTruck() {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(2.3, 1.35, 1.3, 4, .1), M.white, -.45, .2, 0));
  g.add(mesh(new RoundedBoxGeometry(2.32, .16, 1.32, 2, .05), M.coral, -.45, -.05, 0));
  g.add(mesh(new RoundedBoxGeometry(1.05, 1.0, 1.25, 4, .14), M.coral, 1.25, .02, 0));
  g.add(mesh(new RoundedBoxGeometry(.5, .42, 1.27, 3, .06), M.slate, 1.5, .25, 0));
  g.userData.wheels = [];
  for (const [x, z] of [[-1.15, .62], [.0, .62], [1.25, .62], [-1.15, -.62], [0, -.62], [1.25, -.62]]) { const w = mesh(new THREE.CylinderGeometry(.27, .27, .2, 28).rotateX(Math.PI / 2), M.navy, x, -.55, z); g.add(w); g.userData.wheels.push(w); }
  const sign = canvasTex(1024, 300, x => { x.drawImage(IMG.logo, 162, 40, 700, 700 * IMG.logo.height / IMG.logo.width); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#293C4D'; x.fillRect(0, 0, 1024, 300); });
  g.add(mesh(new THREE.PlaneGeometry(1.5, .44), new THREE.MeshBasicMaterial({ map: sign, transparent: true }), -.45, .35, .66));
  return sh(g);
}
function mHouse() {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(1.8, 1.3, 1.4, 4, .06), M.white, 0, -.2, 0));
  const r = new THREE.Shape(); r.moveTo(-1.1, 0); r.lineTo(1.1, 0); r.lineTo(0, .85); r.closePath();
  const roof = mesh(ext(r, 1.5, .05, 3), M.coral, 0, .85, 0); g.add(roof);
  g.add(mesh(new RoundedBoxGeometry(.42, .7, .06, 3, .03), M.navy, -.4, -.5, .72));
  g.add(mesh(new RoundedBoxGeometry(.5, .4, .06, 3, .03), M.slate, .38, -.1, .72));
  const prof = [[0, .8], [.06, .8], [.32, -.3], [.42, -.3], [.42, -.36], [0, -.36]].map(p => new THREE.Vector2(p[0], p[1]));
  const cone = new THREE.Group(); cone.position.set(1.35, -.5, .5);
  cone.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 40), M.coral)); cone.add(mesh(new THREE.CylinderGeometry(.2, .24, .14, 40), M.white, 0, .28, 0)); cone.scale.setScalar(.65); g.add(cone);
  return sh(g);
}

// ---------- icons per scene ----------
const ICONS = [];
function addIcon(i, model, sx, sy, scale, opt = {}) { const grp = new THREE.Group(); grp.add(model); scene.add(grp); ICONS.push({ i, grp, model, sx, sy, scale, opt, sh: { a: 0 } }); }
function build(iconPts) {
  addIcon(0, mIcon(iconPts), 1590, 360, 1.6, { ry: -.3, anim: 'spin' });
  addIcon(0, mCalendar(), 1640, 730, .8, { ry: -.4, delay: .5, anim: 'swing' });
  addIcon(1, mHouse(), 1560, 300, .95, { ry: -.5 });
  addIcon(2, mCalendar(), 1480, 450, 1.35, { ry: -.35, anim: 'stamp' });
  addIcon(3, mTruck(), 300, 340, .95, { ry: -.25, drive: true });
  addIcon(7, mIcon(iconPts), 960, 306, 1.55, { final: true, anim: 'spin' });
}
function upd3D(t) {
  for (const ic of ICONS) {
    const s0 = ic.i ? TR[ic.i - 1] - 1 : -1, s1 = ic.i < A.length - 1 ? TR[ic.i] + 1 : 1e9;
    const vis = t > s0 && t < s1;
    ic.grp.visible = vis; ic.sh.a = 0; if (!vis) continue;
    const intro = SC[ic.i].voStart - .55 + (ic.opt.delay || 0);
    const kr = pr(t, intro, 1.1), k = backO(kr);
    const sc = ic.scale;
    let isx = ic.sx; if (ic.opt.drive) { const dk = eio(pr(t, Wd(3, 'registra') - .3, Wd(3, 'liberado') - Wd(3, 'registra') + .6)); isx = lerp(330, 1560, dk); if (ic.model.userData.wheels) ic.model.userData.wheels.forEach(w => { w.rotation.z = -dk * 40; }); }
    const p = scenePos(ic.i, isx, ic.sy, 0);
    const bob = Math.sin(t * 1.6 + ic.i + ic.sx) * .14;
    const rise = (1 - eo(kr)) * -1.6;
    ic.grp.position.copy(p).add(V(0, bob + rise, 0));
    let sx = 1, sy = 1, extraY = 0, extraZ = 0;
    const lt = t - intro - 1.1; // time since landing
    if (ic.opt.anim === 'spin' && lt > 0) { const ph = (lt % 4.2) / 4.2; extraY = Math.PI * 2 * eio(pr(ph, .62, .3)); const sq = pr(ph, .9, .1); sy = 1 + .08 * Math.sin(Math.PI * sq); sx = 1 - .05 * Math.sin(Math.PI * sq); }
    if (ic.opt.anim === 'swing') extraZ = Math.sin(t * 2.4) * .22 * clamp(lt + 1);
    if (ic.opt.anim === 'pulse') { extraY = (1 - eo(kr)) * Math.PI * 2; }
    if (ic.opt.anim === 'funnel') extraZ = Math.sin(t * 1.8) * .08;
    // landing squash
    const land = pr(t, intro + .55, .45); const sqk = Math.sin(Math.PI * land) * (land < 1 ? 1 : 0);
    ic.grp.scale.set(Math.max(.001, sc * k * sx * (1 + .1 * sqk)), Math.max(.001, sc * k * sy * (1 - .1 * sqk)), Math.max(.001, sc * k));
    ic.grp.rotation.set(.12 + Math.sin(t * .9 + ic.i) * .08, (ic.opt.ry ?? -.35) + Math.sin(t * .7 + ic.i) * .3 + (1 - eo(kr)) * Math.PI * 2 + extraY, Math.sin(t * .8) * .05 + extraZ);
    const ud = ic.model.userData;
    if (ud.badge) { const ph = Math.max(0, lt) % 2.6; const pk = pr(ph, 0, .5); ud.badge.scale.setScalar(1 + .35 * Math.sin(Math.PI * pk) * (lt > 0 ? 1 : 0)); ud.badge.rotation.z = -.4 * Math.sin(Math.PI * pk) * (lt > 0 ? 1 : 0); }
    if (ud.balls) ud.balls.forEach((b, j) => { const ph = ((t * .55 + j / 3) % 1); b.position.y = lerp(2.0, -1.0, eio(ph)); b.position.x = lerp(-.45 + j * .45, 0, eo(pr(ph, .25, .45))); b.scale.setScalar(ph > .85 ? Math.max(.01, 1 - (ph - .85) / .15) : Math.min(1, ph * 8)); });
    if (ud.check) { const ts = [Wd(5, 'protege'), Wd(5, 'comprou'), Wd(5, 'conversando')]; let pu = 0; for (const x of ts) { const q = pr(t, x - .2, .45); pu = Math.max(pu, Math.sin(Math.PI * q)); } ud.check.scale.setScalar(1 + .45 * pu); ic.grp.scale.multiplyScalar(1 + .06 * pu); }
    if (ud.bars) { ud.bars.forEach((b, j) => { b.scale.y = Math.max(.01, backO(pr(t, intro + .5 + j * .25, .7))); }); const a = pr(t, intro + 1.2, .8); ud.arrow.scale.setScalar(Math.max(.01, backO(a))); ud.arrow.position.set(.3 * (1 - eo(a)) + Math.sin(t * 3) * .04, .3 - (1 - eo(a)) * .6 + Math.abs(Math.sin(t * 2.2)) * .12, .35); }
    if (!ic.opt.final) ic.sh = { a: clamp(k), x: A[ic.i].x + isx, y: A[ic.i].y + ic.sy + 150 * sc - bob * 100, w: 140 * sc };
  }
  const f = V(toU(CAM.x), -toU(CAM.y), 0);
  key.position.copy(f).add(V(-4, 9, 8)); key.target.position.copy(f);
}
function contactShadows(c) {
  for (const ic of ICONS) {
    if (!ic.grp.visible || !ic.sh.a) continue;
    const x = ic.sh.x - CAM.x, y = ic.sh.y - CAM.y, w = ic.sh.w;
    c.save(); c.globalAlpha = ic.sh.a; c.translate(x, y); c.scale(1, .16);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, w); g.addColorStop(0, 'rgba(40,40,55,0.22)'); g.addColorStop(.55, 'rgba(40,40,55,0.09)'); g.addColorStop(1, 'rgba(40,40,55,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, w, 0, Math.PI * 2); c.fill(); c.restore();
  }
}

// ---------- UI primitives (redesigned portal) ----------
const L = 170, R = 1010;
function uiIcon(c, kind, x, y, s, color) {
  c.save(); c.translate(x, y); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = s * .09; c.lineCap = 'round'; c.lineJoin = 'round';
  if (kind === 'doc') { rr(c, -s * .32, -s * .42, s * .64, s * .84, s * .1); c.stroke(); for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-s * .16, -s * .15 + i * s * .17); c.lineTo(s * .16, -s * .15 + i * s * .17); c.stroke(); } }
  if (kind === 'chat') { c.beginPath(); c.arc(0, -s * .04, s * .36, .6, Math.PI * 2 + .2); c.lineTo(-s * .28, s * .38); c.closePath(); c.stroke(); }
  if (kind === 'spark') { const st = (r, a) => [Math.cos(a) * r, Math.sin(a) * r]; c.beginPath(); for (let i = 0; i < 8; i++) { const [px, py] = st(i % 2 ? s * .14 : s * .42, i * Math.PI / 4 - Math.PI / 2); i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); c.fill(); }
  if (kind === 'clock') { c.beginPath(); c.arc(0, 0, s * .38, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(0, -s * .2); c.lineTo(0, 0); c.lineTo(s * .15, s * .1); c.stroke(); }
  if (kind === 'shield') { c.beginPath(); c.moveTo(0, -s * .42); c.lineTo(s * .34, -s * .28); c.quadraticCurveTo(s * .34, s * .22, 0, s * .44); c.quadraticCurveTo(-s * .34, s * .22, -s * .34, -s * .28); c.closePath(); c.stroke(); }
  c.restore();
}
function cursor(c, x, y, press) {
  c.save(); c.translate(x, y);
  if (press > 0 && press < 1) { c.globalAlpha = 1 - press; c.strokeStyle = C.coral; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 10 + 46 * eo(press), 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
  const s = 1 - .12 * Math.sin(Math.PI * clamp(press * 2));
  c.scale(s, s);
  c.shadowColor = 'rgba(0,0,0,0.25)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 40); c.lineTo(10, 30); c.lineTo(17, 46); c.lineTo(24, 43); c.lineTo(17, 27); c.lineTo(30, 27); c.closePath();
  c.fillStyle = '#fff'; c.fill(); c.shadowColor = 'transparent'; c.lineWidth = 3; c.strokeStyle = C.ink; c.stroke(); c.restore();
}
// cursor path: list of [t, x, y], clicks: times
function cursorAt(t, path) { if (t < path[0][0]) return null; for (let i = 0; i < path.length - 1; i++) if (t <= path[i + 1][0]) { const k = eio(pr(t, path[i][0], path[i + 1][0] - path[i][0])); return [lerp(path[i][1], path[i + 1][1], k), lerp(path[i][2], path[i + 1][2], k)]; } const e = path[path.length - 1]; return [e[1], e[2]]; }
function chip(c, label, count, x, y, k, o = {}) {
  if (k <= 0) return 0;
  const sz = o.size || 30, h = sz * 2.1, wl = tw(c, label, sz, 600), wc = tw(c, String(count), sz * .8, 700);
  const w = wl + wc + sz * 2.6;
  c.save(); c.globalAlpha *= clamp(k * 1.5); const sc = .7 + .3 * backO(k); c.translate(x + w / 2, y + h / 2); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
  c.shadowColor = 'rgba(25,35,55,0.08)'; c.shadowBlur = 20; c.shadowOffsetY = 6;
  rr(c, 0, 0, w, h, h / 2); c.fillStyle = o.active ? C.navy : '#fff'; c.fill(); c.shadowColor = 'transparent';
  txt(c, label, sz * .9, h / 2 + sz * .36, sz, o.active ? '#fff' : C.ink, { w: 600 });
  rr(c, sz * 1.2 + wl, h / 2 - sz * .62, wc + sz * .9, sz * 1.24, sz * .62); c.fillStyle = o.active ? 'rgba(255,255,255,.18)' : C.coralL; c.fill();
  txt(c, String(count), sz * 1.65 + wl, h / 2 + sz * .3, sz * .8, o.active ? '#fff' : C.coral);
  c.restore();
  return w;
}
function checkbox(c, x, y, s, k) {
  rr(c, x, y, s, s, s * .28);
  if (k <= 0) { c.lineWidth = 3; c.strokeStyle = C.gray; c.stroke(); return; }
  c.fillStyle = C.navy; c.globalAlpha *= 1; c.fill();
  c.save(); c.strokeStyle = '#fff'; c.lineWidth = s * .13; c.lineCap = 'round'; c.lineJoin = 'round';
  const p = eo(k); c.beginPath(); c.moveTo(x + s * .25, y + s * .52);
  const m = [x + s * .43, y + s * .7], e = [x + s * .76, y + s * .32];
  if (p < .4) c.lineTo(lerp(x + s * .25, m[0], p / .4), lerp(y + s * .52, m[1], p / .4)); else { c.lineTo(m[0], m[1]); c.lineTo(lerp(m[0], e[0], (p - .4) / .6), lerp(m[1], e[1], (p - .4) / .6)); }
  c.stroke(); c.restore();
}
function button(c, label, x, y, w, h, k, o = {}) {
  if (k <= 0) return;
  c.save(); c.globalAlpha *= clamp(k * 1.5); const press = o.press || 0; const sc = (.85 + .15 * backO(k)) * (1 - .05 * Math.sin(Math.PI * clamp(press)));
  c.translate(x + w / 2, y + h / 2); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
  c.shadowColor = 'rgba(20,27,38,0.22)'; c.shadowBlur = 24; c.shadowOffsetY = 10;
  rr(c, 0, 0, w, h, h / 2); c.fillStyle = o.bg || C.ink; c.fill(); c.shadowColor = 'transparent';
  if (o.icon) uiIcon(c, o.icon, h * .62, h / 2, h * .5, '#fff');
  txt(c, label, o.icon ? h * 1.05 : w / 2, h / 2 + h * .17, h * .42, '#fff', { al: o.icon ? 'left' : 'center' });
  c.restore();
}

// ---------- scenes ----------
function S0(c, t) {
  const s = SC[0];
  kicker(c, 'PROCESSO · ENTREGA FUTURA', L, 250, t, s.voStart - .4);
  const out = Wd(0, 'para') - .35, g = 1 - eio(pr(t, out, .45));
  if (g > 0) { c.save(); c.globalAlpha = g;
    rise(c, 'Nem todo cliente', L, 420, 96, C.ink, t, Wd(0, 'nem') - .25);
    rise(c, 'pode receber no', L, 530, 96, C.ink, t, Wd(0, 'receber') - .25);
    rise(c, 'prazo padrão.', L, 640, 96, C.coral, t, Wd(0, 'prazo') - .25);
    c.restore(); }
  rise(c, 'Entrega futura', L - 6, 520, 132, C.ink, t, Wd(0, 'entrega') - .2);
  rise(c, 'quando o cliente ainda não pode receber', L, 600, 40, C.coral, t, Wd(0, 'futura') - .1, { w: 600 });
}
function S1(c, t) {
  const s = SC[1];
  kicker(c, 'O QUE É', L, 230, t, s.voStart - .4);
  rise(c, 'O cliente ainda não pode', L, 340, 70, C.ink, t, Wd(1, 'cliente') - .25);
  rise(c, 'ou não está pronto.', L, 425, 70, C.ink, t, Wd(1, 'pronto') - .25);
  const cards = [['01', 'Em reforma', 'A casa ou o quarto ainda', 'está em obra.', Wd(1, 'reforma') - .35], ['02', 'Viajando', 'Não estará em casa', 'no prazo padrão.', Wd(1, 'viajar') - .3], ['03', 'A partir de uma data', 'Só pode receber depois', 'de um dia específico.', Wd(1, 'partir') - .3]];
  cards.forEach(([n, ti, a1, a2, tt], j) => {
    const p = ap(t, tt, .55); if (p.a <= 0) return;
    const x = L + j * 540, y = 540, w = 510, h = 300;
    c.save(); c.globalAlpha = p.a; c.translate(0, p.dy);
    card(c, x, y, w, h, { r: 28 }); rr(c, x, y, w, 10, [28, 28, 0, 0]); c.fillStyle = C.coral; c.fill();
    txt(c, n, x + 40, y + 100, 56, C.coral);
    txt(c, ti, x + 40, y + 172, 40, C.ink, { mw: w - 70 });
    txt(c, a1, x + 40, y + 222, 26, C.slate, { w: 600 }); txt(c, a2, x + 40, y + 256, 26, C.slate, { w: 600 });
    c.restore();
  });
}
function S2(c, t) {
  const s = SC[2];
  kicker(c, 'IMPORTANTE SOBRE A DATA', L, 230, t, s.voStart - .4);
  rise(c, 'A data é', L, 360, 100, C.ink, t, Wd(2, 'data') - .2);
  rise(c, 'aproximada.', L, 470, 100, C.coral, t, Wd(2, 'aproximada') - .25);
  rise(c, 'Não é o dia da entrega.', L, 550, 34, C.ink, t, Wd(2, 'ela') - .1);
  rise(c, 'É um guia para o Pós-venda entrar em contato.', L, 598, 34, C.slate, t, Wd(2, 'guia') - .2, { w: 600 });
  kicker(c, 'O PRAZO DO CEP CONTINUA VALENDO', L, 700, t, Wd(2, 'prazo') - .3, { size: 22, color: C.slate });
  const box = (lab, val, x, w, tt, hi) => { const p = ap(t, tt, .5); if (p.a <= 0) return;
    c.save(); c.globalAlpha = p.a; c.translate(0, p.dy * .5); card(c, x, 740, w, 120, { r: 24, fill: hi ? C.navy : '#fff' });
    txt(c, lab, x + 30, 786, 22, hi ? 'rgba(255,255,255,.7)' : C.slate, { w: 600 }); txt(c, val, x + 30, 836, 38, hi ? '#fff' : C.ink); c.restore(); };
  const op = (ch, x, tt) => { const p = ap(t, tt, .4); if (p.a > 0) txt(c, ch, x, 820, 56, C.coral, { al: 'center', a: p.a }); };
  box('A partir de', '12/12', L, 300, Wd(2, 'prazo') - .1);
  op('+', L + 345, Wd(2, 'cep') - .2); box('Prazo do CEP', 'do cliente', L + 390, 320, Wd(2, 'cep') - .1);
  op('=', L + 755, Wd(2, 'contar') - .2); box('Entrega', '12/12 + prazo', L + 800, 380, Wd(2, 'contar') - .1, true);
}
function S3(c, t) {
  const s = SC[3];
  kicker(c, 'COMO FUNCIONA', L, 210, t, s.voStart - .4);
  const steps = [['Vendedor', 'registra a data', 'aproximada no pedido', 'registra'], ['Pós-venda', 'usa a data como', 'guia de contato', 'posvenda'], ['Cliente', 'confirma se já', 'pode receber', 'confirma'], ['Pedido', 'é liberado', 'para envio', 'liberado']];
  const xs = [330, 740, 1150, 1560], y = 640;
  const t1 = Wd(3, 'registra') - .3, t4 = Wd(3, 'liberado');
  const lk = eio(pr(t, t1, t4 - t1 + .2));
  const la = ap(t, t1 - .2, .5).a;
  if (la > 0) { c.save(); c.globalAlpha = la; rr(c, xs[0], y - 4, xs[3] - xs[0], 8, 4); c.fillStyle = C.grayL; c.fill(); rr(c, xs[0], y - 4, (xs[3] - xs[0]) * lk, 8, 4); c.fillStyle = C.coral; c.fill(); c.restore(); }
  steps.forEach(([ti, a1, a2, w], j) => {
    const tt = Wd(3, w) - .25, p = ap(t, tt, .5); if (p.a <= 0) return;
    const on = pr(t, tt, .4);
    c.save(); c.globalAlpha = p.a;
    c.save(); c.translate(xs[j], y); const sc = .6 + .4 * backO(on); c.scale(sc, sc);
    c.shadowColor = 'rgba(25,35,55,.18)'; c.shadowBlur = 20; c.shadowOffsetY = 6;
    c.beginPath(); c.arc(0, 0, 50, 0, Math.PI * 2); c.fillStyle = j === 3 ? C.coral : C.navy; c.fill(); c.shadowColor = 'transparent';
    txt(c, String(j + 1), 0, 18, 46, '#fff', { al: 'center' }); c.restore();
    txt(c, ti, xs[j], y + 110, 40, C.ink, { al: 'center' });
    txt(c, a1, xs[j], y + 156, 26, C.slate, { al: 'center', w: 600 }); txt(c, a2, xs[j], y + 190, 26, C.slate, { al: 'center', w: 600 });
    c.restore();
  });
}
function phone(c, x, y, w, h, draw) {
  c.save(); c.shadowColor = 'rgba(20,27,38,.22)'; c.shadowBlur = 60; c.shadowOffsetY = 26;
  rr(c, x, y, w, h, 64); c.fillStyle = '#1B2330'; c.fill(); c.shadowColor = 'transparent';
  rr(c, x + 14, y + 14, w - 28, h - 28, 52); c.fillStyle = '#FBFBFC'; c.fill();
  c.save(); rr(c, x + 14, y + 14, w - 28, h - 28, 52); c.clip(); c.translate(x + 14, y + 14); draw(w - 28, h - 28); c.restore();
  rr(c, x + w / 2 - 70, y + 30, 140, 32, 16); c.fillStyle = '#1B2330'; c.fill();
  c.restore();
}
function S4(c, t) {
  const s = SC[4], t0 = s.voStart - .5;
  kicker(c, 'IGLU · PDV DA LOJA', R, 210, t, t0);
  const pp = ap(t, t0, .6); if (pp.a <= 0) return;
  const tObs = Wd(4, 'observacao') - .1, tType = Wd(4, 'digite') - .1, tSave = Wd(4, 'salve'), tConf = Wd(4, 'confira') - .2, tPay = Wd(4, 'finalize');
  const note = 'ENTREGA FUTURA: 12/12/2026';
  c.save(); c.globalAlpha = pp.a; c.translate(0, pp.dy);
  phone(c, 330, 110, 470, 900, (w, h) => {
    const scr = t < tObs ? 0 : t < tSave + .35 ? 1 : 2;
    if (scr === 0) {
      txt(c, '←  Carrinho', 34, 120, 32, C.ink);
      const hi = pr(t, Wd(4, 'toque') - .1, .4);
      c.beginPath(); c.arc(w - 150, 108, 30 + 4 * Math.sin(Math.PI * hi), 0, Math.PI * 2); c.fillStyle = hi > 0 ? C.coralL : '#EEF2F6'; c.fill();
      if (hi > 0) { c.lineWidth = 4; c.strokeStyle = C.coral; c.stroke(); }
      for (let i = 0; i < 3; i++) { c.fillStyle = C.navy; c.fillRect(w - 164, 96 + i * 9, i === 2 ? 14 : 24, 3); }
      c.beginPath(); c.arc(w - 72, 108, 30, 0, Math.PI * 2); c.fillStyle = '#EEF2F6'; c.fill();
      rr(c, 24, 170, w - 48, 330, 26); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#E6E8EC'; c.stroke();
      [['Vendedor(a)', 'Ana Souza'], ['Cliente', 'Não identificado'], ['Descontos', 'Aplicar desconto']].forEach(([a1, a2], i) => { txt(c, a1, 64, 226 + i * 102, 22, C.slate, { w: 600 }); txt(c, a2, 64, 258 + i * 102, 26, C.ink); });
      rr(c, 24, h - 140, w - 48, 90, 45); c.fillStyle = C.ink; c.fill(); txt(c, 'Finalizar pagamento', w / 2, h - 84, 28, '#fff', { al: 'center' });
    } else {
      txt(c, '←  Observação', 34, 120, 32, C.ink);
      txt(c, 'Adicione uma observação ao carrinho.', 34, 166, 19, C.slate, { w: 600, mw: w - 60 });
      txt(c, 'Não dá para editar após o pagamento.', 34, 194, 19, C.slate, { w: 600, mw: w - 60 });
      const nch = scr === 1 ? Math.floor(note.length * clamp((t - tType) / 1.6)) : note.length;
      rr(c, 24, 240, w - 48, 86, 18); c.fillStyle = scr === 2 ? '#F2F4F7' : '#fff'; c.fill(); c.lineWidth = scr === 1 ? 3 : 2; c.strokeStyle = scr === 1 ? C.navy : '#E6E8EC'; c.stroke();
      txt(c, note.slice(0, Math.max(0, nch)) + (scr === 1 && Math.floor(t * 2.5) % 2 ? '|' : ''), 46, 294, 25, C.ink, { mw: w - 100 });
      if (scr === 1) { const pr2 = pr(t, tSave - .05, .3); rr(c, 24, 360, w - 48, 86, 18); c.fillStyle = C.navy; c.fill(); txt(c, 'Salvar', w / 2, 414, 28, '#fff', { al: 'center' }); if (pr2 > 0 && pr2 < 1) { c.globalAlpha *= 1 - pr2; c.beginPath(); c.arc(w / 2, 403, 20 + 120 * pr2, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,.4)'; c.fill(); c.globalAlpha = pp.a; } }
      if (scr === 2) {
        const ck = pr(t, tConf, .5);
        [['Editar', C.navy, '#EEF2F6'], ['Apagar', C.coral, '#FDE8E5']].forEach(([lab, col, bg], i) => { const bx = 24 + i * ((w - 48) / 2 + 8), bw = (w - 48) / 2 - 8; const pulse = Math.sin(Math.PI * clamp((t - tConf - i * .25) / .6)); rr(c, bx, 350, bw, 70, 18); c.fillStyle = bg; c.fill(); c.lineWidth = 2 + 3 * Math.max(0, pulse); c.strokeStyle = ck > 0 ? col : '#E6E8EC'; c.stroke();
          if (i === 0) { c.save(); c.translate(bx + 46, 385); c.rotate(-.8); c.fillStyle = col; c.fillRect(-12, -4, 22, 8); c.beginPath(); c.moveTo(10, -4); c.lineTo(18, 0); c.lineTo(10, 4); c.fill(); c.restore(); }
          else { c.fillStyle = col; c.fillRect(bx + 34, 372, 24, 4); c.fillRect(bx + 37, 378, 18, 20); c.fillRect(bx + 42, 368, 8, 4); }
          txt(c, lab, bx + 72, 394, 24, col); });
        const pay = pr(t, tPay - .1, .35);
        rr(c, 24, h - 140, w - 48, 90, 45); c.fillStyle = pay > 0 ? C.coral : C.ink; c.fill(); txt(c, 'Finalizar pagamento', w / 2, h - 84, 28, '#fff', { al: 'center' });
      }
    }
  });
  c.restore();
  const steps = [['No Carrinho, toque no ícone', 'de observação.', Wd(4, 'toque') - .2], ['Digite o texto padrão', 'e toque em Salvar.', Wd(4, 'digite') - .2], ['Confira a observação.', 'Lápis corrige, lixeira apaga.', tConf], ['Só então finalize', 'o pagamento.', tPay - .2]];
  steps.forEach(([a1, a2, tt], j) => {
    const p = ap(t, tt, .5); if (p.a <= 0) return;
    const y = 300 + j * 140;
    c.save(); c.globalAlpha = p.a; c.translate(p.dy * .6, 0);
    txt(c, '0' + (j + 1), R, y + 30, 52, C.coral);
    txt(c, a1, R + 100, y + 14, 32, C.ink); txt(c, a2, R + 100, y + 54, 28, C.slate, { w: 600 });
    c.restore();
  });
  pill(c, 'Depois do pagamento, não dá mais para editar', R, 880, 26, C.coral, '#fff', pr(t, Wd(4, 'depois') - .1, .6), { shadow: true });
}
function S5(c, t) {
  const s = SC[5], t0 = s.voStart - .5;
  kicker(c, 'ZISSOU WORLD · ORÇAMENTOS', L, 180, t, t0);
  const tMark = Wd(5, 'marque') + .3, tDate = Wd(5, 'preencha') - .1;
  const pp = ap(t, t0 + .1, .6);
  if (pp.a > 0) {
    c.save(); c.globalAlpha = pp.a; c.translate(0, pp.dy);
    const x = L, y = 230, w = 820;
    const open = eio(pr(t, tMark, .5)), hh = 500 + 150 * open;
    card(c, x, y, w, hh, { r: 30 });
    rr(c, x + 36, y + 36, 64, 64, 18); c.fillStyle = C.ink; c.fill(); txt(c, '$', x + 68, y + 82, 34, '#fff', { al: 'center' });
    txt(c, 'Condições comerciais', x + 124, y + 66, 34, C.ink); txt(c, 'Canal, frete, prazo e validade', x + 124, y + 98, 22, C.slate, { w: 600 });
    ['Cliente na loja', 'WhatsApp', 'Telefone', 'Outro'].forEach((lab, i) => { const bx = x + 36 + i * 190, on = i === 0; rr(c, bx, y + 140, 176, 60, 16); c.fillStyle = on ? C.ink : '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = on ? C.ink : '#E3E6EA'; c.stroke(); txt(c, lab, bx + 88, y + 178, 21, on ? '#fff' : C.ink, { al: 'center', mw: 160 }); });
    [['FRETE', 'Frete grátis'], ['PRAZO DE ENTREGA', 'Julho/2026'], ['VALIDADE', '19/11/2026']].forEach(([lab, v], i) => { const bx = x + 36 + i * 254; txt(c, lab, bx, y + 250, 18, C.slate, { w: 700, ls: 2 }); rr(c, bx, y + 266, 236, 64, 16); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#E3E6EA'; c.stroke(); txt(c, v, bx + 20, y + 307, 24, i ? C.ink : '#2E9E6B'); });
    // checkbox row
    const ry = y + 370;
    rr(c, x + 36, ry, w - 72, 90 + 150 * open, 22); c.fillStyle = '#F6F7F9'; c.fill(); const glow = Math.sin(Math.PI * pr(t, tMark - .2, .6)); c.lineWidth = 2 + 3 * glow; c.strokeStyle = glow > 0 ? C.coral : '#E3E6EA'; c.stroke();
    checkbox(c, x + 66, ry + 25, 40, pr(t, tMark, .4));
    txt(c, 'É entrega futura?', x + 130, ry + 56, 30, C.ink);
    if (open > .05) {
      c.save(); c.globalAlpha *= open;
      txt(c, 'DATA COMBINADA DE ENTREGA', x + 66, ry + 128, 18, C.slate, { w: 700, ls: 2 });
      rr(c, x + 66, ry + 146, 380, 68, 16); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3; c.strokeStyle = pr(t, tDate, .3) > 0 ? C.navy : '#E3E6EA'; c.stroke();
      const d = '12/12/2026', n = Math.floor(d.length * clamp((t - tDate) / .9));
      txt(c, n > 0 ? d.slice(0, n) : 'dd/mm/aaaa', x + 90, ry + 190, 26, n > 0 ? C.ink : C.gray);
      c.restore();
    }
    c.restore();
  }
  const X2 = 1090;
  const items = [['1', 'Marque "É entrega futura?"', Wd(5, 'marque') - .2], ['2', 'Preencha a data combinada', Wd(5, 'preencha') - .2]];
  items.forEach(([n, lab, tt], j) => { const p = ap(t, tt, .5); if (p.a <= 0) return; const y = 300 + j * 100; c.save(); c.globalAlpha = p.a; c.beginPath(); c.arc(X2 + 26, y - 10, 26, 0, Math.PI * 2); c.fillStyle = C.navy; c.fill(); txt(c, n, X2 + 26, y, 28, '#fff', { al: 'center' }); txt(c, lab, X2 + 72, y, 30, C.ink, { mw: 600 }); c.restore(); });
  const pk = ap(t, Wd(5, 'sistema') - .2, .5);
  if (pk.a > 0) { c.save(); c.globalAlpha = pk.a; c.translate(0, pk.dy * .5); card(c, X2, 480, 670, 170, { r: 26 }); txt(c, 'PRONTO', X2 + 32, 528, 20, C.coral, { ls: 5 }); txt(c, 'O sistema escreve no pedido:', X2 + 32, 570, 26, C.slate, { w: 600 }); txt(c, 'ENTREGA FUTURA: 12/12/2026', X2 + 32, 618, 32, C.ink); c.restore(); }
  const wk = ap(t, Wd(5, 'atencao') - .2, .5);
  if (wk.a > 0) { c.save(); c.globalAlpha = wk.a; c.translate(0, wk.dy * .5); card(c, X2, 690, 670, 190, { r: 26, fill: '#FDF1EE' }); rr(c, X2, 690, 10, 190, [26, 0, 0, 26]); c.fillStyle = C.coral; c.fill(); txt(c, 'ATENÇÃO', X2 + 40, 738, 20, C.coral, { ls: 5 }); txt(c, 'Só o prazo de entrega não basta:', X2 + 40, 782, 28, C.ink, { mw: 600 }); txt(c, 'a caixa precisa estar marcada', X2 + 40, 822, 28, C.ink, { mw: 600 }); txt(c, 'e a data preenchida.', X2 + 40, 860, 28, C.ink, { mw: 600 }); c.restore(); }
}
function S6(c, t) {
  const s = SC[6], t0 = s.voStart - .45;
  const p = ap(t, t0, .6); if (p.a <= 0) return;
  c.save(); c.globalAlpha = p.a; c.translate(0, p.dy);
  c.shadowColor = 'rgba(20,27,38,.25)'; c.shadowBlur = 60; c.shadowOffsetY = 24; rr(c, 260, 220, 1400, 640, 40); c.fillStyle = C.navy; c.fill(); c.shadowColor = 'transparent';
  txt(c, 'REGRA DE OURO', 340, 320, 24, C.coral, { ls: 8 });
  txt(c, 'O mesmo texto nos dois sistemas.', 340, 400, 58, '#fff');
  const bk = pr(t, Wd(6, 'texto') - .1, .5);
  if (bk > 0) { c.save(); c.globalAlpha *= clamp(bk * 1.5); rr(c, 340, 450, 860, 110, 22); c.lineWidth = 3; c.strokeStyle = C.coral; c.stroke(); txt(c, 'ENTREGA FUTURA: dd/mm/aaaa', 380, 522, 44, '#fff'); c.restore(); }
  const col = (lab, sub, x, tt) => { const q = ap(t, tt, .5); if (q.a <= 0) return; c.save(); c.globalAlpha *= q.a; c.translate(0, q.dy * .5); rr(c, x, 610, 620, 170, 26); c.fillStyle = 'rgba(255,255,255,.08)'; c.fill(); txt(c, lab, x + 36, 680, 40, '#fff'); txt(c, sub, x + 36, 732, 30, C.coral, { w: 600 }); c.restore(); };
  col('iGlu', 'você digita', 340, Wd(6, 'iglu') - .15);
  col('Zissou World', 'o sistema escreve', 980, Wd(6, 'zicu') - .15);
  c.restore();
}
function S7(c, t) {
  const s = SC[7];
  rise(c, 'Entrega futura', 960, 523, 84, C.ink, t, Wd(7, 'entrega') - .25, { al: 'center' });
  rise(c, 'bem registrada:', 960, 621, 84, C.ink, t, Wd(7, 'registrada') - .25, { al: 'center' });
  rise(c, 'cliente tranquilo.', 960, 719, 84, C.coral, t, Wd(7, 'cliente') - .25, { al: 'center' });
  const lk = eo(pr(t, Wd(7, 'bora') + .2, .8));
  if (lk > 0) { const lw = 260, lh = lw * IMG.logo.height / IMG.logo.width; c.save(); c.globalAlpha = lk; c.drawImage(IMG.logoN, 960 - lw / 2, 792 + 12 * (1 - lk), lw, lh); c.restore(); }
}
const SCN = [S0, S1, S2, S3, S4, S5, S6, S7];

function composite(c, t) {
  CAM = camAt(t);
  drawBG(c, t);
  camera.position.set(toU(CAM.x), -toU(CAM.y), D); camera.lookAt(toU(CAM.x), -toU(CAM.y), 0);
  upd3D(t); contactShadows(c); renderer.render(scene, camera); c.drawImage(glc, 0, 0);
  for (let i = 0; i < A.length; i++) {
    if (Math.abs(i - CAM.s) > 1) continue;
    const ox = A[i].x - CAM.x, oy = A[i].y - CAM.y; if (Math.abs(ox) > 2200) continue;
    c.save(); c.translate(ox, oy); SCN[i](c, t); c.restore();
  }
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
