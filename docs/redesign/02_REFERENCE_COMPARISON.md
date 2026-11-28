# 02 · Reference comparison: SaafSaans, the alternate AirAware, UrbanAir AI

**Date:** 28 Nov 2026, captured between about 15:37 and 15:44 IST (screenshot file times; the later re-runs started 10:08 to 10:13 UTC, per the `when` fields in the JSON files).

**Mode:** read-only:
- no sign-up, no personal data, no forms submitted;
- no application code, config or existing doc was changed.

**One question per site, not one in total.** One generic question ("How is the air today?") was typed into each of the two public assistants that need no sign-in, so two questions were sent in all. If the brief meant one question in total, this went one over.

**Labels used in this doc:**
- **OBSERVED**: seen in a rendered page in this session, with a screenshot path or extracted page text.
- **INFERRED**: a reasonable reading of what was seen, not confirmed (for example, how a site works behind the page).
- **RECOMMENDED**: a proposal for AirAware. It needs owner approval before any build.

**Paths:**
- `refs/` means `docs/redesign/audit/screenshots/redesign-2026-11-28/references/`. That folder is git-ignored with the rest of `docs/redesign/audit/screenshots/` (`.gitignore`, owner decision I1).
- `-first.jpg` is the first screen, `-<width>.jpg` is the full page, and `-view.jpg` is one section scrolled into view.
- Captures of AirAware itself were found in `docs/redesign/audit/screenshots/redesign-2026-11-28/current/` (file times 15:40 to 15:42). They were not made by this task. **Origin confirmed by the cross-doc review (OBSERVED):** a teammate's capture scripts (`scratchpad/redesign/capture.mjs`, `capture2.mjs`) target https://airaware-ai.netlify.app, so they show production on 28 Nov, about 15:37–15:48 IST. Their Ask intro still reads "Answers come from AirAware's rules and today's forecast." (`current/ask-1440.jpg`, viewed), while the local source already has the J26 wording (`client/src/features/ask/ask.ts:57`). So J26 was not deployed at capture time (OBSERVED).

**Method:**
- Headless Chromium from the repo's own Playwright (`node_modules/playwright`). Nothing was installed.
- **Windows import gotcha:** a bare `import … from 'C:/…/playwright/index.mjs'` fails on Windows with `ERR_UNSUPPORTED_ESM_URL_SCHEME`. It needs `file:///C:/…/node_modules/playwright/index.mjs`.
- Viewports were 1440×900 and 390×844. Screenshots are JPEG at quality 70, 52 files, 6.9 MB.
- Scripts are in the session scratchpad, `C:/Users/Ashutosh/AppData/Local/Temp/claude/5f56e6022b99d9b4/526cd9ef-a7c8-4b28-b2da-f59162db31c3/scratchpad/redesign/`. It is temporary and may be cleared:
  - `ref-capture.mjs` takes the screenshots and extracts headings, links, buttons, inputs and body text;
  - `ref-saaf-sections.mjs` scrolls each SaafSaans step into view, because those steps render only when on screen;
  - `ref-ask.mjs` sends the one question.
- The raw text dumps are JSON files in the scratchpad's `ref-out/`.
- No page showed sideways overflow: `scrollWidth` equalled the viewport width on every page at both widths (OBSERVED).

