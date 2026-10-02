import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import Home from './pages/Home'

/*
 * 路由级代码分割：除了首页，其余章节都通过 React.lazy 按需加载。
 * 打开 DevTools 的 Network 面板，切换左侧章节就能看到对应的 chunk 被单独拉取。
 */
const RerenderPage = lazy(() => import('./pages/RerenderPage'))
const MemoPage = lazy(() => import('./pages/MemoPage'))
const StructurePage = lazy(() => import('./pages/StructurePage'))
const ContextPage = lazy(() => import('./pages/ContextPage'))
const ListPage = lazy(() => import('./pages/ListPage'))
const SplitPage = lazy(() => import('./pages/SplitPage'))
const ConcurrentPage = lazy(() => import('./pages/ConcurrentPage'))
const ProfilerPage = lazy(() => import('./pages/ProfilerPage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const React19Page = lazy(() => import('./pages/React19Page'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="rerender" element={<RerenderPage />} />
        <Route path="memo" element={<MemoPage />} />
        <Route path="structure" element={<StructurePage />} />
        <Route path="context" element={<ContextPage />} />
        <Route path="list" element={<ListPage />} />
        <Route path="split" element={<SplitPage />} />
        <Route path="concurrent" element={<ConcurrentPage />} />
        <Route path="profiler" element={<ProfilerPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="react19" element={<React19Page />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
