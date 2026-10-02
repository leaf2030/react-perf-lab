import { createContext, memo, useContext, useMemo, useState, type ReactNode } from 'react'
import { DemoCard } from '../components/DemoCard'
import { PageHeader, Panel } from '../components/PageHeader'
import { RenderBadge } from '../components/RenderBadge'
import { createStore, useStoreSelector } from '../lib/miniStore'
import { useRenderCount } from '../lib/useRenderCount'

/* =========================================================================
   Demo 1：一个大 Context 装所有东西
   ========================================================================= */

type BigValue = { user: string; theme: 'dark' | 'light'; count: number }

const BigContext = createContext<BigValue | null>(null)

function useBigContext(): BigValue {
  const value = useContext(BigContext)
  if (!value) throw new Error('必须在 BigContext.Provider 内部使用')
  return value
}

function BigProvider({ children }: { children: ReactNode }) {
  const renders = useRenderCount('BigProvider')
  const [user] = useState('张三')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [count, setCount] = useState(0)

  // ❌ 没有 useMemo：Provider 只要渲染，value 就是一个新对象 → 所有消费者必然重渲染
  const value: BigValue = { user, theme, count }

  return (
    <BigContext.Provider value={value}>
      <div className="row">
        <button type="button" className="btn" onClick={() => setCount((v) => v + 1)}>
          点赞 +1（只改了 count）：{count}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setTheme((v) => (v === 'dark' ? 'light' : 'dark'))}
        >
          切换主题：{theme}
        </button>
        <RenderBadge name="BigProvider" count={renders} />
      </div>
      <div className="grid-3 mt-12">{children}</div>
    </BigContext.Provider>
  )
}

function BigUserCard() {
  const { user } = useBigContext()
  const renders = useRenderCount('UserCard')
  return (
    <div className="heavy">
      <RenderBadge name="UserCard（只读 user）" count={renders} note={`user = ${user}`} />
    </div>
  )
}

function BigThemeCard() {
  const { theme } = useBigContext()
  const renders = useRenderCount('ThemeCard')
  return (
    <div className="heavy">
      <RenderBadge name="ThemeCard（只读 theme）" count={renders} note={`theme = ${theme}`} />
    </div>
  )
}

function BigCountCard() {
  const { count } = useBigContext()
  const renders = useRenderCount('CountCard')
  return (
    <div className="heavy">
      <RenderBadge name="CountCard（只读 count）" count={renders} note={`count = ${count}`} />
    </div>
  )
}

/* =========================================================================
   Demo 2：拆成多个 Context，各管各的
   ========================================================================= */

const UserContext = createContext('')
const ThemeContext = createContext<'dark' | 'light'>('dark')
const CountContext = createContext(0)

function SplitProvider({ children }: { children: ReactNode }) {
  const renders = useRenderCount('SplitProvider')
  const [user] = useState('张三')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [count, setCount] = useState(0)

  return (
    <UserContext.Provider value={user}>
      <ThemeContext.Provider value={theme}>
        <CountContext.Provider value={count}>
          <div className="row">
            <button type="button" className="btn" onClick={() => setCount((v) => v + 1)}>
              点赞 +1（只改了 count）：{count}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setTheme((v) => (v === 'dark' ? 'light' : 'dark'))}
            >
              切换主题：{theme}
            </button>
            <RenderBadge name="SplitProvider" count={renders} />
          </div>
          <div className="grid-3 mt-12">{children}</div>
        </CountContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  )
}

function SplitUserCard() {
  const user = useContext(UserContext)
  const renders = useRenderCount('UserCard')
  return (
    <div className="heavy heavy--light">
      <RenderBadge name="UserCard（只订阅 UserContext）" count={renders} tone="cool" note={`user = ${user}`} />
    </div>
  )
}

