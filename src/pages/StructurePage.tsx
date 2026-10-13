import { useRef, useState } from 'react'
import { DemoCard } from '../components/DemoCard'
import { HeavyBox } from '../components/HeavyBox'
import { PageHeader, Panel } from '../components/PageHeader'
import { RenderBadge } from '../components/RenderBadge'
import { useRenderCount } from '../lib/useRenderCount'

/* =========================================================================
   Demo 1：状态下沉（state colocation）
   ========================================================================= */

function BadStateDesign() {
  const renders = useRenderCount('顶层组件')
  const [keyword, setKeyword] = useState('')

  return (
    <div className="stack">
      <div className="row">
        <input
          type="text"
          value={keyword}
          placeholder="打字 → 整页都重渲染"
          onChange={(event) => setKeyword(event.target.value)}
        />
        <RenderBadge name="顶层组件" count={renders} />
      </div>

      <div className="grid-2">
        <HeavyBox name="StatCards" note="和搜索词毫无关系" />
        <HeavyBox name="DataTable" note="和搜索词毫无关系" />
      </div>
    </div>
  )
}

function SearchBox() {
  const renders = useRenderCount('SearchBox')
  const [keyword, setKeyword] = useState('')

  return (
    <div className="row">
      <input
        type="text"
        value={keyword}
        placeholder="打字 → 只有这个组件重渲染"
        onChange={(event) => setKeyword(event.target.value)}
      />
      <RenderBadge name="SearchBox" count={renders} tone="cool" />
      <span className="hint">状态被"下沉"到了真正需要它的组件里</span>
    </div>
  )
}

function GoodStateDesign() {
  const renders = useRenderCount('顶层组件')

  return (
    <div className="stack">
      <div className="row">
        <SearchBox />
        <RenderBadge name="顶层组件" count={renders} tone="cool" />
      </div>

      <div className="grid-2">
        <HeavyBox name="StatCards" note="和搜索词毫无关系" />
        <HeavyBox name="DataTable" note="和搜索词毫无关系" />
      </div>
    </div>
  )
}

/* =========================================================================
   Demo 2：key 用 index 的经典 bug
   ========================================================================= */

type Todo = { id: number; text: string; color: string }

// 每条数据自带一个颜色 —— 这是"数据本身"的属性，不随位置变化。
// 一旦 key 用错，颜色就会和编号/内容错位，一眼就能看出来。
const INITIAL_TODOS: Todo[] = [
  { id: 1, text: '① 写周报', color: 'var(--primary)' },
  { id: 2, text: '② 修线上 bug', color: 'var(--success)' },
  { id: 3, text: '③ Code Review', color: 'var(--warning)' },
  { id: 4, text: '④ 开周会', color: 'var(--error)' },
]

function TodoRow({ todo }: { todo: Todo }) {
  // 每一行有自己的计数器状态：这才是"key 用错"时错位的根源。
  // state 只在组件「挂载」时初始化一次，之后即使 props 变了也不会重置。
  const [count, setCount] = useState(0)
  // 关键：把"这一行原本的颜色"也存进 state（挂载时固定）。
  // 圆点颜色直接读 prop（会跟着新数据变），而计数数字的颜色来自 state（不会变）。
  // 一旦 key 用错，两者就会"打架"—— 绿点配蓝色数字，一眼看出错位。
  const [ownColor] = useState(todo.color)
  return (
    <li className="row" style={{ padding: '4px 0', gap: 8 }}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: todo.color,
          flexShrink: 0,
        }}
      />
      <span className="hint" style={{ width: 30 }}>
        #{todo.id}
      </span>
      <span style={{ flex: 1 }}>{todo.text}</span>
      <button type="button" className="btn" onClick={() => setCount((value) => value + 1)}>
        点我 +1
      </button>
      <span
        className="hint"
        style={{ width: 60, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
      >
        计数：<b style={{ color: ownColor }}>{count}</b>
      </span>
    </li>
  )
}

