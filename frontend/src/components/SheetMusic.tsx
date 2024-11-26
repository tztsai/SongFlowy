import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import Vex from 'vexflow';

interface SheetMusicProps {
  abcNotation: string;
}

const SheetMusic: React.FC<SheetMusicProps> = ({ abcNotation }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !abcNotation) return;

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Initialize VexFlow
    const { Renderer, Stave } = Vex.Flow;
    
    // Create renderer
    const renderer = new Renderer(
      containerRef.current,
      Renderer.Backends.SVG,
    );

    // Configure renderer
    const context = renderer.getContext();
    context.setFont('Arial', 10);

    // Create a stave
    const stave = new Stave(10, 40, 750);
    stave.addClef('treble').addTimeSignature('4/4');
    stave.setContext(context).draw();

    try {
      // Parse ABC notation and convert to VexFlow notes
      const parser = new Vex.Parser(Vex.Flow.Grammar);
      const notes = parser.parse(abcNotation).notes;

      // Create voice and add notes
      const voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
      voice.addTickables(notes);

      // Format and draw
      new VF.Formatter()
        .joinVoices([voice])
        .format([voice], 500);
      voice.draw(context, stave);
    } catch (error) {
      console.error('Error rendering sheet music:', error);
    }
  }, [abcNotation]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '400px',
        overflow: 'auto',
        bgcolor: 'background.paper',
        borderRadius: 1,
        boxShadow: 1,
        p: 2,
      }}
    />
  );
};

export default SheetMusic;
