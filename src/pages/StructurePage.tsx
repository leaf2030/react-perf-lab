import { memo, useState } from 'react'
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
        points={[
          'React 没有"哪个组件依赖了哪个数据"的追踪能力，state 放在哪一层，那一层及其子树就得重渲染。',
          '判断标准：这个 state 会被哪些组件读到？把它放到这些组件的"最近公共父组件"就好，不要图省事全放顶层。',
          '如果状态必须在顶层（比如要发请求），用 children 把静态子树传进去，一样能挡掉重渲染。',
          '这是 Vue 里不太需要操心的问题（响应式自动追踪到具体组件），所以从 Vue 过来的人特别容易踩。',
        ]}
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
        points={[
          'key 是 React 判断"这个元素还是不是同一个组件实例"的唯一依据。',
          '用 index 作 key：删掉第一项后，React 认为"key 0 还在，只是 props 变了"，于是复用 DOM 节点 → 非受控输入/内部 state 全部错位。',
          '当列表会排序、过滤、插入、删除时，index key 一定会出问题；只有静态不动的列表才勉强能用。',
          '如果实在没有 id，可以在数据进入前端时就生成一个（crypto.randomUUID() 或者后端返回）。',
        ]}
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
        points={[
          '能由已有 state / props 推导出来的值，一律不要存 state —— 这是 React 官方文档里的头号建议。',
          '冗余 state 的代价：多一次同步逻辑、容易出现不一致，而且每次都要多维护一个 setState。',
          '如果派生计算真的很贵，用 useMemo 而不是 useState 来缓存它（参考第 02 章）。',
          '判断口诀：这个值变了，是不是应该"顺便"让另一个 state 也变？如果是，那它大概率不该是 state。',
        ]}
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
        points={[
          '同步调用、setTimeout、Promise.then、原生事件里，全部自动批处理 —— 不需要再手动 unstable_batchedUpdates。',
          '所以"合并 setState 以减少渲染"这类优化，在 React 18+ 基本不需要做了。',
          '但要注意：批处理的是「渲染次数」，如果你在 render 里做了昂贵计算，一次渲染也够慢 —— 所以还是回到本章的主题：把渲染范围缩小。',
        ]}
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
        points={[
          '一个 400 行的组件里任何一个 state 变化，整个组件都要重新执行 400 行代码。',
          '拆成小组件后，状态可以下沉到最需要它的那一个，其余组件用 memo + 稳定 props 就能完全不动。',
          '拆分粒度参考：这个组件的 state 变化时，页面上有多少内容"其实不该变"？',
        ]}
        codeTone="good"
      >
        <PageStructureDemo />
      </DemoCard>

      <Panel title="本章小结">
        <ul className="checklist">
          <li>状态下沉 / children 插槽 / 正确的 key —— 这三种结构优化的收益，通常大于到处加 memo。</li>
          <li>派生值永远不要存 state，它是"两个真相来源"的根源。</li>
          <li>React 18+ 已经自动批处理，不用再手动合并 setState；重点应该放在「缩小渲染范围」。</li>
          <li>拆分组件时，顺便想一下：哪些 state 可以继续往下沉？</li>
        </ul>
      </Panel>
    </>
  )
}
