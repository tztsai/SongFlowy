<template>
    <div class="lyrics-editor">
      <div v-for="(line, index) in lyrics" :key="index" class="lyric-line">
        <span>[{{ index }}:00]</span> {{ line }}
      </div>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        lyrics: [
          "Line 1",
          "Line 2",
          "Line 3",
          "Line 4",
          "Line 5",
          "Line 6",
          "Line 7",
          "Line 8",
          "Line 9",
          "Line 10"
        ]
      };
    }
  };
  </script>
  
  <style scoped>
  .lyrics-editor {
    width: 20%;
    background-color: #f9f9f9;
    padding: 10px;
    border-left: 1px solid #ccc;
    height: 100%;
    overflow-y: auto;
  }
  .lyric-line {
    margin-bottom: 10px;
  }
  </style>
  