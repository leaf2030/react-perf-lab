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
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
            return 'vendor-react'
          }
          if (id.includes('react-router')) return 'vendor-router'
          return 'vendor'
        },
      },
    },

    chunkSizeWarningLimit: 600,
  },
})
