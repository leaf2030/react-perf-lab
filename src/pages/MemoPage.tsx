import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DemoCard } from '../components/DemoCard'
import { PageHeader, Panel } from '../components/PageHeader'
import { RenderBadge } from '../components/RenderBadge'
import { makeItems, type Item } from '../lib/perf'
import { useRenderCount } from '../lib/useRenderCount'

/* ---------- 公共：一份"很大"的数据 + 昂贵的筛选排序 ---------- */

const ITEMS: Item[] = makeItems(20_000)

function filterAndSort(items: Item[], keyword: string): Item[] {
  const key = keyword.trim().toLowerCase()
  const filtered = key ? items.filter((item) => item.label.toLowerCase().includes(key)) : items.slice()
  return filtered.sort((a, b) => b.price - a.price)
}

function ResultPreview({ result, limit = 8 }: { result: Item[]; limit?: number }) {
  if (result.length === 0) {
    return <p className="hint">没有匹配的数据</p>
  }
  return (
    <div className="hint">
      共 <b style={{ color: 'var(--accent)' }}>{result.length}</b> 条，前 {Math.min(limit, result.length)} 条：
      {result.slice(0, limit).map((item) => (
        <span key={item.id} className="tag" style={{ marginLeft: 6 }}>
          {item.label} ¥{item.price}
        </span>
      ))}
    </div>
  )
}

function CostStats({
  name,
  renders,
  calls,
  lastCost,
  totalCost,
}: {
  name: string
  renders: number
  calls: number
  lastCost: number
  totalCost: number
}) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <RenderBadge name={name} count={renders} tone={calls > 0 ? 'default' : 'cool'} />
      <div className="stat-grid">
        <div className="stat">
          <span className="stat__label">累计计算次数</span>
          <span className="stat__value">{calls}</span>
        </div>
        <div className="stat">
          <span className="stat__label">本次计算耗时</span>
          <span className="stat__value">{lastCost.toFixed(1)} ms</span>
        </div>
        <div className="stat">
          <span className="stat__label">累计计算耗时</span>
          <span className="stat__value stat--bad" style={{ color: 'var(--bad)' }}>
            {totalCost.toFixed(0)} ms
          </span>
        </div>
      </div>
    </div>
  )
}

/* ---------- Demo 1：昂贵计算的记忆化 ---------- */

function FilterWithoutMemo({ keyword }: { keyword: string }) {
  const renders = useRenderCount('WithoutMemo 分支')
  const stats = useRef({ calls: 0, total: 0 })

  const started = performance.now()
  const result = filterAndSort(ITEMS, keyword)
  const cost = performance.now() - started

  stats.current.calls += 1
  stats.current.total += cost

  return (
    <div className="panel panel--bad">
      <h4 className="panel__title">❌ 没有 useMemo：每次渲染都重算</h4>
      <CostStats
        name="WithoutMemo"
        renders={renders}
        calls={stats.current.calls}
        lastCost={cost}
        totalCost={stats.current.total}
      />
      <ResultPreview result={result} />
    </div>
  )
}

function FilterWithMemo({ keyword }: { keyword: string }) {
  const renders = useRenderCount('WithMemo 分支')
  const [calculated, setCalculated] = useState(0)
  const stats = useRef({ calls: 0, total: 0 })

  // 依赖只有 keyword：父组件因为别的状态重渲染时，这里会直接复用上一次的结果
  const [result, cost] = useMemo(() => {
    const started = performance.now()
    const data = filterAndSort(ITEMS, keyword)
    const elapsed = performance.now() - started

    // 只在「真的重算」的时候记账
    stats.current.calls += 1
    stats.current.total += elapsed

    return [data, elapsed] as const
  }, [keyword])

  // 仅用于展示"依赖变化了几次"，不影响计算
  useEffect(() => {
    setCalculated((value) => value + 1)
  }, [result])

  return (
    <div className="panel panel--good">
      <h4 className="panel__title">✅ 有 useMemo：依赖没变就复用结果</h4>
      <CostStats
        name="WithMemo"
        renders={renders}
        calls={stats.current.calls}
        lastCost={cost}
        totalCost={stats.current.total}
      />
      <p className="hint">useMemo 因依赖变化而重新计算：{calculated} 次</p>
      <ResultPreview result={result} />
    </div>
  )
}

