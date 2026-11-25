// Stories "4 milhões" — vertical 1080x1920. Marcio com megafone, festa: parede de tubetes vermelhos, luzes, contador e confete.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1080, H = 1920;
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


// ---------- THREE: fundo de tubetes (bg) e ícones (fg) ----------
const renderer = new THREE.WebGLRenderer({ canvas: glc, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0, 0);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const pmrem = new THREE.PMREMGenerator(renderer);
const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const D = 20;
const camera = new THREE.PerspectiveCamera(2 * Math.atan(9.6 / D) * 180 / Math.PI, W / H, .5, 200);
const bgScene = new THREE.Scene(); bgScene.environment = ENV; bgScene.environmentIntensity = .5; bgScene.fog = new THREE.Fog(0x1A0607, 24, 50);
const fgScene = new THREE.Scene(); fgScene.environment = ENV; fgScene.environmentIntensity = .8;
{ const k = new THREE.DirectionalLight(0xffffff, 1.6); k.position.set(-6, 10, 12); fgScene.add(k); fgScene.add(new THREE.HemisphereLight(0xffffff, 0x1a2230, .85));
  const r = new THREE.DirectionalLight(0xE4796F, 1.3); r.position.set(8, 3, -6); fgScene.add(r); }
{ const k = new THREE.DirectionalLight(0xfff0e6, 1.25); k.position.set(-4, 6, 14); bgScene.add(k); bgScene.add(new THREE.HemisphereLight(0xffd8cc, 0x1a0607, .45)); }
const PARTY = [0xFFC48A, 0xFF7A6E, 0xFFFFFF].map((c, i) => { const l = new THREE.PointLight(c, 0, 14, 1.4); bgScene.add(l); return l; });
const toU = px => px / 100;
const sp = (px, py, z = 0) => V(toU(px - W / 2), -toU(py - H / 2), z);
const TUBES = [];
function buildTubes() {
  const cols = [0x7E1A1E, 0x8A1F23, 0x942327, 0x861C21, 0x9A2629, 0x821C20];
  let a = 777; const rnd = () => (a = (a * 16807) % 2147483647) / 2147483647;
  for (let x = -14; x < 14; x += .9) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, 40, 64), new THREE.MeshPhysicalMaterial({ color: cols[Math.floor(rnd() * cols.length)], roughness: .78, sheen: .5, sheenRoughness: .6, sheenColor: new THREE.Color(0xff8a7a) }));
    m.position.set(x, 0, -6); bgScene.add(m); TUBES.push({ m, ph: rnd() * 6.28, row: 0, x0: x });
  }
}
function updTubes(t) {}
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
function mMegaphone() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const inner = new THREE.MeshPhysicalMaterial({ color: 0x8a3b35, roughness: .6, side: THREE.BackSide });
  const cone = new THREE.CylinderGeometry(1.0, .32, 2.0, 48, 1, true); cone.rotateZ(-Math.PI / 2);
  body.add(new THREE.Mesh(cone, new THREE.MeshPhysicalMaterial({ color: 0xE4796F, roughness: .35, clearcoat: .5, side: THREE.FrontSide })));
  body.add(new THREE.Mesh(cone.clone(), inner));
  const rim = mesh(new THREE.TorusGeometry(1.0, .09, 16, 56), M.white, 1.0, 0, 0); rim.rotation.y = Math.PI / 2; body.add(rim);
  const back = mesh(new THREE.CylinderGeometry(.36, .36, .5, 32).rotateZ(Math.PI / 2), M.navy, -1.2, 0, 0); body.add(back);
  body.add(mesh(new THREE.CylinderGeometry(.22, .26, .25, 24).rotateZ(Math.PI / 2), M.white, -1.55, 0, 0));
  const handle = mesh(new RoundedBoxGeometry(.3, .9, .3, 3, .08), M.navy, -.6, -.75, 0); handle.rotation.z = .25; body.add(handle);
  body.add(mesh(new RoundedBoxGeometry(.18, .12, .32, 2, .04), M.white, -.48, -.33, 0));
  return sh(g);
}
const ICONS = [];
function addIcon(model, x, y, scale, tIn, tOut, o = {}) { const grp = new THREE.Group(); grp.add(model); fgScene.add(grp); ICONS.push({ model, grp, x, y, scale, tIn, tOut, o }); }
let MEGA, TRACK = null;
function build(iconPts) {
  buildTubes();
  MEGA = mMegaphone(); const mg = new THREE.Group(); mg.add(MEGA); fgScene.add(mg); MEGA.userData.grp = mg; mg.visible = false;
  const z = mIcon(iconPts); z.traverse(o => { if (o.isMesh) o.material = new THREE.MeshPhysicalMaterial({ color: 0xFFF6EE, roughness: .35, emissive: 0xFFE8DA, emissiveIntensity: .35, clearcoat: .3 }); });
  addIcon(z, 540, 235, .45, .1, 99, { anim: 'spin', front: true });
  const tM = Wd(0, 'milhoes') - .15, tc = Wd(1, 'cura') - .2;
  addIcon(mTrophy(), 170, 990, .78, tM, 99, { anim: 'spin' });
  addIcon(mBag(), 915, 1010, .7, tM + .12, 99, { anim: 'swing' });
  addIcon(mHeart(), 905, 720, .55, tc, 99, { anim: 'beat' });
}
function upd3D(t) {
  for (const ic of ICONS) {
    const vis = t > ic.tIn - .1 && t < ic.tOut + .6; ic.grp.visible = vis; if (!vis) continue;
    const kin = pr(t, ic.tIn, 1.0), kout = eio(pr(t, ic.tOut, .55)), k = backO(kin) * (1 - kout);
    const bob = Math.sin(t * 1.7 + ic.x) * .12, lt = t - ic.tIn - 1.0;
    ic.grp.position.copy(sp(ic.x, ic.y, 3)).add(V(0, bob - (1 - eo(kin)) * 1.4 + kout * .8, 0));
    let ey = 0, ez = 0, sc = 1;
    if (ic.o.anim === 'spin' && lt > 0) { const ph = (lt % 3.6) / 3.6; ey = Math.PI * 2 * eio(pr(ph, .6, .3)); }
    if (ic.o.anim === 'swing') ez = Math.sin(t * 2.4) * .2;
    if (ic.o.anim === 'beat' && lt > 0) sc = 1 + .12 * Math.pow(Math.max(0, Math.sin(t * 3.6)), 10);
    if (ic.o.anim === 'ring' && lt > 0) { ez = Math.sin(t * 38) * .07 * (Math.sin(t * 2.2) > .2 ? 1 : 0); const w = ic.model.userData.waves; if (w) w.children.forEach((c, i) => { c.material = M.coral; c.scale.setScalar(1 + .15 * Math.sin(t * 6 - i)); }); }
    const s = Math.max(.001, ic.scale * k * sc);
    ic.grp.scale.setScalar(s);
    ic.grp.rotation.set(.1 + Math.sin(t * .9 + ic.x) * .08, (ic.x > W / 2 ? -.45 : .45) + Math.sin(t * .7 + ic.y) * .25 + (1 - eo(kin)) * Math.PI * 2 + ey + kout * 2, Math.sin(t * .8) * .05 + ez);
  }
  // megaphone at the mouth
  const mg = MEGA.userData.grp, t0 = .15;
  mg.visible = t > t0; if (mg.visible) {
    const m = mouthAt(t), k = backO(pr(t, t0, .5)), shake = pr(t, t0 + .4, .2) > 0 ? Math.sin(t * 60) * .03 : 0;
    // bell opens to the upper right, mouthpiece at the lips
    const ang = .42; const L = 1.38 * 1.15;
    mg.position.copy(sp(m[0], m[1], 4)).add(V(Math.cos(ang) * L + shake, Math.sin(ang) * L * .6, 0));
    mg.rotation.set(0, -.35, ang * .6 + shake);
    mg.scale.setScalar(Math.max(.001, 1.15 * k));
  }
}
function avZoom(t) { const b1 = Math.sin(Math.PI * pr(t, Wd(0, 'milhoes') - .05, .35)), b2 = Math.sin(Math.PI * pr(t, Wd(1, 'cura') - .05, .35)); return 1 + .02 * pr(t, 0, 8) + .03 * (b1 + b2); }
function mouthAt(t) {
  const p = TRACK ? TRACK.m[clamp(Math.round(t * TRACK.fps), 0, TRACK.m.length - 1)] : [540, 1480], z = avZoom(t);
  return [W / 2 + (p[0] - W / 2) * z, H - (H - p[1]) * z];
}
// ---------- avatar frames (HeyGen, fundo removido) ----------
const AV = { fps: 25, n: 0, dir: '../out/frames/', cache: new Map() };
async function avatarFrame(t) {
  const i = clamp(Math.round(t * AV.fps), 0, AV.n - 1) + 1;
  if (AV.cache.has(i)) return AV.cache.get(i);
  const img = await loadImg(AV.dir + String(i).padStart(5, '0') + '.webp');
  AV.cache.clear(); AV.cache.set(i, img); return img;
}
// ---------- 2D layers ----------
function drawBase(c, t) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2A0A0C'); g.addColorStop(1, '#1A0607'); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
// party light beams sweeping from the floor corners
function beams(c, t) {
  const cols = ['255,196,138', '255,122,110', '255,255,255', '255,214,120'];
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const ox = i % 2 ? W + 60 : -60, oy = H * .62, ang = -Math.PI / 2 + (i % 2 ? -1 : 1) * (.35 + .45 * Math.sin(t * (1.1 + i * .3) + i));
    const len = 1900, wd = .12;
    const g = c.createRadialGradient(ox, oy, 0, ox, oy, len); g.addColorStop(0, `rgba(${cols[i]},.22)`); g.addColorStop(1, `rgba(${cols[i]},0)`);
    c.fillStyle = g; c.beginPath(); c.moveTo(ox, oy); c.arc(ox, oy, len, ang - wd, ang + wd); c.closePath(); c.fill();
  }
  c.restore();
}
function glowBehind(c, t) {
  const g = c.createRadialGradient(540, 1050, 0, 540, 1050, 760); g.addColorStop(0, 'rgba(255,150,130,.14)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
const XL = 70;
// one statement at a time, behind the avatar
function statement(c, t, rows, t0, t1, o = {}) {
  if (t < t0 - .1 || t > t1 + .6) return;
  let size = o.size || 96; const mw = Math.max(...rows.map(([s]) => tw(c, s, size))); if (mw > 940) size *= 940 / mw;
  const lh = size * 1.06, y0 = 532 - (rows.length - 1) * lh;
  rows.forEach(([s, col], j) => rise(c, s, XL, y0 + j * lh, size, col, t, t0 + j * .09, { out: t1, d: .6 }));
}
function marquee(c, t, text, t0, t1, y, o = {}) {
  const a = clamp(pr(t, t0, .6)) * (1 - pr(t, t1, .5)); if (a <= 0) return;
  const size = o.size || 230; c.save(); c.globalAlpha = a; c.font = font(size, 700); c.letterSpacing = '6px';
  const unit = text + '   •   ', w = c.measureText(unit).width, off = ((t - t0) * (o.speed || 120)) % w;
  c.lineWidth = 4; c.strokeStyle = o.stroke || 'rgba(228,121,111,.8)'; c.fillStyle = o.fill || 'rgba(228,121,111,.14)';
  for (let x = -off - w; x < W + w; x += w) { c.fillText(unit, x, y); c.strokeText(unit, x, y); }
  c.restore();
}
function confetti(c, t, t0, n, seed, fromX) {
  if (t < t0) return;
  for (let i = 0; i < n; i++) { const r1 = Math.abs(Math.sin((i + seed) * 12.9898) * 43758.5453 % 1), r2 = Math.abs(Math.sin((i + seed) * 78.233) * 12543.123 % 1), r3 = Math.abs(Math.sin((i + seed) * 39.425) * 9631.77 % 1);
    const u = t - t0 - r3 * .25; if (u < 0) continue; const dir = fromX < W / 2 ? 1 : -1;
    const vx = dir * (300 + r1 * 900), vy = -(1500 + r2 * 1300), x = fromX + vx * u * (1 - .35 * u), y = H * .95 + vy * u + 1500 * u * u;
    if (y > H + 40 || u > 4) continue; const sway = Math.sin(u * 7 + i) * 18 * clamp(u - .5);
    c.save(); c.translate(x + sway, y); c.rotate(u * (5 + r1 * 8) + i); c.scale(1, Math.cos(u * 9 + i));
    c.fillStyle = ['#E4796F', '#F7EDE6', '#FFD27A', '#FFFFFF', '#FF9B8E'][i % 5]; c.fillRect(-10, -5, 20, 10); c.restore(); }
}
function sparkle(c, t) {
  const t0 = Wd(0, 'milhoes'); if (t < t0) return;
  for (let i = 0; i < 40; i++) { const x = (i * 263) % W, y = (i * 389) % 900 + 80, a = Math.pow(.5 + .5 * Math.sin(t * 5 + i * 1.7), 6) * clamp((t - t0) * 2);
    c.save(); c.globalAlpha = a; c.fillStyle = '#FFE9C8'; c.translate(x, y); c.rotate(.785); c.fillRect(-2, -12, 4, 24); c.fillRect(-12, -2, 24, 4); c.restore(); }
}
function backTexts(c, t) {
  const t1 = Wd(0, 'acabamos') - .2, tm = Wd(0, 'quatro') - .25, tM = Wd(0, 'milhoes'), t2 = Wd(1, 'so') - .25, end = CUES.duration + 1;
  // part 1
  c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 20;
  rise(c, 'ACABAMOS DE BATER', W / 2, 250, 70, '#FFFFFF', t, t1, { al: 'center', out: t2 - .1, ls: 4 });
  c.restore();
  if (t > tm - .3 && t < t2 + .4) { const k = pr(t, tm, tM + .25 - tm), ko = eio(pr(t, t2 - .1, .4)), v = 4000000 * eo(k);
    const stamp = pr(t, tM + .2, .35), sc = 1 + .25 * (1 - backO(stamp)) * (stamp > 0 ? 1 : 0);
    c.save(); c.globalAlpha = clamp(pr(t, tm - .3, .3)) * (1 - ko); c.translate(W / 2, 470); c.scale(sc, sc);
    c.shadowColor = 'rgba(228,121,111,.9)'; c.shadowBlur = 50 * clamp(stamp * 2);
    if (stamp <= 0) txt(c, 'R$ ' + fmtN(v), 0, 0, 150, '#F7EDE6', { al: 'center', mw: 1000 });
    else { txt(c, '4 MILHÕES', 0, 0, 190, '#F7EDE6', { al: 'center', mw: 1020 }); }
    c.restore(); }
  // part 2
  c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 20;
  rise(c, 'SÓ A VENDA', W / 2, 260, 120, '#FFFFFF', t, t2, { al: 'center' });
  c.restore();
  const tc = Wd(1, 'cura') - .1;
  if (t > tc) { const k = pr(t, tc, .45), shake = Math.sin(t * 50) * 7 * (1 - pr(t, tc + .3, 1.6)), sc = .5 + .5 * backO(k);
    c.save(); c.translate(W / 2 + shake, 470); c.scale(sc, sc); c.globalAlpha = clamp(k * 2); c.shadowColor = 'rgba(228,121,111,.95)'; c.shadowBlur = 55;
    txt(c, 'CURAAAA!', 0, 0, 210, '#F7EDE6', { al: 'center', mw: 1020 }); c.restore(); }
}
const fmtN = v => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function frontTexts(c, t) {
  // sound waves from the megaphone bell
  const tb = .4, m = mouthAt(t), bx = m[0] + 330, by = m[1] - 230, loud = Math.max(clamp(1 - Math.abs(t - (SC[0].voStart + SC[0].voEnd) / 2) / 1.6), clamp(1 - Math.abs(t - (SC[1].voStart + SC[1].voEnd) / 2) / 1.2));
  if (t > tb) for (let i = 0; i < 4; i++) { const ph = ((t - tb) * 1.8 + i / 4) % 1; c.save(); c.globalAlpha = (1 - ph) * (.35 + .65 * loud); c.strokeStyle = i % 2 ? '#F6F3EE' : C.coral; c.lineWidth = 10; c.lineCap = 'round';
    c.beginPath(); c.arc(bx, by, 60 + ph * 260, -1.25, .35); c.stroke(); c.restore(); }
  sparkle(c, t);
  const tM = Wd(0, 'milhoes'), tc = Wd(1, 'cura');
  confetti(c, t, tM, 90, 1, -40); confetti(c, t, tM + .05, 90, 7, W + 40);
  confetti(c, t, tc, 90, 13, -40); confetti(c, t, tc + .05, 90, 19, W + 40);
  const lk = eo(pr(t, SC[1].voEnd + .2, .6)); if (lk > 0) { const lw = 220, lh = lw * IMG.logo.height / IMG.logo.width; c.save(); c.globalAlpha = lk; c.drawImage(IMG.logoN, W / 2 - lw / 2, 1780, lw, lh); c.restore(); }
}
async function composite(c, t) {
  drawBase(c, t);
  const cx = Math.sin(t * .2) * .25, cy = Math.cos(t * .17) * .15;
  camera.position.set(cx, cy, D); camera.lookAt(cx * .3, cy * .3, 0);
  PARTY.forEach((l, i) => { const ph = t * (1.3 + i * .4) + i * 2; l.position.set(Math.sin(ph) * 6, Math.cos(ph * .8) * 7, -4.6); l.intensity = 40 + 25 * Math.sin(t * 6 + i * 2); });
  renderer.render(bgScene, camera);
  c.save(); c.filter = 'blur(1.2px)'; c.drawImage(glc, 0, 0); c.restore();
  beams(c, t);
  { const g = c.createRadialGradient(540, 110, 0, 540, 110, 300); g.addColorStop(0, 'rgba(255,190,170,.35)'); g.addColorStop(1, 'rgba(255,190,170,0)'); c.fillStyle = g; c.fillRect(0, 0, W, 450); }
  glowBehind(c, t);
  backTexts(c, t);
  if (AV.n) { const img = await avatarFrame(t); const z = avZoom(t), w = W * z, h = H * z;
    c.drawImage(img, (W - w) / 2, H - h, w, h); }
  upd3D(t); renderer.render(fgScene, camera); c.drawImage(glc, 0, 0);
  frontTexts(c, t);
  const fi = 1 - eo(pr(t, 0, .4)), fo = eio(pr(t, CUES.duration - .5, .5));
  if (fi > 0 || fo > 0) { c.fillStyle = `rgba(11,17,25,${Math.max(fi, fo)})`; c.fillRect(0, 0, W, H); }
}
async function renderAt(t) { await composite(ctx, t); return 1; }
window.ready = (async () => {
  await document.fonts.load('700 40px Zona'); await document.fonts.load('600 40px Zona');
  CUES = await (await fetch('../cues.json')).json(); SC = CUES.scenes;
  const meta = await (await fetch('../out/frames/meta.json')).json().catch(() => null);
  if (meta) { AV.n = meta.n; AV.fps = meta.fps; }
  TRACK = await (await fetch('../out/frames/track.json')).json().catch(() => null);
  IMG.logo = await loadImg('../assets/logo.png');
  { const c = document.createElement('canvas'); c.width = IMG.logo.width; c.height = IMG.logo.height; const g = c.getContext('2d'); g.drawImage(IMG.logo, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#F6F3EE'; g.fillRect(0, 0, c.width, c.height); IMG.logoN = c; }
  const shape = await (await fetch('../assets/icon_shape.json')).json();
  build(shape.pts);
  renderer.compile(fgScene, camera); renderer.compile(bgScene, camera);
  return true;
})();
window.renderAt = renderAt;
