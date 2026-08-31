# AION Asistan Arayüzü

## What it does
- Frontend-only, full-screen AION AI assistant home screen based on the supplied visual reference.
- Full-viewport dark assistant shell with a desktop navigation rail, mobile slide-out navigation, animated orb, Turkish greeting, composer, and three quick actions.
- Demo interactions are local-only: sidebar selection, prompt entry/submission, tool popover, file-picker trigger, microphone state, and quick-action prompt filling.

## Data model
- No persisted data or backend integration. The UI uses local React state for the selected sidebar item, current prompt, submitted prompt preview, and interaction status.

## Key flows
1. Open the full-screen Turkish AION home screen and see the Hendricks greeting.
2. Type a prompt and click the blue send button to show a local latest-prompt preview.
3. Click a Turkish quick action to populate the composer.
4. On mobile, open the slide-out menu from the top bar and select an item.
5. Use sidebar controls, Tools, Import file, and microphone controls to show local interaction feedback.

## Auth and roles
- None. The app is an unauthenticated frontend demo.