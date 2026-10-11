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
        <p>
          1. React 的性能问题，90% 是「不必要的重渲染」；<br />
          2. 优化前先度量，React DevTools 的 Profiler 是唯一权威；<br />
          3. React.memo / useMemo / useCallback 不是万能的，它们本身也有成本。
        </p>
      </div>

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
    </>
  )
}
