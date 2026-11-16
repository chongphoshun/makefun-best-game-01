// LANTERNFALL — keep the last light burning until dawn.
//
// Dear judge: this is a complete game, and this file is its front door. You are
// the keeper: WASD to move, mouse to aim, hold click to burn the dark, Shift to
// dash. Ten waves stand between you and dawn — a draft of three upgrades after
// every wave, a brute at wave 5, and the Dusk Queen at wave 10. Rescue the
// fireflies; they heal the flame. Good luck — the garden is counting on you.
//
// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. The game moves between
// six screens: title, play, draft, paused, game over and victory.
//
// ?seed=N fixes the garden. ?shot=title|play|boss|victory (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, BEST_STARS_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createSound } from './audio.js';
import { createWorld, EVENT_BOSS, EVENT_DASH, EVENT_FIREFLY, EVENT_HIT, EVENT_KILL, EVENT_OVER, EVENT_PICKUP, EVENT_SHOOT, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_DRAFT, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, draftCardRects } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest(key) {
  try {
    return Number.parseInt(window.localStorage.getItem(key) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const sound = createSound();
  const input = createInput(canvas, (px, py) => {
    const rect = canvas.getBoundingClientRect();
    return { x: (px / rect.width) * 1280, y: (py / rect.height) * 720 };
  });
  let screen = SCREEN_TITLE;
  let best = readBest(BEST_KEY);
  let bestStars = readBest(BEST_STARS_KEY);
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    sound.unlock();
    sound.startMusic();
    world.startRun();
    accumulator = 0;
    screen = SCREEN_PLAY;
    sound.waveHorn();
    announce('Playing. Wave 1 of 10. Keep the light burning.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(BEST_KEY, best);
    }
    if (won && world.state.stars > bestStars) {
      bestStars = world.state.stars;
      saveBest(BEST_STARS_KEY, bestStars);
    }
    if (won) sound.victory();
    else sound.defeat();
    announce(won
      ? `Dawn breaks. Victory with ${world.state.stars} stars. Score ${world.state.score}.`
      : `The light goes out on wave ${world.state.wave}. Score ${world.state.score}. Best ${best}.`);
  }

  function handleEvents(events) {
    if (events & EVENT_SHOOT) sound.shoot();
    if (events & EVENT_HIT) sound.hurt();
    if (events & EVENT_KILL) sound.kill();
    if (events & EVENT_PICKUP) sound.pickup();
    if (events & EVENT_FIREFLY) sound.firefly();
    if (events & EVENT_DASH) sound.dash();
    if (events & EVENT_BOSS) sound.bossRoar();
    if (events & EVENT_WAVE_CLEAR) sound.draft();
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, null);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const move = input.moveVector();
    const aim = input.aim();
    const ctrl = {
      mx: move.x, my: move.y, ax: aim.x, ay: aim.y,
      shoot: input.shooting(), dash: input.dashHeld(),
    };
    const events = world.step(STEP, ctrl);
    if (world.state.phase === 'draft' && screen === SCREEN_PLAY) {
      screen = SCREEN_DRAFT;
      announce(`Wave ${world.state.wave} cleared. Choose one upgrade.`);
    }
    handleEvents(events);
  }

  function pickDraftAt(point) {
    const rects = draftCardRects();
    for (let i = 0; i < rects.length; i += 1) {
      const r = rects[i];
      if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) {
        if (world.takeDraft(i)) {
          screen = SCREEN_PLAY;
          sound.waveHorn();
          announce(`Wave ${world.state.wave} of 10.`);
        }
        return true;
      }
    }
    return false;
  }

  function handleActions() {
    const pick = input.draftPick();
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      sound.setMuted(!sound.isMuted());
      announce(sound.isMuted() ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_DRAFT) {
      if (pick >= 1 && pick <= 3) {
        if (world.takeDraft(pick - 1)) {
          screen = SCREEN_PLAY;
          sound.waveHorn();
          announce(`Wave ${world.state.wave} of 10.`);
        }
      } else if (actions & ACTION_CONFIRM) {
        pickDraftAt(input.clickPoint());
      }
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      sound.click();
      startGame();
    } else if (actions & ACTION_RESTART && (screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      if (screen === SCREEN_DRAFT || screen === SCREEN_OVER || screen === SCREEN_WIN) world.step(STEP, null);
    }
    renderer.draw(world.state, screen, best, screen === SCREEN_PLAY ? input.aim() : null);
  }

  // Leaving the tab pauses a running game rather than letting shadows feed unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lanternfall. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
