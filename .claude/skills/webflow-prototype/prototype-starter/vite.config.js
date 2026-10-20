import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = import.meta.dirname;

// Pages, at the URLs they will have in Webflow (folder/index.html). A CMS
// template is built static from one real item, e.g.
// 'work/example-item/index.html'.
const pages = {
  home: 'index.html',
  styleGuide: 'design/style-guide/index.html',
};

// <!-- @include partials/nav.html --> → that file's markup. Nav and Footer
// are one Webflow Component each; here they are one file each.
const includes = () => ({
  name: 'html-includes',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) =>
      html.replace(/<!-- @include ([\w/.-]+) -->/g, (_, file) => readFileSync(resolve(root, file), 'utf8')),
  },
});

// Webflow URLs have no trailing slash: serve /about from about/index.html.
const cleanUrls = () => ({
  name: 'clean-urls',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [path, query = ''] = req.url.split('?');
      if (path !== '/' && !path.includes('.') && existsSync(resolve(root, `.${path}/index.html`))) {
        req.url = `${path.replace(/\/$/, '')}/index.html${query ? `?${query}` : ''}`;
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [includes(), cleanUrls()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, resolve(root, v)])),
    },
  },
});
