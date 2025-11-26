# SongFlowy

一个帮助学习、分析和編輯歌曲的Web应用。

## 功能特点

- 音频处理
  - 导入歌曲音频
  - 人声和伴奏分离
  - AI辅助歌声合成
  - 录音及音准评分

- 乐曲分析
  - 自动识别节奏和调式
  - 显示和弦进行
  - 生成标准曲谱
  - 歌词编辑与对齐

## 技术栈

- 后端：Python Flask
- 前端：Vue.js
- 音频处理：librosa, music21, audio-seperator
- 音高检测：pitch.js
- 歌词识别：Whisper

## 安装

1. 克隆仓库
```bash
git clone https://github.com/yourusername/perfect_song_learning.git
cd perfect_song_learning
```

2. 安装后端依赖
```bash
python -m venv venv
source venv/bin/activate  # Windows使用: venv\Scripts\activate
pip install -r requirements.txt
```

3. 安装前端依赖
```bash
cd frontend
npm install
```

## 开发

1. 启动后端服务
```bash
python backend/app.py
```

2. 启动前端开发服务器
```bash
cd frontend
npm start
```

## 许可证

MIT License

## 参考

- https://github.com/Anjok07/ultimatevocalremovergui
- https://www.music21.org/
- https://github.com/mahikap/music-maestro
- https://github.com/ShacharHarshuv/open-ear
- https://github.com/MartyTheeMartian/InTuneNation_FrontEnd
- https://github.com/kvinzheng/InTuneNation_Backend
- https://github.com/lorenlepton/vocaltraining
- https://github.com/kao-ring/Perfect-Pitch-Trainer
- https://github.com/vpavlenko/rawl
- https://www.hooktheory.com/theorytab
- https://book-one.hooktheory.com/section/chords
- https://github.com/wlouie1/MusicPlot
- https://github.com/ChungHaLee/musicolors
