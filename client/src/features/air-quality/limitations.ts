// What the numbers and the plan can't tell. The first two repeat what every
// forecast's own limitations say; the app-only two are what no forecast
// line covers.
export const APP_LIMITATIONS: readonly string[] = [
  "The 24-hour check compares a model forecast with India's 24-hour limits; official compliance is judged on measured station data over a year.",
  'AI personalisation can be unavailable; plans then use our fixed rules only.',
];

// Shown when no forecast has loaded.
export const LIMITATIONS: readonly string[] = [
  'Forecasts are model estimates for an area about 45 km wide, not station measurements.',
  'We do not calculate the CPCB National AQI.',
  ...APP_LIMITATIONS,
];
