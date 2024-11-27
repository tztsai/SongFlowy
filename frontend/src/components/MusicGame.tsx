import React, { useEffect, useRef, useState } from 'react';
import { Box, Grid, Paper, Typography, IconButton } from '@mui/material';
import { styled } from '@mui/system';
import { PlayArrow, Pause } from '@mui/icons-material';
import { useNoteAnimation } from '../hooks/useNoteAnimation';

interface Note {
  pitch: string;
  time: number;
  duration: number;
}

interface MusicGameProps {
  notes: Note[];
  bpm: number;
  scale: string[];
}

const GameContainer = styled(Box)({
  height: '80vh',
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#1a1a1a',
});

const NoteColumn = styled(Box)({
  position: 'relative',
  height: '100%',
  borderRight: '1px solid #333',
  '&:last-child': {
    borderRight: 'none',
  },
});

const NoteLabel = styled(Typography)({
  position: 'absolute',
  top: 0,
  width: '100%',
  textAlign: 'center',
  color: '#fff',
  padding: '4px 0',
  borderBottom: '1px solid #333',
  backgroundColor: '#1a1a1a',
  zIndex: 2,
});

const FallingNote = styled(Box)<{ $position: number }>(({ $position }) => ({
  position: 'absolute',
  width: '80%',
  left: '10%',
  height: '20px',
  backgroundColor: '#4CAF50',
  borderRadius: '4px',
  transform: `translateY(${$position}px)`,
}));

const HitLine = styled(Box)({
  position: 'absolute',
  bottom: '100px',
  width: '100%',
  height: '2px',
  backgroundColor: '#ff4444',
  zIndex: 1,
});

export const MusicGame: React.FC<MusicGameProps> = ({ notes, bpm, scale }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [visibleNotes, setVisibleNotes] = useState<(Note & { position: number; isActive: boolean })[]>([]);

  const { updateNotePositions } = useNoteAnimation(notes, bpm, isPlaying, {
    fallDuration: 3000, // 3 seconds to fall
    containerHeight: containerRef.current?.clientHeight || 800,
    hitLinePosition: containerRef.current?.clientHeight ? containerRef.current.clientHeight - 100 : 700,
  });

  // Handle keyboard input
  useEffect(() => {
    const keyMap: { [key: string]: string } = {
      'a': scale[0],
      's': scale[1],
      'd': scale[2],
      'f': scale[3],
      'g': scale[4],
      'h': scale[5],
      'j': scale[6],
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      const note = keyMap[e.key.toLowerCase()];
      if (note) {
        const activeNote = visibleNotes.find(n => n.isActive && n.pitch === note);
        if (activeNote) {
          setScore(prev => prev + 100); // Perfect hit
        } else {
          setScore(prev => Math.max(0, prev - 50)); // Miss
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [scale, visibleNotes]);

  return (
    <Paper elevation={3} sx={{ p: 2, bgcolor: '#000' }}>
      <Grid container spacing={2}>
        <Grid item xs={2}>
          {/* Chord Progression */}
          <Typography variant="h6" color="white">Chords</Typography>
          <IconButton onClick={() => setIsPlaying(!isPlaying)} color="primary">
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>
        </Grid>
        
        <Grid item xs={6}>
          {/* Music Tab */}
          <GameContainer ref={containerRef}>
            <Grid container sx={{ height: '100%' }}>
              {scale.map((note, index) => (
                <Grid item xs key={note} sx={{ height: '100%' }}>
                  <NoteColumn>
                    <NoteLabel>{note}</NoteLabel>
                    {visibleNotes
                      .filter(n => n.pitch === note)
                      .map((note, i) => (
                        <FallingNote
                          key={`${note.pitch}-${note.time}-${i}`}
                          $position={note.position}
                        />
                      ))}
                  </NoteColumn>
                </Grid>
              ))}
            </Grid>
            <HitLine />
          </GameContainer>
        </Grid>

        <Grid item xs={4}>
          {/* Style Controls */}
          <Typography variant="h6" color="white">Style</Typography>
          <Typography color="white">Score: {score}</Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};
