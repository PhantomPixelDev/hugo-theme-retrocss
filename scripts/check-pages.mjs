#!/usr/bin/env node
/**
 * Rendered-page gate for hugo-theme-retrocss.
 *
 * RetroCSS proves its *tokens* clear WCAG AA. That says nothing about what a
 * Hugo template does with them, so this renders the built exampleSite in real
 * Chromium and asserts the things templates actually break:
 *
 *   1. no console errors or page errors on load
 *   2. exactly one <h1> per page
 *   3. no horizontal overflow at 1200/980/760/420/360px
 *   4. every rendered text node clears WCAG AA against its painted backdrop
 *   5. the first paint is already the right theme, with the bundle blocked
 *
 * Exits non-zero on any failure. Requires `npm run build` first, and a browser
 * once: `npx playwright install chromium`.
 */
import { chromium } from 'playwright';
import process from 'node:process';
import {
  THEMES,
  FLASH_PAGES,
  discoverPages,
  serveSite,
  primeTheme,
  freezeMotion,
} from './lib/harness.mjs';

const WIDTHS = [1200, 980, 760, 420, 360];
// A few px of slop: sub-pixel layout rounding reports scrollWidth one greater
// than clientWidth on elements that are not actually overflowing.
const OVERFLOW_SLOP = 2;

const PAGES = await discoverPages();
const { origin, close: closeServer } = await serveSite();

/* ---------- in-page probe ---------- */
// Runs in the browser. One function, so a page is only walked once.
const probe = (slop) => {
  const out = { overflow: [], headings: 0, contrast: [] };

  const label = (el) => {
    const cls =
      typeof el.className === 'string' && el.className.trim()
        ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
        : '';
    return el.tagName.toLowerCase() + cls;
  };

  out.headings = document.querySelectorAll('h1').length;

  /* -- overflow -- */
  const docWidth = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > docWidth + slop) {
    // An element inside a scroll container cannot widen the document -- the
    // container clips it -- so blaming it hides the element that really is wide.
    const clipped = (el) => {
      for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
        if (getComputedStyle(n).overflowX !== 'visible') return true;
      }
      return false;
    };
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= docWidth + slop) continue;
      if (clipped(el)) continue;
      const p = el.parentElement;
      if (p && p !== document.body && p.getBoundingClientRect().right > docWidth + slop) continue;
      out.overflow.push({ sel: label(el), right: Math.round(r.right), limit: docWidth });
      if (out.overflow.length >= 8) break;
    }
    // A wide page with no attributable child still has to fail.
    if (!out.overflow.length) {
      out.overflow.push({
        sel: '(document)',
        right: document.documentElement.scrollWidth,
        limit: docWidth,
      });
    }
  }

  /* -- rendered contrast -- */
  const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
  const lum = (c) =>
    c
      .map((v) => v / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((a, v, i) => a + [0.2126, 0.7152, 0.0722][i] * v, 0);
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  // Walk up until something actually paints. A gradient paints but reports
  // `backgroundColor: transparent`, so read its stops and take the worst: text
  // has to clear AA across the whole run, not just at one end.
  const backdrop = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        const stops = [...cs.backgroundImage.matchAll(/rgba?\(([^)]+)\)/g)]
          .map((m) => m[1].split(',').map((v) => parseFloat(v)))
          // A stop that is mostly transparent lets the layer below through; it
          // is not the surface.
          .filter((c) => c.length >= 3 && (c[3] === undefined || c[3] > 0.5))
          .map((c) => c.slice(0, 3));
        if (stops.length) return stops;
      }
      const c = rgb(cs.backgroundColor);
      if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) return [c.slice(0, 3)];
    }
    return [[255, 255, 255]];
  };

  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.5) continue;
    // Outline text is legible through its stroke, not its fill.
    if (cs.webkitTextStrokeWidth && parseFloat(cs.webkitTextStrokeWidth) > 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    const fg = rgb(cs.color);
    if (fg[3] !== undefined && fg[3] < 0.5) continue;
    const size = parseFloat(cs.fontSize);
    const weight = +cs.fontWeight || 400;
    // WCAG "large text": >=24px, or >=18.66px when bold.
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const min = large ? 3.0 : 4.5;
    const got = Math.min(...backdrop(el).map((bg) => ratio(fg.slice(0, 3), bg)));
    if (got + 0.005 < min) {
      out.contrast.push({
        sel: label(el),
        text: n.nodeValue.trim().slice(0, 32),
        ratio: got.toFixed(2),
        min,
      });
      if (out.contrast.length >= 10) break;
    }
  }

  return out;
};