function KeyBugDemo() {
  const [todos, setTodos] = useState<Todo[]>(INITIAL_TODOS)
  const [useIdKey, setUseIdKey] = useState(false)
  // 用来强制整段列表重新挂载，方便"重置现场"
  const [version, setVersion] = useState(0)

  function reload(nextUseIdKey: boolean) {
    setUseIdKey(nextUseIdKey)
    setTodos(INITIAL_TODOS)
    setVersion((value) => value + 1)
  }

  return (
    <div className="stack">
      <div className="row">
        <span className="hint">
          当前 key：
          <b style={{ color: useIdKey ? 'var(--good)' : 'var(--bad)' }}>
            {useIdKey ? 'item.id（推荐）' : 'index（有 bug）'}
          </b>
        </span>
        <button type="button" className="btn" onClick={() => reload(!useIdKey)}>
          切换 key 策略（并重置）
        </button>
        <button type="button" className="btn" onClick={() => setTodos((list) => list.slice(1))}>
          删除第一条
        </button>
        <button type="button" className="btn" onClick={() => setTodos((list) => [...list].reverse())}>
          倒序
        </button>
      </div>

      <ul className="checklist" key={version} style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
        {todos.map((todo, index) => (
          <TodoRow key={useIdKey ? todo.id : index} todo={todo} />
        ))}
      </ul>

      <p className="hint">
        <b>先给每行点几下「点我 +1」</b>（比如①点 3 下、②点 5 下），让计数和颜色对应上。
        然后用 index 当 key，点「删除第一条」—— 你会看到<b>绿点配着蓝色数字 3</b>：
        圆点颜色是直接读 prop 的，已经跟着新数据变成了绿色；
        但计数数字的颜色和数值都存在 state 里，<b>没被重置</b>，还是①的蓝色和 3。
        两者一打架，bug 就暴露了。切到 id 当 key 再试一次，颜色和计数始终对得上。点「倒序」效果更明显。
      </p>
    </div>
  )
}

/* =========================================================================
   Demo 3：不要把"能算出来的值"放进 state
   ========================================================================= */

type Goods = { id: number; name: string; price: number }

const INITIAL_GOODS: Goods[] = [
  { id: 1, name: '机械键盘', price: 499 },
  { id: 2, name: '显示器', price: 1299 },
  { id: 3, name: '人体工学椅', price: 2499 },
]

function GoodsList({ items }: { items: Goods[] }) {
  return (
    <ul className="checklist" style={{ listStyle: 'none', paddingLeft: 0 }}>
      {items.map((item) => (
        <li key={item.id} className="row" style={{ justifyContent: 'space-between', maxWidth: 320 }}>
          <span>{item.name}</span>
          <b style={{ color: 'var(--accent)' }}>¥{item.price}</b>
        </li>
      ))}
    </ul>
  )
}

function DerivedStateDemo() {
  const [items, setItems] = useState<Goods[]>(INITIAL_GOODS)
  // ❌ 把可以算出来的总价，也存成了一份 state
  const [total, setTotal] = useState(() => INITIAL_GOODS.reduce((sum, item) => sum + item.price, 0))
  // ✅ 派生值直接算出来，只有一个数据源，永远不会不同步
  const realTotal = items.reduce((sum, item) => sum + item.price, 0)

  function changePrice(id: number, delta: number) {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, price: item.price + delta } : item)))
    // 忘了同步 total —— 线上最常见的"数字对不上"就是这样来的
  }

  return (
    <div className="stack">
      <GoodsList items={items} />

      <div className="stat-grid">
        <div className="stat stat--bad">
          <span className="stat__label">❌ state 里存的总价</span>
          <span className="stat__value">¥{total}</span>
        </div>
        <div className="stat stat--good">
          <span className="stat__label">✅ 渲染时算出来的总价</span>
          <span className="stat__value">¥{realTotal}</span>
        </div>
      </div>

      <div className="row">
        <button type="button" className="btn" onClick={() => changePrice(2, 100)}>
          显示器涨价 100
        </button>
        <button type="button" className="btn" onClick={() => setTotal(realTotal)}>
          手动同步 total
        </button>
        <span className="hint">点「涨价」→ 左边数字不动，右边跟着变</span>
      </div>
    </div>
  )
}

