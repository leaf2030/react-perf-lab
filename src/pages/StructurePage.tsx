import { memo, useReducer, useRef, useState } from 'react'
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

type Todo = { id: number; text: string }

const INITIAL_TODOS: Todo[] = [
  { id: 1, text: '① 写周报' },
  { id: 2, text: '② 修线上 bug' },
  { id: 3, text: '③ Code Review' },
  { id: 4, text: '④ 开周会' },
]

function TodoRow({ todo }: { todo: Todo }) {
  // 每一行有自己的输入框状态：这才是"key 用错"时错位的根源
  const [text, setText] = useState(todo.text)
  return (
    <li className="row" style={{ padding: '4px 0' }}>
      <span className="hint" style={{ width: 30 }}>
        #{todo.id}
      </span>
      <input
        type="text"
        value={text}
        style={{ flex: 1 }}
        onChange={(event) => setText(event.target.value)}
      />
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
        <button type="button" className="btn" onClick={() => reload(useIdKey)}>
          重置数据
        </button>
      </div>

      <ul className="checklist" key={version} style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
        {todos.map((todo, index) => (
          <TodoRow key={useIdKey ? todo.id : index} todo={todo} />
        ))}
      </ul>

      <p className="hint">
        先用 index 当 key：随便改几个输入框的内容，然后点「删除第一条」—— 左边的编号往前提了一位，但输入框里的内容没跟着走，
        因为 React 认为「key 0 还是那个组件」（复用了组件实例和它的内部 state）。切到 id 当 key 再试一次，编号和内容始终对得上。
        点「倒序」也是同样的效果，而且更明显。
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

function BadDerivedState() {
  const [items, setItems] = useState<Goods[]>(INITIAL_GOODS)
  // ❌ 把可以算出来的总价，也存成了一份 state
  const [total, setTotal] = useState(() => INITIAL_GOODS.reduce((sum, item) => sum + item.price, 0))

  function changePrice(id: number, delta: number) {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, price: item.price + delta } : item)))
    // 忘了同步 total —— 线上最常见的"数字对不上"就是这样来的
  }

  return (
    <div className="panel panel--bad">
      <h4 className="panel__title">❌ 用 state 存派生值</h4>
      <GoodsList items={items} />
      <div className="stat-grid">
        <div className="stat">
          <span className="stat__label">state 里存的总价</span>
          <span className="stat__value stat--bad">¥{total}</span>
        </div>
        <div className="stat">
          <span className="stat__label">列表真实总价</span>
          <span className="stat__value stat--good">
            ¥{items.reduce((sum, item) => sum + item.price, 0)}
          </span>
        </div>
      </div>
      <div className="row mt-12">
        <button type="button" className="btn" onClick={() => changePrice(2, 100)}>
          显示器涨价 100
        </button>
        <button type="button" className="btn" onClick={() => setTotal(items.reduce((sum, item) => sum + item.price, 0))}>
          手动同步 total（麻烦）
        </button>
      </div>
    </div>
  )
}

function GoodDerivedState() {
  const [items, setItems] = useState<Goods[]>(INITIAL_GOODS)
  // ✅ 派生值直接算出来（贵的话再套 useMemo），只有一个数据源，永远不会不同步
  const total = items.reduce((sum, item) => sum + item.price, 0)

  function changePrice(id: number, delta: number) {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, price: item.price + delta } : item)))
  }

  return (
    <div className="panel panel--good">
      <h4 className="panel__title">✅ 直接派生</h4>
      <GoodsList items={items} />
      <div className="stat-grid">
        <div className="stat">
          <span className="stat__label">渲染时算出来的总价</span>
          <span className="stat__value stat--good">¥{total}</span>
        </div>
      </div>
      <div className="row mt-12">
        <button type="button" className="btn" onClick={() => changePrice(2, 100)}>
          显示器涨价 100
        </button>
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
   Demo 5：useReducer —— dispatch 的引用是"永久稳定"的
   ========================================================================= */

type CartState = { count: number; total: number }
type CartAction = { type: 'add'; price: number } | { type: 'reset' }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add':
      return { count: state.count + 1, total: state.total + action.price }
    case 'reset':
      return { count: 0, total: 0 }
    default:
      return state
  }
}

