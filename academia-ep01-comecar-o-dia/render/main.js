// Zissou World Academy · Portal do Vendedor · EP. 01 — Começar o dia. 1920x1080, cinematográfico: vídeo real + mockups + 3D.
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
function mTrophy() {
  const g = new THREE.Group(), inner = new THREE.Group(); inner.position.y = -.85; g.add(inner);
  const prof = [[0, .5], [.35, .55], [.7, .85], [.88, 1.3], [.92, 1.78], [.84, 1.78], [.8, 1.33], [.62, .95], [.3, .7], [0, .68]].map(p => new THREE.Vector2(p[0], p[1]));
  inner.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 72), M.coral));
  inner.add(mesh(new THREE.CylinderGeometry(.12, .16, .55, 32), M.coral, 0, .25, 0));
  for (const x of [-.98, .98]) inner.add(mesh(new THREE.TorusGeometry(.3, .07, 16, 40), M.coral, x, 1.35, 0));
  inner.add(mesh(new RoundedBoxGeometry(1.3, .34, .9, 3, .07), M.navy, 0, -.15, 0));
  inner.add(mesh(new RoundedBoxGeometry(.8, .14, .06, 2, .03), M.white, 0, -.15, .46));
  const st = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? .13 : .3, a = Math.PI / 2 + i * Math.PI / 5; i ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, Math.sin(a) * r); } st.closePath();
  inner.add(mesh(ext(st, .06, .03, 2), M.white, 0, 1.2, .84));
  return sh(g);
}

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

