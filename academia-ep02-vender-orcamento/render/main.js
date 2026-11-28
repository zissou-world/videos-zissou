// Zissou World Academy · Portal do Vendedor · EP. 02 — Vender: orçamento e visita. 1920x1080, cinematográfico: vídeo real + mockups + 3D.
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
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 1.0;
const D = 20;
const camera = new THREE.PerspectiveCamera(2 * Math.atan(5.4 / D) * 180 / Math.PI, W / H, .5, 200);
const key = new THREE.DirectionalLight(0xffffff, 1.8); key.castShadow = false; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 8; key.shadow.bias = -.0005;
Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 });
scene.add(key); scene.add(key.target);
scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e2dc, .8));
const rim = new THREE.DirectionalLight(0xFFB9AC, 2.2); rim.position.set(-7, 5, -9); scene.add(rim);   // warm coral rim from behind
const rim2 = new THREE.DirectionalLight(0xCFE0FF, .9); rim2.position.set(8, -3, -6); scene.add(rim2);
const toU = px => px / 100;
function scenePos(i, sx, sy, z = 0) { return V(toU(A[i].x + sx - 960), -toU(A[i].y + sy - 540), z); }
const M = {
  white: new THREE.MeshPhysicalMaterial({ color: 0xfbf8f5, roughness: .28, clearcoat: .9, clearcoatRoughness: .12, sheen: .4, sheenColor: 0xffe6dc }),
  coral: new THREE.MeshPhysicalMaterial({ color: 0xE4796F, roughness: .3, clearcoat: 1, clearcoatRoughness: .08, sheen: .3, sheenColor: 0xffc9bd }),
  navy: new THREE.MeshPhysicalMaterial({ color: 0x22344A, roughness: .3, clearcoat: 1, clearcoatRoughness: .1 }),
  slate: new THREE.MeshPhysicalMaterial({ color: 0x5A7196, roughness: .3, clearcoat: .8, clearcoatRoughness: .12 }),
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

function mTarget() {
  const g = new THREE.Group(), rot = Math.PI / 2;
  [[1.3, M.white, 0], [1.0, M.coral, .07], [.68, M.white, .14], [.36, M.coral, .21]].forEach(([r, m, z]) => g.add(mesh(new THREE.CylinderGeometry(r, r, .3, 72).rotateX(rot), m, 0, 0, z)));
  const dart = new THREE.Group(); dart.position.set(.05, .05, .4); dart.rotation.set(-.5, .55, 0);
  dart.add(mesh(new THREE.CylinderGeometry(.05, .05, 1.5, 16).rotateX(rot), M.navy, 0, 0, .75));
  dart.add(mesh(new THREE.ConeGeometry(.09, .3, 16).rotateX(-rot), M.navy, 0, 0, -.05));
  for (let i = 0; i < 3; i++) { const f = mesh(new RoundedBoxGeometry(.04, .34, .42, 2, .015), M.coral, 0, 0, 1.38); f.rotation.z = i * Math.PI * 2 / 3; f.geometry.translate(0, .17, 0); dart.add(f); }
  g.add(dart); return sh(g);
}
function mPlus() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.15, 1.15, .42, 72).rotateX(Math.PI / 2), M.navy));
  g.add(mesh(new THREE.TorusGeometry(1.15, .1, 20, 72), M.coral));
  g.add(mesh(new RoundedBoxGeometry(1.1, .28, .2, 3, .1), M.white, 0, 0, .27));
  g.add(mesh(new RoundedBoxGeometry(.28, 1.1, .2, 3, .1), M.white, 0, 0, .27));
  return sh(g);
}
function mPerson() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(.55, 48, 32), M.white, -.2, .62, 0));
  const prof = [[0, -1.05], [1.0, -1.05], [1.05, -.95], [1.0, -.55], [.82, -.18], [.5, 0], [0, .02]].map(p => new THREE.Vector2(p[0], p[1]));
  g.add(mesh(new THREE.LatheGeometry(prof, 64), M.white, -.2, 0, 0));
  const lens = new THREE.Group(); lens.position.set(.75, -.35, .65); lens.rotation.z = -.6;
  lens.add(mesh(new THREE.TorusGeometry(.42, .11, 20, 56), M.coral));
  lens.add(mesh(new THREE.CircleGeometry(.36, 48), new THREE.MeshPhysicalMaterial({ color: 0xd8e6ff, roughness: .05, transmission: .6, transparent: true, opacity: .55, clearcoat: 1 }), 0, 0, -.01));
  lens.add(mesh(new RoundedBoxGeometry(.2, .7, .2, 3, .08), M.navy, 0, -.82, 0));
  g.add(lens); return sh(g);
}

