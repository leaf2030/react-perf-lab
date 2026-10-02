import { useRef, useState } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { DemoCard } from '../components/DemoCard'
import { PageHeader, Panel } from '../components/PageHeader'
import { RenderBadge } from '../components/RenderBadge'
import { useRenderCount } from '../lib/useRenderCount'

/* =========================================================================
   Demo：从 Vue 带过来的头号习惯 —— 直接改数据
   ========================================================================= */

function ImmutabilityDemo() {
  const renders = useRenderCount('列表组件')
  const [items, setItems] = useState(['购物车 A', '购物车 B', '购物车 C'])

  // 因为 React 不会重渲染，我们只能手写 DOM 来表达"我确实点了几下"
  const attempts = useRef(0)
  const counterRef = useRef<HTMLSpanElement>(null)
  const ghostRef = useRef<HTMLSpanElement>(null)

  function mutateInPlace() {
    items.push(`幽灵数据 ${items.length + 1}`) // ✅ 数组真的变了
    // ❌ 忘记调用 setItems → React 完全不知道数据变了，界面不会更新
    attempts.current += 1
    if (counterRef.current) counterRef.current.textContent = String(attempts.current)
    if (ghostRef.current) ghostRef.current.textContent = String(items.length)
  }

  function updateImmutably() {
    setItems([...items, `正常数据 ${items.length + 1}`])
    attempts.current = 0
    if (counterRef.current) counterRef.current.textContent = '0'
  }

  function reset() {
    setItems(['购物车 A', '购物车 B', '购物车 C'])
    attempts.current = 0
    if (counterRef.current) counterRef.current.textContent = '0'
    if (ghostRef.current) ghostRef.current.textContent = '3'
  }

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn" onClick={mutateInPlace}>
          直接 push（Vue 的习惯）
        </button>
        <button type="button" className="btn btn--primary" onClick={updateImmutably}>
          不可变更新 setItems([...items, x])
        </button>
        <button type="button" className="btn" onClick={reset}>
          重置
        </button>
        <RenderBadge name="列表组件" count={renders} note="只有它重渲染，React 才知道要更新界面" />
      </div>

      <div className="grid-2">
        <div className="panel panel--bad" style={{ marginBottom: 0 }}>
          <h4 className="panel__title">界面上真实渲染的内容</h4>
          <ul className="checklist">
            {items.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="panel" style={{ marginBottom: 0 }}>
          <h4 className="panel__title">按钮背后发生了什么</h4>
          <ul className="checklist">
            <li>
              你已经点了 <span ref={counterRef}>0</span> 次「直接 push」
            </li>
            <li>
              <code>items</code> 数组的真实长度：
              <span ref={ghostRef}>3</span>
            </li>
          </ul>
          <p className="hint" style={{ marginBottom: 0 }}>
            注意这两个数字是用原生 DOM 手写上去的 —— 因为 React 根本没重渲染，只能用这种方式给你反馈。
            等你点「不可变更新」时，那些偷偷 push 进去的「幽灵数据」会一起冒出来。
          </p>
        </div>
      </div>

      <p className="hint">
        Vue 的 <code>ref/reactive</code> 是「改数据 → 自动追踪 → 自动更新视图」；React 的 state 是「调用 setter → 触发重渲染 → 由重渲染结果决定视图」。
        中间少了 setter 这一步，React 就什么都不做 —— 这是从 Vue 转过来最容易踩的坑。
      </p>
    </div>
  )
}

/* =========================================================================
   页面
   ========================================================================= */

