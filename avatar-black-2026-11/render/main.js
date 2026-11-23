// Avatar Marcio (HeyGen Avatar 6) — vertical 1080x1920. Tubetes 3D atrás, textos por trás do avatar, ícones 3D e megafone na frente.
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
const bgScene = new THREE.Scene(); bgScene.environment = ENV; bgScene.environmentIntensity = .55; bgScene.fog = new THREE.Fog(0x0B1119, 18, 46);
const fgScene = new THREE.Scene(); fgScene.environment = ENV; fgScene.environmentIntensity = .8;
{ const k = new THREE.DirectionalLight(0xffffff, 1.6); k.position.set(-6, 10, 12); fgScene.add(k); fgScene.add(new THREE.HemisphereLight(0xffffff, 0x1a2230, .85));
  const r = new THREE.DirectionalLight(0xE4796F, 1.3); r.position.set(8, 3, -6); fgScene.add(r); }
{ const k = new THREE.DirectionalLight(0xbcd2ff, 1.2); k.position.set(-8, 12, 10); bgScene.add(k); bgScene.add(new THREE.HemisphereLight(0x8fb0e8, 0x0b1119, .55));
  const c = new THREE.PointLight(0xE4796F, 60, 30, 1.6); c.position.set(0, -6, -2); bgScene.add(c); const b = new THREE.PointLight(0x5A8BFF, 50, 34, 1.6); b.position.set(-5, 6, -3); bgScene.add(b); }
