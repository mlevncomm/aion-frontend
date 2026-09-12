import { expect, test, type Page } from '@playwright/test';

const PUBLIC_URL = process.env.AION_TEST_URL ?? 'https://aion.wexon.dev';
const phoneViewports = [
  { width: 320, height: 568, name: '320x568' },
  { width: 360, height: 740, name: '360x740' },
  { width: 390, height: 844, name: '390x844' },
  { width: 430, height: 932, name: '430x932' },
];

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(metrics.html, `${label}: html overflow ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.body, `${label}: body overflow ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(metrics.viewport + 1);
}

async function authenticateFrontend(page: Page) {
  const controlKey = process.env.AION_CONTROL_KEY;
  if (controlKey) {
    const response = await page.request.post(`${PUBLIC_URL}/api/ui/session`, {
      data: { control_key: controlKey },
    });
    expect(response.ok(), 'backend UI session should authenticate').toBeTruthy();
  } else {
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
  }
  await page.addInitScript(() => {
    sessionStorage.setItem('aion-admin-session', 'active');
  });
}

async function selectSection(page: Page, id: string, mobile: boolean) {
  if (mobile) {
    await page.getByTestId('mobile-menu-button').click();
    await expect(page.getByTestId('assistant-sidebar')).toHaveClass(/is-mobile-open/);
  }
  await page.getByTestId(`sidebar-${id}-button`).click();
}

for (const viewport of phoneViewports) {
  test(`mobile responsive product flow ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto(`${PUBLIC_URL}/giris`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('login-card')).toBeVisible();
    await assertNoHorizontalOverflow(page, `${viewport.name} login`);

    const loginBox = await page.getByTestId('login-card').boundingBox();
    expect(loginBox).not.toBeNull();
    expect(loginBox!.x).toBeGreaterThanOrEqual(0);
    expect(loginBox!.x + loginBox!.width).toBeLessThanOrEqual(viewport.width + 1);

    await authenticateFrontend(page);
    await page.goto(PUBLIC_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('assistant-home-screen')).toBeVisible();
    await expect(page.getByTestId('mobile-topbar')).toBeVisible();
    await assertNoHorizontalOverflow(page, `${viewport.name} home`);

    const keyTouchTargets = [
      'mobile-menu-button',
      'mobile-new-chat-button',
      'voice-assistant-button',
      'voice-mute-button',
      'voice-chat-button',
      'global-chat-fab',
    ];
    for (const id of keyTouchTargets) {
      const locator = page.getByTestId(id);
      if (await locator.isVisible()) {
        const box = await locator.boundingBox();
        expect(box, `${viewport.name} ${id} has box`).not.toBeNull();
        expect(box!.height, `${viewport.name} ${id} touch height`).toBeGreaterThanOrEqual(40);
      }
    }

    for (const section of ['projects', 'tasks', 'inbox', 'library', 'automations', 'settings', 'profile']) {
      await selectSection(page, section, true);
      await expect(page.getByTestId('mobile-brand')).toBeVisible();
      await assertNoHorizontalOverflow(page, `${viewport.name} ${section}`);
    }

    await selectSection(page, 'settings', true);
    const themeButton = page.locator('.workspace-setting-card.is-button');
    await expect(themeButton).toBeVisible();
    await themeButton.click();
    await expect(page.getByTestId('theme-picker')).toBeVisible();
    await assertNoHorizontalOverflow(page, `${viewport.name} theme-picker`);
    const themeBox = await page.getByTestId('theme-picker').boundingBox();
    expect(themeBox).not.toBeNull();
    expect(themeBox!.x).toBeGreaterThanOrEqual(-1);
    expect(themeBox!.x + themeBox!.width).toBeLessThanOrEqual(viewport.width + 1);
    await page.getByTestId('theme-picker-close-button').click();

    await page.getByTestId('global-chat-fab').click();
    const chat = page.getByTestId('conversation-panel');
    await expect(chat).toBeVisible();
    await assertNoHorizontalOverflow(page, `${viewport.name} conversation`);
    const chatBox = await chat.boundingBox();
    expect(chatBox).not.toBeNull();
    expect(chatBox!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(chatBox!.height).toBeLessThanOrEqual(viewport.height + 1);
    await expect(page.getByTestId('chat-message-input')).toBeVisible();
    await expect(page.getByTestId('chat-send-button')).toBeVisible();
  });
}

test('tablet and desktop stay fluid without horizontal overflow', async ({ page }) => {
  await authenticateFrontend(page);
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(PUBLIC_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('assistant-home-screen')).toBeVisible();
    await assertNoHorizontalOverflow(page, `${viewport.width}x${viewport.height} home`);
    await page.getByTestId('sidebar-projects-button').click();
    await assertNoHorizontalOverflow(page, `${viewport.width}x${viewport.height} projects`);
    await page.getByTestId('sidebar-settings-button').click();
    await assertNoHorizontalOverflow(page, `${viewport.width}x${viewport.height} settings`);
    await page.getByTestId('global-chat-fab').click();
    await expect(page.getByTestId('conversation-panel')).toBeVisible();
    await assertNoHorizontalOverflow(page, `${viewport.width}x${viewport.height} conversation`);
    await page.getByTestId('conversation-close-button').click();
  }
});
