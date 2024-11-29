from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import librosa
import numpy as np
import soundfile as sf
import whisper
import music21
import traceback
import logging
import plotly
import json

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def index():
    return jsonify({
        'status': 'ok',
        'message': 'Perfect Song Learning API is running',
        'endpoints': [
            '/api/upload',
            '/api/analyze_pitch',
            '/api/transcribe',
            '/api/sheet',
            '/uploads/<filename>'
        ]
    })

@app.route('/api/upload', methods=['POST'])
def upload_audio():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        # Save the uploaded file
        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)
        logging.info(f"File uploaded: {file.filename}")
        
        # Load and process the audio file
        y, sr = librosa.load(filepath)
        
        # Extract tempo
        tempo = librosa.beat.beat_track(y=y, sr=sr)[0]
        if isinstance(tempo, np.ndarray):
            tempo = float(tempo[0])
        logging.info(f"Tempo detected: {tempo}")
        
        # Get onset frames for timing information
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr, units='frames')
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)
        
        # Get the note sequence using pitch detection
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        notes = []
        
        for i in range(len(onset_frames)):
            start_frame = onset_frames[i]
            # Use next onset as end frame, or use the last frame if this is the last onset
            end_frame = onset_frames[i + 1] if i < len(onset_frames) - 1 else len(pitches[0])
            
            # Get the predominant pitch for this note segment
            segment_pitches = pitches[:, start_frame:end_frame]
            segment_magnitudes = magnitudes[:, start_frame:end_frame]
            
            # Find the pitch with highest magnitude
            max_magnitude_indices = segment_magnitudes.argmax(axis=0)
            pitch_values = [segment_pitches[max_magnitude_indices[j], j] for j in range(len(max_magnitude_indices))]
            pitch_values = [p for p in pitch_values if p > 0]  # Filter out zero pitches
            
            if pitch_values:
                # Use the most common pitch in the segment
                pitch = float(np.median(pitch_values))
                note_name = librosa.hz_to_note(pitch)
                
                # Calculate duration in seconds
                start_time = onset_times[i]
                end_time = onset_times[i + 1] if i < len(onset_times) - 1 else librosa.get_duration(y=y, sr=sr)
                duration_seconds = end_time - start_time
                
                # Convert duration and start time to beats
                duration_beats = (duration_seconds / 60) * tempo
                start_beats = (start_time / 60) * tempo
                
                notes.append({
                    'noteName': note_name.replace('♯', '#'),
                    'duration': duration_beats,
                    'start': start_beats
                })
        
        # Create a music21 score from notes for key analysis
        score = music21.stream.Score()
        for note in notes:
            score.append(music21.note.Note(note['noteName']))
        key = score.analyze('key')
        logging.info(f"Key detected: {key}")
        
        logging.info("Analysis completed.")
        
        return jsonify({
            'tempo': tempo,
            'key': str(key),
            'notes': notes,
            'filepath': filepath
        })
        
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze_pitch', methods=['POST'])
def analyze_pitch():
    """Analyze pitch of an audio file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    filepath = request.files['path']

    try:
        # Load the audio file
        y, sr = librosa.load(filepath)
        
        # Extract pitch and timing information
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        
        # Get time points for the pitch values
        times = librosa.times_like(pitches)
        
        # For each frame, find the pitch with highest magnitude
        pitch_values = []
        for i in range(len(pitches[0])):
            index = magnitudes[:,i].argmax()
            pitch = pitches[index,i]
            if pitch > 0:  # Only include valid pitches
                note = librosa.hz_to_note(pitch)
                pitch_values.append(note)
        
        # Create a plotly plot of the pitch contour
        pitch_contour = plotly.graph_objs.Scatter(
            x=times,
            y=pitches[magnitudes.argmax(axis=0), range(pitches.shape[1])],
            mode='lines',
            name='Pitch Contour'
        )

        layout = plotly.graph_objs.Layout(
            title='Pitch Contour',
            xaxis=dict(title='Time (s)'),
            yaxis=dict(title='Frequency (Hz)')
        )

        fig = plotly.graph_objs.Figure(data=[pitch_contour], layout=layout)
        
        # Convert the plot to JSON for the frontend
        plot_json = json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)

        logging.info("Pitch analysis completed.")
        
        # Return the analysis results
        return jsonify({
            'frequencies': pitch_values,
            'times': times.tolist(),
            'plot': plot_json
        })
        
    except Exception as e:
        logging.error(f"Error in pitch analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)
    
    # 使用Whisper进行语音识别
    model = whisper.load_model("base")
    result = model.transcribe(filepath)

    logging.info("Transcription completed.")
    
    return jsonify({
        'text': result['text'],
        'segments': result['segments']
    })

@app.route('/api/sheet', methods=['POST'])
def generate_sheet():
    """Generate sheet music from audio file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        # Save the uploaded file
        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)
        logging.info(f"File uploaded for sheet music generation: {file.filename}")
        
        # Load and process the audio file
        y, sr = librosa.load(filepath)
        
        # Save processed audio
        processed_path = os.path.join(UPLOAD_FOLDER, 'processed_' + file.filename)
        sf.write(processed_path, y, sr)
        
        # Convert to sheet music
        score = audio_to_sheet_music(processed_path)
        
        # Convert to MusicXML
        xml_path = os.path.join(UPLOAD_FOLDER, 'sheet_music.xml')
        score.write('musicxml', xml_path)
        
        logging.info(f"Sheet music saved to {xml_path}")
        
        return jsonify({
            'musicxml': 'sheet_music.xml'
        })
        
    except Exception as e:
        logging.error(f"Error in sheet music generation: {str(e)}")
        return jsonify({'error': str(e)}), 500

