import {
  Activity,
  memo,
  Suspense,
  useActionState,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from 'react'
import { DemoCard } from '../components/DemoCard'
import { PageHeader, Panel } from '../components/PageHeader'
import { RenderBadge } from '../components/RenderBadge'
import { simulateWork } from '../lib/perf'
import { useRenderCount } from '../lib/useRenderCount'

/* =========================================================================
   Demo 1：useOptimistic —— 优化"感知性能"，而不是渲染性能
   ========================================================================= */

/** 假装很慢的保存接口 */
function saveToServer(text: string): Promise<{ ok: boolean; text: string }> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ok: true, text }), 900)
  })
}

function OptimisticDemo() {
  const renders = useRenderCount('OptimisticDemo')
  const [saved, setSaved] = useState<string[]>(['第一条已保存的留言'])
  const [pendingText, setPendingText] = useState('')

  const [optimistic, addOptimistic] = useOptimistic<string[], string>(saved, (current, next) => [
    ...current,
    next,
  ])

  const [isPending, startTransition] = useTransition()

  function submit() {
    const text = pendingText.trim()
    if (!text) return
    setPendingText('')

    startTransition(async () => {
      // ① 立刻把"乐观值"塞进去 → 界面马上出现这一条
      addOptimistic(text)
      // ② 后台真的去保存
      const result = await saveToServer(text)
      // ③ 保存成功后写入真实 state（乐观值会自动被真实值取代）
      if (result.ok) setSaved((list) => [...list, result.text])
    })
  }

  return (
    <div className="stack">
      <div className="row">
        <input
          type="text"
          value={pendingText}
          style={{ minWidth: 280 }}
          placeholder="写点内容，点保存（接口要 0.9 秒）"
          onChange={(event) => setPendingText(event.target.value)}
        />
        <button type="button" className="btn btn--primary" onClick={submit}>
          保存
        </button>
        <RenderBadge name="OptimisticDemo" count={renders} />
        {isPending ? <span className="tag tag--soft">正在后台保存…</span> : null}
      </div>

      <ul className="checklist" style={{ listStyle: 'none', paddingLeft: 0 }}>
        {optimistic.map((text, index) => {
          // 乐观值比真实值多出来的那几条，就是"还没落库"的
          const isOptimistic = index >= saved.length
          return (
            <li key={`${text}-${index}`} className="row">
              <span className="hint" style={{ width: 24, opacity: isOptimistic ? 0.5 : 1 }}>
                {isOptimistic ? '◌' : '●'}
              </span>
              <span style={{ opacity: isOptimistic ? 0.5 : 1 }}>{text}</span>
              {isOptimistic ? <span className="hint">← 乐观值（还在保存）</span> : null}
            </li>
          )
        })}
      </ul>

      <p className="hint">
        点保存的<b>那一瞬间</b>，列表里就出现了这一条（半透明 = 还没落库），页面完全没有等待感。
        0.9 秒后接口返回，它自然变成实心的真实数据。
      </p>
      <p className="hint">
        注意它优化的是<b>「感知性能」</b>：总耗时一秒没少，但用户不再盯着 loading 转圈。
        这一点和本章其它 API 都不一样 —— 前面几章都在讲"让渲染更快"，这里讲的是"让等待不难受"。
      </p>
    </div>
  )
}

/* =========================================================================
   Demo 2：useActionState —— 把表单的 pending / error / 结果收进一个 hook
   ========================================================================= */

type FormState = { status: 'idle' | 'ok' | 'error'; message: string }

/** 模拟"服务端校验"：含 "error" 就失败 */
async function submitName(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get('name') ?? '').trim()
  await new Promise((resolve) => setTimeout(resolve, 700))
  if (!name) return { status: 'error', message: '名字不能为空' }
  if (name.toLowerCase().includes('error')) {
    return { status: 'error', message: `"${name}" 已被占用（含 error 就会失败，故意留的）` }
  }
  return { status: 'ok', message: `已提交：${name}` }
}

