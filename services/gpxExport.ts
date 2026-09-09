/**
 * GPX Export Service
 * Generates industry-standard GPX 1.1 XML from GPS-tagged media items.
 * Compatible with Google Earth, Garmin, OsmAnd, Maps.me, etc.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface GpxPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  timestamp: number; // Unix ms
  name?: string;
  type?: 'photo' | 'video';
  accuracy?: number | null;
  speed?: number | null;
}

function isoTime(ms: number): string {
  return new Date(ms).toISOString();
}

function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildGpxXml(points: GpxPoint[], trackName = 'SmartGpsCam Track'): string {
  const wpts = points
    .map(
      (p) =>
        `  <wpt lat="${p.latitude.toFixed(8)}" lon="${p.longitude.toFixed(8)}">
    <ele>${p.altitude != null ? p.altitude.toFixed(2) : '0'}</ele>
    <time>${isoTime(p.timestamp)}</time>
    <name>${escXml(p.name ?? (p.type === 'video' ? 'Video' : 'Photo'))}</name>
    <sym>${p.type === 'video' ? 'Wpt Dot' : 'Camera'}</sym>
    <desc>Accuracy: ${p.accuracy != null ? `${p.accuracy.toFixed(0)}m` : 'N/A'} | Speed: ${p.speed != null ? `${(p.speed * 3.6).toFixed(1)} km/h` : 'N/A'}</desc>
  </wpt>`
    )
    .join('\n');

  const trkpts = points
    .map(
      (p) =>
        `      <trkpt lat="${p.latitude.toFixed(8)}" lon="${p.longitude.toFixed(8)}">
        <ele>${p.altitude != null ? p.altitude.toFixed(2) : '0'}</ele>
        <time>${isoTime(p.timestamp)}</time>
        <extensions>
          <speed>${p.speed != null ? (p.speed * 3.6).toFixed(2) : '0'}</speed>
          <accuracy>${p.accuracy != null ? p.accuracy.toFixed(1) : '0'}</accuracy>
        </extensions>
      </trkpt>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1"
  creator="SmartGpsCam"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escXml(trackName)}</name>
    <desc>Exported by SmartGpsCam on ${new Date().toISOString()}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
${wpts}
  <trk>
    <name>${escXml(trackName)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

export async function exportGpxFile(points: GpxPoint[]): Promise<{ success: boolean; error?: string }> {
  try {
    if (points.length === 0) return { success: false, error: 'No GPS-tagged media to export.' };

    const available = await Sharing.isAvailableAsync();
    if (!available) return { success: false, error: 'Sharing not available on this device.' };

    const xml = buildGpxXml(points, `SmartGpsCam_${new Date().toISOString().slice(0, 10)}`);
    const filename = `SmartGpsCam_${Date.now()}.gpx`;
    const path = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(path, xml, { encoding: FileSystem.EncodingType.UTF8 });

    await Sharing.shareAsync(path, {
      mimeType: 'application/gpx+xml',
      dialogTitle: 'Export GPX Track',
      UTI: 'public.gpx',
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Export failed.' };
  }
}
