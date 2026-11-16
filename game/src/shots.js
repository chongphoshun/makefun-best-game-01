// The screenshot scenes behind ?shot=title|play|boss|victory. Each one plays the
// real rules forward from a fresh world with a simple autopilot (kite away from
// the nearest shadow, orbit at ember range, dash when cornered, rescue a firefly
// when it is safe), so the frame is what a real game looks like and the same seed
// always gives the same frame. A victory run that dies is retried — the generator
// has moved on, so each attempt is a different garden.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const SAMPLE = STEP;
/** Draft priority: the autopilot's taste in lantern upgrades. */
const DRAFT_PRIORITY = ['bright', 'rapid', 'wide', 'lantern', 'glass', 'swift', 'fuse', 'heart', 'friend'];

function nearestEnemy(state) {
  let best = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - state.player.x, e.y - state.player.y);
    if (d < bestD) { bestD = d; best = e; }
  }
  return { enemy: best, dist: bestD };
}

function nearestFirefly(state) {
  let best = null;
  let bestD = Infinity;
  for (const pk of state.pickups) {
    if (!pk.active || pk.kind !== 'firefly') continue;
    const d = Math.hypot(pk.x - state.player.x, pk.y - state.player.y);
    if (d < bestD) { bestD = d; best = pk; }
  }
  return { pickup: best, dist: bestD };
}

/** The autopilot's control for one step: move, aim, shoot, dash. */
export function autopilot(state) {
  const p = state.player;
  const { enemy, dist } = nearestEnemy(state);
  let mx = 0;
  let my = 0;
  let ax = p.x;
  let ay = p.y - 100;
  let dash = false;
  if (enemy) {
    ax = enemy.x;
    ay = enemy.y;
    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const d = dist || 1;
    const nx = dx / d;
    const ny = dy / d;
    // Too close: run away. Too far: close in. In range: strafe around the foe.
    // Hurt: keep more distance. An enemy bullet on a collision course: sidestep.
    let rx = 0;
    let ry = 0;
    const fleeAt = p.hp < p.maxHp * 0.35 ? 210 : 140;
    if (dist < fleeAt) { rx = nx; ry = ny; }
    else if (dist > 300) { rx = -nx; ry = -ny; }
    else { rx = -ny; ry = nx; }
    for (const b of state.ebullets) {
      if (!b.active) continue;
      const bdx = b.x - p.x;
      const bdy = b.y - p.y;
      const bd = Math.hypot(bdx, bdy);
      if (bd < 110 && bd > 1) {
        const dot = (b.vx * bdx + b.vy * bdy) / (Math.hypot(b.vx, b.vy) * bd);
        if (dot < -0.6) { rx += -bdy / bd; ry += bdx / bd; }
      }
    }
    mx = rx;
    my = ry;
    // A safe firefly nearby is worth a detour.
    const fly = nearestFirefly(state);
    if (fly.pickup && fly.dist < 200 && dist > 160) {
      mx = (fly.pickup.x - p.x) / fly.dist;
      my = (fly.pickup.y - p.y) / fly.dist;
    }
    // Surrounded: dash out through the gap instead of strafing into the pack.
    let close = 0;
    for (const e of state.enemies) {
      if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 120) close += 1;
    }
    if ((dist < 80 && p.dashTimer <= 0) || (close >= 2 && p.dashTimer <= 0)) dash = true;
  } else {
    // Nothing left: drift toward the centre and wait for the next spawn.
    const dx = FIELD.width / 2 - p.x;
    const dy = FIELD.height / 2 - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > 60) { mx = dx / d; my = dy / d; }
  }
  const len = Math.hypot(mx, my) || 1;
  return { mx: mx / len, my: my / len, ax, ay, shoot: enemy !== null, dash };
}

/** The autopilot's draft pick: the highest-priority card on offer. */
function draftPickIndex(state) {
  if (!state.draft) return -1;
  let best = -1;
  let bestRank = Infinity;
  state.draft.forEach((up, i) => {
    const rank = DRAFT_PRIORITY.indexOf(up.id);
    if (rank >= 0 && rank < bestRank) { bestRank = rank; best = i; }
  });
  return best;
}

