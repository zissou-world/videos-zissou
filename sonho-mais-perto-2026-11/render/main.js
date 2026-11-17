// "Seu sonho mais perto" — 30 s, 1920x1080. three.js (3D) + canvas 2D (tipografia).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1920, H = 1080;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const pr = (t, a, d) => clamp((t - a) / d);
const eo = x => 1 - Math.pow(1 - clamp(x), 3);
const eo5 = x => 1 - Math.pow(1 - clamp(x), 5);
const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eis = x => { x = clamp(x); return -(Math.cos(Math.PI * x) - 1) / 2; };
const spring = x => x <= 0 ? 0 : x >= 1.5 ? 1 : 1 - Math.exp(-6.5 * x) * Math.cos(10 * x);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const out = document.getElementById('out'), ctx = out.getContext('2d');
const tmp = document.getElementById('tmp'), tctx = tmp.getContext('2d');
const glc = document.getElementById('gl');
const IMG = {};
let CUES = null;
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

// ---------------- renderer / scene ----------------
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
function bgTex() { const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d');
  const r = g.createLinearGradient(0, 0, 0, 512); r.addColorStop(0, '#020b24'); r.addColorStop(.52, '#0a2463'); r.addColorStop(1, '#0a2463');
  g.fillStyle = r; g.fillRect(0, 0, 4, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
scene.background = bgTex();
scene.fog = new THREE.Fog(0x0a2463, 9, 34);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = .55;
const camera = new THREE.PerspectiveCamera(32, W / H, .1, 200);

const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = .02;
Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: .5, far: 40 });
scene.add(key); scene.add(key.target);
const rim = new THREE.DirectionalLight(0xbcd2ff, 1.1); scene.add(rim); scene.add(rim.target);
const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x0a2050, .55); scene.add(hemi);
const warm = new THREE.PointLight(0xff9a4d, 0, 30, 1.6); scene.add(warm);

const M = {
  satin: new THREE.MeshPhysicalMaterial({ color: 0xf5f5f3, roughness: .42, metalness: 0, clearcoat: .35, clearcoatRoughness: .45, sheen: .3, sheenRoughness: .6, sheenColor: new THREE.Color(0xffffff) }),
  floor: new THREE.MeshStandardMaterial({ color: 0x0a2a7a, roughness: .82, metalness: 0, envMapIntensity: .08 }),
};
const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M.floor);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

function glowTex(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const r = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  r.addColorStop(0, inner); r.addColorStop(.25, outer); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const warmSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,206,150,1)', 'rgba(255,140,60,0.4)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
warmSprite.scale.set(16, 16, 1); scene.add(warmSprite);

const shadowOf = m => { m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return m; };

