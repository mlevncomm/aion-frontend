import { expect, test, type Page } from '@playwright/test';

const PUBLIC_URL = process.env.AION_TEST_URL ?? 'https://aion.wexon.dev';

async function authenticate(page: Page) {
  const controlKey = process.env.AION_CONTROL_KEY;
  if (controlKey) {
    const response = await page.request.post(`${PUBLIC_URL}/api/ui/session`, {
      data: { control_key: controlKey },
    });
    expect(response.ok()).toBeTruthy();
  } else {
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
  }
  await page.addInitScript(() => sessionStorage.setItem('aion-admin-session', 'active'));
}

async function mockProductData(page: Page) {
  await page.route('**/api/aion/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        observed_at: Date.now(),
        stale: false,
        alerts: ['Test uyarısı', 'İkinci test uyarısı'],
        projects: [
          { id: 'aion', name: 'AION', status: 'CONNECTED', description: 'Kişisel AI OS', sources: { github: {} }, application: { checks: {} } },
          { id: 'wexon', name: 'WEXON', status: 'REACHABLE', description: 'WEXON platform', sources: { github: {} }, application: { checks: {} } },
          { id: 'trade', name: 'AION Trade', status: 'WARNING', description: 'Trade sistemi', sources: { github: {} }, application: { checks: {} } },
        ],
      }),
    });
  });
  await page.route('**/api/aion/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ provider: 'OpenRouter', model: 'test-model', approvals: 'ask', daily_brief: 'active', voice: 'Türkçe', trade: 'PAPER' }),
    });
  });
  await page.route('**/api/agent-chat/sessions?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sessions: [] }) });
  });
  await page.route('**/api/agent-chat/sessions', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ session_id: 'test-session', title: 'AION', provider: 'openrouter', model: 'test-model', running: false }),
      });
      return;
    }
    await route.continue();
  });
  await page.route('**/api/agent-chat/sessions/test-session/messages', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ turn_id: 'turn-1', session_id: 'test-session' }) });
  });
  await page.route('**/api/agent-chat/sessions/test-session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session: { session_id: 'test-session', title: 'AION', provider: 'openrouter', model: 'test-model', running: false },
        events: [
          { seq: 1, ts_ms: Date.now(), kind: 'assistant_text', payload: { turn_id: 'turn-1', text: 'VPS test yanıtı hazır.' } },
          { seq: 2, ts_ms: Date.now(), kind: 'turn_finished', payload: { turn_id: 'turn-1', status: 'done' } },
        ],
      }),
    });
  });
  await page.route('**/api/aion/tts', async (route) => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'test tts disabled' }) });
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    width: window.innerWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(metrics.html).toBeLessThanOrEqual(metrics.width + 1);
  expect(metrics.body).toBeLessThanOrEqual(metrics.width + 1);
}

test('desktop navigation, actions and live chat are functional', async ({ page }) => {
  await authenticate(page);
  await mockProductData(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PUBLIC_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('assistant-home-screen')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await expect(page.getByTestId('sidebar-home-button')).toHaveClass(/is-active/);
  await expect(page.getByTestId('sidebar-chat-button')).toBeVisible();
  await expect(page.getByTestId('sidebar-new-chat-button')).toBeVisible();

  const sections = [
    ['projects', 'Projeler'],
    ['inbox', 'Gelen Kutusu'],
    ['library', 'Geçmiş'],
    ['automations', 'Otomasyonlar'],
  ] as const;
  for (const [id, title] of sections) {
    const button = page.getByTestId(`sidebar-${id}-button`);
    await button.click();
    await expect(button).toHaveClass(/is-active/);
    await expect(page.locator('.workspace-view h1')).toHaveText(title);
    await expectNoHorizontalOverflow(page);
  }

  await page.getByTestId('sidebar-settings-button').click();
  await expect(page.getByTestId('sidebar-settings-button')).toHaveClass(/is-active/);
  await expect(page.locator('.workspace-view h1')).toHaveText('Ayarlar');
  await page.locator('.workspace-setting-card.is-button').click();
  await expect(page.getByTestId('theme-picker')).toBeVisible();
  await expect(page.getByTestId('theme-option-reference-label')).toHaveText('AION Pearl');
  await page.getByTestId('theme-option-reference').click();
  await page.getByTestId('theme-picker-close-button').click();

  await page.getByTestId('sidebar-profile-button').click();
  await expect(page.getByTestId('sidebar-profile-button')).toHaveClass(/is-active/);
  await expect(page.locator('.workspace-view h1')).toHaveText('Profil');

  await page.getByTestId('sidebar-chat-button').click();
  await expect(page.getByTestId('conversation-panel')).toBeVisible();
  await expect(page.getByTestId('sidebar-chat-button')).toHaveClass(/is-active/);
  await page.getByTestId('conversation-close-button').click();

  await page.getByTestId('sidebar-new-chat-button').click();
  await expect(page.getByTestId('conversation-panel')).toBeVisible();
  await page.getByTestId('conversation-close-button').click();

  await page.getByTestId('sidebar-home-button').click();
  await expect(page.getByTestId('quick-action-vps')).toBeVisible();
  const initialAssistantCount = await page.locator('.conversation-message.is-assistant').count();
  await page.getByTestId('quick-action-vps').click();
  await expect(page.getByTestId('conversation-panel')).toBeVisible();
  await expect(page.getByTestId('sent-message-preview')).toContainText('VPS');
  await expect.poll(async () => page.locator('.conversation-message.is-assistant').count(), { timeout: 60_000 }).toBeGreaterThan(initialAssistantCount);

  await page.getByTestId('conversation-close-button').click();
  await expectNoHorizontalOverflow(page);
});

test('mobile drawer, sections and full-screen chat stay usable', async ({ page }) => {
  await authenticate(page);
  await mockProductData(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PUBLIC_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('mobile-topbar')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const sections = ['projects', 'inbox', 'library', 'automations'] as const;
  for (const id of sections) {
    await page.getByTestId('mobile-menu-button').click();
    await expect(page.getByTestId('assistant-sidebar')).toHaveClass(/is-mobile-open/);
    await page.getByTestId(`sidebar-${id}-button`).click();
    await expect(page.getByTestId('assistant-sidebar')).not.toHaveClass(/is-mobile-open/);
    await expectNoHorizontalOverflow(page);
  }

  await page.getByTestId('mobile-menu-button').click();
  await page.getByTestId('sidebar-settings-button').click();
  await page.locator('.workspace-setting-card.is-button').click();
  const theme = page.getByTestId('theme-picker');
  await expect(theme).toBeVisible();
  const themeBox = await theme.boundingBox();
  expect(themeBox).not.toBeNull();
  expect(themeBox!.width).toBeLessThanOrEqual(390 + 1);
  await page.getByTestId('theme-picker-close-button').click();

  await page.getByTestId('global-chat-fab').click();
  const chat = page.getByTestId('conversation-panel');
  await expect(chat).toBeVisible();
  const chatBox = await chat.boundingBox();
  expect(chatBox).not.toBeNull();
  expect(chatBox!.width).toBeLessThanOrEqual(390 + 1);
  expect(chatBox!.height).toBeLessThanOrEqual(844 + 1);
  await expect(page.getByTestId('chat-message-input')).toBeVisible();
  await expect(page.getByTestId('chat-send-button')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
