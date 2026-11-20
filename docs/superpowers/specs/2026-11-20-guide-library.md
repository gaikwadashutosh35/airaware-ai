# Guide Library (decision G1 A): wording and sources

**Status:** approved by the owner on 20 Nov 2026 ("Approve, start Phase 8"). This file fixes the guide cards' wording (DATA_GOVERNANCE.md §8): change it here first, then in `server/src/services/recommendations/guides.ts`.

**What a guide card is:** general guidance that applies on any day, with a neutral reason ("why it matters") and at least one cited source. It never uses the forecast, a pollutant value or a personal reason ("You said…"). In the app its "Based on" reads "general guidance", and its disclosure reads "Why it matters".

**Rules for every card:**
- No "safe", "healthy", "clean air", "good/bad air" or AQI.
- No emission-savings figures (no %, "per cent", kg or tonnes).
- No medical advice. Cards repeat what public advisories say, in their terms.
- Every source below was opened on 20 Nov 2026 and contains the statement it is cited for.

**Twins:** where a Phase 4 rule gives the same advice personally, the guide card names it. When today's plan shows that rule, My Home hides the guide card, so the advice never appears twice. Twin cards reuse the rule's reviewed title and text where they fit.

## Sources

| Id | Source | What it supports |
|---|---|---|
| `mohfw-air-advisory-2025` | Ministry of Health and Family Welfare (NCDC, NPCCHH), *Health Advisory on Air Pollution*, 2025. https://ncdc.mohfw.gov.in/uploads/pdf/air2.pdf | Check forecasts before outdoor activity; avoid exercising near heavy traffic; smokeless fuels (gas or electricity); no coils or incense in closed rooms; no smoking; wet mopping; ventilate but restrict when air quality is poor; no open burning; public transport; children and elderly away from smoke sources; the school gate and the trip to school; vulnerable groups and exertion. |
| `who-household-air` | WHO fact sheet, *Household air pollution*. https://www.who.int/news-room/fact-sheets/detail/household-air-pollution-and-health | Cooking with kerosene, wood, dung, crop waste or coal causes household air pollution; LPG and electricity are among the clean fuels. |
| `epa-indoor-pm` | US EPA, *Sources of Indoor Particulate Matter (PM)*. https://www.epa.gov/indoor-air-quality-iaq/sources-indoor-particulate-matter-pm | Use the range hood whenever cooking; dust with a damp cloth; ventilate when burning candles and incense; PM is higher near busy roads; children breathe more for their body mass. |
| `epa-air-cleaners` | US EPA, *Guide to Air Cleaners in the Home* (2nd ed., 2018). https://www.epa.gov/sites/default/files/2018-07/documents/guide_to_air_cleaners_in_the_home_2nd_edition.pdf | Portable cleaners filter one room; CADR large enough for the room; most effective with doors and windows closed; cannot remove all pollutants. |
| `epa-near-road-schools` | US EPA, *Best Practices for Reducing Near-Road Pollution Exposure at Schools* (2021). https://www.epa.gov/system/files/documents/2026-08/best-practices-for-reducing-near-road-pollution-exposure-at-schools.pdf | Higher particle levels near busy roads and idling vehicles, especially at rush hour; plan activity outside rush hour and drop-off/pick-up times; keep windows closed at peak traffic. |
| `pib-grap-stage1-2026` | PIB (CAQM), *CAQM invokes Stage-I of GRAP in Delhi-NCR…*, Oct 2026. https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2326133&reg=3&lang=1 | "Do not idle your vehicle, also turn off the engine at red lights"; public transport or pooling. |
| `swm-rules-2026` | Ministry of Environment, Forest and Climate Change, *Solid Waste Management Rules, 2026* (Gazette of India). https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/jan/doc2026129773501.pdf | Waste generators must not throw, burn or bury their waste on streets or open public spaces. |
| `bee-star-label` | Bureau of Energy Efficiency, *Standards & Labelling*. https://beeindia.gov.in/show_content.php?lang=1&level=1&ls_id=372&lid=322 | The star label helps people choose appliances by energy savings. |
| `pib-ac-default-2020` | PIB (Ministry of Power), *BEE Notifies New Energy Performance Standards for Air Conditioners*, 6 Jan 2020. https://www.pib.gov.in/PressReleasePage.aspx?PRID=1598508 | Star ratings reflect relative energy efficiency; room ACs default to 24 °C. |
| `bee-domestic-tips` | Bureau of Energy Efficiency, *Tips for Energy Conservation for Domestic*. https://beeindia.gov.in/sites/default/files/Download%20Tips%20for%20Energy%20Conservation%20for%20Domestic.pdf | Fans as the first line against summer heat; turn off lights when not required. |

