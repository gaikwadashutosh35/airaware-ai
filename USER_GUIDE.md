# AirAware AI — User Guide

**Getting around:** five places, in the bar at the bottom on a phone or at the top on a computer:
- **Today:** how your air is, one recommendation, and ways to get help.
- **My Home:** today's suggestions for your home, then ways to improve indoor air.
- **Better Habits:** small swaps that cut smoke and exhaust.
- **Ask AirAware:** being built.
- **My Profile:** your answers and saved plans.

**First visit:** three short steps (where, your day, your home), then Today. Steps 2 and 3 are optional and have **Skip**.
- **Remember on this device** is off unless you tick it. Ticking it keeps your answers and the city you searched for, so next time Today opens straight away.
- A location from **Use my location** is never kept.
- **Forget this place**, in My Profile, removes a remembered place.

If you arrive with a place already chosen, Today offers **Make it personal: 2 quick questions**.

## 1. Choose a location
Search for a city or area. You can use manual selection without sharing GPS. If you choose browser geolocation, the browser will ask for permission.

Once a place is chosen, the place button at the top shows it. Tap it to search again or use your location.

## 2. Today
Today answers "How is my air?" first, from top to bottom:
- **The verdict:** one sentence from the model forecast's 24-hour check against India's 24-hour limits, with a word tag and "Model forecast · Open-Meteo · updated {time}". When the forecast is old, a "Not current" line sits under it. While Today stays open, it reloads the forecast and rebuilds the plan once an hour.
- **Your recommendation for today:** one suggestion, with who made it (our rules or AI) and the safety note. **Why this recommendation?** shows its reason and sources; **See your full day** opens the rest of the plan (section 4).
- **What would you like help with?** Outdoor activities, My home, My family and Greener habits.
- **Ask AirAware anything:** type a question or pick a starter question.
- **Air quality details**, closed until you open it: the PM2.5 figure, the chart and tables, the forecast location, how the 24-hour check works, and the sources and limitations.

A forecast is not a station measurement. A pollutant concentration is not automatically the overall CPCB National AQI.

In Air quality details, the chart shows PM2.5 (solid line) and PM10 (dashed line) for the next 48 hours, with a written summary under it. The dotted "At load" line marks the hour the forecast loaded; the exact hourly values are in the table below it. If the page stays open for more than an hour, it says "Not current: retrieved more than an hour ago. Reload for the latest forecast."

## 3. Set optional preferences
In **My Profile**, choose only the context you want to share. The answers stay while you move around the app, even unsaved:
- Commute mode.
- Outdoor exercise habit.
- Cooking/ventilation context.
- Optional household preferences.
- Preferred language.

You can skip optional fields. Do not enter diagnoses or medical records.

## 4. Your daily plan
Today builds the plan by itself once it shows a place, using the answers on screen; you don't have to save them. It builds again when you change an answer, and once the plan is more than an hour old. If a build fails, **Try again** appears.

Today shows the plan's top suggestion. **See your full day** shows, in order:
- Who made it: our fixed rules, or AI that picked and timed our rules' advice (the advice text and sources are always ours).
- "Your day" (AI plans only), then Outdoors and travel, Indoor air and Sustainable swaps.

The air notice and the 24-hour air check are not repeated there: the verdict says the first, and Air quality details explains the second. The check compares the model forecast's 24-hour PM2.5 and PM10 averages with India's 24-hour limits. It is a model forecast for an area about 45 km wide, not a station measurement and not the CPCB AQI.

Open **Why?** on any card to see the reason, whether it rests on today's forecast check or general guidance, which of your answers it used, its sources and any caveat. If the forecast behind a plan is more than an hour old, the plan says so until Today builds a new one.

## 5. My Home
- **Today, for your home:** the indoor suggestions from today's plan, when there are any. My Home builds the plan too, if Today hasn't yet.
- **Ways to improve indoor air:** general guides in groups: Cooking and smoke, Ventilation, Dust and cleaning, Indoor habits, Filtration, and Near a busy road (only if you said your home is near one). A guide that repeats one of today's suggestions is left out.

Open **Why it matters** on any card for its reason and sources. The guides cite public sources such as India's Ministry of Health air-pollution advisory, WHO and the US EPA. They consider indoor sources and the air outside together: do not assume closing or opening windows is always correct.

## 6. Better Habits
General guides in four groups: Daily commuting and vehicle idling, Waste, Cooking, and Energy use. Each has **Why it matters** and its sources. Choose the changes that suit your life. The app never states how much pollution a change saves, because it has no documented way to calculate it.

## 7. Manage saved data
- **Save plan**, under See your full day, keeps the plan on this browser. The first save creates an anonymous account (no email, name or password).
- **Saved plans**, in My Profile, lists them, newest first. **Open** shows one below the list, under "Saved plan from …. This is a snapshot, not current air information."; **Close** puts it away. **Delete** removes one plan after a confirmation. You can keep up to 20.
- **Delete my saved data** (in Your household) removes your account, saved answers and saved plans.

## 8. Privacy
The **Privacy** link in every footer explains what stays in your browser, what Open-Meteo, Gemini and Supabase receive, and how to delete it.

## 9. Important limitation
AirAware AI provides general information, not medical diagnosis or treatment. It cannot guarantee an activity or place is safe. Follow local public-health advisories and consult qualified healthcare professionals for medical concerns.
