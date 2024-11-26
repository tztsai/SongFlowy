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
import matplotlib.pyplot as plt
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
            '/api/sheet-music',
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

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)
    logging.info(f"File uploaded: {file.filename}")
    
    # 加载音频文件
    try:
        y, sr = librosa.load(filepath)
        logging.info(f"Sampling rate: {sr}")
        
        # 基本音乐信息分析
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        if len(tempo) == 1:
            tempo = tempo.item()
        logging.info(f"Tempo: {tempo}")
        
        # 和弦分析
        harmonic = librosa.effects.harmonic(y)
        
        # chroma是音频文件的和弦特征，表示音频文件中不同音高的强度
        chroma = librosa.feature.chroma_cqt(y=harmonic, sr=sr)
        
        # 使用music21进行调式分析
        notes = []
        for i, magnitude in enumerate(chroma.mean(axis=1)):
            if magnitude > np.mean(chroma):
                note = librosa.midi_to_note(i + 60)
                # Replace Unicode sharp symbol with standard sharp notation
                note = note.replace('♯', '#')
                notes.append(note)
        
        score = music21.stream.Score()
        for note in notes:
            score.append(music21.note.Note(note))
        
        # 打印调式
        logging.info(f"Notes: {notes}")
        
        key = score.analyze('key')
        logging.info(f"Key: {key}")
        
        # 保存处理后的音频
        processed_path = os.path.join(UPLOAD_FOLDER, 'processed_' + file.filename)
        sf.write(processed_path, y, sr)
        
        return jsonify({
            'tempo': float(tempo),
            'key': str(key),
            'processed_path': processed_path,
            'message': '注意：目前暂不支持人声分离功能，建议使用Ultimate Vocal Remover进行人声分离'
        })
        
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze_pitch', methods=['POST'])
def analyze_pitch():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)
    
    y, sr = librosa.load(filepath)
    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
    
    # 获取主要音高
    pitch_values = []
    for i in range(len(pitches[0])):
        index = magnitudes[:,i].argmax()
        pitch_values.append(pitches[index,i])
    
    return jsonify({
        'pitch_values': pitch_values
    })

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
    
    return jsonify({
        'text': result['text'],
        'segments': result['segments']
    })

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
    tempo = librosa.beat.beat_track(y=y, sr=sr)[0][0]
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
                note.quarterLength = duration * (tempo / 60)  # Convert to quarter note duration
            else:
                note.quarterLength = 1.0
            
            part.append(note)
    
    score.append(part)
    return score

@app.route('/api/sheet-music', methods=['POST'])
def generate_sheet_music():
    """Generate sheet music from audio file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        # Save uploaded file
        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)
        
        # Convert to sheet music
        score = audio_to_sheet_music(filepath)
        
        # Convert to MusicXML
        xml_path = os.path.join(UPLOAD_FOLDER, 'sheet_music.xml')
        score.write('musicxml', xml_path)
        
        # Convert to ABC notation for VexFlow
        abc_handler = music21.converter.subConverters.ConverterABC()
        abc_path = os.path.join(UPLOAD_FOLDER, 'sheet_music.abc')
        abc_handler.write(score, fmt='abc', fp=abc_path, subformats=['abc'])
        
        with open(abc_path, 'r') as f:
            abc_notation = f.read()
        
        return jsonify({
            'musicxml_path': xml_path,
            'abc_notation': abc_notation,
            'message': 'Sheet music generated successfully'
        })
        
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

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
    print("  - POST /api/analyze_pitch")
    print("  - POST /api/transcribe")
    print("  - POST /api/sheet-music")
    print("  - GET  /uploads/<filename>")
    app.run(debug=True)
