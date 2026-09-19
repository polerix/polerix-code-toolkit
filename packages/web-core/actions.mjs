// Unified input. Keyboard, on-screen buttons, virtual stick and gamepad all drive the same
// named actions ("left", "fire"), so a game written against actions runs on desktop and phone.

export function createActions() {
  const down = new Set();
  const listeners = new Set();
  const emit = (action, pressed) => listeners.forEach((cb) => cb(action, pressed));
  return {
    press(action) { if (!down.has(action)) { down.add(action); emit(action, true); } },
    release(action) { if (down.delete(action)) emit(action, false); },
    releaseAll() { [...down].forEach((a) => this.release(a)); },
    isDown: (action) => down.has(action),
    axis: (negative, positive) => (down.has(positive) ? 1 : 0) - (down.has(negative) ? 1 : 0),
    onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  };
}

// map: { ArrowLeft: 'left', ' ': 'fire', ... } keyed by KeyboardEvent.key or .code
export function bindKeyboard(actions, map, target = globalThis) {
  const lookup = (e) => map[e.code] ?? map[e.key];
  const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') || e.target?.isContentEditable;
  const onDown = (e) => { const a = lookup(e); if (a && !typing(e)) { e.preventDefault?.(); actions.press(a); } };
  const onUp = (e) => { const a = lookup(e); if (a) actions.release(a); };
  const onBlur = () => actions.releaseAll(); // never leave a key "stuck" after alt-tab
  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);
  target.addEventListener('blur', onBlur);
  return () => {
    target.removeEventListener('keydown', onDown);
    target.removeEventListener('keyup', onUp);
    target.removeEventListener('blur', onBlur);
  };
}

// Any element with data-action="fire" inside root becomes a hold-to-press button.
export function bindButtons(actions, root) {
  const cleanups = [];
  root.querySelectorAll('[data-action]').forEach((el) => {
    const action = el.dataset.action;
    el.style.touchAction = 'none';
    const press = (e) => { e.preventDefault?.(); actions.press(action); };
    const release = () => actions.release(action);
    el.addEventListener('pointerdown', press);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => el.addEventListener(t, release));
    cleanups.push(() => {
      el.removeEventListener('pointerdown', press);
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => el.removeEventListener(t, release));
    });
  });
  return () => cleanups.forEach((fn) => fn());
}

// Pure math for a virtual joystick: clamp to maxRadius, apply a deadzone, normalise to -1..1.
export function stickVector(dx, dy, maxRadius = 70, deadzone = 0.15) {
  const dist = Math.hypot(dx, dy);
  const magnitude = Math.min(dist / maxRadius, 1);
  if (magnitude < deadzone) return { x: 0, y: 0, magnitude: 0 };
  const scale = magnitude / dist;
  return { x: dx * scale, y: dy * scale, magnitude };
}

// Virtual stick: dragging inside `el` presses left/right/up/down when past `threshold`.
export function bindStick(actions, el, { maxRadius = 70, deadzone = 0.15, threshold = 0.4, names = {}, onVector } = {}) {
  const n = { left: 'left', right: 'right', up: 'up', down: 'down', ...names };
  let active = null;
  const apply = (v) => {
    const set = (name, on) => (on ? actions.press(name) : actions.release(name));
    set(n.left, v.x < -threshold); set(n.right, v.x > threshold);
    set(n.up, v.y < -threshold);   set(n.down, v.y > threshold);
    onVector?.(v);
  };
  const move = (e) => {
    if (active !== e.pointerId) return;
    const r = el.getBoundingClientRect();
    apply(stickVector(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2), maxRadius, deadzone));
  };
  const end = (e) => {
    if (active !== e.pointerId) return;
    active = null;
    apply({ x: 0, y: 0, magnitude: 0 });
  };
  const start = (e) => { e.preventDefault?.(); active = e.pointerId; el.setPointerCapture?.(e.pointerId); move(e); };
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  return () => {
    el.removeEventListener('pointerdown', start);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', end);
    el.removeEventListener('pointercancel', end);
  };
}

// Call once per frame. map: { 0: 'fire', 14: 'left', 15: 'right' } (standard-mapping button indexes).
export function pollGamepad(actions, map, nav = globalThis.navigator, axisThreshold = 0.5) {
  const pad = nav?.getGamepads?.().find(Boolean);
  if (!pad) return false;
  Object.entries(map).forEach(([i, action]) => (pad.buttons[i]?.pressed ? actions.press(action) : actions.release(action)));
  const [x = 0, y = 0] = pad.axes;
  const set = (name, on) => (on ? actions.press(name) : actions.release(name));
  set('left', x < -axisThreshold); set('right', x > axisThreshold);
  set('up', y < -axisThreshold);   set('down', y > axisThreshold);
  return true;
}
