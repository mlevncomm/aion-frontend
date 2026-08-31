# AION Asistan Arayüzü

## What it does
- Frontend-only, full-screen AION AI assistant home screen based on the supplied visual reference.
- Full-viewport dark assistant shell with a desktop navigation rail, mobile slide-out navigation, animated orb, Turkish greeting, composer, and three quick actions.
- Demo interactions are local-only: sidebar selection, prompt entry/submission, tool popover, file-picker trigger, microphone state, and quick-action prompt filling.
- A Turkish AION admin login screen gates the app before the assistant workspace is rendered.
- The visual system closely follows the original reference: near-black emerald surfaces, restrained low-contrast glass, matte borders, and mint reserved for primary active controls. The custom emerald orb remains deliberately subdued.
- The Settings control opens a theme picker for Emerald, Dark Amber, and Monochrome themes; the choice persists in `localStorage` across visits and also applies to the login screen.
- The assistant orb uses a subtle pulse while a prompt is being typed and a restrained light wave/spin after send.
- Login card, composer, and quick actions use very faint pointer-following glass highlights; touch interactions trigger the same restrained highlight on mobile.

## Data model
- No persisted data or backend integration. The UI uses local React state for the selected sidebar item, current prompt, submitted prompt preview, and interaction status.

## Key flows
1. Open the site and arrive at `/giris` when there is no active admin session.
2. Sign in with the admin credentials and enter the full-screen Turkish AION home screen.
3. Type a prompt and click the themed send button to show a local latest-prompt preview and orb send animation.
4. Click a Turkish quick action to populate the composer.
5. On mobile, open the slide-out menu from the top bar and select an item.
6. Use sidebar controls, Tools, Import file, and microphone controls to show local interaction feedback.
7. Select Çıkış Yap to clear the session and return to `/giris`.
8. Open Ayarlar to switch the persistent visual theme between Zümrüt, Koyu amber, and Monokrom.

## Auth and roles
- One frontend-only admin role. Login: `admin` / `AION#2026`.
- The successful session is stored in `sessionStorage` and ends when the tab closes or the user selects Çıkış Yap.
- Five failed attempts trigger a 30-second login lock stored in `sessionStorage`.
- Security limitation: this is a client-side access gate only. It does not provide production-grade protection because the validation code ships to the browser.