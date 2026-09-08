#!/usr/bin/env node
/**
 * Keyboard-operability gate for hugo-theme-retrocss.
 *
 * check-pages measures rendered layout and colour. Neither it nor the framework
 * upstream can see whether a control a *template* emitted can be reached, which
 * is how a theme ships a nav, a tab strip or a rating widget that a mouse can
 * drive and a keyboard cannot. That is WCAG 2.1.1 (Keyboard), 1.4.13 (Content
 * on Hover or Focus) and 4.1.2 (Name, Role, Value).
 *
 * Exits non-zero on any failure. Requires `npm run build` first, and a browser
 * once: `npx playwright install chromium`.
 */
import { chromium } from 'playwright';
import process from 'node:process';
import { THEMES, discoverPages, serveSite, primeTheme, freezeMotion } from './lib/harness.mjs';

/**
 * Controls the framework drives from script, as the theme's templates and
 * shortcodes emit them. Each must be reachable by keyboard and carry an
 * accessible name.
 */
const CONTROLS = [
  { sel: '.retro-carousel-dot', name: true },
  { sel: '.retro-rating-star', name: true },
  { sel: '.retro-tag-remove', name: true },
  { sel: '.retro-accordion-toggle', name: true },
  { sel: '.retro-theme-toggle', name: true },
  { sel: '.retro-code-copy', name: true },
  { sel: '[data-retro-modal]', name: true },
  { sel: '[data-retro-toast]', name: true },
  // data-sort="none" is the documented opt-out for a column that should not
  // sort, so those headers are meant to stay out of the tab order.
  { sel: '.retro-table-sortable th[data-sort]:not([data-sort="none"])', name: true },
];

/** Groups that use a roving tabindex: exactly one member is in the tab order. */
const ROVING = ['[role="tablist"]', '[role="radiogroup"]'];

const FOCUSABLE =
  'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),' +
  'select:not([disabled]),textarea:not([disabled]),iframe,' +
  '[contenteditable]:not([contenteditable="false"]),[tabindex]:not([tabindex="-1"])';

const PAGES = await discoverPages();
const { origin, close: closeServer } = await serveSite();

/* ---------- in-page probe ---------- */
function auditPage({ controls, roving, focusable }) {
  const out = { unreachable: [], unnamed: [], roving: [], tooltip: [], skip: [] };

  const label = (el) => {
    const cls = [...el.classList].find((c) => c.startsWith('retro-'));
    return cls ? `.${cls}` : el.tagName.toLowerCase();
  };

  for (const { sel, name } of controls) {
    for (const el of document.querySelectorAll(sel)) {
      // Members of a roving-tabindex group are deliberately tabindex="-1": the
      // group holds one tab stop and arrow keys move within it.
      const roved = el.closest('[role="radiogroup"],[role="tablist"]');
      if (!roved && !el.matches(focusable)) out.unreachable.push(`${sel} -> ${label(el)}`);
      if (!name) continue;
      const named =
        el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') ||
        el.textContent.trim() ||
        el.getAttribute('title');
      if (!named) out.unnamed.push(`${sel} -> ${label(el)}`);
    }
  }

  for (const groupSel of roving) {
    for (const group of document.querySelectorAll(groupSel)) {
      const role = groupSel === '[role="tablist"]' ? 'tab' : 'radio';
      const items = [...group.querySelectorAll(`[role="${role}"]`)];
      if (items.length < 2) continue;
      const stops = items.filter((i) => i.tabIndex === 0).length;
      if (stops !== 1) {
        out.roving.push(`${groupSel} has ${stops} tab stops across ${items.length} ${role}s`);
      }
    }
  }

  // WCAG 1.4.13: anything revealed on hover must also appear on focus.
  for (const trigger of document.querySelectorAll('[data-retro-tooltip]')) {
    const bubble = trigger.querySelector('.retro-tooltip');
    if (!bubble) {
      out.tooltip.push(`${label(trigger)}: no tooltip element built`);
      continue;
    }
    if (!trigger.matches(focusable)) {
      out.tooltip.push(`${label(trigger)}: trigger not focusable`);
      continue;
    }
    trigger.focus();
    if (!bubble.classList.contains('show')) out.tooltip.push(`${label(trigger)}: hidden on focus`);
    trigger.blur();
    if (!trigger.getAttribute('aria-describedby')) {
      out.tooltip.push(`${label(trigger)}: no aria-describedby`);
    }
  }

  // Every form control needs an accessible name. A <label> with no `for`, next
  // to an <input> with no id, associates nothing.
  const FORM_SEL =
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]),select,textarea';
  for (const el of document.querySelectorAll(FORM_SEL)) {
    const named =
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      el.closest('label') ||
      (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) ||
      el.getAttribute('placeholder') ||
      el.getAttribute('title');
    if (!named) out.unnamed.push(`form control ${el.tagName.toLowerCase()}[type=${el.type || '-'}]`);
  }

  // The theme's own promise: a skip link that reaches the main landmark. It is
  // the first thing a keyboard user hits and the easiest thing to break by
  // renaming an id in baseof.
  const skip = document.querySelector('a[href^="#"].retro-sr-only-focusable');
  if (!skip) {
    out.skip.push('no skip link');
  } else if (!document.querySelector(skip.getAttribute('href'))) {
    out.skip.push(`skip link points at ${skip.getAttribute('href')}, which does not exist`);
  }

  return out;
}

/* ---------- run ---------- */
const browser = await chromium.launch();
const failures = [];
let checked = 0;

for (const page of PAGES) {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const tab = await ctx.newPage();
    await primeTheme(tab, theme);
    await tab.goto(`${origin}/${page}`, { waitUntil: 'load' });
    await freezeMotion(tab);

    const res = await tab.evaluate(auditPage, {
      controls: CONTROLS,
      roving: ROVING,
      focusable: FOCUSABLE,
    });
    checked += 1;

    const where = `${page} [${theme}]`;
    for (const m of res.unreachable) failures.push(`${where}  not reachable by keyboard: ${m}`);
    for (const m of res.unnamed) failures.push(`${where}  no accessible name: ${m}`);
    for (const m of res.roving) failures.push(`${where}  roving tabindex: ${m}`);
    for (const m of res.tooltip) failures.push(`${where}  tooltip: ${m}`);
    for (const m of res.skip) failures.push(`${where}  ${m}`);

    await ctx.close();
  }
}

await browser.close();
closeServer();

if (failures.length) {
  console.error(`\n✗ ${failures.length} keyboard failure(s) across ${checked} page/theme loads:`);
  for (const f of failures) console.error(`    ${f}`);
  console.error(
    '\n  Every control the framework drives from script must be reachable by\n' +
      '  keyboard and carry an accessible name. Give it a real <button>, or a\n' +
      '  role plus a tab stop plus Enter/Space handling.\n',
  );
  process.exit(1);
}

console.log(`✓ ${checked} page/theme loads: every control the theme emits is keyboard-operable`);
