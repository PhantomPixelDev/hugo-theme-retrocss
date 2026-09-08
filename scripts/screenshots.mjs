#!/usr/bin/env node
/**
 * Regenerates the images themes.gohugo.io lists the theme by.
 *
 * The gallery requires images/screenshot.png at 1500x1000 and images/tn.png at
 * 900x600, both of the *demo site*, not of a component sheet. Both are shot
 * from the built exampleSite so they cannot drift from what the theme renders.
 *
 * Run after `npm run build:test`: `node scripts/screenshots.mjs`.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { serveSite, primeTheme, freezeMotion } from './lib/harness.mjs';

const SHOTS = [
  { file: 'screenshot.png', width: 1500, height: 1000, page: '', theme: 'light' },
  { file: 'tn.png', width: 900, height: 600, page: '', theme: 'dark' },
];

const OUT = join(process.cwd(), 'images');
await mkdir(OUT, { recursive: true });

const { origin, close } = await serveSite();
const browser = await chromium.launch();

for (const shot of SHOTS) {
  const ctx = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 1,
  });
  const tab = await ctx.newPage();
  await primeTheme(tab, shot.theme);
  await tab.goto(`${origin}/${shot.page}`, { waitUntil: 'load' });
  await freezeMotion(tab);
  await tab.evaluate(() => document.fonts?.ready);
  await tab.screenshot({ path: join(OUT, shot.file) });
  console.log(`wrote images/${shot.file} (${shot.width}x${shot.height}, ${shot.theme})`);
  await ctx.close();
}

await browser.close();
close();
