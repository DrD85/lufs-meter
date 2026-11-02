// Model experiment of the LUFS Meter (see ../../Lautheit-Untersuchung.md): synthetic guitar through five amp sketches
// (Clean, Edge, Drive, Fuzz, Lead) and a cab, all set to the same LUFS; then how loud they are by level-dependent
// loudness models at home (quiet) and rehearsal levels.   node model.js   (PICK_HZ=600 node model.js: a darker guitar)
const fs = require('fs');
const { spl, phonOf, sone } = require('./iso226');
const RATE = 48000;
const SECONDS = 16;
const N = RATE * SECONDS;

// ---- RBJ biquads ----
function biquad(type, f, q, gainDb = 0) {
  const w = 2 * Math.PI * f / RATE, cw = Math.cos(w), sw = Math.sin(w), A = Math.pow(10, gainDb / 40), al = sw / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else if (type === 'peak') { b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; }
  else if (type === 'ls') { const s = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) - (A - 1) * cw + s); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - s); a0 = (A + 1) + (A - 1) * cw + s; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - s; }
  else if (type === 'hs') { const s = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) + (A - 1) * cw + s); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - s); a0 = (A + 1) - (A - 1) * cw + s; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - s; }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}
function filter(x, ...filters) {
  let y = x;
  for (const c of filters) {
    const out = new Float64Array(y.length);
    let z1 = 0, z2 = 0;
    for (let i = 0; i < y.length; i++) { const v = y[i]; const o = c.b0 * v + z1; z1 = c.b1 * v - c.a1 * o + z2; z2 = c.b2 * v - c.a2 * o; out[i] = o; }
    y = out;
  }
  return y;
}
const map = (x, fn) => { const y = new Float64Array(x.length); for (let i = 0; i < x.length; i++) y[i] = fn(x[i]); return y; };
const gain = (x, g) => map(x, v => v * g);

