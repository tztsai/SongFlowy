<template>
    <div class="main-track-editor">
      <div class="grid">
        <div
          v-for="note in notes"
          :key="note.id"
          class="note"
          :style="{
            left: note.x + '%',
            top: note.y + '%',
            backgroundColor: note.color
          }"
        >
          <span class="note-text">{{ note.label }}</span>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        notes: [
          { id: 1, label: "Note", x: 20, y: 30, color: "blue" },
          { id: 2, label: "Note", x: 40, y: 50, color: "green" },
          { id: 3, label: "Note", x: 60, y: 70, color: "red" }
        ]
      };
    }
  };
  </script>
  
  <style scoped>
  .main-track-editor {
    width: 70%;
    height: 100%;
    background-color: #ffffff;
    position: relative;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(14, 1fr);
    grid-template-rows: repeat(10, 1fr);
    width: 100%;
    height: 100%;
    position: relative;
    border: 1px solid lightgray;
  }
  .note {
    position: absolute;
    width: 5%;
    height: 7%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 10px;
    writing-mode: vertical-lr;
  }
  </style>
  