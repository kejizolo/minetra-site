// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  devToolbar: {
    enabled: false
  },
  output: 'server',
  adapter: cloudflare({
    // 禁用 Cloudflare Images 和 Sessions，避免配置冲突
    imageService: 'passthrough',
  }),
});
