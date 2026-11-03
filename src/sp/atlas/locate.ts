/* Find the person for a map pin: precise GPS first; indoors or on a slow
   phone, fall back to the network position. Every failure returns a plain
   sentence saying what to do instead. */

export function locateMe(onFound: (lat: number, lng: number) => void, onFail: (message: string) => void) {
  if (typeof navigator === "undefined" || !navigator.geolocation || !window.isSecureContext) {
    onFail("This browser cannot share your location. Search for the street or landmark instead.");
    return;
  }
  const ok = ({ coords }: GeolocationPosition) => onFound(coords.latitude, coords.longitude);
  const fail = (e: GeolocationPositionError) => onFail(e.code === e.PERMISSION_DENIED
    ? "Location is blocked for this site. Allow location in your browser settings, or search for the place."
    : "Could not find you just now. Try again outdoors, or search for the street or landmark.");
  navigator.geolocation.getCurrentPosition(ok, (e) => {
    if (e.code === e.PERMISSION_DENIED) { fail(e); return; }
    navigator.geolocation.getCurrentPosition(ok, fail, { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 });
  }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
}
