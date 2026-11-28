// Open-Meteo's terms require crediting Open-Meteo and CAMS (CC BY 4.0)
// wherever their data appears; static, so it shows even if /sources fails.
// An invisible ::before gives the link a 44 px target while its own box,
// and so its focus ring, stays the size of the text (R1 L4, J29 2b).
export function Attribution() {
  return (
    <p className="max-w-[70ch]">
      Air-quality forecasts from{' '}
      <a
        href="https://open-meteo.com/"
        className="relative underline before:absolute before:inset-x-0 before:-inset-y-3.5"
      >
        Open-Meteo.com
      </a>{' '}
      (CC BY 4.0), based on CAMS global forecasts from the Copernicus Atmosphere
      Monitoring Service.
    </p>
  );
}
