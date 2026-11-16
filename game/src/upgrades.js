// The nine lantern upgrades offered as a 3-card draft after every cleared wave.
// Each one is a real, stackable change to the keeper's stats, named in plain words
// so the draft screen reads at a glance. `max` is how many times it can stack.
export const UPGRADES = [
  { id: 'bright', name: 'Bright Bullets', icon: '☀', max: 3, desc: '+25% ember damage' },
  { id: 'rapid', name: 'Rapid Wick', icon: '≫', max: 3, desc: '+20% fire rate' },
  { id: 'wide', name: 'Wide Flame', icon: '✦', max: 2, desc: '+1 ember per shot' },
  { id: 'swift', name: 'Swift Boots', icon: '➤', max: 3, desc: '+12% move speed' },
  { id: 'glass', name: 'Thick Glass', icon: '♥', max: 3, desc: '+25 max flame, heal 25' },
  { id: 'fuse', name: 'Long Fuse', icon: '—›', max: 2, desc: 'Embers pierce +1 foe' },
  { id: 'heart', name: 'Ember Heart', icon: '♦', max: 2, desc: 'Dash recharges 35% faster' },
  { id: 'friend', name: 'Firefly Friend', icon: '✧', max: 2, desc: 'A firefly orbits and burns foes' },
  { id: 'lantern', name: 'Big Lantern', icon: '◉', max: 3, desc: '+35% light aura, +aura burn' },
];

/** Apply one upgrade to the keeper's derived stats object. */
export function applyUpgrade(stats, id) {
  if (id === 'bright') stats.damageMul *= 1.25;
  else if (id === 'rapid') stats.fireInterval *= 0.83;
  else if (id === 'wide') stats.projectiles += 1;
  else if (id === 'swift') stats.speedMul *= 1.12;
  else if (id === 'glass') { stats.maxHp += 25; stats.heal = (stats.heal || 0) + 25; }
  else if (id === 'fuse') stats.pierce += 1;
  else if (id === 'heart') stats.dashCooldownMul *= 0.65;
  else if (id === 'friend') stats.orbiters += 1;
  else if (id === 'lantern') { stats.auraMul *= 1.35; stats.auraDamage += 4; }
}

/** The keeper's derived stats before any upgrade. */
export function baseStats() {
  return {
    damageMul: 1, fireInterval: 0.16, projectiles: 1, speedMul: 1,
    maxHp: 120, heal: 0, pierce: 0, dashCooldownMul: 1, orbiters: 0,
    auraMul: 1, auraDamage: 9,
  };
}

/** Three distinct upgrades the keeper can still take, drawn with the given generator. */
export function drawDraft(random, taken) {
  const pool = UPGRADES.filter((u) => (taken[u.id] || 0) < u.max);
  const out = [];
  const copy = pool.slice();
  while (out.length < 3 && copy.length > 0) {
    const index = Math.floor(random() * copy.length);
    out.push(copy.splice(index, 1)[0]);
  }
  return out;
}