const toU = px => px / 100;
const sp = (px, py, z = 0) => V(toU(px - W / 2), -toU(py - H / 2), z);
const TUBES = [];
function buildTubes() {
  const cols = [0x1D2C3D, 0x293C4D, 0x24406A, 0x3E5577, 0x5A7196, 0x2E4B7A, 0x1B3358];
  const rnd = (() => { let a = 12345; return () => (a = (a * 16807) % 2147483647) / 2147483647; })();
  [[-4.5, .55, .8, 1.25], [-10, .7, 1.0, 1.55], [-17, .9, 1.3, 1.9]].forEach(([z, rmin, rmax, gap], row) => {
    for (let x = -16; x < 16; x += gap * (1.6 + rnd() * .5)) {
      const r = rmin + rnd() * (rmax - rmin), coral = rnd() < .08 && row < 2;
      const mat = new THREE.MeshPhysicalMaterial({ color: coral ? 0xE4796F : cols[Math.floor(rnd() * cols.length)], roughness: .28, clearcoat: .8, clearcoatRoughness: .2, metalness: .05 });
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 40, 48), mat); m.position.set(x + (row % 2) * .6, 0, z - rnd() * 1.5);
      bgScene.add(m); TUBES.push({ m, ph: rnd() * 6.28, row, x0: m.position.x });
    }
  });
}
function updTubes(t) {
  for (const tb of TUBES) { tb.m.position.y = Math.sin(t * .35 + tb.ph) * .25; tb.m.position.x = tb.x0 + Math.sin(t * .12) * (.25 + tb.row * .25); }
}
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
  const S = i => SC[i];
  addIcon(mIcon(iconPts), 925, 1000, .62, Wd(1, 'chegamos') - .3, S(1).voEnd + .2, { anim: 'spin' });
  addIcon(mTrophy(), 170, 900, .75, Wd(1, 'historia') - .3, S(1).voEnd + .2, { anim: 'spin' });
  addIcon(mQuote(), 165, 930, .62, Wd(2, 'orcamento') - .3, S(2).voEnd + .2, {});
  addIcon(mBubbles(), 920, 1010, .62, Wd(2, 'lide') - .3, S(2).voEnd + .2, { anim: 'swing' });
  addIcon(mPhone(), 920, 980, .9, Wd(3, 'chamar') - .3, S(3).voEnd + .2, { anim: 'ring' });
  addIcon(mTeam(), 190, 990, .52, Wd(4, 'lideres') - .3, S(4).voEnd + .2, {});
  addIcon(mTrophy(), 920, 960, .78, Wd(5, 'premiacao') - .3, S(5).voEnd + .2, { anim: 'spin' });
  addIcon(mBolt(), 160, 930, .8, Wd(6, 'energia') - .3, S(6).voEnd + .2, { anim: 'beat' });
  MEGA = mMegaphone(); const mg = new THREE.Group(); mg.add(MEGA); fgScene.add(mg); MEGA.userData.grp = mg; mg.visible = false;
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
  const mg = MEGA.userData.grp, t0 = Wd(7, 'bora', 2) - .45;
  mg.visible = t > t0; if (mg.visible) {
    const m = mouthAt(t), k = backO(pr(t, t0, .5)), shake = pr(t, t0 + .4, .2) > 0 ? Math.sin(t * 60) * .03 : 0;
    // bell opens to the upper right, mouthpiece at the lips
    const ang = .42; const L = 1.38 * 1.15;
    mg.position.copy(sp(m[0], m[1], 4)).add(V(Math.cos(ang) * L + shake, Math.sin(ang) * L * .6, 0));
    mg.rotation.set(0, -.35, ang * .6 + shake);
    mg.scale.setScalar(Math.max(.001, 1.15 * k));
  }
}
function avZoom(t) { return 1 + .025 * Math.sin(t * .15) + .02 * eio(pr(t, Wd(7, 'bora', 2) - .5, .6)); }
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
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0B1119'); g.addColorStop(1, '#142338'); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function glowBehind(c, t) {
  const g = c.createRadialGradient(540, 1050, 0, 540, 1050, 760); g.addColorStop(0, 'rgba(90,140,255,.22)'); g.addColorStop(.5, 'rgba(228,121,111,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
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
function backTexts(c, t) {
  const S = SC;
  statement(c, t, [['Bom dia,', C.ink], ['time!', C.coral]], S[0].voStart - .2, S[0].voEnd + .25, { size: 170, y: 330 });
  statement(c, t, [['A semana mais', C.ink], ['importante da', C.ink], ['Black Zissou.', C.coral]], Wd(1, 'semana') - .3, Wd(1, 'transformar') - .3, { size: 104 });
  statement(c, t, [['Energia toda em', C.ink], ['transformar', C.ink], ['oportunidade', C.coral], ['em venda.', C.coral]], Wd(1, 'transformar') - .1, S[1].voEnd + .3, { size: 96, y: 230 });
  statement(c, t, [['Retome seus', C.ink], ['orçamentos.', C.coral]], Wd(2, 'orcamento') - .3, Wd(2, 'lide') - .35, { size: 112, y: 300 });
  statement(c, t, [['Chame seus', C.ink], ['leads.', C.coral]], Wd(2, 'lide') - .2, Wd(2, 'visitou') - .4, { size: 120, y: 300 });
  statement(c, t, [['Quem visitou', C.ink], ['a loja e não', C.ink], ['fechou?', C.coral]], Wd(2, 'visitou') - .25, Wd(2, 'hora') - .35, { size: 104 });
  statement(c, t, [['É hora de', C.ink], ['retomar!', C.coral]], Wd(2, 'hora') - .2, S[2].voEnd + .3, { size: 130, y: 300 });
  statement(c, t, [['Entenda o que', C.ink], ['falta para', C.ink], ['fechar.', C.coral]], Wd(3, 'olhar') - .3, S[3].voEnd + .3, { size: 112 });
  statement(c, t, [['Líderes e', C.ink], ['vendedores,', C.ink], ['juntos.', C.coral]], S[4].voStart - .3, Wd(4, 'precisou') - .3, { size: 112 });
  statement(c, t, [['Precisou de ajuda?', C.ink], ['Chama!', C.coral]], Wd(4, 'precisou') - .15, S[4].voEnd + .3, { size: 96, y: 300 });
  statement(c, t, [['Sua próxima venda', C.ink], ['começa com', C.ink], ['uma atitude.', C.coral]], S[5].voStart - .3, S[5].voEnd + .3, { size: 96 });
  statement(c, t, [['Energia', C.ink], ['lá em cima!', C.coral]], S[6].voStart - .3, S[6].voEnd + .3, { size: 140, y: 300 });
  statement(c, t, [['Bora pra', C.ink], ['cima, time!', C.coral]], S[7].voStart - .25, Wd(7, 'bora', 2) - .5, { size: 140, y: 300 });
  // big outline marquee passing behind the head
  marquee(c, t, 'BLACK ZISSOU', S[1].voStart, S[1].voEnd + .4, 760);
  marquee(c, t, 'ORÇAMENTOS · LEADS · CLIENTES', S[2].voStart, S[3].voEnd + .4, 760, { speed: 150 });
  marquee(c, t, 'JUNTOS', S[4].voStart, S[4].voEnd + .4, 760, { stroke: 'rgba(154,171,198,.5)' });
  marquee(c, t, 'META · PREMIAÇÃO · SONHO', S[5].voStart, S[6].voEnd + .4, 760, { speed: 150 });
}
function frontTexts(c, t) {
  const S = SC, tk = ap(t, .2, .6);
  if (t < Wd(7, 'bora', 2) - .6) { c.save(); c.globalAlpha = tk.a; txt(c, 'BLACK ZISSOU · ÚLTIMA SEMANA', XL, 130, 24, C.coral, { ls: 7 }); c.restore();
    const lw = 150, lh = lw * IMG.logo.height / IMG.logo.width; c.save(); c.globalAlpha = tk.a * .9; c.drawImage(IMG.logoN, W - XL - lw, 104, lw, lh); c.restore(); }
  const tb = Wd(7, 'bora', 2) - .35;
  if (t > tb) {
    const k = pr(t, tb, .4), shake = Math.sin(t * 47) * 5 * pr(t, tb + .3, .2) * (1 - pr(t, S[7].voEnd + .2, .4));
    // sound waves from the bell
    const m = mouthAt(t), bx = m[0] + 330, by = m[1] - 230;
    for (let i = 0; i < 4; i++) { const ph = ((t - tb) * 1.6 + i / 4) % 1; c.save(); c.globalAlpha = (1 - ph) * clamp(k * 2); c.strokeStyle = i % 2 ? '#F6F3EE' : C.coral; c.lineWidth = 10; c.lineCap = 'round';
      c.beginPath(); c.arc(bx, by, 60 + ph * 260, -1.25, .35); c.stroke(); c.restore(); }
    c.save(); c.translate(shake, 0);
    const s1 = .6 + .4 * backO(k); c.save(); c.translate(540, 330); c.scale(s1, s1); c.globalAlpha = clamp(k * 2);
    txt(c, 'BORA VENDER,', 0, 0, 120, C.ink, { al: 'center', mw: 980 }); c.restore();
    const k2 = pr(t, Wd(7, 'tiiime') - .1, .4), s2 = .5 + .5 * backO(k2);
    c.save(); c.translate(540, 500); c.scale(s2, s2); c.globalAlpha = clamp(k2 * 2); c.shadowColor = C.coral; c.shadowBlur = 40;
    txt(c, 'TIMEEEE!', 0, 0, 190, C.coral, { al: 'center', mw: 1000 }); c.restore();
    c.restore();
    const lk = eo(pr(t, Wd(7, 'tiiime') + .6, .6)); if (lk > 0) { const lw = 220, lh = lw * IMG.logo.height / IMG.logo.width; c.save(); c.globalAlpha = lk; c.drawImage(IMG.logoN, 540 - lw / 2, 590 + 10 * (1 - lk), lw, lh); c.restore(); }
    const tc = Wd(7, 'tiiime');
    if (t > tc) for (let i = 0; i < 110; i++) { const r1 = Math.sin(i * 12.9898) * 43758.5453 % 1, r2 = Math.sin(i * 78.233) * 12543.123 % 1, r3 = Math.sin(i * 39.425) * 9631.77 % 1;
      const u = t - tc - Math.abs(r3) * .4; if (u < 0) continue; const x = 540 + r1 * 700 * u, y = 600 + (-900 - Math.abs(r2) * 900) * u + 1500 * u * u; if (y > H + 40) continue;
      c.save(); c.globalAlpha = clamp(2.5 - u * .7); c.translate(x, y); c.rotate(u * 6 * r1 + i); c.fillStyle = i % 3 === 0 ? C.coral : i % 3 === 1 ? '#F6F3EE' : '#9AABC6'; c.fillRect(-9, -4.5, 18, 9); c.restore(); }
  }
}
async function composite(c, t) {
  drawBase(c, t);
  const cx = Math.sin(t * .2) * .25, cy = Math.cos(t * .17) * .15;
  camera.position.set(cx, cy, D); camera.lookAt(cx * .3, cy * .3, 0);
  updTubes(t); renderer.render(bgScene, camera);
  c.save(); c.filter = 'blur(3px)'; c.drawImage(glc, 0, 0); c.restore();
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