/* =========================================================================
   Demo 4：自动批处理
   ========================================================================= */

function BatchingDemo() {
  const renders = useRenderCount('BatchingDemo')
  const [a, setA] = useState(0)
  const [b, setB] = useState(0)
  const [c, setC] = useState(0)

  function updateSync() {
    setA((value) => value + 1)
    setB((value) => value + 1)
    setC((value) => value + 1)
  }

  function updateInTimeout() {
    // React 18 起，setTimeout / Promise / 原生事件里的更新同样会被自动批处理
    setTimeout(() => {
      setA((value) => value + 1)
      setB((value) => value + 1)
      setC((value) => value + 1)
    }, 0)
  }

  function updateWithAwait() {
    async function task() {
      await Promise.resolve()
      setA((value) => value + 1)
      setB((value) => value + 1)
      setC((value) => value + 1)
    }
    void task()
  }

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn" onClick={updateSync}>
          同步调 3 个 setState
        </button>
        <button type="button" className="btn" onClick={updateInTimeout}>
          setTimeout 里调 3 个
        </button>
        <button type="button" className="btn" onClick={updateWithAwait}>
          await 之后调 3 个
        </button>
        <RenderBadge name="BatchingDemo" count={renders} />
      </div>

      <p className="hint">
        a = {a}，b = {b}，c = {c}。三种写法都只会让组件重渲染 <b>一次</b>（React 18+ 的 automatic batching）。
        在 React 17 里，后两种会各渲染 3 次 —— 这也是升级到 18 之后很多页面"莫名其妙变快"的原因。
      </p>
    </div>
  )
}

/* =========================================================================
   Demo 5：useRef 存"不参与渲染的值"
   ========================================================================= */

/** 一个会显示自己渲染次数的读数行 */
function Readout({ label, value }: { label: string; value: string }) {
  const renders = useRenderCount(label)
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span className="hint">{label}</span>
      <span className="row" style={{ gap: 8 }}>
        <b style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{value}</b>
        <RenderBadge name={label} count={renders} />
      </span>
    </div>
  )
}

/** ❌ 用 state 存：每次点击都触发重渲染，数字会刷新 */
function StateCounter() {
  const renders = useRenderCount('StateCounter')
  const [count, setCount] = useState(0)
  return (
    <div className="panel panel--bad">
      <h4 className="panel__title">❌ 放进 useState</h4>
      <Readout label="state 计数" value={String(count)} />
      <div className="row mt-12">
        <button type="button" className="btn" onClick={() => setCount((value) => value + 1)}>
          点我 +1
        </button>
        <RenderBadge name="StateCounter" count={renders} />
      </div>
      <p className="hint" style={{ marginBottom: 0 }}>
        每点一次，数字变、组件重渲染一次。
      </p>
    </div>
  )
}

/** ✅ 用 ref 存：点击只改 ref，不触发渲染，数字不会刷新 */
function RefCounter() {
  const renders = useRenderCount('RefCounter')
  const countRef = useRef(0)
  // 用一个 state 强制刷新，才能把 ref 里的值“读”到界面上
  const [, forceRender] = useState(0)
  return (
    <div className="panel panel--good">
      <h4 className="panel__title">✅ 放进 useRef</h4>
      <Readout label="ref 计数" value={String(countRef.current)} />
      <div className="row mt-12">
        <button type="button" className="btn" onClick={() => { countRef.current += 1 }}>
          点我 +1（不刷新）
        </button>
        <button type="button" className="btn" onClick={() => forceRender((value) => value + 1)}>
          手动刷新看当前值
        </button>
        <RenderBadge name="RefCounter" count={renders} />
      </div>
      <p className="hint" style={{ marginBottom: 0 }}>
        点「+1」时数字<b>纹丝不动</b>，渲染次数也不涨；点「手动刷新」才把 ref 里的最新值读出来。
      </p>
    </div>
  )
}