function mPillow() {   // soft pillow: rounded slab with puffy top, coral piping and label
  const g = new THREE.Group();
  const body = mesh(new RoundedBoxGeometry(2.7, .62, 1.75, 10, .3), M.white); g.add(body);
  const top = mesh(new THREE.SphereGeometry(1, 64, 32), M.white, 0, .12, 0); top.scale.set(1.25, .3, .78); g.add(top);
  g.add(mesh(new RoundedBoxGeometry(2.74, .05, 1.79, 4, .025), M.coral, 0, 0, 0));
  g.add(mesh(new RoundedBoxGeometry(.5, .22, .04, 2, .03), M.coral, .95, -.08, .9));
  g.rotation.set(.75, -.35, .08); const w = new THREE.Group(); w.add(g); return sh(w);
}
function mBolt() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.2, 1.2, .36, 72).rotateX(Math.PI / 2), M.navy));
  g.add(mesh(new THREE.TorusGeometry(1.2, .08, 16, 72), M.coral));
  const s = new THREE.Shape(); s.moveTo(.32, 1.0); s.lineTo(-.55, -.08); s.lineTo(-.04, -.08); s.lineTo(-.3, -1.0); s.lineTo(.6, .16); s.lineTo(.07, .16); s.closePath();
  g.add(mesh(ext(s, .2, .06, 4), M.coral, 0, 0, .3));
  return sh(g);
}
function mCard() {
  const g = new THREE.Group();
  const cd = new THREE.Group(); cd.rotation.z = .12;
  cd.add(mesh(new RoundedBoxGeometry(2.8, 1.8, .12, 4, .1), M.navy));
  cd.add(mesh(new RoundedBoxGeometry(2.8, .3, .13, 2, .05), M.coral, 0, .45, .005));
  cd.add(mesh(new RoundedBoxGeometry(.5, .38, .06, 2, .05), new THREE.MeshPhysicalMaterial({ color: 0xE8C27A, roughness: .25, metalness: .6, clearcoat: 1 }), -.85, -.1, .08));
  for (let i = 0; i < 4; i++) cd.add(mesh(new RoundedBoxGeometry(.38, .09, .03, 2, .02), M.white, -.85 + i * .48 + .55, -.55, .075));
  g.add(cd);
  const coin = new THREE.Group(); coin.position.set(1.05, -.7, .55);
  coin.add(mesh(new THREE.CylinderGeometry(.62, .62, .16, 64).rotateX(Math.PI / 2), M.coral));
  const tx = canvasTex(256, 256, x => { x.fillStyle = '#fff'; x.font = '700 112px Zona'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('R$', 128, 138); });
  coin.add(mesh(new THREE.PlaneGeometry(.95, .95), new THREE.MeshBasicMaterial({ map: tx, transparent: true }), 0, 0, .09));
  g.add(coin); return sh(g);
}
function mPlane() {
  const g = new THREE.Group();
  const N = [1.5, .15, 0], L = [-1.1, .15, 1.05], R = [-1.1, .15, -1.05], Cc = [-.6, .15, 0], K = [-.85, -.45, 0];
  const tri = (pts, mat) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); geo.computeVertexNormals(); return new THREE.Mesh(geo, mat); };
  const wm = M.white.clone(); wm.side = THREE.DoubleSide; const cm = M.coral.clone(); cm.side = THREE.DoubleSide;
  const nm = M.navy.clone(); nm.side = THREE.DoubleSide; g.add(tri([N, L, Cc], cm)); g.add(tri([N, Cc, R], cm)); g.add(tri([N, Cc, K], nm)); g.add(tri([N, K, Cc], nm));
  g.rotation.set(1.0, -.75, .25); const w = new THREE.Group(); w.add(g); return sh(w);
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
const HPOS = { 7: [965, 880], 9: [1010, 905] };   // per-scene override [x, y, r]
function whiteIcon(pts) {   // premium hero logo: thick pearl-ceramic body, glossy coat, coral edge light from the rims
  const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const z = new THREE.Group();
  z.add(new THREE.Mesh(ext(s, .55, .14, 10), new THREE.MeshPhysicalMaterial({ color: 0xF4ECE6, roughness: .24, clearcoat: 1, clearcoatRoughness: .03, sheen: .5, sheenColor: 0xFF9F8C, sheenRoughness: .35, emissive: 0x3A1E1A, emissiveIntensity: .0, iridescence: .25, iridescenceIOR: 1.35 })));
  return sh(z);
}
function upd3D(t) {
  for (const ic of ICONS) {
    const vis = t > ic.tIn - .1 && t < ic.tOut + .6; ic.grp.visible = vis; ic.k = 0; if (!vis) continue;
    const kin = pr(t, ic.tIn, 1.0), kout = eio(pr(t, ic.tOut, .5)), k = backO(kin) * (1 - kout), lt = t - ic.tIn - 1;
    let ey = 0, ez = 0, sc = 1;
    if (ic.o.anim === 'spin' && lt > 0) ey = Math.PI * 2 * eio(pr((lt % 4) / 4, .6, .3));
    if (ic.o.anim === 'swing') ez = Math.sin(t * 2.2) * .18;
    if (ic.o.anim === 'beat' && lt > 0) sc = 1 + .1 * Math.pow(Math.max(0, Math.sin(t * 3.4)), 10);
    ic.grp.position.copy(sp(ic.x, ic.y, ic.o.z ?? 2)).add(V(0, Math.sin(t * 1.5 + ic.x) * .1 - (1 - eo(kin)) * 1.2 + kout * .7, 0));
    ic.t = t; ic.k = k; ic.grp.scale.setScalar(Math.max(.001, ic.scale * k * sc));
    ic.grp.rotation.set(.1 + Math.sin(t * .9) * .06, (ic.o.ry ?? .4) + Math.sin(t * .6 + ic.y) * .2 + (1 - eo(kin)) * Math.PI * 2 + ey + kout * 2, Math.sin(t * .8) * .04 + ez);
  }
}
function heroFX(c) {
  for (const ic of ICONS) { if (!ic.o.hero || !ic.grp.visible || !(ic.k > .01)) continue;
    const R = 125 * ic.o.r * clamp(ic.k), x = ic.x, y = ic.y + Math.sin(ic.t * 1.5 + ic.x) * 10;
    c.save();
    let g = c.createRadialGradient(x, y, 0, x, y, R * 1.9); g.addColorStop(0, 'rgba(240,140,125,.34)'); g.addColorStop(.45, 'rgba(240,150,135,.14)'); g.addColorStop(1, 'rgba(240,150,135,0)');
    c.fillStyle = g; c.fillRect(x - R * 2, y - R * 2, R * 4, R * 4);
    c.translate(x + R * .25, y + R * 1.02); c.scale(1, .2); g = c.createRadialGradient(0, 0, 0, 0, 0, R * .95); g.addColorStop(0, 'rgba(20,27,38,.30)'); g.addColorStop(1, 'rgba(20,27,38,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * .95, 0, Math.PI * 2); c.fill();
    c.restore(); }
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
const CHAPS = [['01', 'Abrir o orçamento'], ['02', 'Produtos'], ['03', 'Condições e alçada'], ['04', 'Enviar'], ['05', 'Registrar a visita']];
function chrome(c, t, a) {
  if (a <= 0) return; c.save(); c.globalAlpha = a;
  if (IMG.icon) { c.drawImage(IMG.iconC, TX, 74, 34, 34 * IMG.icon.height / IMG.icon.width); }
  txt(c, 'ZISSOU WORLD ACADEMY', TX + 48, 98, 18, C.ink, { ls: 5 }); const tw1 = tw(c, 'ZISSOU WORLD ACADEMY', 18, 700, 5); txt(c, '·  EP. 02 · VENDER', TX + 48 + tw1 + 18, 98, 18, C.slate, { ls: 4 });
  const starts = [...TCH(), SC[14].voStart - .8];
  for (let i = 0; i < 5; i++) { const x = 1150 + i * 128, k = clamp((t - starts[i]) / (starts[i + 1] - starts[i])); rr(c, x, 88, 114, 6, 3); c.fillStyle = C.grayL; c.fill(); if (k > 0) { rr(c, x, 88, 114 * k, 6, 3); c.fillStyle = C.coral; c.fill(); }
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
// ---------- EP02 scene drawings ----------
const SW = {};   // sampled screen colours
function cover(cc, x, y, w, h, col) { cc.fillStyle = col; cc.fillRect(x, y, w, h); }
// orçamento with one product added and totals filled (screen coordinates, 1440x900)
function fillQuote(cc, k = 1, dy = 0) {
  if (k <= 0) return;
  cc.save(); cc.globalAlpha *= clamp(k * 2);
  cc.save(); cc.translate(0, dy);
  cover(cc, 284, 272, 710, 94, SW.page);
  rr(cc, 285, 273, 707, 92, 12); cc.fillStyle = '#fff'; cc.fill(); cc.lineWidth = 1.5; cc.strokeStyle = '#E3E6EA'; cc.stroke();
  rr(cc, 300, 297, 44, 44, 10); cc.fillStyle = '#F2F3F5'; cc.fill();
  cc.strokeStyle = '#5A6270'; cc.lineWidth = 2; cc.beginPath(); cc.moveTo(322, 307); cc.lineTo(334, 313); cc.lineTo(334, 327); cc.lineTo(322, 333); cc.lineTo(310, 327); cc.lineTo(310, 313); cc.closePath(); cc.stroke();
  txt(cc, 'Travesseiro Zissou Cloud', 360, 314, 17, '#141B26', { w: 600 }); txt(cc, 'Padrão · T120', 360, 338, 14, '#6B7280', { w: 600 });
  rr(cc, 720, 302, 110, 36, 10); cc.lineWidth = 1.5; cc.strokeStyle = '#E3E6EA'; cc.stroke(); txt(cc, '–      1      +', 775, 326, 16, '#141B26', { al: 'center', w: 600 });
  txt(cc, 'R$ 590,00', 975, 327, 19, '#141B26', { al: 'right' });
  cc.restore();
  cover(cc, 276, 826, 166, 36, SW.foot); txt(cc, 'R$ 590,00', 277, 852, 24, '#141B26');
  cover(cc, 676, 790, 74, 24, SW.card); txt(cc, 'R$ 590,00', 746, 808, 15, '#141B26', { al: 'right' });
  cover(cc, 976, 790, 78, 24, SW.pix); txt(cc, 'R$ 548,70', 1050, 808, 15, '#1F8A57', { al: 'right' });
  cc.restore();
}
function withScreen(draw) { return (cc, x, y, sx) => { cc.save(); cc.translate(x, y); cc.scale(sx, sx); draw(cc); cc.restore(); }; }
function typed(cc, s, k, x, y, size, box, o = {}) {   // typing animation inside an input (screen px)
  if (k <= 0) return; cover(cc, box[0], box[1], box[2], box[3], o.bg || '#fff');
  const n = Math.floor(s.length * clamp(k)); txt(cc, s.slice(0, n), x, y, size, o.col || '#141B26', { w: 600 });
  if (k < 1.15 && (Math.floor(k * 12) % 2 === 0)) { const w = tw(cc, s.slice(0, n), size, 600); cc.fillStyle = '#141B26'; cc.fillRect(x + w + 2, y - size * .85, 2, size); }
}
function toggleOn(cc, k) { if (k <= 0) return; const e = eo(k); rr(cc, 1350, 156, 46, 26, 13); cc.fillStyle = `rgba(228,121,111,${e})`; cc.fill(); cc.beginPath(); cc.arc(1363 + 20 * e, 169, 10, 0, Math.PI * 2); cc.fillStyle = '#fff'; cc.fill(); }
function linkCard(c, t, t0, t1) {   // what the client receives
  const p = ap(t, t0, .6), ko = eio(pr(t, t1, .4)); if (p.a <= 0 || ko >= 1) return;
  const X = 1010, Y = 300 + p.dy; c.save(); c.globalAlpha = p.a * (1 - ko);
  card(c, X, Y, 600, 420, { r: 30 });
  rr(c, X + 30, Y + 30, 540, 52, 26); c.fillStyle = '#F2F4F7'; c.fill();
  c.strokeStyle = C.slate; c.lineWidth = 3; rr(c, X + 56, Y + 54, 16, 13, 3); c.stroke(); c.beginPath(); c.arc(X + 64, Y + 54, 6, Math.PI, 0); c.stroke();
  txt(c, 'orcamento.zissou.com.br', X + 88, Y + 65, 22, C.ink, { w: 600 });
  c.drawImage(IMG.logoN, X + 40, Y + 112, 150, 150 * IMG.logo.height / IMG.logo.width);
  txt(c, 'Seu orçamento', X + 40, Y + 200, 34, C.ink); txt(c, 'Travesseiro Zissou Cloud · Padrão', X + 40, Y + 238, 20, C.slate, { w: 600 });
  txt(c, 'No PIX', X + 40, Y + 292, 18, C.slate, { w: 600 }); txt(c, 'R$ 548,70', X + 40, Y + 330, 34, '#1F8A57');
  txt(c, 'No cartão', X + 300, Y + 292, 18, C.slate, { w: 600 }); txt(c, 'R$ 590,00', X + 300, Y + 330, 34, C.ink);
  rr(c, X + 40, Y + 352, 520, 52, 26); c.fillStyle = C.coral; c.fill(); txt(c, 'Pagar agora', X + 300, Y + 386, 22, '#fff', { al: 'center' });
  c.restore();
}
function alcadaInfo(c, t) {   // scene 9: the approval rule (no screenshot in the script)
  const S = SC[9], X = 820, Y = 230, Wb = 900;
  const p = ap(t, S.voStart - .3, .6), ko = eio(pr(t, SC[10].voStart - .9, .4)); if (p.a <= 0 || ko >= 1) return;
  c.save(); c.globalAlpha = p.a * (1 - ko); card(c, X, Y, Wb + 120, 620, { r: 32 });
  txt(c, 'DESCONTO PEDIDO PELO CLIENTE', X + 60, Y + 76, 20, C.coral, { ls: 5 });
  const bx = X + 60, by = Y + 150, bw = Wb, lim = .46;
  const k1 = eo(pr(t, Wd(9, 'alcada') - .3, .9)), k2 = eo(pr(t, Wd(9, 'pedir') - .2, 1.0));
  rr(c, bx, by, bw, 64, 32); c.fillStyle = C.grayL; c.fill();
  if (k1 > 0) { rr(c, bx, by, bw * lim * k1, 64, 32); c.fillStyle = '#3BA776'; c.fill(); }
  if (k2 > 0) { rr(c, bx + bw * lim - 30, by, 30 + bw * (.82 - lim) * k2, 64, [0, 32, 32, 0]); c.fillStyle = C.coral; c.fill(); }
  if (k1 > 0) { c.fillStyle = C.ink; c.fillRect(bx + bw * lim - 2, by - 18, 4, 100); txt(c, 'SUA ALÇADA', bx + bw * lim, by - 30, 18, C.ink, { al: 'center', ls: 4, a: k1 }); txt(c, 'Dentro da alçada', bx + 24, by + 42, 22, '#fff', { a: clamp(k1 * 2) }); }
  if (k2 > .3) txt(c, 'Acima da alçada', bx + bw * lim + 24, by + 42, 22, '#fff', { a: clamp((k2 - .3) * 3) });
  const nodes = [['Você', 'pede a aprovação'], ['Líder ou coordenação', 'analisa o desconto'], ['Resposta', 'aparece no orçamento']];
  nodes.forEach(([a, b], i) => { const tt = Wd(9, 'aprovacao') - .3 + i * .55 + (i === 2 ? Wd(9, 'acompanha') - Wd(9, 'aprovacao') - 1.1 : 0); const q = ap(t, tt, .5); if (q.a <= 0) return;
    const nx = X + 60 + i * 320, ny = Y + 290 + q.dy; c.save(); c.globalAlpha *= q.a; rr(c, nx, ny, 280, 150, 24); c.fillStyle = i === 1 ? C.coralL : '#F6F7F9'; c.fill();
    txt(c, a, nx + 26, ny + 62, 26, C.ink, { mw: 230 }); txt(c, b, nx + 26, ny + 100, 20, C.slate, { w: 600, mw: 230 });
    if (i === 2) check(c, nx + 240, ny + 34, 36, pr(t, tt + .3, .5), '#3BA776');
    if (i < 2) { c.strokeStyle = C.coral; c.lineWidth = 4; c.beginPath(); c.moveTo(nx + 288, ny + 75); c.lineTo(nx + 312, ny + 75); c.stroke(); c.beginPath(); c.moveTo(nx + 304, ny + 66); c.lineTo(nx + 313, ny + 75); c.lineTo(nx + 304, ny + 84); c.stroke(); }
    c.restore(); });
  const ks = pr(t, Wd(9, 'atalho') - .3, .5); if (ks > 0) pill(c, 'SEM ATALHO', X + 60, Y + 500, 26, C.ink, '#fff', ks, { ls: 4 });
  c.restore();
}
function summary(c, t) {
  const S = SC[14], t0 = S.voStart - .4, t1 = Wd(14, 'antes') - .4; if (t < t0 - .1 || t > t1 + .6) return;
  const ko = eio(pr(t, t1, .5)); c.save(); c.globalAlpha = 1 - ko;
  kicker(c, 'RESUMINDO', 960, 300, t, t0, { size: 24, al: 'center' });
  const st = [['01', 'Cliente', 'cliente'], ['02', 'Produtos', 'produtos'], ['03', 'Condições', 'condicoes'], ['04', 'Enviar', 'enviar'], ['05', 'Registrar a visita', 'registrar']];
  st.forEach(([n, s, w], i) => { const q = ap(t, Wd(14, w) - .25, .5); if (q.a <= 0) return; const x = 190 + i * 312, y = 400 + q.dy;
    c.save(); c.globalAlpha *= q.a; card(c, x, y, 272, 300, { r: 28 }); txt(c, n, x + 30, y + 110, 72, C.coral, { ls: -2 }); txt(c, s, x + 30, y + 220, 32, C.ink, { mw: 220 }); c.fillStyle = C.coral; c.fillRect(x + 30, y + 245, 60, 5); c.restore(); });
  c.restore();
}
function checklist(c, t) {
  const t0 = Wd(14, 'antes') - .2, t1 = SC[15].voStart - .6; if (t < t0 - .1 || t > t1 + .6) return;
  const p = ap(t, t0, .6), ko = eio(pr(t, t1, .5)); c.save(); c.globalAlpha = p.a * (1 - ko);
  card(c, 400, 170, 1120, 760, { r: 36 }); txt(c, 'CHECKLIST · FAÇA AGORA NO SEU PORTAL', 460, 245, 20, C.coral, { ls: 5 });
  const items = ['Criei um orçamento para um lead recente', 'Cadastrei um cliente novo', 'Adicionei produtos pela busca', 'Conferi cartão e PIX', 'Sei que desconto acima da alçada vai para aprovação', 'Registrei uma visita'];
  items.forEach((s, i) => { const tt = t0 + .6 + i * .6, y = 300 + i * 100; const k = pr(t, tt, .4);
    rr(c, 460, y, 1000, 78, 18); c.fillStyle = k > 0 ? '#F4FBF7' : '#F6F7F9'; c.fill(); checkbox(c, 488, y + 20, 38, pr(t, tt + .2, .4)); txt(c, s, 550, y + 50, 28, C.ink, { a: .4 + .6 * clamp(k * 2), mw: 880 }); });
  c.restore();
}
// ---------- opening: Zissou World Academy ----------
function opening(c, t) {
  if (t > 6.6) return;
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0E131C'); g.addColorStop(1, '#1D2A40'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const pulse = .5 + .5 * Math.sin(t * 2), gl = c.createRadialGradient(960, 420, 0, 960, 420, 760); gl.addColorStop(0, `rgba(228,121,111,${.22 + .08 * pulse})`); gl.addColorStop(1, 'rgba(228,121,111,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H);
  c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const x = (-600 + (t * 380 + i * 520) % 3000); const gg = c.createLinearGradient(x, 0, x + 220, 0); gg.addColorStop(0, 'rgba(255,220,200,0)'); gg.addColorStop(.5, 'rgba(255,220,200,.07)'); gg.addColorStop(1, 'rgba(255,220,200,0)'); c.fillStyle = gg; c.save(); c.translate(x, 0); c.rotate(.25); c.fillRect(0, -200, 220, 1600); c.restore(); } c.restore();
}
function openingText(c, t) {
  if (t > 6.6) return;
  const k1 = pr(t, 1.6, .9), k2 = pr(t, 2.3, .8), k3 = pr(t, 3.6, .7), ko = eio(pr(t, 5.8, .6));
  c.save(); c.globalAlpha = 1 - ko;
  txt(c, 'ZISSOU WORLD ACADEMY', 960, 690, 64, '#FFFFFF', { al: 'center', ls: 6 + 18 * (1 - eo(k1)), a: clamp(k1 * 1.6) });
  c.fillStyle = C.coral; const lw = 560 * eo(k2); c.fillRect(960 - lw / 2, 722, lw, 4);
  txt(c, 'PORTAL DO VENDEDOR', 960, 780, 26, 'rgba(255,255,255,.8)', { al: 'center', ls: 10, a: clamp(k2 * 1.6) });
  if (k3 > 0) { pill(c, 'EPISÓDIO 02  ·  VENDER', 960, 840, 24, C.coral, '#fff', k3, { al: 'center' }); }
  c.restore();
  return eio(pr(t, 5.7, .8));
}
// ---------- main composition ----------
const TCH = () => { const S = SC; return [S[2].voStart - 3.4, S[4].voStart - 3.4, S[6].voStart - 3.4, S[11].voStart - 3.4, S[12].voStart - 3.4]; };
async function composite(c, t) {
  const S = SC, D_ = CUES.duration, tCh = TCH();
  const tB0 = 5.9, tTab0 = S[0].voStart - .35, tStage0 = S[1].voStart - .45, tClose = S[15].voStart - .5;
  const inOpen = t < 6.6, inBroll = t >= tB0 && t < tTab0 + .3, inTab = t >= tTab0 && t < tStage0 + .45, inClose = t >= tClose;
  drawBG(c, t); upd3D(t);
  const showStage = t >= tStage0 && !inClose;
  if (showStage) {
    chrome(c, t, eo(pr(t, tStage0, .6)) * (1 - eio(pr(t, S[14].voStart - .8, .5))));
    // 1 · intro: the quote screen
    if (t < tCh[0] + .5) {
      head(c, t, 'EPISÓDIO 02 · VENDER', 'Seu orçamento', 'em minutos.', S[1].voStart - .3, S[1].voEnd + .8);
      bullet(c, t, 'Cliente, produtos e condições', 'do jeito que você faz na loja', 600, Wd(1, 'juntos') - .4, S[1].voEnd + .8, { icon: 'doc' });
      tag(c, t, 'Seu orçamento em minutos', Wd(1, 'orcamento') - .2, S[1].voEnd + .7);
      tabletShot(c, IMG.orc, t, [[tStage0, 720, 450, 1], [S[1].voEnd, 720, 450, 1.06]]);
    }
    // 2 · botão + › novo orçamento
    if (t > S[2].voStart - .8 && t < S[3].voStart) {
      head(c, t, 'CAPÍTULO 01', 'Botão +', 'Novo Orçamento.', S[2].voStart - .3, S[2].voEnd + .3);
      bullet(c, t, 'Toque no botão +', null, 600, Wd(2, 'toque') - .2, S[2].voEnd + .3, { n: '1' });
      bullet(c, t, 'Escolha Novo Orçamento', null, 680, Wd(2, 'novo') - .2, S[2].voEnd + .3, { n: '2' });
      bullet(c, t, 'Ou direto do WhatsApp', 'sem sair da conversa', 760, Wd(2, 'conversa') - .5, S[2].voEnd + .3, { icon: 'chat' });
      tag(c, t, '+  ›  Novo Orçamento', Wd(2, 'novo') - .2, S[2].voEnd + .3, { y: 880 });
      const map = tabletShot(c, IMG.mais, t, [[S[2].voStart - .6, 720, 421, 1], [Wd(2, 'toque') - .1, 1230, 690, 1.75]]);
      const [px, py] = map(1400, 802); ring(c, px, py, 44, t, Wd(2, 'mais') - .2);
      const a = map(1240, 629), b = map(1422, 667); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(2, 'novo') - .15);
      const [nx, ny] = map(1330, 648); const cp = cursorAt(t, [[Wd(2, 'toque') + .2, px + 120, py + 120], [Wd(2, 'mais'), px, py], [Wd(2, 'novo') - .2, nx, ny], [S[2].voEnd, nx, ny]]); if (cp) cursor(c, cp[0], cp[1], pr(t, Wd(2, 'mais'), .5) + pr(t, Wd(2, 'novo'), .5) * 0);
    }
    // 3 · escolher o cliente
    if (t > S[3].voStart - .8 && t < tCh[1]) {
      head(c, t, 'CAPÍTULO 01', 'Primeiro,', 'o cliente.', S[3].voStart - .3, S[3].voEnd + .4);
      bullet(c, t, 'Lead recente (90 dias)', 'é só tocar no nome', 600, Wd(3, 'leads') - .2, S[3].voEnd + .4, { n: '1' });
      bullet(c, t, 'Busque o cliente', 'nome, telefone ou e-mail', 690, Wd(3, 'busque') - .2, S[3].voEnd + .4, { n: '2' });
      bullet(c, t, 'Ou cadastre um novo', null, 780, Wd(3, 'cadastrar') - .2, S[3].voEnd + .4, { n: '3' });
      tag(c, t, 'Lead recente ou cliente novo', Wd(3, 'primeiro') + .3, S[3].voEnd + .4, { y: 880 });
      const map = tabletShot(c, IMG.cliente, t, [[S[3].voStart - .6, 720, 450, 1], [S[3].voStart + .5, 720, 520, 1.3], [Wd(3, 'busque') - .4, 720, 200, 1.75], [Wd(3, 'cadastrar') - .3, 720, 215, 1.75]]);
      const [mx, my] = map(512, 328); ring(c, mx, my, 40, t, Wd(3, 'leads'));
      let a = map(481, 298), b = map(959, 360); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(3, 'tocar') - .2, Wd(3, 'busque') - .4);
      a = map(488, 150); b = map(952, 197); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(3, 'busque') - .1, Wd(3, 'cadastrar') - .3);
      a = map(489, 206); b = map(951, 249); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(3, 'cadastrar') - .1);
      const cp = cursorAt(t, [[Wd(3, 'tocar') - .6, mx + 260, my + 140], [Wd(3, 'tocar'), mx + 90, my + 4], [Wd(3, 'busque') - .4, mx + 90, my + 4]]); if (cp && t < Wd(3, 'busque') - .4) cursor(c, cp[0], cp[1], pr(t, Wd(3, 'nome'), .5));
    }
    // 4 · produtos
    if (t > tCh[1] + 2.4 && t < S[5].voStart) {
      head(c, t, 'CAPÍTULO 02', 'Agora,', 'os produtos.', S[4].voStart - .3, S[4].voEnd + .4);
      [['Colchão', 'colchao'], ['Travesseiro', 'travesseiro'], ['Lençol', 'lencol'], ['Protetor', 'protetor']].forEach(([s, w], i) => bullet(c, t, s, null, 590 + i * 62, Wd(4, w) - .2, S[4].voEnd + .4, { n: String(i + 1) }));
      tag(c, t, 'Busque por nome ou SKU', Wd(4, 'digite') - .2, Wd(4, 'ritual') - .4, { y: 880 });
      tag(c, t, 'Ritual completo = ticket maior', Wd(4, 'ritual') - .2, S[4].voEnd + .4, { y: 880, bg: C.coral });
      const tT0 = Wd(4, 'digite') + .1, tT1 = Wd(4, 'toque') - .25, tAdd = Wd(4, 'repita') - .35;
      const img = t < tT1 ? IMG.orc : t < tAdd ? IMG.produto : IMG.orc;
      const map = tabletShot(c, img, t, [[S[4].voStart - .6, 720, 450, 1], [S[4].voStart + .2, 640, 290, 1.55], [tAdd, 640, 300, 1.5], [Wd(4, 'ritual') - .4, 700, 420, 1.12]],
        { draw: withScreen(cc => { if (t < tT1) typed(cc, 'Coral', pr(t, tT0, .9), 322, 247, 17, [316, 228, 600, 28]); if (t >= tAdd) fillQuote(cc, pr(t, tAdd, .4)); }) });
      const [rx, ry] = map(414, 300); if (t > tT1 && t < tAdd) ring(c, rx, ry, 46, t, Wd(4, 'toque'));
      const cp = cursorAt(t, [[tT1, rx + 200, ry + 120], [Wd(4, 'item'), rx + 30, ry + 6], [tAdd, rx + 30, ry + 6]]); if (cp && t < tAdd) cursor(c, cp[0], cp[1], pr(t, Wd(4, 'item') + .05, .5));
    }
    // 5 · arquiteto(a)
    if (t > S[5].voStart - .8 && t < tCh[2]) {
      head(c, t, 'CAPÍTULO 02', 'Indicação de', 'arquiteto(a).', S[5].voStart - .3, S[5].voEnd + .4);
      bullet(c, t, 'Adicionar arquiteto(a)', 'registre quem indicou', 600, Wd(5, 'adicionar') - .2, S[5].voEnd + .4, { icon: 'spark' });
      tag(c, t, 'Indicação registrada', Wd(5, 'registre') - .2, S[5].voEnd + .4, { y: 880 });
      const kReg = pr(t, Wd(5, 'registre') + .2, .4);
      const map = tabletShot(c, IMG.orc, t, [[S[5].voStart - .6, 640, 300, 1.25], [S[5].voStart + .2, 640, 170, 1.85]], { draw: withScreen(cc => { fillQuote(cc); if (kReg > 0) { cc.save(); cc.globalAlpha = clamp(kReg * 2); rr(cc, 286, 136, 705, 32, 8); cc.fillStyle = '#FBE9E6'; cc.fill(); txt(cc, '✓  Arquiteto(a) registrado(a) na indicação', 638, 158, 15, '#C2574C', { al: 'center', w: 600 }); cc.restore(); } }) });
      const [ax, ay] = map(566, 151); ring(c, ax, ay, 38, t, Wd(5, 'adicionar') - .1);
      const cp = cursorAt(t, [[Wd(5, 'adicionar') - .5, ax + 200, ay + 120], [Wd(5, 'adicionar') + .2, ax + 6, ay + 4], [S[5].voEnd, ax + 6, ay + 4]]); if (cp) cursor(c, cp[0], cp[1], pr(t, Wd(5, 'registre'), .5));
    }
    // 6 · desconto de urgência
    if (t > tCh[2] + 2.4 && t < S[7].voStart) {
      head(c, t, 'CAPÍTULO 03', 'Desconto', 'de urgência.', S[6].voStart - .3, S[6].voEnd + .4);
      bullet(c, t, 'Cupom único', 'vale por poucas horas', 600, Wd(6, 'cupom') - .2, S[6].voEnd + .4, { icon: 'clock' });
      bullet(c, t, 'Cliente decidido', 'para fechar hoje', 690, Wd(6, 'decidido') - .3, S[6].voEnd + .4, { icon: 'spark' });
      tag(c, t, 'Urgência para fechar hoje', Wd(6, 'use') - .2, S[6].voEnd + .4, { y: 880, bg: C.coral });
      const kOn = pr(t, Wd(6, 'decidido') - .1, .5);
      const map = tabletShot(c, IMG.orc, t, [[S[6].voStart - .6, 1215, 260, 1.25], [S[6].voStart + .2, 1215, 195, 1.8]], { draw: withScreen(cc => { fillQuote(cc); toggleOn(cc, kOn); }) });
      const a = map(1017, 136), b = map(1415, 242); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(6, 'desconto') - .1);
      const [tx, ty] = map(1373, 169); const cp = cursorAt(t, [[Wd(6, 'use') - .4, tx - 160, ty + 140], [Wd(6, 'decidido') - .2, tx, ty], [S[6].voEnd, tx, ty]]); if (cp) cursor(c, cp[0], cp[1], pr(t, Wd(6, 'decidido') - .1, .5));
    }
    // 7 · condições comerciais
    if (t > S[7].voStart - .8 && t < S[8].voStart) {
      head(c, t, 'CAPÍTULO 03', 'Condições', 'comerciais.', S[7].voStart - .3, S[7].voEnd + .4);
      bullet(c, t, 'Canal de atendimento', 'identifica, não registra visita', 590, Wd(7, 'cliente') - .2, S[7].voEnd + .4, { n: '1' });
      bullet(c, t, 'Frete, prazo e validade', 'validade padrão: 7 dias', 680, Wd(7, 'frete') - .2, S[7].voEnd + .4, { n: '2' });
      bullet(c, t, 'Entrega futura?', 'marque a caixa', 770, Wd(7, 'futura') - .4, S[7].voEnd + .4, { n: '3' });
      tag(c, t, 'Canal, frete, prazo e validade', Wd(7, 'condicoes') - .2, S[7].voEnd + .4, { y: 880 });
      const kCk = pr(t, Wd(7, 'futura') + .3, .4);
      const map = tabletShot(c, IMG.condicoes, t, [[S[7].voStart - .6, 1215, 330, 1.25], [S[7].voStart + .4, 1215, 290, 1.7], [Wd(7, 'frete') - .4, 1215, 420, 1.7], [Wd(7, 'futura') - .7, 1215, 470, 1.7]],
        { draw: withScreen(cc => { fillQuote(cc, 1, -104); if (kCk > 0) { rr(cc, 1050, 490, 16, 16, 4); cc.fillStyle = C.navy; cc.fill(); cc.strokeStyle = '#fff'; cc.lineWidth = 2.5; cc.beginPath(); cc.moveTo(1053, 498); cc.lineTo(1057, 502); cc.lineTo(1063, 494); cc.stroke(); } }) });
      const [lx, ly] = map(1078, 280); ring(c, lx, ly, 46, t, Wd(7, 'cliente') - .1);
      let a = map(1035, 308), b = map(1397, 352); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(7, 'isso') - .2, Wd(7, 'frete') - .5);
      [['frete', 1092], ['prazo', 1215], ['validade', 1339]].forEach(([w, x]) => { const [fx, fy] = map(x, 415); ring(c, fx, fy, 50, t, Wd(7, w) - .1); });
      a = map(1037, 476); b = map(1395, 521); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(7, 'futura') - .4);
    }
    // 8 · cartão e pix
    if (t > S[8].voStart - .8 && t < S[9].voStart) {
      head(c, t, 'CAPÍTULO 03', 'Cartão', 'e PIX.', S[8].voStart - .3, S[8].voEnd + .4);
      bullet(c, t, 'Total do orçamento', null, 600, Wd(8, 'total') - .2, S[8].voEnd + .4, { n: '1' });
      bullet(c, t, 'Cartão e PIX', 'lado a lado', 680, Wd(8, 'cartao') - .2, S[8].voEnd + .4, { n: '2' });
      bullet(c, t, 'O cliente vê', 'os mesmos valores no link', 770, Wd(8, 'link') - .4, S[8].voEnd + .4, { n: '3' });
      tag(c, t, 'Cartão e PIX lado a lado', Wd(8, 'cartao') - .2, S[8].voEnd + .4, { y: 880 });
      const map = tabletShot(c, IMG.orc, t, [[S[8].voStart - .6, 760, 700, 1.15], [S[8].voStart + .3, 700, 835, 1.6]], { draw: withScreen(cc => fillQuote(cc)) });
      [['total', 270, 800, 445, 862], ['cartao', 462, 782, 757, 887], ['pix', 767, 782, 1062, 887]].forEach(([w, x0, y0, x1, y1]) => { const a = map(x0, y0), b = map(x1, y1); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(8, w) - .15); });
    }
    // 9 · regra da alçada
    if (t > S[9].voStart - .8 && t < S[10].voStart) {
      head(c, t, 'CAPÍTULO 03', 'Regra', 'da alçada.', S[9].voStart - .3, S[9].voEnd + .4);
      bullet(c, t, 'Nunca passe da sua alçada', null, 600, Wd(9, 'alcada') - .2, S[9].voEnd + .4, { icon: 'shield' });
      bullet(c, t, 'Acompanhe a resposta', 'no próprio orçamento', 680, Wd(9, 'acompanha') - .3, S[9].voEnd + .4, { icon: 'clock' });
      tag(c, t, 'Acima da alçada vai para aprovação', Wd(9, 'pedir') - .2, S[9].voEnd + .4, { y: 880, bg: C.coral });
      alcadaInfo(c, t);
    }
    // 10 · observações
    if (t > S[10].voStart - .8 && t < tCh[3]) {
      head(c, t, 'CAPÍTULO 03', 'Observações', 'para o cliente.', S[10].voStart - .3, S[10].voEnd + .4);
      bullet(c, t, 'Combinado de entrega', null, 600, Wd(10, 'combinado') - .2, S[10].voEnd + .4, { n: '1' });
      bullet(c, t, 'Detalhe do produto', null, 680, Wd(10, 'detalhe') - .2, S[10].voEnd + .4, { n: '2' });
      bullet(c, t, 'Aparece no PDF e no link', null, 760, Wd(10, 'pdf') - .3, S[10].voEnd + .4, { icon: 'doc' });
      tag(c, t, 'Aparece para o cliente', Wd(10, 'pdf') - .2, S[10].voEnd + .4, { y: 880 });
      const map = tabletShot(c, IMG.condicoes, t, [[S[10].voStart - .6, 1215, 560, 1.3], [S[10].voStart + .2, 1215, 660, 1.8]],
        { draw: withScreen(cc => fillQuote(cc, 1, -104) || typed(cc, 'Entrega no sábado, de manhã.', pr(t, Wd(10, 'combinado') - .2, 2.0), 1050, 660, 15, [1040, 637, 352, 66])) });
      const a = map(1017, 565), b = map(1415, 732); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(10, 'observacoes') - .1);
    }
    // 11 · salvar e enviar
    if (t > tCh[3] + 2.4 && t < tCh[4]) {
      head(c, t, 'CAPÍTULO 04', 'Salvar', 'e enviar.', S[11].voStart - .3, S[11].voEnd + .4);
      bullet(c, t, 'Salvar e enviar', 'o cliente recebe o link oficial', 600, Wd(11, 'salvar') - .2, S[11].voEnd + .4, { n: '1' });
      bullet(c, t, 'Paga direto pelo link', null, 690, Wd(11, 'paga') - .3, S[11].voEnd + .4, { n: '2' });
      bullet(c, t, 'Ainda negociando?', 'salve como rascunho', 770, Wd(11, 'negociando') - .3, S[11].voEnd + .4, { icon: 'clock' });
      tag(c, t, 'Salvar e enviar', Wd(11, 'salvar') - .2, S[11].voEnd + .4, { y: 880 });
      const map = tabletShot(c, IMG.orc, t, [[S[11].voStart - .6, 1100, 760, 1.2], [S[11].voStart + .2, 1300, 830, 1.9], [Wd(11, 'link') - .5, 1050, 600, 1.0], [Wd(11, 'rascunho') - .7, 1240, 830, 1.85]], { draw: withScreen(cc => fillQuote(cc)) });
      const [sx2, sy2] = map(1337, 834); ring(c, sx2, sy2, 60, t, Wd(11, 'salvar') - .1);
      const cp = cursorAt(t, [[Wd(11, 'salvar') - .5, sx2 - 220, sy2 - 120], [Wd(11, 'salvar') + .2, sx2, sy2], [Wd(11, 'link') - .5, sx2, sy2]]); if (cp && t < Wd(11, 'link') - .5) cursor(c, cp[0], cp[1], pr(t, Wd(11, 'enviar'), .5));
      const [rx, ry] = map(1169, 834); if (t > Wd(11, 'negociando')) ring(c, rx, ry, 66, t, Wd(11, 'rascunho') - .1);
      linkCard(c, t, Wd(11, 'link') - .3, Wd(11, 'negociando') - .3);
    }
    // 12 · registrar a visita
    if (t > tCh[4] + 2.4 && t < S[13].voStart) {
      head(c, t, 'CAPÍTULO 05', 'Registre', 'a visita.', S[12].voStart - .3, S[12].voEnd + .4);
      bullet(c, t, 'Nome e telefone', null, 600, Wd(12, 'nome') - .2, S[12].voEnd + .4, { n: '1' });
      bullet(c, t, 'O que procurava e como foi', null, 680, Wd(12, 'procurava') - .2, S[12].voEnd + .4, { n: '2' });
      bullet(c, t, 'Gera seus follow-ups', 'nenhum cliente esquecido', 760, Wd(12, 'gera') - .3, S[12].voEnd + .4, { icon: 'spark' });
      tag(c, t, 'Toda visita registrada', Wd(12, 'registre') - .2, S[12].voEnd + .4, { y: 880 });
      const tV = Wd(12, 'registre') + .45;
      if (t < tV) { const map = tabletShot(c, IMG.mais, t, [[S[12].voStart - .7, 720, 421, 1], [S[12].voStart, 1240, 620, 1.7]]); const a = map(1135, 579), b = map(1422, 618); boxHi(c, a[0], a[1], b[0], b[1], t, S[12].voStart + .5);
        const [vx, vy] = map(1288, 598); const cp = cursorAt(t, [[S[12].voStart + .3, vx + 160, vy + 140], [tV - .4, vx, vy]]); if (cp) cursor(c, cp[0], cp[1], pr(t, tV - .35, .4)); }
      else {
        const map = tabletShot(c, IMG.visita, t, [[tV, 720, 300, 1.25], [Wd(12, 'telefone') - .3, 720, 360, 1.4], [Wd(12, 'como') - .4, 720, 620, 1.4], [Wd(12, 'gera') - .3, 760, 700, 1.4]],
          { draw: withScreen(cc => typed(cc, 'Cliente (exemplo)', pr(t, Wd(12, 'nome') - .1, .8), 494, 310, 15, [488, 292, 480, 26])) });
        let a = map(457, 283), b = map(983, 327); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(12, 'nome') - .15, Wd(12, 'telefone') - .2);
        const [fx, fy] = map(585, 382); ring(c, fx, fy, 56, t, Wd(12, 'telefone') - .1);
        a = map(457, 652); b = map(983, 694); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(12, 'como') - .15);
        const [gx, gy] = map(817, 745); ring(c, gx, gy, 60, t, Wd(12, 'gera') - .1);
      }
    }
    // 13 · compras na loja
    if (t > S[13].voStart - .8 && t < S[14].voStart - .2) {
      head(c, t, 'CAPÍTULO 05', 'Compras', 'na Loja.', S[13].voStart - .3, S[13].voEnd + .4);
      bullet(c, t, 'Visitas e vendas da loja', null, 600, Wd(13, 'visitas') - .2, S[13].voEnd + .4, { n: '1' });
      bullet(c, t, 'Filtros: você ou o time', null, 680, Wd(13, 'filtros') - .2, S[13].voEnd + .4, { n: '2' });
      tag(c, t, 'Compras na Loja', Wd(13, 'compras') - .2, S[13].voEnd + .4, { y: 880 });
      const map = tabletShot(c, IMG.compras, t, [[S[13].voStart - .6, 720, 421, 1], [Wd(13, 'visitas') - .3, 720, 260, 1.15], [Wd(13, 'filtros') - .4, 1120, 128, 1.75]]);
      let a = map(96, 169), b = map(1408, 271); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(13, 'visitas') - .1, Wd(13, 'filtros') - .4);
      a = map(950, 111); b = map(1408, 142); boxHi(c, a[0], a[1], b[0], b[1], t, Wd(13, 'filtros') - .1);
    }
    summary(c, t); checklist(c, t);
  }
  if (showStage) heroFX(c);
  renderer.render(scene, camera); if (showStage) c.drawImage(glc, 0, 0);
  // ---- chapter cards ----
  let cardOn = 0; CHAPS.forEach(([n, title], i) => { cardOn = Math.max(cardOn, chapterCard(c, t, n, title, tCh[i])); }); if (cardOn > 0) { c.save(); c.globalAlpha = cardOn; c.drawImage(glc, 0, 0); c.restore(); }
  // ---- b-roll + real tablet hook ----
  if (inBroll || inTab) {
    const aOut = 1 - eio(pr(t, tStage0, .45)); c.save(); c.globalAlpha = aOut;
    if (inBroll) { await drawBroll(c, 'abertura', t, tB0, { speed: .8, dur: 6 });
      const k = ap(t, tB0 + .9, .7); if (k.a > 0) { c.save(); c.globalAlpha *= k.a * (1 - pr(t, tTab0 - .4, .4)); txt(c, 'EPISÓDIO 02', 140, 830, 22, C.coral, { ls: 8 }); txt(c, 'Vender', 136, 910, 76, '#FFFFFF'); c.restore(); } }
    if (inTab) { await drawBroll(c, 'tablet_orc', t, tTab0, { letterbox: .6, dur: 10 }); const a0 = 1 - clamp(pr(t, tTab0, .35)); if (a0 > 0) { c.save(); c.globalAlpha *= a0; await drawBroll(c, 'abertura', t, tB0, { speed: .8 }); c.restore(); }
      [['Produtos', 'produtos'], ['Total', 'total'], ['No cartão', 'cartao'], ['No PIX', 'pix'], ['Link para pagar', 'link']].forEach(([s, w], i) => pill(c, s, 140, 230 + i * 86, 28, i === 3 ? '#1F8A57' : i === 4 ? C.coral : 'rgba(20,27,38,.82)', '#fff', pr(t, Wd(0, w) - .15, .5), { shadow: true }));
      tag(c, t, 'Pronto em menos de 2 minutos', Wd(0, 'menos') - .3, tStage0 + .4, { y: 860, bg: C.ink, size: 32 }); }
    c.restore();
  }
  if (inOpen) { opening(c, t); renderer.render(scene, camera); c.drawImage(glc, 0, 0); const kw = openingText(c, t);
    if (kw > 0) { c.save(); c.beginPath(); c.arc(960, 540, 1200 * kw, 0, Math.PI * 2); c.clip(); await drawBroll(c, 'abertura', t, tB0, { speed: .8 }); c.restore(); } }
  // ---- closing ----
  if (inClose) {
    await drawBroll(c, 'fechamento', t, tClose, { speed: .75, dur: 8 });
    const k = ap(t, tClose + .6, .7); if (k.a > 0) { c.save(); c.globalAlpha = k.a; txt(c, 'PRÓXIMO EPISÓDIO', 140, 760, 22, C.coral, { ls: 8 }); txt(c, '03 · Acompanhar e atender', 136, 850, 72, '#FFFFFF'); txt(c, 'Acompanhar os orçamentos até virar venda', 140, 905, 28, 'rgba(255,255,255,.85)', { w: 600 }); c.restore(); }
    const te = D_ - 5.4; if (t > te) { const ke = eo(pr(t, te, .8)); c.save(); c.globalAlpha = ke; const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0E131C'); g.addColorStop(1, '#1D2A40'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
      renderer.render(scene, camera); c.save(); c.globalAlpha = ke; c.drawImage(glc, 0, 0); c.restore();
      txt(c, 'ZISSOU WORLD ACADEMY', 960, 700, 54, '#FFFFFF', { al: 'center', ls: 12, a: ke }); txt(c, 'PORTAL DO VENDEDOR', 960, 760, 22, 'rgba(255,255,255,.75)', { al: 'center', ls: 10, a: ke }); rise(c, 'Até o próximo episódio!', 960, 860, 34, C.coral, t, te + 1.0, { al: 'center' }); }
  }
  const fi = 1 - eo(pr(t, 0, .6)), fo = eio(pr(t, D_ - 1.1, 1.1)); if (fi > 0 || fo > 0) { c.fillStyle = `rgba(10,14,20,${Math.max(fi, fo)})`; c.fillRect(0, 0, W, H); }
}
async function renderAt(t) { camera.position.set(0, 0, D); camera.lookAt(0, 0, 0); await composite(ctx, t); return 1; }
window.makeCheio = () => { const c = document.createElement('canvas'); c.width = IMG.orc.width; c.height = IMG.orc.height; const g = c.getContext('2d'); g.drawImage(IMG.orc, 0, 0); fillQuote(g); return c.toDataURL('image/png'); };
window.ready = (async () => {
  await document.fonts.load('700 40px Zona'); await document.fonts.load('600 40px Zona');
  CUES = await (await fetch('../cues.json')).json(); SC = CUES.scenes;
  BR.meta = await (await fetch('../out/fr/meta.json')).json().catch(() => ({}));
  IMG.logo = await loadImg('../assets/logo.png');
  { const c = document.createElement('canvas'); c.width = IMG.logo.width; c.height = IMG.logo.height; const g = c.getContext('2d'); g.drawImage(IMG.logo, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#293C4D'; g.fillRect(0, 0, c.width, c.height); IMG.logoN = c; }
  IMG.icon = await loadImg('../assets/icone.png').catch(() => null);
  if (IMG.icon) { const c = document.createElement('canvas'); c.width = IMG.icon.width; c.height = IMG.icon.height; const g = c.getContext('2d'); g.drawImage(IMG.icon, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#E4796F'; g.fillRect(0, 0, c.width, c.height); IMG.iconC = c; }
  for (const k of ['orcamento', 'mais', 'cliente', 'produto', 'condicoes', 'visita', 'compras']) IMG[k] = await loadImg(`../telas/${k}.png`);
  IMG.orc = IMG.orcamento;
  { const c = document.createElement('canvas'); c.width = IMG.orc.width; c.height = IMG.orc.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(IMG.orc, 0, 0);
    const px = (x, y) => { const d = g.getImageData(x, y, 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`; };
    Object.assign(SW, { page: px(600, 420), foot: px(300, 870), card: px(660, 800), pix: px(960, 800) }); }
  const shape = await (await fetch('../assets/icon_shape.json')).json();
  const S = SC, tCh = TCH();
  addIcon(whiteIcon(shape.pts), 960, 400, 2.1, .3, 5.6, { anim: 'spin', z: 3, ry: -.3 });
  addIcon(whiteIcon(shape.pts), 960, 470, 1.5, CUES.duration - 5.4, CUES.duration + 2, { anim: 'spin', z: 3, ry: -.3 });
  const chapIcons = [mQuote(), mPillow(), mTag(), mPlane(), mStore()];
  chapIcons.forEach((m, i) => addIcon(m, 1480, 560, [1.25, 1.3, 1.3, 1.35, 1.1][i], tCh[i] + .25, tCh[i] + 2.6, { anim: i === 0 ? 'spin' : 'swing', z: 3, ry: -.4 }));
  const HX = 830, HY = 850, nxt = i => [2, 4, 6, 11, 12].includes(i + 1) ? tCh[[2, 4, 6, 11, 12].indexOf(i + 1)] - .7 : S[i + 1].voStart - .9;
  const tin = i => [2, 4, 6, 11, 12].includes(i) ? tCh[[2, 4, 6, 11, 12].indexOf(i)] + 2.7 : S[i].voStart - .5;
  const HERO = [[1, mQuote, .95, 'spin'], [2, mPlus, 1.05, 'spin'], [3, mPerson, 1.05, 'beat'], [4, mPillow, .95, 'beat'], [5, mHouse, 1.05, 'beat'], [6, mBolt, 1.05, 'beat'], [7, mTruck, .85, 'beat'],
    [8, mCard, .95, 'beat'], [9, mShield, 1.05, 'beat'], [10, mQuotes, 1.05, 'beat'], [11, mPlane, 1.0, 'beat'], [12, mStore, .78, 'beat'], [13, mFunnel, 1.0, 'beat']];
  for (const [i, mk, sc, anim] of HERO) { const p = (HPOS[i] || [HX, HY]); addIcon(mk(), p[0], p[1], sc, i === 1 ? tin(1) + .4 : tin(i), i === 13 ? S[14].voStart - 1.0 : nxt(i), { anim, z: 2.4, ry: .45, hero: true, r: p[2] || 1 }); }
  renderer.compile(scene, camera);
  return true;
})();
window.renderAt = renderAt;
