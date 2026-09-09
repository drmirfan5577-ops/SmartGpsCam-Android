/**
 * Geocoding Service — Real location names via OpenStreetMap Nominatim (no API key needed)
 * Returns: display name, city, state, country, country code, plus code
 * Includes offline tile caching via expo-file-system
 */
import * as FileSystem from 'expo-file-system';

export interface ReverseGeoResult {
  displayName: string;      // "Kacha Khuh, Punjab, Pakistan"
  shortName: string;        // "Kacha Khuh, Punjab"
  city: string;             // "Kacha Khuh"
  state: string;            // "Punjab"
  country: string;          // "Pakistan"
  countryCode: string;      // "PK"
  countryFlag: string;      // 🇵🇰
  plusCode: string;         // "94FR+G4C"
  fullAddress: string;      // "94FR+G4C, Kacha Khuh, Punjab, Pakistan"
  latitude: number;
  longitude: number;
}

// Country code → flag emoji
function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    upper.charCodeAt(0) - 65 + 0x1f1e6,
    upper.charCodeAt(1) - 65 + 0x1f1e6
  );
}

// Open Location Code (Plus Code) generator
// Based on https://github.com/google/open-location-code
const CODE_ALPHABET = '23456789CFGHJMPQRVWX';
const ENCODING_BASE = 20;
const PAIR_CODE_LENGTH = 10;
const GRID_CODE_LENGTH = 5;

export function encodePlusCode(lat: number, lng: number, codeLength = 8): string {
  lat = lat + 90;
  lng = lng + 180;

  if (lat < 0) lat = 0;
  if (lng < 0) lng = 0;

  let latVal = Math.floor(lat * 8000 * 3200);
  let lngVal = Math.floor(lng * 4000 * 3200);

  let code = '';
  for (let i = 0; i < Math.ceil(codeLength / 2); i++) {
    code = CODE_ALPHABET[lngVal % ENCODING_BASE] + code;
    lngVal = Math.floor(lngVal / ENCODING_BASE);
    code = CODE_ALPHABET[latVal % ENCODING_BASE] + code;
    latVal = Math.floor(latVal / ENCODING_BASE);
  }

  // Format with + after 4th character
  let result = '';
  for (let i = 0; i < code.length; i++) {
    if (i === 4) result += '+';
    result += code[i];
  }

  return result.slice(0, codeLength <= 8 ? 9 : codeLength + 1);
}

let lastFetch = 0;
let lastKey = '';
let cachedResult: ReverseGeoResult | null = null;

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeoResult | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;

  // Cache: don't re-fetch same area within 30s
  if (key === lastKey && cachedResult && Date.now() - lastFetch < 30000) {
    return cachedResult;
  }

  // Rate limit: Nominatim allows 1 req/sec
  const now = Date.now();
  if (now - lastFetch < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - (now - lastFetch)));
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SmartGpsCam/1.0',
        Accept: 'application/json',
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};

    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.hamlet ||
      addr.suburb ||
      addr.county ||
      '';
    const state = addr.state || addr.region || '';
    const country = addr.country || '';
    const countryCode = (addr.country_code || '').toUpperCase();
    const countryFlag = countryCodeToFlag(countryCode);

    const plusCode = encodePlusCode(lat, lng, 8);
    const displayName = [city, state, country].filter(Boolean).join(', ');
    const shortName = [city, state].filter(Boolean).join(', ');
    const fullAddress = [plusCode, city, state, country].filter(Boolean).join(', ');

    const result: ReverseGeoResult = {
      displayName,
      shortName,
      city,
      state,
      country,
      countryCode,
      countryFlag,
      plusCode,
      fullAddress,
      latitude: lat,
      longitude: lng,
    };

    lastKey = key;
    lastFetch = Date.now();
    cachedResult = result;
    return result;
  } catch {
    return null;
  }
}

// Format timezone offset string from device
export function getTimezoneOffsetString(): string {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return `GMT ${sign}${h}:${m}`;
}

// Full timestamp string: "Friday, 03/07/2026 03:00 PM GMT +05:00"
export function formatGpsTimestamp(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[date.getDay()];
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  const h = date.getHours();
  const min = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const tz = getTimezoneOffsetString();
  return `${dayName}, ${mm}/${dd}/${yyyy} ${String(hour12).padStart(2, '0')}:${min} ${ampm} ${tz}`;
}

// Compute OSM tile x/y from lat/lng
function tileXY(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

// Static map tile URL (OpenStreetMap)
export function getStaticMapUrl(lat: number, lng: number, zoom = 15): string {
  const { x, y } = tileXY(lat, lng, zoom);
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

// In-memory URI cache (local path or remote URL)
const tileUriCache = new Map<string, string>();
const tileDir = `${FileSystem.cacheDirectory ?? ''}sgc_tiles/`;

// Returns a local file URI for the tile (downloads & caches if not present)
export async function getCachedTileUri(lat: number, lng: number, zoom = 15): Promise<string> {
  const { x, y } = tileXY(lat, lng, zoom);
  const cacheKey = `${zoom}_${x}_${y}`;

  // 1. In-memory hit
  if (tileUriCache.has(cacheKey)) return tileUriCache.get(cacheKey)!;

  const localPath = `${tileDir}${cacheKey}.png`;

  try {
    // 2. Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(tileDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(tileDir, { intermediates: true });
    }

    // 3. Check if file already cached on disk
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      tileUriCache.set(cacheKey, localPath);
      return localPath;
    }

    // 4. Download and cache
    const remoteUrl = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
    const result = await FileSystem.downloadAsync(remoteUrl, localPath);
    if (result.status === 200) {
      tileUriCache.set(cacheKey, result.uri);
      return result.uri;
    }
    return remoteUrl; // fallback to remote
  } catch {
    // Offline or error — return remote URL (will fail gracefully in Image)
    const fallback = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
    return fallback;
  }
}
