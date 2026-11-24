// Avatar Marcio — "Quem ainda não fechou?" — horizontal 1920x1080, cinematográfico. Tubetes terracota 3D, frases no fundo, ícones 3D, ícone Zissou na abertura.
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

// ---------- models ----------
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

function mCalendar(mon = 'DEZ', day = '12') {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(2.2, 2.3, .34, 4, .1), M.white));
  g.add(mesh(new RoundedBoxGeometry(2.2, .62, .36, 4, .1), M.coral, 0, .84, .01));
  for (const x of [-.55, .55]) { const r = mesh(new THREE.TorusGeometry(.16, .05, 14, 32), M.navy, x, 1.17, 0); g.add(r); }
  const tex = canvasTex(512, 512, x => { x.fillStyle = '#ffffff'; x.font = '700 70px Zona'; x.textAlign = 'center'; x.fillText(mon, 256, 100); x.fillStyle = '#141B26'; x.font = '700 250px Zona'; x.fillText(day, 256, 400); });
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



// ---------- THREE ----------
const renderer = new THREE.WebGLRenderer({ canvas: glc, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0, 0);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const pmrem = new THREE.PMREMGenerator(renderer);
const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const D = 20;
const camera = new THREE.PerspectiveCamera(2 * Math.atan(5.4 / D) * 180 / Math.PI, W / H, .5, 200);
const bgScene = new THREE.Scene(); bgScene.environment = ENV; bgScene.environmentIntensity = .5; bgScene.fog = new THREE.Fog(0x1A0607, 24, 50);
const nearScene = new THREE.Scene(); nearScene.environment = ENV; nearScene.environmentIntensity = .5;
const fgScene = new THREE.Scene(); fgScene.environment = ENV; fgScene.environmentIntensity = .8;
{ const k = new THREE.DirectionalLight(0xffffff, 1.6); k.position.set(-6, 10, 12); fgScene.add(k); fgScene.add(new THREE.HemisphereLight(0xfff4ea, 0x2a1810, .8));
  const r = new THREE.DirectionalLight(0xE4796F, 1.2); r.position.set(8, 3, -6); fgScene.add(r); }
for (const sc of [bgScene, nearScene]) { const k = new THREE.DirectionalLight(0xfff0e6, 1.25); k.position.set(-4, 6, 14); sc.add(k); sc.add(new THREE.HemisphereLight(0xffd8cc, 0x1a0607, .45)); }
const WALLGLOW = new THREE.PointLight(0xffb49a, 0, 9, 1.5); bgScene.add(WALLGLOW);
const toU = px => px / 100;
const sp = (px, py, z = 0) => V(toU(px - W / 2), -toU(py - H / 2), z);
const TUBES = [];
const TERRA = [0x7E1A1E, 0x8A1F23, 0x942327, 0x861C21, 0x9A2629, 0x821C20];
function tube(scene, x, z, r, col, row) {
  const mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: .78, sheen: .5, sheenRoughness: .6, sheenColor: new THREE.Color(0xff8a7a) });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 30, 64), mat); m.position.set(x, 0, z); scene.add(m);
  TUBES.push({ m, row, x0: x, ph: Math.random() * 6.28 }); return m;
}
function buildTubes() {
  let a = 4242; const rnd = () => (a = (a * 16807) % 2147483647) / 2147483647;
  // store-like wall of terracotta tubes, two depths
  // dense wall of matte red tubes touching each other, like the store
  for (let x = -21; x < 21; x += .9) tube(bgScene, x, -6, .46, TERRA[Math.floor(rnd() * TERRA.length)], 0);
  // out-of-focus foreground tubes at the frame edges
  tube(nearScene, -9.6, 9, .55, 0x861C21, 2); tube(nearScene, 8.3, 10, .5, 0x7E1A1E, 2);
}
function updTubes(t) { for (const tb of TUBES) tb.m.position.x = tb.x0 + Math.sin(t * .05) * 0; }
function mPhone() {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(1.25, 2.4, .16, 6, .2), M.navy));
  const scr = canvasTex(256, 480, x => { const gr = x.createLinearGradient(0, 0, 0, 480); gr.addColorStop(0, '#2b4a78'); gr.addColorStop(1, '#14233b'); x.fillStyle = gr; x.fillRect(0, 0, 256, 480);
    x.fillStyle = '#E4796F'; x.beginPath(); x.arc(128, 330, 46, 0, Math.PI * 2); x.fill(); x.fillStyle = '#fff'; x.font = '700 38px Zona'; x.textAlign = 'center'; x.fillText('Cliente', 128, 150); x.font = '600 26px Zona'; x.fillStyle = '#9AABC6'; x.fillText('chamando...', 128, 195);
    x.strokeStyle = '#fff'; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.arc(128, 330, 20, Math.PI * .8, Math.PI * 1.7); x.stroke(); });
  g.add(mesh(new THREE.PlaneGeometry(1.08, 2.2), new THREE.MeshBasicMaterial({ map: scr }), 0, 0, .085));
  const waves = new THREE.Group(); waves.position.set(.8, .9, .1);
  for (let i = 0; i < 2; i++) { const w = mesh(new THREE.TorusGeometry(.28 + i * .22, .05, 12, 32, Math.PI / 2), M.coral); w.rotation.z = -Math.PI / 4 + .3; waves.add(w); }
  g.add(waves); g.userData.waves = waves;
  return sh(g);
}