// ---- K-weighting and BS.1770 gated loudness (the helper's coefficients) ----
function kCoeffs() {
  let k = Math.tan(Math.PI * 1681.974450955533 / RATE), q = 0.7071752369554196;
  const vh = Math.pow(10, 3.999843853973347 / 20), vb = Math.pow(vh, 0.4996667741545416);
  let a0 = 1 + k / q + k * k;
  const shelf = { b0: (vh + vb * k / q + k * k) / a0, b1: 2 * (k * k - vh) / a0, b2: (vh - vb * k / q + k * k) / a0, a1: 2 * (k * k - 1) / a0, a2: (1 - k / q + k * k) / a0 };
  k = Math.tan(Math.PI * 38.13547087602444 / RATE); q = 0.5003270373238773; a0 = 1 + k / q + k * k;
  const hp = { b0: 1, b1: -2, b2: 1, a1: 2 * (k * k - 1) / a0, a2: (1 - k / q + k * k) / a0 };
  return [shelf, hp];
}
const K = kCoeffs();
const lufsOf = e => -0.691 + 10 * Math.log10(e);
function blocks(x, win, hop) {   // mean square of the K-weighted signal per window
  const y = filter(x, ...K), out = [];
  for (let s = 0; s + win <= y.length; s += hop) { let e = 0; for (let i = s; i < s + win; i++) e += y[i] * y[i]; out.push(e / win); }
  return out;
}
// mono signal counted as two identical channels (stereo out of the Nano: both channels the same)
function integrated(x) {
  const b = blocks(x, RATE * 0.4, RATE * 0.1).map(e => 2 * e);
  let kept = b.filter(e => lufsOf(e) > -70);
  const gate = lufsOf(kept.reduce((a, c) => a + c, 0) / kept.length) - 10;
  kept = kept.filter(e => lufsOf(e) > gate);
  return lufsOf(kept.reduce((a, c) => a + c, 0) / kept.length);
}
const shortTerm = x => blocks(x, RATE * 3, RATE * 0.1).map(e => lufsOf(2 * e));
const momentary = x => blocks(x, RATE * 0.4, RATE * 0.1).map(e => lufsOf(2 * e));
const pct = (list, p) => { const s = list.filter(Number.isFinite).sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

// ---- a guitar: Karplus-Strong strings, pick and pickup ----
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
const PICK_HZ = Number(process.env.PICK_HZ || 900);
const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);
function pluck(out, start, midi, amp, length, damp = 0.996) {
  const period = RATE / hz(midi), n = Math.floor(period), frac = period - n;
  const line = new Float64Array(n + 2);
  // a soft pick: the noise burst through a one-pole low pass at about 1.2 kHz
  let lp = 0, lp2 = 0; const c = Math.exp(-2 * Math.PI * PICK_HZ / RATE);
  for (let i = 0; i < line.length; i++) { lp = (1 - c) * rnd() + c * lp; lp2 = (1 - c) * lp + c * lp2; line[i] = lp2 * amp * 6; }
  // pick position ~1/5 of the string: comb on the excitation
  const pick = Math.max(1, Math.round(n / 5));
  for (let i = line.length - 1; i >= pick; i--) line[i] -= 0.8 * line[i - pick];
  let idx = 0, prev = 0;
  const end = Math.min(out.length, start + Math.floor(length * RATE));
  const fade = Math.floor(0.03 * RATE);
  for (let t = start; t < end; t++) {
    const a = line[idx], b = line[(idx + 1) % line.length];
    const v = damp * (0.5 * (a + b) * (1 - frac * 0.5) + prev * frac * 0.5);
    prev = a;
    line[idx] = v;
    idx = (idx + 1) % line.length;
    const env = end - t < fade ? (end - t) / fade : 1;
    out[t] += a * env;
  }
}
// open chords strummed in eighths at 100 bpm (down / up), accents on the beat
const CHORDS = { Em: [40, 47, 52, 55, 59, 64], C: [48, 52, 55, 60, 64], G: [43, 47, 50, 55, 59, 67], D: [50, 57, 62, 66] };
const POWER = { E5: [40, 47, 52], G5: [43, 50, 55], A5: [45, 52, 57], D5: [38, 45, 50] };
function rhythm(set) {
  const x = new Float64Array(N);
  const names = Object.keys(set), eighth = 60 / 100 / 2;
  for (let k = 0, t = 0.2; t < SECONDS - 0.5; k++, t += eighth) {
    const chord = set[names[Math.floor(k / 8) % names.length]];
    const down = k % 2 === 0, accent = k % 4 === 0 ? 1 : down ? 0.8 : 0.6;
    const strings = down ? chord : chord.slice().reverse().slice(0, Math.max(3, chord.length - 2));
    strings.forEach((m, i) => pluck(x, Math.floor((t + i * 0.007 + rnd() * 0.002) * RATE), m, 0.25 * accent * (0.9 + 0.2 * rnd()), eighth * 0.98, 0.997));
  }
  return x;
}
// lead line: eighths and held notes on the high strings
function lead() {
  const x = new Float64Array(N);
  const line = [64, 67, 69, 71, 74, 71, 69, 67, 76, 74, 71, 69, 71, 72, 71, 69];
  const lengths = [1, 1, 1, 1, 2, 1, 1, 2, 3, 1, 1, 1, 1, 1, 2, 4];
  const eighth = 60 / 100 / 2;
  for (let t = 0.2, k = 0; t < SECONDS - 0.5; k++) {
    const len = lengths[k % lengths.length] * eighth;
    pluck(x, Math.floor(t * RATE), line[k % line.length], 0.35 * (0.9 + 0.2 * rnd()), len * 0.99, 0.9993);
    t += len;
  }
  return x;
}
// pickup: humbucker-ish resonance about 3 kHz, roll-off above
const pickup = x => filter(x, biquad('hp', 70, 0.7), biquad('peak', 2500, 1.5, 3), biquad('lp', 5000, 0.9));

// ---- amp sketches ----
const tube = (x, drive, bias = 0.15) => map(x, v => Math.tanh(drive * v + bias) - Math.tanh(bias));
const hard = (x, drive) => map(x, v => { const u = Math.max(-1, Math.min(1, drive * v)); return 1.5 * u - 0.5 * u * u * u; });
const cab = x => filter(x, biquad('hp', 75, 1.0), biquad('peak', 110, 1.5, 3), biquad('peak', 400, 1.0, -3), biquad('peak', 2200, 1.2, 4),
  biquad('lp', 5500, 0.54), biquad('lp', 5500, 1.31));