function MemoCompareDemo() {
  const [keyword, setKeyword] = useState('')
  const [unrelated, setUnrelated] = useState(0)

  return (
    <div className="stack">
      <div className="row">
        <input
          type="text"
          value={keyword}
          placeholder="试试输入 Item 9（会真的重算）"
          onChange={(event) => setKeyword(event.target.value)}
        />
        <button type="button" className="btn" onClick={() => setUnrelated((value) => value + 1)}>
          只让父组件重渲染（keyword 不变）：{unrelated}
        </button>
      </div>

      <div className="grid-2">
        <FilterWithoutMemo keyword={keyword} />
        <FilterWithMemo keyword={keyword} />
      </div>

      <p className="hint">
        反复点「只让父组件重渲染」：左边的累计计算耗时不断上涨，右边因为依赖没变，直接复用上一次的结果。
        但注意 —— 一旦你改了输入框，两边都会重算，useMemo 救不了「依赖真的变了」。
      </p>
    </div>
  )
}

/* ---------- Demo 2：useCallback 的真正作用（引用稳定） ---------- */

// 给每个函数引用分配一个稳定的编号，用来在界面上直观展示"引用有没有变"。
// 同一个函数对象 → 同一个编号；每次新建函数 → 编号 +1。
let fnIdSeed = 0
const fnIds = new WeakMap<() => void, number>()
function fnId(fn: () => void): number {
  let id = fnIds.get(fn)
  if (id === undefined) {
    fnIdSeed += 1
    id = fnIdSeed
    fnIds.set(fn, id)
  }
  return id
}

// React.memo 子组件：只有 props 变化时才重渲染。
// ⚠️ memo 没有 useMemo 那样的依赖数组，它的第二个参数是「自定义比较函数」：
//    (prevProps, nextProps) => boolean，返回 true 表示"相等，跳过重渲染"。
//    下面把要比较的 props 显式列出来，等价于"依赖 = [label, onAction]"。
const MemoChild = memo(
  function MemoChild({
    label,
    onAction,
  }: {
    label: string
    onAction: () => void
  }) {
    const renders = useRenderCount(label)

    // 记录上一次收到的 onAction 引用，用来判断这次引用是否变了
    const prevAction = useRef(onAction)
    const actionChanged = prevAction.current !== onAction
    prevAction.current = onAction

    return (
      <div className="heavy">
        <RenderBadge name={label} count={renders} />
        <div className="stack" style={{ gap: 4, margin: '8px 0' }}>
          <span className="hint">
            props.label = <code>"{label}"</code> <span style={{ color: 'var(--good)' }}>（值没变 ✅）</span>
          </span>
          <span className="hint">
            props.onAction 引用 = <code>#{fnId(onAction)}</code>{' '}
            {actionChanged ? (
              <span style={{ color: 'var(--bad)' }}>（变了 ❌ → memo 判定 props 变了）</span>
            ) : (
              <span style={{ color: 'var(--good)' }}>（没变 ✅）</span>
            )}
          </span>
        </div>
        <button type="button" className="btn" onClick={onAction}>
          点我触发回调
        </button>
      </div>
    )
  },
  // 👇 显式写出 memo 的"依赖"：只有这两个 props 都相等时才跳过重渲染
  (prevProps, nextProps) => {
    const labelSame = prevProps.label === nextProps.label
    const actionSame = prevProps.onAction === nextProps.onAction
    return labelSame && actionSame
  },
)

