<template>
    <div class="scale-notes">
      <div v-for="(note, index) in scale" :key="index" class="scale-note">
        {{ note }}
      </div>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        scale: ["C", "D", "E", "F", "G", "A", "B", "C", "D", "E", "F", "G", "A", "B"]
      };
    }
  };
  </script>
  
  <style scoped>
  .scale-notes {
    width: 100%;
    height: 10%;
    background-color: #f3f3f3;
    display: flex;
    justify-content: space-around;
    align-items: center;
  }
  .scale-note {
    text-align: center;
    font-size: 14px;
  }
  </style>
  