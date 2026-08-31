# LIX Assistant Clone

## What it does
- Frontend-only clone of the supplied LIX AI assistant home screen.
- Floating dark assistant shell with a vertical navigation rail, animated orb, greeting, composer, and three quick actions.
- Demo interactions are local-only: sidebar selection, prompt entry/submission, tool popover, file-picker trigger, microphone state, and quick-action prompt filling.

## Data model
- No persisted data or backend integration. The UI uses local React state for the selected sidebar item, current prompt, submitted prompt preview, and interaction status.

## Key flows
1. Open the home screen and see the Hendricks greeting.
2. Type a prompt and click the blue send button to show a local latest-prompt preview.
3. Click a quick action to populate the composer.
4. Use sidebar controls, Tools, Import file, and microphone controls to show local interaction feedback.

## Auth and roles
- None. The app is an unauthenticated frontend demo.