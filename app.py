from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import librosa
import numpy as np
import soundfile as sf
import whisper
import music21

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
    
    # 加载音频文件
    try:
        y, sr = librosa.load(filepath)
        
        # 基本音乐信息分析
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        
        # 和弦分析
        harmonic = librosa.effects.harmonic(y)
        chroma = librosa.feature.chroma_cqt(y=harmonic, sr=sr, dtype=np.complex128)
        
        # 使用music21进行调式分析
        notes = []
        for i, magnitude in enumerate(chroma.mean(axis=1)):
            if magnitude > np.mean(chroma):
                notes.append(librosa.midi_to_note(i + 60))
        
        score = music21.stream.Score()
        for note in notes:
            score.append(music21.note.Note(note))
        
        key = score.analyze('key')
        
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
    print("  - GET  /uploads/<filename>")
    app.run(debug=True)
