// Sharp canvas that fills its container on HiDPI screens.
// Pair with CSS:  canvas { position:absolute; inset:0; width:100%; height:100%; }
// Without that CSS the canvas falls back to its width/height attributes (css*dpr),
// so it renders dpr times too large and is clipped on real phones.

export function fitCanvas(canvas, ctx, { width, height, dpr, maxDpr = 3, env = globalThis } = {}) {
  const box = canvas.parentElement?.getBoundingClientRect?.() ?? { width: 0, height: 0 };
  const cssW = width ?? box.width;
  const cssH = height ?? box.height;
  const ratio = Math.min(dpr ?? env.devicePixelRatio ?? 1, maxDpr);
  canvas.width = Math.round(cssW * ratio);
  canvas.height = Math.round(cssH * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); // callers keep drawing in CSS pixels
  return { cssW, cssH, dpr: ratio };
}

// Refit whenever the container changes size. Returns an unsubscribe function.
export function observeCanvas(canvas, ctx, onResize, env = globalThis) {
  const refit = () => onResize?.(fitCanvas(canvas, ctx, { env }));
  let stop;
  if (typeof env.ResizeObserver === 'function' && canvas.parentElement) {
    const ro = new env.ResizeObserver(refit);
    ro.observe(canvas.parentElement);
    stop = () => ro.disconnect();
  } else {
    env.addEventListener('resize', refit);
    stop = () => env.removeEventListener('resize', refit);
  }
  refit();
  return stop;
}
