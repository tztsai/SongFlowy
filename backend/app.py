from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import logging
from pathlib import Path
from werkzeug.utils import secure_filename
import librosa
import numpy as np
import soundfile as sf
import whisper
import music21
import traceback
import plotly
import json

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins during development

UPLOAD_FOLDER = Path('uploads')
UPLOAD_FOLDER.mkdir(exist_ok=True)
app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)

@app.route('/')
def serve_vue_app():
    return app.send_static_file('index.html')

@app.errorhandler(404)
def not_found(e):
    if request.path.startswith('/api/'):
        return jsonify(error=str(e)), 404
    return app.send_static_file('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    tp = request.form.get('type', 'vocal')
    filename = secure_filename(file.filename)
    filepath = UPLOAD_FOLDER / filename
    file.save(filepath)
    logging.info(f"File uploaded: {filename}")
    
    if tp == 'vocal':
        return jsonify({'filepath': str(filepath)})
    
    try:
        # Load and process the audio file
        y, sr = librosa.load(filepath)
        
        # Extract tempo
        tempo = librosa.beat.beat_track(y=y, sr=sr)[0]
        if isinstance(tempo, np.ndarray):
            tempo = float(tempo[0])
        logging.info(f"Tempo detected: {tempo}")
        
        return jsonify({
            'tempo': tempo,
            'filepath': filepath
        })

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

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
        filepath = UPLOAD_FOLDER / file.filename
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
        xml_path = filepath.with_suffix('.xml')
        score.write('musicxml', xml_path)
        
        # Convert to ABC notation
        abc_path = filepath.with_suffix('.abc')
        score.write('abc', abc_path)
        
        return jsonify({
            'musicxml': str(xml_path),
            'abc': str(abc_path)
        })
        
    except Exception as e:
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

@app.route('/api/separate', methods=['POST'])
def separate_audio():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Save uploaded file
    filename = secure_filename(file.filename)
    input_path = UPLOAD_FOLDER / filename
    
    # Create output paths
    vocal_path = UPLOAD_FOLDER / f'vocal_{filename}'
    bgm_path = UPLOAD_FOLDER / f'bgm_{filename}'

    if not vocal_path.exists() or not bgm_path.exists():
        try:
            from audio_separator.separator import Separator

            # Initialize the Separator with other configuration properties, below
            separator = Separator(
                output_format=bgm_path.suffix,
                output_dir=str(UPLOAD_FOLDER),
            )
            separator.load_model(model_filename='UVR-MDX-NET-Inst_HQ_3.onnx')

            outputs = separator.separate(
                str(input_path),
                primary_output_name=bgm_path.stem,
                secondary_output_name=vocal_path.stem
            )

            logging.info("Separation completed: %s", outputs)
            
        except Exception as e:
            logging.error("Separation failed: %s", str(e))
            return jsonify({'error': f'Unexpected error: {str(e)}'}), 500
    
    return jsonify({
        'vocalPath': str(vocal_path),
        'bgmPath': str(bgm_path)
    })

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
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr, units='frames')
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
def serve_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
