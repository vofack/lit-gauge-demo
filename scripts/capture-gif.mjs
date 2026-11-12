// Records docs/gauge.gif: serves index.html with Vite, drives the three gauges frame by frame
// in Chrome (playwright-core, no browser download), then encodes the frames with gifenc.
// Usage: npm run capture
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import gifenc from 'gifenc'; // CommonJS package: default import, then destructure

const { GIFEncoder, quantize, applyPalette } = gifenc;

const FRAMES_UP = 36;
const FRAME_MS = 50;
const HOLD_MS = 1400;
const OUT = 'docs/gauge.gif';

const server = await createServer({ logLevel: 'error', server: { port: 5199, strictPort: false } });
await server.listen();
const url = server.resolvedUrls.local[0];

const home = process.env.CHROME_HOME;
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }),
  args: ['--disable-gpu', '--no-first-run', '--no-default-browser-check'],
  ...(home ? { env: { ...process.env, HOME: home, CFFIXED_USER_HOME: home } } : {}),
});

try {
  const page = await browser.newPage({ viewport: { width: 760, height: 520 }, colorScheme: 'light', deviceScaleFactor: 1 });
  await page.goto(url);
  await page.waitForFunction(() => customElements.get('ui-gauge') !== undefined);
  // Frames are set explicitly: turn off the CSS transition so each frame is exact.
  await page.addStyleTag({ content: '#showcase { --ui-gauge-transition: none; } label, input, h1 { display: none; }' });
  const showcase = page.locator('#showcase');

  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const steps = [...Array(FRAMES_UP + 1).keys()].map((i) => ease(i / FRAMES_UP));
  const timeline = [...steps, ...steps.slice().reverse()];

  const frames = [];
  for (const [i, t] of timeline.entries()) {
    await page.evaluate(async (t) => {
      const [cpu, temp, battery] = ['cpu', 'temp', 'battery'].map((id) => document.getElementById(id));
      cpu.value = Math.round(8 + 89 * t);
      temp.value = Math.round(42 + 74 * t);
      battery.value = Math.round(92 - 85 * t);
      await Promise.all([cpu.updateComplete, temp.updateComplete, battery.updateComplete]);
    }, t);
    const png = PNG.sync.read(await showcase.screenshot());
    const hold = i === FRAMES_UP || i === timeline.length - 1;
    frames.push({ png, delay: hold ? HOLD_MS : FRAME_MS });
  }

  const { width, height } = frames[0].png;
  const gif = GIFEncoder();
  for (const { png, delay } of frames) {
    const palette = quantize(png.data, 256);
    gif.writeFrame(applyPalette(png.data, palette), width, height, { palette, delay });
  }
  gif.finish();
  await mkdir('docs', { recursive: true });
  await writeFile(OUT, gif.bytes());
  console.log(`${OUT}: ${frames.length} frames, ${width}×${height}, ${(gif.bytes().length / 1024).toFixed(0)} KB`);
} finally {
  await browser.close();
  await server.close();
}
