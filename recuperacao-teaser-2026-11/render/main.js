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

// ---------- icons per scene ----------
const ICONS = [];
function addIcon(i, model, sx, sy, scale, opt = {}) { const grp = new THREE.Group(); grp.add(model); scene.add(grp); ICONS.push({ i, grp, model, sx, sy, scale, opt, sh: { a: 0 } }); }
function build(iconPts) {
  addIcon(0, mQuote(), 1450, 540, 1.55, { ry: -.45, anim: 'swing' });
  addIcon(1, mIcon(iconPts), 1430, 520, 2.0, { ry: -.3, anim: 'spin' });
  addIcon(2, mIcon(iconPts), 960, 330, 1.3, { final: true, anim: 'spin' });
}
function upd3D(t) {
  for (const ic of ICONS) {
    const s0 = ic.i ? TR[ic.i - 1] - 1 : -1, s1 = ic.i < A.length - 1 ? TR[ic.i] + 1 : 1e9;
    const vis = t > s0 && t < s1;
    ic.grp.visible = vis; ic.sh.a = 0; if (!vis) continue;
    const intro = SC[ic.i].voStart - .55 + (ic.opt.delay || 0);
    const kr = pr(t, intro, 1.1), k = backO(kr);
    const sc = ic.scale;
    const p = scenePos(ic.i, ic.sx, ic.sy, 0);
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
    if (!ic.opt.final) ic.sh = { a: clamp(k), x: A[ic.i].x + ic.sx, y: A[ic.i].y + ic.sy + 150 * sc - bob * 100, w: 140 * sc };
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
  kicker(c, 'EM BREVE NO PORTAL', L, 300, t, s.voStart - .5);
  rise(c, 'Sabe aquele', L, 450, 104, C.ink, t, Wd(0, 'sabe') - .2);
  rise(c, 'orçamento que', L, 568, 104, C.ink, t, Wd(0, 'orcamento') - .2);
  rise(c, 'esfriou?', L, 686, 104, C.slate, t, Wd(0, 'esfriou') - .2);
}
function S1(c, t) {
  const s = SC[1];
  rise(c, 'Ele ainda pode', L, 500, 110, C.ink, t, Wd(1, 'ele') - .2);
  rise(c, 'virar uma venda.', L, 625, 110, C.coral, t, Wd(1, 'virar') - .2);
}
function S2(c, t) {
  const s = SC[2], t0 = s.voStart - .6;
  // blurred glimpses of the new screens (no details)
  const g = eo(pr(t, t0, .8));
  if (g > 0) {
    c.save(); c.globalAlpha = .38 * g; c.filter = 'blur(9px)';
    const dx = (t - t0) * 18;
    let x = 120 - dx; [['Vencidos', 17], ['Cliente não responde', 19], ['Conversa parada', 14]].forEach(([l, n]) => { x += (chip(c, l, n, x, 120, 1, { size: 30 }) || 300) + 24; });
    button(c, 'Oferecer condição', 1240 + dx * .6, 930, 420, 74, 1, { icon: 'spark' });
    card(c, 60 + dx * .4, 820, 520, 150, { r: 26 }); txt(c, '5%', 140 + dx * .4, 915, 64, C.ink);
    card(c, 1440 - dx * .5, 160, 420, 160, { r: 26 }); txt(c, 'Recuperados', 1480 - dx * .5, 220, 26, C.slate, { w: 600 }); txt(c, '9', 1480 - dx * .5, 290, 60, C.coral);
    c.restore();
  }
  kicker(c, 'NOVIDADE NO PORTAL', 960, 490, t, Wd(2, 'hoje') - .3, { al: 'center' });
  rise(c, 'Hoje, mais tarde.', 960, 620, 116, C.ink, t, Wd(2, 'hoje') - .2, { al: 'center' });
  rise(c, 'Fica ligado, time.', 960, 692, 38, C.coral, t, Wd(2, 'fica') - .2, { al: 'center', w: 600 });
  const lk = eo(pr(t, Wd(2, 'time') + .2, .8));
  if (lk > 0) { const lw = 230, lh = lw * IMG.logo.height / IMG.logo.width; c.save(); c.globalAlpha = lk; c.drawImage(IMG.logoN, 960 - lw / 2, 752 + 10 * (1 - lk), lw, lh); c.restore(); }
}
const SCN = [S0, S1, S2];

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
  const P = [[960, 540], [3160, 640], [5360, 540]];
  A = P.map(([x, y]) => ({ x, y }));
  IMG.logo = await loadImg('../assets/logo.png');
  { const c = document.createElement('canvas'); c.width = IMG.logo.width; c.height = IMG.logo.height; const g = c.getContext('2d'); g.drawImage(IMG.logo, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#293C4D'; g.fillRect(0, 0, c.width, c.height); IMG.logoN = c; }
  const shape = await (await fetch('../assets/icon_shape.json')).json();
  build(shape.pts);
  renderer.compile(scene, camera);
  return true;
})();
window.renderAt = renderAt;
