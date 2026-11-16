// Particles and floating score text. One fixed pool, allocated once at boot;
// nothing here allocates while the game runs.
export function createParticles(capacity) {
  const parts = [];
  for (let i = 0; i < capacity; i += 1) {
    parts.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 0, gravity: 0 });
  }
  const texts = [];
  for (let i = 0; i < 48; i += 1) {
    texts.push({ active: false, x: 0, y: 0, life: 0, maxLife: 1, text: '', color: '#fff', size: 16 });
  }

  function spawn(x, y, vx, vy, life, size, color, drag, gravity) {
    for (let i = 0; i < parts.length; i += 1) {
      const p = parts[i];
      if (p.active) continue;
      p.active = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.maxLife = life; p.size = size; p.color = color;
      p.drag = drag || 0.9; p.gravity = gravity || 0;
      return;
    }
  }

  return {
    /** A burst of sparks flying out from (x, y). */
    burst(x, y, color, count, speed) {
      for (let i = 0; i < count; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const s = (0.3 + Math.random() * 0.7) * (speed || 220);
        spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.35 + Math.random() * 0.4, 2 + Math.random() * 3, color, 0.88, 60);
      }
    },
    /** Slow embers drifting up, for lantern light and the victory dawn. */
    embers(x, y, count) {
      for (let i = 0; i < count; i += 1) {
        spawn(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 30, -20 - Math.random() * 50,
          0.8 + Math.random() * 0.9, 1.5 + Math.random() * 2.5, Math.random() < 0.5 ? '#ffb347' : '#ff9a3c', 0.99, -30);
      }
    },
    /** A ring of light when a wave is cleared or a boss falls. */
    ring(x, y, color) {
      for (let i = 0; i < 36; i += 1) {
        const a = (i / 36) * Math.PI * 2;
        spawn(x, y, Math.cos(a) * 260, Math.sin(a) * 260, 0.5, 3, color, 0.9, 0);
      }
    },
    floatText(x, y, text, color, size) {
      for (let i = 0; i < texts.length; i += 1) {
        const t = texts[i];
        if (t.active) continue;
        t.active = true; t.x = x; t.y = y; t.life = 1; t.maxLife = 1;
        t.text = text; t.color = color; t.size = size || 16;
        return;
      }
    },
    step(dt) {
      for (const p of parts) {
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) { p.active = false; continue; }
        p.vx *= Math.pow(p.drag, dt * 60);
        p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (const t of texts) {
        if (!t.active) continue;
        t.life -= dt * 0.9;
        t.y -= 34 * dt;
        if (t.life <= 0) t.active = false;
      }
    },
    forEach(fn) { for (const p of parts) if (p.active) fn(p); },
    forEachText(fn) { for (const t of texts) if (t.active) fn(t); },
    clear() {
      for (const p of parts) p.active = false;
      for (const t of texts) t.active = false;
    },
  };
}
