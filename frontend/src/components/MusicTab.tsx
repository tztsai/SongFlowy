import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import * as Tone from 'tone';

const PianoRoll = () => {
  const [notes, setNotes] = useState([
    { id: 1, pitch: 'C4', time: 0, duration: 1 },
    { id: 2, pitch: 'E4', time: 1, duration: 1 },
    { id: 3, pitch: 'G4', time: 2, duration: 1 },
  ]);

  const handleNoteDrag = (id, newTime, newPitch) => {
    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === id
          ? { ...note, time: newTime, pitch: newPitch }
          : note
      )
    );
  };

  const playNotes = async () => {
    const synth = new Tone.Synth().toDestination();
    Tone.Transport.schedule(() => {
      notes.forEach((note) => {
        synth.triggerAttackRelease(note.pitch, note.duration, Tone.now() + note.time);
      });
    });
    Tone.Transport.start();
  };

  return (
    <div>
      <button onClick={playNotes}>Play</button>
      <Canvas style={{ height: '300px', background: '#ccc' }}>
        {notes.map((note) => (
          <InteractiveNote
            key={note.id}
            note={note}
            onDrag={handleNoteDrag}
          />
        ))}
      </Canvas>
    </div>
  );
};

const InteractiveNote = ({ note, onDrag }) => {
  const handlePointerMove = (event) => {
    const newTime = event.point.x.toFixed(2);
    const newPitch = Math.round(event.point.y); // Simulating pitch adjustments
    onDrag(note.id, newTime, `C${newPitch}`);
  };

  return (
    <Box
      position={[note.time, note.pitch.charCodeAt(1) - 48, 0]}
      onPointerMove={handlePointerMove}
    >
      <meshStandardMaterial attach="material" color="orange" />
    </Box>
  );
};

export default PianoRoll;
