// LANTERNFALL's simulation, with no drawing and no browser in it: the keeper,
// the shadow waves, the lantern aura, the draft between waves, the two bosses
// and the dawn. step() advances one fixed step and returns what happened as bit
// flags, so the caller can react (sound, shake) without the world knowing about
// screens. Nothing here allocates after createWorld returns, except the short
// spawn queue rebuilt at each wave.
import { COMBO_WINDOW, FIELD, FIREFLY_HEAL, PLAYER, STEP, WAVES } from './config.js';
import { ENEMY_DEFS, makeEnemy, scaledHp } from './enemies.js';
import { applyUpgrade, baseStats, drawDraft } from './upgrades.js';
import { createParticles } from './particles.js';
import { pick, shuffled } from './random.js';

export const EVENT_HIT = 1;
export const EVENT_KILL = 2;
export const EVENT_PICKUP = 4;
export const EVENT_FIREFLY = 8;
export const EVENT_WAVE_CLEAR = 16;
export const EVENT_OVER = 32;
export const EVENT_WIN = 64;
export const EVENT_BOSS = 128;
export const EVENT_DASH = 256;
export const EVENT_SHOOT = 512;

const MAX_ENEMIES = 90;
const MAX_BULLETS = 160;
const MAX_EBULLETS = 120;
const MAX_PICKUPS = 24;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const particles = createParticles(512);
  const state = {
    phase: 'title',
    time: 0, wave: 1, score: 0, kills: 0, embers: 0, fireflies: 0,
    combo: 0, comboTimer: 0, comboMult: 1,
    player: { x: FIELD.width / 2, y: FIELD.height / 2, hp: PLAYER.maxHp, maxHp: PLAYER.maxHp, angle: -Math.PI / 2, fireTimer: 0, dashTimer: 0, dashTime: 0, dashX: 0, dashY: 0, invuln: 0, orbAngle: 0 },
    stats: baseStats(),
    taken: {},
    draft: null,
    spawnQueue: [],
    spawnTimer: 0,
    enemies: [],
    bullets: [],
    ebullets: [],
    pickups: [],
    boss: null,
    banner: { text: '', sub: '', timer: 0 },
    shake: 0, hitStop: 0, flash: 0,
    fireflyTimer: 5,
    stars: 0,
    runTime: 0,
    decor: [],
    ambient: [],
  };
  // The renderer reads particles through the state, so draw(state, ...) sees them.
  state.particles = particles;

  for (let i = 0; i < MAX_ENEMIES; i += 1) state.enemies.push({ dead: true, kind: 'mote', x: 0, y: 0, def: ENEMY_DEFS.mote, hp: 1, maxHp: 1, radius: 12, angle: 0, wobble: 0, wobbleSpeed: 1, spitTimer: 0, chargeTimer: 0, charging: 0, chargeX: 0, chargeY: 0, summonTimer: 0, burstTimer: 0, flash: 0, phase: 0, phaseTimer: 0, orbHit: 0 });
  for (let i = 0; i < MAX_BULLETS; i += 1) state.bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, pierce: 0, dmg: 0, life: 0 });
  for (let i = 0; i < MAX_EBULLETS; i += 1) state.ebullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, dmg: 0, life: 0 });
  for (let i = 0; i < MAX_PICKUPS; i += 1) state.pickups.push({ active: false, kind: 'ember', x: 0, y: 0, vx: 0, vy: 0, life: 0, bob: 0 });

  function freeEnemy() { for (const e of state.enemies) if (e.dead) return e; return null; }
  function freeBullet() { for (const b of state.bullets) if (!b.active) return b; return null; }
  function freeEBullet() { for (const b of state.ebullets) if (!b.active) return b; return null; }
  function freePickup() { for (const p of state.pickups) if (!p.active) return p; return null; }

  function buildDecor() {
    state.decor = [];
    const kinds = ['tuft', 'flower', 'stone', 'mushroom', 'tuft', 'flower'];
    for (let i = 0; i < 110; i += 1) {
      state.decor.push({ kind: pick(random, kinds), x: 30 + random() * (FIELD.width - 60), y: 60 + random() * (FIELD.height - 110), s: 0.6 + random() * 0.9, hue: random() });
    }
    state.ambient = [];
    for (let i = 0; i < 14; i += 1) {
      state.ambient.push({ x: random() * FIELD.width, y: random() * FIELD.height, a: random() * Math.PI * 2, s: 12 + random() * 22, p: random() * Math.PI * 2 });
    }
  }

  function spawnEdge(kind) {
    const e = freeEnemy();
    if (!e) return;
    const fresh = makeEnemy(kind, 0, 0, random);
    const side = Math.floor(random() * 4);
    if (side === 0) { fresh.x = random() * FIELD.width; fresh.y = -30; }
    else if (side === 1) { fresh.x = random() * FIELD.width; fresh.y = FIELD.height + 30; }
    else if (side === 2) { fresh.x = -30; fresh.y = random() * FIELD.height; }
    else { fresh.x = FIELD.width + 30; fresh.y = random() * FIELD.height; }
    fresh.hp = scaledHp(kind, state.wave);
    fresh.maxHp = fresh.hp;
    Object.assign(e, fresh, { dead: false });
    if (ENEMY_DEFS[kind].boss) state.boss = e;
  }

  function startWave(n) {
    state.wave = n;
    const def = WAVES[n - 1];
    const queue = [];
    for (const kind of ['mote', 'crawler', 'spitter', 'wisp', 'shade', 'brute']) {
      for (let i = 0; i < (def[kind] || 0); i += 1) queue.push(kind);
    }
    state.spawnQueue = shuffled(random, queue);
    state.spawnTimer = 0.5;
    const isBoss = def.boss !== null;
    state.banner = {
      text: isBoss ? `WAVE ${n} — ${ENEMY_DEFS[def.boss].name}` : `WAVE ${n}`,
      sub: isBoss ? 'Something huge is coming out of the dark.' : n === 10 ? 'The last night. Hold until dawn.' : 'Keep the light burning.',
      timer: 2.6,
    };
    if (isBoss) spawnEdge(def.boss);
  }

  function reset() {
    buildDecor();
    for (const e of state.enemies) e.dead = true;
    for (const b of state.bullets) b.active = false;
    for (const b of state.ebullets) b.active = false;
    for (const p of state.pickups) p.active = false;
    particles.clear();
    state.phase = 'title';
    state.time = 0; state.wave = 1; state.score = 0; state.kills = 0;
    state.embers = 0; state.fireflies = 0; state.combo = 0; state.comboTimer = 0; state.comboMult = 1;
    state.player.x = FIELD.width / 2; state.player.y = FIELD.height / 2;
    state.player.hp = PLAYER.maxHp; state.player.maxHp = PLAYER.maxHp;
    state.player.angle = -Math.PI / 2; state.player.fireTimer = 0;
    state.player.dashTimer = 0; state.player.dashTime = 0; state.player.invuln = 0;
    state.stats = baseStats();
    state.taken = {};
    state.draft = null;
    state.spawnQueue = [];
    state.boss = null;
    state.banner = { text: '', sub: '', timer: 0 };
    state.shake = 0; state.hitStop = 0; state.flash = 0;
    state.fireflyTimer = 5; state.stars = 0; state.runTime = 0;
  }

  function startRun() {
    reset();
    state.phase = 'play';
    startWave(1);
    return EVENT_BOSS;
  }

  function addScore(base, x, y) {
    const gained = Math.round(base * state.comboMult);
    state.score += gained;
    if (x !== undefined) particles.floatText(x, y, `+${gained}`, '#f2c94c', 15);
    return gained;
  }

  function killEnemy(e) {
    e.dead = true;
    state.kills += 1;
    state.combo += 1;
    state.comboTimer = COMBO_WINDOW;
    state.comboMult = Math.min(3, 1 + Math.floor(state.combo / 5) * 0.5);
    addScore(e.def.score, e.x, e.y - e.radius);
    particles.burst(e.x, e.y, e.def.color, e.def.boss ? 46 : 14, e.def.boss ? 320 : 220);
    particles.burst(e.x, e.y, '#ffb347', 6, 160);
    if (e.def.boss) {
      state.shake = Math.max(state.shake, 14);
      state.hitStop = 0.22;
      particles.ring(e.x, e.y, '#ffd166');
      state.boss = null;
    } else {
      state.shake = Math.max(state.shake, 2);
    }
    if (e.kind === 'shade') {
      for (let i = 0; i < 2; i += 1) {
        const m = freeEnemy();
        if (!m) break;
        const fresh = makeEnemy('mote', e.x + (i === 0 ? -14 : 14), e.y, random);
        fresh.hp = scaledHp('mote', state.wave);
        fresh.maxHp = fresh.hp;
        Object.assign(m, fresh, { dead: false });
      }
    }
    if (random() < 0.3) {
      const p = freePickup();
      if (p) { p.active = true; p.kind = 'ember'; p.x = e.x; p.y = e.y; p.vx = (random() - 0.5) * 60; p.vy = (random() - 0.5) * 60; p.life = 9; p.bob = random() * 6; }
    }
    if (e.kind === 'duskqueen') {
      state.phase = 'win';
      state.stars = state.player.hp >= state.player.maxHp * 0.6 && state.fireflies >= 8 ? 3
        : state.player.hp >= state.player.maxHp * 0.3 || state.fireflies >= 5 ? 2 : 1;
      particles.ring(FIELD.width / 2, FIELD.height / 2, '#ffd166');
      return EVENT_WIN;
    }
    if (e.kind === 'murkmaw') {
      particles.floatText(e.x, e.y - 50, 'The dark recoils!', '#ffd166', 20);
    }
    return 0;
  }

  function damagePlayer(amount, fromX, fromY) {
    const p = state.player;
    if (p.invuln > 0 || p.dashTime > 0 || state.phase !== 'play') return 0;
    p.hp -= amount;
    p.invuln = PLAYER.invulnerable;
    state.flash = 0.35;
    state.shake = Math.max(state.shake, 8);
    state.hitStop = Math.max(state.hitStop, 0.06);
    state.combo = 0; state.comboMult = 1; state.comboTimer = 0;
    particles.burst(p.x, p.y, '#ff5d5d', 12, 200);
    if (p.hp <= 0) {
      p.hp = 0;
      state.phase = 'over';
      particles.burst(p.x, p.y, '#ffb347', 40, 300);
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function fireBullets() {
    const p = state.player;
    const s = state.stats;
    const base = Math.atan2(state.aimY - p.y, state.aimX - p.x);
    const n = s.projectiles;
    for (let i = 0; i < n; i += 1) {
      const b = freeBullet();
      if (!b) return;
      const spread = (i - (n - 1) / 2) * 0.14;
      const a = base + spread;
      b.active = true;
      b.x = p.x + Math.cos(a) * 22; b.y = p.y + Math.sin(a) * 22;
      b.vx = Math.cos(a) * PLAYER.bulletSpeed; b.vy = Math.sin(a) * PLAYER.bulletSpeed;
      b.pierce = s.pierce; b.dmg = PLAYER.bulletDamage * s.damageMul; b.life = 1.1;
    }
    p.angle = base;
  }

  function stepPlay(dt, ctrl) {
    let events = 0;
    const p = state.player;
    const s = state.stats;
    state.time += dt;
    state.runTime += dt;
    if (state.banner.timer > 0) state.banner.timer -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) { state.combo = 0; state.comboMult = 1; }
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
    if (state.hitStop > 0) { state.hitStop -= dt; return events; }

    // --- movement and dash
    const speed = PLAYER.speed * s.speedMul;
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.x += p.dashX * PLAYER.dashSpeed * dt;
      p.y += p.dashY * PLAYER.dashSpeed * dt;
      particles.embers(p.x, p.y, 1);
    } else {
      p.x += ctrl.mx * speed * dt;
      p.y += ctrl.my * speed * dt;
      if (ctrl.dash && p.dashTimer <= 0) {
        const len = Math.hypot(ctrl.mx, ctrl.my);
        const dx = len > 0 ? ctrl.mx / len : Math.cos(p.angle);
        const dy = len > 0 ? ctrl.my / len : Math.sin(p.angle);
        p.dashX = dx; p.dashY = dy; p.dashTime = PLAYER.dashTime;
        p.dashTimer = PLAYER.dashCooldown * s.dashCooldownMul;
        p.invuln = Math.max(p.invuln, PLAYER.dashTime + 0.1);
        events |= EVENT_DASH;
      }
    }
    p.x = Math.max(24, Math.min(FIELD.width - 24, p.x));
    p.y = Math.max(56, Math.min(FIELD.height - 24, p.y));
    if (p.dashTimer > 0) p.dashTimer -= dt;
    if (p.invuln > 0) p.invuln -= dt;
    p.angle = Math.atan2(state.aimY - p.y, state.aimX - p.x);
    p.orbAngle += dt * 2.4;

    // --- shooting
    p.fireTimer -= dt;
    if (ctrl.shoot && p.fireTimer <= 0) {
      fireBullets();
      p.fireTimer = s.fireInterval;
      events |= EVENT_SHOOT;
    }

    // --- lantern aura burns shadows that get too close
    const auraR = PLAYER.auraRadius * s.auraMul;
    for (const e of state.enemies) {
      if (e.dead) continue;
      const d2 = dist2(e.x, e.y, p.x, p.y);
      if (d2 < (auraR + e.radius) * (auraR + e.radius)) {
        e.hp -= s.auraDamage * dt;
        e.flash = 0.08;
        if (e.hp <= 0) events |= killEnemy(e);
      }
    }

    // --- orbiting firefly friends
    for (let o = 0; o < s.orbiters; o += 1) {
      const a = p.orbAngle + (o * Math.PI * 2) / Math.max(1, s.orbiters);
      const ox = p.x + Math.cos(a) * 62;
      const oy = p.y + Math.sin(a) * 62;
      for (const e of state.enemies) {
        if (e.dead || e.orbHit > 0) continue;
        if (dist2(e.x, e.y, ox, oy) < (e.radius + 14) * (e.radius + 14)) {
          e.hp -= 14;
          e.orbHit = 0.5;
          e.flash = 0.08;
          particles.burst(e.x, e.y, '#ffe066', 5, 140);
          if (e.hp <= 0) events |= killEnemy(e);
        }
      }
    }

    // --- spawning: later waves arrive in small groups, so the garden stays crowded
    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEdge(state.spawnQueue.shift());
        let extra = 0;
        if (state.wave >= 4 && random() < 0.4) extra += 1;
        if (state.wave >= 7 && random() < 0.35) extra += 1;
        while (extra > 0 && state.spawnQueue.length > 0) {
          spawnEdge(state.spawnQueue.shift());
          extra -= 1;
        }
        const def = WAVES[state.wave - 1];
        state.spawnTimer = def.interval * (0.85 + random() * 0.3);
      }
    }

    // --- firefly pickups drift in
    state.fireflyTimer -= dt;
    if (state.fireflyTimer <= 0) {
      state.fireflyTimer = 6 + random() * 3;
      const pk = freePickup();
      if (pk) {
        pk.active = true; pk.kind = 'firefly';
        pk.x = 60 + random() * (FIELD.width - 120); pk.y = 90 + random() * (FIELD.height - 180);
        pk.vx = 0; pk.vy = 0; pk.life = 14; pk.bob = random() * 6;
      }
    }

    // --- enemies
    let alive = 0;
    for (const e of state.enemies) {
      if (e.dead) continue;
      alive += 1;
      if (e.flash > 0) e.flash -= dt;
      if (e.orbHit > 0) e.orbHit -= dt;
      if (e.phase > 0) e.phase -= dt;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;
      const hpScale = 1 + (state.wave - 1) * 0.02;

      if (e.kind === 'wisp') {
        e.wobble += dt * e.wobbleSpeed;
        e.phaseTimer -= dt;
        if (e.phaseTimer <= 0) { e.phaseTimer = 3; e.phase = 0.6; e.x += nx * 60; e.y += ny * 60; }
        const px = -ny * Math.sin(e.wobble) * 0.7;
        const py = nx * Math.sin(e.wobble) * 0.7;
        e.x += (nx + px) * e.def.speed * dt;
        e.y += (ny + py) * e.def.speed * dt;
      } else if (e.kind === 'spitter') {
        if (d > 280) { e.x += nx * e.def.speed * dt; e.y += ny * e.def.speed * dt; }
        else if (d < 180) { e.x -= nx * e.def.speed * 0.7 * dt; e.y -= ny * e.def.speed * 0.7 * dt; }
        e.spitTimer -= dt;
        if (e.spitTimer <= 0 && e.phase <= 0) {
          e.spitTimer = 2.4;
          const b = freeEBullet();
          if (b) {
            b.active = true; b.x = e.x; b.y = e.y;
            b.vx = nx * 210; b.vy = ny * 210; b.dmg = e.def.damage; b.life = 4;
          }
        }
      } else if (e.kind === 'murkmaw') {
        e.chargeTimer -= dt;
        if (e.charging > 0) {
          e.charging -= dt;
          e.x += e.chargeX * 430 * dt;
          e.y += e.chargeY * 430 * dt;
          particles.embers(e.x, e.y, 1);
        } else if (e.chargeTimer <= 0 && d < 420) {
          e.charging = 0.7;
          e.chargeTimer = 3.4;
          e.chargeX = nx; e.chargeY = ny;
          e.flash = 0.4;
        } else {
          e.x += nx * e.def.speed * hpScale * dt;
          e.y += ny * e.def.speed * hpScale * dt;
        }
      } else if (e.kind === 'duskqueen') {
        if (d > 320) { e.x += nx * e.def.speed * dt; e.y += ny * e.def.speed * dt; }
        else if (d < 220) { e.x -= nx * e.def.speed * 0.6 * dt; e.y -= ny * e.def.speed * 0.6 * dt; }
        e.wobble += dt * 2;
        e.x += Math.cos(e.wobble) * 24 * dt;
        e.burstTimer -= dt;
        if (e.burstTimer <= 0) {
          e.burstTimer = 3.2;
          for (let i = 0; i < 10; i += 1) {
            const b = freeEBullet();
            if (!b) break;
            const a = (i / 10) * Math.PI * 2 + e.wobble;
            b.active = true; b.x = e.x; b.y = e.y;
            b.vx = Math.cos(a) * 175; b.vy = Math.sin(a) * 175; b.dmg = 12; b.life = 5;
          }
          e.flash = 0.3;
        }
        e.summonTimer -= dt;
        if (e.summonTimer <= 0) {
          e.summonTimer = 7;
          for (let i = 0; i < 3; i += 1) {
            const m = freeEnemy();
            if (!m) break;
            const fresh = makeEnemy('mote', e.x + (random() - 0.5) * 80, e.y + (random() - 0.5) * 80, random);
            fresh.hp = scaledHp('mote', state.wave); fresh.maxHp = fresh.hp;
            Object.assign(m, fresh, { dead: false });
          }
        }
      } else {
        e.x += nx * e.def.speed * hpScale * dt;
        e.y += ny * e.def.speed * dt;
      }
      e.x = Math.max(-60, Math.min(FIELD.width + 60, e.x));
      e.y = Math.max(-60, Math.min(FIELD.height + 60, e.y));

      // touch damage
      const rr = e.radius + PLAYER.radius - 2;
      if (e.phase <= 0 && dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        events |= damagePlayer(e.def.damage, e.x, e.y);
        // push the enemy back so one touch is not a blender
        e.x -= nx * 26; e.y -= ny * 26;
      }
      if (state.phase !== 'play') return events;
    }

    // --- player bullets
    for (const b of state.bullets) {
      if (!b.active) continue;
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) { b.active = false; continue; }
      for (const e of state.enemies) {
        if (e.dead || e.phase > 0) continue;
        const rr = e.radius + PLAYER.bulletRadius;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          e.hp -= b.dmg;
          e.flash = 0.09;
          particles.burst(b.x, b.y, '#ffb347', 3, 120);
          if (e.hp <= 0) events |= killEnemy(e);
          if (b.pierce > 0) { b.pierce -= 1; }
          else { b.active = false; }
          break;
        }
      }
    }

    // --- enemy bullets
    for (const b of state.ebullets) {
      if (!b.active) continue;
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) { b.active = false; continue; }
      const rr = PLAYER.radius + 7;
      if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
        b.active = false;
        events |= damagePlayer(b.dmg, b.x, b.y);
      }
      if (state.phase !== 'play') return events;
    }

    // --- pickups
    for (const pk of state.pickups) {
      if (!pk.active) continue;
      pk.life -= dt;
      pk.bob += dt;
      if (pk.life <= 0) { pk.active = false; continue; }
      const d2 = dist2(pk.x, pk.y, p.x, p.y);
      if (pk.kind === 'ember' && d2 < 110 * 110) {
        const d = Math.sqrt(d2) || 1;
        pk.x += ((p.x - pk.x) / d) * 320 * dt;
        pk.y += ((p.y - pk.y) / d) * 320 * dt;
      }
      if (d2 < (PLAYER.radius + 14) * (PLAYER.radius + 14)) {
        pk.active = false;
        if (pk.kind === 'ember') {
          state.embers += 1;
          addScore(25, pk.x, pk.y);
          events |= EVENT_PICKUP;
        } else {
          state.fireflies += 1;
          p.hp = Math.min(p.maxHp, p.hp + FIREFLY_HEAL);
          addScore(150, pk.x, pk.y);
          particles.floatText(pk.x, pk.y - 18, `Firefly rescued! +${FIREFLY_HEAL} flame`, '#7fe3d0', 15);
          events |= EVENT_FIREFLY;
        }
      }
    }

    // --- wave clear?
    if (state.spawnQueue.length === 0 && alive === 0 && state.phase === 'play') {
      if (state.wave >= WAVES.length) return events; // win handled by queen kill
      state.draft = drawDraft(random, state.taken);
      state.phase = 'draft';
      particles.ring(p.x, p.y, '#7fe3d0');
      events |= EVENT_WAVE_CLEAR;
    }

    particles.step(dt);
    for (const a of state.ambient) {
      a.p += dt;
      a.x += Math.cos(a.a + a.p * 0.3) * a.s * dt * 0.2;
      a.y += Math.sin(a.a * 2 + a.p * 0.2) * a.s * dt * 0.2;
    }
    return events;
  }

  /** Advance one fixed step. `ctrl` carries move/aim/shoot/dash for play. */
  function step(dt, ctrl) {
    state.aimX = ctrl ? ctrl.ax : FIELD.width / 2;
    state.aimY = ctrl ? ctrl.ay : FIELD.height / 2;
    if (state.phase === 'play') return stepPlay(dt, ctrl || { mx: 0, my: 0, ax: 640, ay: 200, shoot: false, dash: false });
    // Title / draft / end screens keep the garden breathing.
    state.time += dt;
    particles.step(dt);
    for (const a of state.ambient) {
      a.p += dt;
      a.x += Math.cos(a.a + a.p * 0.3) * a.s * dt * 0.2;
      a.y += Math.sin(a.a * 2 + a.p * 0.2) * a.s * dt * 0.2;
    }
    if (state.phase === 'win' && Math.random() < 0.1) particles.embers(640 + (Math.random() - 0.5) * 500, 500, 1);
    return 0;
  }

  /** Take a draft card (0-based) and start the next wave. Returns true when taken. */
  function takeDraft(index) {
    if (state.phase !== 'draft' || !state.draft || index < 0 || index >= state.draft.length) return false;
    const up = state.draft[index];
    applyUpgrade(state.stats, up.id);
    state.taken[up.id] = (state.taken[up.id] || 0) + 1;
    state.player.maxHp = state.stats.maxHp;
    if (up.id === 'glass') state.player.hp = Math.min(state.player.maxHp, state.player.hp + 25);
    state.draft = null;
    state.phase = 'play';
    startWave(state.wave + 1);
    return true;
  }

  return {
    state, particles, reset, startRun, step, takeDraft, startWave,
    get bossHp() {
      if (!state.boss || state.boss.dead) return -1;
      return state.boss.hp / state.boss.maxHp;
    },
    get auraRadius() { return PLAYER.auraRadius * state.stats.auraMul; },
  };
}
