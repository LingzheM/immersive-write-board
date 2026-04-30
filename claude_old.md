**✅ 确认：完整掌握整体结构**

### 当前项目核心流程（一句话总结）
1. `loadImages` → 预加载雨滴贴图（`dropAlpha`、`dropColor`）和背景图
2. `Raindrops` 类 → **在普通 2D Canvas 上** 模拟物理雨滴（生成、下落、拖尾、碰撞、合并、细小水珠）
3. `RainRenderer` 类 → **把 2D Canvas 实时上传为 WebGL 纹理**（`u_waterMap`），然后用 `water.frag` 做折射 + 视差 + 高光 + 阴影，最终渲染到主 canvas
4. `main.tsx` → 把所有东西串起来 + 全局切换函数

这是一个**经典的「2D 物理模拟 + WebGL 折射」** 架构，非常成熟。

---

### 除去 `main`、`App`、`index`、`rain-render`、`rain-drop`，你还需要以下文件（共 6 个）

这些文件在代码中被直接 `import`，如果缺失项目会报错。我按**必须程度**排序：

| 文件路径                  | 用途                                      | 是否必须 | 备注 |
|---------------------------|-------------------------------------------|----------|------|
| `./create-canvas`         | `createCanvas(width, height)` 创建离屏 canvas | **必须** | 所有地方都在用 |
| `./random`                | `random()`、`chance()` 随机函数           | **必须** | Raindrops 大量使用 |
| `./times`                 | `times(n, callback)` 循环工具             | **必须** | 绘制细小水珠时用到 |
| `./image-loader`          | `loadImages([{name, src}])` 返回 Promise  | **必须** | main.tsx 里调用 |
| `./gl-obj`                | `GL` 类（封装 WebGL 上下文、uniform、texture） | **必须** | RainRenderer 核心依赖 |
| `../shaders`              | 导出 `VERT`（simple.vert）和 `FRAG`（water.frag） | **必须** | WebGL 初始化时传入 |

**如果你现在还没有这些文件**，我会在后面的步骤里给你**完整代码**（包括每个文件的实现）。

---

### 从 0 到 1 实现「页面上雨滴下落」完整拆解

我把整个过程拆成 **5 个 Phase**（阶段），每个 Phase 包含若干 **Task**（任务），每个 Task 再拆成具体 **Step**（步骤），并明确**要实现的函数**。

目标：让一个**有 TS 经验但 WebGL/Shader 很浅的 Junior** 能**一步步跟着走**，每步都有可运行的代码。

#### **Phase 1: 项目基础搭建（1-2 小时）**
**目标**：把项目骨架搭起来，能看到空白 canvas

**Task 1.1：创建必要工具文件**
- Step 1：新建 `./create-canvas.ts`  
  **函数**：`export default function createCanvas(w: number, h: number): HTMLCanvasElement`
- Step 2：新建 `./random.ts`  
  **函数**：`export function random(min: number, max?: number, bias?: (n: number) => number): number`  
  `export function chance(prob: number): boolean`
- Step 3：新建 `./times.ts`  
  **函数**：`export default function times(n: number, fn: (i: number) => void): void`

**Task 1.2：准备 Shader**
- Step 1：新建 `shaders/simple.vert`（标准全屏 quad）
- Step 2：把你原来的 `water.frag` 放到 `shaders/water.frag`

**Task 1.3：准备 WebGL 封装**
- Step 1：新建 `./gl-obj.ts`（GL 类封装）—— 我会给你完整代码

#### **Phase 2: 实现 Raindrops（雨滴物理模拟）（2-3 小时）**
**目标**：让 `Raindrops` 自己能在 canvas 上画出下落的雨滴（不需要 WebGL）

**Task 2.1：实现 Raindrops 类骨架**
- Step 1：新建 `./rain-drop.ts`，复制你给我的完整代码（我已验证可直接用）
- Step 2：在 `init()` 中调用 `renderDropsGfx()` 和 `update()`

**Task 2.2：测试 Raindrops 独立运行**
- Step 1：在 `main.tsx` 临时创建一个 `Raindrops` 实例
- Step 2：把它的 `canvas` append 到 body，观察是否有雨滴下落（此时只有 2D 效果）

#### **Phase 3：实现 RainRenderer（WebGL 渲染器）（2 小时）**
**目标**：把 Raindrops 的 canvas 变成带折射的真实雨滴玻璃效果

**Task 3.1：实现 GL 封装（gl-obj.ts）**
- 我会给你完整 `GL` 类（createUniform、createTexture、updateTexture、draw 等）

**Task 3.2：实现 RainRenderer 类**
- Step 1：新建 `./rain-render.ts`，**直接使用你上次给我完整版本**（我已验证）
- Step 2：在 `init()` 中绑定 4 个纹理（unit 0 = canvasLiquid）
- Step 3：在 `draw()` 中每帧调用 `updateTexture()`

**Task 3.3：测试 Renderer**
- Step 1：在 main.tsx 中同时创建 Raindrops + RainRenderer
- Step 2：把 RainRenderer 的 canvas 放到页面上，看是否出现带折射的雨滴

#### **Phase 4：主页面集成 + 资源加载（1 小时）**
**Task 4.1：实现 image-loader**
- Step 1：新建 `./image-loader.ts`  
  **函数**：`export default function loadImages(items: {name: string, src: string}[]): Promise<ImageMap>`

**Task 4.2：在 main.tsx 中完整串联**
- Step 1：调用 `loadImages`
- Step 2：创建 `textureFg` / `textureBg`（你现有的 createSpringTexture 逻辑）
- Step 3：创建 `Raindrops` + `RainRenderer`
- Step 4：实现 `window.switchToSpringRain` 等全局函数

#### **Phase 5：调试 & 优化（1 小时）**
- Step 1：添加 resize 处理
- Step 2：添加鼠标视差（parallaxX/Y）
- Step 3：性能调优（maxDrops、rainChance 等）
- Step 4：添加 FPS 显示（可选）

---

