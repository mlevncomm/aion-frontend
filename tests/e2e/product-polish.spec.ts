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
        observed_changes: [{ kind: 'public_probe', resource: 'wexon/platform_web', summary: 'wexon/platform_web: public uygulama durumu değişti.', from: ['NOT_FOUND', 404], to: ['REACHABLE', 200], observed_at: Date.now() }],
        metrics: { tracked_projects: 3, attention_items: 2, open_internal_tasks: 1, active_services: 4, total_services: 4, blocked_integrations: 2, repository_work_items: 3, recent_system_changes: 1 },
        today: { priorities: ['AION: PDF sözleşmesini doğrula', 'WEXON: platform durumunu incele', 'AION Trade: API health kontrolü'] },
        internal_tasks: [{ id: 'task-1', project: 'aion', title: 'PDF sözleşmesini doğrula', priority: 'high', status: 'pending' }],
        tasks: [{ kind: 'internal_task', id: 'task-1' }, { kind: 'issue', repository: 'mlevncomm/aion' }],
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
  await page.route('**/api/aion/integrations', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        vercel: { status: 'BLOCKED_CONNECTION', configured: false },
        supabase: { status: 'BLOCKED_CONNECTION', configured: false },
        elevenlabs: { status: 'BLOCKED_CONNECTION', configured: false },
        aion_trade: { status: 'BLOCKED_CONNECTION', configured: false },
      }),
    });
  });
  await page.route('**/api/aion/integrations/*', async (route) => {
    const provider = route.request().url().split('/').at(-1) ?? 'unknown';
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ provider, saved: true, status: 'CONNECTED' }) });
      return;
    }
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ provider, configured: false, status: 'BLOCKED_CONNECTION' }) });
      return;
    }
    await route.fallback();
  });
  await page.route('**/api/aion/oauth-clients', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        callback_url: 'https://aion.wexon.dev/api/marketplace/oauth/callback',
        families: {
          google: { configured: false, secret_configured: false },
          github: { configured: true, secret_configured: false },
        },
      }),
    });
  });
  await page.route('**/api/aion/oauth-clients/*', async (route) => {
    const family = route.request().url().split('/').at(-1) ?? 'unknown';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ family, configured: route.request().method() !== 'DELETE', secret_configured: false }),
    });
  });
  await page.route('**/api/aion/devices', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pairing_id: 'pair-1', pairing_token: 'synthetic-pair-token-abcdefghijklmnopqrstuvwxyz', expires_at: Date.now() / 1000 + 600, expires_in_seconds: 600 }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [{ id: 'device-1', name: 'Mehmet-PC', platform: 'windows', capabilities: ['open_url', 'open_app', 'notify'], permissions: { open_url: true, open_app: false, notify: true }, status: 'ONLINE', created_at: Date.now() / 1000, last_seen: Date.now() / 1000 }] }),
    });
  });
  await page.route('**/api/aion/devices/pairing', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pairing_id: 'pair-1', pairing_token: 'synthetic-pair-token-abcdefghijklmnopqrstuvwxyz', expires_at: Date.now() / 1000 + 600, expires_in_seconds: 600 }) });
  });
  await page.route('**/api/aion/devices/*/permissions', async (route) => {
    const body = route.request().postDataJSON() as { permissions?: Record<string, boolean> };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'device-1', name: 'Mehmet-PC', platform: 'windows', capabilities: ['open_url', 'open_app', 'notify'], permissions: { open_url: true, open_app: Boolean(body.permissions?.open_app), notify: true }, status: 'ONLINE' }) });
  });
  await page.route('**/api/aion/devices/commands**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [
        { id: 'cmd-1', device_id: 'device-1', command: 'notify', args: { text: 'AION test bildirimi' }, status: 'done', created_at: Date.now() / 1000, finished_at: Date.now() / 1000, result: 'ok' },
        { id: 'cmd-2', device_id: 'device-1', command: 'open_url', args: { url: 'https://aion.wexon.dev' }, status: 'error', created_at: Date.now() / 1000, finished_at: Date.now() / 1000, result: 'Tarayıcı açılamadı' },
      ] }),
    });
  });
  await page.route('**/api/aion/devices/*/commands/notify', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'command-1', status: 'queued' }) });
  });
  await page.route('**/api/aion/readiness', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        contract: 'JARVIS Kurulum Dosyası / AION kişisel AI OS',
        state: 'READY_WITH_OWNER_ACTIONS',
        connected_accounts: [],
        reauth_accounts: [],
        hard_blockers: [],
        owner_actions: ['actions', 'voice_input'],
        observed_at: Date.now(),
        criteria: [
          { id: 'business_context', label: 'İş ve kişisel bağlam', state: 'READY', detail: 'AION Mehmet bağlamını kullanıyor.' },
          { id: 'real_data', label: 'Gerçek veri kaynakları', state: 'READY', detail: 'Repository kaynakları doğrulandı.' },
          { id: 'actions', label: 'Gerçek aksiyon ve çok adımlı işler', state: 'OWNER_CONNECTION_REQUIRED', detail: 'Harici hesap için bağlantı gerekiyor.', action: { label: 'Hesap bağla', surface: 'settings', anchor: 'setup-accounts' } },
          { id: 'voice_input', label: 'Türkçe mikrofon girişi', state: 'VERIFY_ON_DEVICE', detail: 'Mikrofon cihazda doğrulanmalı.', action: { label: 'Ses ayarlarını aç', surface: 'settings', anchor: 'setup-voice' } },
          { id: 'paired_devices', label: 'AION Companion cihaz erişimi', state: 'OWNER_CONNECTION_REQUIRED', detail: 'Cihaz eşleştirilmedi.', action: { label: 'Cihaz eşleştir', surface: 'devices', anchor: 'setup-devices' } },
          { id: 'daily_brief', label: "Günlük yönetici brief'i", state: 'READY', detail: 'Brief hazır.' },
        ],
      }),
    });
  });
  await page.route('**/api/aion/voice/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'local', speed: 0.96, stability: 0.42, similarity_boost: 0.82, style: 0.1,
        pronunciations: { AION: 'Ayon', WEXON: 'Vekson' }, custom_pronunciations: { WEXON: 'Vekson' },
      }),
    });
  });
  await page.route('**/api/marketplace/plugins', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total: 4,
        connected: 1,
        plugins: [
          { id: 'github', display_name: 'GitHub', description: 'Repos and pull requests', category: 'Developer', featured: true, status: 'connected', auth: { mode: 'oauth_device_flow' } },
          { id: 'gmail', display_name: 'Gmail', description: 'Email', category: 'Messaging', featured: true, status: 'not_connected', auth: { mode: 'oauth_pkce_loopback' } },
          { id: 'notion', display_name: 'Notion', description: 'Pages and databases', category: 'Knowledge', status: 'not_connected', auth: { mode: 'hosted_mcp_oauth_dcr' } },
          { id: 'vercel', display_name: 'Vercel', description: 'Deployments', category: 'Developer', status: 'not_connected', auth: { mode: 'hosted_mcp_oauth_dcr' }, fallback_auth: { mode: 'pat_paste' } },
        ],
      }),
    });
  });
  await page.route('**/api/aion/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        owner: { name: 'Mehmet', relationship: 'single-user personal AI operating assistant', success_definition: 'Gerçek kaynakları takip eden kişisel AION.' },
        projects: [
          { id: 'aion', name: 'AION', description: 'Kişisel AI OS' },
          { id: 'wexon', name: 'WEXON', description: 'Platform' },
          { id: 'aion-trade', name: 'AION Trade', description: 'Trade' },
        ],
        workflows: [
          { id: 'daily-brief', name: 'Günlük Yönetici Brief\'i', goal: 'Günlük özet' },
          { id: 'task-follow-through', name: 'Görev Takibi', goal: 'Görevleri ilerlet' },
        ],
        operating_rules: ['Gerçek veri kullan', 'Riskli işlerde onay iste'],
        autonomy: { automatic: ['read real connected sources'], approval_required: ['external writes'] },
      }),
    });
  });
  await page.route('**/api/aion/tasks', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'task-1', project: 'aion', title: 'PDF sözleşmesini doğrula', priority: 'high', status: 'completed' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
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

async function openSection(page: Page, id: string) {
  // Works on both projects: below the drawer breakpoint the rail is behind the
  // mobile menu, above it the rail is already on screen.
  //
  // The rail must exist before anything is decided about it: a one-shot
  // visibility check against a still-mounting app silently skips the drawer
  // and then taps a button that is parked off-screen.
  const rail = page.getByTestId('assistant-sidebar');
  await expect(rail).toBeAttached();
  const width = page.viewportSize()?.width ?? 1440;
  if (width < 768) {
    const menu = page.getByTestId('mobile-menu-button');
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(rail).toHaveClass(/is-mobile-open/);
    // The drawer slides in from off-screen. The open class lands immediately,
    // the transform a few frames later, so clicking on the class alone can
    // target a button that is still outside the viewport.
    await expect.poll(async () => (await rail.boundingBox())?.x ?? -1).toBeGreaterThanOrEqual(0);
  }
  const button = page.getByTestId(`sidebar-${id}-button`);
  // The drawer's navigation scrolls; the lower rows sit below the fold on a
  // short phone, so centre the target before tapping it.
  await button.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await button.click();
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
  await expect(page.getByTestId('personal-metrics-grid')).toBeVisible();
  await expect(page.getByTestId('today-focus-panel')).toContainText('PDF sözleşmesini doğrula');

  await expect(page.getByTestId('sidebar-home-button')).toHaveClass(/is-active/);
  await expect(page.getByTestId('sidebar-chat-button')).toBeVisible();
  await expect(page.getByTestId('sidebar-new-chat-button')).toBeVisible();
  // The collapsible/hover rail was rejected and removed. Desktop now shows one
  // stable command rail: labels always legible, no collapse control at all.
  const sidebar = page.getByTestId('assistant-sidebar');
  const railBox = await sidebar.boundingBox();
  expect(railBox).not.toBeNull();
  expect(railBox!.width).toBeGreaterThan(220);
  await expect(page.getByTestId('desktop-sidebar-toggle')).toHaveCount(0);
  await expect(page.locator('.rail-surface')).toBeVisible();
  await expect(page.getByTestId('rail-status-strip')).toBeVisible();
  // A single marker travels between rows rather than each row lighting itself.
  await expect(page.locator('.rail-marker.is-visible')).toHaveCount(1);
  const homeMarker = await page.locator('.rail-marker').boundingBox();
  await page.getByTestId('sidebar-tasks-button').click();
  await expect(page.getByTestId('sidebar-tasks-button')).toHaveClass(/is-active/);
  await expect.poll(async () => (await page.locator('.rail-marker').boundingBox())?.y ?? 0)
    .not.toBe(homeMarker!.y);
  await expect(page.locator('.rail-marker.is-visible')).toHaveCount(1);
  await page.getByTestId('sidebar-home-button').click();
  await expectNoHorizontalOverflow(page);

  const sections = [
    ['projects', 'Projeler'],
    ['tasks', 'Görevler'],
    ['devices', 'Cihazlar'],
    ['inbox', 'Gelen Kutusu'],
    ['library', 'Geçmiş'],
    ['automations', 'Otomasyonlar'],
  ] as const;
  for (const [id, title] of sections) {
    const button = page.getByTestId(`sidebar-${id}-button`);
    await button.click();
    await expect(button).toHaveClass(/is-active/);
    await expect(page.locator('.workspace-view h1')).toHaveText(title);
    if (id === 'devices') {
      await expect(page.getByTestId('device-pairing-panel')).toContainText('Windows bilgisayar bağla');
      await expect(page.getByTestId('device-device-1')).toContainText('Mehmet-PC');
    }
    if (id === 'inbox') {
      await expect(page.locator('.workspace-alert-card.is-change')).toContainText('public uygulama durumu değişti');
    }
    await expectNoHorizontalOverflow(page);
  }

  await page.getByTestId('sidebar-tasks-button').click();
  const taskRequest = page.waitForRequest((request) => request.url().includes('/api/aion/tasks') && request.method() === 'POST');
  await page.getByTestId('task-complete-task-1').click();
  const taskMutation = await taskRequest;
  expect((taskMutation.postDataJSON() as { action?: string }).action).toBe('complete');

  await page.getByTestId('sidebar-settings-button').click();
  await expect(page.getByTestId('sidebar-settings-button')).toHaveClass(/is-active/);
  await expect(page.locator('.workspace-view h1')).toHaveText('Ayarlar');
  await expect(page.getByTestId('pdf-contract-readiness')).toContainText('AION tamamlanma durumu');
  await expect(page.getByTestId('readiness-business_context')).toContainText('READY');
  await expect(page.getByTestId('readiness-actions')).toContainText('OWNER_CONNECTION_REQUIRED');
  await expect(page.locator('.workspace-connections-panel')).toContainText('Vercel Account API');
  await expect(page.locator('.workspace-connections-panel')).toContainText('Supabase');
  await expect(page.locator('.workspace-connections-panel')).toContainText('AION Trade Telemetri');
  await expect(page.getByTestId('accounts-api-panel')).toContainText('Hesaplar & API');
  await expect(page.getByTestId('account-github')).toContainText('CONNECTED');
  await expect(page.getByTestId('account-gmail')).toContainText('Gmail');
  await expect(page.getByTestId('voice-pronunciation-input')).toHaveValue('WEXON=Vekson');

  const voiceSettingsRequest = page.waitForRequest((request) => request.url().includes('/api/aion/voice/settings') && request.method() === 'POST');
  await page.getByTestId('voice-pronunciation-input').fill('WEXON=Vekson özel\nAION=Ayon');
  await page.getByTestId('voice-profile-save-button').click();
  const voiceSave = await voiceSettingsRequest;
  expect((voiceSave.postDataJSON() as { pronunciations?: Record<string, string> }).pronunciations?.WEXON).toBe('Vekson özel');

  const vercelRequest = page.waitForRequest((request) => request.url().includes('/api/aion/integrations/vercel') && request.method() === 'POST');
  await page.getByTestId('vercel-token-input').fill('synthetic-vercel-token-123456');
  await page.getByTestId('vercel-save-button').click();
  const vercelSave = await vercelRequest;
  expect((vercelSave.postDataJSON() as { token?: string }).token).toBe('synthetic-vercel-token-123456');
  await expect(page.getByTestId('vercel-token-input')).toHaveValue('');
  await expect(page.getByTestId('integration-vercel-card')).toContainText('güvenli credential store');

  const supabaseRequest = page.waitForRequest((request) => request.url().includes('/api/aion/integrations/supabase') && request.method() === 'POST');
  await page.getByTestId('supabase-host-input').fill('https://abc123.supabase.co');
  await page.getByTestId('supabase-key-input').fill('sb_publishable_synthetic_fixture');
  await page.getByTestId('supabase-save-button').click();
  const supabaseSave = await supabaseRequest;
  const supabasePayload = supabaseSave.postDataJSON() as { host?: string; publishable_key?: string };
  expect(supabasePayload.host).toContain('supabase.co');
  expect(supabasePayload.publishable_key).toBe('sb_publishable_synthetic_fixture');
  await expect(page.getByTestId('supabase-key-input')).toHaveValue('');

  await page.locator('.workspace-setting-card.is-button').click();
  await expect(page.getByTestId('theme-picker')).toBeVisible();
  await expect(page.getByTestId('theme-option-reference-label')).toHaveText('AION Pearl');
  await page.getByTestId('theme-option-reference').click();
  await page.getByTestId('theme-picker-close-button').click();

  await page.getByTestId('sidebar-profile-button').click();
  await expect(page.getByTestId('sidebar-profile-button')).toHaveClass(/is-active/);
  await expect(page.locator('.workspace-view h1')).toHaveText("Mehmet'in AION'u");
  await expect(page.locator('.personal-success-card')).toContainText('Gerçek kaynakları takip eden kişisel AION.');

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

  const sections = ['projects', 'tasks', 'devices', 'inbox', 'library', 'automations'] as const;
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

test('settings explains every credential surface step by step', async ({ page }) => {
  await authenticate(page);
  await mockProductData(page);
  await page.goto(PUBLIC_URL, { waitUntil: 'domcontentloaded' });
  await openSection(page, 'settings');

  // Guidance exists for each credential surface and stays collapsed until
  // asked for, so settings is not a wall of instructions.
  for (const id of ['vercel', 'supabase', 'elevenlabs', 'aion_trade']) {
    await expect(page.getByTestId(`setup-steps-${id}`)).toBeVisible();
  }
  await expect(page.locator('[data-testid="setup-steps-vercel"] .workspace-setup-list')).toHaveCount(0);
  await page.getByTestId('setup-steps-toggle-vercel').click();
  await expect(page.locator('[data-testid="setup-steps-vercel"] .workspace-setup-list li').first()).toBeVisible();

  // The voice pipeline is described as it is, never as raw-audio duplex.
  const architecture = page.getByTestId('voice-architecture');
  await expect(architecture).toBeVisible();
  await expect(architecture).toContainText('full-duplex değildir');
  await expectNoHorizontalOverflow(page);
});

test('a blocked readiness item routes to the panel that fixes it', async ({ page }) => {
  await authenticate(page);
  await mockProductData(page);
  await page.goto(PUBLIC_URL, { waitUntil: 'domcontentloaded' });
  await openSection(page, 'settings');

  // A READY criterion has nothing to do, so it must not offer an action.
  await expect(page.getByTestId('readiness-daily_brief')).toBeVisible();
  await expect(page.getByTestId('readiness-action-daily_brief')).toHaveCount(0);

  await page.getByTestId('readiness-action-paired_devices').click();
  await expect(page.getByTestId('device-pairing-panel')).toBeVisible();

  // Companion honesty: the owner can see what AION actually sent to a device.
  const history = page.getByTestId('device-command-history');
  await expect(history).toBeVisible();
  await expect(history).toContainText('open_url');
  await expect(history).toContainText('Tarayıcı açılamadı');
  await expectNoHorizontalOverflow(page);
});

test('the left menu stays reachable from inside chat on a phone', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) >= 768, 'the rail is already on screen above the drawer breakpoint');
  await authenticate(page);
  await mockProductData(page);
  await page.goto(PUBLIC_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('assistant-home-screen')).toBeVisible();

  // The panel covers the top bar, so the hamburger behind it is not a way in.
  await page.getByTestId('global-chat-fab').click();
  await expect(page.getByTestId('conversation-panel')).toBeVisible();
  const menu = page.getByTestId('conversation-menu-button');
  await expect(menu).toBeVisible();
  await menu.click();

  const rail = page.getByTestId('assistant-sidebar');
  await expect(rail).toHaveClass(/is-mobile-open/);
  await expect.poll(async () => (await rail.boundingBox())?.x ?? -1).toBeGreaterThanOrEqual(0);

  // Visible is not enough: the drawer has to win the hit test against the
  // panel it was opened from.
  const row = page.getByTestId('sidebar-projects-button');
  await row.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const owns = await row.evaluate((el) => {
    const b = el.getBoundingClientRect();
    const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return Boolean(hit && hit.closest('[data-testid="sidebar-projects-button"]'));
  });
  expect(owns, 'the drawer row must be hittable above the chat panel').toBeTruthy();

  await row.click();
  await expect(page.locator('.workspace-view-header h1')).toContainText('Projeler');
  await expectNoHorizontalOverflow(page);
});

