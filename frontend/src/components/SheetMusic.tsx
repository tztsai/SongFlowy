import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

interface SheetMusicProps {
  musicXmlPath?: string;
}

const SheetMusic: React.FC<SheetMusicProps> = ({ musicXmlPath }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);

  useEffect(() => {
    if (!containerRef.current || !musicXmlPath) return;

    const loadMusicXML = async () => {
      try {
        // Initialize OSMD if not already initialized
        if (!osmdRef.current) {
          osmdRef.current = new OpenSheetMusicDisplay(containerRef.current!, {
            autoResize: true,
            drawTitle: true,
            drawSubtitle: true,
            drawComposer: true,
            drawLyricist: true,
            drawCredits: true,
            drawTimeSignatures: true,
          });
        }

        // Fetch and load the MusicXML file
        const response = await fetch(`http://localhost:5000/uploads/${musicXmlPath.split('/').pop()}`);
        const xmlText = await response.text();
        
        // Load and render the score
        await osmdRef.current.load(xmlText);
        osmdRef.current.render();
      } catch (error) {
        console.error('Error loading music sheet:', error);
      }
    };

    loadMusicXML();

    // Cleanup
    return () => {
      if (osmdRef.current) {
        osmdRef.current.clear();
      }
    };
  }, [musicXmlPath]);

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2,
        mt: 2,
        bgcolor: 'background.paper',
        borderRadius: 2
      }}
    >
      <Typography variant="h6" gutterBottom>
        乐谱
      </Typography>
      <Box 
        ref={containerRef}
        sx={{
          width: '100%',
          minHeight: 400,
          overflowX: 'auto',
          '& canvas': {
            maxWidth: '100%',
            height: 'auto'
          }
        }}
      />
    </Paper>
  );
};

export default SheetMusic;
