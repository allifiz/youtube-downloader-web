import DefaultTheme from 'vitepress/theme'
import YoutubeDownloader from '../../components/YoutubeDownloader.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('YoutubeDownloader', YoutubeDownloader)
  }
}