function ActionStateDemo() {
  const INITIAL: FormState = { status: 'idle', message: '' }
  const [state, formAction, isPending] = useActionState(submitName, INITIAL)

  return (
    <form className="stack" action={formAction}>
      <div className="row">
        <input type="text" name="name" placeholder="输入名字（含 error 会失败）" style={{ minWidth: 240 }} />
        <button type="submit" className="btn btn--primary" disabled={isPending}>
          {isPending ? '提交中…' : '提交'}
        </button>
        {isPending ? <span className="tag tag--soft">isPending = true</span> : null}
      </div>

      {state.status !== 'idle' ? (
        <p
          className="hint"
          style={{ margin: 0, color: state.status === 'ok' ? 'var(--good)' : 'var(--bad)' }}
        >
          {state.status === 'ok' ? '✓ ' : '✕ '}
          {state.message}
        </p>
      ) : null}

      <p className="hint" style={{ margin: 0 }}>
        以前这套「pending / 错误 / 结果」要自己写三个 useState + try/catch 包住。
        现在一个 <code>useActionState</code> 就够，而且表单能直接用 <code>action=</code> 提交 —— 不写 onSubmit、
        不写 <code>e.preventDefault()</code>。JS 还没加载完时，表单也能降级为原生提交。
      </p>
    </form>
  )
}

/** 一个永远 pending 800ms 再 resolve 的资源缓存 —— 模拟"真实的异步数据/代码加载" */
const promiseCache = new Map<number, Promise<void>>()
const resolvedIds = new Set<number>()

/**
 * 用 React 的 Suspense 协议读取一个"慢资源"：
 * 没就绪就 throw 那个 promise，React 会捕获它并渲染最近的 fallback；
 * promise resolve 后触发重渲染，这次就能读到已就绪的值。
 *
 * 真实项目里这段逻辑不用自己写 —— React.lazy、react-router 的 loader、
 * TanStack Query 的 suspense 模式都替你实现了。
 */
function useSlowResource(id: number): number {
  if (!resolvedIds.has(id)) {
    let promise = promiseCache.get(id)
    if (!promise) {
      promise = new Promise<void>((resolve) => setTimeout(resolve, 800))
      promiseCache.set(id, promise)
    }
    promise.then(() => {
      resolvedIds.add(id)
      // 通知订阅者重渲染，让 Suspense 重新读取
      notifyNextRender()
    })
    throw promise
  }
  return id
}

/**
 * 一个极简的"外部 store"，用来在 promise resolve 后通知 React 重渲染。
 */
const renderListeners = new Set<() => void>()
function notifyNextRender() {
  renderListeners.forEach((listener) => listener())
}
function subscribeRender(listener: () => void) {
  renderListeners.add(listener)
  return () => {
    renderListeners.delete(listener)
  }
}

/** 加载完成后的内容 —— 组件本身是稳定的，靠 props 区分不同资源 */
function SlowContent({ id }: { id: number }) {
  const renders = useRenderCount('SlowContent')
  const started = performance.now()
  simulateWork(20)
  const cost = performance.now() - started

  return (
    <div className="stack" style={{ gap: 6 }}>
      <RenderBadge name="懒加载内容" count={renders} note={`render ≈ ${cost.toFixed(0)}ms`} />
      <p className="hint" style={{ margin: 0 }}>
        内容已经加载完成（资源 id = {id}）。这一块由 <code>&lt;Suspense&gt;</code> 包裹，
        加载需要 <b>800ms</b>。
      </p>
    </div>
  )
}

