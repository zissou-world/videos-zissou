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

function mRobot() {
  const g = new THREE.Group();
  const head = mesh(new RoundedBoxGeometry(2.2, 1.7, 1.4, 6, .45), M.white, 0, .35, 0); g.add(head);
  const face = mesh(new RoundedBoxGeometry(1.75, 1.15, .1, 5, .3), M.navy, 0, .35, .68); g.add(face);
  const eyes = []; for (const x of [-.4, .4]) { const e = mesh(new THREE.CapsuleGeometry(.12, .16, 8, 16), new THREE.MeshBasicMaterial({ color: 0x8CF0D2 }), x, .42, .75); g.add(e); eyes.push(e); }
  const smile = mesh(new THREE.TorusGeometry(.22, .045, 10, 32, Math.PI), new THREE.MeshBasicMaterial({ color: 0x8CF0D2 }), 0, .14, .75); smile.rotation.z = Math.PI; g.add(smile);
  g.add(mesh(new THREE.CylinderGeometry(.05, .05, .45, 16), M.navy, 0, 1.4, 0)); g.add(mesh(new THREE.SphereGeometry(.16, 24, 16), M.coral, 0, 1.68, 0));
  for (const x of [-1.18, 1.18]) g.add(mesh(new THREE.CylinderGeometry(.22, .22, .2, 24).rotateZ(Math.PI / 2), M.coral, x, .35, 0));
  const body = mesh(new RoundedBoxGeometry(1.5, .75, 1.0, 5, .3), M.white, 0, -.95, 0); g.add(body);
  g.add(mesh(new RoundedBoxGeometry(.5, .22, .06, 3, .06), M.coral, 0, -.9, .52));
  g.userData.eyes = eyes;
  return sh(g);
}
function mBox() {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(2.0, 1.5, 1.6, 4, .08), new THREE.MeshPhysicalMaterial({ color: 0xE9C9A3, roughness: .7 }), 0, -.1, 0));
  g.add(mesh(new RoundedBoxGeometry(.36, 1.52, 1.62, 2, .04), M.coral, 0, -.1, 0));
  const lbl = canvasTex(512, 300, x => { x.fillStyle = '#fff'; x.fillRect(0, 0, 512, 300); x.drawImage(IMG.logo, 96, 40, 320, 320 * IMG.logo.height / IMG.logo.width); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#293C4D'; x.fillRect(0, 0, 512, 300); x.globalCompositeOperation = 'source-over'; x.fillStyle = '#141B26'; for (let i = 0; i < 4; i++) x.fillRect(80, 190 + i * 22, i % 2 ? 260 : 350, 10); });
  g.add(mesh(new THREE.PlaneGeometry(.8, .48), new THREE.MeshBasicMaterial({ map: lbl }), .55, -.25, .815));
  return sh(g);
}
// ---------- icons per scene ----------
const ICONS = [];
function addIcon(i, model, sx, sy, scale, opt = {}) { const grp = new THREE.Group(); grp.add(model); scene.add(grp); ICONS.push({ i, grp, model, sx, sy, scale, opt, sh: { a: 0 } }); }
function build(iconPts) {
  addIcon(0, mIcon(iconPts), 1480, 380, 1.7, { ry: -.3, anim: 'spin', delay: -2.3 });
  addIcon(0, mRobot(), 1560, 760, .85, { ry: -.35, delay: Wd(0, 'robo') - SC[0].voStart - .4, anim: 'robot' });
  addIcon(1, mBubbles(), 150, 330, .55, { ry: -.4, anim: 'swing' });
  addIcon(2, mTag(), 150, 330, .55, { ry: -.4, anim: 'swing' });
  addIcon(3, mBox(), 150, 330, .5, { ry: -.45 });
  addIcon(5, mWatch(), 150, 330, .6, { ry: -.35 });
  addIcon(6, mRobot(), 960, 210, .62, { ry: -.2, anim: 'robot' });
  addIcon(7, mIcon(iconPts), 960, 330, 1.5, { final: true, anim: 'spin' });
  addIcon(7, mRobot(), 1560, 330, .6, { ry: -.4, delay: .4, anim: 'robot' });
}
function upd3D(t) {
  for (const ic of ICONS) {
    const s0 = ic.i ? TR[ic.i - 1] - 1 : -1, s1 = ic.i < A.length - 1 ? TR[ic.i] + 1 : 1e9;
    const vis = t > s0 && t < s1;
    ic.grp.visible = vis; ic.sh.a = 0; if (!vis) continue;
    const intro = SC[ic.i].voStart - .55 + (ic.opt.delay || 0);
    const kr = pr(t, intro, 1.1), k = backO(kr);
    const sc = ic.scale;
    let isx = ic.sx; if (ic.opt.drive) { const dk = eio(pr(t, ic.opt.drive[0], ic.opt.drive[1])); isx = lerp(ic.sx, ic.opt.drive[2], dk); if (ic.model.userData.wheels) ic.model.userData.wheels.forEach(w => { w.rotation.z = -dk * 40; }); }
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
    if (ic.opt.anim === 'robot') { extraZ = Math.sin(t * 2.2) * .08; const bl = (t % 3.3) < .12; if (ic.model.userData.eyes) ic.model.userData.eyes.forEach(e => e.scale.y = bl ? .15 : 1); }
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
// ---------- UI kit: phone, WhatsApp chat, Zissou World ----------
const WA = { bg: '#EFEAE2', out: '#D9FDD3', inn: '#FFFFFF', green: '#1FA855', meta: '#667781' };
function phone(c, x, y, w, h, draw) {
  c.save(); c.shadowColor = 'rgba(20,27,38,.22)'; c.shadowBlur = 60; c.shadowOffsetY = 26;
  rr(c, x, y, w, h, 64); c.fillStyle = '#1B2330'; c.fill(); c.shadowColor = 'transparent';
  rr(c, x + 14, y + 14, w - 28, h - 28, 52); c.fillStyle = '#FBFBFC'; c.fill();
  c.save(); rr(c, x + 14, y + 14, w - 28, h - 28, 52); c.clip(); c.translate(x + 14, y + 14); draw(w - 28, h - 28); c.restore();
  rr(c, x + w / 2 - 70, y + 30, 140, 32, 16); c.fillStyle = '#1B2330'; c.fill();
  c.restore();
}
function wrap(c, s, size, maxw, wgt = 600) {
  const words = s.split(' '), lines = []; let cur = '';
  for (const w of words) { const tst = cur ? cur + ' ' + w : w; if (tw(c, tst, size, wgt) > maxw && cur) { lines.push(cur); cur = w; } else cur = tst; }
  if (cur) lines.push(cur); return lines;
}
// message: {t, side:'in'|'out', text, buttons:[..], pick:{i,t}, list:[[title,sub]..], pickList:{i,t}, doc:'name', link:'url', audio:true, note:true}
function msgHeight(c, m, bw) {
  const fs = 21, lh = 28; let h = 22;
  if (m.text) h += wrap(c, m.text, fs, bw - 36).length * lh;
  if (m.doc) h += 70; if (m.link) h += 78; if (m.audio) h += 52;
  if (m.list) h += m.list.length * 66 + 6;
  if (m.text && (m.doc || m.link || m.list || m.audio)) h += 8;
  let ext = 0; if (m.buttons) ext = m.buttons.length * 58 + 4;
  return { h: h + 10, ext };
}
function drawMsg(c, m, x, y, bw, t, w) {
  const fs = 21, lh = 28, out = m.side === 'out', k = eo5(pr(t, m.t, .35));
  const { h } = msgHeight(c, m, bw); const bx = out ? w - 18 - bw : 18;
  c.save(); c.globalAlpha *= clamp(k * 1.6); c.translate(0, (1 - k) * 18);
  c.shadowColor = 'rgba(0,0,0,.08)'; c.shadowBlur = 4; c.shadowOffsetY = 1;
  rr(c, bx, y, bw, h, 16); c.fillStyle = m.note ? '#FFF6D6' : out ? WA.out : WA.inn; c.fill(); c.shadowColor = 'transparent';
  let cy = y + 14;
  if (m.text) { const ls = wrap(c, m.text, fs, bw - 36); ls.forEach((l, i) => txt(c, l, bx + 18, cy + 22 + i * lh, fs, '#111B21', { w: 600 })); cy += ls.length * lh + 8; }
  if (m.doc) { rr(c, bx + 12, cy, bw - 24, 62, 10); c.fillStyle = out ? '#C8F0C1' : '#F1F3F4'; c.fill(); rr(c, bx + 24, cy + 12, 34, 40, 6); c.fillStyle = '#E2453C'; c.fill(); txt(c, 'PDF', bx + 41, cy + 38, 12, '#fff', { al: 'center' });
    txt(c, m.doc, bx + 70, cy + 30, 19, '#111B21', { mw: bw - 100 }); txt(c, '1 página · PDF', bx + 70, cy + 52, 15, WA.meta, { w: 600 }); cy += 70; }
  if (m.link) { rr(c, bx + 12, cy, bw - 24, 70, 10); c.fillStyle = '#F1F3F4'; c.fill(); txt(c, 'Rastrear entrega', bx + 26, cy + 30, 19, '#111B21'); txt(c, m.link, bx + 26, cy + 54, 16, '#027EB5', { w: 600, mw: bw - 50 }); cy += 78; }
  if (m.audio) { c.beginPath(); c.arc(bx + 40, cy + 22, 18, 0, Math.PI * 2); c.fillStyle = WA.green; c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(bx + 34, cy + 12); c.lineTo(bx + 48, cy + 22); c.lineTo(bx + 34, cy + 32); c.fill();
    for (let i = 0; i < 26; i++) { const hh = 6 + 22 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * .6)); c.fillStyle = '#8696A0'; c.fillRect(bx + 72 + i * 8, cy + 22 - hh / 2, 4, hh); } cy += 52; }
  if (m.list) m.list.forEach(([a1, a2], i) => { const yy = cy + i * 66, on = m.pickList && m.pickList.i === i && t > m.pickList.t; rr(c, bx + 12, yy, bw - 24, 58, 10); c.fillStyle = on ? C.coralL : '#F7F8FA'; c.fill(); if (on) { c.lineWidth = 3; c.strokeStyle = C.coral; c.stroke(); }
    txt(c, a1, bx + 26, yy + 26, 18, '#111B21', { mw: bw - 60 }); if (a2) txt(c, a2, bx + 26, yy + 48, 15, WA.meta, { w: 600, mw: bw - 60 }); });
  txt(c, m.time || '10:2' + (Math.floor(m.t) % 9), bx + bw - 14, y + h - 8, 13, WA.meta, { al: 'right', w: 600 });
  if (m.buttons) m.buttons.forEach((b, i) => { const yy = y + h + 6 + i * 58, on = m.pick && m.pick.i === i && t > m.pick.t; rr(c, bx, yy, bw, 52, 14); c.fillStyle = on ? C.coral : '#fff'; c.fill();
    txt(c, b, bx + bw / 2, yy + 34, 20, on ? '#fff' : '#027EB5', { al: 'center' });
    if (m.pick && m.pick.i === i) { const p = pr(t, m.pick.t - .05, .5); if (p > 0 && p < 1) { c.save(); c.globalAlpha = 1 - p; c.strokeStyle = C.coral; c.lineWidth = 4; c.beginPath(); c.arc(bx + bw / 2, yy + 26, 10 + 60 * eo(p), 0, Math.PI * 2); c.stroke(); c.restore(); } } });
  c.restore();
}
function waScreen(c, w, h, t, msgs) {
  c.fillStyle = WA.bg; c.fillRect(0, 0, w, h);
  // header
  c.fillStyle = '#fff'; c.fillRect(0, 0, w, 120); c.fillStyle = '#E9EDEF'; c.fillRect(0, 119, w, 1);
  txt(c, '‹', 26, 98, 40, '#027EB5'); c.beginPath(); c.arc(92, 84, 26, 0, Math.PI * 2); c.fillStyle = C.coral; c.fill();
  if (IMG.logoW) c.drawImage(IMG.logoW, 72, 77, 40, 40 * IMG.logo.height / IMG.logo.width);
  txt(c, 'Zissou', 130, 80, 22, '#111B21'); txt(c, 'Conta comercial', 130, 104, 15, WA.meta, { w: 600 });
  // composer
  c.fillStyle = '#F6F5F3'; c.fillRect(0, h - 86, w, 86); rr(c, 18, h - 72, w - 100, 50, 25); c.fillStyle = '#fff'; c.fill(); txt(c, 'Mensagem', 40, h - 40, 18, '#9AA4AB', { w: 600 });
  c.beginPath(); c.arc(w - 44, h - 47, 25, 0, Math.PI * 2); c.fillStyle = WA.green; c.fill();
  // stack visible messages, auto-scroll to keep the newest in view
  const bw = Math.min(w * .78, 360), vis = msgs.filter(m => t > m.t - .02);
  const typing = msgs.find(m => m.side === 'in' && !m.note && t > m.t - .9 && t < m.t);
  let tot = 0; const hs = vis.map(m => { const q = msgHeight(c, m, bw); tot += q.h + q.ext + 14; return q; });
  if (typing) tot += 60;
  const top = 136, bottom = h - 100, avail = bottom - top; let y = top - Math.max(0, tot - avail);
  c.save(); c.beginPath(); c.rect(0, 120, w, h - 206); c.clip();
  vis.forEach((m, i) => { drawMsg(c, m, 0, y, bw, t, w); y += hs[i].h + hs[i].ext + 14; });
  if (typing) { rr(c, 18, y, 86, 46, 16); c.fillStyle = '#fff'; c.fill(); for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(42 + i * 19, y + 23, 5, 0, Math.PI * 2); c.fillStyle = `rgba(134,150,160,${.4 + .6 * Math.abs(Math.sin(t * 6 + i))})`; c.fill(); } }
  c.restore();
}
function phoneWA(c, t, msgs, t0, x = 300, y = 90) { const p = ap(t, t0, .7); if (p.a <= 0) return; c.save(); c.globalAlpha = p.a; c.translate(0, p.dy * 2); phone(c, x, y, 500, 930, (w, h) => waScreen(c, w, h, t, msgs)); c.restore(); }
// Zissou World inbox
function tag(c, s, x, y, col, bg) { const w = tw(c, s, 15, 700) + 22; rr(c, x, y, w, 28, 14); c.fillStyle = bg; c.fill(); txt(c, s, x + 11, y + 20, 15, col); return w; }
const CONVS = [['Mariana Costa', 'Quero comprar', 'Fila de Vendas'], ['Pedro Alves', 'Black: quero aproveitar!', 'Fila de Vendas'], ['Juliana Rocha', 'Já comprei · Troca', 'Fila de Pós-Venda'], ['Carlos Lima', 'Já comprei · Garantia', 'Fila de Pós-Venda']];
function zwFrame(c, x, y, w, h, title) {
  card(c, x, y, w, h, { r: 24 }); rr(c, x, y, w, 64, [24, 24, 0, 0]); c.fillStyle = C.ink; c.fill();
  c.beginPath(); c.arc(x + 40, y + 32, 16, 0, Math.PI * 2); c.fillStyle = C.coral; c.fill(); txt(c, 'Zissou World', x + 70, y + 40, 22, '#fff'); txt(c, title, x + w - 30, y + 40, 18, 'rgba(255,255,255,.65)', { al: 'right', w: 600 });
}
function convRow(c, x, y, w, [name, last, q], hi, k = 1) {
  c.save(); c.globalAlpha *= k; rr(c, x, y, w, 92, 14); c.fillStyle = hi ? C.coralL : '#fff'; c.fill(); if (hi) { c.lineWidth = 2.5; c.strokeStyle = C.coral; c.stroke(); }
  c.beginPath(); c.arc(x + 40, y + 46, 24, 0, Math.PI * 2); c.fillStyle = C.grayL; c.fill(); txt(c, name[0], x + 40, y + 55, 22, C.slate, { al: 'center' });
  txt(c, name, x + 78, y + 38, 21, C.ink, { mw: w - 260 }); txt(c, last, x + 78, y + 66, 17, C.slate, { w: 600, mw: w - 260 });
  const v = q.includes('Vendas') && !q.includes('Pós'); tag(c, q, x + w - tw(c, q, 15, 700) - 40, y + 32, v ? '#fff' : '#fff', v ? C.coral : C.navy);
  c.restore();
}
// ---------- scenes ----------
function S0(c, t) {
  const s = SC[0];
  kicker(c, 'ATENDIMENTO · WHATSAPP ZISSOU', L, 250, t, s.voStart - .5);
  const o1 = Wd(0, 'ele') - .3, o2 = Wd(0, 'neste') - .3;
  rise(c, 'Todo cliente chega', L, 380, 92, C.ink, t, Wd(0, 'todo') - .2, { out: o1 });
  rise(c, 'primeiro ao robô.', L, 485, 92, C.coral, t, Wd(0, 'robo') - .3, { out: o1 });
  rise(c, 'Ele não substitui', L, 380, 92, C.ink, t, o1 + .1, { out: o2 });
  rise(c, 'ninguém.', L, 485, 92, C.coral, t, o1 + .2, { out: o2 });
  // flow: cliente -> robo -> pessoa certa
  const fl = [['Cliente', 'chama no WhatsApp', Wd(0, 'organiza') - .2], ['Robô', 'organiza', Wd(0, 'atendimento') - .1], ['Pessoa certa', 'com as informações', Wd(0, 'pessoa') - .2]];
  fl.forEach(([a1, a2, tt], j) => { const p = ap(t, tt, .5), ko = eio(pr(t, o2, .4)); if (p.a <= 0 || ko >= 1) return; const x = L + j * 300, y = 590;
    c.save(); c.globalAlpha = p.a * (1 - ko); c.translate(0, p.dy); card(c, x, y, 260, 150, { r: 22, fill: j === 2 ? C.coral : '#fff' });
    txt(c, a1, x + 24, y + 62, 30, j === 2 ? '#fff' : C.ink, { mw: 220 }); txt(c, a2, x + 24, y + 100, 20, j === 2 ? 'rgba(255,255,255,.85)' : C.slate, { w: 600, mw: 220 });
    if (j < 2) txt(c, '→', x + 278, y + 86, 36, C.coral, { al: 'center' }); c.restore(); });
  rise(c, 'Como funciona', L, 400, 92, C.ink, t, o2 + .1);
  rise(c, 'e o que muda no', L, 505, 92, C.ink, t, o2 + .2);
  rise(c, 'dia a dia de vocês.', L, 610, 92, C.coral, t, o2 + .3);
}
function S1(c, t) {
  const s = SC[1], tOi = Wd(1, 'escreve') - .2, tBot = Wd(1, 'ola') - .1;
  phoneWA(c, t, [
    { t: tOi, side: 'out', text: 'Oi' },
    { t: tBot, side: 'in', text: 'Olá, que bom ter você na Zissou! 💤 Como podemos te ajudar hoje?', buttons: ['Quero comprar', 'Já comprei'] },
  ], s.voStart - .6);
  const X = 980;
  kicker(c, 'O PRIMEIRO CONTATO', X, 230, t, s.voStart - .3);
  rise(c, 'Só duas opções.', X, 340, 84, C.ink, t, Wd(1, 'sao') - .2);
  const rows = [['Quero comprar', 'Vendas', C.coral, Wd(1, 'quer') - .2], ['Já comprei', 'Pós-Venda', C.navy, Wd(1, 'ja') - .2]];
  rows.forEach(([a1, a2, col, tt], j) => { const p = ap(t, tt, .5); if (p.a <= 0) return; const y = 420 + j * 170;
    c.save(); c.globalAlpha = p.a; c.translate(p.dy, 0); card(c, X, y, 760, 140, { r: 26 });
    rr(c, X + 30, y + 40, 270, 60, 30); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#027EB5'; c.stroke(); txt(c, a1, X + 165, y + 80, 24, '#027EB5', { al: 'center' });
    txt(c, '=', X + 345, y + 86, 44, C.slate, { al: 'center' });
    rr(c, X + 390, y + 34, 340, 72, 36); c.fillStyle = col; c.fill(); txt(c, a2, X + 560, y + 82, 32, '#fff', { al: 'center' }); c.restore(); });
  rise(c, 'Com uma escolha, a conversa', X, 830, 40, C.slate, t, Wd(1, 'com') - .2, { w: 600 });
  rise(c, 'já fica separada.', X, 880, 40, C.coral, t, Wd(1, 'separada') - .5);
}
function S2(c, t) {
  const s = SC[2], tTap = Wd(2, 'toca') + .2, tConf = Wd(2, 'confirmacao') - .3, tOff = Wd(2, 'horario') - .2, tCamp = Wd(2, 'campanha') - .3;
  phoneWA(c, t, [
    { t: -1, side: 'out', text: 'Oi' },
    { t: -1, side: 'in', text: 'Olá, que bom ter você na Zissou! 💤 Como podemos te ajudar hoje?', buttons: ['Quero comprar', 'Já comprei'], pick: { i: 0, t: tTap } },
    { t: tConf, side: 'in', text: 'Perfeito! Você está na fila de Vendas. Um especialista já vai falar com você. 🛏️' },
    { t: tOff, side: 'in', note: true, text: 'Fora do horário: a loja abre amanhã às 10h. Sua mensagem fica guardada na fila.' },
  ], s.voStart - .6);
  const X = 980, sw = Wd(2, 'vendedor') - .6;
  if (t < sw + .5) { const ko = eio(pr(t, sw, .45)); c.save(); c.globalAlpha = 1 - ko;
    kicker(c, 'CAMINHO DE VENDAS', X, 230, t, s.voStart - .3);
    const it = [['Direto para a fila de Vendas', 'sem menu no meio', Wd(2, 'direto') - .2], ['Confirmação na hora', 'o cliente sabe que está na fila', tConf], ['Fora do horário', 'já avisa quando a loja abre', tOff], ['Campanha, como a Black', 'cai direto em Vendas', tCamp]];
    it.forEach(([a1, a2, tt], j) => { const p = ap(t, tt, .5); if (p.a <= 0) return; const y = 300 + j * 140;
      c.save(); c.globalAlpha *= p.a; c.translate(p.dy, 0); check(c, X + 28, y + 42, 50, pr(t, tt, .5)); txt(c, a1, X + 80, y + 46, 34, C.ink, { mw: 700 }); txt(c, a2, X + 80, y + 86, 24, C.slate, { w: 600, mw: 700 }); c.restore(); });
    c.restore(); }
  // Zissou World: queue with tag, first to accept takes it
  const pz = ap(t, sw + .2, .6);
  if (pz.a > 0) { const x = 900, y = 170, w = 900, h = 600; c.save(); c.globalAlpha = pz.a; c.translate(0, pz.dy);
    zwFrame(c, x, y, w, h, 'Conversas');
    const tAcc = Wd(2, 'aceitar') - .1;
    CONVS.slice(0, 2).forEach((cv, j) => convRow(c, x + 24, y + 90 + j * 104, w - 48, cv, j === 0, 1));
    txt(c, 'Fila de Vendas: o primeiro que aceitar assume o cliente.', x + 30, y + 330, 20, C.slate, { w: 600 });
    const acc = pr(t, tAcc, .4); rr(c, x + w - 250, y + 360, 210, 60, 30); c.fillStyle = acc > 0 ? '#2E9E6B' : C.coral; c.fill(); txt(c, acc > 0 ? 'Assumido ✓' : 'Aceitar', x + w - 145, y + 399, 22, '#fff', { al: 'center' });
    const cp = cursorAt(t, [[sw + .6, x + w - 60, y + 560], [tAcc - .1, x + w - 150, y + 395], [tAcc + 1.2, x + w - 150, y + 395]]); if (cp && t < s.voEnd) cursor(c, cp[0], cp[1], pr(t, tAcc - .05, .5));
    c.restore(); }
  const pb = ap(t, Wd(2, 'lide') - .3, .6);
  if (pb.a > 0) { c.save(); c.globalAlpha = pb.a; c.translate(0, pb.dy); card(c, 900, 800, 900, 170, { r: 26, fill: C.coral });
    txt(c, 'Lead chegando quente e organizado.', 940, 870, 36, '#fff', { mw: 820 }); txt(c, 'Quanto mais rápido aceitar, maior a chance de venda.', 940, 920, 26, 'rgba(255,255,255,.9)', { w: 600, mw: 820 }); c.restore(); }
}
function S3(c, t) {
  const s = SC[3], W3 = k => Wd(3, k);
  const tTap = s.voStart - .2, tFind = W3('robo') - .2, tOne = W3('so') - .2, tMany = W3('varias') - .1, tCpf = W3('cpf') - .4, tAss = W3('depois') - .1;
  const tNf = W3('nota') + .2, tSend = W3('envia') - .1, tRes = W3('isso') - .2, tSim = W3('sim') - .1, tTroca = W3('troca') - .2, tMot = W3('motivo') - .3, tGar = W3('garantia') - .1;
  const order = ['Pedido #48213 · 12/11', 'Colchão Zissou Queen'], order2 = ['Pedido #47790 · 03/10', 'Travesseiro Zissou (2 un.)'];
  let msgs;
  if (t < tMany - .05) msgs = [
    { t: -1, side: 'in', text: 'Como podemos te ajudar hoje?', buttons: ['Quero comprar', 'Já comprei'], pick: { i: 1, t: tTap + .3 } },
    { t: tFind, side: 'in', text: 'Encontrei uma compra no seu número. É sobre este pedido?', list: [order] , buttons: ['Sim', 'Outro pedido'] }];
  else if (t < tAss - .05) msgs = [
    { t: -1, side: 'in', text: 'Como podemos te ajudar hoje?', buttons: ['Quero comprar', 'Já comprei'], pick: { i: 1, t: -1 } },
    { t: tMany, side: 'in', text: 'Encontrei estas compras no seu número. Sobre qual você quer falar?', list: [order, order2], pickList: { i: 0, t: tCpf - .4 } },
    { t: tCpf, side: 'in', note: true, text: 'Não está aqui? Digite seu CPF. Só aparecem pedidos ligados a este telefone. 🔒' }];
  else if (t < tTroca - .05) msgs = [
    { t: -1, side: 'in', text: 'Sobre qual você quer falar?', list: [order], pickList: { i: 0, t: -1 } },
    { t: tAss, side: 'in', text: 'Certo! Qual é o assunto?', list: [['2ª via da nota fiscal', ''], ['Entrega', ''], ['Troca ou devolução', ''], ['Garantia do produto', '']], pickList: { i: 0, t: tNf } },
    { t: tSend, side: 'in', text: 'Aqui está a sua nota fiscal:', doc: 'NF-e 48213.pdf' },
    { t: tRes, side: 'in', text: 'Isso resolveu?', buttons: ['Sim, resolveu', 'Falar com especialista'], pick: { i: 0, t: tSim + .2 } }];
  else msgs = [
    { t: -1, side: 'in', text: 'Certo! Qual é o assunto?', list: [['2ª via da nota fiscal', ''], ['Entrega', ''], ['Troca ou devolução', ''], ['Garantia do produto', '']], pickList: { i: 2, t: tTroca + .3 } },
    { t: tTroca + .8, side: 'in', text: 'Qual item você quer trocar ou devolver?', list: [['Colchão Zissou Queen', 'Pedido #48213']], pickList: { i: 0, t: tMot - .4 } },
    { t: tMot, side: 'in', text: 'Qual é o motivo?' },
    { t: tGar + .4, side: 'in', note: true, text: 'Na garantia: “Conte pra gente o que aconteceu com o produto.”' }];
  phoneWA(c, t, msgs, s.voStart - .6);
  const X = 980;
  kicker(c, 'CAMINHO DO PÓS-VENDA', X, 220, t, s.voStart - .3);
  const st = (rows, t0, t1, y = 340) => rows.forEach(([str, col, sz], j) => rise(c, str, X, y + j * (sz || 64) * 1.15, sz || 64, col, t, t0 + j * .1, { out: t1 }));
  st([['Sem digitar nada.', C.ink], ['O robô encontra as compras', C.slate, 40], ['pelo celular da conversa.', C.slate, 40]], s.voStart - .2, tOne - .3);
  st([['Uma compra?', C.ink], ['Ele confirma.', C.coral]], tOne, tMany - .3);
  st([['Várias?', C.ink], ['Mostra a lista com', C.ink], ['data e produtos.', C.coral]], tMany, tCpf - .3);
  { const p = ap(t, tCpf, .5), ko = eio(pr(t, tAss - .35, .4)); if (p.a > 0 && ko < 1) { c.save(); c.globalAlpha = p.a * (1 - ko); c.translate(0, p.dy); card(c, X, 300, 780, 260, { r: 26 });
    uiIcon(c, 'shield', X + 70, 380, 70, C.navy); txt(c, 'Busca por CPF, com segurança', X + 130, 390, 34, C.ink, { mw: 620 });
    txt(c, 'Só aparecem pedidos ligados', X + 130, 450, 28, C.slate, { w: 600 }); txt(c, 'àquele telefone.', X + 130, 492, 28, C.coral); c.restore(); } }
  st([['Depois, o assunto.', C.ink]], tAss, W3('nota') - .4);
  st([['Nota fiscal e rastreio:', C.ink], ['o robô resolve sozinho.', C.coral]], W3('nota') - .3, tSim - .4);
  // outcomes
  const oc = [['Resolveu?', 'Atendimento termina ali, sem ocupar ninguém.', tSim, '#2E9E6B'], ['Pediu especialista', 'Vai para a fila do Pós-Venda.', W3('especialista') - .2, C.navy], ['Sem resposta em 4 horas', 'Atendimento encerrado sozinho.', W3('quatro') - .3, C.slate]];
  oc.forEach(([a1, a2, tt, col], j) => { const p = ap(t, tt, .5), ko = eio(pr(t, tTroca - .4, .4)); if (p.a <= 0 || ko >= 1) return; const y = 300 + j * 175;
    c.save(); c.globalAlpha = p.a * (1 - ko); c.translate(p.dy, 0); card(c, X, y, 800, 150, { r: 24 }); rr(c, X, y, 12, 150, [24, 0, 0, 24]); c.fillStyle = col; c.fill();
    txt(c, a1, X + 40, y + 62, 32, C.ink, { mw: 720 }); txt(c, a2, X + 40, y + 108, 25, C.slate, { w: 600, mw: 720 }); c.restore(); });
  const tc = [['Troca ou devolução', 'O robô pergunta o item e o motivo.', tTroca], ['Garantia', 'O cliente conta o que aconteceu.', tGar]];
  tc.forEach(([a1, a2, tt], j) => { const p = ap(t, tt, .5); if (p.a <= 0) return; const y = 320 + j * 200;
    c.save(); c.globalAlpha = p.a; c.translate(p.dy, 0); card(c, X, y, 800, 170, { r: 24, fill: j ? '#fff' : C.coralL }); txt(c, a1, X + 40, y + 72, 36, C.ink); txt(c, a2, X + 40, y + 122, 27, C.slate, { w: 600 }); c.restore(); });
}
function S4(c, t) {
  const s = SC[4], W4 = (k, n) => Wd(4, k, n);
  kicker(c, 'O QUE O ATENDENTE VÊ', L, 150, t, s.voStart - .4);
  rise(c, 'A conversa chega com um resumo.', L, 225, 50, C.ink, t, W4('resumo') - .5);
  const p = ap(t, s.voStart - .5, .7); if (p.a <= 0) return;
  const x = 170, y = 270, w = 1580, h = 720;
  c.save(); c.globalAlpha = p.a; c.translate(0, p.dy);
  zwFrame(c, x, y, w, h, 'Fila de Pós-Venda');
  // list
  [CONVS[2], CONVS[3]].forEach((cv, j) => convRow(c, x + 20, y + 84 + j * 102, 470, cv, j === 0));
  // chat
  const cx = x + 510, cw = 520; rr(c, cx, y + 84, cw, h - 104, 16); c.fillStyle = WA.bg; c.fill();
  txt(c, 'Juliana Rocha', cx + 24, y + 124, 22, C.ink); tag(c, 'Fila de Pós-Venda', cx + cw - tw(c, 'Fila de Pós-Venda', 15, 700) - 46, y + 102, '#fff', C.navy);
  const ta = W4('audios') - .2;
  const bub = (yy, text, out, k) => { if (k <= 0) return; c.save(); c.globalAlpha *= clamp(k * 1.5); const ls = wrap(c, text, 19, 380); const bh = 24 + ls.length * 26; rr(c, out ? cx + cw - 420 : cx + 20, yy, 400, bh, 14); c.fillStyle = out ? WA.out : '#fff'; c.fill(); ls.forEach((l, i) => txt(c, l, (out ? cx + cw - 420 : cx + 20) + 16, yy + 32 + i * 26, 19, '#111B21', { w: 600 })); c.restore(); return bh; };
  bub(y + 160, 'Troca ou devolução · Colchão Zissou Queen', true, 1);
  bub(y + 230, 'Motivo: firmeza diferente do que eu esperava', true, 1);
  // audio + transcription
  { const k = pr(t, ta, .5); if (k > 0) { c.save(); c.globalAlpha = clamp(k * 1.5); rr(c, cx + cw - 420, y + 310, 400, 170, 14); c.fillStyle = WA.out; c.fill();
    c.beginPath(); c.arc(cx + cw - 384, y + 350, 18, 0, Math.PI * 2); c.fillStyle = WA.green; c.fill(); for (let i = 0; i < 24; i++) { const hh = 6 + 22 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * .6)); c.fillStyle = '#7FA89A'; c.fillRect(cx + cw - 350 + i * 12, y + 350 - hh / 2, 5, hh); }
    txt(c, 'TRANSCRIÇÃO', cx + cw - 404, y + 404, 14, C.slate, { ls: 3 }); txt(c, '“Dormi uma semana e achei muito firme.', cx + cw - 404, y + 432, 18, '#111B21', { w: 600 }); txt(c, 'Dá pra trocar por um mais macio?”', cx + cw - 404, y + 458, 18, '#111B21', { w: 600 }); c.restore(); } }
  // internal notes: summary
  const nx = x + 1050, nw = 510; rr(c, nx, y + 84, nw, h - 104, 16); c.fillStyle = '#FFFBF0'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#F2E3B8'; c.stroke();
  txt(c, 'NOTAS INTERNAS', nx + 24, y + 120, 15, '#B08A2E', { ls: 3 }); txt(c, 'Resumo do robô', nx + 24, y + 156, 26, C.ink);
  const F = [['Pedido', '#48213 · 12/11', W4('pedido')], ['O que pediu', 'Troca', W4('pediu')], ['Itens', 'Colchão Zissou Queen', W4('itens')], ['Motivo', 'Firmeza diferente do esperado', W4('motivo')], ['Robô já respondeu', 'Enviou a 2ª via da nota fiscal', W4('respondeu')], ['Falta resolver', 'Combinar a troca por modelo mais macio', W4('falta')]];
  F.forEach(([a1, a2, tt], j) => { const k = pr(t, tt - .15, .45); const yy = y + 186 + j * 74; c.save(); c.globalAlpha *= .25 + .75 * clamp(k * 1.5);
    if (k > 0 && k < 1) { rr(c, nx + 12, yy - 6, nw - 24, 70, 10); c.fillStyle = `rgba(228,121,111,${.18 * Math.sin(Math.PI * k)})`; c.fill(); }
    txt(c, a1.toUpperCase(), nx + 24, yy + 20, 13, C.slate, { ls: 2 }); txt(c, a2, nx + 24, yy + 48, 21, j === 5 ? C.coral : C.ink, { mw: nw - 48 }); c.restore(); });
  c.restore();
  // overlays
  const ov = [['Sem perguntar tudo de novo.', W4('voces', 2) - .2], ['O cliente não repete a história.', W4('cliente', 3) - .2], ['É só ler o resumo e resolver.', W4('ler') - .3]];
  ov.forEach(([str, tt], j) => pill(c, str, 1000 + (j - 1) * 0, 40 + 0, 26, j === 2 ? C.coral : C.ink, '#fff', pr(t, tt, .5) * (1 - pr(t, (ov[j + 1] ? ov[j + 1][1] : W4('lembrete') - .6), .3)), { shadow: true, al: 'center' }));
  const pl = ap(t, W4('lembrete') - .5, .6);
  if (pl.a > 0) { c.save(); c.globalAlpha = pl.a; c.translate(0, pl.dy); card(c, 330, 925, 1260, 120, { r: 26, fill: C.coral });
    txt(c, 'LEMBRETE', 370, 973, 18, 'rgba(255,255,255,.8)', { ls: 4 }); txt(c, 'Sempre tente reverter cancelamento ou devolução para uma troca.', 370, 1017, 30, '#fff', { mw: 1180 }); c.restore(); }
}
function S5(c, t) {
  const s = SC[5], W5 = k => Wd(5, k);
  const tMsg = W5('mandar') - .1, tAv = W5('avisa') - .1, tMenu = W5('menu') - .2;
  phoneWA(c, t, [
    { t: -1, side: 'in', text: 'Perfeito! Você está na fila de Vendas. Um especialista já vai falar com você.' },
    { t: tMsg, side: 'out', text: 'Alguém aí? 🙂' },
    { t: tAv, side: 'in', text: 'Você já está na fila, não precisa mandar de novo. Já, já alguém do time fala com você! 😉' },
    { t: tMenu, side: 'out', text: 'Menu' },
    { t: tMenu + .8, side: 'in', text: 'Claro! Como podemos te ajudar?', buttons: ['Quero comprar', 'Já comprei'] },
  ], s.voStart - .6);
  const X = 980;
  kicker(c, 'FILA TRANSPARENTE', X, 230, t, s.voStart - .3);
  const sw = W5('sistema') - .4;
  rise(c, 'O cliente sabe', X, 340, 76, C.ink, t, s.voStart - .1, { out: sw });
  rise(c, 'que está na fila.', X, 430, 76, C.coral, t, s.voStart, { out: sw });
  rise(c, 'Escreveu “Menu”?', X, 560, 44, C.ink, t, tMenu - .2, { out: sw });
  rise(c, 'Volta às opções.', X, 615, 44, C.slate, t, tMenu, { out: sw, w: 600 });
  rise(c, 'A cada 10 minutos,', X, 400, 76, C.ink, t, sw + .1);
  rise(c, 'o sistema vigia tudo.', X, 490, 76, C.coral, t, sw + .2);
  const pa = ap(t, W5('alerta') - .4, .5);
  if (pa.a > 0) { const sh = Math.sin(t * 40) * 4 * (1 - pr(t, W5('alerta'), .6)); c.save(); c.globalAlpha = pa.a; c.translate(shh(sh), pa.dy); card(c, X, 560, 800, 150, { r: 26 });
    c.beginPath(); c.arc(X + 70, 635, 36, 0, Math.PI * 2); c.fillStyle = C.coral; c.fill(); txt(c, '!', X + 70, 650, 40, '#fff', { al: 'center' });
    txt(c, 'Cliente parado há 20 min · Fila de Vendas', X + 130, 622, 28, C.ink, { mw: 640 }); txt(c, 'Time e liderança foram avisados.', X + 130, 668, 24, C.slate, { w: 600 }); c.restore(); }
  rise(c, 'Nenhum cliente fica esquecido.', X, 820, 48, C.coral, t, W5('nenhum') - .3);
}
const shh = v => v;
function S6(c, t) {
  const s = SC[6], W6 = k => Wd(6, k);
  kicker(c, 'O QUE MELHORA', 960, 380, t, s.voStart - .4, { al: 'center' });
  rise(c, 'Resumindo.', 960, 470, 70, C.ink, t, s.voStart - .1, { al: 'center' });
  const G = [['Separação', 'Venda com Vendas, pós-venda com Pós-Venda.', 'chat', W6('separacao')], ['Velocidade', 'Nota e rastreio na hora, até de madrugada.', 'clock', W6('velocidade')], ['Foco', 'Vocês com os casos que precisam de gente.', 'spark', W6('foco')], ['Qualidade', 'Contexto completo e melhoria contínua.', 'shield', W6('qualidade')]];
  G.forEach(([a1, a2, ic, tt], j) => { const p = ap(t, tt - .2, .55); if (p.a <= 0) return; const x = 130 + j * 425, y = 560;
    c.save(); c.globalAlpha = p.a; c.translate(0, p.dy); card(c, x, y, 395, 330, { r: 28, fill: j === 3 ? C.navy : '#fff' });
    c.beginPath(); c.arc(x + 70, y + 76, 40, 0, Math.PI * 2); c.fillStyle = j === 3 ? 'rgba(255,255,255,.12)' : C.coralL; c.fill(); uiIcon(c, ic, x + 70, y + 76, 50, C.coral);
    txt(c, '0' + (j + 1), x + 340, y + 70, 26, j === 3 ? 'rgba(255,255,255,.5)' : C.gray, { al: 'right' });
    txt(c, a1, x + 34, y + 176, 40, j === 3 ? '#fff' : C.ink);
    wrap(c, a2, 24, 330).forEach((l, i) => txt(c, l, x + 34, y + 222 + i * 32, 24, j === 3 ? 'rgba(255,255,255,.8)' : C.slate, { w: 600 }));
    c.restore(); });
}
function S7(c, t) {
  const s = SC[7];
  rise(c, 'O robô cuida da organização.', 960, 560, 74, C.ink, t, s.voStart - .1, { al: 'center' });
  rise(c, 'Vocês cuidam do cliente.', 960, 660, 74, C.coral, t, Wd(7, 'voces') - .2, { al: 'center' });
  pill(c, 'Dúvida ou algo estranho? Mande o print para a liderança.', 960, 740, 26, C.ink, '#fff', pr(t, Wd(7, 'qualquer') - .2, .6), { al: 'center', shadow: true });
  const lk = eo(pr(t, Wd(7, 'bora') - .1, .7)); if (lk > 0) { const lw = 230, lh = lw * IMG.logo.height / IMG.logo.width; c.save(); c.globalAlpha = lk; c.drawImage(IMG.logoN, 960 - lw / 2, 860 + 10 * (1 - lk), lw, lh); c.restore(); }
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
  { const c = document.createElement('canvas'); c.width = IMG.logo.width; c.height = IMG.logo.height; const g = c.getContext('2d'); g.drawImage(IMG.logo, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); IMG.logoW = c; }
  const shape = await (await fetch('../assets/icon_shape.json')).json();
  build(shape.pts);
  renderer.compile(scene, camera);
  return true;
})();
window.renderAt = renderAt;