function UseCallbackDemo() {
  const [tick, setTick] = useState(0)

  // ✅ useCallback：引用稳定，父组件重渲染时这个函数不会变
  const stableHandler = useCallback(() => {
    console.info('✅ [useCallback] 回调触发')
  }, [])

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn btn--primary" onClick={() => setTick((value) => value + 1)}>
          让父组件重渲染（与子组件无关）：{tick}
        </button>
      </div>

      <div className="grid-2">
        <div className="panel panel--bad">
          <h4 className="panel__title">❌ 内联箭头函数：每次都是新引用</h4>
          <MemoChild label="内联箭头函数" onAction={() => console.info('❌ [内联] 回调触发')} />
          <span className="hint">
            父组件每渲染一次，<code>onAction</code> 就是一个全新的函数对象（引用编号不断 +1）→
            memo 浅比较发现 props 变了 → 子组件白白重渲染。
          </span>
        </div>
        <div className="panel panel--good">
          <h4 className="panel__title">✅ useCallback 包裹：引用稳定</h4>
          <MemoChild label="useCallback 包裹" onAction={stableHandler} />
          <span className="hint">
            <code>onAction</code> 始终是同一个函数对象（引用编号永远是 #1）→
            memo 浅比较发现 props 没变 → 子组件纹丝不动。
          </span>
        </div>
      </div>

      <p className="hint">
        反复点「让父组件重渲染」，盯着两个子组件里的 <b>props.onAction 引用编号</b>：
        左边每次都在变（memo 被新函数引用击穿），右边始终是同一个编号。
        这就是 useCallback 的真正价值 —— <b>它本身不阻止重渲染，而是让引用稳定，从而让 React.memo 生效</b>。
      </p>
    </div>
  )
}

/* ---------- Demo 3：依赖数组写错的坑（闭包陷阱） ---------- */

function StaleClosureDemo() {
  const [text, setText] = useState('React')
  const [log, setLog] = useState<string[]>([])

  function append(line: string) {
    setLog((previous) => [line, ...previous].slice(0, 6))
  }

  // ❌ 空依赖数组：闭包永远捕获第一次渲染时的 text
  // （这里的"漏写依赖"是故意的，就是 Demo 的一部分，所以下面用注释关掉了这条规则）
  /* oxlint-disable react-hooks/exhaustive-deps */
  const stale = useCallback(() => {
    setTimeout(() => append(`❌ 空依赖数组读到的是旧值：${text}`), 600)
  }, [])
  /* oxlint-enable react-hooks/exhaustive-deps */

  // ✅ 正确声明依赖：每次 text 变化都会拿到新的函数
  const fresh = useCallback(() => {
    setTimeout(() => append(`✅ 正确依赖读到的是新值：${text}`), 600)
  }, [text])

  return (
    <div className="stack">
      <div className="row">
        <input
          type="text"
          value={text}
          placeholder="先改成别的值，再点下面两个按钮"
          onChange={(event) => setText(event.target.value)}
        />
        <button type="button" className="btn" onClick={stale}>
          用空依赖数组的回调
        </button>
        <button type="button" className="btn btn--primary" onClick={fresh}>
          用正确依赖的回调
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 0 }}>
        <h4 className="panel__title">0.6 秒后的执行结果</h4>
        {log.length === 0 ? (
          <p className="hint">还没有日志</p>
        ) : (
          <ul className="checklist">
            {log.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        )}
      </div>

      <p className="hint">
        把输入框改成别的值，再点两个按钮：第一个打印的是「React」（挂载时的旧值），第二个才是你刚输入的内容。
        —— useCallback / useMemo 的依赖数组不是可有可无的提示，它决定了闭包里能看到哪一份数据。
      </p>
    </div>
  )
}

/* ---------- Demo 4：缓存的成本可能比计算本身还高 ---------- */

// 昂贵计算：循环 100 万次，肉眼可见地卡一下。
// 注意：这里用取模把结果压回小范围，避免累加溢出成 Infinity / NaN。
function expensiveCalc(a: number, b: number): number {
  let sum = 0
  for (let i = 0; i < 1_000_000; i += 1) {
    sum = (sum + (i % 7) * a + b) % 1_000_000_007
  }
  return sum
}

// 廉价计算：一行就能算完，几乎不花时间。
function cheapCalc(a: number, b: number): number {
  return a * 2 + b
}

