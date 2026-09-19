// requestAnimationFrame loop with a clamped delta time, pause, and tab-visibility handling.
// update(dt) receives seconds. A tab switch or debugger pause can't produce a huge dt.

export function createLoop({
  update,
  render,
  maxDt = 0.05,
  raf = globalThis.requestAnimationFrame?.bind(globalThis),
  caf = globalThis.cancelAnimationFrame?.bind(globalThis),
  doc = globalThis.document,
} = {}) {
  let handle = null;
  let last = null;
  let paused = false;
  let running = false;

  const onVisibility = () => { last = null; }; // don't count time spent hidden

  function tick(now) {
    if (!running) return;
    handle = raf(tick);
    const dt = last === null ? 0 : Math.min((now - last) / 1000, maxDt);
    last = now;
    if (!paused) update?.(dt);
    render?.(dt);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = null;
      doc?.addEventListener?.('visibilitychange', onVisibility);
      handle = raf(tick);
    },
    stop() {
      running = false;
      if (handle !== null) caf?.(handle);
      handle = null;
      doc?.removeEventListener?.('visibilitychange', onVisibility);
    },
    pause() { paused = true; },
    resume() { paused = false; last = null; },
    get paused() { return paused; },
    get running() { return running; },
  };
}