function SplitThemeCard() {
  const theme = useContext(ThemeContext)
  const renders = useRenderCount('ThemeCard')
  return (
    <div className="heavy heavy--light">
      <RenderBadge name="ThemeCard（只订阅 ThemeContext）" count={renders} tone="cool" note={`theme = ${theme}`} />
    </div>
  )
}

function SplitCountCard() {
  const count = useContext(CountContext)
  const renders = useRenderCount('CountCard')
  return (
    <div className="heavy heavy--light">
      <RenderBadge name="CountCard（只订阅 CountContext）" count={renders} tone="cool" note={`count = ${count}`} />
    </div>
  )
}

/* =========================================================================
   Demo 3：外部 store + selector 精确订阅
   ========================================================================= */

type StoreState = { user: string; theme: 'dark' | 'light'; count: number }

const store = createStore<StoreState>({ user: '张三', theme: 'dark', count: 0 })

/** 按钮自己订阅需要的字段：它重渲染只影响自己，不会带累下面的卡片 */
function StoreControls() {
  const count = useStoreSelector(store, (state) => state.count)
  const theme = useStoreSelector(store, (state) => state.theme)

  return (
    <div className="row">
      <button type="button" className="btn" onClick={() => store.setState({ count: count + 1 })}>
        点赞 +1（只改了 count）：{count}
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => store.setState({ theme: theme === 'dark' ? 'light' : 'dark' })}
      >
        切换主题：{theme}
      </button>
      <span className="hint">store.setState 不会让任何「父组件」重渲染</span>
    </div>
  )
}

function StoreDemo() {
  // 这个组件自己不订阅任何数据，所以它永远不会因为 store 变化而重渲染
  return (
    <div className="stack">
      <StoreControls />

      <div className="grid-3">
        <StoreUserCard />
        <StoreThemeCard />
        <StoreCountCard />
      </div>
    </div>
  )
}

function StoreUserCard() {
  const user = useStoreSelector(store, (state) => state.user)
  const renders = useRenderCount('StoreUserCard')
  return (
    <div className="heavy heavy--light">
      <RenderBadge name="StoreUserCard" count={renders} tone="cool" note={`selector: user = ${user}`} />
    </div>
  )
}

function StoreThemeCard() {
  const theme = useStoreSelector(store, (state) => state.theme)
  const renders = useRenderCount('StoreThemeCard')
  return (
    <div className="heavy heavy--light">
      <RenderBadge name="StoreThemeCard" count={renders} tone="cool" note={`selector: theme = ${theme}`} />
    </div>
  )
}

function StoreCountCard() {
  const count = useStoreSelector(store, (state) => state.count)
  const renders = useRenderCount('StoreCountCard')
  return (
    <div className="heavy heavy--light">
      <RenderBadge name="StoreCountCard" count={renders} tone="cool" note={`selector: count = ${count}`} />
    </div>
  )
}

/* =========================================================================
   Demo 4：value 有没有 memo 的区别
   ========================================================================= */

const ValueContext = createContext<{ theme: string }>({ theme: 'dark' })

const ValueConsumer = memo(function ValueConsumer({ name }: { name: string }) {
  const { theme } = useContext(ValueContext)
  const renders = useRenderCount(name)
  return <RenderBadge name={name} count={renders} note={`theme = ${theme}`} />
})

/** Provider 内部有自己的状态，会频繁重渲染；children 由外部传入，引用稳定 */
function Wrapper({
  children,
  providerName,
  memoizeValue,
}: {
  children: ReactNode
  providerName: string
  memoizeValue: boolean
}) {
  const renders = useRenderCount(providerName)
  const [tick, setTick] = useState(0)

  // ✅ 依赖为空 → 引用恒定；❌ 不 memo → 每次渲染都是新对象
  const memoized = useMemo(() => ({ theme: 'dark' }), [])
  const value = memoizeValue ? memoized : { theme: 'dark' }

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn" onClick={() => setTick((v) => v + 1)}>
          Provider 因无关原因重渲染：{tick}
        </button>
        <RenderBadge name={providerName} count={renders} />
      </div>
      <ValueContext.Provider value={value}>{children}</ValueContext.Provider>
    </div>
  )
}