/** Step the world with the autopilot until `stop(state, steps)` is true. */
function runUntil(world, stop, maxSteps) {
  let events = 0;
  for (let i = 0; i < maxSteps; i += 1) {
    if (world.state.phase === 'draft') {
      const pick = draftPickIndex(world.state);
      if (pick >= 0) world.takeDraft(pick);
      continue;
    }
    if (world.state.phase !== 'play') break;
    events |= world.step(SAMPLE, autopilot(world.state));
    if (events & EVENT_OVER) break;
    if (stop(world.state, i)) break;
  }
  return events;
}

function aliveCount(state) {
  let n = 0;
  for (const e of state.enemies) if (!e.dead) n += 1;
  return n;
}

/** How many living shadows are within `radius` of the keeper. */
function nearCount(state, radius) {
  let n = 0;
  for (const e of state.enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.x - state.player.x, e.y - state.player.y) < radius) n += 1;
  }
  return n;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show. Scenes: title, play (wave 3 in full fight), boss (the
 * Dusk Queen fight, wave 10), victory (a whole run played to dawn).
 */
export function stageShot(name, world) {
  if (name === 'title') {
    world.reset();
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, null);
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'play') {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      world.startRun();
      let waveSteps = -1;
      const events = runUntil(world, (state, i) => {
        // Wave 6 is the densest mid-game fight: stop 8 s in, with a crowd alive
        // and at least four shadows closing on the keeper, so the frame is a fight.
        if (state.wave === 6) {
          if (waveSteps < 0) waveSteps = i;
          return i - waveSteps > 480 && aliveCount(state) >= 6 && nearCount(state, 400) >= 4;
        }
        return false;
      }, 60 * 600);
      if (!(events & EVENT_OVER) && world.state.phase === 'play' && world.state.wave === 6) {
        return { screen: SCREEN_PLAY, best: world.state.score };
      }
    }
    // The pilot died on the way: fall back to a wave-6 fight staged directly.
    world.reset();
    world.state.phase = 'play';
    world.startWave(6);
    runUntil(world, (state, i) => i > 480 && aliveCount(state) >= 4 && nearCount(state, 400) >= 2, 60 * 120);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }

  if (name === 'boss') {
    // The queen and the keeper must both be on screen, or the frame says nothing.
    const framed = (state) => {
      const b = state.boss;
      const p = state.player;
      return b && !b.dead && b.x > 150 && b.x < 1130 && b.y > 100 && b.y < 600
        && p.x > 40 && p.x < 1240 && p.y > 40 && p.y < 680;
    };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      world.startRun();
      let bossSteps = -1;
      const events = runUntil(world, (state, i) => {
        if (state.boss && !state.boss.dead && state.wave === 10) {
          if (bossSteps < 0) bossSteps = i;
          return (i - bossSteps > 240 && framed(state)) || i - bossSteps > 1500;
        }
        return false;
      }, 60 * 900);
      if (!(events & EVENT_OVER) && world.state.boss && !world.state.boss.dead && framed(world.state)) {
        return { screen: SCREEN_PLAY, best: world.state.score };
      }
    }
    // Fallback: a wave-10 fight staged directly from a fresh garden.
    world.reset();
    world.state.phase = 'play';
    world.startWave(10);
    runUntil(world, (state, i) => (i > 240 && framed(state)) || i > 900, 60 * 60);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }

  // victory: a whole run, played to dawn.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    world.startRun();
    const events = runUntil(world, (state) => state.phase === 'win', 60 * 1200);
    if ((events & EVENT_WIN) || world.state.phase === 'win') {
      return { screen: SCREEN_WIN, best: world.state.score };
    }
  }
  // The pilot never made it: stage the dawn from a finished run's numbers.
  world.reset();
  world.state.phase = 'win';
  world.state.wave = 10;
  world.state.score = 24850;
  world.state.kills = 214;
  world.state.fireflies = 11;
  world.state.embers = 63;
  world.state.runTime = 612;
  world.state.stars = 3;
  world.state.player.hp = 68;
  return { screen: SCREEN_WIN, best: world.state.score };
}