test('every navigation row is on screen in the phone drawer', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) >= 768, 'the rail is not a drawer above this breakpoint');
  await authenticate(page);
  await mockProductData(page);
  await page.goto(PUBLIC_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('assistant-home-screen')).toBeVisible();
  await page.getByTestId('mobile-menu-button').click();

  const rail = page.getByTestId('assistant-sidebar');
  await expect(rail).toHaveClass(/is-mobile-open/);
  await expect.poll(async () => (await rail.boundingBox())?.x ?? -1).toBeGreaterThanOrEqual(0);

  // Reachable-by-scrolling is not the contract: Ayarlar used to sit outside
  // the clip on every phone, so the owner never saw that it existed.
  const report = await page.evaluate(() => {
    const scroll = document.querySelector('.rail-scroll')!;
    const area = scroll.getBoundingClientRect();
    const rows = [...document.querySelectorAll('[data-rail-row="true"]')];
    const clipped = rows
      .filter((el) => {
        const b = el.getBoundingClientRect();
        return b.top < area.top - 0.5 || b.bottom > area.bottom + 0.5;
      })
      .map((el) => (el.textContent || '').trim());
    const truncated = rows
      .map((el) => el.querySelector('.rail-label'))
      .filter((l): l is HTMLElement => Boolean(l) && l!.scrollWidth > l!.clientWidth + 1)
      .map((l) => l.textContent || '');
    return { total: rows.length, clipped, truncated };
  });

  expect(report.total).toBeGreaterThanOrEqual(9);
  expect(report.clipped, 'no navigation row may sit outside the drawer').toEqual([]);
  expect(report.truncated, 'no navigation label may be cut off').toEqual([]);
});