/* ---------- run ---------- */
const browser = await chromium.launch();
const failures = [];
let checks = 0;
const fail = (where, msg) => failures.push(`${where}\n      ${msg}`);

for (const page of PAGES) {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport: { width: WIDTHS[0], height: 900 } });
    const tab = await ctx.newPage();

    const errors = [];
    tab.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    tab.on('pageerror', (e) => errors.push(String(e)));

    await primeTheme(tab, theme);
    await tab.goto(`${origin}/${page}`, { waitUntil: 'load' });
    await freezeMotion(tab);
    await tab.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    // Let fonts settle: text metrics drive the overflow check.
    await tab.evaluate(() => document.fonts?.ready);

    for (const width of WIDTHS) {
      await tab.setViewportSize({ width, height: 900 });
      await tab.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );
      const r = await tab.evaluate(probe, OVERFLOW_SLOP);
      const where = `${page}  ${theme}  ${width}px`;
      checks += 1;

      for (const o of r.overflow) fail(where, `overflow: ${o.sel} right ${o.right} > ${o.limit}`);
      // Widths past the first only re-check layout; these are width-invariant.
      if (width === WIDTHS[0]) {
        if (r.headings !== 1) fail(where, `${r.headings} <h1> on the page, expected exactly 1`);
        for (const c of r.contrast) {
          fail(where, `contrast ${c.ratio}:1 (needs ${c.min}) on ${c.sel} "${c.text}"`);
        }
      }
    }

    if (errors.length) {
      fail(`${page}  ${theme}`, `console: ${[...new Set(errors)].slice(0, 4).join(' | ')}`);
    }
    await ctx.close();
  }
}

/* ---------- no theme flash ---------- */
// The inline <head> script and the stylesheet's prefers-color-scheme block are
// only worth anything if they work with the bundle absent -- which is exactly
// what the first paint looks like. So block the bundle and assert the colour.
const FLASH_CASES = [
  { os: 'dark', stored: null, want: 'dark' },
  { os: 'dark', stored: 'light', want: 'light' },
  { os: 'light', stored: 'dark', want: 'dark' },
  { os: 'light', stored: null, want: 'light' },
];

let flashPages = 0;
for (const page of FLASH_PAGES) {
  if (!PAGES.includes(page)) continue;
  flashPages += 1;
  for (const { os, stored, want } of FLASH_CASES) {
    const ctx = await browser.newContext({
      viewport: { width: 1200, height: 900 },
      colorScheme: os,
    });
    const tab = await ctx.newPage();
    if (stored) {
      await tab.addInitScript((t) => {
        try {
          localStorage.setItem('retro-theme', t);
        } catch {
          /* storage blocked */
        }
      }, stored);
    }
    // Never let the bundle load: this is the pre-script first paint.
    await tab.route('**/retro*.js', (r) => r.abort());
    await tab.goto(`${origin}/${page}`, { waitUntil: 'load' });

    const isDark = await tab.evaluate(() => {
      const bg = getComputedStyle(document.body).backgroundColor;
      const [r, g, b] = bg.match(/\d+/g).map(Number);
      // The light chassis is #c0c0c0 and the dark one #2b2b2b; anything below
      // mid-grey is the dark palette.
      return (r + g + b) / 3 < 128;
    });
    checks += 1;
    const got = isDark ? 'dark' : 'light';
    if (got !== want) {
      fail(
        `${page}  first paint  OS=${os} stored=${stored || 'none'}`,
        `painted ${got}, expected ${want} -- theme flash`,
      );
    }
    await ctx.close();
  }
}

await browser.close();
closeServer();

if (failures.length) {
  console.error(`\n✗ ${failures.length} page failure(s) across ${checks} checks:\n`);
  for (const f of failures) console.error(`    ${f}`);
  process.exit(1);
}
console.log(
  `✓ ${PAGES.length} pages x ${THEMES.length} themes x ${WIDTHS.length} widths, ` +
    `plus ${FLASH_CASES.length} first-paint cases on ${flashPages} pages: ${checks} checks clean`,
);