const ICONS = [];
function addIcon(model, x, y, scale, tIn, tOut, o = {}) { const grp = new THREE.Group(); grp.add(model); fgScene.add(grp); ICONS.push({ model, grp, x, y, scale, tIn, tOut, o }); }
let ZICON;
const HX = 430, HY = 290;
function build(iconPts) {
  buildTubes();
  const S = SC;
  ZICON = mIcon(iconPts); ZICON.traverse(o => { if (o.isMesh) o.material = new THREE.MeshPhysicalMaterial({ color: 0xFFF6EE, roughness: .35, emissive: 0xFFE8DA, emissiveIntensity: .35, clearcoat: .3 }); });
  const zg = new THREE.Group(); zg.add(ZICON); fgScene.add(zg); ZICON.userData.grp = zg;
  addIcon(mQuote(), HX, HY, .9, S[0].voStart - .4, S[1].voEnd + .2, { anim: 'stamp' });
  addIcon(mStore(), HX, HY + 10, .62, S[2].voStart - .3, S[2].voEnd + .2, {});
  addIcon(mBubbles(), HX, HY, .82, S[3].voStart - .3, S[3].voEnd + .2, { anim: 'swing' });
  addIcon(mCalendar('NOV', '27'), HX, HY, .85, Wd(4, 'sexta') - .4, S[4].voEnd + .2, { anim: 'swing' });
  addIcon(mStar(), HX, HY, .85, S[5].voStart - .3, S[5].voEnd + .2, { anim: 'beat' });
  addIcon(mPhone(), HX, HY + 10, .95, Wd(6, 'abre') - .4, S[6].voEnd + .2, { anim: 'ring' });
  addIcon(mTeam(), HX, HY + 20, .8, S[7].voStart - .3, S[7].voEnd + .2, {});
  addIcon(mTrophy(), HX, HY, .9, S[8].voStart - .3, CUES.duration + 1, { anim: 'spin' });
}
function upd3D(t) {
  for (const ic of ICONS) {
    const vis = t > ic.tIn - .1 && t < ic.tOut + .6; ic.grp.visible = vis; if (!vis) continue;
    const kin = pr(t, ic.tIn, 1.0), kout = eio(pr(t, ic.tOut, .5)), k = backO(kin) * (1 - kout);
    const bob = Math.sin(t * 1.5 + ic.x * .01) * .1, lt = t - ic.tIn - 1.0;
    ic.grp.position.copy(sp(ic.x, ic.y, 2)).add(V(0, bob - (1 - eo(kin)) * 1.2 + kout * .7, 0));
    let ey = 0, ez = 0, sc = 1;
    if (ic.o.anim === 'spin' && lt > 0) { const ph = (lt % 3.6) / 3.6; ey = Math.PI * 2 * eio(pr(ph, .6, .3)); }
    if (ic.o.anim === 'swing') ez = Math.sin(t * 2.2) * .16;
    if (ic.o.anim === 'beat' && lt > 0) sc = 1 + .1 * Math.pow(Math.max(0, Math.sin(t * 3.4)), 10);
    if (ic.o.anim === 'ring' && lt > 0) ez = Math.sin(t * 38) * .06 * (Math.sin(t * 2.2) > .2 ? 1 : 0);
    const ud = ic.model.userData;
    if (ud.badge && lt > 0) { const ph = lt % 2.6, pk = pr(ph, 0, .5); ud.badge.scale.setScalar(1 + .35 * Math.sin(Math.PI * pk)); }
    ic.grp.scale.setScalar(Math.max(.001, ic.scale * k * sc));
    ic.grp.rotation.set(.1 + Math.sin(t * .9) * .07, .42 + Math.sin(t * .6 + ic.y) * .22 + (1 - eo(kin)) * Math.PI * 2 + ey + kout * 2, Math.sin(t * .8) * .04 + ez);
  }
  // Zissou icon: hero in the opening, then a small brand mark top-left
  const zg = ZICON.userData.grp, ki = backO(pr(t, .25, 1.3)), km = eio(pr(t, 2.35, .9));
  const big = 2.3 * ki, small = .34;
  const px = lerp(960, 132, km), py = lerp(520, 96, km);
  zg.position.copy(sp(px, py, lerp(3, 0, km)));
  zg.scale.setScalar(Math.max(.001, lerp(big, small, km)));
  const wp = sp(px, py, -5.2); WALLGLOW.position.copy(wp); WALLGLOW.intensity = 90 * ki * Math.pow(1 - km, 2) + 8 * km;
  const lt = t - 3.4; const spin = lt > 0 ? Math.PI * 2 * eio(pr((lt % 6) / 6, .7, .25)) : 0;
  zg.rotation.set(.12 + Math.sin(t * .8) * .06 * (1 - km), lerp(-.5 + (1 - eo(pr(t, .25, 1.6))) * Math.PI * 2 + Math.sin(t * .7) * .15, -.25, km) + spin, 0);
}
// ---------- avatar frames ----------
const AV = { fps: 25, n: 0, off: 2.9, dir: '../out/frames/', cache: new Map() };
async function avatarFrame(t) {
  const i = clamp(Math.round((t - AV.off) * AV.fps), 0, AV.n - 1) + 1;
  if (AV.cache.has(i)) return AV.cache.get(i);
  const img = await loadImg(AV.dir + String(i).padStart(5, '0') + '.webp'); AV.cache.clear(); AV.cache.set(i, img); return img;
}
// framing: slow push-ins on the intimate beats (anchor on the face)
function avZoom(t) {
  const S = SC;
  let z = 1 + .02 * pr(t, 3, 60);
  z += .09 * eio(pr(t, Wd(1, 'pensou') - .2, .5)) * (1 - eio(pr(t, S[2].voStart - .3, .9)));
  z += .13 * eio(pr(t, S[5].voStart - .4, 6)) * (1 - eio(pr(t, S[6].voStart - .4, 1.0)));
  z += .06 * eio(pr(t, S[8].voStart - .3, 3));
  return z;
}
// the reference photo had its shoulders extended; let them fall into shadow (low-key light)
const AVC = document.createElement('canvas'); AVC.width = W; AVC.height = H; const avx = AVC.getContext('2d');
let TRACK = null;
function shoulderMask(img, t) {
  const p = TRACK ? TRACK.c[clamp(Math.round((t - AV.off) * AV.fps), 0, TRACK.c.length - 1)] : [1330, 60];
  const cx = p[0], top = p[1];
  avx.globalCompositeOperation = 'source-over'; avx.clearRect(0, 0, W, H); avx.drawImage(img, 0, 0, W, H);
  avx.globalCompositeOperation = 'destination-out';
  const IN = 285, OUT = 480, y0 = top + 590, y1 = top + 760;
  for (let y = y0; y < H; y += 8) {
    const v = clamp((y - y0) / (y1 - y0));
    for (const sd of [-1, 1]) {
      const xi = cx + sd * IN, xo = cx + sd * OUT;
      const g = avx.createLinearGradient(xi, 0, xo, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${v})`);
      avx.fillStyle = g; avx.fillRect(Math.min(xi, xo), y, Math.abs(xo - xi), 8);
      avx.fillStyle = `rgba(0,0,0,${v})`; if (sd < 0) avx.fillRect(0, y, xo, 8); else avx.fillRect(xo, y, W - xo, 8);
    }
  }
  // darken what is left of the outer shoulders so they sink into the shadow
  avx.globalCompositeOperation = 'source-atop';
  for (let y = top + 480; y < H; y += 6) { const v = clamp((y - top - 480) / 220);
    for (const sd of [-1, 1]) { const g = avx.createLinearGradient(cx + sd * 150, 0, cx + sd * OUT, 0); g.addColorStop(0, 'rgba(20,4,5,0)'); g.addColorStop(1, `rgba(20,4,5,${.85 * v})`);
      avx.fillStyle = g; avx.fillRect(sd < 0 ? 0 : cx + 150, y, sd < 0 ? cx - 150 : W, 6); } }
  avx.globalCompositeOperation = 'source-over';
}
// ---------- 2D ----------
const GRAIN = [];
function makeGrain() { for (let k = 0; k < 4; k++) { const c = document.createElement('canvas'); c.width = 480; c.height = 270; const g = c.getContext('2d'), im = g.createImageData(480, 270);
  for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (Math.random() - .5) * 120; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); GRAIN.push(c); } }
function drawBase(c, t) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2A0A0C'); g.addColorStop(1, '#1A0607'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
const XL = 140, HL = '#FFC1B2';
// a statement: rows [text, color, startTime?]; leaves at t1
function statement(c, t, rows, t0, t1, o = {}) {
  if (t < t0 - .1 || t > t1 + .6) return;
  let size = o.size || 78; const mw = Math.max(...rows.map(([s]) => tw(c, s, size))); if (mw > (o.maxw || 760)) size *= (o.maxw || 760) / mw;
  const lh = size * 1.1, y0 = (o.y || 690) - (rows.length - 1) * lh / 2;
  rows.forEach(([s, col, ts], j) => {
    const tr = (ts ?? t0 + j * .1) - .15 + (o.delay ?? .2), y = y0 + j * lh, hi = col === HL;
    if (hi) { const k = eo5(pr(t, tr, .6)), ko = eio(pr(t, t1 - .35, .4)); if (k > 0 && ko < 1) { const w = tw(c, s, size) + 36;
      c.save(); c.globalAlpha = clamp(k * 1.4) * (1 - ko); rr(c, XL - 18, y - size * .86 + (1 - k) * size * .6 - ko * size * .4, w, size * 1.12, 12); c.fillStyle = '#F7EDE6'; c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 20; c.shadowOffsetY = 6; c.fill(); c.restore(); } }
    c.save(); if (!hi) { c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 18; c.shadowOffsetY = 3; }
    rise(c, s, XL, y, size, hi ? '#7E1A1E' : '#FFFFFF', t, tr, { out: t1 - .35, d: .6 }); c.restore(); });
}
function marquee(c, t, text, t0, t1, y, o = {}) {
  const a = clamp(pr(t, t0, .8)) * (1 - pr(t, t1, .6)); if (a <= 0) return;
  const size = o.size || 210; c.save(); c.globalAlpha = a * .9; c.font = font(size, 700); c.letterSpacing = '4px';
  const unit = text + '    ', w = c.measureText(unit).width, off = ((t - t0) * (o.speed || 70)) % w;
  c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,205,195,.30)'; c.fillStyle = 'rgba(255,190,180,.05)';
  for (let x = -off - w; x < W + w; x += w) { c.fillText(unit, x, y); c.strokeText(unit, x, y); }
  c.restore();
}
function backPhrases(c, t) {
  const S = SC, Y = 1010;
  marquee(c, t, 'ORÇAMENTO  ·  CLIENTE  ·  CONVERSA  ·', S[0].voStart - .3, S[1].voEnd + .3, Y);
  marquee(c, t, 'O QUE FALTA?  ·  O QUE FALTA?  ·', S[2].voStart - .3, S[3].voEnd + .3, Y);
  marquee(c, t, 'BLACK ZISSOU  ·  SEXTA 27/11  ·', S[4].voStart - .3, S[4].voEnd + .3, Y, { speed: 110 });
  marquee(c, t, 'SONHO  ·  VIAGEM  ·  CONQUISTA  ·', S[5].voStart - .3, S[5].voEnd + .3, Y, { speed: 50 });
  marquee(c, t, '5 CLIENTES  ·  RETOME AGORA  ·', S[6].voStart - .3, S[7].voEnd + .3, Y, { speed: 100 });
  marquee(c, t, 'BORA VENDER  ·  BORA VENDER  ·', S[8].voStart - .3, CUES.duration, Y, { speed: 110 });
}
function statements(c, t) {
  const S = SC, I = '#FFFFFF', K = HL;
  statement(c, t, [['Quem recebeu', I], ['um orçamento seu', I], ['e ainda não fechou?', K]], S[0].voStart - .1, S[1].voStart - .1);
  statement(c, t, [['Pensou em alguém?', I], ['Esse vídeo', I, Wd(1, 'entao')], ['é pra você.', K, Wd(1, 'entao') + .1]], Wd(1, 'pensou'), S[1].voEnd + .25);
  statement(c, t, [['Foi à loja.', I, Wd(2, 'loja') - .2], ['Experimentou.', I, Wd(2, 'experimentou')], ['Gostou.', I, Wd(2, 'gostou')]], Wd(2, 'loja') - .2, Wd(2, 'mas') - .2);
  statement(c, t, [['Mas alguma coisa', I], ['ficou faltando.', K]], Wd(2, 'mas') - .1, S[2].voEnd + .3);
  statement(c, t, [['Não espere só', I], ['a resposta.', I]], S[3].voStart - .1, Wd(3, 'precisa') - .2);
  statement(c, t, [['Faça mais', I], ['uma pergunta:', I], ['“O que falta pra gente', K], ['resolver isso juntos?”', K]], Wd(3, 'precisa') - .1, S[3].voEnd + .4, { size: 70 });
  statement(c, t, [['Hoje é quarta.', I]], S[4].voStart - .1, Wd(4, 'sexta') - .3, { size: 96 });
  statement(c, t, [['A sexta de Black', I], ['está chegando.', K]], Wd(4, 'sexta') - .2, Wd(4, 'conversas') - .3);
  statement(c, t, [['As conversas', I], ['precisam acontecer', I], ['agora.', K]], Wd(4, 'conversas') - .2, S[4].voEnd + .3);
  statement(c, t, [['Pense no', I], ['seu sonho.', K]], S[5].voStart - .1, Wd(5, 'viagem') - .3, { size: 96 });
  statement(c, t, [['A viagem.', I, Wd(5, 'viagem')], ['A conquista.', I, Wd(5, 'conquista')], ['O plano.', I, Wd(5, 'plano')]], Wd(5, 'viagem') - .1, Wd(5, 'voce') - .3, { size: 84 });
  statement(c, t, [['Você tem', I], ['um motivo.', I], ['Lembre dele.', K, Wd(5, 'lembra')]], Wd(5, 'voce') - .1, S[5].voEnd + .3);
  statement(c, t, [['Vontade vira', I], ['atitude.', K]], S[6].voStart - .1, Wd(6, 'abre') - .3, { size: 90 });
  statement(c, t, [['Abra sua', I], ['carteira.', K]], Wd(6, 'abre') - .2, Wd(6, 'cinco') - .3, { size: 90 });
  const t5 = Wd(6, 'cinco') - .2;
  if (t > t5 - .1 && t < Wd(6, 'mostra') + .3) { const k = pr(t, t5, .6), ko = eio(pr(t, Wd(6, 'mostra') - .3, .4));
    c.save(); c.globalAlpha = clamp(k * 2) * (1 - ko); num(c, 5, k, XL - 8, 760, 300, '#F7EDE6', { static: true }); c.restore();
    rise(c, 'clientes.', XL + 200, 700, 72, '#FFFFFF', t, t5 + .2, { out: Wd(6, 'mostra') - .3 }); rise(c, 'Retome hoje.', XL + 200, 780, 56, '#F3D9CF', t, Wd(6, 'retoma') - .2, { out: Wd(6, 'mostra') - .3 }); }
  statement(c, t, [['Lembre.', I, Wd(6, 'lembra')], ['Escute.', I, Wd(6, 'escuta')], ['Resolva.', K, Wd(6, 'solucao') - .3]], Wd(6, 'mostra') - .1, S[6].voEnd + .3, { size: 90 });
  statement(c, t, [['Precisou de ajuda?', I], ['Chama!', K, Wd(7, 'chama')]], S[7].voStart - .1, Wd(7, 'vamos') - .3);
  statement(c, t, [['Vamos construir', I], ['essas vendas', I], ['juntos.', K]], Wd(7, 'vamos') - .2, S[7].voEnd + .3);
  statement(c, t, [['Comemorar resultado.', I], ['Realizar sonhos.', K]], S[8].voStart - .1, Wd(8, 'bora') - .3, { size: 68 });
  statement(c, t, [['Bora vender,', I], ['time!', K]], Wd(8, 'bora') - .2, CUES.duration + 2, { size: 120 });
}
function grade(c, t) {
  // floor falloff (cinematic), vignette, warm grade, grain
  let g = c.createLinearGradient(0, 760, 0, H); g.addColorStop(0, 'rgba(12,7,5,0)'); g.addColorStop(1, 'rgba(12,7,5,.62)'); c.fillStyle = g; c.fillRect(0, 760, W, H - 760);
  g = c.createRadialGradient(W * .55, H * .45, H * .35, W * .55, H * .45, H * 1.05); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(6,3,2,.55)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.globalCompositeOperation = 'soft-light'; c.fillStyle = 'rgba(255,150,120,.06)'; c.fillRect(0, 0, W, H); c.restore();
  c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = .07; c.drawImage(GRAIN[Math.floor(t * 24) % 4], 0, 0, W, H); c.restore();
}
function sweep(c, t) {
  // light sweep across the hero icon in the opening
  const k = pr(t, .9, 1.1); if (k <= 0 || k >= 1) return;
  const x = lerp(560, 1360, eio(k)); c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createLinearGradient(x - 120, 0, x + 120, 0); g.addColorStop(0, 'rgba(255,220,200,0)'); g.addColorStop(.5, 'rgba(255,220,200,.22)'); g.addColorStop(1, 'rgba(255,220,200,0)');
  c.translate(960, 520); c.rotate(.35); c.translate(-960, -520); c.fillStyle = g; c.fillRect(0, 200, W, 640); c.restore();
}
async function composite(c, t) {
  drawBase(c, t);
  const dolly = Math.sin(t * .09) * .9, cy = Math.cos(t * .11) * .12;
  camera.position.set(dolly, cy, D); camera.lookAt(dolly * .5, cy * .3, 0);
  const tubeIn = eo(pr(t, 0, 1.6));
  upd3D(t);
  renderer.render(bgScene, camera); c.save(); c.globalAlpha = tubeIn; c.filter = 'blur(1.2px)'; c.drawImage(glc, 0, 0); c.restore();
  // dim the wall slightly behind the left text column for legibility
  let g = c.createLinearGradient(0, 0, 1080, 0); g.addColorStop(0, 'rgba(18,3,4,.86)'); g.addColorStop(.55, 'rgba(18,3,4,.62)'); g.addColorStop(1, 'rgba(18,3,4,0)'); c.fillStyle = g; c.fillRect(0, 0, 900, H);
  // warm key glow behind the person
  g = c.createRadialGradient(1330, 470, 0, 1330, 470, 650); g.addColorStop(0, 'rgba(255,150,130,.16)'); g.addColorStop(1, 'rgba(255,150,130,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  backPhrases(c, t);
  statements(c, t);
  if (AV.n && t > AV.off) { const img = await avatarFrame(t), z = avZoom(t), ax = 1330, ay = 560, a = eo(pr(t, AV.off + .1, .6));
    shoulderMask(img, t);
    c.save(); c.globalAlpha = a; c.translate(ax, ay); c.scale(z, z); c.translate(-ax, -ay + (1 - a) * 30); c.drawImage(AVC, 0, 0, W, H); c.restore(); }
  renderer.render(fgScene, camera); c.drawImage(glc, 0, 0);
  sweep(c, t);
  { const k = ap(t, 3.0, .6); if (k.a > 0) txt(c, 'BLACK ZISSOU  ·  RETOME SEUS CLIENTES', 210, 104, 20, 'rgba(255,240,234,.9)', { ls: 6, a: k.a }); }
  const lk = eo(pr(t, Wd(8, 'time') + .2, .8)); if (lk > 0) { const lw = 230, lh = lw * IMG.logo.height / IMG.logo.width; c.save(); c.globalAlpha = lk; c.drawImage(IMG.logoN, XL, 880 + 10 * (1 - lk), lw, lh); c.restore(); }
  renderer.render(nearScene, camera); c.save(); c.filter = 'blur(16px)'; c.globalAlpha = .95; c.drawImage(glc, 0, 0); c.restore();
  grade(c, t);
  const fi = 1 - eo(pr(t, 0, .6)), fo = eio(pr(t, CUES.duration - .6, .6));
  if (fi > 0 || fo > 0) { c.fillStyle = `rgba(10,6,4,${Math.max(fi, fo)})`; c.fillRect(0, 0, W, H); }
}
async function renderAt(t) { await composite(ctx, t); return 1; }
window.ready = (async () => {
  await document.fonts.load('700 40px Zona'); await document.fonts.load('600 40px Zona');
  CUES = await (await fetch('../cues.json')).json(); SC = CUES.scenes;
  const meta = await (await fetch('../out/frames/meta.json')).json().catch(() => null);
  if (meta) { AV.n = meta.n; AV.fps = meta.fps; }
  const off = await (await fetch('../audio/vo_offset.json')).json().catch(() => null); if (off) AV.off = off.offset;
  IMG.logo = await loadImg('../assets/logo.png');
  { const c = document.createElement('canvas'); c.width = IMG.logo.width; c.height = IMG.logo.height; const g = c.getContext('2d'); g.drawImage(IMG.logo, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#F6F3EE'; g.fillRect(0, 0, c.width, c.height); IMG.logoN = c; }
  makeGrain();
  TRACK = await (await fetch('../out/frames/track.json')).json().catch(() => null);
  const shape = await (await fetch('../assets/icon_shape.json')).json();
  build(shape.pts);
  renderer.compile(fgScene, camera); renderer.compile(bgScene, camera); renderer.compile(nearScene, camera);
  return true;
})();
window.renderAt = renderAt;