test('a stalled voice endpoint can never wedge the chat', async ({ page }) => {
  await authenticate(page);
  await mockProductData(page);
  // The failure the owner photographed: synthesis never answers, so the promise
  // the turn is awaiting never settles and the panel sits on "Düşünüyorum"
  // with the microphone closed and nothing left to reopen it.
  await page.route('**/api/aion/tts', () => new Promise(() => {}));
  await page.goto(PUBLIC_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('assistant-home-screen')).toBeVisible();

  await page.getByTestId('global-chat-fab').click();
  await page.getByTestId('chat-message-input').fill('Birinci mesaj');
  await page.getByTestId('chat-send-button').click();
  await expect(page.getByTestId('conversation-message-list')).toContainText('VPS test yanıtı hazır.', { timeout: 30_000 });

  // The contract is not "speech works", it is "the owner can talk again".
  await expect
    .poll(async () => (await page.getByTestId('conversation-voice-status').textContent())?.trim(), {
      timeout: 45_000,
      message: 'voice status must leave "Düşünüyorum" even when synthesis never answers',
    })
    .not.toBe('Düşünüyorum');

  await page.getByTestId('chat-message-input').fill('İkinci mesaj');
  await page.getByTestId('chat-send-button').click();
  await expect(page.getByTestId('conversation-message-list')).toContainText('İkinci mesaj', { timeout: 20_000 });
});

