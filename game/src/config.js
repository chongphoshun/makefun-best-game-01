// LANTERNFALL — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Ten waves, then dawn. Wave 5 holds the mini-boss, wave 10 the final boss. */
export const WAVES = [
  { mote: 10, crawler: 0, spitter: 0, brute: 0, wisp: 0, shade: 0, boss: null, interval: 1.0 },
  { mote: 12, crawler: 5, spitter: 0, brute: 0, wisp: 0, shade: 0, boss: null, interval: 0.9 },
  { mote: 12, crawler: 6, spitter: 4, brute: 0, wisp: 3, shade: 0, boss: null, interval: 0.85 },
  { mote: 14, crawler: 8, spitter: 5, brute: 2, wisp: 4, shade: 2, boss: null, interval: 0.8 },
  { mote: 10, crawler: 6, spitter: 4, brute: 2, wisp: 4, shade: 2, boss: 'murkmaw', interval: 0.75 },
  { mote: 16, crawler: 8, spitter: 6, brute: 3, wisp: 6, shade: 4, boss: null, interval: 0.7 },
  { mote: 18, crawler: 10, spitter: 7, brute: 4, wisp: 7, shade: 5, boss: null, interval: 0.65 },
  { mote: 20, crawler: 10, spitter: 8, brute: 5, wisp: 8, shade: 6, boss: null, interval: 0.6 },
  { mote: 22, crawler: 12, spitter: 9, brute: 6, wisp: 9, shade: 7, boss: null, interval: 0.55 },
  { mote: 14, crawler: 8, spitter: 6, brute: 4, wisp: 8, shade: 5, boss: 'duskqueen', interval: 0.5 },
];

export const PLAYER = {
  radius: 16,
  speed: 265,
  maxHp: 120,
  fireInterval: 0.16,
  bulletSpeed: 640,
  bulletDamage: 12,
  bulletRadius: 6,
  dashCooldown: 2.2,
  dashTime: 0.18,
  dashSpeed: 780,
  auraRadius: 95,
  auraDamage: 9,
  invulnerable: 1.0,
};

export const COMBO_WINDOW = 2.5;
export const FIREFLY_HEAL = 10;
export const BEST_KEY = 'lanternfall.best';
export const BEST_STARS_KEY = 'lanternfall.bestStars';

export const PALETTE = {
  night: '#0b0e1a',
  nightEdge: '#141a2e',
  grass: '#16281c',
  grassLight: '#1d3324',
  path: '#2a2f3a',
  text: '#f4ead2',
  muted: '#9aa3b8',
  gold: '#f2c94c',
  ember: '#ff9a3c',
  flame: '#ffb347',
  hp: '#ff5d5d',
  hpBack: '#3a2028',
  aqua: '#7fe3d0',
  violet: '#b388ff',
  panel: 'rgba(10, 14, 26, 0.82)',
  panelEdge: '#3d4a6b',
  card: '#1b2340',
  cardEdge: '#5a6ea8',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