/**
 * 用 memo 包住的「昂贵」子组件。
 *
 * 它的 props 里带着一个"派发更新的函数"。
 * React 保证 dispatch 的引用在组件生命周期内**永远不变**，
 * 所以 memo 的浅比较一定能通过 → 父组件重渲染时它会被完全跳过。
 */
const StableDispatchChild = memo(function StableDispatchChild({
  dispatch,
}: {
  dispatch: (action: CartAction) => void
}) {
  const renders = useRenderCount('memo 子组件')
  return (
    <div className="heavy">
      <div className="row">
        <span className="heavy__name">加购按钮（dispatch 通过 props 传入）</span>
        <RenderBadge name="memo 子组件" count={renders} tone="cool" />
      </div>
      <button type="button" className="btn" onClick={() => dispatch({ type: 'add', price: 100 })}>
        加一件 ¥100
      </button>
    </div>
  )
})

function ReducerDemo() {
  const renders = useRenderCount('ReducerDemo')
  const [state, dispatch] = useReducer(cartReducer, { count: 0, total: 0 })
  // 一个"无关"的 state：用来制造父组件的重渲染，检验子组件能不能被挡住
  const [keyword, setKeyword] = useState('')

  return (
    <div className="stack">
      <div className="row">
        <input
          type="text"
          value={keyword}
          placeholder="随便打点字 → 父组件重渲染"
          onChange={(event) => setKeyword(event.target.value)}
        />
        <RenderBadge name="ReducerDemo（父）" count={renders} />
      </div>

      <StableDispatchChild dispatch={dispatch} />

      <div className="stat-grid">
        <div className="stat">
          <span className="stat__label">件数</span>
          <span className="stat__value">{state.count}</span>
        </div>
        <div className="stat">
          <span className="stat__label">总价</span>
          <span className="stat__value stat--good">¥{state.total}</span>
        </div>
      </div>

      <p className="hint">
        在输入框里打字，父组件渲染次数一直在涨，但右边「memo 子组件」的次数<b>纹丝不动</b> ——
        因为 <code>dispatch</code> 的引用从挂载到卸载都不会变，memo 的浅比较永远通过。
      </p>
    </div>
  )
}

/* =========================================================================
   Demo 6：useRef 存"不参与渲染的值"
   ========================================================================= */

