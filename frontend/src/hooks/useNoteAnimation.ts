import { useEffect, useRef } from 'react';

interface Note {
  pitch: string;
  time: number;
  duration: number;
}

interface AnimationConfig {
  fallDuration: number; // Time in ms for note to fall from top to bottom
  containerHeight: number;
  hitLinePosition: number;
}

export const useNoteAnimation = (
  notes: Note[],
  bpm: number,
  isPlaying: boolean,
  config: AnimationConfig
) => {
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  const updateNotePositions = (currentTime: number) => {
    const elapsedTime = currentTime - startTimeRef.current;
    const pixelsPerMs = config.containerHeight / config.fallDuration;
    
    return notes.map(note => {
      const noteStartTime = (note.time * 60000) / bpm; // Convert beats to ms
      const position = (elapsedTime - noteStartTime) * pixelsPerMs;
      
      return {
        ...note,
        position,
        isVisible: position >= -50 && position <= config.containerHeight + 50,
        isActive: Math.abs(position - config.hitLinePosition) < 30, // Hit window
      };
    }).filter(note => note.isVisible);
  };

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    startTimeRef.current = performance.now();
    let visibleNotes: (Note & { position: number; isActive: boolean })[] = [];

    const animate = (timestamp: number) => {
      visibleNotes = updateNotePositions(timestamp);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, notes, bpm, config]);

  return {
    updateNotePositions,
  };
};
