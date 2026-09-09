import { useState, useRef, useCallback } from 'react';
import { CameraView } from 'expo-camera';

export type SegmentDuration = 1 | 5 | 10; // minutes

export interface LoopSegment {
  index: number;
  uri: string;
  savedAt: number;
  duration: number;
}

const MAX_SEGMENTS = 6; // keep last N segments

interface UseDashcamLoopProps {
  cameraRef: React.RefObject<CameraView>;
  onSegmentSaved: (uri: string, segIndex: number) => void;
  onError: (msg: string) => void;
}

export function useDashcamLoop({ cameraRef, onSegmentSaved, onError }: UseDashcamLoopProps) {
  const [isLooping, setIsLooping] = useState(false);
  const [segmentDuration, setSegmentDuration] = useState<SegmentDuration>(1);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [segments, setSegments] = useState<LoopSegment[]>([]);
  const [elapsedInSegment, setElapsedInSegment] = useState(0);

  const loopingRef = useRef(false);
  const segIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pruneOldSegments = useCallback((segs: LoopSegment[]): LoopSegment[] => {
    if (segs.length <= MAX_SEGMENTS) return segs;
    return segs.slice(segs.length - MAX_SEGMENTS);
  }, []);

  const recordSegment = useCallback(async () => {
    if (!cameraRef.current || !loopingRef.current) return;

    const idx = segIndexRef.current;
    setCurrentSegment(idx);
    setElapsedInSegment(0);

    // Start elapsed ticker for this segment
    timerRef.current = setInterval(() => {
      setElapsedInSegment((e) => e + 1);
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: segmentDuration * 60,
      });

      if (timerRef.current) clearInterval(timerRef.current);

      if (video && loopingRef.current) {
        const seg: LoopSegment = {
          index: idx,
          uri: video.uri,
          savedAt: Date.now(),
          duration: segmentDuration * 60,
        };
        setSegments((prev) => pruneOldSegments([...prev, seg]));
        onSegmentSaved(video.uri, idx);
        segIndexRef.current = idx + 1;

        // Chain next segment
        if (loopingRef.current) {
          recordSegment();
        }
      }
    } catch {
      if (timerRef.current) clearInterval(timerRef.current);
      if (loopingRef.current) {
        onError('Segment recording failed, retrying...');
        // Retry after brief delay
        setTimeout(() => {
          if (loopingRef.current) recordSegment();
        }, 1500);
      }
    }
  }, [cameraRef, segmentDuration, onSegmentSaved, onError, pruneOldSegments]);

  const startLoop = useCallback(async () => {
    if (isLooping) return;
    loopingRef.current = true;
    segIndexRef.current = 0;
    setIsLooping(true);
    setSegments([]);
    setCurrentSegment(0);
    recordSegment();
  }, [isLooping, recordSegment]);

  const stopLoop = useCallback(async () => {
    loopingRef.current = false;
    setIsLooping(false);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await cameraRef.current?.stopRecording();
    } catch {
      // ignore
    }
  }, [cameraRef]);

  return {
    isLooping,
    segmentDuration,
    setSegmentDuration,
    currentSegment,
    segments,
    elapsedInSegment,
    startLoop,
    stopLoop,
  };
}
