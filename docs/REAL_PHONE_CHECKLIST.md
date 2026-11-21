# Real-phone checklist (Phase 9)

About 10 minutes on your own phone, on the same Wi-Fi as the PC running the dev server. Each item is one thing to do and what "right" looks like. Reply with the numbers that went wrong and what you saw, for example "5: the keyboard hides the Send button".

**Link:** the one the session gives you (`http://<PC Wi-Fi address>:5173/app?place=…`). It's plain HTTP on your home network, so "Use my location" can't work here; that item waits for the live site.

**Record with your reply:** the phone model, its OS version and the browser (for example "Pixel 7, Android 15, Chrome"). The keyboard and the place dialog behave differently on Android Chrome and iPhone Safari.

| # | Do this | Right looks like |
|---|---|---|
| 1 | Tap a bottom-bar item, a chip on Ask, and a button | It reacts the moment your finger lands (a small press), with no grey flash and no pause |
| 2 | Tap a nav item, then look at it again | Nothing stays highlighted as if hovered |
| 3 | Look at the top and bottom of the screen | The top bar clears the notch or camera; the bottom bar clears the home line; the city sits just above the bottom bar |
| 4 | On Today, scroll to the very end | The footer ends, then the whole city shows under it |
| 5a | Tap the "Ask AirAware anything" box on Today | The page doesn't zoom in; the keyboard doesn't cover the box or its Send button |
| 5b | Tap the place chip, then its search box, and type "Pu" | The page doesn't zoom in; the keyboard doesn't cover the search box or the suggestions |
| 6 | At the top of Today, pull down | Nothing jerky; the page doesn't fight you |
| 7 | Press and hold a button's label | The label doesn't get selected |
| 8 | Look at the phone's status bar (time, battery) | Its background matches the navy top bar |
| 9 | Turn the phone sideways on Today | No city behind the title; nothing cut off; turning back is fine |
| 10 | Open the rain link the session gives you | Rain falls smoothly and stops within about 5 seconds |
| 11 | Tap the place chip, search "Delhi", pick it, then open the chip again and close it | It opens, finds, chooses and closes; Today switches to Delhi |
| 12 | Optional: turn on TalkBack (Android) or VoiceOver (iPhone) on Today | It reads the page title, the verdict and the bottom-bar labels sensibly |

**Not here:** "Use my location". It needs HTTPS, so it's checked on the live site after the push.
