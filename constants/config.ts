export type ResolutionKey = 'HD' | 'Full HD' | '2K' | '4K' | '8K';

export const RESOLUTIONS: Record<ResolutionKey, { width: number; height: number; label: string }> = {
  HD: { width: 1280, height: 720, label: '1280 × 720' },
  'Full HD': { width: 1920, height: 1080, label: '1920 × 1080' },
  '2K': { width: 2560, height: 1440, label: '2560 × 1440' },
  '4K': { width: 3840, height: 2160, label: '3840 × 2160' },
  '8K': { width: 7680, height: 4320, label: '7680 × 4320' },
};

export const DEFAULT_RESOLUTION: ResolutionKey = 'Full HD';

export type CaptureMode = 'photo' | 'video';
export type FlashMode = 'off' | 'on' | 'auto';
export type CameraFacing = 'front' | 'back';
