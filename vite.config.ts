import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    /*
     * 手动分包：把「不常变的第三方库」和「经常改的业务代码」拆开。
     *
     * 第 06 章讲的就是按需加载，如果产物里 React + Router 和业务代码
     * 全糊在一个 270KB 的 chunk 里，现场打开 Network 面板会很尴尬。
     *
     * 拆分的收益不只是"看着好看"：
     *   - vendor chunk 带 contenthash，业务代码改动后它不会失效，浏览器缓存能长期命中
     *   - 首屏只需要拉 vendor + Layout，各章节页面全部按需
     */
    rollupOptions: {
      // Vite 8 (rolldown) 下 manualChunks 的函数写法会把 react-dom 混进 antd 包，
      // 用 advancedChunks 按顺序显式分组：先匹配的先赢，分包结果可预期。
      advancedChunks: {
        groups: [
          { name: 'vendor-react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          { name: 'vendor-router', test: /[\\/]node_modules[\\/]react-router/ },
          {
            name: 'vendor-antd',
            test: /[\\/]node_modules[\\/](antd|@ant-design|@rc-component|rc-[a-z-]+)[\\/]/,
          },
        ],
      },
    },

    chunkSizeWarningLimit: 600,
  },
})
