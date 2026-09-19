// Web Audio that works on iOS and Chrome autoplay rules.
// A context may only start from a user-activation event. Per the HTML spec, touch input
// activates on touchend / pointerup, NOT touchstart. Mouse activates on mousedown, keys on keydown.
// So listen to all of those and retry until the context reports 'running'.

const ACTIVATION_EVENTS = ['pointerup', 'touchend', 'mousedown', 'keydown', 'click'];

export function createAudioUnlock({ win = globalThis, events = ACTIVATION_EVENTS, masterGain = 0.5 } = {}) {
  const AC = win.AudioContext || win.webkitAudioContext;
  const state = { ctx: null, master: null, unlocked: false };
  const callbacks = new Set();

  function ensure() {
    if (!AC) return null;
    if (!state.ctx) {
      state.ctx = new AC();
      state.master = state.ctx.createGain();
      state.master.gain.value = masterGain;
      state.master.connect(state.ctx.destination);
    }
    return state.ctx;
  }

  async function attempt() {
    const ctx = ensure();
    if (!ctx) return false;
    try {
      if (ctx.state === 'suspended') await ctx.resume();
    } catch { /* not yet activated: try again on the next event */ }
    if (ctx.state === 'running' && !state.unlocked) {
      state.unlocked = true;
      // Older iOS needs one audible-graph start inside the gesture.
      try {
        const src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, 22050);
        src.connect(ctx.destination);
        src.start(0);
      } catch { /* ignore */ }
      detach();
      callbacks.forEach((cb) => cb(ctx));
    }
    return state.unlocked;
  }

  function attach() { events.forEach((e) => win.addEventListener(e, attempt, { passive: true })); }
  function detach() { events.forEach((e) => win.removeEventListener(e, attempt)); }
  attach();

  return {
    get ctx() { return state.ctx; },
    get master() { return state.master; },
    get unlocked() { return state.unlocked; },
    supported: Boolean(AC),
    onUnlock(cb) { if (state.unlocked) cb(state.ctx); else callbacks.add(cb); },
    suspend: async () => { if (state.ctx?.state === 'running') await state.ctx.suspend(); },
    resume: attempt,
    destroy() { detach(); callbacks.clear(); },
  };
}
