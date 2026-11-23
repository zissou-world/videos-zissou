// "Última semana da Black Zissou" — ~89 s, 1920x1080. Edição Black: fundo escuro, coral Zissou, ícones 3D.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1920, H = 1080;
const C = { coral: '#E4796F', coralL: 'rgba(228,121,111,.16)', ink: '#F6F3EE', slate: '#9AABC6', navy: '#293C4D', gray: '#55637A', grayL: 'rgba(255,255,255,.09)', card: '#141D2A', line: 'rgba(255,255,255,.09)' };
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
  c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 44; c.shadowOffsetY = 16;
  rr(c, x, y, w, h, o.r || 24); c.fillStyle = o.fill || C.card; c.fill(); c.shadowColor = 'transparent';
  if (!o.fill) { c.lineWidth = 2; c.strokeStyle = C.line; c.stroke(); } c.restore();
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
  c.fillStyle = '#0B1119'; c.fillRect(0, 0, W, H);
  blob(c, -60 + 60 * Math.sin(t * .15), -80, 1000, '228,121,111', .22);
  blob(c, 1750 + 140 * Math.cos(t * .12), 1100, 1000, '60,85,125', .35);
  blob(c, 1000, 540, 800, '20,30,45', .5);
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
scene.add(new THREE.HemisphereLight(0xffffff, 0x1a2230, .85));
const rim = new THREE.DirectionalLight(0xE4796F, 1.4); scene.add(rim); scene.add(rim.target);
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

function mBag() {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(1.9, 2.0, .8, 4, .1), M.coral, 0, -.2, 0));
  for (const z of [.2, -.2]) { const h = mesh(new THREE.TorusGeometry(.42, .065, 16, 48, Math.PI), M.navy, 0, .8, z); g.add(h); }
  const tex = canvasTex(512, 200, x => { x.fillStyle = '#141B26'; x.font = '700 120px Zona'; x.textAlign = 'center'; x.letterSpacing = '8px'; x.fillText('BLACK', 256, 145); });
  g.add(mesh(new RoundedBoxGeometry(1.4, .55, .06, 3, .03), M.white, 0, -.15, .42));
  g.add(mesh(new THREE.PlaneGeometry(1.25, .49), new THREE.MeshBasicMaterial({ map: tex, transparent: true }), 0, -.15, .46));
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
function mStar() {
  const g = new THREE.Group(); const st = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? .52 : 1.25, a = Math.PI / 2 + i * Math.PI / 5; i ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, Math.sin(a) * r); } st.closePath();
  g.add(new THREE.Mesh(ext(st, .35, .14, 6), M.coral));
  return sh(g);
}
function mBolt() {
  const g = new THREE.Group(); const s = new THREE.Shape();
  s.moveTo(.25, 1.3); s.lineTo(-.75, -.1); s.lineTo(-.05, -.1); s.lineTo(-.35, -1.3); s.lineTo(.8, .25); s.lineTo(.1, .25); s.lineTo(.45, 1.3); s.closePath();
  g.add(new THREE.Mesh(ext(s, .3, .08, 4), M.coral));
  return sh(g);
}
function mTeam() {
  const g = new THREE.Group();
  [[-1.05, M.white, .9, -.3], [1.05, M.slate, .9, -.3], [0, M.coral, 1.05, .25]].forEach(([x, m, sc, z]) => {
    const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(sc);
    p.add(mesh(new THREE.SphereGeometry(.36, 40, 28), m, 0, .62, 0));
    p.add(mesh(new THREE.CapsuleGeometry(.48, .55, 10, 32), m, 0, -.45, 0)); g.add(p);
  });
  return sh(g);
}
function mHeart() {
  const g = new THREE.Group(); const s = new THREE.Shape();
  s.moveTo(0, -1.0); s.bezierCurveTo(-.4, -.6, -1.15, -.2, -1.1, .4); s.bezierCurveTo(-1.05, .95, -.4, 1.15, 0, .65); s.bezierCurveTo(.4, 1.15, 1.05, .95, 1.1, .4); s.bezierCurveTo(1.15, -.2, .4, -.6, 0, -1.0);
  g.add(new THREE.Mesh(ext(s, .35, .16, 8), M.coral));
  return sh(g);
}

