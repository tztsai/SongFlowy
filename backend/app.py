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
import re
from functools import wraps
from music21.meter import TimeSignature

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})

UPLOAD_FOLDER = Path('uploads')
UPLOAD_FOLDER.mkdir(exist_ok=True)
app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)

ONSET_THRESHOLD = 0.7
FRAME_THRESHOLD = 0.2

# @app.after_request
# def after_request(response):
#     response.headers.add('Access-Control-Allow-Origin', '*')
#     return response

def add_cor_acao(route):
    def _route(*args, **kwargs):
        dec = route(*args, **kwargs)
        def wrapped(f):
            @wraps(f)
            def _f(*args, **kwargs):
                res = f(*args, **kwargs)
                r = res[0] if isinstance(res, tuple) else res
                r.headers.add('Access-Control-Allow-Origin', '*')
                return res
            return dec(_f)
        return wrapped
    return _route

app.route = add_cor_acao(app.route)

# @app.route('/')
# def serve_vue_app():
#     return app.send_static_file('index.html')

# @app.errorhandler(404)
# def not_found(e):
#     if request.path.startswith('/api/'):
#         return jsonify(error=str(e)), 404
#     return app.send_static_file('index.html')

def secure_filename_with_unicode(filename):
    """Like werkzeug.secure_filename(), but preserves unicode characters"""
    if isinstance(filename, str):
        from unicodedata import normalize
        filename = normalize('NFKD', filename)
    
    # Remove explicit path separators and relative path components
    filename = os.path.basename(filename)
    
    # Replace dangerous characters with underscores
    filename = re.sub(r'[<>:"/\\|?*\x00-\x1F]', '_', filename)
    
    # Remove leading/trailing spaces and dots
    filename = filename.strip('. ')
    
    # Ensure the filename is not empty
    if not filename:
        filename = '_'
    
    return filename

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    tp = request.form.get('type', 'vocal')
    filename = secure_filename_with_unicode(file.filename)
    filepath = UPLOAD_FOLDER / filename
    file.save(filepath)
    logging.info(f"File uploaded: {filepath}")

    return jsonify({'path': str(filepath)})

@app.route('/api/sheet', methods=['POST'])
def generate_sheet():
    """Generate sheet music from audio file"""
    filepath = Path(request.form['path'])
    
    try:
        # Convert to sheet music
        score = audio_to_sheet_music(filepath)

        # Get time signature
        ts = next(score.recurse().getElementsByClass(TimeSignature), None)
        if not ts:
            ts = TimeSignature()
            ts.guessFromStream(score)
            
        # Convert to MusicXML
        xml_path = filepath.with_suffix('.xml')
        score.write('musicxml', xml_path)
        
        return jsonify({
            'musicxml': str(xml_path),
            'tempo': score.metronomeMarkBoundaries()[0][2].number,
            'notes': get_score_notes(score),
            'key': score.analyze('key').tonic.name,
            'time_signature': (ts.numerator, ts.denominator)
        })
        
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    filepath = request.files['path']
    
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
    filename = secure_filename_with_unicode(file.filename)
    input_path = UPLOAD_FOLDER / filename
    
    # Create output paths
    vocal_path = UPLOAD_FOLDER / f'vocal_{filename}'
    bgm_path = UPLOAD_FOLDER / f'bgm_{filename}'

    if not vocal_path.exists() or not bgm_path.exists():
        try:
            file.save(str(input_path))
            from audio_separator.separator import Separator

            # Initialize the Separator with other configuration properties, below
            separator = Separator(
                output_format=bgm_path.suffix.strip('.'),
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
            return jsonify({'error': str(e)}), 500

    return jsonify({
        'song': str(input_path),
        'vocal': str(vocal_path),
        'instrumental': str(bgm_path)
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

@app.route('/uploads/<path:filename>')
def serve_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


def quantize_duration(duration, base_duration=0.25):
    """Quantize a duration to the nearest standard note length"""
    # Standard note lengths (in quarter notes)
    standard_lengths = [4.0, 2.0, 1.0, 0.5, 0.25, 0.125]
    
    # Find the closest standard length
    quantized = min(standard_lengths, key=lambda x: abs(x - duration))
    return max(quantized, base_duration)  # Ensure minimum duration

def audio_to_sheet_music(audio_path):
    """Convert audio file to sheet music notation"""
    from basic_pitch.inference import predict
    from basic_pitch import ICASSP_2022_MODEL_PATH

    midi_path = audio_path.with_suffix('.mid')

    if not midi_path.exists():
        logging.info(f"Converting {audio_path} to MIDI...")

        # Load the audio file
        y, sr = librosa.load(str(audio_path))
        
        # Detect tempo
        tempo = librosa.beat.beat_track(y=y, sr=sr)[0]
        if isinstance(tempo, np.ndarray):
            tempo = float(tempo[0])

        logging.info(f"Detected tempo: {tempo} bpm")
        model_output, midi_data, note_events = predict(
            audio_path, midi_tempo=tempo,
            onset_threshold=ONSET_THRESHOLD, 
            frame_threshold=FRAME_THRESHOLD,
        )

        with open(midi_path, 'wb') as f:
            midi_data.write(f)

    # Convert to music21 score
    score = music21.converter.parse(midi_path)
    return score

def get_score_notes(score):
    # Extract note data from the score
    notes = []
    
    for note in score.flat.notes:
        if isinstance(note, music21.note.Note):
            # Get note name and octave
            note_name = note.pitch.step
            
            # Format note name as two characters (note + octave)
            note_name = f"{note_name}{note.pitch.octave}"
            
            notes.append({
                'noteName': note_name,
                'start': float(note.offset),  # Start time in quarter notes (beats)
                'duration': float(note.quarterLength)  # Duration in quarter notes (beats)
            })
    
    return notes

if __name__ == '__main__':
    app.run(debug=True, port=5000)
