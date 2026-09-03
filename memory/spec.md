# AION Asistan Arayüzü

## What it does
- Frontend-only, full-screen AION AI assistant home screen modelled on the supplied Dribbble reference (LIX-style holographic AI home).
- **No backend / no real AI**: the user explicitly requested frontend-only ("backend istemiyorum frontend geliştir"). All interactions are local React demos.
- Full-viewport responsive assistant: compact vertical circular-icon sidebar rail, mobile slide-out navigation, an iridescent holographic CSS orb, Turkish greeting cluster with subtitle, an inline text composer (with a "Pro" pill banner, "Dosya ekle" + "Araçlar" chips, mic + electric-blue send button), and three quick-action cards.
- Demo interactions are local-only: sidebar selection, prompt entry/submission (opens a slide-up conversation panel with a local canned Turkish reply), tool popover, file-picker trigger, microphone/voice state, and quick-action prompt filling.
- A Turkish AION admin login screen gates the app before the assistant workspace is rendered.

## Visual system
- Default theme is **"AION Mavi"** (`data-aion-theme="reference"`): deep obsidian `#0B0D13` surfaces, a vibrant electric-blue (`#2563EB`) atmospheric glow rising from the bottom-centre, restrained glass panels, Urbanist typography.
- The assistant orb is built entirely with layered CSS (no image): a spinning conic iridescent halo (cyan→indigo→violet→pink→cyan), fluid plasma blobs, a glass specular highlight and a voice spectrum; it reacts to idle / typing / sending / listening / speaking states.
- The Settings control opens a theme picker: AION Mavi (default, blue holographic), Orman (green), Koyu amber, Monokrom. The choice persists in `localStorage` and also applies to the login screen. (Alternate themes keep the earlier green/amber/mono orb + accents; only the default is the blue holographic reference look.)
- Login card, composer, and quick actions use faint pointer-following glass highlights (`liveGlow`).

## Data model
- No persisted data and no backend integration. UI uses local React state for the selected sidebar item, current prompt/draft, message list, and interaction status. Theme + session use `localStorage`/`sessionStorage`.

## Key flows
1. Open the site and arrive at `/giris` when there is no active admin session.
2. Sign in with the admin credentials and enter the full-screen Turkish AION home screen.
3. Type a prompt in the inline composer and press Enter / the blue send button → the slide-up conversation panel opens and shows a local AION reply (also spoken via browser speech synthesis when available).
4. Click a Turkish quick action ("Beni şaşırt!", "Görsel oluştur", "Özetle") to populate the composer.
5. Click the orb to toggle continuous voice listening (Web Speech API) when supported; use the composer mic button to mute/unmute.
6. On mobile, open the slide-out menu from the top bar and select an item.
7. Open Ayarlar (Settings) to switch the persistent visual theme.
8. Select Çıkış Yap to clear the session and return to `/giris`.

## Auth and roles
- One frontend-only admin role. Login: `admin` / `AION#2026`.
- The successful session is stored in `sessionStorage` and ends when the tab closes or the user selects Çıkış Yap.
- Five failed attempts trigger a 30-second login lock stored in `sessionStorage`.
- Security limitation: this is a client-side access gate only — validation code ships to the browser, so it is not production-grade protection.
