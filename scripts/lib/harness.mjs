/**
 * Shared plumbing for the browser-based gates (check-pages, check-keyboard).
 *
 * Ported from RetroCSS, which runs the same two gates over its demo pages. The
 * difference is what gets served: there, a repo of hand-written HTML; here, the
 * exampleSite Hugo just built. The page list is therefore discovered rather
 * than hardcoded, so a new content file is covered the moment it exists.
 */
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, relative, sep } from 'node:path';
import process from 'node:process';

export const THEMES = ['light', 'dark'];

export const SITE_ROOT = join(process.cwd(), 'exampleSite', 'public');

/** Pages the first-paint check runs over — one of each layout is enough. */
export const FLASH_PAGES = ['index.html', 'posts/index.html', 'docs/shortcodes/index.html'];

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.map': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain',
};

/**
 * Every rendered page, as paths relative to the site root.
 *
 * Paginated duplicates (`/page/2/`) are skipped: they exercise the same
 * template as page one and would double the run for nothing.
 */
export async function discoverPages(root = SITE_ROOT) {
  if (!existsSync(root)) {
    console.error(`No built site at ${root}. Run \`npm run build\` first.`);
    process.exit(1);
  }
  const out = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith('.html')) {
        const rel = relative(root, full).split(sep).join('/');
        if (/\/page\/\d+\//.test(`/${rel}`)) continue;
        out.push(rel);
      }
    }
  };
  await walk(root);
  return out.sort();
}

/** Serve the built site on an ephemeral port. Returns { origin, close }. */
export async function serveSite(root = SITE_ROOT) {
  const server = createServer(async (req, res) => {
    // Strip the query and normalise before joining, so a request cannot walk
    // out of the site root.
    const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^[/\\]+/, '');
    const path = join(root, rel || 'index.html');
    if (!path.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(path);
      res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  const port = await new Promise((r) =>
    server.listen(0, '127.0.0.1', () => r(server.address().port)),
  );
  return { origin: `http://127.0.0.1:${port}`, close: () => server.close() };
}

/**
 * Prime the theme the way a returning visitor's localStorage would, so nothing
 * initialises against the wrong palette. addInitScript runs at document-start,
 * before the parser has created <html>, so documentElement is null on the first
 * tick — hence the DOMContentLoaded re-apply.
 */
export async function primeTheme(tab, theme) {
  await tab.addInitScript((t) => {
    try {
      localStorage.setItem('retro-theme', t);
    } catch {
      /* storage blocked; the attribute below still applies */
    }
    const apply = () => document.documentElement?.setAttribute('data-theme', t);
    apply();
    document.addEventListener('DOMContentLoaded', apply);
  }, theme);
}

/**
 * Freeze transitions and animations. Theme tokens are transitioned, and
 * getComputedStyle during a transition returns the *animating* value — which
 * reports a light-theme background on a page that is already dark. Measuring a
 * moving target is not a test.
 */
export async function freezeMotion(tab) {
  await tab.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
  });
}