// ---------------- models ----------------
function rshape(pts) { return new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))); }
function makePlane() {
  const g = new THREE.Group();
  // fuselage (lathe along Y, then rotated to X)
  const prof = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40, x = lerp(-1.75, 1.75, u);
    let r = .26;
    if (u < .14) r = .26 * Math.sqrt(1 - Math.pow((.14 - u) / .14, 2));            // nose
    else if (u > .62) r = lerp(.26, .07, Math.pow((u - .62) / .38, 1.4));            // tail taper
    prof.push(new THREE.Vector2(Math.max(r, .001), x));
  }
  const fus = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), M.satin); fus.rotation.z = -Math.PI / 2; g.add(fus);
  const ext = (pts, depth, bev) => { const ge = new THREE.ExtrudeGeometry(rshape(pts), { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4 }); ge.center(); return ge; };
  // main wing (swept), lying in XZ plane
  const wingG = ext([[0.25, 0], [-0.35, 0], [-0.95, 1.55], [-0.62, 1.6]], .05, .03);
  for (const s of [1, -1]) {
    const w = new THREE.Mesh(wingG, M.satin); w.rotation.x = Math.PI / 2; w.scale.z = 1; w.scale.y = s;
    w.position.set(-.1, -.05, s * .95); w.rotation.z = 0; g.add(w);
    const eng = new THREE.Mesh(new THREE.CapsuleGeometry(.09, .32, 8, 20), M.satin); eng.rotation.z = Math.PI / 2; eng.position.set(.12, -.2, s * .75); g.add(eng);
  }
  const stabG = ext([[0.1, 0], [-0.25, 0], [-0.5, .6], [-0.32, .62]], .035, .02);
  for (const s of [1, -1]) { const st = new THREE.Mesh(stabG, M.satin); st.rotation.x = Math.PI / 2; st.scale.y = s; st.position.set(-1.45, .05, s * .36); g.add(st); }
  const fin = new THREE.Mesh(ext([[0.15, 0], [-0.32, 0], [-0.55, .62], [-0.32, .64]], .035, .02), M.satin); fin.position.set(-1.38, .36, 0); g.add(fin);
  return shadowOf(g);
}
function makeHouse() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.0, 1.45, 1.7, 4, .06), M.satin); body.position.y = .725; g.add(body);
  const roofS = rshape([[-1.22, 0], [1.22, 0], [0, .95]]);
  const roofG = new THREE.ExtrudeGeometry(roofS, { depth: 1.9, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 4 }); roofG.center();
  const roof = new THREE.Mesh(roofG, M.satin); roof.position.set(0, 1.45 + .5, 0); g.add(roof);
  const chim = new THREE.Mesh(new RoundedBoxGeometry(.26, .55, .26, 3, .04), M.satin); chim.position.set(.55, 2.05, -.3); g.add(chim);
  const door = new THREE.Mesh(new RoundedBoxGeometry(.44, .78, .08, 3, .03), M.satin); door.position.set(0, .39, .86); g.add(door);
  for (const x of [-.6, .6]) { const w = new THREE.Mesh(new RoundedBoxGeometry(.38, .38, .06, 3, .02), M.satin); w.position.set(x, .92, .86); g.add(w); }
  const step = new THREE.Mesh(new RoundedBoxGeometry(.7, .08, .3, 2, .03), M.satin); step.position.set(0, .04, 1.0); g.add(step);
  return shadowOf(g);
}
function makeHeart() {
  const s = new THREE.Shape();
  s.moveTo(0, -1.0);
  s.bezierCurveTo(-.25, -.72, -1.05, -.25, -1.05, .28);
  s.bezierCurveTo(-1.05, .78, -.62, 1.02, -.36, 1.0);
  s.bezierCurveTo(-.12, .99, 0, .82, 0, .64);
  s.bezierCurveTo(0, .82, .12, .99, .36, 1.0);
  s.bezierCurveTo(.62, 1.02, 1.05, .78, 1.05, .28);
  s.bezierCurveTo(1.05, -.25, .25, -.72, 0, -1.0);
  const ge = new THREE.ExtrudeGeometry(s, { depth: .32, bevelEnabled: true, bevelThickness: .26, bevelSize: .2, bevelSegments: 10, curveSegments: 36 });
  ge.center(); ge.computeVertexNormals();
  const m = new THREE.Mesh(ge, M.satin); const g = new THREE.Group(); g.add(m); return shadowOf(g);
}
let ICON_ASP = 1.668;
function makeIcon(pts) {
  const ge = new THREE.ExtrudeGeometry(rshape(pts), { depth: .3, bevelEnabled: true, bevelThickness: .07, bevelSize: .035, bevelSegments: 6, curveSegments: 4 });
  ge.center(); ge.computeVertexNormals();
  const g = new THREE.Group(); g.add(new THREE.Mesh(ge, M.satin)); return shadowOf(g);
}

const O = {};
const P_PLANE = V(0, 1.35, 0), P_HOUSE = V(9, 0, 0), P_HEART = V(18, 1.25, 0);
const STEPS_X = 64;
function build(iconPts) {
  O.plane = makePlane(); O.plane.scale.setScalar(1.0); scene.add(O.plane);
  O.house = makeHouse(); scene.add(O.house);
  O.heart = makeHeart(); scene.add(O.heart);
  O.icon = makeIcon(iconPts); scene.add(O.icon);
  O.blocks = [];
  const hs = [1.0, 2.0, 3.0];
  hs.forEach((h, i) => { const b = new THREE.Mesh(new RoundedBoxGeometry(2.3, h, 2.3, 4, .07), M.satin); shadowOf(b); b.userData.h = h; scene.add(b); O.blocks.push(b); });
}

