import React, { useState } from 'react';
import { 
  Container, 
  Paper, 
  Box,
  Typography,
  Divider,
} from '@mui/material';
import MusicAnalysisControls from '../components/MusicAnalysisControls';
import SheetMusic from '../components/SheetMusic';
import AudioUpload from '../components/AudioUpload';

interface AnalysisResults {
  pitch?: {
    frequencies: number[];
    times: number[];
    plot?: string;
  };
  transcription?: {
    text: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  };
  musicxml_path?: string;
}

const MusicAnalysis: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResults>({});

  const handleFileUpload = (file: File) => {
    setAudioFile(file);
    setResults({});
    setError(null);
  };

  const handleAnalyze = async (type: 'pitch' | 'transcribe' | 'sheet') => {
    if (!audioFile) return;

    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', audioFile);

    try {
      let endpoint = '';
      switch (type) {
        case 'pitch':
          endpoint = '/api/analyze_pitch';
          break;
        case 'transcribe':
          endpoint = '/api/transcribe';
          break;
        case 'sheet':
          endpoint = '/api/sheet-music';
          break;
      }

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      
      setResults(prev => ({
        ...prev,
        [type]: data,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Music Analysis Studio
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <AudioUpload onFileSelect={handleFileUpload} />
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <MusicAnalysisControls
            audioFile={audioFile}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            error={error}
          />
        </Paper>

        {results.musicxml_path && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Sheet Music
            </Typography>
            <SheetMusic musicXmlPath={results.musicxml_path} />
          </Paper>
        )}

        {results.transcription && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Transcription
            </Typography>
            <Typography variant="body1">
              {results.transcription.text}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Segments:
            </Typography>
            {results.transcription.segments.map((segment, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  [{segment.start.toFixed(2)}s - {segment.end.toFixed(2)}s]
                </Typography>
                <Typography variant="body1">
                  {segment.text}
                </Typography>
              </Box>
            ))}
          </Paper>
        )}

        {results.pitch && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pitch Analysis
            </Typography>
            <Box 
              component="img" 
              src={`data:image/png;base64,${results.pitch.plot}`}
              sx={{ width: '100%', height: 'auto' }}
              alt="Pitch analysis plot"
            />
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default MusicAnalysis;
