// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  devToolbar: {
    enabled: false
  },
  // 使用静态模式，避免 Cloudflare Pages 配置冲突
  output: 'static',
});