**Narrowed or left out after checking the sources:**
- **Standby power and office equipment:** not confirmed in an Indian source, so the energy card covers lights only.
- **"Combine short journeys":** not confirmed in a source I opened, so the idling card covers switching off the engine, public transport and sharing rides.
- **Older adults and sensitive people:** the card uses the advisory's own words ("avoid prolonged or strenuous exertion outdoors"), not the softer "shorter, gentler" first drafted.
- **Busy roads:** the rush-hour timing comes from guidance written for schools near roads; the home card applies it to airing out a home.
- **Not used:** a WHO 2018 news release on children and CAQM's full GRAP schedule. The sources above cover the same points.

---

## My Home (`topic=home`)

### Cooking and smoke

**`guide.kitchen-exhaust`** · twin `indoor.cooking-exhaust`
- **Title:** Use the kitchen exhaust while cooking
- **Text:** Switch the exhaust or chimney on before you start cooking and leave it running for a few minutes after.
- **Why it matters:** Cooking gives off smoke and fine particles, and removing them where they start comes first.
- **Caveat:** Some kitchen hoods recirculate air instead of venting it outside.
- **Sources:** `epa-indoor-pm`, `mohfw-air-advisory-2025`

**`guide.cleaner-fuel`** · twin `indoor.cleaner-fuel` · also under Better Habits, "Cooking"
- **Title:** Consider a cleaner cooking fuel where possible
- **Text:** Wood, dung or crop waste fires make a lot of indoor smoke. Where it is practical, cooking with LPG or electricity cuts this smoke at the source.
- **Why it matters:** Cooking with wood, dung, crop waste, coal or kerosene is a major cause of household air pollution.
- **Caveat:** Until then, good kitchen ventilation and keeping others away from the stove help.
- **Sources:** `who-household-air`, `mohfw-air-advisory-2025`

### Ventilation

