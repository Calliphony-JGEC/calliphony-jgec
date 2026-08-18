function envGain(ctx, start, attack, decay, peak = 1) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  return gain;
}

function playKick(ctx, time, master) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(148, time);
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.18);
  gain.gain.setValueAtTime(1, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);
  osc.connect(gain);
  gain.connect(master);
  osc.start(time);
  osc.stop(time + 0.3);
}

function playSnare(ctx, time, master) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.18);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.6);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1200;
  const noiseGain = envGain(ctx, time, 0.005, 0.14, 0.55);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);

  const body = ctx.createOscillator();
  body.type = 'triangle';
  body.frequency.setValueAtTime(220, time);
  body.frequency.exponentialRampToValueAtTime(160, time + 0.08);
  const bodyGain = envGain(ctx, time, 0.004, 0.09, 0.22);
  body.connect(bodyGain);
  bodyGain.connect(master);

  noise.start(time);
  noise.stop(time + 0.18);
  body.start(time);
  body.stop(time + 0.12);
}

function playHat(ctx, time, master, open = false) {
  const bufferSize = Math.floor(ctx.sampleRate * (open ? 0.22 : 0.05));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  const gain = envGain(ctx, time, 0.002, open ? 0.18 : 0.04, open ? 0.22 : 0.16);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  noise.start(time);
  noise.stop(time + (open ? 0.22 : 0.05));
}

function playTom(ctx, time, master, freq) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, time);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.62, time + 0.16);
  gain.gain.setValueAtTime(0.45, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
  osc.connect(gain);
  gain.connect(master);
  osc.start(time);
  osc.stop(time + 0.24);
}

let sharedCtx = null;

function getCtx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioCtx();
  }
  return sharedCtx;
}

/** Short celebratory drum fill after a successful form submit. */
export async function playDrumSting() {
  const ctx = getCtx();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  const master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(ctx.destination);

  const t0 = ctx.currentTime + 0.02;
  const beat = 0.16;

  // Groove: kick / snare / hats, then a tom fill into a crash-like open hat
  playKick(ctx, t0, master);
  playHat(ctx, t0, master);
  playHat(ctx, t0 + beat, master);
  playSnare(ctx, t0 + beat * 2, master);
  playHat(ctx, t0 + beat * 2, master);
  playHat(ctx, t0 + beat * 3, master);

  playKick(ctx, t0 + beat * 4, master);
  playKick(ctx, t0 + beat * 4.5, master);
  playHat(ctx, t0 + beat * 4, master);
  playHat(ctx, t0 + beat * 5, master);
  playSnare(ctx, t0 + beat * 6, master);
  playHat(ctx, t0 + beat * 6, master);
  playHat(ctx, t0 + beat * 7, master);

  playTom(ctx, t0 + beat * 8, master, 220);
  playTom(ctx, t0 + beat * 8.5, master, 180);
  playTom(ctx, t0 + beat * 9, master, 145);
  playSnare(ctx, t0 + beat * 9.5, master);
  playKick(ctx, t0 + beat * 10, master);
  playHat(ctx, t0 + beat * 10, master, true);
  playSnare(ctx, t0 + beat * 10, master);
}
