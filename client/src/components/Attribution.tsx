// Open-Meteo's terms require crediting Open-Meteo and CAMS (CC BY 4.0)
// wherever their data appears; static, so it shows even if /sources fails.
// The link's padding gives a 44 px target without moving the text, and
// relative keeps the next line's text from taking its lower half (R1 L4).
export function Attribution() {
  return (
    <p className="max-w-[70ch]">
      Air-quality forecasts from{' '}
      <a href="https://open-meteo.com/" className="relative py-3.5 underline">
        Open-Meteo.com
      </a>{' '}
      (CC BY 4.0), based on CAMS global forecasts from the Copernicus Atmosphere
      Monitoring Service.
    </p>
  );
}