// ---------------- 3D timeline ----------------
// icon world placement helpers
const ICON_H = 1;            // geometry height (normalized)
function iconPos(t) {
  // returns {p, s, ry, rx}
  if (t < 13.9) {
    const go = eis(pr(t, 8.75, 5.3));
    const x = lerp(18, 31, go);
    const s = 1.15;
    return { p: V(x, s * ICON_H / 2 + .07 + Math.sin(t * 2.2) * .015 * go, -.15), s, ry: -.18 + .1 * Math.sin(t * .7), rx: 0 };
  }
  // steps scene
  const s = .95, base = s / 2 + .07;
  const bx = i => STEPS_X + (i - 1) * 2.3;
  const tops = [1.0, 2.0, 3.0];
  const J = [[19.7, 0], [21.1, 1], [22.6, 2]];
  let x = STEPS_X - 4.2, y = base, last = -1;
  for (const [tj, i] of J) {
    const k = pr(t, tj, .55);
    if (k <= 0) break;
    const x0 = last < 0 ? STEPS_X - 4.2 : bx(last), y0 = last < 0 ? base : tops[last] + base;
    const x1 = bx(i), y1 = tops[i] + base;
    const e = eis(k);
    x = lerp(x0, x1, e); y = lerp(y0, y1, e) + Math.sin(Math.PI * k) * .9;
    last = i;
  }
  // finale: settle, lift slightly and grow
  const f = eio(pr(t, 24.45, 1.3));
  const sF = lerp(s, 1.25, f);
  y += (sF - s) / 2;
  y = lerp(y, tops[2] + sF / 2 + 3.6, f);
  return { p: V(x, y + Math.sin(t * 1.8) * .02 * f, .75 * (1 - f)), s: sF, ry: lerp(-.2, 0, f), rx: 0 };
}

function camAt(t) {
  // returns {pos, tgt, fov}
  const P = (x, y, z) => V(x, y, z);
  if (t < 8.0) {
    const K = [
      [0, P(0, 1.7, 8.6), P(0, .85, 0)],
      [3.0, P(0, 1.65, 8.0), P(0, .82, 0)],
      [4.45, P(.35, 1.6, 7.5), P(.25, .8, 0)],
      [5.0, P(9, 2.0, 8.4), P(9, .55, 0)],
      [5.85, P(9.35, 1.95, 8.0), P(9.25, .55, 0)],
      [6.35, P(18, 1.65, 8.0), P(18, .8, 0)],
      [8.0, P(18.25, 1.6, 7.4), P(18.15, .75, 0)],
    ];
    for (let i = 0; i < K.length - 1; i++) {
      if (t <= K[i + 1][0]) {
        const moving = (K[i + 1][1].distanceTo(K[i][1]) > 2);
        const k = moving ? eio(pr(t, K[i][0], K[i + 1][0] - K[i][0])) : pr(t, K[i][0], K[i + 1][0] - K[i][0]);
        return { pos: K[i][1].clone().lerp(K[i + 1][1], k), tgt: K[i][2].clone().lerp(K[i + 1][2], k), fov: 32 };
      }
    }
  }
  if (t < 14.35) {
    const ic = iconPos(t);
    const k = eis(pr(t, 8.0, 5.5));
    const base = { pos: V(18.25, 1.6, 7.4), tgt: V(18.15, .75, 0) };
    const follow = { pos: ic.p.clone().add(V(lerp(-1.6, -3.0, k), lerp(1.1, .75, k), lerp(6.6, 5.0, k))), tgt: ic.p.clone().add(V(lerp(.8, 2.2, k), -.35, -1)) };
    const j = eio(pr(t, 8.0, 1.2));
    let pos = base.pos.clone().lerp(follow.pos, j), tgt = base.tgt.clone().lerp(follow.tgt, j);
    // push into the icon face
    const push = eio(pr(t, 13.55, .8));
    if (push > 0) {
      const face = ic.p.clone().add(V(-.15, .1, .32));
      pos.lerp(face.clone().add(V(0, 0, .25)), push); tgt.lerp(face.clone().add(V(0, 0, -1)), push);
    }
    return { pos, tgt, fov: lerp(32, 26, push) };
  }
  if (t < 18.95) { // typography stage: slow glide over the floor toward the horizon
    const k = pr(t, 14.35, 4.6);
    return { pos: V(lerp(40, 44, k), 2.2, 6), tgt: V(lerp(40, 44, k) + 2, 1.6, -20), fov: 32 };
  }
  // steps + finale
  const ic = iconPos(t);
  const k = eis(pr(t, 18.95, 6.0));
  const f = eio(pr(t, 24.35, 1.45));
  const enter = eo5(pr(t, 18.95, .7));
  let pos = V(STEPS_X + lerp(-4.5, 1.6, k), lerp(3.0, 5.0, k), lerp(13.5, 12.0, k));
  let tgt = V(STEPS_X + lerp(-1.0, 1.2, k), lerp(.4, 2.0, k), 0);
  pos.x -= (1 - enter) * 6; tgt.x -= (1 - enter) * 6;
  const finPos = ic.p.clone().add(V(0, .55, lerp(8.8, 10.4, eio(pr(t, 25.2, 4.8)))));
  const finTgt = ic.p.clone().add(V(0, -.62, 0));
  pos.lerp(finPos, f); tgt.lerp(finTgt, f);
  return { pos, tgt, fov: 32 };
}

