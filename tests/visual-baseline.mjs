/**
 * Render the built app at every acceptance width and view, one PNG per screen.
 *
 * Automated assertions do not notice a stylesheet that lost a rule: the page
 * still mounts, the test ids are still there, and the layout is quietly wrong.
 * Capturing a known-good build and the candidate, then diffing the images, is
 * what makes a CSS reduction provable. Compare two runs with any image differ;
 * a same-build-twice run measures the noise floor the orb animation produces
 * (about 1.6% at the time of writing), and anything at or below that is noise.
 *
 *   node visual-baseline.mjs <output-dir>     # PORT selects the preview server
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const WIDTHS = [320, 360, 390, 430, 768, 1024, 1440];
const VIEWS = ['home', 'projects', 'tasks', 'inbox', 'devices', 'automations', 'library', 'settings'];

// Synthetic but structurally real: the views must render their cards, counters
// and lists, otherwise a lost grid rule has nothing to show up in.
const status = {
  observed_at: Date.now(), stale: false, alerts: ['Uyarı bir', 'Uyarı iki'], observed_changes: [],
  metrics: { tracked_projects: 5, attention_items: 2, open_internal_tasks: 3, active_services: 4, total_services: 4, blocked_integrations: 3, repository_work_items: 3, recent_system_changes: 1 },
  today: { priorities: ['AION: PDF doğrula', 'WEXON: platformu incele'] },
  internal_tasks: [{ id: 't1', project: 'aion', title: 'PDF doğrula', priority: 'high', status: 'pending' }],
  tasks: [], projects: [{ id: 'aion', name: 'AION', status: 'CONNECTED', description: 'AI OS', sources: { github: {} }, application: { checks: {} } }],
};

const OUT = process.argv[2];
if (!OUT) {
  console.error('usage: node visual-baseline.mjs <output-dir>');
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
const port = Number(process.env.PORT || 4190);
const browser = await chromium.launch();

async function shoot(view, width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route('**/api/aion/status', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(status) }));
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.addInitScript(() => sessionStorage.setItem('aion-admin-session', 'active'));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  if (width < 768) {
    const menu = page.getByTestId('mobile-menu-button');
    if (await menu.count()) { await menu.first().click(); await page.waitForTimeout(400); }
  }
  if (view !== 'home') {
    const button = page.getByTestId(`sidebar-${view}-button`);
    if (await button.count()) {
      await button.first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await button.first().click();
      await page.waitForTimeout(700);
    }
  }
  await page.waitForTimeout(400);
  const shot = await page.screenshot({ fullPage: false });
  await ctx.close();
  return shot;
}

let captured = 0;
for (const width of WIDTHS) {
  for (const view of VIEWS) {
    fs.writeFileSync(`${OUT}/${width}-${view}.png`, await shoot(view, width));
    captured += 1;
  }
}
await browser.close();
console.log(`captured ${captured} screens across ${WIDTHS.length} widths x ${VIEWS.length} views`);