function MemoValueDemo() {
  return (
    <div className="grid-2">
      <div className="stack">
        <p className="hint">❌ value 每次都是新对象</p>
        <Wrapper providerName="Wrapper（未 memo）" memoizeValue={false}>
          <ValueConsumer name="Consumer（未 memo）" />
        </Wrapper>
      </div>
      <div className="stack">
        <p className="hint">✅ value 用 useMemo 固定</p>
        <Wrapper providerName="Wrapper（已 memo）" memoizeValue>
          <ValueConsumer name="Consumer（已 memo）" />
        </Wrapper>
      </div>
    </div>
  )
}

/* =========================================================================
   页面
   ========================================================================= */

export default function ContextPage() {
  return (
    <>
      <PageHeader
        index="04"
        title="Context 的性能陷阱"
        subtitle="Context 是跨层级传值的好工具，但它也是最容易被误用的状态管理方案：Provider 一渲染，所有消费者跟着渲染。"
        tags={['Context', 'useSyncExternalStore', 'selector', '状态管理']}
      />

      <Panel title="Context 的渲染规则（核心一条）">
        <ul className="checklist">
          <li>
            <b>Provider 的 value 变化（Object.is 比较）→ 所有消费者重渲染</b>，哪怕组件只用到了其中的一个字段。
          </li>
          <li>
            消费者组件自己的父组件重渲染时，它也会重渲染 —— 这和 Context 无关，是普通的 props 传递行为。
          </li>
          <li>
            React 默认<b>不会</b>比较 value 内部有没有变化，也不认识「selector」。这就是 Context 不适合存「高频变化的状态」的原因。
          </li>
          <li>
            对照组：Vue 的 <code>provide/inject</code> 配合响应式对象时，只有真正用到变化字段的组件会更新 —— 这是两边的根本差异。
          </li>
        </ul>
      </Panel>

      <DemoCard
        title="Demo 1｜一个大 Context：改一个字段，三个组件全刷新"
        tag="问题现场"
        tone="bad"
        desc="点赞按钮只改了 count，但 UserCard 和 ThemeCard 也跟着重渲染了。"
        points={[
          '三个消费者读的是同一个 Context，任何一个字段变化，它们都会收到通知。',
          '更坑的是：如果 value 是内联对象甚至每次都新建，即便 state 没变，消费者也会全部重渲染（见 Demo 4）。',
          '在小项目里这个问题不明显，一旦 Context 里放了 "鼠标位置""滚动进度""表单输入"这种高频值，页面就会整体卡顿。',
        ]}
        code={`const AppContext = createContext(null)

function Provider({ children }) {
  const [user, setUser] = useState('张三')
  const [theme, setTheme] = useState('dark')
  const [count, setCount] = useState(0)

  // ❌ 一个大对象，任何一个字段变都会让下面所有消费者重渲染
  return (
    <AppContext.Provider value={{ user, theme, count }}>
      {children}
    </AppContext.Provider>
  )
}`}
      >
        <BigProvider>
          <BigUserCard />
          <BigThemeCard />
          <BigCountCard />
        </BigProvider>
      </DemoCard>

      <DemoCard
        title="Demo 2｜拆分 Context：谁的数据变了，谁才重渲染"
        tag="最简单的优化"
        tone="good"
        desc="把一个大 Context 按「变化频率」拆成几个小 Context，消费者各订阅各的。"
        points={[
          '拆分维度：按「变化频率」拆（高频的和低频的不要放一起），而不是按业务模块拆。',
          '把不变的 dispatch / setter 单独放一个 Context（它们引用稳定，永远不会触发重渲染）。',
          '代价：嵌套的 Provider 变多了，组件树会变深一点，但收益通常值得。',
        ]}
        codeTone="good"
        code={`const UserContext = createContext('')
const ThemeContext = createContext('dark')
const CountContext = createContext(0)

function Provider({ children }) {
  const [user] = useState('张三')
  const [theme, setTheme] = useState('dark')
  const [count, setCount] = useState(0)

  return (
    <UserContext.Provider value={user}>
      <ThemeContext.Provider value={theme}>
        <CountContext.Provider value={count}>
          {children}
        </CountContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  )
}

// 消费者只订阅自己需要的那一个
const count = useContext(CountContext)`}
      >
        <SplitProvider>
          <SplitUserCard />
          <SplitThemeCard />
          <SplitCountCard />
        </SplitProvider>
      </DemoCard>

      <DemoCard
        title="Demo 3｜外部 store + selector：精确到字段的订阅"
        tag="大规模状态的正解"
        tone="good"
        desc="状态放在 React 之外，组件通过 selector 只订阅自己关心的字段 —— 这就是 zustand / jotai 的原理。"
        points={[
          'useSyncExternalStore 是 React 18 提供的官方 API，专门用来订阅 React 之外的数据源。',
          '状态更新时直接调用 store 的 setter，不经过任何「父组件」，所以不会有大范围的重渲染。',
          '⚠️ selector 必须返回稳定值：返回新对象会导致「getSnapshot 结果不稳定」的无限循环警告，需要配合 shallow 比较或拆成多次选择。',
          '什么时候上外部 store：跨页面共享、更新频繁、订阅者很多（比如表格列配置、播放器状态、全局通知）。',
        ]}
        codeTone="good"
        code={`import { useSyncExternalStore } from 'react'

function useStoreSelector(store, selector) {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
  )
}

// 组件只订阅 count 这一个字段
const count = useStoreSelector(store, (s) => s.count)

// ⚠️ 不要这样写：每次返回新对象 → 触发无限循环
const { count } = useStoreSelector(store, (s) => ({ count: s.count }))`}
      >
        <StoreDemo />
      </DemoCard>

      <DemoCard
        title="Demo 4｜value 需要 memo"
        tag="最常见的低级错误"
        tone="bad"
        desc="两个 Wrapper 内部都有会变的 state，唯一的区别是传给 Provider 的 value 有没有用 useMemo 固定。"
        points={[
          'Provider 只要重渲染，内联的 value 就是新对象，Object.is 比较失败 → 消费者全部重渲染。',
          '这是「我明明没改数据，为什么子组件一直渲染」的常见原因之一。',
          '注意：value 里如果包含每次新建的对象/函数（比如 value={{ list: [], onSelect: () => {} }}），useMemo 也救不了，依赖必须稳定。',
        ]}
        code={`// ❌ 每次渲染都是新对象
<Ctx.Provider value={{ theme }}>

// ✅ 引用稳定（依赖里放真正会变的值）
const value = useMemo(() => ({ theme }), [theme])
<Ctx.Provider value={value}>`}
      >
        <MemoValueDemo />
      </DemoCard>

      <Panel title="Context vs 外部 store，怎么选">
        <table className="table">
          <thead>
            <tr>
              <th>维度</th>
              <th>Context</th>
              <th>外部 store（zustand / jotai / useSyncExternalStore）</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>适合的数据</td>
              <td>低频、全局稳定的值：主题、语言、当前用户</td>
              <td>高频、局部订阅的值：表单草稿、播放状态、列表筛选</td>
            </tr>
            <tr>
              <td>更新粒度</td>
              <td>整个 value，消费者全量重渲染</td>
              <td>selector 级，只有订阅了该字段的组件重渲染</td>
            </tr>
            <tr>
              <td>额外依赖</td>
              <td>无</td>
              <td>需要引入库，或者自己写 60 行（见 miniStore.ts）</td>
            </tr>
            <tr>
              <td>Vue 的对应物</td>
              <td>provide / inject</td>
              <td>Pinia store（利用 Vue 的响应式自动精确更新）</td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </>
  )
}
