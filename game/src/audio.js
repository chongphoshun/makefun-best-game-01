// Every sound is synthesised with WebAudio — no audio files, no network.
// A tiny sequencer plays a slow minor-pentatonic lantern melody over a low drone
// while the game runs; one-shots cover shooting, hits, pickups, waves and bosses.
export function createSound() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let muted = false;
  let stepIndex = 0;

  // A wandering melody the lantern hums: A minor pentatonic, slow and sparse.
  const MELODY = [220, 261.63, 293.66, 329.63, 392, 440, 392, 329.63, 293.66, 261.63, 220, 196];

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx !== null;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, low) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low || 1800;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  function musicStep() {
    if (!ctx || muted) return;
    const note = MELODY[stepIndex % MELODY.length];
    stepIndex += 1;
    // Drone under every fourth note, melody note above it, both quiet.
    if (stepIndex % 4 === 1) tone(110, 1.6, 'sine', 0.05, null, 0);
    tone(note, 0.9, 'triangle', 0.055, null, 0);
    if (stepIndex % 8 === 0) tone(note * 2, 0.5, 'sine', 0.03, null, 0.05);
  }

  return {
    unlock() { ensure(); },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.5;
    },
    isMuted() { return muted; },
    startMusic() {
      if (!ensure() || musicTimer) return;
      musicTimer = window.setInterval(musicStep, 620);
    },
    stopMusic() {
      if (musicTimer) { window.clearInterval(musicTimer); musicTimer = null; }
    },
    shoot() { tone(720 + Math.random() * 120, 0.09, 'square', 0.045, 320); },
    hit() { tone(190, 0.07, 'triangle', 0.07, 120); },
    kill() { noise(0.22, 0.16, 1200); tone(320, 0.25, 'sawtooth', 0.06, 60); },
    hurt() { tone(140, 0.3, 'sawtooth', 0.14, 55); noise(0.15, 0.1, 700); },
    dash() { noise(0.16, 0.1, 3200); },
    pickup() { tone(660, 0.12, 'sine', 0.09); tone(990, 0.18, 'sine', 0.08, null, 0.07); },
    firefly() { tone(880, 0.14, 'sine', 0.1); tone(1174, 0.2, 'sine', 0.09, null, 0.08); tone(1568, 0.24, 'sine', 0.06, null, 0.16); },
    waveHorn() { tone(196, 0.5, 'triangle', 0.12, 294); tone(294, 0.5, 'triangle', 0.1, 392, 0.12); },
    bossRoar() { tone(82, 0.8, 'sawtooth', 0.16, 41); noise(0.6, 0.12, 500); },
    draft() { tone(523, 0.15, 'triangle', 0.09); tone(659, 0.15, 'triangle', 0.09, null, 0.1); tone(784, 0.3, 'triangle', 0.09, null, 0.2); },
    victory() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.5, 'triangle', 0.1, null, i * 0.16));
    },
    defeat() {
      [392, 329, 261, 196].forEach((f, i) => tone(f, 0.55, 'triangle', 0.1, null, i * 0.22));
    },
    click() { tone(520, 0.06, 'sine', 0.07); },
  };
}
