# React 性能优化实战 · 演示工程

一个给 **Vue 团队讲 React 性能优化**的互动演示站点。左侧是课程大纲，每一章都有可以直接点的 Demo，
配合顶栏的开关可以现场「制造卡顿」，让听众亲眼看到问题、再看到优化前后的差别。

> 演示站点的每一处都做了标注：谁重渲染了、渲染了几次、花了多少毫秒 —— 都可以当场指给听众看。

---

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173

npm run build      # 生产构建：可以看到每个章节被拆成了独立的 chunk
npm run preview    # 预览生产构建（演示真实性能请用这个）
npm run lint       # oxlint
```

## 演示前准备（建议照着做）

1. 安装 **React Developer Tools** 浏览器扩展。
2. 打开 **Profiler** 面板，勾选 `Highlight updates when components render` —— 重渲染的组件会出现彩色描边。
3. 打开 **Components** 面板，勾选 `Highlight updates`，可以逐层看 props 变化。
4. 用 `npm run build` + `npm run preview` 演示卡顿（开发环境有 StrictMode 双渲染，数字会被放大）。
5. 顶栏的「模拟单次渲染耗时」建议调到 **6~10ms**，投影出来才看得出区别。

## 顶栏的开关

| 控件 | 作用 |
| --- | --- |
| 模拟单次渲染耗时 | 让 `HeavyBox` 这类「昂贵组件」在 render 期间同步耗时 N 毫秒，用来现场制造卡顿 |
| 渲染徽章 | 显示 / 隐藏每个组件上的渲染次数徽章。**在讲「memo 优化前后对比」时建议先关掉** —— 徽章本身是个组件，会产生干扰 |
| 控制台渲染日志 | 每次组件渲染都会在控制台打印 `[render] 组件名 ×N` |
| ↻ 重置计数 | 通过改变 `key` 让页面重新挂载，把所有渲染计数清零（顺便演示「用 key 重置组件状态」） |

---

## 章节大纲

| # | 路由 | 主题 | 关键 Demo |
| --- | --- | --- | --- |
| 01 | `/rerender` | 重渲染机制 & React.memo | 父组件带累整棵子树 / memo 生效 / memo 失效（新对象、新函数）/ children 插槽 / key 复用与重建 |
| 02 | `/memo` | useMemo / useCallback | 20,000 条数据的筛选排序对比 / useCallback 让 effect 依赖稳定 / 空依赖数组的闭包陷阱 / 给廉价计算加缓存的反模式 |
| 03 | `/structure` | 组件结构与状态设计 | 状态下沉 / index 当 key 的错位 bug / 不要把派生值存进 state / 自动批处理 / **useReducer 的 dispatch 恒定引用** / **useRef 存不参与渲染的值** |
| 04 | `/context` | Context 性能陷阱 | 一个大 Context 拖垮全部消费者 / 拆分 Context / 外部 store + selector 精准订阅 / value 忘了 memo |
| 05 | `/list` | 长列表虚拟化 | 50,000 行的 DOM 节点数对比 / 手写虚拟滚动 Hook / 虚拟化之后的搜索筛选 |
| 06 | `/split` | 代码分割与懒加载 | 静态引入 vs `React.lazy`（含骨架屏）/ hover 预加载路由 chunk / 加载失败 + 重试 |
| 07 | `/concurrent` | 并发渲染特性 | `useDeferredValue` 让输入框永远跟手 / `useTransition` 让慢操作后台化 / **`useEffect` vs `useLayoutEffect` 的闪烁对比** / **`flushSync` 反面教材** |
| 08 | `/profiler` | 用 Profiler 量化性能 | `<Profiler>` 埋点实时对比优化前后 / actualDuration vs baseDuration / 度量流程 |
| 09 | `/compare` | Vue ↔ React 对照 | 心智模型差异 / API 对照表 / 代码对照 / 从 Vue 过来最容易踩的 7 个坑 |
| 10 | `/react19` | React 19 性能新特性 | `useOptimistic` 感知性能 / `useActionState` / Suspense + transition 消除闪烁 / **`<Activity>`（KeepAlive 的对应物）** / React Compiler |

### 建议的时间分配（约 75 分钟）

| 时长 | 内容 |
| --- | --- |
| 3 min | 开场：用一个「输入框打字卡顿」的现场演示建立共鸣（第 01 章 Demo 1） |
| 25 min | 渲染层：memo / useMemo / useCallback / 组件结构与状态设计（01~03） |
| 15 min | 数据层：Context 陷阱 + 长列表虚拟化（04~05） |
| 12 min | 加载与并发：代码分割 + 并发特性 + 两个时机类 API（06~07） |
| 10 min | 度量与迁移：Profiler + Vue/React 对照（08~09） |
| 10 min | 前瞻：React 19 新特性 + React Compiler（10） |

> 如果只有 60 分钟：**第 10 章压缩到 3 分钟只讲 `<Activity>` 和 React Compiler 的结论**，其余章节按上表。
> 第 10 章不能完全跳过 —— 第 09 章有一处结论（KeepAlive）必须靠它来更正。

---

## 项目结构

```
src/
├── lib/
│   ├── perf.ts             # 模拟耗时计算、假数据生成
│   ├── settings.ts         # 全局演示参数（外部 store + useSyncExternalStore，本身就是个性能样板）
│   ├── useRenderCount.ts   # 渲染次数统计 Hook
│   └── miniStore.ts        # 极简的「store + selector 订阅」实现（zustand 的核心原理）
├── components/
│   ├── Layout.tsx          # 外壳：左侧大纲 + 顶栏开关 + 路由级 Suspense
│   ├── RenderBadge.tsx     # 渲染次数徽章（数值变化时闪烁）
│   ├── HeavyBox.tsx        # 「渲染很贵」/「渲染很便宜」的对照容器
│   ├── DemoCard.tsx        # Demo 卡片：说明 + 演示区 + 讲解要点 + 示例代码
│   ├── CodeBlock.tsx       # 代码块（带复制按钮）
│   ├── ErrorBoundary.tsx   # 错误边界（懒加载失败兜底）
│   ├── PageHeader.tsx      # 页头 / 通用面板
│   └── Segmented.tsx       # 分段控件
├── demo/
│   └── HeavyChart.tsx      # 被懒加载的重型组件（独立 chunk）
└── pages/                  # 一章一个文件，按分享顺序排列
```

---

## 关于数字，先说明两件事

1. **StrictMode**：`src/main.tsx` 里刻意保留了 `<StrictMode>`。开发环境它会让组件渲染两次、让
   `useMemo` 的工厂函数执行两次，用来暴露副作用问题。所以页面上看到的计数和耗时都会偏大 ——
   演示时只需要对比「谁涨了、谁没涨」，绝对值不重要。要看真实数字请用 `npm run build` + `npm run preview`。

2. **oxlint 配置**：为了让 `npm run lint` 保持干净，`.oxlintrc.json` 里做了这些设置：

   - 开启了 `react-hooks/exhaustive-deps`（warn）—— 第 02 章讲的「闭包陷阱」正是这条规则要防的问题。
   - 对 `src/**` 关掉了 `react/refs`、`react/purity`：本项目的核心手段就是「在 render 期间读写 ref / 调用
     `performance.now()`」来统计渲染次数和耗时，这是刻意的度量代码。
   - 对 `src/**` 关掉了 `react/set-state-in-effect`：用于演示「挂载后测量真实耗时」的场景。
   - 对 `src/**` 关掉了 `react/no-unstable-nested-components`：第 06 章「加载失败 + 重试」必须
     在 render 期间创建一个新的 lazy 组件，React 才会重新执行 loader —— 这是 Demo 的一部分。

   其余刻意写的反例（空依赖数组等）都在源码里用 **`oxlint-disable-next-line`** 就近标注了原因。
   ⚠️ 注意本项目用的是 oxlint，**写 `eslint-disable` 是不会生效的**。

---

## 构建产物说明

`npm run build` 之后每个章节都会拆成独立 chunk，并且第三方库单独分包：

```
dist/assets/
├── vendor-react-*.js      ~219 KB    React + ReactDOM + scheduler（带 contenthash，长期缓存）
├── vendor-router-*.js      ~39 KB    react-router
├── index-*.js              ~14 KB    Layout + 首屏
├── RerenderPage-*.js        ~14 KB   ← 每个章节一个 chunk，按需加载
├── MemoPage-*.js            ~16 KB
├── ...
└── React19Page-*.js         ~23 KB
```

演示第 06 章时打开 Network 面板：切换左侧章节，可以看到对应的 chunk 被单独拉取，
而 `vendor-react` 只在首次加载、之后就命中缓存。

---

## 一页纸结论

1. React 的性能问题，**90% 是不必要的重渲染**；先看清「谁在渲染、为什么渲染」，再动手。
2. 优先级：**结构优化（状态下沉 / children 插槽 / 正确的 key）> 虚拟化 > 记忆化（memo / useMemo）> 并发特性**。
3. `React.memo` 只挡「父组件引起的重渲染」，且要求 props 引用稳定；`useCallback` 单独使用几乎没有意义。
4. 能算出来的值不要存 state；能放到小组件里的 state 不要放顶层。
5. 懒加载是「体感优化」里性价比最高的一招：路由分包 + 骨架屏 + 预加载 + 错误重试。
6. 任何优化都要**先度量、后动手、再验证**，React DevTools 的 Profiler 是唯一权威。
7. `useReducer` 的 `dispatch` 引用永恒不变，是最理想的「传给 memo 子组件的回调」；`useRef` 用来装
   不参与渲染的值 —— 这两条能省掉大量 `useCallback`。
8. 分清两种「快」：**渲染快**（memo / 虚拟化）和**感知快**（`useOptimistic`、预加载、骨架屏）。
   业务上后者往往收益更直接。
9. React 19.2 的 `<Activity>` 终结了「React 没有 KeepAlive 对应物」这句话；React Compiler 会让
   手写 memo 的价值下降，但**不会让结构优化过时**。

---

## 更新记录

- **第 03 章**：新增 useReducer（dispatch 恒定引用）与 useRef（不参与渲染的值）两个 Demo。
- **第 07 章**：新增 useEffect vs useLayoutEffect 闪烁对照、flushSync 反面教材。
- **第 09 章**：更正「KeepAlive 无等价物」的过时结论；补充 useLayoutEffect 与 nextTick 的时机辨析。
- **第 10 章**：全新章节，React 19 性能相关新特性。
- **工程**：顶栏新增「渲染徽章」开关；vite 配置加入 vendor 分包；修正失效的 `eslint-disable` 注释并开启
  `react-hooks/exhaustive-deps` 规则。