test('the desktop app and the Companion are findable from the product', async ({ page }) => {
  await authenticate(page);
  await mockProductData(page);
  await page.goto(PUBLIC_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('assistant-home-screen')).toBeVisible();

  // Installing was buried in a browser menu, which is the same as absent.
  await openSection(page, 'settings');
  const install = page.getByTestId('desktop-install-card');
  await install.scrollIntoViewIfNeeded();
  await expect(install).toBeVisible();
  await expect(install).toContainText('uygulama olarak yükle');

  // The pairing steps used to send the owner looking for an application that
  // does not exist. The Companion is a script, and the page now says so and
  // hands it over.
  await openSection(page, 'devices');
  await expect(page.getByTestId('device-pairing-panel')).toContainText('Aranacak ayrı bir uygulama yok');
  const script = page.getByTestId('companion-download-link');
  await expect(script).toHaveAttribute('href', '/api/aion/devices/companion/windows.ps1');
  await expect(script).toHaveAttribute('download', 'aion-companion.ps1');
});

test('the copied setup commands are PowerShell, not a nested invocation', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await authenticate(page);
  await mockProductData(page);
  await page.goto(PUBLIC_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('assistant-home-screen')).toBeVisible();

  // Pasted into PowerShell, `powershell -Command "...$p..."` is expanded by the
  // OUTER shell first: $p is undefined, so the line collapses to `=Join-Path`
  // and every step of it fails. The steps say to open PowerShell, so the
  // command has to be PowerShell's own syntax.
  const assertNative = (command: string, label: string) => {
    expect(command, `${label} must not nest a second powershell -Command`).not.toContain('powershell -NoProfile');
    expect(command, `${label} must not rely on a temp file the outer shell names`).not.toContain('Join-Path $env:TEMP');
    expect(command, `${label} should run the script it fetched`).toContain('scriptblock]::Create');
    expect(command, `${label} needs basic parsing on stock PowerShell 5.1`).toContain('-UseBasicParsing');
  };

  await openSection(page, 'settings');
  await page.getByTestId('desktop-install-card').scrollIntoViewIfNeeded();
  await page.getByTestId('desktop-setup-copy').click();
  assertNative(await page.evaluate(() => navigator.clipboard.readText()), 'desktop installer');

  await openSection(page, 'devices');
  await page.getByTestId('device-pair-create-button').click();
  await expect(page.getByTestId('device-pair-copy-button')).toBeVisible();
  await page.getByTestId('device-pair-copy-button').click();
  const pairing = await page.evaluate(() => navigator.clipboard.readText());
  assertNative(pairing, 'pairing command');
  expect(pairing, 'pairing command must pass the one-time token').toContain('-PairToken');
});
