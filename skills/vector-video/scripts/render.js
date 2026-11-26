#!/usr/bin/env node
'use strict';
/*
 * vector-video renderer
 * Turns a scene file (.json or .js) into a narrated .mp4.
 * Every visual is drawn as SVG (shapes, paths, text) and rasterized frame by frame with resvg.
 *
 * Usage:
 *   node render.js <scene.json|scene.js> [out.mp4] [options]
 * Options:
 *   --stills <list>   Save PNG previews instead of a video. List items: "12.5" (seconds into the video)
 *                     or "3@1.5" (scene 3, 1.5 s into that scene). Comma separated.
 *   --stills-dir <d>  Where to save previews (default: <out name>-stills next to the output).
 *   --video           With --stills, also render the video.
 *   --no-audio        Skip speech. Scene lengths are guessed from word counts.
 *   --scale <n>       Render at n times the size (e.g. 0.5 for a fast draft).
 *   --timeline        Only print the scene/cue timing table.
 *   --tts <engine>    Speech engine: auto (default), kokoro or system. Overrides "tts" in the scene file.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function need(mod) {
  try { return require(mod); } catch (e) {
    console.error(`Missing package "${mod}". Run this once, then try again:\n  cd "${ROOT}" && npm install`);
    process.exit(2);
  }
}

// ---------------------------------------------------------------- args
function parseArgs(argv) {
  const a = { positional: [], stills: null, stillsDir: null, video: false, audio: true, scale: 1, timeline: false, tts: null };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--stills') a.stills = argv[++i];
    else if (v === '--stills-dir') a.stillsDir = argv[++i];
    else if (v === '--video') a.video = true;
    else if (v === '--no-audio') a.audio = false;
    else if (v === '--scale') a.scale = parseFloat(argv[++i]);
    else if (v === '--timeline') a.timeline = true;
    else if (v === '--tts') a.tts = argv[++i];
    else if (v === '-h' || v === '--help') { a.help = true; }
    else a.positional.push(v);
  }
  return a;
}

// ---------------------------------------------------------------- spec loading
function loadSpec(file) {
  const abs = path.resolve(file);
  let spec;
  if (/\.(c?js)$/i.test(abs)) {
    delete require.cache[abs];
    spec = require(abs);
    if (typeof spec === 'function') spec = spec();
  } else {
    spec = JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''));
  }
  if (!spec || !Array.isArray(spec.scenes) || !spec.scenes.length) throw new Error('The scene file needs a non-empty "scenes" list.');
  return Object.assign({
    width: 1280, height: 720, fps: 30, background: '#0f172a',
    font: 'Segoe UI', mono: 'Consolas', color: '#e2e8f0',
    tts: 'auto', voice: null, rate: 0, leadIn: 0.4, gap: 0.3, tail: 0.7, fade: 0.25,
    overlay: [], fonts: [],
  }, spec);
}

// ---------------------------------------------------------------- narration
function segmentsOf(scene) {
  let n = scene.narration;
  if (n == null) return [];
  if (!Array.isArray(n)) n = [n];
  return n.map((s) => (typeof s === 'string' ? { say: s } : Object.assign({}, s)));
}

function hash(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16); }

function readWav(file) {
  const b = fs.readFileSync(file);
  let off = 12, fmt = null, data = null;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4); const size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { channels: b.readUInt16LE(off + 10), rate: b.readUInt32LE(off + 12), bits: b.readUInt16LE(off + 22) };
    if (id === 'data') { data = b.subarray(off + 8, Math.min(b.length, off + 8 + size)); break; }
    off += 8 + size + (size & 1);
  }
  if (!fmt || !data) throw new Error('Bad WAV file: ' + file);
  if (fmt.bits !== 16 || fmt.channels !== 1 || fmt.rate !== RATE) throw new Error(`Expected 22050 Hz mono 16-bit WAV, got ${fmt.rate} Hz ${fmt.channels} ch ${fmt.bits}-bit in ${file}`);
  return new Int16Array(data.buffer.slice(data.byteOffset, data.byteOffset + (data.length & ~1)));
}

const RATE = 22050;

function writeWav(file, samples) {
  const h = Buffer.alloc(44);
  const dataLen = samples.length * 2;
  h.write('RIFF', 0); h.writeUInt32LE(36 + dataLen, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(dataLen, 40);
  fs.writeFileSync(file, Buffer.concat([h, Buffer.from(samples.buffer, samples.byteOffset, dataLen)]));
}

function synthesize(jobs, ffmpegPath) {
  // jobs: [{text, out, voice, rate}] for files not yet in the cache
  if (!jobs.length) return;
  if (process.platform === 'win32') {
    const jf = path.join(os.tmpdir(), `vv-jobs-${process.pid}.json`);
    fs.writeFileSync(jf, JSON.stringify(jobs), 'utf8');
    const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'tts-windows.ps1'), jf], { encoding: 'utf8' });
    fs.rmSync(jf, { force: true });
    if (r.status !== 0) throw new Error('Windows speech failed:\n' + (r.stderr || r.stdout));
    if (r.stderr && r.stderr.trim()) console.warn(r.stderr.trim());
    return;
  }
  for (const j of jobs) {
    if (j.voice && /^Microsoft /i.test(j.voice)) j.voice = null; // Windows-only voice name
    const tmp = j.out + (process.platform === 'darwin' ? '.aiff' : '.raw.wav');
    let r;
    if (process.platform === 'darwin') {
      const args = ['-o', tmp]; if (j.voice) args.push('-v', j.voice);
      if (j.rate) args.push('-r', String(Math.round(175 * (1 + j.rate / 10))));
      args.push(j.text); r = spawnSync('say', args);
    } else {
      const bin = ['espeak-ng', 'espeak'].find((b) => spawnSync(b, ['--version']).status === 0);
      if (!bin) return false;
      const args = ['-w', tmp]; if (j.voice) args.push('-v', j.voice);
      if (j.rate) args.push('-s', String(Math.round(175 * (1 + j.rate / 10))));
      args.push(j.text); r = spawnSync(bin, args);
    }
    if (r.status !== 0) throw new Error('Speech failed: ' + String(r.stderr));
    const c = spawnSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', tmp, '-ar', String(RATE), '-ac', '1', '-c:a', 'pcm_s16le', j.out]);
    fs.rmSync(tmp, { force: true });
    if (c.status !== 0) throw new Error('Audio convert failed: ' + String(c.stderr));
  }
  return true;
}

// ---------------------------------------------------------------- kokoro (neural, offline)
const KOKORO_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const KOKORO_DEFAULT_VOICE = 'af_heart';
// Model files live here (downloaded once, then used offline). Override with VV_MODELS_DIR.
const MODELS_DIR = process.env.VV_MODELS_DIR || path.join(os.homedir(), '.cache', 'vector-video', 'models');
let kokoroPromise = null;

function kokoroInstalled() {
  try { require.resolve('kokoro-js'); return true; } catch { return false; }
}

function loadKokoro() {
  if (!kokoroPromise) kokoroPromise = (async () => {
    const { env } = await import('@huggingface/transformers');
    env.localModelPath = MODELS_DIR + path.sep;
    env.cacheDir = MODELS_DIR + path.sep;
    const { KokoroTTS } = await import('kokoro-js');
    const local = fs.existsSync(path.join(MODELS_DIR, KOKORO_MODEL, 'onnx', 'model_quantized.onnx'));
    if (!local) console.log(`Downloading the Kokoro voice model once (~92 MB) into ${MODELS_DIR} ...`);
    return KokoroTTS.from_pretrained(KOKORO_MODEL, { dtype: 'q8', device: 'cpu' });
  })();
  return kokoroPromise;
}

async function synthesizeKokoro(jobs, ffmpegPath) {
  const tts = await loadKokoro();
  let i = 0;
  for (const j of jobs) {
    const audio = await tts.generate(j.text, { voice: j.voice, speed: Math.max(0.5, Math.min(2, 1 + (j.rate || 0) / 10)) });
    const tmp = j.out + '.raw.wav';
    await audio.save(tmp);
    // Kokoro can peak at full scale; leave ~1.5 dB of headroom so the mix never clips.
    const c = spawnSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', tmp, '-af', 'alimiter=limit=0.84:level=false', '-ar', String(RATE), '-ac', '1', '-c:a', 'pcm_s16le', j.out]);
    fs.rmSync(tmp, { force: true });
    if (c.status !== 0) throw new Error('Audio convert failed: ' + String(c.stderr));
    process.stdout.write(`\r  ${++i}/${jobs.length}`);
  }
  if (jobs.length) process.stdout.write('\n');
}

// Picks the engine: "kokoro" (neural), "system" (Windows / macOS / espeak voices) or "auto" (kokoro when installed).
async function pickEngine(spec, opts) {
  const want = String(opts.tts || spec.tts || 'auto').toLowerCase();
  if (want === 'system') return 'system';
  if (!kokoroInstalled()) {
    if (want === 'kokoro') console.warn(`Kokoro is not installed (cd "${ROOT}" && npm install kokoro-js). Using the system voice.`);
    return 'system';
  }
  try { await loadKokoro(); return 'kokoro'; } catch (e) {
    console.warn(`Kokoro could not load (${e.message.split('\n')[0]}). Using the system voice.\n` +
      `  If huggingface.co is blocked here, put the model files in ${path.join(MODELS_DIR, KOKORO_MODEL)}`);
    kokoroPromise = null;
    return 'system';
  }
}

// ---------------------------------------------------------------- timing
async function buildTimeline(spec, opts, ffmpegPath) {
  const cacheDir = path.join(os.tmpdir(), 'vector-video-cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const all = [];
  spec.scenes.forEach((scene) => { scene._segs = segmentsOf(scene); all.push(...scene._segs.map((g) => ({ g, scene }))); });

  const jobs = [];
  if (opts.audio) {
    const engine = await pickEngine(spec, opts);
    let warned = false;
    for (const { g, scene } of all) {
      if (!g.say || !String(g.say).trim()) continue;
      let voice = g.voice || scene.voice || spec.voice || null;
      if (engine === 'kokoro' && !/^[a-z]{2}_[a-z]+$/.test(voice || '')) {
        if (voice && !warned) { console.warn(`"${voice}" is not a Kokoro voice; using ${KOKORO_DEFAULT_VOICE}. Kokoro voices look like af_heart, am_michael, bf_emma.`); warned = true; }
        voice = KOKORO_DEFAULT_VOICE;
      }
      const rate = g.rate ?? scene.rate ?? spec.rate ?? 0;
      const key = engine === 'kokoro' ? ['kokoro', voice, rate, g.say] : [process.platform, voice, rate, g.say];
      g._wav = path.join(cacheDir, hash(key.join('|')) + '.wav');
      if (!fs.existsSync(g._wav) && !jobs.some((j) => j.out === g._wav)) jobs.push({ text: String(g.say), out: g._wav, voice, rate });
    }
    if (jobs.length) console.log(`Speaking ${jobs.length} narration line(s) with ${engine === 'kokoro' ? 'Kokoro' : 'the system voice'}...`);
    if (engine === 'kokoro') await synthesizeKokoro(jobs, ffmpegPath);
    else if (synthesize(jobs, ffmpegPath) === false) {
      console.warn('No speech engine found (install espeak-ng on Linux). Making the video WITHOUT a voice; scene lengths are guessed from word counts.');
      for (const { g } of all) delete g._wav;
    }
  }

  let t0 = 0;
  spec.scenes.forEach((scene, si) => {
    let t = scene.leadIn ?? spec.leadIn;
    const gap = scene.gap ?? spec.gap;
    let lastGap = 0;
    scene._segs.forEach((g) => {
      if (g.at != null) t = Math.max(t, Number(g.at));
      g.start = t;
      if (g._wav) { g._pcm = readWav(g._wav); g.dur = g._pcm.length / RATE; }
      else if (g.say) g.dur = String(g.say).split(/\s+/).filter(Boolean).length / 2.6;
      else g.dur = 0;
      t += g.dur; g.end = t;
      lastGap = g.pause ?? (g.say ? gap : 0);
      t += lastGap;
    });
    const spoken = scene._segs.length ? t - lastGap + (scene.tail ?? spec.tail) : 0;
    let dur = Math.max(spoken, scene.minDuration || 0, scene.duration || 0);
    if (scene.duration && scene.duration < spoken) console.warn(`Scene ${si + 1}: duration ${scene.duration}s is shorter than its narration; using ${spoken.toFixed(2)}s.`);
    if (!dur) dur = 3;
    scene._start = t0; scene._dur = dur; t0 += dur;
  });
  spec._total = t0;
}

function resolveTime(v, scene) {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  const s = String(v).trim();
  let m = s.match(/^(-?[\d.]+)%$/);
  if (m) return scene._dur * parseFloat(m[1]) / 100;
  m = s.match(/^@([A-Za-z0-9_]+)(\.end)?\s*((?:[+-]\s*[\d.]+\s*)*)$/);
  if (m) {
    const off = (m[3].replace(/\s+/g, '').match(/[+-][\d.]+/g) || []).reduce((sum, v) => sum + parseFloat(v), 0);
    if (m[1] === 'end') return scene._dur + off;
    let seg = /^\d+$/.test(m[1]) ? scene._segs[parseInt(m[1], 10)] : scene._segs.find((g) => g.cue === m[1]);
    if (!seg) throw new Error(`Unknown cue "${s}" in a scene with ${scene._segs.length} narration line(s).`);
    return (m[2] ? seg.end : seg.start) + off;
  }
  const n = parseFloat(s);
  if (Number.isNaN(n)) throw new Error('Bad time value: ' + s);
  return n;
}

// ---------------------------------------------------------------- animation
const EASE = {
  linear: (x) => x,
  in: (x) => x * x * x,
  out: (x) => 1 - Math.pow(1 - x, 3),
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  back: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};

function parseColor(c) {
  if (typeof c !== 'string') return null;
  let m = c.match(/^#([0-9a-f]{3})$/i);
  if (m) return m[1].split('').map((h) => parseInt(h + h, 16));
  m = c.match(/^#([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  return null;
}
function hex(rgb) { return '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join(''); }

function lerp(a, b, f) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * f;
  const ca = parseColor(a), cb = parseColor(b);
  if (ca && cb) return hex(ca.map((v, i) => v + (cb[i] - v) * f));
  return f > 0 ? b : a;
}

const ENTRANCE = { fade: 0.35, pop: 0.45, up: 0.45, type: null, draw: 0.8 };

function prepare(el, scene) {
  if (el._tw && el._twScene === scene) return;
  const tw = [];
  const base = {};
  const add = (spec, props) => {
    const start = resolveTime(spec.t ?? spec.at ?? 0, scene);
    tw.push({ start, end: start + Math.max(0, spec.dur ?? 0.4), ease: EASE[spec.ease || 'inOut'] || EASE.inOut, props });
  };
  if (el.appear != null) {
    const a = typeof el.appear === 'object' ? el.appear : { t: el.appear };
    const fx = a.effect || 'fade';
    const opa = el.opacity ?? 1;
    base.opacity = 0;
    let dur = a.dur ?? ENTRANCE[fx] ?? 0.35;
    if (fx === 'type') { base.reveal = 0; dur = a.dur ?? Math.max(0.3, String(el.text || '').length * 0.045); add({ t: a.t, dur: 0.01 }, { opacity: opa }); add({ t: a.t, dur, ease: 'linear' }, { reveal: el.reveal ?? 1 }); }
    else if (fx === 'draw') { base.draw = 0; add({ t: a.t, dur: 0.01 }, { opacity: opa }); add({ t: a.t, dur, ease: a.ease || 'inOut' }, { draw: el.draw ?? 1 }); }
    else {
      add({ t: a.t, dur, ease: a.ease || 'out' }, { opacity: opa });
      if (fx === 'pop') { base.scale = 0.5; add({ t: a.t, dur, ease: 'back' }, { scale: el.scale ?? 1 }); }
      if (fx === 'up') { base.dy = (el.dy ?? 0) + 24; add({ t: a.t, dur, ease: 'out' }, { dy: el.dy ?? 0 }); }
    }
  }
  for (const k of el.keyframes || el.animate || []) {
    const props = {};
    for (const [key, val] of Object.entries(k)) if (!['t', 'at', 'dur', 'ease'].includes(key)) props[key] = val;
    add(k, props);
  }
  if (el.disappear != null) {
    const d = typeof el.disappear === 'object' ? el.disappear : { t: el.disappear };
    add({ t: d.t, dur: d.dur ?? 0.3, ease: 'in' }, { opacity: 0 });
  }
  tw.sort((a, b) => a.start - b.start);
  el._tw = tw; el._base = base; el._twScene = scene;
}

function stateAt(el, t, scene) {
  prepare(el, scene);
  const p = Object.assign({}, el, el._base);
  for (const w of el._tw) {
    if (t < w.start) continue;
    const f = w.end > w.start ? Math.min(1, (t - w.start) / (w.end - w.start)) : 1;
    const e = w.ease(f);
    for (const [k, v] of Object.entries(w.props)) p[k] = f >= 1 ? v : lerp(p[k], v, e);
  }
  return p;
}

// ---------------------------------------------------------------- svg building
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (v) => (Math.round(v * 100) / 100).toString();

function attrs(o) {
  let s = '';
  for (const [k, v] of Object.entries(o)) if (v != null && v !== '') s += ` ${k}="${typeof v === 'number' ? num(v) : esc(v)}"`;
  return s;
}

function paintAttrs(p, defFill) {
  const draw = p.draw != null && p.draw < 1;
  return {
    fill: p.fill ?? defFill,
    stroke: p.stroke ?? (p.color && defFill === 'none' ? p.color : undefined),
    'stroke-width': p.strokeWidth ?? p.width ?? (p.stroke || defFill === 'none' ? 2 : undefined),
    'stroke-linecap': p.cap ?? 'round',
    'stroke-linejoin': 'round',
    'stroke-dasharray': draw ? `${num(p._len)} ${num(p._len)}` : (p.dash ?? undefined),
    'stroke-dashoffset': draw ? num(p._len * (1 - Math.max(0, p.draw))) : undefined,
  };
}

function pathLength(d) {
  const tok = String(d).match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, len = 0;
  const n = () => parseFloat(tok[i++]);
  const seg = (pts) => { let px = x, py = y; for (let s = 1; s <= 16; s++) { const [qx, qy] = pts(s / 16); len += Math.hypot(qx - px, qy - py); px = qx; py = qy; } };
  while (i < tok.length) {
    if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
    const rel = cmd === cmd.toLowerCase(); const C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') { len += Math.hypot(sx - x, sy - y); x = sx; y = sy; continue; }
    if (i >= tok.length) break;
    if (C === 'M') { x = ox + n(); y = oy + n(); sx = x; sy = y; cmd = rel ? 'l' : 'L'; }
    else if (C === 'L' || C === 'T') { const nx = ox + n(), ny = oy + n(); len += Math.hypot(nx - x, ny - y); x = nx; y = ny; }
    else if (C === 'H') { const nx = ox + n(); len += Math.abs(nx - x); x = nx; }
    else if (C === 'V') { const ny = oy + n(); len += Math.abs(ny - y); y = ny; }
    else if (C === 'C') { const a = [ox + n(), oy + n(), ox + n(), oy + n(), ox + n(), oy + n()]; const X = x, Y = y; seg((t) => { const u = 1 - t; return [u * u * u * X + 3 * u * u * t * a[0] + 3 * u * t * t * a[2] + t * t * t * a[4], u * u * u * Y + 3 * u * u * t * a[1] + 3 * u * t * t * a[3] + t * t * t * a[5]]; }); x = a[4]; y = a[5]; }
    else if (C === 'S' || C === 'Q') { const a = [ox + n(), oy + n(), ox + n(), oy + n()]; const X = x, Y = y; seg((t) => { const u = 1 - t; return [u * u * X + 2 * u * t * a[0] + t * t * a[2], u * u * Y + 2 * u * t * a[1] + t * t * a[3]]; }); x = a[2]; y = a[3]; }
    else if (C === 'A') { n(); n(); n(); n(); n(); const nx = ox + n(), ny = oy + n(); len += Math.hypot(nx - x, ny - y) * 1.2; x = nx; y = ny; }
    else i++;
  }
  return len || 1;
}

function textSvg(p, spec, extra = {}) {
  let text = String(p.text ?? '');
  if (p.reveal != null && p.reveal < 1) text = Array.from(text).slice(0, Math.round(Array.from(text).length * Math.max(0, p.reveal))).join('');
  const size = p.size ?? 32;
  const a = Object.assign({
    x: p.x ?? 0, y: p.y ?? 0,
    'font-family': p.mono ? spec.mono : (p.font ?? spec.font),
    'font-size': size,
    'font-weight': p.weight ?? (p.bold ? 'bold' : undefined),
    'font-style': p.italic ? 'italic' : undefined,
    'text-anchor': { left: 'start', center: 'middle', right: 'end' }[p.align] ?? p.anchor ?? 'start',
    'dominant-baseline': p.valign === 'middle' ? 'central' : (p.valign === 'top' ? 'hanging' : undefined),
    'letter-spacing': p.letterSpacing,
    fill: p.fill ?? p.color ?? spec.color,
    stroke: p.stroke, 'stroke-width': p.strokeWidth,
  }, extra);
  const lines = text.split('\n');
  if (lines.length === 1) return `<text xml:space="preserve"${attrs(a)}>${esc(text)}</text>`;
  const lh = (p.lineHeight ?? 1.3) * size;
  return `<text xml:space="preserve"${attrs(a)}>` + lines.map((l, i) => `<tspan x="${num(a.x)}" dy="${i ? num(lh) : 0}">${esc(l) || ' '}</tspan>`).join('') + '</text>';
}

function origin(p) {
  if (p.origin) return p.origin;
  switch (p.type) {
    case 'rect': case 'box': return [(p.x ?? 0) + (p.w ?? 0) / 2, (p.y ?? 0) + (p.h ?? 0) / 2];
    case 'circle': case 'ellipse': return [p.cx ?? 0, p.cy ?? 0];
    case 'text': return [p.x ?? 0, p.y ?? 0];
    case 'line': case 'arrow': return [((p.x1 ?? 0) + (p.x2 ?? 0)) / 2, ((p.y1 ?? 0) + (p.y2 ?? 0)) / 2];
    default: return [0, 0];
  }
}

function elementSvg(el, t, scene, spec) {
  const p = stateAt(el, t, scene);
  if (p.visible === false) return '';
  const opacity = p.opacity ?? 1;
  if (opacity <= 0.001) return '';
  let body = '';
  switch (p.type) {
    case 'rect':
      body = `<rect${attrs(Object.assign({ x: p.x ?? 0, y: p.y ?? 0, width: Math.max(0, p.w ?? 0), height: Math.max(0, p.h ?? 0), rx: p.rx }, paintAttrs(p, '#334155')))}/>`; break;
    case 'circle':
      body = `<circle${attrs(Object.assign({ cx: p.cx ?? 0, cy: p.cy ?? 0, r: Math.max(0, p.r ?? 10) }, paintAttrs(p, '#38bdf8')))}/>`; break;
    case 'ellipse':
      body = `<ellipse${attrs(Object.assign({ cx: p.cx ?? 0, cy: p.cy ?? 0, rx: Math.max(0, p.rx ?? 10), ry: Math.max(0, p.ry ?? 10) }, paintAttrs(p, '#38bdf8')))}/>`; break;
    case 'line': {
      p._len = Math.hypot((p.x2 ?? 0) - (p.x1 ?? 0), (p.y2 ?? 0) - (p.y1 ?? 0)) || 1;
      body = `<line${attrs(Object.assign({ x1: p.x1 ?? 0, y1: p.y1 ?? 0, x2: p.x2 ?? 0, y2: p.y2 ?? 0 }, paintAttrs(Object.assign({}, p, { stroke: p.stroke ?? p.color ?? spec.color }), 'none')))}/>`; break;
    }
    case 'arrow': {
      const x1 = p.x1 ?? 0, y1 = p.y1 ?? 0, f = p.draw ?? 1;
      const x2 = x1 + ((p.x2 ?? 0) - x1) * f, y2 = y1 + ((p.y2 ?? 0) - y1) * f;
      const L = Math.hypot(x2 - x1, y2 - y1); if (L < 0.5) break;
      const col = p.color ?? p.stroke ?? spec.color, w = p.width ?? p.strokeWidth ?? 4, hs = p.head ?? Math.max(16, w * 4);
      const ux = (x2 - x1) / L, uy = (y2 - y1) / L, bx = x2 - ux * hs, by = y2 - uy * hs;
      body = `<line${attrs({ x1, y1, x2: bx + ux * 1, y2: by + uy * 1, stroke: col, 'stroke-width': w, 'stroke-linecap': 'round' })}/>` +
        `<polygon${attrs({ points: `${num(x2)},${num(y2)} ${num(bx - uy * hs * 0.55)},${num(by + ux * hs * 0.55)} ${num(bx + uy * hs * 0.55)},${num(by - ux * hs * 0.55)}`, fill: col })}/>`;
      break;
    }
    case 'path':
      if (p.draw != null) p._len = p.length ?? (el._len ??= pathLength(p.d));
      body = `<path${attrs(Object.assign({ d: p.d }, paintAttrs(p, p.stroke ? 'none' : '#38bdf8')))}/>`; break;
    case 'polygon': case 'polyline': {
      const pts = (p.points || []).map((q) => (Array.isArray(q) ? q.map(num).join(',') : q)).join(' ');
      body = `<${p.type}${attrs(Object.assign({ points: pts }, paintAttrs(p, p.type === 'polyline' ? 'none' : '#38bdf8')))}/>`; break;
    }
    case 'text':
      body = textSvg(p, spec); break;
    case 'box': {
      const x = p.x ?? 0, y = p.y ?? 0, w = p.w ?? 80, h = p.h ?? 80;
      body = `<rect${attrs(Object.assign({ x, y, width: w, height: h, rx: p.rx ?? 10 }, paintAttrs(Object.assign({}, p, { stroke: p.stroke ?? '#94a3b8', strokeWidth: p.strokeWidth ?? 3 }), '#1e293b')))}/>`;
      if (p.text != null && p.text !== '') body += textSvg({ text: p.text, x: x + w / 2, y: y + h / 2, size: p.size ?? Math.round(h * 0.5), align: 'center', valign: 'middle', fill: p.textColor ?? spec.color, weight: p.weight ?? 'bold', mono: p.mono, font: p.font, reveal: p.reveal }, spec);
      break;
    }
    case 'code': {
      const size = p.size ?? 26, lh = (p.lineHeight ?? 1.45) * size, x = p.x ?? 0, y = p.y ?? 0;
      const lines = p.lines || [];
      const w = p.w ?? 640;
      if (p.panel !== false) body += `<rect${attrs({ x: x - 24, y: y - 20, width: w, height: lines.length * lh + 40, rx: 14, fill: p.panelColor ?? '#111827', stroke: '#334155', 'stroke-width': 2 })}/>`;
      const hl = [].concat(p.highlight ?? []).filter((v) => typeof v === 'number' && v >= 0);
      for (const h of hl) body += `<rect${attrs({ x: x - 12, y: y + h * lh, width: w - 24, height: lh, rx: 6, fill: p.highlightColor ?? '#facc15', opacity: p.highlightOpacity ?? 0.22 })}/>`;
      lines.forEach((ln, i) => {
        const o = typeof ln === 'string' ? { text: ln } : ln;
        body += textSvg({ text: o.text, x, y: y + i * lh + lh / 2, size, valign: 'middle', mono: true, fill: o.color ?? p.color ?? spec.color, weight: o.bold ? 'bold' : undefined, reveal: (p.reveal != null ? Math.max(0, Math.min(1, p.reveal * lines.length - i)) : undefined) }, spec);
      });
      break;
    }
    case 'group':
      body = (p.children || []).map((c) => elementSvg(c, t, scene, spec)).join('');
      if (p.x || p.y) body = `<g transform="translate(${num(p.x || 0)} ${num(p.y || 0)})">${body}</g>`;
      break;
    case 'svg':
      body = String(p.svg ?? p.markup ?? '');
      if (/<\s*(image|foreignObject|use)\b|href\s*=/i.test(body)) throw new Error('"svg" elements must be pure vector markup: no <image>, <use>, <foreignObject> or links.');
      if (p.x || p.y) body = `<g transform="translate(${num(p.x || 0)} ${num(p.y || 0)})">${body}</g>`;
      break;
    default:
      throw new Error('Unknown element type: ' + p.type);
  }
  if (!body) return '';
  const tf = [];
  if (p.dx || p.dy) tf.push(`translate(${num(p.dx || 0)} ${num(p.dy || 0)})`);
  const s = p.scale ?? 1, r = p.rotate ?? 0;
  if (s !== 1 || r) {
    const [ox, oy] = origin(p);
    tf.push(`translate(${num(ox)} ${num(oy)})`); if (r) tf.push(`rotate(${num(r)})`); if (s !== 1) tf.push(`scale(${num(Math.max(0.0001, s))})`); tf.push(`translate(${num(-ox)} ${num(-oy)})`);
  }
  if (tf.length || opacity < 1) return `<g${attrs({ transform: tf.join(' ') || undefined, opacity: opacity < 1 ? opacity : undefined })}>${body}</g>`;
  return body;
}

function captionSvg(text, cap, spec) {
  const W = spec.width, H = spec.height, size = cap.size ?? 26, cw = size * 0.52;
  const max = Math.max(10, Math.floor((W - 160) / cw));
  const lines = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last != null && (last + ' ' + word).length <= max) lines[lines.length - 1] = last + ' ' + word; else lines.push(word);
  }
  const lh = size * 1.3, padX = 22, padY = 10;
  const boxW = Math.min(W - 40, Math.max(...lines.map((l) => l.length)) * cw + padX * 2);
  const boxH = lines.length * lh + padY * 2;
  const y0 = (cap.y ?? H - 20) - boxH;
  let s = `<rect${attrs({ x: (W - boxW) / 2, y: y0, width: boxW, height: boxH, rx: 10, fill: cap.background ?? '#000000', opacity: cap.backgroundOpacity ?? 0.6 })}/>`;
  lines.forEach((l, i) => { s += textSvg({ text: l, x: W / 2, y: y0 + padY + lh * i + lh / 2, size, align: 'center', valign: 'middle', fill: cap.color ?? '#ffffff' }, spec); });
  return s;
}

function frameSvg(spec, scene, t, globalT) {
  const W = spec.width, H = spec.height;
  const fade = scene.fade ?? spec.fade;
  let k = 1;
  if (fade > 0) k = Math.min(1, t / fade, (scene._dur - t) / fade);
  k = Math.max(0, k);
  let inner = (scene.elements || []).map((el) => elementSvg(el, t, scene, spec)).join('');
  const cap = scene.captions ?? spec.captions;
  if (cap) {
    const seg = scene._segs.find((g) => g.say && t >= g.start - 0.05 && t < g.end + 0.25);
    if (seg) inner += captionSvg(String(seg.caption ?? seg.say), typeof cap === 'object' ? cap : {}, spec);
  }
  const over = (spec.overlay || []).map((el) => elementSvg(el, globalT, spec._overlayScene, spec)).join('');
  const bg = scene.background ?? spec.background;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="${esc(bg)}"/>` +
    (k < 1 ? `<g opacity="${num(k)}">${inner}</g>` : inner) + over + '</svg>';
}

function locate(spec, T) {
  for (const sc of spec.scenes) if (T < sc._start + sc._dur) return { scene: sc, t: Math.max(0, T - sc._start) };
  const last = spec.scenes[spec.scenes.length - 1];
  return { scene: last, t: last._dur };
}

function fontOptions(spec) {
  const files = [...(spec.fonts || [])];
  if (process.platform === 'win32') {
    const dir = path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts');
    for (const f of ['segoeui.ttf', 'segoeuib.ttf', 'segoeuii.ttf', 'seguisb.ttf', 'consola.ttf', 'consolab.ttf', 'arial.ttf', 'arialbd.ttf', 'seguisym.ttf']) {
      const p = path.join(dir, f); if (fs.existsSync(p)) files.push(p);
    }
  }
  return { fontFiles: files, loadSystemFonts: process.platform !== 'win32' || !files.length, defaultFontFamily: spec.font };
}

function printTimeline(spec) {
  console.log(`\nTotal length: ${spec._total.toFixed(2)} s`);
  spec.scenes.forEach((sc, i) => {
    console.log(`Scene ${i + 1}${sc.name ? ' "' + sc.name + '"' : ''}: starts ${sc._start.toFixed(2)} s, lasts ${sc._dur.toFixed(2)} s`);
    sc._segs.forEach((g, j) => console.log(`   @${j}${g.cue ? ' (@' + g.cue + ')' : ''}  ${g.start.toFixed(2)}-${g.end.toFixed(2)}  ${g.say ? JSON.stringify(String(g.say).slice(0, 60)) : '(pause)'}`));
  });
}

// ---------------------------------------------------------------- main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.positional.length) {
    console.log('Usage: node render.js <scene.json|scene.js> [out.mp4] [--stills 3,2@1.5] [--video] [--no-audio] [--scale 0.5] [--timeline] [--tts auto|kokoro|system]');
    process.exit(args.help ? 0 : 1);
  }
  const { Resvg } = need('@resvg/resvg-js');
  const ffmpegPath = process.env.FFMPEG_PATH || need('ffmpeg-static');
  const specFile = args.positional[0];
  const out = path.resolve(args.positional[1] || specFile.replace(/\.(json|c?js)$/i, '') + '.mp4');
  const spec = loadSpec(specFile);

  await buildTimeline(spec, args, ffmpegPath);
  spec._overlayScene = { _dur: spec._total, _segs: [] };
  printTimeline(spec);
  if (args.timeline) return;

  const scale = args.scale > 0 ? args.scale : 1;
  const W = Math.round(spec.width * scale / 2) * 2, H = Math.round(spec.height * scale / 2) * 2;
  const ropts = { font: fontOptions(spec), fitTo: { mode: 'width', value: W }, background: spec.background };
  const render = (svg) => new Resvg(svg, ropts).render();

  if (args.stills) {
    const dir = path.resolve(args.stillsDir || out.replace(/\.mp4$/i, '') + '-stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const item of String(args.stills).split(',').map((s) => s.trim()).filter(Boolean)) {
      let scene, t, T;
      const m = item.match(/^(\d+)@(.+)$/);
      if (m) { scene = spec.scenes[parseInt(m[1], 10) - 1]; if (!scene) throw new Error('No scene ' + m[1]); t = resolveTime(m[2], scene); T = scene._start + t; }
      else { T = parseFloat(item); ({ scene, t } = locate(spec, T)); }
      const file = path.join(dir, `still-${T.toFixed(2).replace('.', '_')}s.png`);
      fs.writeFileSync(file, render(frameSvg(spec, scene, t, T)).asPng());
      console.log('Saved ' + file);
    }
    if (!args.video) return;
  }

  const fps = spec.fps;
  const total = Math.max(1, Math.round(spec._total * fps));
  const audioFile = out.replace(/\.mp4$/i, '') + `.vv-audio-${process.pid}.wav`;
  const pcm = new Int16Array(Math.ceil((total / fps) * RATE) + RATE);
  for (const sc of spec.scenes) for (const g of sc._segs) if (g._pcm) {
    const at = Math.round((sc._start + g.start) * RATE);
    for (let i = 0; i < g._pcm.length && at + i < pcm.length; i++) pcm[at + i] = g._pcm[i];
  }
  writeWav(audioFile, pcm.subarray(0, Math.ceil((total / fps) * RATE)));

  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ff = spawn(ffmpegPath, ['-y', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-framerate', String(fps), '-i', 'pipe:0',
    '-i', audioFile, '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => { ff.on('error', rej); ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited with code ' + c)))); });

  let prevSvg = null, prevPix = null;
  const started = Date.now();
  for (let f = 0; f < total; f++) {
    const T = f / fps;
    const { scene, t } = locate(spec, T);
    const svg = frameSvg(spec, scene, t, T);
    if (svg !== prevSvg) { prevPix = render(svg).pixels; prevSvg = svg; }
    if (!ff.stdin.write(prevPix)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % (fps * 5) === 0) process.stdout.write(`\rFrame ${f + 1}/${total}`);
  }
  ff.stdin.end();
  await done;
  fs.rmSync(audioFile, { force: true });
  console.log(`\rRendered ${total} frames in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  console.log('Video saved: ' + out);
}

main().catch((e) => { console.error('Error: ' + (e && e.message ? e.message : e)); process.exit(1); });