function RefVsStateDemo() {
  return (
    <div className="stack">
      <div className="grid-2">
        <StateCounter />
        <RefCounter />
      </div>
      <p className="hint" style={{ marginBottom: 0 }}>
        <b>判断标准：</b>这个值需要出现在 JSX 里吗？需要 → state；只是记个数、存个 DOM 引用、存上一次的值 → ref。
      </p>
    </div>
  )
}

/* =========================================================================
   页面
   ========================================================================= */

export default function StructurePage() {
  return (
    <>
      <PageHeader
        index="03"
        title="组件结构与状态设计"
        subtitle="这一章几乎不出现 memo 和 useMemo，但往往是收益最大的一章：把状态放对位置，把 key 用对，把能算出来的值算出来。"
        tags={['状态下沉', 'key', '派生状态', 'automatic batching']}
      />

      <Panel title="核心思想">
        <p className="hint" style={{ margin: 0 }}>
          React 的渲染是「组件级」的：一个组件重渲染，它的整棵子树都会重渲染。
          所以最有效的优化往往不是「让渲染变快」，而是「让不该渲染的组件根本不进入渲染流程」。
          做法有三种：<b>把状态放到最小的组件里</b>、<b>用 children 把静态子树传进来</b>、<b>用稳定的 key 让 React 正确复用</b>。
        </p>
      </Panel>

      <DemoCard
        title="Demo 1｜状态下沉：把 state 放到真正需要它的组件里"
        tone="default"
        desc="左右两种写法功能完全一样，区别只是 keyword 这个 state 放在了哪一层。"
        code={`// ❌ keyword 放在顶层 → 打字时整个页面（含两个重面板）全部重渲染
function Page() {
  const [keyword, setKeyword] = useState('')
  return (
    <>
      <SearchInput value={keyword} onChange={setKeyword} />
      <StatCards />
      <DataTable />
    </>
  )
}

// ✅ keyword 下沉到 SearchInput 内部 → 只有它在重渲染
function Page() {
  return (
    <>
      <SearchInput />
      <StatCards />
      <DataTable />
    </>
  )
}

// ✅ 状态确实必须在顶层时，用 children 把静态子树"绕过去"
function Page() {
  const [keyword, setKeyword] = useState('')
  return (
    <Layout search={<SearchInput value={keyword} onChange={setKeyword} />}>
      <StatCards />
      <DataTable />
    </Layout>
  )
}`}
      >
        <div className="grid-2">
          <div className="stack">
            <p className="hint">❌ keyword 放在顶层</p>
            <BadStateDesign />
          </div>
          <div className="stack">
            <p className="hint">✅ keyword 下沉到 SearchBox</p>
            <GoodStateDesign />
          </div>
        </div>
      </DemoCard>

      <DemoCard
        title="Demo 2｜列表 key 用 index 的经典 bug"
        tag="必讲"
        tone="bad"
        desc="先给每行点几下计数器，再点「删除第一条」—— 计数会跟着错误的行走，颜色和数字对不上，一眼就能看出 bug。"
        code={`// ❌ 列表会增删改排序时，index 会错位
{items.map((item, index) => <Row key={index} item={item} />)}

// ✅ 用业务 id
{items.map((item) => <Row key={item.id} item={item} />)}

// ✅ 没有 id 时，在数据"创建时"生成一次，而不是在 render 里生成
const row = { ...input, id: crypto.randomUUID() }

// 为什么 index 会错位？
// React 靠 key 判断"这个组件还是不是原来那个"。
// key 用 index 时，删除第一条后：
//   位置 0 的 key 还是 0 → React 认为"还是同一个组件" → 复用实例
//   但它的 props 已经换成了新数据，而组件内部的 state 不会重置
//   → 于是"新数据的 props"和"旧组件的 state"错位了`}
      >
        <KeyBugDemo />
      </DemoCard>

      <DemoCard
        title="Demo 3｜不要把“可以算出来的值”存进 state"
        tone="default"
        desc="总价是可以从列表算出来的，一旦把它也存成 state，就有了两个真相来源。点「涨价」看两个数字分道扬镳。"
        code={`// ❌ 两个 state，需要手动保持同步
const [items, setItems] = useState(list)
const [total, setTotal] = useState(sum(list))

function removeItem(id) {
  setItems(items.filter(i => i.id !== id))
  // 忘了 setTotal(...) → 页面上的总价永远对不上
}

// ✅ 一个数据源，渲染时算出来
const [items, setItems] = useState(list)
const total = items.reduce((sum, i) => sum + i.price, 0)

// ✅ 计算很贵时，再套一层 useMemo
const total = useMemo(() => items.reduce((sum, i) => sum + i.price, 0), [items])`}
      >
        <DerivedStateDemo />
      </DemoCard>

      <DemoCard
        title="Demo 4｜顺带一提：自动批处理（automatic batching）"
        tone="good"
        desc="React 18 起，不管你在哪调用 setState，一次事件循环里的多次更新都只会渲染一次。"
        code={`function handleClick() {
  // React 18+ 只渲染一次
  setA(a + 1)
  setB(b + 1)
  setC(c + 1)
}

// setTimeout / async 里也一样只渲染一次
setTimeout(() => {
  setA(a + 1)
  setB(b + 1)
}, 0)`}
      >
        <BatchingDemo />
      </DemoCard>

      <DemoCard
        title="Demo 5｜useRef：存「不参与渲染」的值"
        tone="good"
        desc="左右各点几下「+1」：左边 state 的数字和渲染次数都在涨，右边 ref 的数字纹丝不动、渲染次数也不涨。"
        code={`// ❌ 不需要显示的值放进 state → 每次变化都白买一次渲染
const [clicks, setClicks] = useState(0)   // 只是埋点计数，界面上根本不显示

// ✅ 放进 ref：改了不渲染，读取也不算依赖
const clicksRef = useRef(0)
clicksRef.current += 1

// ✅ 经典用法：存上一次的值（对比 props 变化）
function usePrevious(value) {
  const ref = useRef(undefined)
  useEffect(() => { ref.current = value })
  return ref.current
}

// ❌ 陷阱：需要显示的值用了 ref → 界面永远不更新
const [rendered, setRendered] = useState(0)
const countRef = useRef(0)
countRef.current += 1          // 页面上的数字不会变
// 只能在渲染时同步读取：<span>{countRef.current}</span>

// ✅ 但这样写有例外：渲染期读取 ref 不违反规则，
//    前提是「这个值在本次渲染期间不会变」`}
      >
        <RefVsStateDemo />
      </DemoCard>

      <Panel title="本章小结">
        <ul className="checklist">
          <li>状态下沉 / children 插槽 / 正确的 key —— 这三种结构优化的收益，通常大于到处加 memo。</li>
          <li>派生值永远不要存 state，它是"两个真相来源"的根源。</li>
          <li>React 18+ 已经自动批处理，不用再手动合并 setState；重点应该放在「缩小渲染范围」。</li>
          <li>拆分组件时，顺便想一下：哪些 state 可以继续往下沉？</li>
          <li>useRef 用来装"不需要出现在界面上"的值：改了不渲染，也不会白白买一次渲染。</li>
        </ul>
      </Panel>
    </>
  )
}
