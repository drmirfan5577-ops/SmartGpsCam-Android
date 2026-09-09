/**
 * GPS Watermark Service
 * Burns GPS coordinates, timestamp, resolution and accuracy
 * into captured photos using react-native-view-shot + expo-image-manipulator.
 *
 * Strategy: render an offscreen View (photo + text overlay), capture it,
 * save the result. This avoids native canvas dependencies.
 */

export interface WatermarkData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  resolution: string;
  timestamp: Date;
}

/** Format a coordinate value for display */
export function formatCoordWatermark(val: number, isLat: boolean): string {
  const dir = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
  return `${Math.abs(val).toFixed(6)}\u00b0 ${dir}`;
}

/** Format timestamp as ISO-like string for watermark */
export function formatTimestampWatermark(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** Build lines of watermark text */
export function buildWatermarkLines(data: WatermarkData): string[] {
  return [
    `LAT  ${formatCoordWatermark(data.latitude, true)}`,
    `LON  ${formatCoordWatermark(data.longitude, false)}`,
    `ALT  ${data.altitude != null ? `${data.altitude.toFixed(1)} m` : '--- m'}`,
    `SPD  ${data.speed != null ? `${(data.speed * 3.6).toFixed(1)} km/h` : '--- km/h'}`,
    `ACC  ${data.accuracy != null ? `\u00b1${data.accuracy.toFixed(0)} m` : '---'}`,
    `RES  ${data.resolution}`,
    formatTimestampWatermark(data.timestamp),
  ];
}
