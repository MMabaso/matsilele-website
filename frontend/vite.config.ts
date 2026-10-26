import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { projects } from './src/data/projects.ts'

// In dev, Django on :8000 serves the API, the admin login (used by /inbox) and its static files.
const django = 'http://127.0.0.1:8000'

// The site's public address: used for the canonical link, social previews, robots.txt and sitemap.xml.
const SITE_URL = 'https://matsilelemabaso.web.app'

/** Fills %SITE_URL% in index.html and writes robots.txt + sitemap.xml (pages and every project) into the build. */
function seo(): Plugin {
  const pages = ['/', '/about', '/projects', '/avatar', ...projects.map((p) => `/projects/${p.slug}`)]
  return {
    name: 'seo',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', SITE_URL),
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nDisallow: /admin/\nDisallow: /api/\nDisallow: /inbox\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
      })
      const urls = pages.map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), seo()],
  server: {
    proxy: {
      '/api': django,
      '/media': django,
      '/admin': django,
      '/static': django,
    },
  },
})