// ======================= ZISSOU WORLD ACADEMY · EP 01 =======================
const sp = (px, py, z = 0) => V(toU(px - W / 2), -toU(py - H / 2), z);
const ICONS = [];
function addIcon(model, x, y, scale, tIn, tOut, o = {}) { const grp = new THREE.Group(); grp.add(model); scene.add(grp); ICONS.push({ model, grp, x, y, scale, tIn, tOut, o }); }
let ZICON;
function whiteIcon(pts) { const z = mIcon(pts); z.traverse(o => { if (o.isMesh) o.material = new THREE.MeshPhysicalMaterial({ color: 0xFFF6EE, roughness: .3, emissive: 0xFFE3D4, emissiveIntensity: .45, clearcoat: .4 }); }); return z; }
function upd3D(t) {
  for (const ic of ICONS) {
    const vis = t > ic.tIn - .1 && t < ic.tOut + .6; ic.grp.visible = vis; if (!vis) continue;
    const kin = pr(t, ic.tIn, 1.0), kout = eio(pr(t, ic.tOut, .5)), k = backO(kin) * (1 - kout), lt = t - ic.tIn - 1;
    let ey = 0, ez = 0, sc = 1;
    if (ic.o.anim === 'spin' && lt > 0) ey = Math.PI * 2 * eio(pr((lt % 4) / 4, .6, .3));
    if (ic.o.anim === 'swing') ez = Math.sin(t * 2.2) * .18;
    if (ic.o.anim === 'beat' && lt > 0) sc = 1 + .1 * Math.pow(Math.max(0, Math.sin(t * 3.4)), 10);
    ic.grp.position.copy(sp(ic.x, ic.y, ic.o.z ?? 2)).add(V(0, Math.sin(t * 1.5 + ic.x) * .1 - (1 - eo(kin)) * 1.2 + kout * .7, 0));
    ic.grp.scale.setScalar(Math.max(.001, ic.scale * k * sc));
    ic.grp.rotation.set(.1 + Math.sin(t * .9) * .06, (ic.o.ry ?? .4) + Math.sin(t * .6 + ic.y) * .2 + (1 - eo(kin)) * Math.PI * 2 + ey + kout * 2, Math.sin(t * .8) * .04 + ez);
  }
}
// ---------- b-roll frames ----------
const BR = { meta: {}, cache: new Map() };
async function brFrame(name, t, speed = 1) {
  const m = BR.meta[name]; const i = clamp(Math.floor(t * m.fps * speed), 0, m.n - 1) + 1, key = name + i;
  if (BR.cache.has(key)) return BR.cache.get(key);
  const img = await loadImg(`../out/fr/${name}/${String(i).padStart(4, '0')}.jpg`); if (BR.cache.size > 6) BR.cache.clear(); BR.cache.set(key, img); return img;
}
async function drawBroll(c, name, t, t0, o = {}) {
  const img = await brFrame(name, Math.max(0, t - t0), o.speed || 1); const z = 1.04 + .04 * pr(t, t0, o.dur || 8);
  c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.drawImage(img, -W / 2, -H / 2, W, H); c.restore();
  // cinematic grade + letterbox
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(20,12,10,.25)'); g.addColorStop(.6, 'rgba(20,12,10,0)'); g.addColorStop(1, 'rgba(20,12,10,.55)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const lb = (o.letterbox ?? 1) * 92; c.fillStyle = '#0B0F16'; c.fillRect(0, 0, W, lb); c.fillRect(0, H - lb, W, lb);
}
// ---------- portal mockup on a tablet, with a camera that eases between focus points ----------
const VIEW = { x: 800, y: 150, w: 1000, h: 790 };       // right-hand stage
function camKey(t, keys) {   // keys: [[t, fx, fy, z], ...] in screenshot pixels
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = eio(pr(t, a[0], b[0] - a[0])); return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)]; } }
  return keys[keys.length - 1].slice(1);
}
// returns a function that maps screenshot px -> canvas px for overlays
function tabletShot(c, img, t, keys, o = {}) {
  const V2 = o.view || VIEW, iw = img.width, ih = img.height;
  const bez = 26, tw0 = V2.w * .9, th0 = tw0 * ih / iw;
  const tx = V2.x + (V2.w - tw0) / 2, ty = V2.y + (V2.h - th0) / 2;
  const [fx, fy, z] = camKey(t, keys);
  const sx = tw0 / iw;                         // screenshot -> base tablet scale
  const focusX = tx + fx * sx, focusY = ty + fy * sx;   // focus in base coordinates
  const cx = V2.x + V2.w / 2, cy = V2.y + V2.h / 2;
  const map = (px, py) => [cx + (tx + px * sx - focusX) * z, cy + (ty + py * sx - focusY) * z];
  c.save();
  if (!o.noclip) { rr(c, V2.x, V2.y, V2.w, V2.h, 40); c.clip(); const bg = c.createLinearGradient(V2.x, V2.y, V2.x + V2.w, V2.y + V2.h); bg.addColorStop(0, '#FBF4EF'); bg.addColorStop(1, '#EEF1F5'); c.fillStyle = bg; c.fillRect(V2.x, V2.y, V2.w, V2.h); }
  c.translate(cx, cy); c.scale(z, z); c.translate(-focusX, -focusY);
  c.shadowColor = 'rgba(20,27,38,.28)'; c.shadowBlur = 50; c.shadowOffsetY = 22;
  rr(c, tx - bez, ty - bez, tw0 + bez * 2, th0 + bez * 2, 34); c.fillStyle = '#1C2230'; c.fill(); c.shadowColor = 'transparent';
  rr(c, tx - bez + 3, ty - bez + 3, tw0 + bez * 2 - 6, th0 + bez * 2 - 6, 31); c.lineWidth = 2; c.strokeStyle = '#3A4252'; c.stroke();
  c.beginPath(); c.arc(tx + tw0 / 2, ty - bez / 2, 3.5, 0, Math.PI * 2); c.fillStyle = '#0B0E14'; c.fill();
  c.save(); rr(c, tx, ty, tw0, th0, 6); c.clip(); c.drawImage(img, tx, ty, tw0, th0); if (o.draw) o.draw(c, tx, ty, sx); c.restore();
  c.restore();
  return map;
}
function ring(c, x, y, r, t, t0) {   // pulsing highlight
  const k = pr(t, t0, .5); if (k <= 0) return; const p = (t - t0) * 1.4 % 1;
  c.save(); rr(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, 40); c.clip(); c.globalAlpha = clamp(k * 2); c.lineWidth = 5; c.strokeStyle = C.coral; c.beginPath(); c.arc(x, y, r * (.85 + .15 * backO(k)), 0, Math.PI * 2); c.stroke();
  c.globalAlpha = clamp(k * 2) * (1 - p); c.lineWidth = 3; c.beginPath(); c.arc(x, y, r * (1 + .6 * p), 0, Math.PI * 2); c.stroke(); c.restore();
}
function boxHi(c, x0, y0, x1, y1, t, t0, t1 = 1e9) {
  const k = pr(t, t0, .45) * (1 - pr(t, t1, .3)); if (k <= 0) return;
  c.save(); rr(c, VIEW.x, VIEW.y, VIEW.w, VIEW.h, 40); c.clip(); c.globalAlpha = clamp(k * 1.5); c.lineWidth = 5; c.strokeStyle = C.coral; rr(c, x0 - 8, y0 - 8, x1 - x0 + 16, y1 - y0 + 16, 16); c.stroke();
  c.fillStyle = 'rgba(228,121,111,.08)'; c.fill(); c.restore();
}
// ---------- text column ----------
const TX = 140;
function head(c, t, chap, title1, title2, t0, t1, o = {}) {
  if (t < t0 - .2 || t > t1 + .6) return;
  const ko = t1; kicker(c, chap, TX, 300, t, t0 - .2, { size: 22 });
  rise(c, title1, TX, 400, o.size || 70, C.ink, t, t0, { out: ko }); if (title2) rise(c, title2, TX, 400 + (o.size || 70) * 1.12, o.size || 70, C.coral, t, t0 + .1, { out: ko });
}
function bullet(c, t, txt1, txt2, y, t0, t1, o = {}) {
  const p = ap(t, t0, .5), ko = eio(pr(t, t1, .35)); if (p.a <= 0 || ko >= 1) return;
  c.save(); c.globalAlpha = p.a * (1 - ko); c.translate(p.dy, 0);
  c.beginPath(); c.arc(TX + 22, y - 12, 22, 0, Math.PI * 2); c.fillStyle = o.col || C.coralL; c.fill();
  if (o.icon) uiIcon(c, o.icon, TX + 22, y - 12, 26, C.coral); else txt(c, o.n || '•', TX + 22, y - 3, 22, C.coral, { al: 'center' });
  txt(c, txt1, TX + 62, y, 30, C.ink, { mw: 560 }); if (txt2) txt(c, txt2, TX + 62, y + 36, 22, C.slate, { w: 600, mw: 560 });
  c.restore();
}
function tag(c, t, s, t0, t1, o = {}) {   // "texto na tela" — the key phrase of the scene
  const k = pr(t, t0, .55) * (1 - pr(t, t1, .3)); if (k <= 0) return;
  const y = o.y || 860; pill(c, s, o.x || TX, y, o.size || 30, o.bg || C.ink, '#fff', k, { shadow: true, al: o.al });
}
function goldTip(c, t, s1, s2, t0, t1) {
  const p = ap(t, t0, .55), ko = eio(pr(t, t1, .35)); if (p.a <= 0 || ko >= 1) return;
  c.save(); c.globalAlpha = p.a * (1 - ko); c.translate(0, p.dy); card(c, TX - 10, 700, 600, 190, { r: 26, fill: '#FFF6E3' }); rr(c, TX - 10, 700, 10, 190, [26, 0, 0, 26]); c.fillStyle = '#E8B04A'; c.fill();
  txt(c, '★  DICA DE OURO', TX + 30, 748, 20, '#B07A12', { ls: 4 }); txt(c, s1, TX + 30, 798, 30, C.ink, { mw: 540 }); txt(c, s2, TX + 30, 840, 30, C.coral, { mw: 540 }); c.restore();
}
// ---------- persistent chrome: series tag + chapter progress ----------
const CHAPS = [['01', 'Entrar e escolher a loja'], ['02', 'Placar e premiações'], ['03', 'Preciso agir'], ['04', 'Atalhos e estoque']];
function chrome(c, t, a) {
  if (a <= 0) return; c.save(); c.globalAlpha = a;
  if (IMG.icon) { c.drawImage(IMG.iconC, TX, 74, 34, 34 * IMG.icon.height / IMG.icon.width); }
  txt(c, 'ZISSOU WORLD ACADEMY', TX + 48, 98, 18, C.ink, { ls: 5 }); const tw1 = tw(c, 'ZISSOU WORLD ACADEMY', 18, 700, 5); txt(c, '·  EP. 01 · COMEÇAR O DIA', TX + 48 + tw1 + 18, 98, 18, C.slate, { ls: 4 });
  const S = SC, starts = [S[1].voStart - 3.4, S[4].voStart - 3.4, S[7].voStart - 3.4, S[9].voStart - 3.4, S[13].voStart - 1.4];
  for (let i = 0; i < 4; i++) { const x = 1240 + i * 150, k = clamp((t - starts[i]) / (starts[i + 1] - starts[i])); rr(c, x, 88, 136, 6, 3); c.fillStyle = C.grayL; c.fill(); if (k > 0) { rr(c, x, 88, 136 * k, 6, 3); c.fillStyle = C.coral; c.fill(); }
    txt(c, CHAPS[i][0], x, 78, 14, k > 0 && k < 1 ? C.coral : C.slate, { ls: 2 }); }
  c.restore();
}
// ---------- chapter card ----------
function chapterCard(c, t, n, title, t0, dur = 3.2) {
  if (t < t0 || t > t0 + dur) return 0;
  const k = eo(pr(t, t0, .7)), ko = eio(pr(t, t0 + dur - .6, .6));
  c.save(); c.globalAlpha = 1 - ko;
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#141B26'); g.addColorStop(1, '#22304A'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const gl = c.createRadialGradient(1500, 300, 0, 1500, 300, 900); gl.addColorStop(0, 'rgba(228,121,111,.28)'); gl.addColorStop(1, 'rgba(228,121,111,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H);
  txt(c, 'CAPÍTULO', 200, 420 + 20 * (1 - k), 26, C.coral, { ls: 10, a: k });
  txt(c, n, 190, 700 + 40 * (1 - k), 330, 'rgba(255,255,255,.95)', { a: k, ls: -10 });
  rise(c, title, 200, 820, 64, '#FFFFFF', t, t0 + .35);
  c.fillStyle = C.coral; c.fillRect(200, 860, 420 * eo(pr(t, t0 + .5, .8)), 6);
  c.restore(); return 1 - ko;
}
// ---------- scene drawings ----------
function loginMock(c, x, y, sx, t) {   // redesigned (no real screen in the script): login, then store of the shift
  const tStore = Wd(1, 'escolha') - .2;
  c.save(); c.translate(x, y); c.scale(sx, sx);
  c.fillStyle = '#FAFAFB'; c.fillRect(0, 0, 1440, 842);
  const cx = 720;
  if (t < tStore) {
    c.drawImage(IMG.logoN, cx - 130, 90, 260, 260 * IMG.logo.height / IMG.logo.width);
    txt(c, 'Portal do Vendedor', cx, 230, 30, C.slate, { al: 'center', w: 600 });
    const fld = (yy, lab, val, k) => { rr(c, cx - 330, yy, 660, 96, 20); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3; c.strokeStyle = k > 0 ? C.navy : '#E3E6EA'; c.stroke(); txt(c, lab, cx - 330, yy - 16, 22, C.slate, { w: 700, ls: 3 });
      txt(c, val.slice(0, Math.floor(val.length * clamp(k))), cx - 296, yy + 62, 34, C.ink); };
    fld(310, 'CPF', '•••.•••.•••-••', pr(t, Wd(1, 'cpf') - .3, .8)); fld(470, 'SENHA', '••••••••', pr(t, Wd(1, 'senha') - .2, .7));
    const pk = pr(t, Wd(1, 'logo') - .2, .3); rr(c, cx - 330, 620, 660, 96, 48); c.fillStyle = pk > 0 ? C.coral : C.ink; c.fill(); txt(c, 'Entrar', cx, 682, 34, '#fff', { al: 'center' });
  } else {
    const k = eo(pr(t, tStore, .6));
    txt(c, 'Em qual loja você está hoje?', cx, 170, 52, C.ink, { al: 'center', a: k });
    txt(c, 'Orçamentos e visitas ficam nesta loja', cx, 228, 28, C.slate, { al: 'center', w: 600, a: k });
    ['Itaim Bibi', 'Loja 2 (exemplo)', 'Loja 3 (exemplo)'].forEach((n, i) => { const yy = 300 + i * 160, on = i === 0 && t > Wd(1, 'hoje') + .2; c.save(); c.globalAlpha = k;
      rr(c, cx - 440, yy, 880, 130, 26); c.fillStyle = on ? C.coralL : '#fff'; c.fill(); c.lineWidth = on ? 4 : 3; c.strokeStyle = on ? C.coral : '#E3E6EA'; c.stroke();
      c.beginPath(); c.arc(cx - 370, yy + 65, 20, 0, Math.PI * 2); c.lineWidth = 4; c.strokeStyle = on ? C.coral : C.gray; c.stroke(); if (on) { c.beginPath(); c.arc(cx - 370, yy + 65, 10, 0, Math.PI * 2); c.fillStyle = C.coral; c.fill(); }
      txt(c, n, cx - 320, yy + 78, 38, C.ink); c.restore(); });
  }
  c.restore();
}
function metaInfo(c, t) {   // scene 6: how to read the store goal (no screenshot in the script)
  const S = SC[6], X = 820, Y = 260, Wb = 940;
  const p = ap(t, S.voStart - .3, .6); if (p.a <= 0) return;
  c.save(); c.globalAlpha = p.a; card(c, X, Y, Wb + 80, 560, { r: 32 });
  txt(c, 'META DA LOJA', X + 40, Y + 70, 20, C.coral, { ls: 6 });
  const kf = eo(pr(t, Wd(6, 'fisica') - .3, .8)), ko = eo(pr(t, Wd(6, 'online') - .3, .8));
  rr(c, X + 40, Y + 110, Wb, 70, 35); c.fillStyle = C.grayL; c.fill();
  if (kf > 0) { rr(c, X + 40, Y + 110, Wb * .62 * kf, 70, 35); c.fillStyle = C.coral; c.fill(); }
  if (ko > 0) { rr(c, X + 40 + Wb * .62, Y + 110, Wb * .38 * ko, 70, [0, 35, 35, 0]); c.fillStyle = C.navy; c.fill(); }
  txt(c, 'Loja física', X + 60, Y + 155, 24, '#fff', { a: clamp(kf * 2) }); txt(c, 'Online', X + 60 + Wb * .62, Y + 155, 24, '#fff', { a: clamp(ko * 2) });
  const kt = pr(t, Wd(6, 'total') - .3, .5); if (kt > 0) { txt(c, '= Meta total', X + 40 + Wb, Y + 235, 30, C.ink, { al: 'right', a: clamp(kt * 2) }); }
  const kh = ap(t, Wd(6, 'hoje') - .3, .5); if (kh.a > 0) { c.save(); c.globalAlpha *= kh.a; rr(c, X + 40, Y + 280, 440, 120, 22); c.fillStyle = C.coralL; c.fill(); txt(c, 'META DE HOJE', X + 70, Y + 325, 16, C.coral, { ls: 4 }); txt(c, 'quanto vender no dia', X + 70, Y + 362, 24, C.ink); txt(c, 'para manter o ritmo do mês', X + 70, Y + 390, 20, C.slate, { w: 600 }); c.restore(); }
  const kv = ap(t, Wd(6, 'venda', 2) - .3, .5); if (kv.a > 0) { c.save(); c.globalAlpha *= kv.a; rr(c, X + 520, Y + 280, 460, 54, 27); c.fillStyle = '#E7F6EE'; c.fill(); txt(c, '✓  Venda = pedido pago', X + 545, Y + 316, 22, '#1F8A57'); c.restore(); }
  const kn = ap(t, Wd(6, 'visita') - .3, .5); if (kn.a > 0) { c.save(); c.globalAlpha *= kn.a; rr(c, X + 520, Y + 346, 460, 54, 27); c.fillStyle = '#FDECEA'; c.fill(); txt(c, '✕  Visita não conta como venda', X + 545, Y + 382, 22, '#C2453A'); c.restore(); }
  c.restore();
}
function checklist(c, t) {
  const S = SC[13], t0 = S.voStart - 1.2, t1 = SC[14].voStart - .6; if (t < t0 - .1 || t > t1 + .6) return;
  const p = ap(t, t0, .6), ko = eio(pr(t, t1, .5)); c.save(); c.globalAlpha = p.a * (1 - ko);
  card(c, 460, 150, 1000, 800, { r: 36 }); txt(c, 'CHECKLIST · FAÇA AGORA NO SEU PORTAL', 520, 225, 20, C.coral, { ls: 5 });
  const items = ['Entrei e escolhi a loja do turno', 'Ativei as notificações', 'Fiquei Online', 'Sei esconder valores no olhinho', 'Sei ler a meta física e online', 'Sei consultar estoque', 'Sei onde está o botão +'];
  items.forEach((s, i) => { const tt = t0 + .6 + i * .55, y = 300 + i * 88; const k = pr(t, tt, .4);
    rr(c, 520, y, 880, 70, 18); c.fillStyle = k > 0 ? '#F4FBF7' : '#F6F7F9'; c.fill(); checkbox(c, 545, y + 17, 36, pr(t, tt + .2, .4)); txt(c, s, 605, y + 46, 28, C.ink, { a: .4 + .6 * clamp(k * 2) }); });
  c.restore();
}
// ---------- opening: Zissou World Academy ----------
function opening(c, t) {
  if (t > 6.6) return;
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0E131C'); g.addColorStop(1, '#1D2A40'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const pulse = .5 + .5 * Math.sin(t * 2), gl = c.createRadialGradient(960, 420, 0, 960, 420, 760); gl.addColorStop(0, `rgba(228,121,111,${.22 + .08 * pulse})`); gl.addColorStop(1, 'rgba(228,121,111,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H);
  // light streaks
  c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const x = (-600 + (t * 380 + i * 520) % 3000); const gg = c.createLinearGradient(x, 0, x + 220, 0); gg.addColorStop(0, 'rgba(255,220,200,0)'); gg.addColorStop(.5, 'rgba(255,220,200,.07)'); gg.addColorStop(1, 'rgba(255,220,200,0)'); c.fillStyle = gg; c.save(); c.translate(x, 0); c.rotate(.25); c.fillRect(0, -200, 220, 1600); c.restore(); } c.restore();
}
function openingText(c, t) {
  if (t > 6.6) return;
  const k1 = pr(t, 1.6, .9), k2 = pr(t, 2.3, .8), k3 = pr(t, 3.6, .7), ko = eio(pr(t, 5.8, .6));
  c.save(); c.globalAlpha = 1 - ko;
  const s = 'ZISSOU WORLD ACADEMY'; const w = tw(c, s, 64, 700, 18 * eo(k1) + 6);
  txt(c, s, 960, 690, 64, '#FFFFFF', { al: 'center', ls: 6 + 18 * (1 - eo(k1)), a: clamp(k1 * 1.6) });
  c.fillStyle = C.coral; const lw = 560 * eo(k2); c.fillRect(960 - lw / 2, 722, lw, 4);
  txt(c, 'PORTAL DO VENDEDOR', 960, 780, 26, 'rgba(255,255,255,.8)', { al: 'center', ls: 10, a: clamp(k2 * 1.6) });
  if (k3 > 0) { pill(c, 'EPISÓDIO 01  ·  COMEÇAR O DIA', 960, 840, 24, C.coral, '#fff', k3, { al: 'center' }); }
  c.restore();
  // iris wipe into the b-roll
  const kw = eio(pr(t, 5.7, .8)); return kw;
}
// ---------- main composition ----------
async function composite(c, t) {
  const S = SC, D_ = CUES.duration;
  const tB0 = 5.9, tTab0 = S[0].voStart + Wd(0, 'este') - S[0].voStart - .4;     // cut to the tablet on "Este é o seu Zissou World"
  const tCh = [S[1].voStart - 3.4, S[4].voStart - 3.4, S[7].voStart - 3.4, S[9].voStart - 3.4];
  const tPrecisoReal0 = S[7].voStart - .2, tPrecisoMock = Wd(7, 'dica') - .4;
  const tClose = S[14].voStart - .5;
  // layer decisions
  const inOpen = t < 6.6, inBroll = t >= tB0 && t < tTab0 + .3, inTab = t >= tTab0 && t < tCh[0], inPrecisoReal = t >= tPrecisoReal0 - .3 && t < tPrecisoMock + .3, inClose = t >= tClose;
  drawBG(c, t);
  upd3D(t);
  // ---- stage scenes (light) ----
  const showStage = !inOpen && !inBroll && !inTab && !inClose;
  if (showStage) {
    chrome(c, t, eo(pr(t, tCh[0] + 2.6, .6)) * (1 - eio(pr(t, S[13].voStart - 1.6, .5))));
    // 01 · login / store
    if (t > tCh[0] + 2.4 && t < S[2].voStart) {
      head(c, t, 'CAPÍTULO 01', 'Entre e escolha', 'a loja do turno.', S[1].voStart - .3, Wd(1, 'orcamentos') - .3);
      bullet(c, t, 'Orçamentos e visitas', 'ficam na loja do turno', 420, Wd(1, 'orcamentos') - .2, S[1].voEnd + .4, { icon: 'doc' });
      bullet(c, t, 'Ranking e comissão', 'continuam na sua loja base', 530, Wd(1, 'ranking') - .2, S[1].voEnd + .4, { icon: 'shield' });
      tag(c, t, 'Escolha a loja onde você está hoje', Wd(1, 'escolha') - .2, S[1].voEnd + .3);
      const st = ap(t, S[1].voStart - .6, .7); if (st.a > 0) { c.save(); c.globalAlpha = st.a; tabletShot(c, IMG.blank, t, [[0, 720, 421, 1]], { draw: (cc, x, y, sx) => loginMock(cc, x, y, sx, t) }); c.restore(); }
    }
    // notifications
    if (t > S[2].voStart - .8 && t < S[3].voStart) {
      head(c, t, 'CAPÍTULO 01', 'Ative as', 'notificações.', S[2].voStart - .3, S[2].voEnd + .3);
      bullet(c, t, 'Cliente novo na fila', null, 640, Wd(2, 'cliente') - .2, S[2].voEnd + .3, { icon: 'chat' });
      bullet(c, t, 'Orçamento vencendo', null, 720, Wd(2, 'orcamento') - .2, S[2].voEnd + .3, { icon: 'clock' });
      bullet(c, t, 'Aviso da coordenação', null, 800, Wd(2, 'aviso') - .2, S[2].voEnd + .3, { icon: 'spark' });
      const kk = [[S[2].voStart - .5, 720, 450, 1], [S[2].voStart + .8, 720, 450, 1.35], [Wd(2, 'toque') - .2, 720, 560, 1.6]];
      const map = tabletShot(c, IMG.notif, t, kk); const [bx, by] = map(720, 643); ring(c, bx, by, 70, t, Wd(2, 'ativar') - .3);
      const cp = cursorAt(t, [[Wd(2, 'toque') - .6, bx + 220, by + 160], [Wd(2, 'ativar'), bx + 40, by + 10], [S[2].voEnd, bx + 40, by + 10]]); if (cp) cursor(c, cp[0], cp[1], pr(t, Wd(2, 'notificacoes') - .1, .5));
    }
    // online / offline
    if (t > S[3].voStart - .8 && t < tCh[1]) {
      head(c, t, 'CAPÍTULO 01', 'Online ou', 'Offline?', S[3].voStart - .3, S[3].voEnd + .3);
      const kOn = pr(t, Wd(3, 'fica') - .1, .4);
      const sw = (y, on, lab, sub, t0) => { const p = ap(t, t0, .5); if (p.a <= 0) return; c.save(); c.globalAlpha = p.a; c.translate(p.dy, 0); card(c, TX - 10, y, 600, 120, { r: 24 });
        rr(c, TX + 20, y + 38, 84, 44, 22); c.fillStyle = on ? '#2E9E6B' : C.gray; c.fill(); c.beginPath(); c.arc(on ? TX + 82 : TX + 42, y + 60, 17, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
        txt(c, lab, TX + 130, y + 58, 30, C.ink); txt(c, sub, TX + 130, y + 92, 21, C.slate, { w: 600, mw: 440 }); c.restore(); };
      sw(560, true, 'Online', 'recebe clientes novos do WhatsApp', Wd(3, 'online') - .2);
      sw(700, false, 'Offline', 'só pega da fila, sem novos', Wd(3, 'offline') - .2);
      tag(c, t, 'Começou o turno? Fica Online', Wd(3, 'comecou') - .2, S[3].voEnd + .3, { y: 860, bg: '#2E9E6B' });
      const map = tabletShot(c, IMG.notifClean, t, [[S[3].voStart - .5, 1240, 120, 1.2], [S[3].voStart + .6, 1240, 120, 2.2]]);
      const [px, py] = map(1240, 27); ring(c, px, py, 80, t, Wd(3, 'status') - .2);
      const kp = pr(t, Wd(3, 'fica') - .1, .4); if (kp > 0) { c.save(); c.globalAlpha = clamp(kp * 2); rr(c, px - 90, py - 26, 180, 52, 26); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#2E9E6B'; c.stroke(); c.beginPath(); c.arc(px - 60, py, 8, 0, Math.PI * 2); c.fillStyle = '#2E9E6B'; c.fill(); txt(c, 'Online', px + 5, py + 9, 24, C.ink, { al: 'center' }); c.restore(); }
    }
    // 02 · placar + olhinho
    if (t > tCh[1] + 2.4 && t < S[5].voStart) {
      head(c, t, 'CAPÍTULO 02', 'O seu placar', 'do dia.', S[4].voStart - .3, S[4].voEnd + .3);
      bullet(c, t, 'Vendas de hoje', null, 640, Wd(4, 'vendas') - .2, S[4].voEnd + .3, { n: '1' });
      bullet(c, t, 'Visitas do mês', null, 720, Wd(4, 'visitas') - .2, S[4].voEnd + .3, { n: '2' });
      bullet(c, t, 'Conversões', null, 800, Wd(4, 'conversoes') - .2, S[4].voEnd + .3, { n: '3' });
      const tHide = Wd(4, 'olhinho') + .2, tShow = Wd(4, 'novo') + .1;
      const hidden = t > tHide && t < tShow;
      const map = tabletShot(c, IMG.inicio, t, [[S[4].voStart - .5, 750, 175, 1.15], [S[4].voStart + .8, 750, 175, 1.5], [Wd(4, 'olhinho') - .6, 1100, 140, 1.7]], {
        draw: (cc, x, y, sx) => { if (!hidden) return; [[118, 140, 330, 60], [250, 235, 160, 45], [690, 235, 130, 45], [1120, 235, 120, 45]].forEach(([a, b, w2, h2]) => { cc.fillStyle = '#FBFBFC'; cc.fillRect(x + a * sx, y + b * sx, w2 * sx, h2 * sx); cc.fillStyle = C.ink; txt(cc, '•••', x + (a + 10) * sx, y + (b + h2 * .78) * sx, 34 * sx, C.ink); }); } });
      const [ex, ey] = map(1367, 72); ring(c, ex, ey, 46, t, Wd(4, 'olhinho') - .3);
      const cp = cursorAt(t, [[Wd(4, 'olhinho') - .7, ex - 160, ey + 140], [Wd(4, 'toque') + .2, ex + 6, ey + 6], [S[4].voEnd, ex + 6, ey + 6]]); if (cp) cursor(c, cp[0], cp[1], Math.max(pr(t, tHide - .1, .5), pr(t, tShow - .1, .5) * (t > tShow - .1 ? 1 : 0)));
      tag(c, t, 'Olhinho esconde seus valores', Wd(4, 'olhinho') - .2, S[4].voEnd + .3);
    }
    // premiações
    if (t > S[5].voStart - .8 && t < S[6].voStart) {
      head(c, t, 'CAPÍTULO 02', 'Premiações:', 'a sua posição.', S[5].voStart - .3, S[5].voEnd + .3);
      bullet(c, t, 'Sua posição', null, 640, Wd(5, 'posicao') - .2, S[5].voEnd + .3, { n: '1' });
      bullet(c, t, 'Quanto está em jogo', null, 720, Wd(5, 'jogo') - .2, S[5].voEnd + .3, { n: '2' });
      bullet(c, t, 'Quanto falta para subir', null, 800, Wd(5, 'subir') - .2, S[5].voEnd + .3, { n: '3' });
      const map = tabletShot(c, IMG.inicio, t, [[S[5].voStart - .5, 750, 520, 1.25], [Wd(5, 'abra') - 1.0, 760, 540, 1.32], [Wd(5, 'abra') - .2, 1150, 600, 1.8]]);
      const a = map(110, 600), b = map(400, 640); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(5, 'posicao') - .2, Wd(5, 'abra') - .5);
      const [rx, ry] = map(1305, 620); ring(c, rx, ry, 80, t, Wd(5, 'ranking') - .3);
      tag(c, t, 'Veja sua posição', Wd(5, 'posicao') - .2, S[5].voEnd + .3);
    }
    // meta
    if (t > S[6].voStart - .8 && t < tCh[2]) {
      head(c, t, 'CAPÍTULO 02', 'Como ler', 'a meta.', S[6].voStart - .3, S[6].voEnd + .3);
      tag(c, t, 'Meta = física + online', Wd(6, 'duas') - .2, S[6].voEnd + .3, { y: 640 });
      metaInfo(c, t);
    }
    // 03 · preciso agir (mock part, after the real tablet shot)
    if (t > tPrecisoMock - .2 && t < S[8].voStart) {
      head(c, t, 'CAPÍTULO 03', 'Comece pelo', 'Preciso agir.', tPrecisoMock, S[7].voEnd + .3);
      goldTip(c, t, 'Comece sempre por aqui', 'e toque em Continuar contatos.', Wd(7, 'dica') - .2, S[7].voEnd + .3);
      const map = tabletShot(c, IMG.preciso, t, [[tPrecisoMock - .2, 750, 330, 1.12], [Wd(7, 'toque') - .9, 760, 300, 1.18], [Wd(7, 'toque') - .1, 1250, 150, 2.0]]);
      const [bx, by] = map(1300, 151); ring(c, bx, by, 90, t, Wd(7, 'continuar') - .3);
      const cp = cursorAt(t, [[Wd(7, 'toque') - .4, bx + 200, by + 150], [Wd(7, 'continuar'), bx + 10, by + 6], [S[7].voEnd + 1, bx + 10, by + 6]]); if (cp) cursor(c, cp[0], cp[1], pr(t, Wd(7, 'contatos') - .05, .5));
    }
    // fechamentos e escala
    if (t > S[8].voStart - .8 && t < tCh[3]) {
      head(c, t, 'CAPÍTULO 03', 'Fechamentos', 'e escala.', S[8].voStart - .3, S[8].voEnd + .3);
      bullet(c, t, 'Orçamentos perto de fechar', null, 640, Wd(8, 'orcamentos') - .2, S[8].voEnd + .3, { icon: 'doc' });
      bullet(c, t, 'Escala da semana', 'dias de trabalho e de folga', 730, Wd(8, 'escala') - .2, S[8].voEnd + .3, { icon: 'clock' });
      tabletShot(c, IMG.fechamentos, t, [[S[8].voStart - .5, 750, 250, 1.2], [S[8].voEnd, 750, 520, 1.3]]);
    }
    // 04 · botão +
    if (t > tCh[3] + 2.4 && t < S[10].voStart) {
      head(c, t, 'CAPÍTULO 04', 'Botão +', 'é o seu atalho.', S[9].voStart - .3, S[9].voEnd + .3);
      const it = [['Visita presencial', 'visita', 598, 1278], ['Novo orçamento', 'novo', 648, 1330], ['Follow-up', 'followup', 698, 1336], ['Fit Lab', 'fit', 748, 1368]];
      it.forEach(([lab, w, , ], i) => bullet(c, t, lab, null, 590 + i * 68, Wd(9, w) - .2, S[9].voEnd + .3, { n: String(i + 1) }));
      const map = tabletShot(c, IMG.mais, t, [[S[9].voStart - .5, 1300, 700, 1.3], [S[9].voStart + 1.2, 1290, 680, 2.0]]);
      const [px, py] = map(1400, 802); ring(c, px, py, 46, t, S[9].voStart + .2);
      it.forEach(([lab, w, yy, xx], i) => { const a = map(xx - 145 + (i === 0 ? -0 : 0), yy - 22), b = map(1424, yy + 22); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(9, w) - .2, (it[i + 1] ? Wd(9, it[i + 1][1]) - .2 : S[9].voEnd + .3)); });
      tag(c, t, 'Botão + = atalho rápido', S[9].voStart + .6, S[9].voEnd + .3);
    }
    // estoque
    if (t > S[10].voStart - .8 && t < S[11].voStart) {
      head(c, t, 'CAPÍTULO 04', 'Estoque em', '5 segundos.', S[10].voStart - .3, S[10].voEnd + .3);
      bullet(c, t, 'Toque em Estoque, lá em cima', null, 640, Wd(10, 'estoque') - .2, S[10].voEnd + .3, { n: '1' });
      bullet(c, t, 'Digite o nome ou o código', null, 720, Wd(10, 'digite') - .2, S[10].voEnd + .3, { n: '2' });
      bullet(c, t, 'Saldo por produto e por loja', 'já descontando as reservas', 800, Wd(10, 'saldo') - .2, S[10].voEnd + .3, { n: '3' });
      const map = tabletShot(c, IMG.estoque, t, [[S[10].voStart - .5, 720, 390, 1.3], [Wd(10, 'saldo') - .4, 720, 360, 1.8]]);
      const a = map(384, 254), b = map(1056, 528); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(10, 'digite') - .2);
      const [tx1, ty1] = map(876, 342); ring(c, tx1, ty1, 60, t, Wd(10, 'loja', 2) - .3);
    }
    // histórico do cliente
    if (t > S[11].voStart - .8 && t < S[12].voStart) {
      head(c, t, 'CAPÍTULO 04', 'Contexto', 'antes de falar.', S[11].voStart - .3, S[11].voEnd + .3);
      bullet(c, t, 'Busque por nome, telefone,', 'e-mail ou CPF', 640, Wd(11, 'busque') - .2, S[11].voEnd + .3, { icon: 'chat' });
      bullet(c, t, 'Veja tudo o que ele já comprou', null, 750, Wd(11, 'comprou') - .4, S[11].voEnd + .3, { icon: 'doc' });
      const map = tabletShot(c, IMG.historico, t, [[S[11].voStart - .5, 750, 200, 1.3], [Wd(11, 'busque') - .3, 750, 140, 1.9]]);
      const a = map(380, 104), b = map(1120, 164); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(11, 'busque') - .2);
    }
    // avisos
    if (t > S[12].voStart - .8 && t < S[13].voStart - 1.2) {
      head(c, t, 'CAPÍTULO 04', 'Controle', 'os seus avisos.', S[12].voStart - .3, S[12].voEnd + .3);
      tag(c, t, 'Não desligue: cliente novo na fila', Wd(12, 'nao') - .2, S[12].voEnd + .3, { y: 700, bg: C.coral });
      const map = tabletShot(c, IMG.avisos, t, [[S[12].voStart - .5, 540, 300, 1.3], [Wd(12, 'silenciar') - .3, 540, 440, 1.7]]);
      const a = map(100, 400), b = map(990, 460); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(12, 'silenciar') - .2);
    }
    checklist(c, t);
  }
  // 3D icons (stage) render
  renderer.render(scene, camera); if (showStage) c.drawImage(glc, 0, 0);
  // ---- chapter cards on top ----
  let cardOn = 0; CHAPS.forEach(([n, title], i) => { cardOn = Math.max(cardOn, chapterCard(c, t, n, title, tCh[i])); }); if (cardOn > 0) { c.save(); c.globalAlpha = cardOn; c.drawImage(glc, 0, 0); c.restore(); }
  // ---- real video: tablet with the portal (preciso agir) ----
  if (inPrecisoReal) { const a = clamp(pr(t, tPrecisoReal0 - .3, .4)) * (1 - pr(t, tPrecisoMock, .3)); c.save(); c.globalAlpha = a; await drawBroll(c, 'tablet_preciso', t, tPrecisoReal0 - .3, { letterbox: .6, dur: 12 }); c.restore();
    if (a > .5) { kicker(c, 'CAPÍTULO 03 · PRECISO AGIR', 140, 200, t, tPrecisoReal0, { size: 22, color: '#fff' }); rise(c, 'A sua lista do dia.', 140, 290, 64, '#FFFFFF', t, tPrecisoReal0 + .2); } }
  // ---- opening / b-roll / tablet hook ----
  if (inBroll || inTab) {
    if (inBroll) { await drawBroll(c, 'raw_abertura', t, tB0, { speed: .85, dur: 7 });
      const k = ap(t, tB0 + 1.0, .7); if (k.a > 0) { c.save(); c.globalAlpha = k.a * (1 - pr(t, tTab0 - .4, .4)); txt(c, 'EPISÓDIO 01', 140, 830, 22, C.coral, { ls: 8 }); txt(c, 'Começar o dia', 136, 910, 76, '#FFFFFF'); c.restore(); } }
    if (inTab) { await drawBroll(c, 'tablet_inicio', t, tTab0, { letterbox: .6, dur: 12 }); const a0 = 1 - clamp(pr(t, tTab0, .35)); if (a0 > 0) { c.save(); c.globalAlpha = a0; await drawBroll(c, 'raw_abertura', t, tB0, { speed: .85 }); c.restore(); }
      const chips = [['Quanto você vendeu', Wd(0, 'vendeu') - .2], ['Quanto falta para a meta', Wd(0, 'falta') - .2], ['Quem espera o seu retorno', Wd(0, 'esperando') - .2]];
      chips.forEach(([s, tt], i) => pill(c, s, 140, 250 + i * 86, 26, i === 2 ? C.coral : 'rgba(20,27,38,.82)', '#fff', pr(t, tt, .5) * (1 - pr(t, tCh[0] - .5, .4)), { shadow: true }));
      tag(c, t, 'Seu dia em 10 segundos', Wd(0, 'poucos') - .3, tCh[0] - .4, { y: 860, bg: C.coral, size: 32 }); }
  }
  if (inOpen) { opening(c, t); renderer.render(scene, camera); c.drawImage(glc, 0, 0); const kw = openingText(c, t);
    if (kw > 0) { c.save(); c.beginPath(); c.arc(960, 540, 1200 * kw, 0, Math.PI * 2); c.clip(); await drawBroll(c, 'raw_abertura', t, tB0, { speed: .85 }); c.restore(); } }
  // ---- closing ----
  if (inClose) {
    await drawBroll(c, 'fechamento', t, tClose, { speed: .75, dur: 8 });
    const k = ap(t, tClose + .6, .7); if (k.a > 0) { c.save(); c.globalAlpha = k.a; txt(c, 'PRÓXIMO EPISÓDIO', 140, 760, 22, C.coral, { ls: 8 }); txt(c, '02 · Vender', 136, 850, 80, '#FFFFFF'); txt(c, 'Criar um orçamento do zero e registrar a visita', 140, 905, 28, 'rgba(255,255,255,.85)', { w: 600 }); c.restore(); }
    const te = D_ - 3.0; if (t > te) { const ke = eo(pr(t, te, .8)); c.save(); c.globalAlpha = ke; const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0E131C'); g.addColorStop(1, '#1D2A40'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
      renderer.render(scene, camera); c.save(); c.globalAlpha = ke; c.drawImage(glc, 0, 0); c.restore();
      txt(c, 'ZISSOU WORLD ACADEMY', 960, 700, 54, '#FFFFFF', { al: 'center', ls: 12, a: ke }); txt(c, 'PORTAL DO VENDEDOR', 960, 760, 22, 'rgba(255,255,255,.75)', { al: 'center', ls: 10, a: ke }); }
  }
  const fi = 1 - eo(pr(t, 0, .6)), fo = eio(pr(t, D_ - .6, .6)); if (fi > 0 || fo > 0) { c.fillStyle = `rgba(10,14,20,${Math.max(fi, fo)})`; c.fillRect(0, 0, W, H); }
}
async function renderAt(t) { camera.position.set(0, 0, D); camera.lookAt(0, 0, 0); await composite(ctx, t); return 1; }
window.ready = (async () => {
  await document.fonts.load('700 40px Zona'); await document.fonts.load('600 40px Zona');
  CUES = await (await fetch('../cues.json')).json(); SC = CUES.scenes;
  BR.meta = await (await fetch('../out/fr/meta.json')).json();
  IMG.logo = await loadImg('../assets/logo.png');
  { const c = document.createElement('canvas'); c.width = IMG.logo.width; c.height = IMG.logo.height; const g = c.getContext('2d'); g.drawImage(IMG.logo, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#293C4D'; g.fillRect(0, 0, c.width, c.height); IMG.logoN = c; }
  IMG.icon = await loadImg('../assets/icone.png').catch(() => null);
  if (IMG.icon) { const c = document.createElement('canvas'); c.width = IMG.icon.width; c.height = IMG.icon.height; const g = c.getContext('2d'); g.drawImage(IMG.icon, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#E4796F'; g.fillRect(0, 0, c.width, c.height); IMG.iconC = c; }
  for (const [k, f] of [['inicio', 'inicio'], ['notif', 'notif_popup'], ['preciso', 'preciso_agir'], ['fechamentos', 'fechamentos'], ['mais', 'botao_mais'], ['estoque', 'estoque'], ['historico', 'historico'], ['avisos', 'avisos'], ['notifClean', 'notif_clean']]) IMG[k] = await loadImg(`../telas/${f}.png`);
  { const c = document.createElement('canvas'); c.width = 1440; c.height = 842; c.getContext('2d').fillStyle = '#FAFAFB'; c.getContext('2d').fillRect(0, 0, 1440, 842); IMG.blank = c; }
  const shape = await (await fetch('../assets/icon_shape.json')).json();
  // 3D: opening hero icon, closing icon, and one object per chapter
  const S = SC, tCh = [S[1].voStart - 3.4, S[4].voStart - 3.4, S[7].voStart - 3.4, S[9].voStart - 3.4];
  addIcon(whiteIcon(shape.pts), 960, 400, 2.1, .3, 5.6, { anim: 'spin', z: 3, ry: -.3 });
  addIcon(whiteIcon(shape.pts), 960, 470, 1.5, CUES.duration - 3.0, CUES.duration + 2, { anim: 'spin', z: 3, ry: -.3 });
  const chapIcons = [mStore(), mTrophy(), mBell(), mBox()];
  chapIcons.forEach((m, i) => addIcon(m, 1480, 560, i === 1 ? 1.5 : 1.2, tCh[i] + .25, tCh[i] + 2.6, { anim: i === 1 ? 'spin' : 'swing', z: 3, ry: -.4 }));
  addIcon(mBell(), 640, 240, .5, S[2].voStart - .2, S[2].voEnd + .2, { anim: 'swing' });
  addIcon(mTrophy(), 650, 230, .55, S[5].voStart - .2, S[5].voEnd + .2, { anim: 'spin' });
  addIcon(mBox(), 640, 240, .45, S[10].voStart - .2, S[10].voEnd + .2, {});
  renderer.compile(scene, camera);
  return true;
})();
window.renderAt = renderAt;
