import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  ButtonGroup,
  CircularProgress,
  Typography,
  Alert,
} from '@mui/material';
import { 
  MusicNote as MusicNoteIcon,
  GraphicEq as GraphicEqIcon,
  AudioFile as AudioFileIcon,
  NoteAlt as NoteAltIcon,
} from '@mui/icons-material';

interface MusicAnalysisControlsProps {
  audioFile: File | null;
  onAnalyze: (type: 'pitch' | 'transcribe' | 'sheet') => Promise<void>;
  isAnalyzing: boolean;
  error: string | null;
}

const MusicAnalysisControls: React.FC<MusicAnalysisControlsProps> = ({
  audioFile,
  onAnalyze,
  isAnalyzing,
  error,
}) => {
  const [activeAnalysis, setActiveAnalysis] = useState<'pitch' | 'transcribe' | 'sheet' | null>(null);

  const handleAnalyze = async (type: 'pitch' | 'transcribe' | 'sheet') => {
    setActiveAnalysis(type);
    await onAnalyze(type);
    setActiveAnalysis(null);
  };

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <Typography variant="h6" gutterBottom>
        Music Analysis Tools
      </Typography>
      
      <ButtonGroup 
        variant="contained" 
        aria-label="music analysis options"
        sx={{ mb: 2 }}
      >
        <Button
          startIcon={<GraphicEqIcon />}
          onClick={() => handleAnalyze('pitch')}
          disabled={!audioFile || isAnalyzing}
          color={activeAnalysis === 'pitch' ? 'secondary' : 'primary'}
        >
          Analyze Pitch
        </Button>
        <Button
          startIcon={<AudioFileIcon />}
          onClick={() => handleAnalyze('transcribe')}
          disabled={!audioFile || isAnalyzing}
          color={activeAnalysis === 'transcribe' ? 'secondary' : 'primary'}
        >
          Transcribe Audio
        </Button>
        <Button
          startIcon={<NoteAltIcon />}
          onClick={() => handleAnalyze('sheet')}
          disabled={!audioFile || isAnalyzing}
          color={activeAnalysis === 'sheet' ? 'secondary' : 'primary'}
        >
          Generate Sheet Music
        </Button>
      </ButtonGroup>

      {isAnalyzing && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CircularProgress size={24} />
          <Typography>
            {activeAnalysis === 'pitch' && 'Analyzing pitch...'}
            {activeAnalysis === 'transcribe' && 'Transcribing audio...'}
            {activeAnalysis === 'sheet' && 'Generating sheet music...'}
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default MusicAnalysisControls;