// 通用对照组件：传入"计算函数"和"是否用 useMemo"，自动统计累计次数与耗时。
// 用于第一组「昂贵计算」的对照。
function CalcPanel({
  title,
  tone,
  calc,
  a,
  b,
  useCache,
}: {
  title: string
  tone: 'good' | 'bad'
  calc: (a: number, b: number) => number
  a: number
  b: number
  useCache: boolean
}) {
  const renders = useRenderCount(title)
  const stats = useRef({ calls: 0, calcTotal: 0 })

  function runCalc(): number {
    const started = performance.now()
    const result = calc(a, b)
    const cost = performance.now() - started
    stats.current.calls += 1
    stats.current.calcTotal += cost
    return result
  }

  // 用 useMemo 时依赖 [a, b]；不用时每次渲染都重算。
  const value = useCache ? useMemo(runCalc, [a, b]) : runCalc()

  return (
    <div className={`panel panel--${tone}`}>
      <h4 className="panel__title">{title}</h4>
      <RenderBadge name={title} count={renders} />
      <div className="stat-grid">
        <div className="stat">
          <span className="stat__label">计算结果</span>
          <span className="stat__value">{value}</span>
        </div>
        <div className="stat">
          <span className="stat__label">累计计算次数</span>
          <span className={`stat__value stat--${tone}`}>{stats.current.calls}</span>
        </div>
        <div className="stat">
          <span className="stat__label">累计计算耗时</span>
          <span className={`stat__value stat--${tone}`}>{stats.current.calcTotal.toFixed(1)} ms</span>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   方案 C：用「确定性计数」把 useMemo 的成本摆到台面上
   ------------------------------------------------------------
   为什么不用耗时？
     单个 useMemo 的开销只有纳秒级，测不出来；就算挂 N 个，
     总耗时也会被 DOM 操作、浏览器调度、performance.now() 的
     测量噪声（±几毫秒）淹没 —— 数字忽高忽低，反而看不出规律。

   所以这里不比"谁快谁慢"，而是数清楚 useMemo 到底多做了什么：
     - 创建了多少个闭包 () => cheapCalc(a, b) + i
     - 分配了多少个依赖数组 [a, b, i]
     - 挂载了多少个 hook
   这些数字是确定的、可数的、无噪声的。

   下面渲染 N 个列表项，每项都做一次「廉价计算」：
     - 左边：每项直接算（无 hook）
     - 右边：每项用 useMemo 包起来（N 个 hook）
   两边计算量完全相同，唯一差别就是 useMemo 的"缓存成本"。
   ============================================================ */

const LIST_SIZE = 5000

// 列表项共用的嵌套 DOM 结构：div > span + span
function ItemShell({ index, value }: { index: number; value: number }) {
  return (
    <div className="perf-item">
      <span className="perf-item__index">#{index}</span>
      <span className="perf-item__value">{value}</span>
    </div>
  )
}

// 左边：单个列表项，直接算，不用任何 hook
function PlainItem({ a, b, i }: { a: number; b: number; i: number }) {
  return <ItemShell index={i} value={cheapCalc(a, b) + i} />
}

// 右边：单个列表项，用 useMemo 包起来（每个实例 = 一个 hook）
function MemoItem({ a, b, i }: { a: number; b: number; i: number }) {
  const value = useMemo(() => cheapCalc(a, b) + i, [a, b, i])
  return <ItemShell index={i} value={value} />
}

// 左边：N 个列表项，每项直接算，不用任何 hook
function PlainList({ a, b }: { a: number; b: number }) {
  const renders = useRenderCount('直接算·列表')

  const items = []
  for (let i = 0; i < LIST_SIZE; i += 1) {
    items.push(<PlainItem key={i} a={a} b={b} i={i} />)
  }

  return (
    <div className="panel panel--good">
      <h4 className="panel__title">✅ 直接算：{LIST_SIZE} 项，无 hook</h4>
      <RenderBadge name="直接算·列表" count={renders} />
      <div className="stat-grid">
        <div className="stat">
          <span className="stat__label">计算次数</span>
          <span className="stat__value stat--good">{LIST_SIZE}</span>
        </div>
        <div className="stat">
          <span className="stat__label">创建的闭包</span>
          <span className="stat__value stat--good">0</span>
        </div>
        <div className="stat">
          <span className="stat__label">分配的依赖数组</span>
          <span className="stat__value stat--good">0</span>
        </div>
        <div className="stat">
          <span className="stat__label">挂载的 hook</span>
          <span className="stat__value stat--good">0</span>
        </div>
      </div>
      <p className="hint">计算量 = {LIST_SIZE} 次 a*2+b（与右边完全相同）</p>
      <div className="perf-list">{items}</div>
    </div>
  )
}

// 右边：N 个列表项，每项都用 useMemo 包起来（N 个 hook 实例）
function MemoList({ a, b }: { a: number; b: number }) {
  const renders = useRenderCount('useMemo·列表')

  const items = []
  for (let i = 0; i < LIST_SIZE; i += 1) {
    // 每一项都是一个独立组件，内部各挂一个 useMemo —— 这就是"缓存成本"的来源
    items.push(<MemoItem key={i} a={a} b={b} i={i} />)
  }

  return (
    <div className="panel panel--bad">
      <h4 className="panel__title">❌ useMemo：{LIST_SIZE} 项，{LIST_SIZE} 个 hook</h4>
      <RenderBadge name="useMemo·列表" count={renders} />
      <div className="stat-grid">
        <div className="stat">
          <span className="stat__label">计算次数</span>
          <span className="stat__value stat--bad">{LIST_SIZE}</span>
        </div>
        <div className="stat">
          <span className="stat__label">创建的闭包</span>
          <span className="stat__value stat--bad">{LIST_SIZE}</span>
        </div>
        <div className="stat">
          <span className="stat__label">分配的依赖数组</span>
          <span className="stat__value stat--bad">{LIST_SIZE}</span>
        </div>
        <div className="stat">
          <span className="stat__label">挂载的 hook</span>
          <span className="stat__value stat--bad">{LIST_SIZE}</span>
        </div>
      </div>
      <p className="hint">计算量 = {LIST_SIZE} 次 a*2+b（与左边完全相同）</p>
      <div className="perf-list">{items}</div>
    </div>
  )
}

function MemoCostDemo() {
  const [a, setA] = useState(1)
  const [b, setB] = useState(2)
  const [unrelated, setUnrelated] = useState(0)

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn btn--primary" onClick={() => setUnrelated((v) => v + 1)}>
          只让父组件重渲染（a、b 都不变）：{unrelated}
        </button>
        <button type="button" className="btn" onClick={() => setA((v) => v + 1)}>
          改 a（依赖真的变了）：{a}
        </button>
        <button type="button" className="btn" onClick={() => setB((v) => v + 1)}>
          改 b（依赖真的变了）：{b}
        </button>
      </div>

      {/* 第一组：昂贵计算 —— useMemo 收益巨大 */}
      <h4 className="panel__title" style={{ marginTop: 8 }}>
        ① 昂贵计算（100 万次循环）：useMemo 收益巨大 ✅
      </h4>
      <div className="grid-2">
        <CalcPanel title="昂贵·直接算" tone="bad" calc={expensiveCalc} a={a} b={b} useCache={false} />
        <CalcPanel title="昂贵·useMemo" tone="good" calc={expensiveCalc} a={a} b={b} useCache />
      </div>

      {/* 第二组：廉价计算 —— 用大量真实 DOM 实例放大 useMemo 的真实开销 */}
      <h4 className="panel__title" style={{ marginTop: 8 }}>
        ② 廉价计算 × {LIST_SIZE} 项（真实 DOM）：useMemo 反而亏 ❌
      </h4>
      <div className="grid-2">
        <PlainList a={a} b={b} />
        <MemoList a={a} b={b} />
      </div>

      <p className="hint">
        反复点「只让父组件重渲染」，对比第二组两张卡片的 <b>「创建的闭包 / 依赖数组 / hook」</b>：
      </p>
      <ul className="checklist">
        <li>
          <b>① 昂贵计算</b>：左边每次都重跑 100 万次循环，耗时飙升；右边依赖没变直接复用 ——
          <b>useMemo 净赚</b>。
        </li>
        <li>
          <b>② 廉价计算 × {LIST_SIZE} 项</b>：两边计算量<b>完全相同</b>（都是 {LIST_SIZE} 次 a*2+b），
          但右边额外创建了 <b>{LIST_SIZE} 个闭包</b>、<b>{LIST_SIZE} 个依赖数组</b>、<b>{LIST_SIZE} 个 hook</b>。
          这些就是「缓存成本」—— 它和计算量无关，只和实例数量成正比。
          <b>计算越廉价，这笔成本占比越大，越不划算</b>。
        </li>
      </ul>
      <p className="hint">
        结论：<b>计算越贵，useMemo 越值得用；计算越廉价，越不该用</b>。
        判断标准不是"要不要缓存"，而是"计算本身值不值得缓存"。
      </p>
    </div>
  )
}

/* ---------- 页面 ---------- */

export default function MemoPage() {
  return (
    <>
      <PageHeader
        index="02"
        title="useMemo / useCallback"
        subtitle="这两个 Hook 是「引用稳定」的工具：useMemo 稳定值，useCallback 稳定函数。用错地方会变慢，用对地方能救命。"
        tags={['useMemo', 'useCallback', '引用相等', '闭包陷阱']}
      />

      <Panel title="三句话讲清定位">
        <ul className="checklist">
          <li>
            <code>useMemo(fn, deps)</code>：缓存 <b>计算结果</b>，依赖没变就复用。适合「计算很贵」或「需要稳定引用」。
          </li>
          <li>
            <code>useCallback(fn, deps)</code>：缓存 <b>函数本身</b>。它单独使用几乎没有意义，价值在于配合
            <code>React.memo</code> 的子组件、或作为其他 Hook 的依赖。
          </li>
          <li>
            两者都<b>不是语义保证</b>：React 在极端情况下有权丢弃缓存（比如低优先级渲染被中断）。副作用不能放进 useMemo。
          </li>
        </ul>
        <p className="hint mt-12">
          对照组：Vue 的 <code>computed</code> 是语言级的能力，框架帮你保证缓存；React 的 useMemo 是你手动告诉框架「可以复用」，
          写错依赖数组不会报错，只会得到 bug 或者卡顿。
        </p>
      </Panel>

      <DemoCard
        title="Demo 1｜昂贵计算：20,000 条数据的筛选 + 排序"
        tag="最典型的收益场景"
        tone="default"
        desc="左右两个分支拿到完全相同的 keyword，唯一区别是右边把计算结果放进了 useMemo。"
        code={`// ❌ 每次渲染都重新筛选 + 排序
const result = items.filter(...).sort(...)

// ✅ 只在 items / keyword 变化时重算
const result = useMemo(() => {
  return items.filter(...).sort(...)
}, [items, keyword])

// 也可以把计算本身提成纯函数，方便单测和复用
const result = useMemo(() => filterAndSort(items, keyword), [items, keyword])`}
      >
        <MemoCompareDemo />
      </DemoCard>

      <DemoCard
        title="Demo 2｜useCallback 的真正价值：让引用保持稳定"
        tag="高频困惑点"
        tone="good"
        desc="很多人问「我加了 useCallback 怎么还是重渲染」。答案是：useCallback 本身不阻止重渲染，它只是让函数引用不变，从而让 React.memo 生效。"
        codeTone="good"
        code={`// ⚠️ memo 没有 useMemo 那样的依赖数组！
//    它的第二个参数是「自定义比较函数」：
//    (prevProps, nextProps) => boolean
//    返回 true = 相等，跳过重渲染。

// 把"依赖"显式写出来（等价于依赖 = [label, onAction]）
const MemoChild = memo(
  function MemoChild({ label, onAction }) { /* ... */ },
  (prevProps, nextProps) =>
    prevProps.label === nextProps.label &&
    prevProps.onAction === nextProps.onAction,
)

// ❌ 内联箭头函数：每次渲染都是新引用 → onAction 比较失败 → 重渲染
<MemoChild onAction={() => doSomething()} />

// ✅ useCallback：引用稳定 → onAction 比较通过 → 子组件不重渲染
const onAction = useCallback(() => doSomething(), [])
<MemoChild onAction={onAction} />

// 判断标准：这个函数会不会被当作
//   ① memo 组件的 props  ② 其他 Hook 的依赖
// 如果都不会，就不需要 useCallback。`}
      >
        <UseCallbackDemo />
      </DemoCard>

      <DemoCard
        title="Demo 3｜依赖数组写错：闭包读到的是旧值"
        tag="最容易写出 bug 的地方"
        tone="bad"
        desc="把输入框改成别的值，再点两个按钮，看 0.6 秒后打印出来的东西有什么不同。"
        code={`// ❌ 空依赖 + 读取外部变量 = 永远读到挂载时的值
const handler = useCallback(() => {
  setTimeout(() => console.log(text), 600)
}, [])                       // text 变化时函数不会重建

// ✅ 老实的依赖数组
const handler = useCallback(() => {
  setTimeout(() => console.log(text), 600)
}, [text])

// ✅ 真的需要"稳定函数 + 最新值"时，用 ref 存最新值
const latest = useRef(text)
useEffect(() => { latest.current = text })
const handler = useCallback(() => {
  setTimeout(() => console.log(latest.current), 600)
}, [])`}
      >
        <StaleClosureDemo />
      </DemoCard>

      <DemoCard
        title="Demo 4｜该不该缓存：昂贵 vs 廉价，两组对照"
        tag="用确定性计数说话"
        tone="default"
        desc="上面一组是「100 万次循环」的昂贵计算；下面一组把「一行 a*2+b」的廉价计算重复 5000 次。不比耗时（会被噪声淹没），而是数清楚 useMemo 到底多做了什么。"
        code={`// 昂贵计算：循环 100 万次
function expensiveCalc(a, b) {
  let sum = 0
  for (let i = 0; i < 1_000_000; i++) sum = (sum + (i % 7) * a + b) % 1_000_000_007
  return sum
}

// 廉价计算：一行就能算完
function cheapCalc(a, b) { return a * 2 + b }

// ① 昂贵计算 + useMemo → 收益巨大 ✅
//    依赖没变就复用结果，省下大量重复计算时间
const value = useMemo(() => expensiveCalc(a, b), [a, b])

// ② 廉价计算 × 5000 项 + useMemo → 反而亏 ❌
//    两边计算量完全相同（都是 5000 次 a*2+b），
//    但 useMemo 每项都额外做了三件事：
//      - 创建闭包 () => cheapCalc(a, b) + i   → 5000 个
//      - 分配依赖数组 [a, b, i]                → 5000 个
//      - 挂载 hook、比对依赖、查缓存            → 5000 个
//    这些「缓存成本」和计算量无关，只和实例数量成正比。

// 为什么不比耗时？
//   单个 useMemo 开销只有纳秒级，测不出来；
//   就算挂 5000 个，总耗时也会被 DOM 操作和
//   performance.now() 的测量噪声（±几毫秒）淹没，
//   数字忽高忽低，反而看不出规律。
//   所以用「确定性计数」—— 数出来的数字无噪声。

// 结论：计算越贵，useMemo 越值得用；
//       计算越廉价，越不该用。`}
      >
        <MemoCostDemo />
      </DemoCard>

      <Panel title="决策速查表">
        <table className="table">
          <thead>
            <tr>
              <th>场景</th>
              <th>要不要用</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>大数组 filter / sort / group</td>
              <td>✅ 用 useMemo</td>
              <td>典型收益场景，注意依赖要写全</td>
            </tr>
            <tr>
              <td>计算结果要传给 memo 子组件</td>
              <td>✅ 用 useMemo</td>
              <td>本质是为了引用稳定</td>
            </tr>
            <tr>
              <td>回调要传给 memo 子组件 / 当作 effect 依赖</td>
              <td>✅ 用 useCallback</td>
              <td>只有这两种情况才值得</td>
            </tr>
            <tr>
              <td>字符串拼接、简单数学运算</td>
              <td>❌ 不用</td>
              <td>缓存成本 &gt; 计算成本</td>
            </tr>
            <tr>
              <td>组件没有任何 memo 子组件</td>
              <td>❌ 不用 useCallback</td>
              <td>函数引用变了也没人在意</td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </>
  )
}
