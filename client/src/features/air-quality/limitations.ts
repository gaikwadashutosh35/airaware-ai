// Always shown in "Sources and limitations", whatever loaded: what the
// numbers and the plan can't tell.
export const LIMITATIONS: readonly string[] = [
  'Forecasts are model estimates for an area about 45 km wide, not station measurements.',
  'We do not calculate the CPCB National AQI.',
  "The 24-hour check compares a model forecast with India's 24-hour limits; official compliance is judged on measured station data over a year.",
  'AI personalisation can be unavailable; plans then use our fixed rules only.',
];
