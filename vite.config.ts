import { defineConfig, loadEnv, type Plugin } from 'vite'
import { registrationApi } from './server/registration.mjs'
import { copy } from './src/content'
import { eventConfig } from './src/event.config'

function registrationPlugin(mode: string): Plugin {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  return {
    name: 'registration-api',
    configureServer(server) { server.middlewares.use(registrationApi(env)) },
    configurePreviewServer(server) { server.middlewares.use(registrationApi(env)) },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [registrationPlugin(mode), {
    name: 'event-metadata',
    transformIndexHtml() {
      const title = [eventConfig.name, eventConfig.venue].join(' · ')
      return [
        { tag: 'title', children: title.replaceAll('&', '&amp;').replaceAll('<', '&lt;') },
        { tag: 'meta', attrs: { property: 'og:title', content: copy.title } },
        { tag: 'meta', attrs: { property: 'og:description', content: copy.tagline } },
        { tag: 'meta', attrs: { property: 'og:image', content: '/media/trench-surface.jpg' } },
      ]
    },
  }],
}))
