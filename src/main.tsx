import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

/*
 * 这里刻意保留 StrictMode：
 *  - 开发环境它会让组件渲染两次，用来暴露副作用问题（页面上看到计数偏大不要慌）
 *  - 演示"渲染次数"时记得先说明这一点
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
