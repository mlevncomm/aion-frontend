# AION Asistan Arayüzü

## What it does
- Frontend-only, full-screen AION AI assistant home screen based on the supplied visual reference.
- Full-viewport responsive assistant with a compact desktop navigation rail, mobile slide-out navigation, CSS audio orb, Turkish greeting, hidden composer, and three quick actions.
- Demo interactions are local-only: sidebar selection, prompt entry/submission, tool popover, file-picker trigger, microphone state, and quick-action prompt filling.
- A Turkish AION admin login screen gates the app before the assistant workspace is rendered.
- The default visual system uses near-black surfaces with deep emerald and soft mint accents, restrained glass, and Urbanist typography.
- The Settings control opens a theme picker for AION Green, Forest, Dark Amber, and Monochrome themes; the choice persists in `localStorage` across visits and also applies to the login screen.
- The assistant orb is built entirely with CSS layers (no image) and reacts to live microphone level through the Web Audio API, plus listening/speaking states.
- Login card, composer, and quick actions use very faint pointer-following glass highlights; touch interactions trigger the same restrained highlight on mobile.
- The assistant workspace is full-viewport on desktop and mobile. The text chat stays hidden until Mehmet chooses chat, clicks a quick action, or uses the muted primary control.
- After one user activation, browser speech recognition stays in continuous mode when supported. Mehmet can mute/unmute the microphone or continue through chat; local demo responses are spoken with the browser speech synthesis API.
- The visible profile and greeting are personalised for Mehmet. The previous Pro upsell banner and composer focus rectangle have been removed.

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
8. Open Ayarlar to switch the persistent visual theme between AION Yeşil, Orman, Koyu amber, and Monokrom.

## Auth and roles
- One frontend-only admin role. Login: `admin` / `AION#2026`.
- The successful session is stored in `sessionStorage` and ends when the tab closes or the user selects Çıkış Yap.
- Five failed attempts trigger a 30-second login lock stored in `sessionStorage`.
- Security limitation: this is a client-side access gate only. It does not provide production-grade protection because the validation code ships to the browser.