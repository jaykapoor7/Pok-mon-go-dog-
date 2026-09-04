/* ════════════════════════════════════════════════════════════════════
   Reading what the camera already recorded.

   A phone photo of a street dog usually carries the coordinates and the
   moment it was taken. Asking someone to drag a pin to a place their
   camera already knows is busywork, so this reads the GPS and timestamp
   straight out of the file.

   A small hand-rolled parser rather than a dependency: this walks the
   JPEG APP1/TIFF structure for four tags and nothing else, which is a
   fraction of what an EXIF library carries.

   Everything is best-effort. Screenshots, stripped uploads and
   privacy-preserving cameras have no EXIF at all, so every field is
   optional and the caller always has a manual path.
   ════════════════════════════════════════════════════════════════════ */

export type PhotoMeta = {
  lat?: number;
  lng?: number;
  takenAt?: Date;
};

/** IFD tag numbers we care about. */
const TAG_GPS_IFD = 0x8825;
const TAG_EXIF_IFD = 0x8769;
const TAG_DATETIME_ORIGINAL = 0x9003;
const GPS_LAT_REF = 1;
const GPS_LAT = 2;
const GPS_LNG_REF = 3;
const GPS_LNG = 4;

/** Degrees/minutes/seconds rationals → signed decimal degrees. */
function toDecimal(dms: number[], ref: string): number | undefined {
  if (dms.length < 3) return undefined;
  const [d, m, s] = dms;
  if (![d, m, s].every(Number.isFinite)) return undefined;
  const sign = ref === "S" || ref === "W" ? -1 : 1;
  return sign * (d + m / 60 + s / 3600);
}

export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  try {
    // EXIF lives near the front of the file; 256 KB is far more than enough
    // and avoids pulling a multi-megabyte photo into memory to read four tags.
    const buf = await file.slice(0, 262144).arrayBuffer();
    const view = new DataView(buf);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return {}; // not JPEG

    // Walk JPEG markers to find APP1 (EXIF).
    let offset = 2;
    let tiff = -1;
    while (offset + 4 < view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      const size = view.getUint16(offset + 2);
      if (marker === 0xe1) {
        // "Exif\0\0" then the TIFF header
        if (view.getUint32(offset + 4) === 0x45786966) {
          tiff = offset + 10;
        }
        break;
      }
      if (size < 2) break;
      offset += 2 + size;
    }
    if (tiff < 0 || tiff + 8 > view.byteLength) return {};

    const le = view.getUint16(tiff) === 0x4949; // "II" = little-endian
    const u16 = (o: number) => view.getUint16(o, le);
    const u32 = (o: number) => view.getUint32(o, le);

    /** Read one IFD, returning its tags as offset/type/count triples. */
    function readIfd(start: number) {
      const out = new Map<number, { type: number; count: number; at: number }>();
      if (start + 2 > view.byteLength) return out;
      const n = u16(start);
      for (let i = 0; i < n; i++) {
        const e = start + 2 + i * 12;
        if (e + 12 > view.byteLength) break;
        out.set(u16(e), { type: u16(e + 2), count: u32(e + 4), at: e + 8 });
      }
      return out;
    }

    /** Rational array (type 5) → numbers. */
    function rationals(entry: { count: number; at: number }): number[] {
      const ptr = tiff + u32(entry.at);
      const vals: number[] = [];
      for (let i = 0; i < entry.count; i++) {
        const o = ptr + i * 8;
        if (o + 8 > view.byteLength) break;
        const den = u32(o + 4);
        vals.push(den === 0 ? 0 : u32(o) / den);
      }
      return vals;
    }

    /** ASCII string (type 2). */
    function ascii(entry: { count: number; at: number }): string {
      const ptr = entry.count > 4 ? tiff + u32(entry.at) : entry.at;
      let s = "";
      for (let i = 0; i < entry.count; i++) {
        if (ptr + i >= view.byteLength) break;
        const c = view.getUint8(ptr + i);
        if (c === 0) break;
        s += String.fromCharCode(c);
      }
      return s;
    }

    const ifd0 = readIfd(tiff + u32(tiff + 4));
    const meta: PhotoMeta = {};

    // ── GPS ──
    const gpsPtr = ifd0.get(TAG_GPS_IFD);
    if (gpsPtr) {
      const gps = readIfd(tiff + u32(gpsPtr.at));
      const latE = gps.get(GPS_LAT);
      const lngE = gps.get(GPS_LNG);
      const latRefE = gps.get(GPS_LAT_REF);
      const lngRefE = gps.get(GPS_LNG_REF);
      if (latE && lngE && latRefE && lngRefE) {
        const lat = toDecimal(rationals(latE), ascii(latRefE));
        const lng = toDecimal(rationals(lngE), ascii(lngRefE));
        // A photo with 0,0 is a stripped or broken tag, not the Gulf of Guinea.
        if (lat && lng && Number.isFinite(lat) && Number.isFinite(lng)) {
          meta.lat = lat;
          meta.lng = lng;
        }
      }
    }

    // ── When it was taken ──
    const exifPtr = ifd0.get(TAG_EXIF_IFD);
    if (exifPtr) {
      const exif = readIfd(tiff + u32(exifPtr.at));
      const dt = exif.get(TAG_DATETIME_ORIGINAL);
      if (dt) {
        // EXIF format: "YYYY:MM:DD HH:MM:SS"
        const m = ascii(dt).match(
          /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
        );
        if (m) {
          const d = new Date(
            Number(m[1]), Number(m[2]) - 1, Number(m[3]),
            Number(m[4]), Number(m[5]), Number(m[6])
          );
          if (!Number.isNaN(d.getTime())) meta.takenAt = d;
        }
      }
    }

    return meta;
  } catch {
    // Malformed EXIF is common and never worth failing a report over.
    return {};
  }
}

/** Rough sanity check that a coordinate is inside India's bounding box. */
export function looksIndian(lat: number, lng: number): boolean {
  return lat > 6 && lat < 37 && lng > 67 && lng < 98;
}
