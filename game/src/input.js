// Keyboard and mouse, read every frame. The game asks for a movement vector,
// an aim point in field coordinates, and one-shot actions (confirm, pause, dash,
// restart, mute, draft picks 1-3). Nothing here knows about screens or rules.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_RESTART = 8;
export const ACTION_MUTE = 16;

export function createInput(canvas, toField) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 640, y: 360, down: false, clicked: false, clickX: 0, clickY: 0 };
  let actions = 0;

  function keyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    if (!event.repeat) pressed.add(event.key.toLowerCase());
    keys.add(event.key.toLowerCase());
  }
  function keyUp(event) { keys.delete(event.key.toLowerCase()); }
  function mouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const point = toField(event.clientX - rect.left, event.clientY - rect.top);
    mouse.x = point.x;
    mouse.y = point.y;
  }
  function mouseDown(event) {
    mouseMove(event);
    mouse.down = true;
    mouse.clicked = true;
    mouse.clickX = mouse.x;
    mouse.clickY = mouse.y;
  }
  function mouseUp() { mouse.down = false; }
  function blur() { keys.clear(); mouse.down = false; }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', blur);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mousedown', mouseDown);
  window.addEventListener('mouseup', mouseUp);

  return {
    /** Drain one-shot actions pressed since the last call. */
    takeActions() {
      actions = 0;
      if (pressed.has(' ') || pressed.has('enter')) actions |= ACTION_CONFIRM;
      if (pressed.has('p') || pressed.has('escape')) actions |= ACTION_PAUSE;
      if (pressed.has('shift')) actions |= ACTION_DASH;
      if (pressed.has('r')) actions |= ACTION_RESTART;
      if (pressed.has('m')) actions |= ACTION_MUTE;
      if (mouse.clicked) actions |= ACTION_CONFIRM;
      pressed.clear();
      mouse.clicked = false;
      return actions;
    },
    /** -1/0/1 movement vector from WASD or arrow keys. */
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
    aim() { return { x: mouse.x, y: mouse.y }; },
    shooting() { return mouse.down || keys.has('j') || keys.has('z'); },
    dashHeld() { return keys.has('shift') || keys.has('k'); },
    /** The field point of the last click (for draft cards and buttons). */
    clickPoint() { return { x: mouse.clickX, y: mouse.clickY }; },
    /** Which draft card (1-3) was picked this frame, or 0. */
    draftPick() {
      if (pressed.has('1')) return 1;
      if (pressed.has('2')) return 2;
      if (pressed.has('3')) return 3;
      return 0;
    },
    consumeClick() { mouse.clicked = false; },
  };
}
