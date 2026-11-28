# AirAware AI — Privacy and Data Minimization

## 1. Principles
- Collect the minimum information required.
- Make location sharing optional.
- Manual location search is always available.
- Do not collect diagnoses or medical records.
- Use clear purpose explanations for household preferences.
- Make retention and deletion behavior transparent.
- Avoid personal data in logs and analytics.

## 2. Location
- Ask permission before browser geolocation.
- Explain why location is requested.
- Support manual city/area selection.
- Use coordinates transiently for a request where possible.
- Do not save exact coordinates unless the user explicitly saves a location.
- Provide a way to delete saved locations.
- Avoid exposing precise user coordinates in shared links or public cards.

## 3. Household context
Potential optional fields: commute mode, outdoor exercise habit, nearby busy road, cooking fuel category, exhaust availability, air purifier availability, presence of children/older adults, and broad sensitivity preference.

Do not ask for diagnoses. Avoid inferring a condition from preferences. Give users the choice to skip every optional field.

## 4. Conversations and plans
- Bound stored conversation context.
- Avoid saving raw conversations unless required for a user-requested feature.
- Clearly state what is stored.
- Allow deletion of saved plans and preferences.
- Never put raw user prompts or profile data into public analytics.
- Apply access controls to all stored records.

**What is stored (as built, Phase 6).**
- **Where:** in Supabase (Postgres, South Asia (Mumbai) region), only after the person clicks a save button or ticks "Remember on this device" in Welcome.
- **The account:** an anonymous one, with no email, name or password.
- **Saved household answers:** commute mode, outdoor exercise, school travel, busy road, cooking fuel, kitchen exhaust, air purifier, children, older adults, and "may be more sensitive". There is no health information.
- **Saved daily plans:** the plan the server built, including the place label the person chose, the model-forecast check and the sources. There are no coordinates.
- **Remembered place (Phase 5, D2):** only when the person ticks "Remember on this device".
  - **Stored:** the searched city or area's label and its geocoder coordinates at 2 decimals (about 1 km), saved with the answers.
  - **Never stored:** a place from "Use my location".
  - **Updates:** a new searched place replaces it.
  - **Removal:** "Forget this place" in My Profile removes it, and so does "Delete my saved data". This is the explicit location save that §2 allows.
- **Not stored by the app:** device coordinates, email, name and chat.
- **Ask AirAware questions (Phase 7):** a typed question goes to our server, in the request body, and on to Claude (Anthropic) alone, which writes the answer. With it go up to 2 earlier questions from this visit (re-checked for medical words, which are dropped), the forecast check and the suggestion text. It is never logged, stored, cached by its text or sent to Gemini; Claude's answer may restate it. The place name, coordinates and raw household answers are never sent. Anthropic's terms, checked 28 Nov 2026: API inputs and outputs are deleted within 30 days (https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data), with exceptions to enforce its usage policy or by law, and are not used to train its models by default (https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training). Answers stay in the page's memory for the visit (at most 10) and are gone after a reload, a new place or "Delete my saved data". Nothing is written to browser storage.
- **Stored by Supabase Auth:** the sign-in session, including the IP address and browser user agent. It is deleted with the account. Supabase's own auth audit log and platform logs may also record the IP address, and those entries are not removed when the account is deleted.
- **Who can read it:** through the app, only that browser's session; database row-level security and a server token check both enforce this. The project owner and Supabase, as the hosting provider, can also access the database.
- **Retention:** kept until the person uses "Delete my saved data". That deletes the account, the session, the saved answers and the saved plans, but not Supabase's own logs. Clearing browser data loses access to the account but does not delete the rows. A nightly job deletes anonymous accounts that have not been used for 30 days, together with their saved answers and plans.
- **Logs:** server logs never contain tokens, user ids, household answers, labels or plan contents.

## 5. Logs and analytics
Allowed operational metadata should be minimal: request ID, route name, latency, provider status, and error code. Avoid full coordinates, tokens, API keys, household flags, and raw prompt contents.

Use aggregation or coarse location where analytics truly require it.

## 6. Third-party services
Document each provider, data sent, purpose, retention/terms, and configuration. Do not send unnecessary household context to an AI provider. Only send the minimum validated context needed to generate recommendations.

- **Weather (Open-Meteo).** The server asks Open-Meteo's weather forecast for the same rounded coordinates (2 decimals, about 1 km) as the air forecast. Nothing else is sent, and nothing is stored.
- **Place name (Google Maps Geocoding).** After "Use my location", the server asks Google Maps for the town or city at the same rounded coordinates (2 decimals, about 1 km). Nothing else is sent. The name is shown on Today beside a "Google Maps" credit; it is not cached, not stored, and never sent on with a plan or question. Without the owner's `GOOGLE_MAPS_API_KEY`, no request is made.
- **Fire hotspots (NASA FIRMS).** The server asks NASA FIRMS for active-fire detections in a box about 100 km wide around the same rounded coordinates. Nothing else is sent. Answers are cached for 30 minutes per rounded place, in server memory only. Without the owner's `FIRMS_MAP_KEY`, no request is made.
- **Plan writers (Gemini, then Claude).** Each gets the same minimal context: the air level, the PM2.5/PM10 checks, and the rules' candidate suggestions. It gets no place name, no coordinates, no time window and no raw household answers. Gemini (Google) is asked first. Claude (Anthropic) is asked only when Gemini gives no accepted answer, and only if the owner has added an Anthropic key. Neither answer is logged. For a typed Ask AirAware question only Claude is used, and it also gets the question and up to 2 earlier questions from the visit (re-checked for medical words); medical and out-of-scope questions call neither. Claude's answer may restate the question. Anthropic's 30-day and no-training terms are in §4 (checked 28 Nov 2026: https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data and https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training).

## 7. User controls
The product should provide:
- Location permission status.
- Edit preferences.
- Delete saved location.
- Delete daily plan.
- Delete profile/account and associated data according to documented cascade/retention rules.
- Privacy explanation and external provider disclosure.

## 8. Incident response
If user data or credentials are exposed:
1. Stop the exposure.
2. Revoke/rotate credentials.
3. Preserve safe incident evidence without copying sensitive data.
4. Identify affected records and scope.
5. Notify affected parties where required by applicable policy/law.
6. Fix and verify the root cause.
7. Document the incident and prevention measures.

This document is an engineering privacy baseline, not legal advice. Review applicable laws and provider terms before public launch.