// ---------- icons per scene ----------
const ICONS = [];
function addIcon(i, model, sx, sy, scale, opt = {}) { const grp = new THREE.Group(); grp.add(model); scene.add(grp); ICONS.push({ i, grp, model, sx, sy, scale, opt, sh: { a: 0 } }); }
function build(iconPts) {
  addIcon(0, mIcon(iconPts), 1590, 330, 1.6, { ry: -.3, anim: 'spin' });
  addIcon(0, mBag(), 1560, 740, .8, { ry: -.45, delay: Wd(0, 'chegamos') - SC[0].voStart, anim: 'swing' });
  addIcon(1, mTrend(), 1590, 300, 1.15, { ry: -.4 });
  addIcon(2, mTrophy(), 1600, 300, 1.05, { ry: -.3, anim: 'spin' });
  addIcon(3, mBolt(), 1730, 240, .85, { ry: -.3, delay: Wd(3, 'esforco') - SC[3].voStart - .5, anim: 'beat' });
  addIcon(4, mStar(), 1440, 500, 1.55, { ry: -.35, anim: 'beat' });
  addIcon(6, mTeam(), 1440, 520, 1.25, { ry: -.25 });
  addIcon(7, mHeart(), 960, 300, 1.05, { ry: -.2, anim: 'beat' });
  addIcon(8, mIcon(iconPts), 960, 300, 1.35, { final: true, anim: 'spin' });
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
    if (ic.opt.anim === 'beat' && lt > 0) { const bt = Math.pow(Math.max(0, Math.sin(t * 3.4)), 10); sx = sy = 1 + .1 * bt; }
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
  key.position.copy(f).add(V(-4, 9, 8)); key.target.position.copy(f); rim.position.copy(f).add(V(7, 3, -6)); rim.target.position.copy(f);
}
function contactShadows(c) {
  for (const ic of ICONS) {
    if (!ic.grp.visible || !ic.sh.a) continue;
    const x = ic.sh.x - CAM.x, y = ic.sh.y - CAM.y, w = ic.sh.w;
    c.save(); c.globalAlpha = ic.sh.a; c.translate(x, y); c.scale(1, .16);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, w); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(.55, 'rgba(0,0,0,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
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
const fmtBR = v => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function S0(c, t) {
  const s = SC[0], out = Wd(0, 'chegamos') - .3, g = 1 - eio(pr(t, out, .4));
  if (g > 0) { c.save(); c.globalAlpha = g;
    rise(c, 'Bom dia,', L, 330, 118, C.ink, t, Wd(0, 'bom') - .2, { d: .45 });
    rise(c, 'bom dia,', L, 460, 118, C.ink, t, Wd(0, 'bom', 2) - .15, { d: .45 });
    rise(c, 'bom diaaa,', L, 590, 118, C.ink, t, Wd(0, 'bom', 3) - .15, { d: .45 });
    rise(c, 'time!', L, 740, 150, C.coral, t, Wd(0, 'time') - .15, { d: .45 });
    c.restore(); }
  kicker(c, 'BLACK ZISSOU 2026', L, 250, t, out + .1);
  rise(c, 'A semana mais', L, 380, 96, C.ink, t, Wd(0, 'semana') - .25);
  rise(c, 'importante do ano.', L, 486, 96, C.ink, t, Wd(0, 'importante') - .25);
  rise(c, 'Última semana.', L - 4, 640, 132, C.coral, t, Wd(0, 'ultima') - .25);
  const days = [['SEG', 23], ['TER', 24], ['QUA', 25], ['QUI', 26], ['SEX', 27], ['SÁB', 28], ['DOM', 29]];
  const t0 = Wd(0, 'black') - .3;
  days.forEach(([d, n], j) => { const p = ap(t, t0 + j * .07, .5); if (p.a <= 0) return; const x = L + j * 150, y = 730, bf = n === 27;
    c.save(); c.globalAlpha = p.a; c.translate(0, p.dy);
    card(c, x, y, 132, 150, { r: 22, fill: bf ? C.coral : undefined }); if (!bf) { rr(c, x, y, 132, 150, 22); c.lineWidth = 2; c.strokeStyle = C.line; c.stroke(); }
    txt(c, d, x + 66, y + 48, 22, bf ? '#fff' : C.slate, { al: 'center', ls: 4 }); txt(c, String(n), x + 66, y + 114, 58, '#fff', { al: 'center' });
    c.restore(); });
  const bp = ap(t, t0 + .7, .5); if (bp.a > 0) txt(c, 'BLACK FRIDAY', L + 4 * 150 + 66, 920 + bp.dy * .5, 20, C.coral, { al: 'center', ls: 5, a: bp.a });
}
function S1(c, t) {
  const s = SC[1];
  kicker(c, 'O NOSSO RITMO', L, 210, t, s.voStart - .4);
  const out = Wd(1, 'so') - .35, g = 1 - eio(pr(t, out, .4));
  if (g > 0) { c.save(); c.globalAlpha = g;
    rise(c, 'Excelente ritmo.', L, 440, 120, C.ink, t, Wd(1, 'excelente') - .25);
    rise(c, 'Muita dedicação.', L, 560, 64, C.slate, t, Wd(1, 'dedicacao') - .25);
    rise(c, 'Muita entrega de vocês.', L, 650, 64, C.coral, t, Wd(1, 'entrega') - .25);
    c.restore(); }
  const t1 = Wd(1, 'novembro') - .2, p1 = ap(t, t1, .5);
  if (p1.a > 0) txt(c, 'NOVEMBRO ATÉ 22/11', L, 330 + p1.dy, 24, C.slate, { ls: 6, a: p1.a });
  num(c, 3317293, pr(t, Wd(1, 'tres') - .2, 1.6), L - 6, 470, 132, C.ink, { pre: 'R$ ' });
  const t2 = Wd(1, 'trinta') - .2;
  pill(c, '+32% vs. mesmo período de 2025', L, 520, 30, C.coral, '#fff', pr(t, t2, .5), { shadow: true });
  const rows = [['2025 · 1 a 22/nov', 2513126, C.gray, 'R$ 2,51 mi'], ['2026 · 1 a 22/nov', 3317293, C.coral, 'R$ 3,32 mi']];
  rows.forEach(([lab, v, col, vl], j) => { const tt = t2 + .3 + j * .35, p = ap(t, tt, .5); if (p.a <= 0) return; const y = 700 + j * 120;
    c.save(); c.globalAlpha = p.a; txt(c, lab, L, y, 26, C.slate, { w: 600 }); hbar(c, L, y + 22, 1300, 40, v / 3317293, pr(t, tt + .1, .9), col);
    txt(c, vl, L + 1300 * v / 3317293 * eo(pr(t, tt + .1, .9)) + 20, y + 54, 32, j ? C.coral : C.ink); c.restore(); });
}
function S2(c, t) {
  const s = SC[2];
  kicker(c, 'O NOSSO OBJETIVO', L, 210, t, s.voStart - .4);
  rise(c, 'Meta de novembro', L, 320, 48, C.slate, t, Wd(2, 'objetivo') - .3);
  num(c, 6, pr(t, Wd(2, 'seis') - .25, 1.0), L - 6, 470, 150, C.ink, { pre: 'R$ ', suf: ' milhões', static: true });
  const y = 650, x0 = L, w = 1580, h = 48;
  const pb = ap(t, Wd(2, 'recorde') - .5, .5);
  if (pb.a > 0) {
    c.save(); c.globalAlpha = pb.a;
    rr(c, x0, y, w, h, h / 2); c.fillStyle = C.grayL; c.fill();
    const k = eo(pr(t, Wd(2, 'temos') - .1, 1.1)), fw = Math.max(h, w * .553 * k);
    if (k > 0) { const gr = c.createLinearGradient(x0, 0, x0 + fw, 0); gr.addColorStop(0, '#B85A52'); gr.addColorStop(1, C.coral); rr(c, x0, y, fw, h, h / 2); c.fillStyle = gr; c.fill();
      txt(c, 'R$ 3,32 mi · 55%', x0 + fw - 24, y + 34, 24, '#fff', { al: 'right', a: clamp(k * 3) }); }
    // record marker
    const rx = x0 + w * .687, rk = pr(t, Wd(2, 'quatro') - .2, .5);
    if (rk > 0) { c.save(); c.globalAlpha *= clamp(rk * 2); c.fillStyle = C.ink; c.fillRect(rx - 2, y - 18, 4, h + 36);
      txt(c, 'RECORDE · nov/2025', rx, y - 64, 20, C.slate, { al: 'center', ls: 4 }); txt(c, 'R$ 4,12 mi', rx, y - 30, 30, C.ink, { al: 'center' }); c.restore(); }
    txt(c, 'META · R$ 6 mi', x0 + w, y + 100, 24, C.coral, { ls: 4, al: 'right' });
    c.restore();
  }
  const tf = Wd(2, 'faltam') - .15, pf = pr(t, tf, .5);
  if (pf > 0) {
    const gx = x0 + w * .553, gw = w * .447, pulse = .5 + .5 * Math.sin(t * 6);
    c.save(); c.globalAlpha = clamp(pf * 2); rr(c, gx + 6, y, gw - 6, h, h / 2); c.lineWidth = 3; c.setLineDash([10, 8]); c.strokeStyle = C.coral; c.stroke(); c.setLineDash([]);
    c.shadowColor = C.coral; c.shadowBlur = 20 + 20 * pulse; rr(c, gx + 6, y, gw - 6, h, h / 2); c.strokeStyle = `rgba(228,121,111,${.4 + .4 * pulse})`; c.stroke(); c.restore();
    c.save(); c.translate(x0, y + 200); const p = ap(t, tf, .5); c.globalAlpha = p.a;
    txt(c, 'Faltam', 0, p.dy, 40, C.slate); txt(c, 'R$ 2,68 milhões', 172, p.dy, 72, C.coral); c.restore();
  }
}
function S3(c, t) {
  const s = SC[3];
  const tE = Wd(3, 'dessa') - .25, dim = 1 - .96 * eio(pr(t, tE, .6));
  c.save(); c.globalAlpha = dim;
  kicker(c, 'A RETA FINAL DE 2025', L, 210, t, s.voStart - .4);
  rise(c, 'Últimos 8 dias de novembro de 2025', L, 290, 44, C.ink, t, Wd(3, 'ultimos') - .3);
  const v = [90124, 82131, 99949, 233929, 111099, 522816, 294391, 173989], dl = ['23', '24', '25', '26', '27', '28', '29', '30'];
  const base = 860, mh = 430, bw = 96, gap = 34, tb = Wd(3, 'oito') - .1;
  v.forEach((x, j) => { const k = pr(t, tb + j * .09, .7); if (k <= 0) return; const bx = L + j * (bw + gap), bh = Math.max(8, mh * x / 522816 * backO(k)), bf = j === 5;
    const tbf = pr(t, Wd(3, 'black') - .2, .5);
    rr(c, bx, base - bh, bw, bh, [16, 16, 6, 6]); c.fillStyle = bf ? (tbf > 0 ? C.coral : '#3A4A63') : '#3A4A63'; c.fill();
    if (bf && tbf > 0) { c.save(); c.shadowColor = C.coral; c.shadowBlur = 30 * tbf; c.fill(); c.restore(); }
    txt(c, dl[j], bx + bw / 2, base + 40, 26, bf ? C.coral : C.slate, { al: 'center', a: clamp(k * 2) }); });
  const tbf = Wd(3, 'black') - .2, pb = ap(t, tbf, .5);
  if (pb.a > 0) { const bx = L + 5 * (bw + gap) + bw / 2; c.save(); c.globalAlpha *= pb.a; txt(c, 'BLACK FRIDAY', bx, base - mh - 70 + pb.dy * .5, 20, C.coral, { al: 'center', ls: 5 }); txt(c, 'R$ 523 mil', bx, base - mh - 26 + pb.dy * .5, 36, C.ink, { al: 'center' }); txt(c, 'em um único dia', bx, base - mh + 6 + pb.dy * .5, 20, C.slate, { al: 'center', w: 600 }); c.restore(); }
  const RX = 1300, pt = ap(t, Wd(3, 'um') - .2, .5);
  if (pt.a > 0) { c.save(); c.globalAlpha *= pt.a; txt(c, 'EM 8 DIAS', RX, 620 + pt.dy, 22, C.slate, { ls: 6 }); c.restore(); }
  num(c, 1.6, pr(t, Wd(3, 'milhao') - .25, 1.0), RX - 4, 720, 104, C.coral, { pre: 'R$ ', suf: ' mi', dec: 1 });
  c.restore();
  if (dim < .99) {
    rise(c, 'Para passar dos 6 milhões:', 960, 330, 48, C.slate, t, Wd(3, 'precisamos') - .3, { al: 'center' });
    rise(c, 'R$ 335 mil por dia', 960, 480, 130, C.coral, t, Wd(3, 'trezentos') - .3, { al: 'center' });
    rise(c, 'de hoje até 30/11', 960, 560, 48, C.ink, t, Wd(3, 'fim') - .35, { al: 'center' });
    const ek = pr(t, Wd(3, 'esforco') - .25, .5);
    if (ek > 0) { const wE = tw(c, 'ESFORÇO MÁXIMO', 56, 700, 8) + 110; c.save(); c.globalAlpha = clamp(ek * 2); c.translate(960, 700); const sc = .7 + .3 * backO(ek); c.scale(sc, sc);
      c.shadowColor = C.coral; c.shadowBlur = 40 * (.6 + .4 * Math.sin(t * 6)); rr(c, -wE / 2, -60, wE, 120, 60); c.fillStyle = C.coral; c.fill(); c.shadowColor = 'transparent';
      txt(c, 'ESFORÇO MÁXIMO', 0, 20, 56, '#fff', { al: 'center', ls: 8 }); c.restore(); }
    rise(c, 'Toda a nossa energia, juntos!', 960, 850, 48, C.ink, t, Wd(3, 'energia') - .35, { al: 'center' });
  }
}
function S4(c, t) {
  const s = SC[4];
  for (let i = 0; i < 46; i++) { const x = (i * 397) % 1900 + 10, y = (i * 211) % 1040 + 20, ph = i * 1.7; const a = (.25 + .75 * Math.pow(.5 + .5 * Math.sin(t * 1.6 + ph), 3)) * clamp((t - s.voStart + .8 - i * .02) * 1.2);
    if (a <= 0) continue; c.save(); c.globalAlpha = a * .7; c.fillStyle = i % 5 ? '#F6F3EE' : C.coral; c.beginPath(); c.arc(x, y, i % 7 ? 2.2 : 3.6, 0, Math.PI * 2); c.fill(); c.restore(); }
  kicker(c, 'O SEU SONHO', L, 300, t, s.voStart - .4);
  rise(c, 'Pense no', L, 440, 120, C.ink, t, Wd(4, 'pense') - .25);
  rise(c, 'seu sonho.', L, 565, 120, C.coral, t, Wd(4, 'sonho') - .3);
  rise(c, 'Naquela conquista que você quer tanto.', L, 660, 40, C.slate, t, Wd(4, 'conquista') - .3, { w: 600 });
  const p = ap(t, Wd(4, 'semana') - .3, .6);
  if (p.a > 0) { c.save(); c.globalAlpha = p.a; c.translate(0, p.dy); card(c, L, 730, 820, 120, { r: 28, fill: C.coralL }); rr(c, L, 730, 820, 120, 28); c.lineWidth = 2; c.strokeStyle = 'rgba(228,121,111,.5)'; c.stroke();
    txt(c, 'Essa semana te deixa mais perto dele.', L + 40, 803, 38, C.ink, { mw: 740 }); c.restore(); }
}
function glyph(c, kind, x, y, s, col) {
  c.save(); c.translate(x, y); c.fillStyle = col; c.strokeStyle = col; c.lineWidth = s * .09; c.lineCap = 'round'; c.lineJoin = 'round';
  if (kind === 'door') { rr(c, -s * .32, -s * .45, s * .64, s * .9, s * .08); c.stroke(); c.beginPath(); c.arc(s * .14, 0, s * .05, 0, Math.PI * 2); c.fill(); }
  if (kind === 'chat') { rr(c, -s * .45, -s * .36, s * .9, s * .6, s * .2); c.stroke(); c.beginPath(); c.moveTo(-s * .2, s * .24); c.lineTo(-s * .32, s * .44); c.lineTo(-s * .02, s * .24); c.stroke(); }
  if (kind === 'doc') { rr(c, -s * .32, -s * .45, s * .64, s * .9, s * .08); c.stroke(); for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-s * .17, -s * .2 + i * s * .2); c.lineTo(s * .17, -s * .2 + i * s * .2); c.stroke(); } }
  if (kind === 'star') { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? s * .2 : s * .48, a = -Math.PI / 2 + i * Math.PI / 5; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); }
  c.restore();
}
function S5(c, t) {
  const s = SC[5];
  kicker(c, 'CADA OPORTUNIDADE CONTA', L, 200, t, s.voStart - .4);
  const items = [['door', 'Cada cliente', 'que entra', Wd(5, 'cliente') - .2], ['chat', 'Cada', 'conversa', Wd(5, 'conversa') - .2], ['doc', 'Cada orçamento', 'retomado', Wd(5, 'orcamento') - .2], ['star', 'Pode virar uma', 'grande venda', Wd(5, 'grande') - .2]];
  items.forEach(([g, a1, a2, tt], j) => { const p = ap(t, tt, .5); if (p.a <= 0) return; const x = L + j * 410, y = 260, w = 360, h = 230, hi = j === 3;
    c.save(); c.globalAlpha = p.a; c.translate(0, p.dy);
    card(c, x, y, w, h, { r: 28, fill: hi ? C.coral : undefined });
    glyph(c, g, x + 70, y + 80, 64, hi ? '#fff' : C.coral);
    txt(c, a1, x + 36, y + 162, 30, hi ? '#fff' : C.slate, { w: 600, mw: w - 60 }); txt(c, a2, x + 36, y + 202, 36, '#fff', { mw: w - 60 });
    if (j < 3) { const ak = pr(t, items[j + 1][3] - .1, .4); if (ak > 0) { c.globalAlpha = p.a * ak; txt(c, '→', x + w + 25, y + h / 2 + 18, 54, C.coral, { al: 'center' }); } }
    c.restore(); });
  const ck = [['Estar presente', Wd(5, 'presentes') - .2], ['Ouvir o cliente', Wd(5, 'ouvir') - .2], ['Caprichar no atendimento', Wd(5, 'caprichar') - .2], ['Nenhuma oportunidade passa', Wd(5, 'oportunidade') - .2]];
  ck.forEach(([lab, tt], j) => { const p = ap(t, tt, .5); if (p.a <= 0) return; const x = L + (j % 2) * 820, y = 640 + Math.floor(j / 2) * 130;
    c.save(); c.globalAlpha = p.a; check(c, x + 32, y, 60, pr(t, tt, .5)); txt(c, lab, x + 90, y + 16, 46, C.ink, { mw: 700 }); c.restore(); });
}
function S6(c, t) {
  const s = SC[6];
  kicker(c, 'UM TIME SÓ', L, 300, t, s.voStart - .4);
  rise(c, 'Precisa de ajuda?', L, 440, 104, C.ink, t, Wd(6, 'precisar') - .3);
  rise(c, 'Chama.', L, 560, 104, C.coral, t, Wd(6, 'chama') - .25);
  rise(c, 'Um apoia o outro.', L, 660, 48, C.slate, t, Wd(6, 'apoiar') - .3);
  rise(c, 'A gente faz acontecer como time!', L, 730, 48, C.ink, t, Wd(6, 'fazer') - .3);
}
function S7(c, t) {
  const s = SC[7];
  rise(c, 'Eu acredito muito', 960, 560, 104, C.ink, t, Wd(7, 'acredito') - .3, { al: 'center' });
  rise(c, 'em vocês.', 960, 680, 104, C.coral, t, Wd(7, 'voces') - .25, { al: 'center' });
  rise(c, 'Vamos terminar essa semana com orgulho', 960, 780, 40, C.slate, t, Wd(7, 'terminar') - .3, { al: 'center', w: 600 });
  rise(c, 'de tudo o que fizemos!', 960, 832, 40, C.slate, t, Wd(7, 'tudo') - .3, { al: 'center', w: 600 });
}
function S8(c, t) {
  const s = SC[8], th = Wd(8, 'maior') - .3;
  const tc = Wd(8, 'historia') - .1;
  if (t > tc) for (let i = 0; i < 90; i++) { const r1 = Math.sin(i * 12.9898) * 43758.5453 % 1, r2 = Math.sin(i * 78.233) * 12543.123 % 1, r3 = Math.sin(i * 39.425) * 9631.77 % 1;
    const u = t - tc - Math.abs(r3) * .4; if (u < 0) continue; const vx = r1 * 900, vy = -500 - Math.abs(r2) * 700;
    const x = 960 + vx * u * .9, y = 640 + vy * u + 900 * u * u; if (y > 1120) continue;
    c.save(); c.globalAlpha = clamp(2.5 - u * .8); c.translate(x, y); c.rotate(u * 6 * r1 + i); c.fillStyle = i % 3 === 0 ? C.coral : i % 3 === 1 ? '#F6F3EE' : '#9AABC6'; c.fillRect(-7, -3.5, 14, 7); c.restore(); }
  const gk = eo(pr(t, th, 1.0));
  if (gk > 0) { const pu = .85 + .15 * Math.sin(t * 3); c.save(); c.globalAlpha = gk * pu; const g = c.createRadialGradient(960, 690, 0, 960, 690, 720); g.addColorStop(0, 'rgba(228,121,111,.35)'); g.addColorStop(1, 'rgba(228,121,111,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore(); }
  const w1 = tw(c, 'Bora vender.', 50), w2 = tw(c, 'Bora passar dos 6 milhões.', 50), bx = 960 - (w1 + 28 + w2) / 2;
  rise(c, 'Bora vender.', bx, 520, 50, C.slate, t, Wd(8, 'bora') - .2);
  rise(c, 'Bora passar dos 6 milhões.', bx + w1 + 28, 520, 50, C.ink, t, Wd(8, 'bora', 2) - .2);
  rise(c, 'A maior Black', 960, 655, 118, C.ink, t, th, { al: 'center' });
  rise(c, 'da história.', 960, 780, 118, C.coral, t, Wd(8, 'historia') - .3, { al: 'center' });
  const lk = eo(pr(t, Wd(8, 'zicu') + .3, .8));
  if (lk > 0) { const lw = 250, lh = lw * IMG.logo.height / IMG.logo.width; c.save(); c.globalAlpha = lk; c.drawImage(IMG.logoN, 960 - lw / 2, 850 + 12 * (1 - lk), lw, lh); c.restore(); }
}
const SCN = [S0, S1, S2, S3, S4, S5, S6, S7, S8];

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
  if (fi > 0 || fo > 0) { c.fillStyle = `rgba(11,17,25,${Math.max(fi, fo)})`; c.fillRect(0, 0, W, H); }
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
  const P = [[960, 540], [3160, 540], [5360, 700], [7560, 540], [9760, 400], [11960, 540], [14160, 700], [16360, 540], [18560, 540]];
  A = P.map(([x, y]) => ({ x, y }));
  IMG.logo = await loadImg('../assets/logo.png');
  { const c = document.createElement('canvas'); c.width = IMG.logo.width; c.height = IMG.logo.height; const g = c.getContext('2d'); g.drawImage(IMG.logo, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#F6F3EE'; g.fillRect(0, 0, c.width, c.height); IMG.logoN = c; }
  const shape = await (await fetch('../assets/icon_shape.json')).json();
  build(shape.pts);
  renderer.compile(scene, camera);
  return true;
})();
window.renderAt = renderAt;
