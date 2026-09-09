import { useState, useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';

export interface GpsStamp {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
}

export interface MediaItem {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  duration?: number;
  createdAt: number;
  filename: string;
  gps?: GpsStamp;
  resolution?: string;
  loopSegment?: number; // dashcam segment index
}

export function useMediaLibrary() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [hasPermission, setHasPermission] = useState(false);

  const requestPermission = useCallback(async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    const granted = status === 'granted';
    setHasPermission(granted);
    return granted;
  }, []);

  const saveMedia = useCallback(
    async (
      uri: string,
      type: 'photo' | 'video',
      opts?: { gps?: GpsStamp; resolution?: string; loopSegment?: number }
    ): Promise<MediaItem | null> => {
      try {
        let granted = hasPermission;
        if (!granted) granted = await requestPermission();
        if (!granted) return null;

        const asset = await MediaLibrary.createAssetAsync(uri);
        const item: MediaItem = {
          id: asset.id,
          uri: asset.uri,
          type,
          duration: asset.duration > 0 ? asset.duration : undefined,
          createdAt: asset.creationTime,
          filename: asset.filename,
          gps: opts?.gps,
          resolution: opts?.resolution,
          loopSegment: opts?.loopSegment,
        };
        setMediaItems((prev) => [item, ...prev]);
        return item;
      } catch {
        return null;
      }
    },
    [hasPermission, requestPermission]
  );

  const deleteMedia = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await MediaLibrary.deleteAssetsAsync([id]);
        setMediaItems((prev) => prev.filter((m) => m.id !== id));
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const loadRecentMedia = useCallback(async () => {
    let granted = hasPermission;
    if (!granted) granted = await requestPermission();
    if (!granted) return;

    const result = await MediaLibrary.getAssetsAsync({
      mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
      sortBy: MediaLibrary.SortBy.creationTime,
      first: 100,
    });

    const items: MediaItem[] = result.assets.map((a) => ({
      id: a.id,
      uri: a.uri,
      type: a.mediaType === 'video' ? 'video' : 'photo',
      duration: a.duration > 0 ? a.duration : undefined,
      createdAt: a.creationTime,
      filename: a.filename,
    }));
    setMediaItems(items);
  }, [hasPermission, requestPermission]);

  return {
    mediaItems,
    hasPermission,
    saveMedia,
    deleteMedia,
    loadRecentMedia,
    requestPermission,
  };
}
