import { Suspense, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { perfSettings, useEpoch, useHeavyMs, useShowBadges } from '../lib/settings'

type NavItem = { to: string; label: string }

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: '开场',
    items: [{ to: '/', label: '总览 & 大纲' }],
  },
  {
    group: '一、渲染机制',
    items: [
      { to: '/rerender', label: '① 重渲染与 React.memo' },
      { to: '/memo', label: '② useMemo / useCallback' },
      { to: '/structure', label: '③ 组件结构与状态设计' },
    ],
  },
  {
    group: '二、数据与渲染',
    items: [
      { to: '/context', label: '④ Context 性能陷阱' },
      { to: '/list', label: '⑤ 长列表虚拟化' },
    ],
  },
  {
    group: '三、加载与并发',
    items: [
      { to: '/split', label: '⑥ 代码分割与懒加载' },
      { to: '/concurrent', label: '⑦ 并发渲染特性' },
    ],
  },
  {
    group: '四、度量与迁移',
    items: [
      { to: '/profiler', label: '⑧ 用 Profiler 量化性能' },
      { to: '/compare', label: '⑨ Vue ↔ React 对照' },
    ],
  },
]

export function Layout() {
  const location = useLocation()
  const epoch = useEpoch()
  const heavyMs = useHeavyMs()
  const showBadges = useShowBadges()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="app">
      <aside className="app__side">
        <div className="brand">
          <span className="brand__dot" />
          <div>
            <strong>React 性能优化实战</strong>
            <small>给 Vue 团队的 React 性能课</small>
          </div>
        </div>

        <nav className="nav">
          {NAV_GROUPS.map((group) => (
            <div className="nav__group" key={group.group}>
              <span className="nav__group-title">{group.group}</span>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => (isActive ? 'nav__link is-active' : 'nav__link')}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="side-foot">
          <span>React 19 · Vite · TypeScript</span>
        </div>
      </aside>

      <div className="app__content">
        <header className="topbar">
          <div className="topbar__slider">
            <label htmlFor="heavy-ms">
              模拟单次渲染耗时
              <b>{heavyMs} ms</b>
            </label>
            <input
              id="heavy-ms"
              type="range"
              min={0}
              max={40}
              step={1}
              value={heavyMs}
              onChange={(event) => perfSettings.set({ heavyMs: Number(event.target.value) })}
            />
            <span className="topbar__hint">拖动后，下一次渲染生效</span>
          </div>

          <div className="topbar__actions">
            <label className="switch">
              <input
                type="checkbox"
                checked={showBadges}
                onChange={(event) => perfSettings.set({ showBadges: event.target.checked })}
              />
              <span>渲染徽章</span>
            </label>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => perfSettings.set({ epoch: epoch + 1 })}
              title="通过改变 key 让整个页面重新挂载，从而把所有渲染计数清零"
            >
              ↻ 重置计数
            </button>
          </div>
        </header>

        <main className="app__main" ref={mainRef}>
          {/* key={epoch} 的变化会强制整棵子树重新挂载 —— 这也是"用 key 重置组件状态"的经典用法 */}
          <div className="page" key={epoch}>
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}

function RouteFallback() {
  return (
    <div className="route-fallback">
      <div className="spinner" />
      <p>正在加载路由分包…</p>
      <small>这段界面由 React.lazy + Suspense 提供，见「代码分割」章节</small>
    </div>
  )
}
