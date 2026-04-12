export interface TweenHandle {
  cancelled: boolean;
}

/**
 * 轻量级 fromTo tween，替代 TweenLite.fromTo
 *
 * @param duration  持续时间（秒）
 * @param from      起始值
 * @param to        结束值
 * @param onUpdate  每帧回调，参数为当前插值
 * @returns         handle，将 handle.cancelled = true 可中途取消
 */
export function tweenFromTo(
  duration: number,
  from: number,
  to: number,
  onUpdate: (v: number) => void
): TweenHandle {
  const handle: TweenHandle = { cancelled: false };
  const startTime = performance.now();
  const ms = duration * 1000;

  function tick(now: number): void {
    if (handle.cancelled) return;

    const t = Math.min((now - startTime) / ms, 1);
    // ease-in-out，与 TweenLite 默认 Power1.easeInOut 接近
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    onUpdate(from + (to - from) * eased);

    if (t < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
  return handle;
}
