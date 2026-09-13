# AION — Claude execution brief

You are finishing AION for its owner. Do not restart the architecture. Work from the current live system and improve it in place.

## Immediate user feedback

The owner explicitly rejected the current desktop sidebar behavior. The previous collapsible/hover rail iterations still feel visually unchanged. Treat the sidebar/navigation as NOT ACCEPTED. You may redesign it from scratch. Do not preserve the current approach just because it exists.

The result must feel obviously different at first glance, premium, calm, fast, and intentional — closer to a polished native AI product than a dashboard template.

## Product goal

AION is a single-user personal AI operating system, not a demo dashboard and not a generic chatbot. It must understand the owner's active projects, read real connected sources, surface what changed, track tasks, remember approved decisions, support voice, connect accounts through OAuth/API settings, and safely advance work.

## Frontend priorities

1. Redesign the left navigation completely.
   - Desktop: elegant compact navigation with clear hierarchy and premium motion. It must be immediately visually distinct from the current sidebar.
   - Tablet: intentional icon rail, never crushed labels.
   - Mobile: real slide-in drawer with large touch targets, safe areas and no horizontal overflow.
   - Active state, hover, focus, counters, profile, new chat, chat, settings and device areas must all work.
   - Do not add fake controls.
   - Prefer fewer, stronger visual elements over decorative noise.
2. Polish page transitions, spacing, typography, cards, empty states, loading states, errors, account/API settings and device pairing.
3. Keep the pearlescent reactive orb as the visual center, but do not let the rest of the UI look like a blue dashboard.
4. Make settings/account connections comprehensible to a normal user: Connect account, API/token fallback where supported, connection status, repair action. Never reveal stored secrets.
5. Voice UI must clearly distinguish microphone/listening/thinking/speaking states and premium TTS vs fallback.

## Real-system constraints

- Public: https://aion.wexon.dev
- Frontend source: /opt/aion-frontend/frontend
- Frontend repo: mlevncomm/aion-frontend
- Persistent deployed dist: /var/lib/aion-next/frontend-dist
- Candidate backend: aion-next.service on 127.0.0.1:47821
- Nginx fronts the public domain.
- Old rollback service /opt/aionu and aionu.service MUST NOT be deleted, retired or modified without separate explicit approval.
- Never print, commit or expose credentials.
- Do not fake connected integrations or successful actions.

## Backend / product truth to preserve

- Personal projects: AION, WEXON, AION Trade, Moon Modes, Infrastructure.
- AION Trade: PAPER-first, SPOT-only, LIVE disabled by default, no withdrawals, no Martingale.
- OpenRouter policy: prefer free tool-capable models; no silent paid fallback.
- Internal AION task tracking is real/persistent.
- Observer and daily-brief timers are real and must remain working.
- Accounts/API center, OAuth connector catalog, ElevenLabs integration, Companion device center and Project Commander exist. Improve/fix; do not replace with fake UI.
- Risky/external/destructive/financial actions stay behind approval policy.

## Known remaining product gaps / acceptance work

Treat these as the remaining finish list, not as claims that they already work:

1. Sidebar/navigation redesign accepted visually by a human, not just tests.
2. ElevenLabs flow: voice catalog + Save/Test must report the real provider error. Free/TTS-only keys should not fail merely because Voice Library scope is missing. Do not claim premium voice READY until an actual TTS sample succeeds.
3. Account connections: UI must support OAuth where the connector supports it and API/token fallback where appropriate. Connected accounts must become real AION tools, not status cards only.
4. Project Commander: verify AION can use approved browser/coding-session tools on a real project path while keeping shell/computer-use safety boundaries.
5. Companion: keep Windows pairing/permissions honest. Never claim the owner's PC or phone is controllable until an actual companion is paired and permissions are granted.
6. Voice: current browser STT -> AION -> TTS is not true raw-audio full duplex. Keep that distinction honest. Improve naturalness, turn timing and pronunciation where possible without secretly enabling paid providers.
7. PDF readiness: preserve the readiness screen and ensure it reports READY / OWNER_CONNECTION_REQUIRED / VERIFY_ON_DEVICE / ACTION_REQUIRED from real state.
8. Error/repair UX: every broken connection should tell the owner what to do next without exposing provider secret bodies.

## Required visual/browser acceptance

Do not call the UI finished until the real built bundle passes at least:
- 320x568
- 360x740
- 390x844
- 430x932
- 768x1024
- 1024x768
- 1440x900

Verify no horizontal overflow, mobile drawer, sidebar navigation, active state, chat, theme/settings, account/API panels, devices, tasks, inbox and profile.

The user must be able to LOOK at the desktop navigation and immediately tell it changed. Automated tests alone are not enough for this particular sidebar task.

## Quality gate

Before deployment:
- TypeScript typecheck PASS
- production build PASS
- lint 0 errors (existing Fast Refresh warnings may remain if unchanged)
- product E2E PASS
- responsive E2E PASS
- inspect the built bundle, not only source
- no secrets in diff

For backend changes also run the relevant AION + agent-chat contract/unit suites. Do not claim the entire upstream optional dependency suite is clean if optional desktop/dev dependencies are absent.

## Deployment discipline

1. Inspect git status first. Do not overwrite unrelated WIP.
2. Make a rollback copy of the current persistent frontend before replacing it.
3. Copy the NEW build contents into /var/lib/aion-next/frontend-dist; beware bind-mount/inode behavior.
4. Restart only aion-next when needed; preserve aionu.service.
5. Verify local health, public root, login, protected API behavior and the exact public JS/CSS asset hashes.
6. Verify the new visual marker exists in the PUBLIC bundle before declaring success.
7. Commit and push only after tests pass. Keep commits focused.

## How to report completion

Report separately:
- what is live and tested,
- what is connected but awaiting owner credentials/permissions,
- what is structurally unavailable (for example OS-level phone control without a companion),
- exact commit hashes and public asset hash.

Never say "everything is complete" while an owner connection/device permission is still required.