const AMPS = {
  Clean: x => cab(filter(tube(x, 1.2, 0.05), biquad('ls', 120, 0.7, 2), biquad('peak', 500, 0.7, -5), biquad('hs', 2500, 0.7, 3))),
  Edge: x => cab(filter(tube(filter(x, biquad('hp', 90, 0.7)), 6), biquad('peak', 600, 0.8, -2), biquad('hs', 2000, 0.7, 2))),
  Drive: x => cab(filter(tube(filter(tube(filter(x, biquad('hp', 300, 0.7), biquad('peak', 800, 0.8, 6)), 40), biquad('hp', 150, 0.7)), 4),
    biquad('ls', 120, 0.7, 4), biquad('peak', 500, 0.8, -4), biquad('hs', 3000, 0.7, 1))),
  Fuzz: x => cab(filter(hard(filter(hard(filter(x, biquad('hp', 60, 0.7)), 60), biquad('lp', 6000, 0.7)), 8), biquad('peak', 1000, 0.6, -9))),
  Lead: x => cab(filter(tube(filter(tube(filter(x, biquad('hp', 300, 0.7), biquad('peak', 800, 0.8, 6)), 80), biquad('hp', 150, 0.7)), 4),
    biquad('ls', 120, 0.7, 3), biquad('peak', 500, 0.8, -3), biquad('peak', 900, 0.8, 3), biquad('hs', 3000, 0.7, 1)))
};

// ---- third-octave band levels (energy, dB re full scale) ----
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ur = re[i + j], ui = im[i + j], vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
const BANDS = [25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500];
function bands(x) {
  const size = 16384, hop = 8192, power = new Float64Array(size / 2);
  const win = Float64Array.from({ length: size }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / size));
  const wsum = win.reduce((a, w) => a + w * w, 0);
  let frames = 0;
  for (let s = 0; s + size <= x.length; s += hop, frames++) {
    const re = new Float64Array(size), im = new Float64Array(size);
    for (let i = 0; i < size; i++) re[i] = x[s + i] * win[i];
    fft(re, im);
    for (let k = 1; k < size / 2; k++) power[k] += 2 * (re[k] * re[k] + im[k] * im[k]) / (wsum * size);
  }
  return BANDS.map(fc => {
    const lo = fc / Math.pow(2, 1 / 6), hi = fc * Math.pow(2, 1 / 6);
    let e = 0;
    for (let k = Math.ceil(lo * size / RATE); k * RATE / size < hi && k < size / 2; k++) e += power[k] / frames;
    return e;
  });
}

// ---- level-dependent loudness from band energies (calibration: the K-weighted level of the sound in dB SPL) ----
// splOffset: dB SPL that 0 dB band energy relative to -X LUFS maps to.
// Zwicker-like grouping of the lowest third-octaves into critical bands (25-80 Hz, 100-160 Hz, 200-315 Hz).
const GROUPS = [[0, 5], [6, 8], [9, 11]];
function groupBands(levels) {   // levels in dB SPL per third-octave -> [{f, L}]
  const out = [];
  const used = new Set();
  for (const [a, b] of GROUPS) {
    let e = 0;
    for (let i = a; i <= b; i++) { e += Math.pow(10, levels[i] / 10); used.add(i); }
    out.push({ f: Math.sqrt(BANDS[a] * BANDS[b]), L: 10 * Math.log10(e) });
  }
  BANDS.forEach((f, i) => { if (!used.has(i)) out.push({ f, L: levels[i] }); });
  return out;
}
// full: every critical band adds its sones; stevens: the loudest band plus 0.15 of the rest (Stevens Mark VI, 1/3 oct)
function loudnessSones(levels, mode) {
  const s = groupBands(levels).map(b => sone(phonOf(b.f, b.L)));
  if (mode === 'full') return s.reduce((a, c) => a + c, 0);
  const max = Math.max(...s);
  return max + 0.15 * (s.reduce((a, c) => a + c, 0) - max);
}
// contour weighting: the inverse of the equal-loudness contour at the listening level, 0 dB at 1 kHz (A ~ 40 phon, C ~ 100 phon)
function contourLevel(levels, phon) {
  let e = 0;
  BANDS.forEach((f, i) => { e += Math.pow(10, (levels[i] - (spl(f, phon) - phon)) / 10); });
  return 10 * Math.log10(e);
}

