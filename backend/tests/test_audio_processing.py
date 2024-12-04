import os
import pytest
import numpy as np
import librosa
import soundfile as sf
import tempfile
import music21
import matplotlib.pyplot as plt
from app import app

plt.show = lambda *args, **kwargs: None

def visualize_audio(y, sr, title="Audio Waveform"):
    """Helper function to visualize audio data"""
    plt.figure(figsize=(12, 4))
    plt.plot(np.linspace(0, len(y)/sr, len(y)), y)
    plt.title(title)
    plt.xlabel('Time (s)')
    plt.ylabel('Amplitude')
    plt.show()

@pytest.fixture(scope="session")
def test_audio_params():
    """Fixture for test audio parameters"""
    return {
        'duration': 3.0,
        'sample_rate': 22050,
        'bpm': 120,
        'base_freq': 440.0  # A4 note
    }

@pytest.fixture(scope="session")
def test_file(test_audio_params):
    """Fixture to create a test audio file"""
    duration = test_audio_params['duration']
    sr = test_audio_params['sample_rate']
    bpm = test_audio_params['bpm']
    base_freq = test_audio_params['base_freq']
    
    # Generate time array
    t = np.linspace(0, duration, int(sr * duration))
    
    # Generate a simple melody with the specified BPM
    beats_per_second = bpm / 60
    beat_duration = 1 / beats_per_second
    num_beats = int(duration * beats_per_second)
    
    # Create a sequence of frequencies (simple melody)
    freqs = [base_freq * (2 ** (n/12)) for n in [0, 4, 7]]  # A major triad
    y = np.zeros_like(t)
    
    for i in range(num_beats):
        start_idx = int(i * beat_duration * sr)
        end_idx = int((i + 0.9) * beat_duration * sr)  # 0.9 for note separation
        if end_idx > len(t):
            break
        freq = freqs[i % len(freqs)]
        note = 0.5 * np.sin(2 * np.pi * freq * t[start_idx:end_idx])
        y[start_idx:end_idx] = note
    
    # Add some reverb effect
    reverb_length = int(0.1 * sr)  # 100ms reverb
    reverb = np.exp(-3 * np.linspace(0, 1, reverb_length))
    y = np.convolve(y, reverb, mode='same')
    
    # Create temporary directory if it doesn't exist
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
    
    # Save the test audio file
    test_file_path = os.path.join('uploads', 'test_audio.wav')
    sf.write(test_file_path, y, sr)
    
    return test_file_path

@pytest.fixture
def client():
    """Fixture for Flask test client"""
    return app.test_client()

@pytest.fixture
def upload_response(client, test_file):
    """Fixture for upload response"""
    with open(test_file, 'rb') as f:
        response = client.post(
            '/api/upload',
            data={'file': (f, 'test_audio.wav')}
        )
    assert response.status_code == 200
    return response.get_json()

@pytest.fixture
def audio_data(test_file):
    """Fixture for loaded audio data"""
    y, sr = librosa.load(test_file)
    return {'y': y, 'sr': sr}

def test_audio_upload_endpoint(upload_response):
    """Test the /api/upload endpoint with a test audio file"""
    assert 'tempo' in upload_response
    assert upload_response['tempo'] > 0, "Tempo should be greater than 0"
    assert upload_response['tempo'] < 300, "Tempo should be less than 300 BPM"
    assert 'key' in upload_response
    assert 'processed_path' in upload_response

def test_audio_loading(audio_data, test_audio_params):
    """Test audio file loading with librosa"""
    y, sr = audio_data['y'], audio_data['sr']
    assert sr == test_audio_params['sample_rate']
    assert len(y) > 0
    assert np.all(np.isfinite(y))
    
    # Visualize loaded audio for comparison
    visualize_audio(y, sr, "Loaded Audio Waveform")

def test_tempo_detection(upload_response):
    """Test tempo detection on test audio"""
    tempo = upload_response['tempo']
    assert tempo > 115, "Tempo should be close to 120 BPM"
    assert tempo < 125, "Tempo should be close to 120 BPM"

def test_harmonic_analysis(audio_data):
    """Test harmonic analysis on test audio"""
    y = audio_data['y']
    harmonic = librosa.effects.harmonic(y)
    assert len(harmonic) == len(y)
    assert np.all(np.isfinite(harmonic))
    
    # Visualize harmonic content
    visualize_audio(harmonic, audio_data['sr'], "Harmonic Content")

def test_chroma_feature_extraction(audio_data):
    """Test chroma feature extraction"""
    y = audio_data['y']
    sr = audio_data['sr']
    harmonic = librosa.effects.harmonic(y)
    chroma = librosa.feature.chroma_cqt(y=harmonic, sr=sr)
    assert chroma.shape[0] == 12  # 12 pitch classes
    assert np.all(np.isfinite(chroma))
    
    # Plot chroma features
    plt.figure(figsize=(12, 4))
    librosa.display.specshow(chroma, y_axis='chroma')
    plt.title('Chromagram')
    plt.colorbar()
    plt.show()

def test_note_to_midi():
    """Test note to MIDI conversion"""
    test_notes = ['C4', 'A4', 'Ab5']
    expected_midis = [60, 69, 80]
    for note, expected_midi in zip(test_notes, expected_midis):
        midi = librosa.note_to_midi(note)
        assert midi == expected_midi

def test_sheet_music_generation(test_file):
    """Test sheet music generation from test audio"""
    from app import audio_to_sheet_music
    
    # Convert test audio to sheet music
    score = audio_to_sheet_music(test_file)
    
    # Basic validation
    assert isinstance(score, music21.stream.Score)
    assert len(score.parts) > 0
    
    # Check if we have notes
    notes = score.flatten().notes
    assert len(notes) > 0
    
    # Verify tempo marking
    tempo = score.metronomeMarkBoundaries()[0][2]
    assert isinstance(tempo, music21.tempo.MetronomeMark)
    
    # Save score for visual inspection
    xml_path = os.path.join(os.path.dirname(test_file), 'test_sheet_music.xml')
    score.write('musicxml', xml_path)
    print(f"Sheet music saved to: {xml_path}")

def test_error_handling_no_file(client):
    """Test error handling when no file is provided"""
    response = client.post('/api/upload')
    assert response.status_code == 400
    data = response.get_json()
    assert 'error' in data

def test_error_handling_empty_file(client):
    """Test error handling with empty file"""
    response = client.post(
        '/api/upload',
        data={'file': (b'', '')}
    )
    data = response.get_json()
    assert response.status_code == 400
    assert 'error' in data
