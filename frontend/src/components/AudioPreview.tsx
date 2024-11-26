import React, { useRef, useState, useEffect } from 'react';
import { 
  Box, 
  IconButton, 
  Slider, 
  Typography,
  Paper,
} from '@mui/material';
import { 
  PlayArrow, 
  Pause, 
  VolumeUp, 
  VolumeOff,
} from '@mui/icons-material';

interface AudioPreviewProps {
  file: File;
}

const AudioPreview: React.FC<AudioPreviewProps> = ({ file }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audioUrl = URL.createObjectURL(file);
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
    }
    return () => URL.revokeObjectURL(audioUrl);
  }, [file]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSliderChange = (_: Event, newValue: number | number[]) => {
    const time = newValue as number;
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (_: Event, newValue: number | number[]) => {
    const vol = newValue as number;
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      audioRef.current.volume = newMuted ? 0 : volume;
      setIsMuted(newMuted);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2, 
        bgcolor: 'background.default',
        borderRadius: 2,
        mt: 2 
      }}
    >
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <IconButton 
          onClick={handlePlayPause}
          color="primary"
          size="large"
        >
          {isPlaying ? <Pause /> : <PlayArrow />}
        </IconButton>
        
        <Box sx={{ flex: 1, mx: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {file.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              {formatTime(currentTime)}
            </Typography>
            <Slider
              value={currentTime}
              onChange={handleSliderChange}
              max={duration}
              sx={{ mx: 2 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {formatTime(duration)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 100 }}>
          <IconButton onClick={toggleMute} size="small">
            {isMuted ? <VolumeOff /> : <VolumeUp />}
          </IconButton>
          <Slider
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            min={0}
            max={1}
            step={0.01}
            sx={{ ml: 1 }}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default AudioPreview;