export default function ComparePage() {
  return (
    <>
      <PageHeader
        index="09"
        title="Vue ↔ React 性能对照"
        subtitle="同样是「让页面变快」，两边的抓手完全不同。搞清楚差异，才不会用 Vue 的经验去优化 React，或者反过来。"
        tags={['心智模型', 'API 对照', '迁移踩坑']}
      />

      <Panel title="最根本的差异：细粒度响应式 vs 组件级调度">
        <table className="table">
          <thead>
            <tr>
              <th>维度</th>
              <th>Vue 3</th>
              <th>React 19</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>更新粒度</td>
              <td>精确到「用了这个数据的那个组件 / 那段副作用」</td>
              <td>以「组件」为单位，父组件渲染会带上下面的子树</td>
            </tr>
            <tr>
              <td>依赖收集</td>
              <td>运行时自动收集（谁读了我，我就通知谁）</td>
              <td>手动声明（useMemo / useEffect 的依赖数组）</td>
            </tr>
            <tr>
              <td>数据模型</td>
              <td>可变（proxy 拦截读写）</td>
              <td>不可变（靠 setState 换引用触发更新）</td>
            </tr>
            <tr>
              <td>默认性能</td>
              <td>不需要做太多事就很快</td>
              <td>结构写得不小心就很容易整片重渲染</td>
            </tr>
            <tr>
              <td>优化手段</td>
              <td>v-memo / shallowRef / 虚拟滚动 / Suspense</td>
              <td>memo / useMemo / 状态下沉 / 虚拟化 / 并发特性</td>
            </tr>
            <tr>
              <td>自动化方向</td>
              <td>Vapor Mode（编译期生成原生 DOM 操作）</td>
              <td>React Compiler（编译期自动插入记忆化）</td>
            </tr>
          </tbody>
        </table>
        <p className="hint mt-12">
          一句话总结：<b>Vue 的性能主要靠框架，React 的性能主要靠开发者对渲染模型的理解。</b>
          React 的优化是可预测的 —— 一次点击会让哪些组件重渲染，可以精确推断。
        </p>
      </Panel>

      <Panel title="API 对照速查">
        <table className="table">
          <thead>
            <tr>
              <th>需求</th>
              <th>Vue 3</th>
              <th>React 19</th>
              <th>注意点</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>派生计算</td>
              <td>
                <code>computed</code>
              </td>
              <td>
                <code>useMemo</code>
              </td>
              <td>Vue 自动追踪依赖，React 要手写依赖数组</td>
            </tr>
            <tr>
              <td>副作用</td>
              <td>
                <code>watch / watchEffect</code>
              </td>
              <td>
                <code>useEffect</code>
              </td>
              <td>React 的依赖写错不会报错，只会静默使用旧值</td>
            </tr>
            <tr>
              <td>跳过子组件渲染</td>
              <td>
                <code>v-memo</code>
              </td>
              <td>
                <code>React.memo</code>
              </td>
              <td>React 需要 props 引用稳定才生效</td>
            </tr>
            <tr>
              <td>跨层级传值</td>
              <td>
                <code>provide / inject</code>
              </td>
              <td>
                <code>Context</code>
              </td>
              <td>provide 的值如果是 reactive，只有用到的组件更新；Context 是全体消费者更新</td>
            </tr>
            <tr>
              <td>异步组件</td>
              <td>
                <code>defineAsyncComponent</code>
              </td>
              <td>
                <code>React.lazy</code>
              </td>
              <td>思路一致，React 要配合 Suspense 用</td>
            </tr>
            <tr>
              <td>缓存组件实例</td>
              <td>
                <code>&lt;KeepAlive&gt;</code>
              </td>
              <td>
                <code>&lt;Activity&gt;</code>（React 19.2+）
              </td>
              <td>
                <b style={{ color: 'var(--warn)' }}>⚠️ 这条结论已更新</b>：过去说"没有等价物"，
                现在官方有了。<code>&lt;Activity mode="hidden"&gt;</code> 保留 state 和 DOM，同时停掉内部 Effect。
                React 19.2 之前只能靠「状态提升到 store」或保持组件挂载来模拟。详见第 10 章。
              </td>
            </tr>
            <tr>
              <td>只渲染一次</td>
              <td>
                <code>v-once</code>
              </td>
              <td>把 JSX 存在 useRef / 模块常量里</td>
              <td>也可以用 children 插槽的技巧</td>
            </tr>
            <tr>
              <td>长列表</td>
              <td>vue-virtual-scroller</td>
              <td>TanStack Virtual / react-window</td>
              <td>原理完全一样</td>
            </tr>
            <tr>
              <td>全局状态</td>
              <td>Pinia</td>
              <td>zustand / jotai</td>
              <td>都需要「selector 级订阅」来避免全量重渲染</td>
            </tr>
            <tr>
              <td>更新后操作 DOM</td>
              <td>
                <code>nextTick</code>
              </td>
              <td>
                <code>useLayoutEffect</code> / <code>useEffect</code>
              </td>
              <td>
                别搞混：<code>nextTick</code> 等的是"DOM 已更新、尚未绘制"，时机其实更接近{' '}
                <code>useLayoutEffect</code>（绘制前同步执行）。
                <code>useEffect</code> 是<b>绘制之后</b>才跑，所以"先测量再改样式"用它一定会闪一下。
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <Panel title="代码对照：同一个需求，两边怎么写">
        <div className="grid-2">
          <div>
            <h4 className="panel__title">Vue 3 · SFC</h4>
            <CodeBlock
              title="UserCard.vue"
              code={`<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'

const items = ref<Item[]>([])

// 自动收集依赖：items 变了就重算
const total = computed(() =>
  items.value.reduce((sum, i) => sum + i.price, 0)
)

// 自动收集依赖：items 变了就执行
watchEffect(() => {
  console.log('总价变化', total.value)
})
</script>

<template>
  <div>总价：{{ total }}</div>
  <ul>
    <li v-for="item in items" :key="item.id">
      {{ item.name }}
    </li>
  </ul>
</template>`}
            />
          </div>

          <div>
            <h4 className="panel__title">React 19 · TSX</h4>
            <CodeBlock
              title="UserCard.tsx"
              code={`import { useEffect, useMemo, useState } from 'react'

export function UserCard() {
  const [items, setItems] = useState<Item[]>([])

  // 必须手动写依赖数组
  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price, 0),
    [items],
  )

  useEffect(() => {
    console.log('总价变化', total)
  }, [total])

  return (
    <>
      <div>总价：{total}</div>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </>
  )
}`}
            />
          </div>
        </div>
        <p className="hint">
          差别一眼可见：Vue 的依赖是「运行时自动收集」，React 的依赖是「你亲口告诉它」。
          告诉错了不会报错，只会得到旧值或者多余的重渲染 —— 这是 React 里最常见的隐形 bug 来源。
        </p>
      </Panel>

      <DemoCard
        title="现场演示：直接改数据，React 不会有任何反应"
        tag="头号迁移坑"
        tone="bad"
        desc="点「直接 push」多次，界面纹丝不动；再点「不可变更新」，之前偷偷改的数据会一次性冒出来。"
        points={[
          'Vue 里 `items.value.push(x)` 就会更新视图；React 里必须调用 setItems 并传入一个新引用。',
          'React 用 Object.is 判断 state 有没有变 —— 引用不变就直接 bailout，连渲染都不会发生。',
          '图中「幽灵数据」现象是线上最难查的 bug 之一：数据早就变了，只是 React 不知道，等某个无关的更新触发重渲染时突然显示出来。',
          '正确姿势：对象用 {...obj, field: value}，数组用 [...arr, x] / arr.filter / arr.map，或者引入 immer 这类库。',
        ]}
        code={`const [user, setUser] = useState({ name: '张三', city: '北京' })

// ❌ 直接改属性 —— 引用没变，React 不会更新
user.city = '上海'
setUser(user)

// ✅ 换一个新对象
setUser({ ...user, city: '上海' })

// ❌ 数组直接改
items.push(newItem)

// ✅ 换一个新数组
setItems([...items, newItem])
setItems(items.filter((i) => i.id !== id))
setItems(items.map((i) => (i.id === id ? { ...i, done: true } : i)))

// 嵌套很深时，考虑用 immer 的 produce 让写法回到"可变"的风格`}
      >
        <ImmutabilityDemo />
      </DemoCard>

      <Panel title="从 Vue 过来最容易踩的 7 个坑">
        <ol className="steps">
          <li>
            <b>忘记 setState</b>：直接改数据，界面不更新（Demo 已演示）。
          </li>
          <li>
            <b>把不该放进 state 的东西放进去</b>：能算出来的值直接算，不要存成第二份 state。
          </li>
          <li>
            <b>依赖数组漏写</b>：useEffect / useMemo 读到旧值，且不会报错。ESLint 的 exhaustive-deps 规则需开启。
          </li>
          <li>
            <b>到处加 memo</b>：Vue 里不需要考虑「父组件会不会带累我」，React 里 memo 要配稳定 props 才有用，滥用反而更慢。
          </li>
          <li>
            <b>用 Context 当 Pinia 用</b>：高频变化的数据放 Context 会让所有消费者重渲染，改用外部 store + selector。
          </li>
          <li>
            <b>列表 key 用 index</b>：Vue 的 diff 也会用 key，但 React 里 key 直接决定组件实例的复用，出错表现更明显。
          </li>
          <li>
            <b>以为 render 执行了 DOM 就更新了</b>：React 分 render / reconcile / commit 三个阶段，render 次数多不等于 DOM 操作多，
            但 render 本身也有成本。
          </li>
        </ol>
      </Panel>

      <Panel title="给团队落地的一页纸">
        <ul className="checklist">
          <li>
            <b>先立规矩</b>：禁止直接改 state；禁止在 render 里做副作用；依赖数组由 ESLint 强制检查。
          </li>
          <li>
            <b>再给模板</b>：把「状态下沉 + children 插槽 + 路由懒加载」写进项目脚手架，好写法要成为默认写法。
          </li>
          <li>
            <b>最后立指标</b>：首屏 JS 体积上限、关键交互的 INP 目标值、长列表用虚拟化作为 CR 检查项。
          </li>
          <li>
            <b>善用工具</b>：React DevTools（看谁在渲染）、Vite 构建产物（看包体积）、why-did-you-render（看为什么渲染）。
          </li>
          <li>
            <b>关注 React Compiler</b>：它会把 memo / useMemo / useCallback 自动化，未来的 React 代码会更接近 Vue 的「不用操心」体验。
          </li>
        </ul>
      </Panel>
    </>
  )
}
