// Everything the eye sees: the dusk garden, the keeper and her lantern light,
// the six shadow kinds and the two bosses, the HUD, and every screen — title,
// draft, pause, game over and victory. The renderer never changes the world.
import { FIELD, FONT, PALETTE, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DRAFT = 'draft';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const CARD_W = 300;
const CARD_H = 210;
const CARD_Y = 250;

/** The three draft-card rectangles, so clicks can pick a card. */
export function draftCardRects() {
  const total = CARD_W * 3 + 24 * 2;
  const x0 = (FIELD.width - total) / 2;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (CARD_W + 24), y: CARD_Y, w: CARD_W, h: CARD_H }));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || FIELD.width;
    const h = canvas.clientHeight || FIELD.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
  }

  function drawBackground(state, time) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, '#10142a');
    g.addColorStop(0.55, '#12211a');
    g.addColorStop(1, '#0b0e1a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Moon glow, top right.
    const moon = ctx.createRadialGradient(1120, 90, 8, 1120, 90, 150);
    moon.addColorStop(0, 'rgba(240, 230, 190, 0.5)');
    moon.addColorStop(0.25, 'rgba(240, 230, 190, 0.12)');
    moon.addColorStop(1, 'rgba(240, 230, 190, 0)');
    ctx.fillStyle = moon;
    ctx.fillRect(950, 0, 330, 260);
    ctx.fillStyle = '#f0e6be';
    ctx.beginPath();
    ctx.arc(1120, 90, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(16, 20, 42, 0.55)';
    ctx.beginPath();
    ctx.arc(1112, 84, 6, 0, Math.PI * 2);
    ctx.arc(1128, 96, 4, 0, Math.PI * 2);
    ctx.fill();
    // Garden floor: soft grass mounds.
    for (let i = 0; i < 9; i += 1) {
      ctx.fillStyle = i % 2 ? 'rgba(29, 51, 36, 0.5)' : 'rgba(22, 40, 28, 0.5)';
      ctx.beginPath();
      ctx.ellipse(140 + i * 130, 700, 180, 60, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    for (const d of state.decor) {
      if (d.kind === 'tuft') {
        ctx.strokeStyle = 'rgba(90, 140, 90, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let b = -1; b <= 1; b += 1) {
          ctx.moveTo(d.x + b * 5, d.y);
          ctx.quadraticCurveTo(d.x + b * 7, d.y - 12 * d.s, d.x + b * 9, d.y - 16 * d.s);
        }
        ctx.stroke();
      } else if (d.kind === 'flower') {
        const cols = ['#ff8fa3', '#ffd166', '#b388ff', '#7fe3d0'];
        ctx.fillStyle = cols[Math.floor(d.hue * cols.length) % cols.length];
        ctx.beginPath();
        ctx.arc(d.x, d.y - 6 * d.s, 4.5 * d.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.arc(d.x, d.y - 6 * d.s, 2 * d.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(90, 140, 90, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x, d.y - 6 * d.s);
        ctx.stroke();
      } else if (d.kind === 'stone') {
        ctx.fillStyle = '#3a4152';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, 12 * d.s, 8 * d.s, d.hue, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.ellipse(d.x - 3 * d.s, d.y - 3 * d.s, 6 * d.s, 3 * d.s, d.hue, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#c96f4a';
        ctx.beginPath();
        ctx.arc(d.x, d.y - 4 * d.s, 7 * d.s, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#f4ead2';
        ctx.beginPath();
        ctx.arc(d.x - 2 * d.s, d.y - 7 * d.s, 1.4 * d.s, 0, Math.PI * 2);
        ctx.arc(d.x + 2.5 * d.s, d.y - 5 * d.s, 1.2 * d.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Ambient fireflies drifting over the garden.
    for (const a of state.ambient) {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(a.p * 1.4));
      ctx.fillStyle = `rgba(255, 224, 102, ${0.75 * tw})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    void time;
  }

  function drawPickups(state) {
    for (const pk of state.pickups) {
      if (!pk.active) continue;
      const bob = Math.sin(pk.bob * 3) * 3;
      if (pk.kind === 'ember') {
        ctx.fillStyle = '#ff9a3c';
        ctx.save();
        ctx.translate(pk.x, pk.y + bob);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-5, -5, 10, 10);
        ctx.restore();
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(pk.x, pk.y + bob, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const pulse = 0.7 + 0.3 * Math.sin(pk.bob * 4);
        const glow = ctx.createRadialGradient(pk.x, pk.y + bob, 1, pk.x, pk.y + bob, 22 * pulse);
        glow.addColorStop(0, 'rgba(127, 227, 208, 0.9)');
        glow.addColorStop(1, 'rgba(127, 227, 208, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pk.x, pk.y + bob, 22 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d2ffe9';
        ctx.beginPath();
        ctx.arc(pk.x, pk.y + bob, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawEnemy(e, time) {
    const def = e.def;
    ctx.save();
    ctx.translate(e.x, e.y);
    // A coloured glow so the shadow reads against the dark garden.
    const glow = ctx.createRadialGradient(0, 0, e.radius * 0.4, 0, 0, e.radius * 2.4);
    glow.addColorStop(0, def.color + '44');
    glow.addColorStop(1, def.color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 2.4, 0, Math.PI * 2);
    ctx.fill();
    // Shadow body: a dark blob with a coloured rim; bosses get a crown of spikes.
    ctx.fillStyle = 'rgba(5, 6, 14, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = def.color;
    ctx.lineWidth = def.boss ? 5 : 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius - 1, 0, Math.PI * 2);
    ctx.stroke();
    if (def.boss) {
      ctx.fillStyle = def.color;
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2 + time * 0.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * e.radius, Math.sin(a) * e.radius);
        ctx.lineTo(Math.cos(a + 0.18) * (e.radius + 14), Math.sin(a + 0.18) * (e.radius + 14));
        ctx.lineTo(Math.cos(a + 0.36) * e.radius, Math.sin(a + 0.36) * e.radius);
        ctx.fill();
      }
    }
    // Kind silhouette: motes are spiky, crawlers are lumpy, spitters have a sac,
    // wisps trail, shades wear a hood notch, brutes have shoulders.
    ctx.fillStyle = def.color;
    if (e.kind === 'mote') {
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + time * 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * e.radius * 0.5, Math.sin(a) * e.radius * 0.5);
        ctx.lineTo(Math.cos(a + 0.3) * (e.radius + 6), Math.sin(a + 0.3) * (e.radius + 6));
        ctx.lineTo(Math.cos(a + 0.6) * e.radius * 0.5, Math.sin(a + 0.6) * e.radius * 0.5);
        ctx.fill();
      }
    } else if (e.kind === 'spitter') {
      ctx.beginPath();
      ctx.arc(0, e.radius * 0.4, e.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'wisp') {
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(-Math.cos(e.angle) * 14, -Math.sin(e.angle) * 14, e.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Eyes: two glowing dots that track the keeper.
    const ex = Math.cos(e.angle) * e.radius * 0.32;
    const ey = Math.sin(e.angle) * e.radius * 0.32;
    ctx.fillStyle = e.phase > 0 ? 'rgba(255,255,255,0.35)' : def.eye;
    ctx.beginPath();
    ctx.arc(-e.radius * 0.32 + ex, -e.radius * 0.18 + ey, e.radius * 0.2, 0, Math.PI * 2);
    ctx.arc(e.radius * 0.32 + ex, -e.radius * 0.18 + ey, e.radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
    if (e.flash > 0) {
      ctx.globalAlpha = Math.min(0.45, e.flash * 3);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // Boss / brute health bar above the head.
    if ((def.boss || e.kind === 'brute') && e.hp < e.maxHp) {
      const w = def.boss ? 90 : 44;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 14, w, 6);
      ctx.fillStyle = '#ff5d5d';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 14, w * Math.max(0, e.hp / e.maxHp), 6);
    }
  }

  function drawPlayer(state, time) {
    const p = state.player;
    const auraR = PLAYER.auraRadius * state.stats.auraMul;
    // Lantern light: a warm pool around the keeper.
    const glow = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, auraR * 1.9);
    glow.addColorStop(0, 'rgba(255, 179, 71, 0.34)');
    glow.addColorStop(0.5, 'rgba(255, 154, 60, 0.13)');
    glow.addColorStop(1, 'rgba(255, 154, 60, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, auraR * 1.9, 0, Math.PI * 2);
    ctx.fill();
    // Aura ring.
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, auraR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Orbiting firefly friends.
    for (let o = 0; o < state.stats.orbiters; o += 1) {
      const a = p.orbAngle + (o * Math.PI * 2) / Math.max(1, state.stats.orbiters);
      const ox = p.x + Math.cos(a) * 62;
      const oy = p.y + Math.sin(a) * 62;
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(ox, oy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 224, 102, 0.35)';
      ctx.beginPath();
      ctx.arc(ox, oy, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    const blink = p.invuln > 0 && Math.floor(time * 14) % 2 === 0;
    if (!blink) {
      ctx.save();
      ctx.translate(p.x, p.y);
      // Cloak.
      ctx.fillStyle = '#2e4a6b';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.quadraticCurveTo(16, -6, 13, 14);
      ctx.quadraticCurveTo(0, 20, -13, 14);
      ctx.quadraticCurveTo(-16, -6, 0, -18);
      ctx.fill();
      // Hood and face.
      ctx.fillStyle = '#f4ead2';
      ctx.beginPath();
      ctx.arc(0, -8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2e4a6b';
      ctx.beginPath();
      ctx.arc(0, -10, 8.5, Math.PI, Math.PI * 2);
      ctx.fill();
      // The lantern, held toward the aim.
      ctx.rotate(p.angle);
      ctx.strokeStyle = '#8a6a3b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(6, 4);
      ctx.lineTo(24, 2);
      ctx.stroke();
      ctx.fillStyle = '#3a2c12';
      ctx.fillRect(22, -6, 12, 16);
      const flick = 0.8 + 0.2 * Math.sin(time * 9) + 0.08 * Math.sin(time * 23);
      ctx.fillStyle = `rgba(255, 179, 71, ${flick})`;
      ctx.beginPath();
      ctx.arc(28, 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Dash cooldown pip under the keeper.
    if (p.dashTimer > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(p.x - 16, p.y + 24, 32, 4);
      ctx.fillStyle = '#7fe3d0';
      ctx.fillRect(p.x - 16, p.y + 24, 32 * (1 - p.dashTimer / 2.2), 4);
    }
  }

  function drawBullets(state) {
    for (const b of state.bullets) {
      if (!b.active) continue;
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of state.ebullets) {
      if (!b.active) continue;
      ctx.fillStyle = '#c86bff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e9c6ff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles(state) {
    state.particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    state.particles.forEachText((t) => {
      ctx.globalAlpha = Math.max(0, t.life);
      ctx.font = `bold ${t.size}px ${FONT}`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    });
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    const p = state.player;
    ctx.textAlign = 'left';
    // Top bar.
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, FIELD.width, 52);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, 52, FIELD.width, 2);
    // Flame (HP).
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('FLAME', 18, 21);
    ctx.fillStyle = PALETTE.hpBack;
    roundRect(ctx, 18, 28, 220, 14, 7);
    ctx.fill();
    ctx.fillStyle = p.hp / p.maxHp > 0.35 ? '#ffb347' : '#ff5d5d';
    roundRect(ctx, 18, 28, 220 * Math.max(0, p.hp / p.maxHp), 14, 7);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 13px ' + FONT;
    ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 246, 40);
    // Wave pill.
    ctx.fillStyle = '#1b2340';
    roundRect(ctx, 340, 10, 150, 32, 16);
    ctx.fill();
    ctx.strokeStyle = PALETTE.cardEdge;
    ctx.lineWidth = 1.5;
    roundRect(ctx, 340, 10, 150, 32, 16);
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 16px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${state.wave} / 10`, 415, 32);
    ctx.textAlign = 'left';
    // Score.
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 24px ' + FONT;
    ctx.fillText(`${state.score.toLocaleString('en-US')}`, 520, 35);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px ' + FONT;
    ctx.fillText('SCORE', 520, 18);
    // Combo.
    if (state.combo >= 5) {
      ctx.fillStyle = '#ff9a3c';
      ctx.font = 'bold 16px ' + FONT;
      ctx.fillText(`x${state.comboMult.toFixed(1)} COMBO ${state.combo}`, 700, 33);
    }
    // Embers and fireflies, right side.
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 16px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText(`◆ ${state.embers}`, 1080, 33);
    ctx.fillText(`✧ ${state.fireflies} rescued`, 1262, 33);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px ' + FONT;
    ctx.fillText(`BEST ${Math.max(best, state.score).toLocaleString('en-US')}`, 1262, 16);
    ctx.textAlign = 'left';
    // Boss bar.
    if (state.boss && !state.boss.dead) {
      const w = 520;
      const x = (FIELD.width - w) / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, x - 8, 62, w + 16, 34, 10);
      ctx.fill();
      ctx.fillStyle = '#ff8fa3';
      ctx.font = 'bold 13px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(state.boss.def.name, FIELD.width / 2, 76);
      ctx.fillStyle = '#3a2028';
      ctx.fillRect(x, 80, w, 8);
      ctx.fillStyle = '#ff5d5d';
      ctx.fillRect(x, 80, w * Math.max(0, state.boss.hp / state.boss.maxHp), 8);
      ctx.textAlign = 'left';
    }
    // Wave banner.
    if (state.banner.timer > 0) {
      const a = Math.min(1, state.banner.timer);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 44px ' + FONT;
      ctx.fillText(state.banner.text, FIELD.width / 2, 190);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '18px ' + FONT;
      ctx.fillText(state.banner.sub, FIELD.width / 2, 222);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 14);
    ctx.stroke();
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(5, 7, 16, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 84px ' + FONT;
    ctx.fillText('LANTERNFALL', FIELD.width / 2, 168);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'italic 24px ' + FONT;
    ctx.fillText('Keep the last light burning until dawn.', FIELD.width / 2, 208);
    // The judge, addressed directly.
    panel(240, 240, 800, 118);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 19px ' + FONT;
    ctx.fillText('Dear judge — you are the keeper now.', FIELD.width / 2, 272);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '17px ' + FONT;
    ctx.fillText('Survive 10 waves, rescue the drifting fireflies, and take an upgrade', FIELD.width / 2, 302);
    ctx.fillText('after every wave — then face the Dusk Queen and bring the dawn.', FIELD.width / 2, 326);
    // Controls.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '16px ' + FONT;
    ctx.fillText('WASD move  ·  mouse aim  ·  hold CLICK to burn the dark  ·  SHIFT dash  ·  P pause  ·  M mute', FIELD.width / 2, 402);
    ctx.fillStyle = PALETTE.aqua;
    ctx.font = '15px ' + FONT;
    ctx.fillText('6 shadow kinds  ·  2 bosses  ·  9 upgrades  ·  10 waves  ·  fireflies to rescue', FIELD.width / 2, 432);
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 26px ' + FONT;
    ctx.fillText('Press SPACE or CLICK to begin', FIELD.width / 2, 500);
    ctx.globalAlpha = 1;
    if (best > 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '16px ' + FONT;
      ctx.fillText(`Best score: ${best.toLocaleString('en-US')}`, FIELD.width / 2, 540);
    }
    ctx.fillStyle = 'rgba(154, 163, 184, 0.8)';
    ctx.font = '13px ' + FONT;
    ctx.fillText('An original game — every sound is synthesised live.', FIELD.width / 2, 690);
    ctx.textAlign = 'left';
  }

  function drawDraft(state) {
    ctx.fillStyle = 'rgba(5, 7, 16, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 40px ' + FONT;
    ctx.fillText(`WAVE ${state.wave} CLEARED`, FIELD.width / 2, 150);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '20px ' + FONT;
    ctx.fillText('The garden breathes. Choose one lantern upgrade — click a card or press 1, 2, 3.', FIELD.width / 2, 190);
    const rects = draftCardRects();
    state.draft.forEach((up, i) => {
      const r = rects[i];
      ctx.fillStyle = PALETTE.card;
      roundRect(ctx, r.x, r.y, r.w, r.h, 14);
      ctx.fill();
      ctx.strokeStyle = PALETTE.cardEdge;
      ctx.lineWidth = 2;
      roundRect(ctx, r.x, r.y, r.w, r.h, 14);
      ctx.stroke();
      ctx.fillStyle = PALETTE.gold;
      ctx.font = '44px ' + FONT;
      ctx.fillText(up.icon, r.x + r.w / 2, r.y + 66);
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 21px ' + FONT;
      ctx.fillText(up.name, r.x + r.w / 2, r.y + 110);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '16px ' + FONT;
      ctx.fillText(up.desc, r.x + r.w / 2, r.y + 142);
      ctx.fillStyle = PALETTE.aqua;
      ctx.font = 'bold 15px ' + FONT;
      ctx.fillText(`[ ${i + 1} ]`, r.x + r.w / 2, r.y + 180);
    });
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '15px ' + FONT;
    ctx.fillText(`Score ${state.score.toLocaleString('en-US')}  ·  Flame ${Math.ceil(state.player.hp)}/${state.player.maxHp}  ·  Fireflies ${state.fireflies}`, FIELD.width / 2, 520);
    ctx.textAlign = 'left';
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(5, 7, 16, 0.66)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 52px ' + FONT;
    ctx.fillText('PAUSED', FIELD.width / 2, 330);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '19px ' + FONT;
    ctx.fillText('Press P or SPACE to keep the light burning.', FIELD.width / 2, 372);
    ctx.textAlign = 'left';
  }

  function statsLines(state) {
    return [
      [`Score`, state.score.toLocaleString('en-US')],
      [`Wave reached`, `${Math.min(state.wave, 10)} / 10`],
      [`Shadows burned`, `${state.kills}`],
      [`Fireflies rescued`, `${state.fireflies}`],
      [`Embers gathered`, `${state.embers}`],
      [`Time`, formatTime(state.runTime)],
    ];
  }

  function drawEnd(state, best, won) {
    ctx.fillStyle = won ? 'rgba(20, 26, 10, 0.55)' : 'rgba(10, 5, 12, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    if (won) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 64px ' + FONT;
      ctx.fillText('DAWN BREAKS', FIELD.width / 2, 150);
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'italic 22px ' + FONT;
      ctx.fillText('The Dusk Queen is gone. You kept the light — the garden wakes.', FIELD.width / 2, 190);
      ctx.font = '52px ' + FONT;
      let stars = '';
      for (let i = 0; i < 3; i += 1) stars += i < state.stars ? '★' : '☆';
      ctx.fillStyle = PALETTE.gold;
      ctx.fillText(stars, FIELD.width / 2, 258);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '16px ' + FONT;
      ctx.fillText(state.stars === 3 ? 'Three stars — a flawless dawn.' : state.stars === 2 ? 'Two stars — the dawn came, scarred but bright.' : 'One star — dawn, barely.', FIELD.width / 2, 288);
    } else {
      ctx.fillStyle = '#ff8fa3';
      ctx.font = 'bold 64px ' + FONT;
      ctx.fillText('THE LIGHT GOES OUT', FIELD.width / 2, 150);
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'italic 22px ' + FONT;
      ctx.fillText('The dark takes the garden… this time. The lantern remembers you.', FIELD.width / 2, 190);
    }
    panel(430, 320, 420, 218);
    const lines = statsLines(state);
    lines.forEach(([label, value], i) => {
      const y = 356 + i * 32;
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '17px ' + FONT;
      ctx.fillText(label, 460, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 17px ' + FONT;
      ctx.fillText(value, 820, y);
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '16px ' + FONT;
    ctx.fillText(`Best score: ${Math.max(best, state.score).toLocaleString('en-US')}`, FIELD.width / 2, 578);
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 26px ' + FONT;
    ctx.fillText(won ? 'Press R or CLICK — Play again' : 'Press R or CLICK — Try again', FIELD.width / 2, 628);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function draw(state, screen, best, aim) {
    fit();
    ctx.save();
    if (state.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground(state, state.time);
    if (screen === SCREEN_TITLE) {
      // The keeper stands in the garden behind the title.
      drawPlayer(state, state.time);
      drawParticles(state);
      drawTitle(state, best);
    } else {
      drawPickups(state);
      for (const e of state.enemies) if (!e.dead) drawEnemy(e, state.time);
      drawBullets(state);
      drawPlayer(state, state.time);
      drawParticles(state);
      // The night closes in at the edges; the lantern holds it back.
      const vig = ctx.createRadialGradient(640, 360, 260, 640, 360, 780);
      vig.addColorStop(0, 'rgba(5, 7, 16, 0)');
      vig.addColorStop(1, 'rgba(5, 7, 16, 0.5)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      drawHud(state, best);
      if (screen === SCREEN_PLAY && aim) {
        ctx.strokeStyle = 'rgba(255, 233, 168, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(aim.x, aim.y, 10, 0, Math.PI * 2);
        ctx.moveTo(aim.x - 15, aim.y);
        ctx.lineTo(aim.x - 6, aim.y);
        ctx.moveTo(aim.x + 6, aim.y);
        ctx.lineTo(aim.x + 15, aim.y);
        ctx.moveTo(aim.x, aim.y - 15);
        ctx.lineTo(aim.x, aim.y - 6);
        ctx.moveTo(aim.x, aim.y + 6);
        ctx.lineTo(aim.x, aim.y + 15);
        ctx.stroke();
      }
      if (screen === SCREEN_DRAFT) drawDraft(state);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawEnd(state, best, false);
      else if (screen === SCREEN_WIN) drawEnd(state, best, true);
    }
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 60, ${state.flash * 0.35})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    ctx.restore();
  }

  return { draw, fit };
}
