// Open-Meteo's terms require crediting Open-Meteo and CAMS (CC BY 4.0)
// wherever their data appears; static, so it shows even if /sources fails.
export function Attribution() {
  return (
    <p className="max-w-[70ch]">
      Air-quality forecasts from{' '}
      <a href="https://open-meteo.com/" className="underline">
        Open-Meteo.com
      </a>{' '}
      (CC BY 4.0), based on CAMS global forecasts from the Copernicus Atmosphere
      Monitoring Service.
    </p>
  );
}
