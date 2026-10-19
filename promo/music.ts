// 合成宣传片的配乐，写到 public/music.wav：古筝一样的拨弦（Karplus-Strong）、五声音阶，音色偏柔、音量偏轻，
// 格子弹出时隔一个响一个音，庭每长一次响一个音；入夜时铺底的和声从 D 大调转到 B 小调，响一声钟。
// 全部是代码生成的，没有版权问题。用法：pnpm music（node 直接跑 TS）。

import { writeFileSync } from 'node:fs';
import { GROW, POP, T } from './src/theme.ts';

const SR = 44100;
const FPS = 30;
const length = Math.ceil((T.end / FPS + 0.5) * SR);
const L = new Float32Array(length);
const R = new Float32Array(length);

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const at = (frame: number) => Math.round((frame / FPS) * SR);

// 可重复的随机数：每次生成的都一样
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function add(start: number, samples: Float32Array, gain: number, pan: number) {
  const l = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const r = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < samples.length && start + i < length; i++) {
    L[start + i]! += samples[i]! * l;
    R[start + i]! += samples[i]! * r;
  }
}

/** 拨弦：一段噪声在延迟线里来回、每次平均一下，高频先衰减，听起来像拨弦 */
function pluck(midi: number, seconds = 2.6, brightness = 0.68) {
  const n = Math.round(SR / hz(midi));
  const line = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) line[i] = prev = prev * brightness + rand() * (1 - brightness);
  const out = new Float32Array(Math.round(seconds * SR));
  const decay = 0.9965;
  for (let i = 0; i < out.length; i++) {
    const j = i % n;
    const next = line[(j + 1) % n]!;
    out[i] = line[j]!;
    line[j] = ((line[j]! + next) / 2) * decay;
  }
  // 起音放轻：前 15 毫秒慢慢起来，不扎耳朵
  for (let i = 0; i < 660 && i < out.length; i++) out[i]! *= i / 660;
  return out;
}

/** 钟、铃：几个不成倍数的泛音，慢慢衰减 */
function bell(midi: number, seconds = 4) {
  const f = hz(midi);
  const out = new Float32Array(Math.round(seconds * SR));
  const partials: [number, number, number][] = [
    [1, 1, 1.6],
    [2.76, 0.45, 0.9],
    [5.4, 0.25, 0.5],
    [8.93, 0.12, 0.3],
  ];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [ratio, amp, life] of partials) v += amp * Math.exp(-t / life) * Math.sin(2 * Math.PI * f * ratio * t);
    out[i] = v * Math.min(1, t * 200);
  }
  return out;
}

/** 铺底的和声：几个略微走音的正弦，慢起慢收 */
function pad(chord: number[], from: number, to: number, gain: number) {
  const a = at(from);
  const b = at(to);
  const fade = 1.6 * SR;
  for (let i = a; i < b && i < length; i++) {
    const t = i / SR;
    const env = Math.min(1, (i - a) / fade, (b - i) / fade);
    let v = 0;
    chord.forEach((m, k) => {
      const f = hz(m);
      v += Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.003 * t + k);
    });
    v *= gain * env * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.25 * t));
    L[i]! += v;
    R[i]! += v;
  }
}

// ---------- 编排 ----------
const DAY = [50, 57, 62, 66]; // D 大调（D3 A3 D4 F#4）
const NIGHT = [47, 54, 59, 62]; // B 小调（B2 F#3 B3 D4）
pad(DAY, T.intro, T.dusk + 30, 0.016);
pad(NIGHT, T.dusk, T.end + 15, 0.018);

// 片头：太阳升起时一串上行，标题出来时落在高音
[62, 66, 69, 74].forEach((m, i) => add(at(T.intro + 10 + i * 10), pluck(m, 3), 0.22, -0.3 + i * 0.2));
add(at(T.open + 18), pluck(76, 2.4), 0.15, 0.3); // 推近时钟

// 格子一个个弹出：隔一个响一个音，一路缓缓上行
const pops = [62, 66, 71, 76, 62, 69, 74, 78];
pops.forEach((m, i) => add(at(POP.start + i * 2 * POP.step), pluck(m, 2.2), 0.15, ((i % 3) - 1) * 0.3));

// 入夜：一声低钟
add(at(T.dusk + 6), bell(62, 5), 0.09, 0);

// 庭每长一次一个音（B 小调五声），第 30 日石灯笼亮起时一声铃
const grow = [59, 62, 66, 69, 71, 74, 78];
GROW.days.forEach((_, i) => add(at(GROW.start + i * GROW.step), pluck(grow[i]!, 2.4), 0.18, ((i % 3) - 1) * 0.3));
add(at(GROW.start + (GROW.days.length - 1) * GROW.step + 2), bell(81, 4), 0.05, 0.2);

// 隐私三行
[74, 69, 66].forEach((m, i) => add(at(T.privacy + 6 + i * 12), pluck(m, 2.4), 0.15, (i - 1) * 0.3));

// 片尾：扫一个 D 大调和弦，再一声铃
[50, 57, 62, 66, 69].forEach((m, i) => add(at(T.outro + i * 3), pluck(m, 4), 0.17, -0.4 + i * 0.2));
add(at(T.outro + 12), bell(74, 4), 0.05, 0);

// ---------- 混响：几次衰减的回声，左右交错 ----------
const taps: [number, number][] = [
  [0.13, 0.2],
  [0.29, 0.13],
  [0.47, 0.08],
  [0.68, 0.05],
];
const dryL = L.slice();
const dryR = R.slice();
for (const [sec, g] of taps) {
  const d = Math.round(sec * SR);
  for (let i = d; i < length; i++) {
    L[i]! += dryR[i - d]! * g;
    R[i]! += dryL[i - d]! * g;
  }
}

// ---------- 收尾：开头淡入、结尾淡出，峰值归一到 -6 dB，写成 16 位立体声 WAV ----------
const end = at(T.end);
let peak = 0;
for (let i = 0; i < length; i++) {
  const fade = Math.min(1, i / (0.3 * SR), Math.max(0, (end - i) / (1.2 * SR)));
  L[i]! *= fade;
  R[i]! *= fade;
  peak = Math.max(peak, Math.abs(L[i]!), Math.abs(R[i]!));
}
const scale = 0.5 / peak;
const data = Buffer.alloc(length * 4);
for (let i = 0; i < length; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i]! * scale)) * 32767), i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i]! * scale)) * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);
writeFileSync(new URL('./public/music.wav', import.meta.url), Buffer.concat([header, data]));
console.log(`public/music.wav ${(length / SR).toFixed(1)}s`);
