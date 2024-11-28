<template>
    <div class="top-panel">
      <button>Play</button>
      <button>Loop</button>
      <span>Tempo: 120 BPM</span>
      <span>Key: C Major</span>
      <span>Preset: Pop</span>
    </div>
  </template>
  
  <style scoped>
  .top-panel {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 10px;
    background-color: #f5f5f5;
    border-bottom: 1px solid #ccc;
  }
  button {
    margin: 0 10px;
  }
  span {
    margin: 0 10px;
  }
  </style>
  