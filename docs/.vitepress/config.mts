import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "YouTube Downloader",
  description: "A simple YouTube downloader web app",
  base: '/youtube-downloader-web/',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
    ],

    sidebar: [],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/allifiz/youtube-downloader-web' }
    ]
  }
})
