import { Link } from 'react-router-dom'
import { CodeBlock } from '../components/CodeBlock'
import { FiberTreeDiagram } from '../components/FiberTreeDiagram'
import { PageHeader, Panel } from '../components/PageHeader'

const CHAPTERS = [
  {
    to: '/rerender',
    index: '01',
    title: '重渲染机制 & React.memo',
    desc: '谁在重渲染、React.memo 什么时候没用、children 插槽为什么快、key 的威力',
  },
  {
    to: '/memo',
    index: '02',
    title: 'useMemo / useCallback',
    desc: '缓存该缓存的：昂贵计算的记忆化、引用稳定性、依赖数组的坑与反模式',
  },
  {
    to: '/structure',
    index: '03',
    title: '组件结构与状态设计',
    desc: '状态下沉、key 的正确使用、批量更新、避免冗余 state —— 顺带讲清 useReducer 和 useRef 的性能用法',
  },
  {
    to: '/context',
    index: '04',
    title: 'Context 的性能陷阱',
    desc: '一个 Provider 拖垮整棵树？拆分 Context、selector 订阅、外部 store',
  },
  {
    to: '/list',
    index: '05',
    title: '长列表虚拟化',
    desc: '10000 行只渲染 12 个 DOM 节点，手写一个虚拟滚动 Hook',
  },
  {
    to: '/split',
    index: '06',
    title: '代码分割与懒加载',
    desc: 'React.lazy + Suspense、路由分包、预加载、骨架屏与错误边界',
  },
  {
    to: '/concurrent',
    index: '07',
    title: '并发渲染特性',
    desc: 'useTransition / useDeferredValue 让「卡顿」变成「稍等」，外加两个决定会不会闪的时机类 API',
  },
  {
    to: '/profiler',
    index: '08',
    title: '用 Profiler 量化性能',
    desc: 'React DevTools Profiler 火焰图 + 代码里的 <Profiler> 埋点，拿数据说话',
  },
  {
    to: '/compare',
    index: '09',
    title: 'Vue ↔ React 性能对照',
    desc: '给 Vue 团队的心智模型迁移指南：响应式 vs 组件级调度',
  },
  {
    to: '/react19',
    index: '10',
    title: 'React 19 性能新特性',
    desc: 'useOptimistic 感知性能、<Activity>（KeepAlive 的对应物）、React Compiler 对手写 memo 的影响',
  },
]

export default function Home() {
  return (
    <>
      <PageHeader
        index="00"
        title="React 性能优化实战"
        subtitle="从一个 Vue 工程师的视角出发，把 React 的性能问题拆成「渲染 / 数据 / 加载 / 度量」四条线，每一条线都配一个可以现场跑起来的 Demo。"
        tags={['React 19', 'Vite', 'TypeScript', '面向 Vue 团队']}
      />

      <Panel title="先建立一张图：一次 state 变化，React 到底做了什么">
        <FiberTreeDiagram />
      </Panel>

      <div className="hero">
        <h1>开场三句话</h1>
        <p>
          1. React 的性能问题，90% 是「不必要的重渲染」；<br />
          2. 优化前先度量，React DevTools 的 Profiler 是唯一权威；<br />
          3. React.memo / useMemo / useCallback 不是银弹，它们本身也有成本。
        </p>
        <div className="hero__badges">
          <span className="tag tag--soft">左侧目录 = 分享大纲</span>
          <span className="tag tag--soft">顶栏可放大「模拟耗时」制造卡顿</span>
          <span className="tag tag--soft">每个 Demo 都有「讲解要点」</span>
        </div>
      </div>

      <Panel title="分享流程建议（约 75 分钟）">
        <ol className="steps">
          <li>开场 3 分钟：用一个「输入框卡顿」的现场演示建立共鸣 —— 第 01 章。</li>
          <li>渲染层 25 分钟：memo / useMemo / useCallback / 组件结构，这是 React 性能的主战场。</li>
          <li>数据层 15 分钟：Context 陷阱 + 长列表虚拟化，对应 Vue 里的 provide/inject 与虚拟滚动。</li>
          <li>加载与并发 12 分钟：代码分割 + 并发特性，外加 useLayoutEffect / flushSync 两个时机类 API。</li>
          <li>度量与迁移 10 分钟：Profiler 度量方法论 + Vue ↔ React 对照表 + 落地 checklist。</li>
          <li>前瞻 10 分钟：React 19 新特性与 React Compiler —— 顺带更正第 09 章关于 KeepAlive 的结论。</li>
        </ol>
      </Panel>

      <Panel title="演示前的准备工作">
        <ul className="checklist">
          <li>
            安装 <b>React Developer Tools</b> 浏览器扩展，打开 <b>Profiler</b> 面板，勾选{' '}
            <span className="kbd">Highlight updates when components render</span>
            —— 重渲染的组件会出现彩色描边，非常直观。
          </li>
          <li>
            打开 <b>Components</b> 面板，勾选 <span className="kbd">Highlight updates</span>，逐层查看 props 变化。
          </li>
          <li>
            建议用 <b>生产构建</b>（<span className="kbd">npm run build</span> + <span className="kbd">npm run preview</span>
            ）演示卡顿，开发环境因为有 StrictMode 双渲染和额外检查，数据会被放大。
          </li>
          <li>
            演示时把顶栏的「模拟单次渲染耗时」调到 <b>6~10ms</b>，投影上才看得出区别。
          </li>
        </ul>
      </Panel>

      <Panel title="目录">
        <div className="toc">
          {CHAPTERS.map((chapter) => (
            <Link className="toc__item" to={chapter.to} key={chapter.to}>
              <span className="toc__index">CHAPTER {chapter.index}</span>
              <span className="toc__title">{chapter.title}</span>
              <span className="toc__desc">{chapter.desc}</span>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel title="本项目怎么跑起来">
        <CodeBlock
          title="终端"
          code={`npm install
npm run dev      # 开发环境：http://localhost:5173

npm run build    # 生产构建，用来看真实性能与分包体积
npm run preview  # 预览生产构建`}
        />
      </Panel>

      <Panel title="阅读代码的顺序（如果你想顺着源码讲）">
        <ul className="checklist">
          <li>
            <code>src/lib/</code>：perf.ts（模拟耗时）、settings.ts（外部 store + useSyncExternalStore）、
            useRenderCount.ts（渲染计数）、miniStore.ts（极简状态库）
          </li>
          <li>
            <code>src/components/</code>：RenderBadge（渲染次数徽章）、HeavyBox（昂贵组件）、Layout（外壳与全局开关）
          </li>
          <li>
            <code>src/pages/</code>：一个章节一个文件，从上往下读就是分享顺序
          </li>
        </ul>
      </Panel>
    </>
  )
}
