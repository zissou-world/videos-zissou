// usage: node render.mjs stills OUTDIR t1,t2,...
//        node render.mjs video OUTDIR f0 f1   (renders frames [f0,f1) at 30fps into 120-frame chunks, resumable)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(require_resolve_pw());
function require_resolve_pw(){ return process.env.PW_PATH; }

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

const [mode, outDir, a, b] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', m => { if (m.type() === 'error') console.error('PAGE', m.text()); });
page.on('pageerror', e => console.error('PAGEERR', e.message));
await page.goto(`http://127.0.0.1:${port}/render/index.html`);
await page.waitForFunction(() => window.ready !== undefined);
await page.evaluate(() => window.ready);
const canvas = await page.$('#out');

if (mode === 'cheio') {
  const d = await page.evaluate(() => window.makeCheio());
  fs.writeFileSync(a, Buffer.from(d.split(',')[1], 'base64')); console.log('ok', a);
} else if (mode === 'stills') {
  for (const t of a.split(',').map(Number)) {
    await page.evaluate(t => window.renderAt(t), t);
    await canvas.screenshot({ path: path.join(outDir, `s_${t.toFixed(2).padStart(7, '0')}.png`) });
    console.log('still', t);
  }
} else {
  const FPS = 30, CH = 120;
  const f0 = +a, f1 = +b;
  for (let c0 = Math.floor(f0 / CH) * CH; c0 < f1; c0 += CH) {
    const name = path.join(outDir, `chunk_${String(c0).padStart(6, '0')}.mp4`);
    if (fs.existsSync(name)) continue;
    const tmpName = name + '.part.mp4';
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', tmpName], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = c0; f < Math.min(c0 + CH, f1); f++) {
      await page.evaluate(t => window.renderAt(t), f / FPS);
      const buf = await canvas.screenshot({ type: 'jpeg', quality: 96, timeout: 180000 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    fs.renameSync(tmpName, name);
    console.log('chunk', c0, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
}
await browser.close();
server.close();