/** 每次渲染都会执行一次的重活，用来放大"无意义渲染"的代价 */
function ExpensiveReadout({ label, value }: { label: string; value: string }) {
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

function RefVsStateDemo() {
  // ❌ 鼠标位置、计时次数这类"不需要显示在界面上"的值，如果放进 state…
  const [tick, setTick] = useState(0)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [clicks, setClicks] = useState(0)

  // ✅ 同样的数据放在 ref 里：改了不会有任何渲染
  const tickRef = useRef(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const clicksRef = useRef(0)

  const renders = useRenderCount('RefVsStateDemo')

  return (
    <div className="stack">
      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            // 左边：每个 tick 都触发一次完整重渲染
            setTick((value) => value + 1)
            // 右边：同样的累加，只是写进 ref —— 零渲染
            tickRef.current += 1
          }}
        >
          模拟定时器心跳一次
        </button>

        <button
          type="button"
          className="btn"
          onClick={() => {
            setMouse({ x: Math.round(Math.random() * 1000), y: Math.round(Math.random() * 1000) })
            mouseRef.current = { x: Math.round(Math.random() * 1000), y: Math.round(Math.random() * 1000) }
          }}
        >
          模拟鼠标移动一次
        </button>

        <button
          type="button"
          className="btn"
          onClick={() => {
            setClicks((value) => value + 1)
            clicksRef.current += 1
          }}
        >
          点击计数一次
        </button>

        <RenderBadge name="RefVsStateDemo" count={renders} />
      </div>

      <div className="grid-2">
        <div className="panel panel--bad">
          <h4 className="panel__title">❌ 放进 useState</h4>
          <ExpensiveReadout label="心跳次数" value={String(tick)} />
          <ExpensiveReadout label="鼠标坐标" value={`${mouse.x}, ${mouse.y}`} />
          <ExpensiveReadout label="点击次数" value={String(clicks)} />
          <p className="hint" style={{ marginBottom: 0 }}>
            每点一次，三个组件全部重渲染 —— 但界面上真正需要跟着变的，其实只有被显示出来的那个数字。
          </p>
        </div>

        <div className="panel panel--good">
          <h4 className="panel__title">✅ 放进 useRef</h4>
          <p className="hint" style={{ margin: '0 0 8px' }}>
            上面三个按钮每次点击都会同时更新 ref，但 ref 里的值<b>不参与渲染</b>，
            所以这块面板的数字不会刷新，页面也不会重渲染。
          </p>
          <p className="hint" style={{ margin: '0 0 8px' }}>
            想验证的话：打开顶栏的「控制台渲染日志」，点几次按钮 ——
            「RefVsStateDemo」的渲染次数会涨（因为左边那三个 setState），
            但 ref 分支不产生任何额外渲染。
          </p>
          <p className="hint" style={{ marginBottom: 0 }}>
            <b>判断标准：</b>这个值需要出现在 JSX 里吗？需要 → state；只是记个数、存个 DOM 引用、存上一次的值 → ref。
          </p>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   页面
   ========================================================================= */

const StaticPanel = memo(function StaticPanel({ title }: { title: string }) {
  return <HeavyBox name={title} note="被我包在 memo 里了" />
})

function PageStructureDemo() {
  return (
    <div className="grid-2">
      <StaticPanel title="MemoPanel A" />
      <StaticPanel title="MemoPanel B" />
    </div>
  )
}

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
        desc="这不是性能问题，但它比性能问题更常出现在 Code Review 里，而且和 key 的复用机制直接相关。"
        code={`// ❌ 列表会增删改排序时，index 会错位
{items.map((item, index) => <Row key={index} item={item} />)}

// ✅ 用业务 id
{items.map((item) => <Row key={item.id} item={item} />)}

// ✅ 没有 id 时，在数据"创建时"生成一次，而不是在 render 里生成
const row = { ...input, id: crypto.randomUUID() }`}
      >
        <KeyBugDemo />
      </DemoCard>

      <DemoCard
        title="Demo 3｜不要把“可以算出来的值”存进 state"
        tone="default"
        desc="总价是可以从列表算出来的，一旦把它也存成 state，就有了两个真相来源。"
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
        <div className="grid-2">
          <BadDerivedState />
          <GoodDerivedState />
        </div>
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
        title="Demo 5｜组件拆分本身也是一种优化"
        tone="good"
        desc="把大组件拆小，让每个小组件只依赖自己需要的那部分数据，这样“谁变化谁渲染”的范围自然就小了。"
        codeTone="good"
      >
        <PageStructureDemo />
      </DemoCard>

      <DemoCard
        title="Demo 6｜useReducer：dispatch 的引用永远稳定"
        tag="API"
        tone="good"
        desc="useState 的 setter 和 useReducer 的 dispatch 引用都是稳定的，但 dispatch 还有一个额外好处：它让「更新逻辑」从组件里挪了出去。"
        code={`// ❌ 用 useState + 内联函数传给 memo 子组件
function Parent() {
  const [count, setCount] = useState(0)
  // 每次渲染都是新函数 → memo 失效，除非包 useCallback
  return <Child onAdd={() => setCount(c => c + 1)} />
}

// ✅ 用 useReducer：dispatch 天然稳定，无需 useCallback
function cartReducer(state, action) {
  switch (action.type) {
    case 'add':   return { ...state, count: state.count + 1, total: state.total + action.price }
    case 'reset': return { count: 0, total: 0 }
    default:      return state
  }
}

function Parent() {
  const [state, dispatch] = useReducer(cartReducer, { count: 0, total: 0 })
  // dispatch 引用恒定 → memo(Child) 一定能被挡住
  return <Child dispatch={dispatch} />
}`}
      >
        <ReducerDemo />
      </DemoCard>

      <DemoCard
        title="Demo 7｜useRef：存「不参与渲染」的值"
        tone="good"
        desc="有些数据变了，界面完全不需要跟着变。把它们放进 state，就是在白白买一次渲染。"
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
          <li>useReducer 的 dispatch 天生稳定，是最适合传给 memo 子组件的回调；useRef 用来装"不需要出现在界面上"的值。</li>
        </ul>
      </Panel>
    </>
  )
}
