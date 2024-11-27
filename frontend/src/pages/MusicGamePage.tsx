import React from 'react';
import { Container } from '@mui/material';
import { MusicGame } from '../components/MusicGame';

// Test data for "Stand By Me"
const testNotes = [
  { pitch: 'A', time: 0, duration: 1 },
  { pitch: 'C', time: 1, duration: 1 },
  { pitch: 'E', time: 2, duration: 1 },
  { pitch: 'A', time: 3, duration: 1 },
  { pitch: 'G', time: 4, duration: 1 },
  { pitch: 'F', time: 5, duration: 1 },
  { pitch: 'E', time: 6, duration: 1 },
  { pitch: 'D', time: 7, duration: 1 },
];

const scale = ['G', 'F', 'E', 'D', 'C', 'B', 'A'];

const MusicGamePage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <MusicGame
        notes={testNotes}
        bpm={80}
        scale={scale}
      />
    </Container>
  );
};

export default MusicGamePage;