function upd3D(t) {
  const cam = camAt(t);
  camera.position.copy(cam.pos); camera.lookAt(cam.tgt); camera.fov = cam.fov; camera.updateProjectionMatrix();
  // world reveal (scene 1 is dark)
  const world = eio(pr(t, 2.2, 1.2));
  const fin = eio(pr(t, 25.0, 2.0));
  key.intensity = 2.3 * world + 1.0 * fin; rim.intensity = 1.2 * world + .6 * fin; hemi.intensity = .55 * world + .25 * fin;
  scene.environmentIntensity = .55 * world + .2 * fin;
  floor.visible = world > .01; M.floor.opacity = world; M.floor.transparent = world < 1;
  const focus = cam.tgt.clone();
  key.position.copy(focus).add(V(-4.5, 9, 6)); key.target.position.copy(focus);
  rim.position.copy(focus).add(V(6, 4, -6)); rim.target.position.copy(focus);
  key.shadow.camera.updateProjectionMatrix();

  // plane: floats, banks gently
  O.plane.visible = t > 2.55 && t < 6.0;
  O.plane.position.copy(P_PLANE).add(V(Math.sin(t * .9) * .05, Math.sin(t * 1.6) * .06, 0));
  O.plane.rotation.set(.18 + Math.sin(t * 1.1) * .05, -.95 + t * .04, Math.sin(t * .8) * .05 + .1);
  const pIn = eo(pr(t, 2.9, .7)); O.plane.scale.setScalar(lerp(.86, 1, pIn));
  // house
  O.house.visible = t > 3.5 && t < 7.2;
  O.house.position.copy(P_HOUSE); O.house.rotation.y = -.42 + (t - 5) * .05;
  // heart: rotates softly, exits up-left revealing the icon
  const hx = eio(pr(t, 7.95, 1.0));
  O.heart.visible = t > 5.4 && hx < 1;
  O.heart.position.copy(P_HEART).add(V(-2.6 * hx, 2.6 * hx + Math.sin(t * 1.4) * .05, 1.2 * hx));
  O.heart.rotation.set(.05, Math.sin(t * .9) * .35 + hx * .8, Math.sin(t * .6) * .04);
  O.heart.scale.setScalar(.9 * (1 - .3 * hx));
  // icon
  const ic = iconPos(t);
  O.icon.visible = (t > 7.6 && t < 14.4) || t > 18.9;
  O.icon.position.copy(ic.p); O.icon.scale.setScalar(ic.s); O.icon.rotation.set(ic.rx, ic.ry, 0);
  // warm light ahead of the icon (scene 3)
  const wl = eio(pr(t, 8.6, 2.5)) * (1 - eio(pr(t, 13.6, .6)));
  warm.intensity = 5 * wl; warm.position.set(ic.p.x + 6, 1.6, -1);
  warmSprite.visible = wl > 0.01; warmSprite.position.set(ic.p.x + 13, 1.0, -9); warmSprite.material.opacity = .85 * wl * eis(pr(t, 8.6, 4)) + .15 * wl;
  // blocks snap in
  const SN = [19.45, 20.85, 22.35];
  O.blocks.forEach((b, i) => {
    const k = spring(pr(t, SN[i] - .45, .9) * 1.5);
    b.visible = t > 18.9 && k > 0;
    const h = b.userData.h;
    b.position.set(STEPS_X + (i - 1) * 2.3, h / 2 + (1 - clamp(k)) * 5, 0);
    b.rotation.set(0, (1 - clamp(k)) * .5, 0);
  });
}