> **A naming warning.** The "alternate AirAware" site calls itself **"AirAware AI"**, the same name as this product, at a different URL (https://airaware-ai-nine.vercel.app). It is a separate project with its own GitHub repo, linked from its footer. AirAware must not copy its look, copy or code. Visual distinctiveness matters more because of the name clash (RECOMMENDED).

---

## 1. SaafSaans: https://saafsaans-382086946715.asia-south1.run.app/

**Pages captured:**

| Page | 1440 | 390 |
|---|---|---|
| Landing (`/`) | `refs/saafsaans-landing-1440-first.jpg`, `-1440.jpg` | `refs/saafsaans-landing-390-first.jpg`, `-390.jpg` |
| "Try a Hyderabad family" (`#/demo`, which redirects to `#/today`, title "Today's air plan") | `refs/saafsaans-demo-1440-first.jpg`, `-1440.jpg` | `refs/saafsaans-demo-390-first.jpg`, `-390.jpg` |
| Landing steps 3 to 7, one per screen | `refs/saafsaans-landing-{indoor,alternatives,impact,community,method}-1440-view.jpg` | not taken |
| Demo plan steps 3 to 5 | `refs/saafsaans-demo-{indoor,alternatives,impact}-1440-view.jpg` | not taken |

**Not opened:** "Set up my household" (`#/setup`), the language switch (Hindi, Telugu), "Share on WhatsApp", "Add to calendar", "Print my plan", the "Tell us about a change" text box and the mobile step menu. They were not needed, or they are forms. There is no chat assistant on the pages visited (OBSERVED: no chat input; the only free-text box is "Describe the change in your routine" behind "Refine my routine").

### 1.1 Observed features

| Feature | What was seen | Evidence |
|---|---|---|
| Story as numbered steps | The landing has "Start here", Steps 1 to 7 and "Your turn". A sticky left rail on desktop marks the current step. Phones get a one-line bar instead ("Start here: Plan your family's day…"). Each step opens with two labelled lines, "What this shows" and "What you can do" | `refs/saafsaans-landing-1440-first.jpg`, `refs/saafsaans-landing-390-first.jpg` |
| A ready-made sample household | "Try a Hyderabad family" opens a full plan for the Reddy family (Father, Mother, Son (9), Grandmother (68)) with no setup | `refs/saafsaans-demo-1440-first.jpg` |
| Advice for each person | "Google's health advice for each person" lists one paragraph per household member, credited "Health advice from the Google Air Quality API. Not medical advice." | demo page text |
| Cleanest and dirtiest hours | A 48-hour PM2.5 bar chart. Example: "Cleanest hours: 15:00 to 18:00 / Dirtiest hours: 06:00 to 09:00", with a cited explanation, "Why mornings are often worse" | landing step 2 |
| Moving one routine | "Grandmother's walk, moved to the cleanest hours": 240 µg against 238 µg breathed, "1% less" | landing step 2 |
| Action cards | Each card shows: who it helps ("Helps: Grandmother (68)"), the effect with an "Estimate" tag, "How we worked this out", and an "I'll do this" tick | `refs/saafsaans-demo-indoor-1440-view.jpg` |
| Indoor air | A diagram of how outdoor air gets in. Bars for "Windows open 92% / shut 81% / shut with purifier 21% of outdoor PM2.5". "Smoke you make indoors" covers mosquito coils, incense and frying | `refs/saafsaans-landing-indoor-1440-view.jpg` |
| Purifier size calculator | Takes room feet (L, W, H) and returns "120 cfm CADR at least", showing the working (the AHAM two-thirds rule, scaled for ceiling height) | same |
| Commute and CO₂ | Car 3.36 kg against metro 0.1 kg CO₂ a day; "This winter 277 kg CO₂"; "The metro figure is an estimate from Hyderabad Metro's own claim" | `refs/saafsaans-landing-alternatives-1440-view.jpg` |
| Family impact table | "Less dose" % and "Cigarettes' worth avoided" for each person; "Household CO₂ avoided: 16.4 kg a week" | `refs/saafsaans-demo-impact-1440-view.jpg` |
| Community and sharing | A "Green Meadows society" example ("120 homes… 1,120 kg CO₂"), a WhatsApp share link with the figure pre-filled, and "Print my plan" | `refs/saafsaans-landing-community-1440-view.jpg`, link list |
| Method page | "Gemini decides, code computes. Gemini only picks which changes fit your family and explains them in plain words. Every number comes from tested code…" Sources listed: CPCB, US EPA, Berkeley Earth, AHAM, India GHG Program, CEA, CSE, Google Air Quality API. A link to `docs/FACTORS.md` on GitHub | `refs/saafsaans-landing-method-1440-view.jpg` |
| Languages | English, हिन्दी and తెలుగు buttons in the header (switching was not tested) | `refs/saafsaans-landing-1440-first.jpg` |
| Glossary | Inline folds: "What is AQI?", "What is PM2.5?", "What is dose?", "What is CADR?", "What is an estimate?" | demo page |
| Visual style | Near-black background, one bright green accent, a heavy display face, plain dark cards, no imagery. The whole landing is one long column (about 9,600 px at 1440) | screenshots above |

### 1.2 Strongest interaction patterns

1. **"What this shows / What you can do" at the top of every step.** It states the purpose of the screen and the next action in two short lines (OBSERVED).
2. **A sample household before setup.** Someone sees the finished value in one tap, without entering data (OBSERVED).
3. **The action card anatomy:** who it helps, the effect, the method link and a commitment tick ("I'll do this") (OBSERVED).
4. **Showing the working for every derived number** (the CADR steps, "How we worked this out", the "Estimate" tag) (OBSERVED).
5. **A stated AI and code split** ("Gemini decides, code computes"). It is the same principle as AirAware's (OBSERVED).

### 1.3 Weaknesses

- **Very long.** A 7-step story on the landing, then a second 6-step story in the plan. About 10,000 px at 390 (`refs/saafsaans-landing-390.jpg`) (OBSERVED).
- **Steps are drawn only when on screen.** The text is in the DOM (`textContent` about 11,600 characters) but not rendered (`innerText` about 3,100). Off-screen steps show empty headings and blank space until scrolled into view.
  - The full-page shots are blank below step 2 (`refs/saafsaans-landing-1440.jpg`, checked; the 390 and demo full-page shots are probably the same).
  - The `-view.jpg` shots and the extracted text are the only evidence for steps 3 to 7.
  - Find-in-page and some assistive tech may miss these steps (the text figures are OBSERVED in `ref-out/saafsaans-sections.json`; the effect is INFERRED).
- **The demo arrives with 6 changes already ticked** ("Changes ticked: 6"). The totals can read as the user's own choices (OBSERVED).
- **Repetitive advice.** The four per-person paragraphs are near-identical blocks (OBSERVED).
- **Uniform dark visuals.** No sense of place, weather or time of day (OBSERVED).

### 1.4 Data-integrity concerns

| Concern | Status |
|---|---|
| It shows a single **"89 AQI · Satisfactory"** with CPCB band names and a "CPCB health statement", sourced to the Google Air Quality API. It does not say whether this is CPCB's National AQI, Google's index mapped to CPCB bands, or a figure computed by the site | Display OBSERVED; the origin is unclear (INFERRED: likely Google's API, mapped to India's bands) |
| The same 43 µg/m³ is labelled **"PM2.5: 43 µg/m³"** on the landing and **"Main pollutant: PM10 (43 µg/m³)"** on the plan page, in the same session | OBSERVED (landing text; `refs/saafsaans-demo-1440-first.jpg`) |
| **"Satisfactory"** sits beside Google advice for the same moment: "Staying indoors with an activated air filtration system would be best…" and, for the child, "Keep relevant medication(s) available and consult a doctor" | OBSERVED (demo page text). The medication line is the medical-style advice AirAware's rules forbid (AGENTS.md §6) |
| **Exposure and emissions figures:** "1% less dose", "23% less PM2.5", "Cigarettes' worth avoided 1.3", "277 kg CO₂ this winter", "1,120 kg CO₂" for a whole society. Some carry "Estimate" and sources, but they are presented as personal outcomes | OBSERVED. Under AGENTS.md §6 AirAware may not produce quantitative emissions benefits without a documented method, and has none |
| **A confusing table on the landing impact step.** Under the caption "The Reddys today, without the purifier" (the toggle is unticked), each person shows "Cigarettes' worth avoided 1.3" next to "0% less" dose. Something is "avoided" before any change is made | OBSERVED (`refs/saafsaans-landing-impact-1440-view.jpg`, viewed) |
| **Wording AirAware bans:** "cleanest hours", "Breathe cleaner air today", "keep the air inside cleaner" | OBSERVED |
| **Cited sources and method:** the method page lists sources, and indoor-smoke figures are cited per claim ("In one test house…") | OBSERVED (a strength) |

### 1.5 What AirAware should learn / avoid

| | Item | Status for AirAware |
|---|---|---|
| Learn | A two-line "purpose / next step" header on My Home and Better Habits | Partly shipped: purpose lines (E4, A10). RECOMMENDED: add a next-step line. New, needs an owner decision |
| Learn | Let a first-time visitor see a finished Today before choosing a place | Already covered: Landing shows "A past screenshot of Today for Pune, 22 Nov 2026" beside the hero (G3, G4). A live sample Today would conflict with acceptance check DI-10, "No demo data" (`REDESIGN_ACCEPTANCE_CRITERIA.md:241`), so it is not proposed |
| Learn | Card anatomy: who it helps + why + a commitment tick | "Why?" is shipped (`PlanCard.tsx` Why panel; E1). A "who it helps" line from household answers already exists ("For you", B2). A commitment tick is new and needs an owner decision; no saving without consent |
| Learn | Show the working for any derived figure, in the "Why?" panel | Shipped in spirit ("Based on", "What it used", Sources, Caveat) |
| Learn | Indoor-smoke sources (coils, incense, frying) as concrete actions | Shipped: Today shows "Cut indoor smoke at the source… Incense, mosquito coils, candles and tobacco" (`current/today-390.jpg`) |
| Avoid | Any AQI number or band, dose %, "cigarettes' worth" or CO₂ savings | Forbidden (AGENTS.md §5-6; "We don't calculate an AQI") |
| Avoid | Per-person medical lines ("keep medication available") | Forbidden (AGENTS.md §6) |
| Avoid | Pre-ticked choices presented as the user's | RECOMMENDED: never |
| Avoid | Sections that stay blank until scrolled into view | RECOMMENDED: render all content at all times; animate only how it appears, and never hide it from find-in-page or from full-page capture |

---

## 2. Alternate "AirAware AI": https://airaware-ai-nine.vercel.app/

**Pages captured:**

| Page | 1440 | 390 |
|---|---|---|
| Landing (`/`) | `refs/airaware-alt-landing-1440-first.jpg`, `-1440.jpg` | `refs/airaware-alt-landing-390-first.jpg`, `-390.jpg` |
| Assistant (`/assistant`), empty | `refs/airaware-alt-assistant-1440-first.jpg`, `-1440.jpg` | `refs/airaware-alt-assistant-390-first.jpg`, `-390.jpg` |
| Assistant after one question | `refs/airaware-alt-ask-response-1440.jpg` | `refs/airaware-alt-ask-response-390.jpg` (the same page resized; not asked twice) |
| Daily plan (`/plan`), form not submitted | `refs/airaware-alt-plan-1440-first.jpg`, `-1440.jpg` | `refs/airaware-alt-plan-390-first.jpg`, `-390.jpg` |

**Not opened:** `/dashboard`, `/indoor`, `/impact`, `/insights` (seen only as previews on the landing), the city picker and the mobile menu. "Build today's plan" is a form, so it was not submitted.

### 2.1 Observed features

| Feature | What was seen | Evidence |
|---|---|---|
| Editorial hero | A large sans headline with an italic serif second line ("The air you breathe. *The choices you make.*"), a Wikimedia photo of a hazy city credited CC BY-SA in the footer, and a floating reading card | `refs/airaware-alt-landing-1440-first.jpg` |
| Provenance on the reading card | Card labels: "LIVE READING", "MODELLED", "US AQI, CAMS modelled hourly. Not a station measurement." | same |
| Two indices side by side | A "US AQI / CPCB AQI" toggle. "CPCB figures are estimates computed here" (in the app) | landing text |
| A grounding panel beside the chat preview | Labelled "GROUNDING FOR THIS ANSWER": City, US AQI, PM2.5, Dominant. A "SENT WITH EVERY QUESTION · SERVER FETCH" panel lists exactly what the model gets | landing text |
| A "will not do" list | "It cannot see your street, your room or the air inside a building… does not offer treatment advice… will not fill a missing reading with a guessed value." Also "No invented numbers / No station claims / No medical advice" | landing text |
| Assistant page | A context strip of chips (city, "US AQI 251", band, "CPCB 228", "updated 11/28/2026, 3:30:00 PM"), 5 starter questions, a growing textarea with an example placeholder, and the line "Answers are generated by Gemini from modelled readings. Enter to send, Shift+Enter for a new line." | `refs/airaware-alt-assistant-1440-first.jpg` |
| Answer layout | User bubble on the right; the answer as plain text with a small AI mark; a "Limits:" box under the answer | `refs/airaware-alt-ask-response-1440.jpg` |
| Daily plan form | Five single-choice groups: day type, time outdoors, travel, home, "Main concern". "Your profile is sent with each request and nothing is stored on a server." | `refs/airaware-alt-plan-1440-first.jpg` |
| Indoor call | "TODAY'S CALL: Keep them closed" (windows), with "This is the outdoor reading. Indoor air is never measured by this product." and a threshold note | landing preview |
| Commute trade-off | Weekly CO₂ by mode, with the printed assumption ("about 150 g CO₂ per km, one occupant") | landing preview |
| Insights | 7-day hourly PM2.5 with "India 24 h standard, 60 µg/m³" marked | landing preview |
| Navigation | Desktop: 6 text tabs plus a city pill. Phone: tabs in a sideways-scrolling strip under the header ("Im…" cut at the edge); the page itself does not overflow | `refs/airaware-alt-ask-response-390.jpg` |

### 2.2 The question asked, exactly as it happened

- **Sent:** "How is the air today?" in the `/assistant` textarea, then Send, at 10:10:31 UTC.
- **Answered** within about 7 s. One `POST /api/ai` returned 200.
- **Answer (verbatim):** "Air quality in New Delhi today is Poor to Very Unhealthy (CPCB AQI 228, US AQI 251), based on data from November 28, 2026, at 15:30. The primary pollutant driving this risk is PM2.5 at a concentration of 99 µg/m³. The 24-hour average for PM2.5 is even higher at 161.0 µg/m³. At these levels, the air can cause respiratory discomfort for everyone, especially sensitive individuals. While you cannot change citywide air pollution, you can protect your household's personal exposure today by keeping windows closed, running an air purifier if available, and avoiding outdoor physical exertion while winds remain low at 2.9 km/h."
- **Limits box:** "Measurements are modelled, not from a regulatory monitor, and can differ from a station near you."

### 2.3 Strongest interaction patterns

1. **Context before the question.** A chip strip shows place, figures and time above the box (OBSERVED). AirAware's Ask has the same idea as a text line: "Using: the Pune, Maharashtra model forecast, retrieved 3:38 PM…" (`current/ask-1440.jpg`).
2. **A visible "what the AI received" panel** next to an example answer (OBSERVED, landing).
3. **A plain "What it will not do" list** (OBSERVED).
4. **One reading reused across six jobs.** Every preview reads the same data, so the numbers agree across the site (OBSERVED, landing).
5. **A per-answer "Limits:" box** placed directly under the answer (OBSERVED).

### 2.4 Weaknesses

- **The landing previews every feature.** It reads as a feature tour; about 13,600 px at 390 (`refs/airaware-alt-landing-390.jpg`) (OBSERVED).
- **Mixed signals in the hero card:** "LIVE READING" beside "MODELLED", and "Observed Nov 28, 03:30 PM" for a model value (OBSERVED).
- **Hard-to-read time format:** "updated 11/28/2026, 3:30:00 PM" is US-ordered, with seconds (OBSERVED).
- **Hidden tabs on phones.** The scrolling tab strip hides "Impact" and "Insights" off-screen (OBSERVED at 390).
- **The plan builds nothing until submitted.** The right side reads "Choose a profile and generate" (OBSERVED).

### 2.5 Data-integrity concerns

| Concern | Status |
|---|---|
| **It computes a "CPCB AQI" from model concentrations** ("calculated by this app… using CPCB breakpoints"). It is disclosed, but it is exactly what AirAware must not do (AGENTS.md §5) | OBSERVED (footer and assistant footnote) |
| **The answer mixes two scales** into one phrase, "Poor to Very Unhealthy" (a CPCB band plus a US EPA band) | OBSERVED (§2.2) |
| **Health claim:** "the air can cause respiratory discomfort for everyone" | OBSERVED |
| **The limits box says "Measurements are modelled"**, calling model output "measurements" | OBSERVED |
| **"Is it safe to run outside at 7pm?"** is offered as a starter question; the landing demo also uses it | OBSERVED. AirAware bans "safe" in UI copy |
| **Weather as a cause:** "avoiding outdoor physical exertion while winds remain low at 2.9 km/h" ties action to wind | OBSERVED. AirAware never infers pollution from weather (owner rule; J26 D3 sends no weather context to Claude) |
| **The plan form asks for health conditions** ("Asthma or allergies", "Pregnancy") | OBSERVED (not submitted). AGENTS.md §7: "Do not collect medical diagnoses" |
| **Clear source and "not a station" labelling on every figure**, plus a footer disclosure | OBSERVED (a strength) |
| **"India 24 h standard, 60 µg/m³" drawn on the chart**, the same limit AirAware uses (`airCheck.ts:7-11`, per LIVE_SITE_AUDIT §6) | OBSERVED (a strength) |

### 2.6 What AirAware should learn / avoid

| | Item | Status for AirAware |
|---|---|---|
| Learn | Compact context above the Ask box | Shipped as a text line (`current/ask-1440.jpg`). RECOMMENDED, a polish option: render the existing line as small chips (place · "Model forecast" · retrieved time · "Not current" when stale). Same data, no new numbers; needs an owner decision |
| Learn | A "What Ask will not do" short list near the box or on Privacy | New, needs an owner decision. J5 ruled out a disclosure line under the box, so this would sit in a fold or on Privacy |
| Learn | A per-answer limits note | Shipped: closed "Sources and limitations" (J6, J11; `SourcesPanel.tsx:19`) |
| Learn | Show what the AI received | Partly shipped ("Based on" line, J23). RECOMMENDED: an optional fold, "What Claude saw", listing the rule-card ids and forecast fields actually sent (J26 D2). New, needs an owner decision |
| Avoid | Any computed CPCB or US AQI, mixed band names, "safe" prompts, "measurements" for model data, live/observed wording | Forbidden |
| Avoid | Health-condition questions in household answers | Forbidden (AGENTS.md §7) |
| Avoid | The name and look of this site | Same product name. RECOMMENDED: AirAware's sky-and-city backdrop (H4, H5) and navy header stay the visual signature; no editorial serif plus photo hero |

---

## 3. UrbanAir AI: https://urban-air-ai.vercel.app/ai

**Pages captured:**

| Page | 1440 | 390 |
|---|---|---|
| AI Advisor (`/ai`), empty | `refs/urbanair-ai-1440-first.jpg`, `-1440.jpg` | `refs/urbanair-ai-390-first.jpg`, `-390.jpg` |
| AI Advisor after one question | `refs/urbanair-ask-response-1440.jpg` | `refs/urbanair-ask-response-390.jpg` |
| Landing (`/`) | `refs/urbanair-landing-1440-first.jpg`, `-1440.jpg` | `refs/urbanair-landing-390-first.jpg`, `-390.jpg` |
| Responsible AI (`/responsible-ai`) | `refs/urbanair-responsible-ai-1440-first.jpg`, `-1440.jpg` | `refs/urbanair-responsible-ai-390-first.jpg`, `-390.jpg` |
| How it works (`/how-it-works`) | `refs/urbanair-how-it-works-1440-first.jpg`, `-1440.jpg` | `refs/urbanair-how-it-works-390-first.jpg`, `-390.jpg` |
| Sources (`/sources`) | `refs/urbanair-sources-1440-first.jpg`, `-1440.jpg` | `refs/urbanair-sources-390-first.jpg`, `-390.jpg` |

**Not opened:** `/explore`, `/dashboard`, `/compare`, `/learn`, `/sdg-11`, `/location/*`, the theme toggle, the search dialog, the mobile menu and the "Guardrail Verification Playground" buttons.

**A full-page capture artifact:** in the full-page screenshots the fixed header is drawn mid-page (for example `refs/urbanair-ask-response-1440.jpg`). Do not treat this as a site defect.

### 3.1 Observed features

| Feature | What was seen | Evidence |
|---|---|---|
| Glowing "smart city" style | Dark green-black background, a gradient headline ("story in its air"), a glass header bar, monospace data labels, a floating "Ask about your city's air ✦" button on every page | `refs/urbanair-landing-1440-first.jpg` |
| Hero reading card | "Living City Sensor Grid", "Stale environmental data", "184 · Unhealthy", "US EPA AQI", 4 pollutant tiles, "Updated yesterday · Source: Open-Meteo", "This reading may not represent current conditions." | same |
| Ask links from content | Every lesson card has "Ask AI about this →", which opens `/ai?q=<prefilled question>`. Comparison and city sections link the same way | landing link list |
| AI Advisor page | Heading "Ask UrbanAir AI", an "Active Context: Delhi" pill, 4 suggested inquiries (one is "What is the current AQI of Delhi?"), a greeting message, and a single-line input | `refs/urbanair-ai-1440-first.jpg` |
| A "data → understanding" pipeline diagram | 5 stages: Raw data → Context → Knowledge (RAG) → AI interpretation → Understanding | `refs/urbanair-how-it-works-1440-first.jpg` |
| Responsible AI page | 4 pillars (Fairness, Transparency, Ethics, Privacy) and an evaluation table of 7 test queries, each marked "Passed", including a medical refusal and a missing-sensor case | `refs/urbanair-responsible-ai-1440.jpg` |
| Sources page | 6 "Verified Reference Registry" entries, each with publisher, date, a quote, "Method: manual-curation", "Verified: 2026-08-30". The quotes and dates were not checked against the originals. It gives Open-Meteo's licence as "Open Database License (ODbL)"; AirAware's own credit says CC BY 4.0 (`current/ask-1440.jpg`). The licence was not re-checked here | `refs/urbanair-sources-1440.jpg` |
| Missing data shown honestly | The comparison table has "— not reported" / "Missing metric handled honestly" | landing |
| Footer disclosures | A boxed "Medical Disclaimer"; "Privacy: Local theme preferences only (No PII stored)" | any page |

### 3.2 The question asked, exactly as it happened

- **Sent:** "How is the air today?" in the `/ai` input, then Send, at 10:10:32 UTC.
- **Seen:** the user bubble, then a loading line, "Resolving location context, fetching verified telemetry, and formulating insight…" (`refs/urbanair-ask-response-1440.jpg`).
- **The answer was not observed.** The capture script stopped about 5 s after sending because it took the loading line as the answer. This was a fault in the script, not in the site.
- The question was not sent again: the one-question limit was kept.
- No completed AI request appeared in the network log. The log records only finished responses, and the browser closed while a request may still have been pending. So **this is not evidence that no request was made.**
- **What the site claims, not observed:** the landing's "Sample conversation" shows a reply of the form "Based on current telemetry, the selected location reports an Unhealthy AQI of 164 (US EPA AQI). PM2.5 levels are elevated relative to WHO 24-hr guidelines (15 µg/m³)", followed by "Data: AQI · PM2.5 · PM10 / Sources: WHO · EPA". The site also claims a "Why did AI give this answer?" drawer on every answer.

### 3.3 Strongest interaction patterns

1. **"Ask about this" links next to every piece of learning content, with the question filled in.** They link Learn to Ask in one tap (OBSERVED).
2. **A public methodology page and a test table** ("Expected system behavior" for each case). It works as a trust surface (OBSERVED).
3. **A sources registry** with date, quote and verification method for each source (OBSERVED).
4. **A stale-data warning on the reading card itself** (OBSERVED: "Stale environmental data", "This reading may not represent current conditions").
5. **An "Active Context" pill** that names the place the assistant is using (OBSERVED).

### 3.4 Weaknesses

- **Inconsistent numbers on one page.** The hero says 184 and "Updated yesterday". The section below shows the same 184 and "Updated 8 minutes ago". "The problem" and the comparison sections say 164 and PM2.5 72 µg/m³. The city cards say Delhi 164 (OBSERVED, landing text).
- **Visible internal spec references** in user copy: "see §32 for the exact refusal pattern", "§24", "§31" (OBSERVED).
- **Odd message times.** The greeting is stamped "07:40 PM" and the user's message "03:40 PM" in the same session (OBSERVED, `urbanair-ask.json`).
- **Mobile first screen of `/ai`.** In this headless capture it opened scrolled to the input and footer, with the heading and suggestions above the fold (`refs/urbanair-ai-390-first.jpg`) (OBSERVED once; the cause, likely auto-scroll on load, is INFERRED).
- **The floating AI button overlaps content.** On the 390 landing it covers part of the "184 · Unhealthy" badge (`refs/urbanair-landing-390-first.jpg`), and it still shows on the AI page itself (OBSERVED).
- **Dense marketing language.** "Telemetry", "Context Engine", "RAG", "SDG 11.6" all appear on the first screen (OBSERVED).

### 3.5 Data-integrity concerns

| Concern | Status |
|---|---|
| **AQI as the headline number:** "AQI 164 Unhealthy", "Everyone may begin to experience health effects", and a suggested question "What is the current AQI of Delhi?" | OBSERVED |
| **"MEASURED TELEMETRY", "Living City Sensor Grid", "reported by sensor stations"** beside "Source: Open-Meteo", which serves CAMS model data | Wording OBSERVED. That the values are modelled is INFERRED from the named source |
| **"Never generates a number"**, yet 164/72 appear in sections that do not match the live 184/68.9 | OBSERVED. INFERRED: the 164/72 figures and the city cards (links carry `lat=0&lng=0`) are static examples, not labelled as demo data |
| **Mixed freshness:** "Stale… Updated yesterday" and "Updated 8 minutes ago" for the same reading | OBSERVED |
| **"Exceeding WHO safety guidelines"**, "health risk" framing | OBSERVED |
| **Sources registry and medical disclaimer** | Both exist (OBSERVED). The pattern is a strength; the registry's content is unverified |

### 3.6 What AirAware should learn / avoid

| | Item | Status for AirAware |
|---|---|---|
| Learn | "Ask about this" from Better Habits and "Why?" panels, filling the Ask box (not sending) | New, needs an owner decision. It must reuse approved starter or rule wording (the J26 follow-ups stay non-AI). Pre-filling only, so the user still presses Send |
| Learn | A public "How AirAware answers" page: what Claude receives, what the rules decide, what is never sent, and what it will not do | Partly shipped: Privacy states what Claude receives (J26 D7). RECOMMENDED: a short methodology section, linked from Ask, with no evaluation "Passed" badges unless they come from real test runs |
| Learn | A sources list with retrieval dates | Shipped in part ("Sources and limitations", footer credit J16). Adding a date per source is new |
| Learn | Naming the active place in Ask | Shipped ("Using: the Pune… model forecast", `current/ask-1440.jpg`) |
| Avoid | AQI headlines, "sensor"/"measured" for model data, unlabelled static numbers, conflicting timestamps, spec section numbers in copy, a floating button over data | Forbidden or RECOMMENDED never |

---

## 4. Comparison table (three references and AirAware)

AirAware cells cite current source, owner decisions or captures. Reference cells are OBSERVED unless marked.

| Dimension | SaafSaans | Alternate "AirAware AI" | UrbanAir AI | **AirAware (this product)** |
|---|---|---|---|---|
| Headline air message | "89 AQI · Satisfactory" (CPCB band names) | "251 Very unhealthy" US AQI + "CPCB 228" computed | "184 · Unhealthy" US EPA AQI | "Forecast within India's 24-hour limits", no AQI (`current/today-390.jpg`; LIVE_SITE_AUDIT §6 `airCheck.ts:7-11`) |
| Model vs observation labelling | Source named (Google API); model or observation not stated | "Modelled… not a station measurement", but also "LIVE", "Observed", "Measurements" | "Measured telemetry", "sensor" with Open-Meteo | "Model forecast · Open-Meteo · retrieved HH:MM" on every value (LIVE_SITE_AUDIT §6; D4) |
| Stale handling | Not seen | Not seen (live at capture time) | "Stale environmental data" on the card; conflicts with "8 minutes ago" | "Not current" banner and markers (B4, B10, D5; `local-today-stale-*` in the 24 Nov audit) |
| AI role | "Gemini decides, code computes" | Gemini writes the full answer from server context | Gemini + RAG (claimed) | Approved (J26): Claude Haiku answers typed Ask questions from approved rule cards and today's forecast; rules own the numbers; medical questions call no AI. The J26 intro is in local source (`ask.ts:57`), but not in the live `current/ask-1440.jpg` capture, so J26 was not deployed on 28 Nov |
| Answer tested this session | No assistant found | Answered in about 7 s; mixed scales and a health claim | Loading line only; answer not observed | Not tested in this doc |
| Transparency surface | Method step + FACTORS.md | Grounding panel, "will not do" list, footer | Responsible AI page, sources registry, How it works | "Why?" panel, "Based on", "Sources and limitations", Privacy page (J6, J11, J23, J26 D7) |
| Household / family | Named members, per-person advice, sample family | 5-question profile including health conditions | None seen | 10 optional household questions (A5), no medical questions (AGENTS.md §7) |
| Indoor guidance | Diagram, window/purifier %, CADR calculator, smoke sources | Ventilate/seal call from outdoor PM2.5 | Not seen | My Home tab and indoor rule cards ("Cut indoor smoke at the source", `current/today-390.jpg`) |
| Planning by time of day | Cleanest/dirtiest hours chart; calendar export | Morning/afternoon/evening plan (needs submit) | Not seen | Daily plan sections (outdoors and travel, indoor air) on Today and My Home |
| Sustainable actions | CO₂ and dose numbers, community totals | Weekly CO₂ by mode with assumption | SDG 11 narrative | Better Habits with no invented savings (AGENTS.md §6) |
| Learn / education | Inline "What is…" folds | "You cannot see the air" essay | Air Quality 101 + "Ask AI about this" | Within "Why?" and Air quality details; no dedicated learn surface |
| Sharing / export | WhatsApp, calendar, print | None seen | None seen | None (no share or print code in `client/src`; grep, 28 Nov) |
| Languages | English, Hindi, Telugu | English | English | English |
| Privacy statement | Not checked | "Nothing is stored on a server" (plan) | "No PII stored" | Location only on request, about 1 km rounding, no account until save, one-step delete (LIVE_SITE_AUDIT §3.6) |
| Visual signature | Dark, single green accent, type-led | Light editorial, serif italic, haze photo | Neon dark "smart city", glow, gradient type | Sky and SVG city backdrop that follows the forecast level, weather and time of day (H4, H5; `current/ask-1440.jpg`) |
| Phone layout (390) | Step bar, single column, very long | Sideways tab strip hides tabs | Floating button overlaps data | Bottom bar with 5 destinations, 44 px targets, no overflow (LIVE_SITE_AUDIT §3.4) |

---

## 5. Recommendations for AirAware, consolidated (RECOMMENDED)

Each item reuses data AirAware already has, adds no AQI, dose or emissions figure, and keeps the five destinations. Items marked "new" need an owner decision before any build.

| # | Journey step | Recommendation | From | Status |
|---|---|---|---|---|
| R1 | UNDERSTAND | One "purpose / next step" line pair at the top of My Home and Better Habits | SaafSaans | Purpose shipped (E4); the next-step line is new |
| R2 | UNDERSTAND | No new sample mode. Keep the Landing's labelled past screenshot of Today (G3, G4) as the "see it first" path | SaafSaans | Shipped; a live demo would break DI-10 |
| R3 | ASK | The existing Ask context line as small chips (place · Model forecast · retrieved · Not current) | Alternate AirAware | New polish; same strings |
| R4 | ASK | "Ask about this" on "Why?" panels and Better Habits cards; fills the box with approved wording and does not send | UrbanAir | New |
| R5 | GET GUIDANCE | An optional "What Claude saw" fold under the first answer, listing what J26 D2 actually sends (rule card names, forecast fields), never the raw prompt | Alternate AirAware | New; must match the real server payload. Depends on J26, which is built locally but not seen in production |
| R6 | TAKE ACTION | An optional "I'll try this" tick on a plan card, kept in the browser only unless the user saves | SaafSaans | New; privacy rules apply (no account until save). Storage is owner decision O-5: 06 §4.6 recommends memory only for the visit, and doc 15 Q-16 allows no new browser storage key without a ruling |
| R7 | LEARN | A short "How AirAware answers" section (rules decide, Claude explains, what is never sent, what it will not do), linked from Ask and Privacy. **Location is not settled across docs:** 06 puts it on `/privacy`, 12 §4 in a closed fold on the Ask welcome card, 11 L3 on Landing. Owner picks one (14 D12) | UrbanAir, Alternate AirAware | New. J5 keeps it off the area under the box. It matches the master guide's `SourceAndMethodologyPanel` and its rule "Explain technical methodology later" (`AirAware_AI_UI_UX_Motion_3D_Claude_Code_Master_Guide.md:400,453`). Its Claude wording waits for the J26 deploy |
| R8 | All | Render every section at all times; use motion only for how it appears, and respect reduced motion | SaafSaans (avoid) | Consistent with LIVE_SITE_AUDIT §3.5 |
| R9 | All | Keep the sky-and-city signature; do not adopt neon glow, an editorial photo hero or the alternate site's styling | All three | Upholds H4 and H5 |

**Not to adopt in any form:**
- AQI numbers, bands or toggles;
- a computed CPCB index;
- "cleanest hours";
- dose %, "cigarettes' worth" or CO₂ savings;
- "live", "measured", "sensor" or "observed" for model data;
- "safe" prompts;
- health-condition questions;
- weather-as-cause answers;
- pre-ticked choices;
- spec section numbers in copy;
- "Passed" badges not tied to real test runs.

---

## 6. Not observed, failed or unverified

- **UrbanAir's answer** to the one question. Only the loading state was captured (§3.2); the question was not sent again.
- **SaafSaans:** setup flow, language switching, WhatsApp, calendar and print were not opened. Whether its AQI comes from Google or is computed by the site is not confirmed.
- **Alternate AirAware:** the `/dashboard`, `/indoor`, `/impact` and `/insights` pages were not opened (seen only as landing previews). The plan output was not generated (form). The mobile menu was not opened.
- **UrbanAir:** the explore, dashboard, compare, learn, SDG and location pages were not opened. The guardrail playground and the "Why did AI give this answer?" drawer were not exercised. The theme toggle was not tested.
- **Not measured on any reference:** keyboard order, focus visibility, reduced motion, 320/768/1280 widths, performance or accessibility (axe). Only sideways overflow was checked (none at 1440 or 390).
- **SaafSaans full-page screenshots** are blank below step 2 because of the site's on-screen-only rendering (§1.3). Use the `-view.jpg` shots.
- **AirAware J26 (Claude Ask):** built in local source, but not visible in the live `current/` capture (production, per `capture.mjs`). Not deployed as of 28 Nov, about 15:40 IST. A later deploy was not checked.
- **Not reconciled in full.** The reconcile pass grepped DESIGN.md, UX_AUDIT.md, the redesign docs and the specs for the R1 to R9 terms. `INFORMATION_ARCHITECTURE.md`, `WIREFRAMES.md` and the Ask UX spec were not read in full.
- **No timeouts, blank pages or blocks.** Every page returned HTTP 200 and rendered. The one rendering problem was SaafSaans showing off-screen steps only when scrolled into view; this was worked around with `ref-saaf-sections.mjs`.
- **Data values change hourly**, so every figure quoted here is as seen between about 15:37 and 15:44 IST on 28 Nov 2026.