(On days above the limit, the plan's "Ventilate for indoor sources, not by habit" shows under "Today, for your home".)

**`guide.ventilate-sources`** · no twin · also an Ask card (Phase 7, windows)
- **Title:** Air out while you cook or burn incense
- **Text:** Open windows or switch on an exhaust fan while you cook or burn incense or candles. When the air outside is poor, keep windows open for shorter spells.
- **Why it matters:** Fresh air carries indoor smoke away, but on polluted days it also brings outdoor particles in.
- **Caveat:** There is no single rule for windows: it depends on what is happening indoors and outside.
- **Sources:** `mohfw-air-advisory-2025`, `epa-indoor-pm`

### Dust and cleaning

**`guide.damp-cleaning`** · no twin
- **Title:** Clean with a damp cloth or mop
- **Text:** Dust surfaces with a damp cloth and mop floors instead of sweeping them dry.
- **Why it matters:** Dry sweeping and dusting lift settled dust back into the air.
- **Sources:** `epa-indoor-pm`, `mohfw-air-advisory-2025`

### Indoor habits

**`guide.smoke-sources`** · twin `indoor.smoke-sources` (the rule's own text and reason)
- **Title:** Cut indoor smoke at the source
- **Text:** Incense, mosquito coils, candles and tobacco all add smoke indoors. Using them less, or not indoors, is the simplest indoor-air step.
- **Why it matters:** These are common indoor pollution sources in any home.
- **Sources:** `mohfw-air-advisory-2025`, `epa-indoor-pm`

### Filtration

**`guide.purifier`** · twin `indoor.purifier`
- **Title:** If you use an air purifier, match it to the room
- **Text:** A portable purifier cleans the air of one room. Choose one rated for that room's size, and keep its doors and windows closed while it runs.
- **Why it matters:** A purifier works best in a closed room that matches its rating.
- **Caveat:** A purifier does not remove every pollutant.
- **Sources:** `epa-air-cleaners`

### Near a busy road (shown only if you answered yes)

**`guide.busy-road`** · twin `home.busy-road` (the rule's own text)
- **Title:** Near a busy road, air out at quieter times
- **Text:** Air beside busy roads usually carries more traffic exhaust, especially at rush hour. When you air out your home, quieter traffic times are a better choice where possible.
- **Why it matters:** Particle pollution is higher near busy roads, especially during morning and evening rush hours.
- **Sources:** `epa-indoor-pm`, `epa-near-road-schools`

---

## Better Habits (`topic=habits`)

### Daily commuting and vehicle idling

**`guide.no-idling`** · twin `swap.fewer-car-trips`
- **Title:** Switch off the engine while you wait
- **Text:** Turn the engine off at red lights and while waiting, instead of idling. For some trips, public transport or sharing a ride may be practical.
- **Why it matters:** An idling engine adds exhaust to the air around you and the people nearby.
- **Caveat:** We do not estimate emission savings, because we have no documented method for your vehicle and trips.
- **Sources:** `pib-grap-stage1-2026`, `mohfw-air-advisory-2025`

### Waste

**`guide.no-open-burning`** · twin `swap.no-open-burning` (the rule's own text)
- **Title:** Don't burn waste or leaves
- **Text:** Hand waste and garden leaves to municipal collection or composting instead of burning them; open burning adds smoke for the whole neighbourhood.
- **Why it matters:** India's Solid Waste Management Rules, 2026 say households must not burn their waste on streets or in open public spaces.
- **Sources:** `swm-rules-2026`, `mohfw-air-advisory-2025`

### Cooking

`guide.cleaner-fuel`, as under My Home.

### Energy use

**`guide.star-label`** · no twin
- **Title:** Choose star-labelled appliances
- **Text:** When you buy an appliance, compare its Bureau of Energy Efficiency star label: more stars means it uses less electricity for the same job.
- **Why it matters:** The star label rates similar appliances by how efficiently they use electricity.
- **Sources:** `bee-star-label`, `pib-ac-default-2020`

**`guide.fans-and-ac`** · no twin
- **Title:** Use fans first, and keep the AC at 24 °C
- **Text:** A ceiling or table fan is the first line against the heat. When you use an AC, keep it at its 24 °C default rather than colder.
- **Why it matters:** Room ACs sold in India are set to 24 °C by default under the Bureau of Energy Efficiency's standards for using less energy.
- **Sources:** `pib-ac-default-2020`, `bee-domestic-tips`

**`guide.lights-off`** · no twin
- **Title:** Switch off lights you are not using
- **Text:** Turn lights off when you leave a room or no longer need them.
- **Why it matters:** It is the simplest energy step in any home.
- **Sources:** `bee-domestic-tips`

---

## Ask topics (written now, served in Phase 7)

**`guide.check-forecast`** · twin `exercise.check-conditions` · outdoor plans
- **Title:** Check the air before a long outdoor activity
- **Text:** Before a long or hard outdoor session, check the forecast and local air-quality advisories, and follow what they advise for the day.
- **Why it matters:** India's health advisory asks people to follow local air-quality forecasts before planning outdoor activity.
- **Sources:** `mohfw-air-advisory-2025`

**`guide.away-from-traffic`** · twin `commute.lower-traffic` · outdoor plans
- **Title:** Choose routes and times away from heavy traffic
- **Text:** Where you can, walk, exercise or commute along quieter streets, and outside morning and evening rush hours.
- **Why it matters:** Particle pollution is higher near busy roads, especially during rush hours.
- **Sources:** `mohfw-air-advisory-2025`, `epa-near-road-schools`

**`guide.children`** · no twin · family
- **Title:** Plan children's outdoor play away from traffic and smoke
- **Text:** Choose play spots away from busy roads and from burning or other smoke, and keep children away from cooking and other smoke sources at home.
- **Why it matters:** Children breathe more air for their body size than adults, so they take in more of what is in it.
- **Sources:** `epa-indoor-pm`, `mohfw-air-advisory-2025`

**`guide.older-sensitive`** · no twin · family
- **Title:** Older adults and sensitive people: follow the day's advisory
- **Text:** On days above the limit, India's health advisory asks older adults and people who may be more sensitive to avoid prolonged or strenuous exertion outdoors.
- **Why it matters:** The advisory names older people among the groups more affected by air pollution.
- **Sources:** `mohfw-air-advisory-2025`

**`guide.school-run`** · twin `school.less-roadside-waiting` (the rule's own title and text) · family
- **Title:** Less waiting beside busy roads on the school run
- **Text:** Where you can, wait for school transport or pick-ups away from the roadside, and follow any advisory from the school or local authorities.
- **Why it matters:** Health guidance names the trip to school and the school gate as places to take care, because busy roads and idling vehicles raise particle levels.
- **Sources:** `mohfw-air-advisory-2025`, `epa-near-road-schools`

`guide.ventilate-sources` (above) also answers the windows topic.

**Count:** 17 cards. My Home 7, Better Habits 6 (one shared with My Home), Ask 5 plus the shared ventilation card.