// ---------------- 2D typography ----------------
const C = { white: '#ffffff', soft: 'rgba(255,255,255,0.72)' };
function font(size, w = 700) { return `${w} ${size}px Zona`; }
function tw(c, s, size, w = 700, ls = 0) { c.save(); c.font = font(size, w); c.letterSpacing = `${ls}px`; const m = c.measureText(s).width; c.restore(); return m; }
function txt(c, s, x, y, size, o = {}) {
  c.save(); c.font = font(size, o.w || 700); c.letterSpacing = `${o.ls || 0}px`;
  c.textAlign = o.al || 'center'; c.fillStyle = o.color || C.white; c.globalAlpha *= (o.a ?? 1);
  if (o.blur) c.filter = `blur(${o.blur}px)`;
  if (o.shadow) { c.shadowColor = 'rgba(0,8,30,0.45)'; c.shadowBlur = 30; c.shadowOffsetY = 6; }
  c.fillText(s, x, y); c.restore();
}
// Apple-like masked rise: text rises inside its own line box
function rise(c, s, x, y, size, t, t0, o = {}) {
  const k = eo5(pr(t, t0, o.d || .7));
  const ko = o.out ? eio(pr(t, o.out, .45)) : 0;
  if (k <= 0 || ko >= 1) return;
  c.save();
  const asc = size * .95, desc = size * .3;
  const w = tw(c, s, size, o.w || 700, o.ls || 0) + 40;
  const x0 = (o.al || 'center') === 'center' ? x - w / 2 : x - 20;
  c.beginPath(); c.rect(x0, y - asc - 6, w, asc + desc + 12); c.clip();
  const dy = (1 - k) * size * 1.05 - ko * size * 1.05;
  txt(c, s, x, y + dy, size, { ...o, a: (o.a ?? 1) * clamp(k * 1.4) * (1 - ko), blur: (1 - k) * 4 + ko * 4 });
  c.restore();
}
// word-by-word in a centered line
function words(c, list, cx, y, size, t, o = {}) {
  const sp = size * .28;
  const ws = list.map(w => tw(c, w[0], size, o.w || 700, o.ls || 0));
  const tot = ws.reduce((a, b) => a + b, 0) + sp * (list.length - 1);
  let x = cx - tot / 2;
  list.forEach((w, i) => { rise(c, w[0], x, y, size, t, w[1], { ...o, al: 'left' }); x += ws[i] + sp; });
}
const W_ = (w, n = 1) => { let k = 0; for (const x of CUES.words) if (x.w.replace(/[.,!?]/g, '').toLowerCase() === w.toLowerCase() && ++k === n) return x.t; return 0; };

function overlay(c, t) {
  // ---- scene 1: point of light reveals the question ----
  if (t < 3.3) {
    const L = eo(pr(t, .05, 1.6));
    const g = c.createRadialGradient(960, 520, 0, 960, 520, 40 + 820 * L);
    g.addColorStop(0, `rgba(120,165,255,${.55 * L})`); g.addColorStop(.35, `rgba(40,90,200,${.35 * L})`); g.addColorStop(1, 'rgba(6,26,74,0)');
    c.save(); c.globalAlpha = 1 - eio(pr(t, 2.6, .7)); c.fillStyle = g; c.fillRect(0, 0, W, H);
    // light dot
    const d = eo(pr(t, .05, .35)) * (1 - eo(pr(t, .35, .45)));
    const gd = c.createRadialGradient(960, 540, 0, 960, 540, 60); gd.addColorStop(0, `rgba(255,255,255,${d})`); gd.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gd; c.fillRect(860, 440, 200, 200);
    c.restore();
    // question revealed by the light (radial mask)
    const qa = 1 - eio(pr(t, 2.55, .5));
    if (qa > 0) {
      c.save();
      const R = 60 + 1100 * eo(pr(t, .45, 1.4));
      c.beginPath(); c.ellipse(960, 540, R, R * .55, 0, 0, Math.PI * 2); c.clip();
      txt(c, 'Você tem um sonho?', 960, 578, 116, { a: qa * eo(pr(t, .45, 1.0)), blur: (1 - eo(pr(t, .45, 1.1))) * 10 + (1 - qa) * 8 });
      c.restore();
    }
  }
  // ---- scene 2 captions (one at a time) ----
  const cap = (s, t0, t1) => rise(c, s, 960, 930, 64, t, t0, { out: t1, shadow: true });
  cap('Aquela viagem.', 3.15, 4.4);
  cap('Sua casa.', 4.75, 5.85);
  cap('Sua família.', 6.15, 7.75);
  // ---- scene 3 ----
  rise(c, 'Segunda quinzena.', 960, 862, 70, t, W_('segunda') - .1, { out: 13.45, shadow: true });
  rise(c, 'Seu sonho mais perto.', 960, 950, 70, t, W_('sonho', 2) - .05, { out: 13.5, shadow: true });
  // ---- scene 4: typography ----
  if (t > 13.9 && t < 19.4) {
    const flash = 1 - eio(pr(t, 14.12, .38));
    if (t < 14.75) { c.save(); c.globalAlpha = clamp(eio(pr(t, 13.92, .22)) * flash * .92); c.fillStyle = '#f5f5f3'; c.fillRect(0, 0, W, H); c.restore(); }
    const up = eio(pr(t, 15.95, .6));
    const sz = lerp(168, 104, up);
    const outK = 18.75;
    rise(c, 'RETA FINAL', 960, lerp(470, 352, up), sz, t, W_('reta') - .08, { ls: sz * .035, out: outK });
    rise(c, 'BLACK ZISSOU', 960, lerp(650, 472, up), sz, t, W_('black') - .06, { ls: sz * .035, out: outK });
    rise(c, 'É hora de acelerar.', 960, 690, 92, t, W_('é') - .04, { out: outK, d: .6 });
    // fine rule
    const r = eo(pr(t, 16.2, .7)) * (1 - eio(pr(t, outK, .4)));
    if (r > 0) { c.save(); c.globalAlpha = .55 * r; c.fillStyle = '#fff'; c.fillRect(960 - 120 * r, 560, 240 * r, 3); c.restore(); }
  }
  // ---- scene 5 captions ----
  const cap5 = (s, t0, t1) => rise(c, s, 960, 940, 66, t, t0, { out: t1, shadow: true });
  cap5('Cuide de cada cliente.', 19.25, 20.6);
  cap5('Busque cada oportunidade.', 20.65, 22.1);
  cap5('Faça acontecer.', 22.2, 24.3);
  // ---- scene 6: final ----
  rise(c, 'Seu sonho merece', 960, 790, 80, t, W_('seu') - .05, { shadow: true, d: .8 });
  rise(c, 'a sua melhor versão.', 960, 886, 80, t, W_('a', 2) - .05, { shadow: true, d: .8 });
  const sk = eo(pr(t, 27.3, 1.0));
  if (sk > 0) txt(c, 'BLACK ZISSOU · 17 DE NOVEMBRO', 960, 990, 27, { w: 700, ls: 27 * .3, a: sk * .92 });
}