function SuspenseFallbackDemo() {
  const [id, setId] = useState(1)
  const [withTransition, setWithTransition] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [, forceRender] = useState(0)

  // 订阅资源就绪通知：resolve 后强制重渲染，Suspense 就能拿到已缓存的结果
  useEffect(() => {
    return subscribeRender(() => forceRender((n) => n + 1))
  }, [])

  function load(next: number) {
    if (withTransition) {
      startTransition(() => setId(next))
    } else {
      setId(next)
    }
  }

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn" onClick={() => load(id >= 3 ? 1 : id + 1)}>
          加载下一个资源（id = {id >= 3 ? 1 : id + 1}，800ms）
        </button>
        <label className="switch">
          <input
            type="checkbox"
            checked={withTransition}
            onChange={(event) => setWithTransition(event.target.checked)}
          />
          <span>用 startTransition 包裹</span>
        </label>
        {isPending ? <span className="tag tag--soft">isPending（保留旧内容中）</span> : null}
      </div>

      <div className="panel" style={{ marginBottom: 0, minHeight: 120 }}>
        {/*
         * ⚠️ 关键点：读取慢资源的组件必须放在 <Suspense> **内部**。
         * 如果把 useSlowResource(id) 写在 SuspenseFallbackDemo 的顶层，
         * 它一 throw 就会把整个 Demo（包括按钮和开关）一起卸载，
         * 一直冒泡到 Layout 里那个路由级 Suspense —— 页面会整块消失。
         * 这也是 Suspense 最容易用错的地方：边界要包在"会挂起的那一小块"外面。
         */}
        <Suspense fallback={<SuspenseSkeleton />}>
          <SlowContentLoader id={id} />
        </Suspense>
      </div>

      <p className="hint">
        关掉开关再点按钮：内容区会<b>先被 fallback 顶替</b>（闪一下），800ms 后新内容才出现。
        打开开关再点：<b>旧内容一直留在屏幕上</b>，等新内容准备好了才一次性替换 —— 全程零闪烁。
      </p>
      <p className="hint">
        原理：transition 期间的挂起会被 React 视为「非紧急」，它会保留已提交的界面继续展示，
        而不是回退到 fallback。这也是路由切换（懒加载页面）最该用上的技巧。
      </p>
    </div>
  )
}

/** 真正读取慢资源的组件：放在 Suspense 内部，挂起时只影响自己这一块 */
function SlowContentLoader({ id }: { id: number }) {
  const readyId = useSlowResource(id)
  return <SlowContent id={readyId} />
}

function SuspenseSkeleton() {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="tag tag--soft" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}>
        Suspense fallback
      </span>
      <p className="hint" style={{ margin: 0 }}>
        骨架屏 —— 旧内容被替换掉了，这就是"闪一下"。
      </p>
    </div>
  )
}

/* =========================================================================
   Demo 4：<Activity> —— 隐藏但保留状态（Vue 的 KeepAlive 对应物）
   ========================================================================= */

const TabPanel = memo(function TabPanel({ name }: { name: string }) {
  const renders = useRenderCount(name)
  const [text, setText] = useState('')

  // 故意做点渲染开销，让"重新挂载 vs 保留"的区别更明显
  const started = performance.now()
  simulateWork(15)
  const cost = performance.now() - started

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row">
        <RenderBadge name={name} count={renders} note={`render ≈ ${cost.toFixed(0)}ms`} />
        <span className="hint">state：{text ? '有内容' : '空'}</span>
      </div>
      <input
        type="text"
        value={text}
        placeholder="在这里打点字，然后切走再切回来"
        onChange={(event) => setText(event.target.value)}
      />
      <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
        {useMemo(
          () =>
            Array.from({ length: 12 }, (_, i) => (
              <span className="tag tag--soft" key={i}>
                {name}-{i + 1}
              </span>
            )),
          [name],
        )}
      </div>
    </div>
  )
})