def quantize_duration(duration, base_duration=0.25):
    """Quantize a duration to the nearest standard note length"""
    # Standard note lengths (in quarter notes)
    standard_lengths = [4.0, 2.0, 1.0, 0.5, 0.25, 0.125]
    
    # Find the closest standard length
    quantized = min(standard_lengths, key=lambda x: abs(x - duration))
    return max(quantized, base_duration)  # Ensure minimum duration

def audio_to_sheet_music(audio_path):
    """Convert audio file to sheet music notation"""
    # Load the audio file
    y, sr = librosa.load(audio_path)
    
    # Extract pitch and timing information
    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
    
    # Get onset frames
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
    onset_times = librosa.frames_to_time(onset_frames, sr=sr)
    
    # Create a music21 score
    score = music21.stream.Score()
    part = music21.stream.Part()
    
    # Detect tempo
    tempo = librosa.beat.beat_track(y=y, sr=sr)[0]
    if isinstance(tempo, np.ndarray):
        tempo = float(tempo[0])
    mm = music21.tempo.MetronomeMark(number=tempo)
    part.append(mm)
    
    # Process each onset
    for i, onset_time in enumerate(onset_times):
        # Get the frame index for this onset
        frame_idx = librosa.time_to_frames(onset_time, sr=sr)
        if frame_idx >= len(pitches[0]):
            continue
            
        # Find the strongest pitch at this onset
        pitch_idx = magnitudes[:, frame_idx].argmax()
        freq = pitches[pitch_idx, frame_idx]
        
        if freq > 0:  # If we detected a valid pitch
            # Convert frequency to MIDI note number
            midi_note = librosa.hz_to_midi(freq)
            
            # Create a music21 note
            note = music21.note.Note()
            note.pitch.midi = int(round(midi_note))
            
            # Set duration (quarter note by default)
            if i < len(onset_times) - 1:
                duration = onset_times[i + 1] - onset_time
                quarter_note_duration = duration * (tempo / 60)  # Convert to quarter note duration
                note.quarterLength = quantize_duration(quarter_note_duration)
            else:
                note.quarterLength = 1.0  # Default to quarter note for last note
            
            part.append(note)
    
    score.append(part)
    return score

@app.route('/uploads/<path:filename>')
def serve_audio(filename):
    try:
        return send_file(os.path.join(UPLOAD_FOLDER, filename))
    except Exception as e:
        return jsonify({'error': f'File not found: {str(e)}'}), 404

if __name__ == '__main__':
    print(f"Server is running on http://localhost:5000")
    print("Available endpoints:")
    print("  - GET  /")
    print("  - POST /api/upload")
    print("  - POST /api/transcribe")
    print("  - POST /api/analyze_pitch")
    print("  - POST /api/sheet")
    print("  - GET  /uploads/<filename>")
    app.run(debug=True)