// cinematic finishing: vignette, subtle top light, grain-free
function grade(c, t) {
  const fin = eio(pr(t, 25.0, 2.0));
  let g = c.createRadialGradient(960, 520, 300, 960, 560, 1250);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,6,24,${.55 - .12 * fin})`);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  if (fin > 0) { g = c.createRadialGradient(960, 330, 0, 960, 330, 760); g.addColorStop(0, `rgba(130,170,255,${.16 * fin})`); g.addColorStop(1, 'rgba(130,170,255,0)'); c.save(); c.globalCompositeOperation = 'screen'; c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore(); }
  // fade in/out
  const fi = 1 - eo(pr(t, 0, .35)), fo = eio(pr(t, 29.75, .25));
  if (fi > 0 || fo > 0) { c.fillStyle = `rgba(2,10,30,${Math.max(fi, fo * .0)})`; c.fillRect(0, 0, W, H); }
}

function composite(c, t) {
  upd3D(t);
  renderer.render(scene, camera);
  c.drawImage(glc, 0, 0);
  grade(c, t);
  overlay(c, t);
}
function camSpeed(t) { const a = camAt(t - 1 / 60), b = camAt(t + 1 / 60); return a.pos.distanceTo(b.pos) * 30 + a.tgt.distanceTo(b.tgt) * 15; }
function renderAt(t) {
  const sp = camSpeed(t);
  const N = sp > 9 ? 7 : sp > 4 ? 4 : 1;
  if (N === 1) { composite(ctx, t); return 1; }
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < N; i++) {
    const ts = t + (i / (N - 1) - .5) * (1 / 30) * .55;
    composite(tctx, ts);
    ctx.globalAlpha = 1 / (i + 1); ctx.drawImage(tmp, 0, 0); ctx.globalAlpha = 1;
  }
  return N;
}

window.ready = (async () => {
  await document.fonts.load('700 40px Zona'); await document.fonts.load('600 40px Zona');
  CUES = await (await fetch('../cues.json')).json();
  const shape = await (await fetch('../assets/icon_shape.json')).json();
  ICON_ASP = shape.aspect;
  build(shape.pts);
  renderer.compile(scene, camera);
  return true;
})();
window.renderAt = renderAt;
