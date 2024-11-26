import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  CircularProgress, 
  Typography, 
  Paper,
  Alert,
  Link
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';

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
}

const AudioUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedAudio, setProcessedAudio] = useState<ProcessedAudio | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setError(null);
    }
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
        <Button
          component="label"
          variant="contained"
          startIcon={<CloudUploadIcon />}
          disabled={loading}
        >
          选择音频文件
          <VisuallyHiddenInput
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
          />
        </Button>
      </Box>

      {file && (
        <Typography variant="body1" gutterBottom>
          已选择: {file.name}
        </Typography>
      )}

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

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {processedAudio && (
        <Box sx={{ mt: 3, textAlign: 'left' }}>
          <Typography variant="h6" gutterBottom>
            分析结果
          </Typography>
          <Typography>速度: {Math.round(processedAudio.tempo)} BPM</Typography>
          <Typography>调性: {processedAudio.key}</Typography>
          
          {processedAudio.message && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {processedAudio.message}
              <Link 
                href="https://github.com/Anjok07/ultimatevocalremovergui" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ ml: 1 }}
              >
                下载 Ultimate Vocal Remover
              </Link>
            </Alert>
          )}
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              音频预览:
            </Typography>
            <audio 
              controls 
              src={`http://localhost:5000/uploads/${processedAudio.processed_path.split('/').pop()}`} 
            />
          </Box>
        </Box>
      )}
    </UploadContainer>
  );
};

export default AudioUpload;
