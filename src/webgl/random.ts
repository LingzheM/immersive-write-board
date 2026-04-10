// ============================================================
// 类型定义
// ============================================================

/**
 * 插值函数：接收 0~1 的随机数，返回变换后的 0~1 值
 * 用于控制随机分布的曲线（如 n*n 使结果偏向小值）
 */
type Interpolation = (n: number) => number;

// ============================================================
// random：函数重载
// ============================================================

/**
 * 重载签名（Overload Signatures）：只描述类型，不写实现
 * TS 会用这些签名来检查调用方的参数，选择匹配的那个
 *
 * 重载 1：random()        → 返回 0~1 之间的随机数
 * 重载 2：random(to)      → 返回 0~to 之间的随机数
 * 重载 3：random(from, to)              → 返回 from~to
 * 重载 4：random(from, to, interpolation) → 带插值函数
 */
export function random(): number;
export function random(to: number): number;
export function random(from: number, to: number): number;
export function random(from: number, to: number, interpolation: Interpolation): number;

/**
 * 实现签名（Implementation Signature）：
 * 参数类型是所有重载的联合，调用方看不到这个签名
 * 只有上面的重载签名对外可见
 */
export function random(
  from?: number,
  to?: number,
  interpolation?: Interpolation
): number {
  // 参数标准化：统一处理三种调用方式
  if (from === undefined) {
    // random() → 0~1
    from = 0;
    to = 1;
  } else if (to === undefined) {
    // random(to) → 0~to
    to = from;
    from = 0;
  }
  // random(from, to) 和 random(from, to, fn) 不需要额外处理

  const delta = to - from;
  const interp: Interpolation = interpolation ?? ((n) => n);

  return from + interp(Math.random()) * delta;
}

// ============================================================
// chance
// ============================================================

/**
 * 返回 true 的概率为 c（c 取值范围 0~1）
 * 例：chance(0.3) 有 30% 的概率返回 true
 */
export function chance(c: number): boolean {
  return random() <= c;
}