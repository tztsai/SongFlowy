import React, { useState, useCallback } from 'react';
import { 
  Box, 
  Button, 
  CircularProgress, 
  Typography, 
  Paper,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import AudioPreview from './AudioPreview';

const VisuallyHiddenInput = styled('input')`
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  bottom: 0;
  left: 0;
  white-space: nowrap;
  width: 1px;
`;

const UploadContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  maxWidth: 600,
  margin: '0 auto',
  marginTop: theme.spacing(4),
}));

interface ProcessedAudio {
  tempo: number;
  key: string;
  processed_path: string;
  message: string;
  pitches?: any;
  transcription?: any;
  musicxml_path?: string;
}

interface AudioUploadProps {
  onFileSelect: (file: File) => void;
  error?: string | null;
}

const AudioUploadComponent: React.FC<AudioUploadProps> = ({ onFileSelect, error }) => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac']
    },
    maxFiles: 1,
  });

  return (
    <Box>
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: 'primary.main',
          },
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop the audio file here' : 'Upload Audio File'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Drag and drop an audio file here, or click to select
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Supported formats: MP3, WAV, M4A, AAC
        </Typography>
        <Button
          variant="contained"
          component="span"
          sx={{ mt: 2 }}
        >
          Select File
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {selectedFile && <AudioPreview file={selectedFile} />}
    </Box>
  );
};

const AudioUpload: React.FC<AudioUploadProps> = ({ onFileSelect }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [processedAudio, setProcessedAudio] = useState<ProcessedAudio | null>(null);
  const [errorState, setError] = useState<string | null>(null);

  const handleFileChange = (file: File) => {
    setFile(file);
    file && onFileSelect(file);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('请选择一个音频文件');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProcessedAudio(response.data);
    } catch (err) {
      setError('处理音频时出错，请重试');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UploadContainer elevation={3}>
      <Typography variant="h5" gutterBottom>
        上传歌曲
      </Typography>
      
      <Box sx={{ my: 3 }}>
        <AudioUploadComponent onFileSelect={handleFileChange} error={errorState} />
      </Box>

      <Box sx={{ my: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={!file || loading}
        >
          {loading ? <CircularProgress size={24} /> : '开始分析'}
        </Button>
      </Box>

      {processedAudio && (
        <Box sx={{ mt: 3, textAlign: 'left' }}>
          <Typography variant="h6" gutterBottom>
            分析结果
          </Typography>

          <Typography variant="subtitle1" gutterBottom>
            调性: {processedAudio.key}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            节奏: {Math.round(processedAudio.tempo)} BPM
          </Typography>
        </Box>
      )}
    </UploadContainer>
  );
};

export default AudioUpload;
