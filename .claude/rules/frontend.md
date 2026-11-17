---
paths:
  - "client/src/**/*.{ts,tsx,css}"
---

# Frontend Rules

- Follow `DESIGN.md` and `ACCESSIBILITY.md`.
- Keep API/data logic in typed service modules, not presentation components.
- Display source, data kind, timestamps, units, stale state, and limitations wherever air data is shown.
- Never use color alone for AQI/status communication.
- All interactive elements need accessible names and real behavior.
- Add loading, error, empty, stale, and offline states.
- Respect reduced-motion preferences.
- Do not replace real APIs with mocks in production paths.
- Check narrow mobile widths and keyboard behavior after UI changes.
