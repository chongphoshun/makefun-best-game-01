// The six shadow kinds and the two bosses: what each one is, how it moves and
// what it is worth. The world owns the live instances; this file only defines them.
export const ENEMY_DEFS = {
  mote: { hp: 14, speed: 155, damage: 8, score: 10, radius: 12, color: '#8d7bff', eye: '#e6e0ff' },
  crawler: { hp: 32, speed: 96, damage: 12, score: 20, radius: 18, color: '#5d6b8a', eye: '#ffd166' },
  spitter: { hp: 26, speed: 82, damage: 10, score: 30, radius: 16, color: '#4fae8a', eye: '#d2ffe9' },
  brute: { hp: 115, speed: 62, damage: 20, score: 50, radius: 28, color: '#7a4a6b', eye: '#ff8fa3' },
  wisp: { hp: 22, speed: 172, damage: 10, score: 40, radius: 13, color: '#b388ff', eye: '#ffffff' },
  shade: { hp: 48, speed: 112, damage: 12, score: 40, radius: 17, color: '#3d3a5c', eye: '#9df2ff' },
  murkmaw: { hp: 620, speed: 74, damage: 24, score: 400, radius: 44, color: '#6b2d4d', eye: '#ff5d5d', boss: true, name: 'MURKMAW, the Gloam Brute' },
  duskqueen: { hp: 1100, speed: 88, damage: 26, score: 1000, radius: 48, color: '#4b2d7a', eye: '#ffe066', boss: true, name: 'THE DUSK QUEEN' },
};

/** Enemy kinds in the order waves introduce them (used by the title screen's bestiary line). */
export const ENEMY_KINDS = ['mote', 'crawler', 'spitter', 'wisp', 'shade', 'brute'];

/** Boss kinds, in wave order. */
export const BOSS_KINDS = ['murkmaw', 'duskqueen'];

/** A fresh enemy instance at (x, y). */
export function makeEnemy(kind, x, y, random) {
  const def = ENEMY_DEFS[kind];
  return {
    kind, x, y, def,
    hp: def.hp, maxHp: def.hp,
    radius: def.radius,
    angle: random() * Math.PI * 2,
    wobble: random() * Math.PI * 2,
    wobbleSpeed: 1.5 + random() * 2,
    spitTimer: 1.5 + random() * 1.5,
    chargeTimer: 3 + random() * 2,
    charging: 0,
    chargeX: 0, chargeY: 0,
    summonTimer: 6,
    burstTimer: 4,
    flash: 0,
    phase: 0,
    phaseTimer: 0,
    dead: false,
  };
}

/** How much a kind's hp grows with the wave, so late waves stay dangerous. */
export function scaledHp(kind, wave) {
  return Math.round(ENEMY_DEFS[kind].hp * (1 + (wave - 1) * 0.07));
}