// ---- run ----
const TARGET = -20;
const sounds = {};
const diRhythm = pickup(rhythm(CHORDS)), diPower = pickup(rhythm(POWER)), diLead = pickup(lead());
for (const [n, d] of [['DI chords', diRhythm], ['DI lead', diLead]]) { const y = gain(d, Math.pow(10, (TARGET - integrated(d)) / 20)); sounds[n] = y; }
const inputs = { Clean: diRhythm, Edge: diRhythm, Drive: diRhythm, Fuzz: diRhythm, Lead: diLead };
for (const [name, amp] of Object.entries(AMPS)) {
  let y = amp(inputs[name]);
  y = gain(y, Math.pow(10, (TARGET - integrated(y)) / 20));
  sounds[name] = y;
}
// variants: power chords for Drive / Fuzz, clean lead line
sounds['Drive (power chords)'] = (() => { const y = AMPS.Drive(diPower); return gain(y, Math.pow(10, (TARGET - integrated(y)) / 20)); })();
sounds['Fuzz (power chords)'] = (() => { const y = AMPS.Fuzz(diPower); return gain(y, Math.pow(10, (TARGET - integrated(y)) / 20)); })();
sounds['Clean lead line'] = (() => { const y = AMPS.Clean(diLead); return gain(y, Math.pow(10, (TARGET - integrated(y)) / 20)); })();

// write WAVs to listen / check with ffmpeg
function wav(file, x) {
  const buf = Buffer.alloc(44 + x.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + x.length * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(file, buf);
}
fs.mkdirSync('wav', { recursive: true });   // the sounds as WAV files, next to where it runs

// listening levels: the K-weighted level of the guitar at the ear, dB SPL ("LK" ~ dB(C) for these spectra)
const SCENES = { 'home 60': 60, 'home 70': 70, 'rehearsal 95': 95, 'rehearsal 105': 105 };
const result = {};
for (const [name, y] of Object.entries(sounds)) {
  wav('wav/' + name.replace(/[^A-Za-z]+/g, '_') + '.wav', y);
  const b = bands(y).map(e => 10 * Math.log10(e + 1e-30));
  // distribution of the energy: share below 250 Hz, 250 Hz - 1 kHz, 1 - 4 kHz, above
  const lin = b.map(l => Math.pow(10, l / 10)), tot = lin.reduce((a, c) => a + c, 0);
  const share = (lo, hi) => 10 * Math.log10(BANDS.reduce((a, f, i) => a + (f >= lo && f < hi ? lin[i] : 0), 0) / tot);
  let peak = 0; for (const v of y) peak = Math.max(peak, Math.abs(v));
  const mom = momentary(y), st = shortTerm(y);
  result[name] = { b, lufs: integrated(y), peak: 20 * Math.log10(peak), crest: 20 * Math.log10(peak) - TARGET,
    low: share(0, 250), mid: share(250, 1000), upper: share(1000, 4000), high: share(4000, 20000),
    mP90: pct(mom, 0.9) - TARGET, stP90: pct(st, 0.9) - TARGET, lra: pct(st, 0.95) - pct(st, 0.10) };
}
// the gain each sound needs to be as loud as Clean (by each model), at each listening level
function matchGain(b, ref, scene, model) {
  const at = (levels, g) => levels.map(l => l + g);
  const calib = SCENES[scene] - TARGET;   // band dB FS -> dB SPL
  const loud = (levels, g) => model === 'contour' ? contourLevel(at(levels, calib + g), SCENES[scene])
    : loudnessSones(at(levels, calib + g), model);
  const want = loud(ref, 0);
  let lo = -20, hi = 20;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (loud(b, mid) > want) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}
console.log('sound'.padEnd(22), 'LUFS  peak  <250  250-1k  1-4k  >4k   M-P90  S-P90  LRA');
for (const [name, r] of Object.entries(result)) {
  console.log(name.padEnd(22), [r.lufs, r.peak, r.low, r.mid, r.upper, r.high, r.mP90, r.stP90, r.lra].map(v => v.toFixed(1).padStart(5)).join(' '));
}
for (const model of ['contour', 'stevens', 'full']) {
  console.log('\nmodel: ' + model + ' - dB each sound needs relative to Clean to sound as loud (0 = equal LUFS is right)');
  console.log('sound'.padEnd(22), Object.keys(SCENES).map(s => s.padStart(14)).join(''));
  for (const name of Object.keys(result)) {
    console.log(name.padEnd(22), Object.keys(SCENES).map(s => matchGain(result[name].b, result.Clean.b, s, model).toFixed(1).padStart(14)).join(''));
  }
}
fs.writeFileSync('result.json', JSON.stringify(result, null, 1));