function ActivityDemo() {
  const [tab, setTab] = useState<'a' | 'b'>('a')
  const [mode, setMode] = useState<'unmount' | 'activity'>('unmount')

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn" onClick={() => setTab(tab === 'a' ? 'b' : 'a')}>
          切换到 {tab === 'a' ? 'B' : 'A'} 标签
        </button>
        <label className="switch">
          <input
            type="checkbox"
            checked={mode === 'activity'}
            onChange={(event) => setMode(event.target.checked ? 'activity' : 'unmount')}
          />
          <span>用 &lt;Activity&gt; 代替条件渲染</span>
        </label>
        <span className="hint">当前：{mode === 'activity' ? '<Activity mode="visible|hidden">' : '条件渲染（卸载）'}</span>
      </div>

      <div className="panel" style={{ marginBottom: 0 }}>
        {mode === 'activity' ? (
          <>
            <Activity mode={tab === 'a' ? 'visible' : 'hidden'}>
              <TabPanel name="TabA" />
            </Activity>
            <Activity mode={tab === 'b' ? 'visible' : 'hidden'}>
              <TabPanel name="TabB" />
            </Activity>
          </>
        ) : tab === 'a' ? (
          <TabPanel name="TabA" />
        ) : (
          <TabPanel name="TabB" />
        )}
      </div>

      <p className="hint">
        先选「条件渲染」：在 A 的输入框里打字 → 切到 B → 切回 A。<b>输入的内容没了</b>，
        而且渲染计数重新从 1 开始（组件被卸载了）。
      </p>
      <p className="hint">
        再选「&lt;Activity&gt;」：同样操作一遍。<b>输入的内容还在</b>，切换到 A 时也不会重新挂载（计数保持）。
        被隐藏的那棵树会保留 state 和 DOM，同时把内部的 Effect 停掉 —— 这正是 Vue 里 <code>&lt;KeepAlive&gt;</code> 的效果。
      </p>
      <p className="hint" style={{ color: 'var(--warn)' }}>
        这一点很重要：<b>「React 里没有 KeepAlive 对应物」这个说法，在 React 19.2 已经不成立了。</b>
        以前要手动实现（把 state 提到父层、或者用 CSS 隐藏 + 自己管理），现在有了官方组件。
        适合的场景：Tab 切换、列表→详情→返回、多步骤向导 —— 这些以前都在容忍"回来时状态丢失"。
      </p>
    </div>
  )
}

/* =========================================================================
   Demo 5：React Compiler —— 还需要手写 memo 吗？
   ========================================================================= */

function CompilerDemo() {
  const renders = useRenderCount('CompilerDemo')
  const [keyword, setKeyword] = useState('')
  const [items] = useState(() => Array.from({ length: 400 }, (_, i) => `商品 ${i + 1}`))

  // 这是一个"每次渲染都会重新计算"的派生值
  const filtered = items.filter((item) => item.includes(keyword))
  // 这也是一个"每次渲染都会新建"的对象
  const style = { color: 'var(--accent)', fontFamily: 'var(--mono)' }

  // React Compiler 开启后，上面这两行会被自动包进缓存（等价于自动 useMemo）
  // 你可以打开 React DevTools 看 Compiler 的 memoization 标注

  return (
    <div className="stack">
      <div className="row">
        <input
          type="text"
          value={keyword}
          placeholder="输入来触发重渲染"
          onChange={(event) => setKeyword(event.target.value)}
        />
        <RenderBadge name="CompilerDemo" count={renders} />
      </div>

      <p className="hint" style={{ margin: 0 }}>
        筛选结果：<b style={style}>{filtered.length}</b> / {items.length}
      </p>

      <Panel title="关于 React Compiler（本次分享的「未来时」）">
        <ul className="checklist">
          <li>
            <b>它是什么：</b>一个在构建时运行的编译器，自动分析组件里的计算和依赖，
            自动插入等价于 <code>useMemo</code> / <code>useCallback</code> / <code>memo</code> 的缓存。
          </li>
          <li>
            <b>它解决什么：</b>「人懒得写 / 忘了写 / 写错了依赖数组」这三件事。前八章讲的手写优化手段依然成立，
            但以后会有一大部分活儿交给编译器。
          </li>
          <li>
            <b>它不解决什么：</b>结构问题。状态放错位置、Context 拆得不对、列表没虚拟化、组件包太大 ——
            这些编译器一概不管。所以「先结构、后 memo、最后才考虑编译器和微优化」的顺序不会变。
          </li>
          <li>
            <b>前置条件（很重要）：</b>组件必须遵守 Rules of React —— 纯函数、不要在渲染期改外部变量、props 当成不可变。
            你现在有"渲染期写 <code>ref.current</code>""直接 mutate props 对象"这类代码的话，编译器会直接跳过那个组件。
          </li>
          <li>
            <b>落地建议：</b>先开 lint 规则（<code>eslint-plugin-react-compiler</code>）把违规代码清一遍，
            再逐个目录接入编译，不要一次性全量打开。
          </li>
        </ul>
      </Panel>
    </div>
  )
}

