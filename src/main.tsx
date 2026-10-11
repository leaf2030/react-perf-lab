import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

/*
 * 已移除 <StrictMode>：
 * 开发环境 StrictMode 会让渲染函数执行两次（用于暴露副作用），
 * 渲染计数徽章会因此翻倍。这里需要「一次渲染 = +1」的真实读数，
 * 所以不包 StrictMode。
 */
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