/* =========================================================================
   页面
   ========================================================================= */

export default function React19Page() {
  return (
    <>
      <PageHeader
        index="10"
        title="React 19 性能相关新特性"
        subtitle="前九章讲的都是「一直有效的手段」。这一章讲 React 19 带来的新工具 —— 其中一条会直接改变你对 memo 的判断。"
        tags={['React 19', 'useOptimistic', 'useActionState', 'Activity', 'React Compiler']}
      />

      <Panel title="为什么单独开一章">
        <p className="hint" style={{ margin: '0 0 10px' }}>
          React 19 的性能话题分两类，别混在一起讲：
        </p>
        <ul className="checklist">
          <li>
            <b>一类是新增的优化能力</b>（<code>useOptimistic</code>、<code>&lt;Activity&gt;</code>、transition 增强）——
            它们补上了过去需要手写的场景。
          </li>
          <li>
            <b>另一类是改变了"要不要手写优化"的前提</b>（React Compiler）——
            它让「到处加 useMemo」这件事的价值下降，但不是归零。
          </li>
        </ul>
      </Panel>

      <DemoCard
        title="Demo 1｜useOptimistic：优化感知性能"
        tag="React 19"
        tone="good"
        desc="接口要 0.9 秒。用 useOptimistic 之后，用户点下按钮的那一刻就看到结果，完全无等待感。"
        codeTone="good"
        code={`const [optimistic, addOptimistic] = useOptimistic(
  savedList,
  (current, next) => [...current, next],   // 乐观值的计算方式
)

function submit() {
  startTransition(async () => {
    addOptimistic(draft)              // ① 立刻显示
    try {
      const res = await api.save(draft)   // ② 真的去存
      setSavedList(list => [...list, res]) // ③ 成功后写入真实 state
    } catch {
      // ④ 失败时不写真实 state → 乐观值自动消失，再提示用户
      toast.error('保存失败')
    }
  })
}`}
      >
        <OptimisticDemo />
      </DemoCard>

      <DemoCard
        title="Demo 2｜useActionState：表单的 pending / 错误 / 结果三合一"
        tone="good"
        desc="以前要三个 useState 加 try/catch，现在一个 hook 收口，而且能配合原生表单提交。"
        codeTone="good"
        code={`const [state, formAction, isPending] = useActionState(
  async (prev, formData) => {
    const name = formData.get('name')
    const res = await api.submit(name)
    return res.ok ? { status: 'ok' } : { status: 'error', message: res.msg }
  },
  { status: 'idle' },
)

return (
  <form action={formAction}>
    <input name="name" />        {/* 非受控，靠 FormData 取值 */}
    <button disabled={isPending}>
      {isPending ? '提交中…' : '提交'}
    </button>
    {state.status === 'error' && <p>{state.message}</p>}
  </form>
)`}
      >
        <ActionStateDemo />
      </DemoCard>

      <DemoCard
        title="Demo 3｜Suspense + transition：让懒加载不再「闪一下」"
        tone="good"
        desc="加载同一个资源两次，一次裸 Suspense，一次用 transition 包住。看内容区有没有被骨架屏顶替。"
        codeTone="good"
        code={`// ❌ 裸 Suspense：加载期间旧内容被 fallback 顶替 → 闪一下
<Suspense fallback={<Skeleton />}>
  <LazyDetail id={id} />
</Suspense>

// ✅ 用 transition 包住更新：保留旧内容，直到新内容就绪
const [isPending, startTransition] = useTransition()

function open(id) {
  startTransition(() => setId(id))
}

<div style={{ opacity: isPending ? 0.6 : 1 }}>
  <Suspense fallback={<Skeleton />}>
    <LazyDetail id={id} />
  </Suspense>
</div>`}
      >
        <SuspenseFallbackDemo />
      </DemoCard>

      <DemoCard
        title="Demo 4｜<Activity>：Vue 的 KeepAlive，React 19.2 有了"
        tag="必讲"
        tone="good"
        desc="在输入框里打字，切换标签，再切回来。对比「条件渲染（卸载）」和「Activity（保留）」的区别。"
        codeTone="good"
        code={`// ❌ 条件渲染：切走就卸载，回来时 state 全没了
{tab === 'a' ? <PanelA /> : <PanelB />}

// ✅ Activity：两棵都保留，只是控制显示哪个
<Activity mode={tab === 'a' ? 'visible' : 'hidden'}>
  <PanelA />
</Activity>
<Activity mode={tab === 'b' ? 'visible' : 'hidden'}>
  <PanelB />
</Activity>

// 对比 Vue：
//   <KeepAlive>
//     <component :is="currentTab" />
//   </KeepAlive>`}
      >
        <ActivityDemo />
      </DemoCard>

      <DemoCard
        title="Demo 5｜React Compiler：以后还要手写 useMemo 吗？"
        tone="default"
        desc="这一节没有「对比 Demo」，而是一个必须说清的结论，关联前面几章。"
        codeTone="default"
        code={`// 你写的代码（不用管缓存）
function Filter({ items, keyword }) {
  const filtered = items.filter(i => i.includes(keyword))   // 每次渲染都算
  const style = { color: 'red' }                            // 每次渲染都新建
  return <List items={filtered} style={style} />
}

// React Compiler 编译后（大致等价于）
function Filter({ items, keyword }) {
  const filtered = useMemo(
    () => items.filter(i => i.includes(keyword)),
    [items, keyword],
  )
  const style = useMemo(() => ({ color: 'red' }), [])
  return <List items={filtered} style={style} />
}

// 但编译器管不了这些 —— 该改还得改：
// ❌ 一个 800 行的组件里放 12 个 state
// ❌ 整个应用套一个 Context
// ❌ 20000 行列表没有虚拟化`}
      >
        <CompilerDemo />
      </DemoCard>

      <Panel title="本章小结：一个新 API 的清单">
        <table className="table">
          <thead>
            <tr>
              <th>API</th>
              <th>解决什么</th>
              <th>优先学吗</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>useOptimistic</code>
              </td>
              <td>感知性能：让用户不等</td>
              <td>✅ 高（改一个交互就有体感）</td>
            </tr>
            <tr>
              <td>
                <code>&lt;Activity&gt;</code>
              </td>
              <td>保留状态 + 停 Effect，取代手写缓存方案</td>
              <td>✅ 高（但要确认 React 版本 ≥ 19.2）</td>
            </tr>
            <tr>
              <td>
                <code>useActionState</code>
              </td>
              <td>表单三态收口，顺带少一个受控 state</td>
              <td>✅ 中高（表单多的项目收益大）</td>
            </tr>
            <tr>
              <td>
                Suspense + transition
              </td>
              <td>消除懒加载闪烁</td>
              <td>✅ 高（路由切换立刻见效）</td>
            </tr>
            <tr>
              <td>
                React Compiler
              </td>
              <td>自动 memo 化</td>
              <td>⚠️ 中（先清代码，再试点）</td>
            </tr>
            <tr>
              <td>
                <code>cache</code>
              </td>
              <td>服务端组件里的记忆化</td>
              <td>⏸ 暂缓（需要 RSC 架构，纯前端项目用不上）</td>
            </tr>
            <tr>
              <td>
                <code>&lt;ViewTransition&gt;</code>
              </td>
              <td>视图过渡动画</td>
              <td>⏸ 暂缓（实验性 API，API 还会变）</td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </>
  )
}
